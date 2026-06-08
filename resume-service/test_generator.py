"""
Turns a resume into a DRAFT MCQ test. Two strategies behind ONE function:

  • generate_with_groq()  — resume-SPECIFIC questions written by an LLM. Used
    only when GROQ_API_KEY is set (and the groq package is installed).
  • generate_from_bank()  — NO-AI fallback: pick questions from question_bank.py
    based on the skills the resume mentions. Always available, no key needed.

generate_test() chooses Groq if it can, otherwise the bank. The two return the
SAME shape, so the rest of the system (Node, React, the exam spine) never has to
know or care which one ran.
"""
import json
import os

from resume_parser import match_skills
from question_bank import QUESTION_BANK, GENERIC_QUESTIONS

MAX_QUESTIONS = 10
MIN_QUESTIONS = 3  # top up with generic questions below this


# ── NO-AI fallback: build from the skill question bank ──────────────────────
def generate_from_bank(text: str) -> dict:
    skills = match_skills(text)

    questions = []
    skills_covered = []
    for skill in skills:
        for q in QUESTION_BANK.get(skill, []):
            questions.append(q)
            if skill not in skills_covered:
                skills_covered.append(skill)
            if len(questions) >= MAX_QUESTIONS:
                return _result(questions, "bank", skills_covered)

    # Too few skill-specific questions? Top up so the recruiter isn't stuck with
    # a near-empty draft.
    if len(questions) < MIN_QUESTIONS:
        for q in GENERIC_QUESTIONS:
            questions.append(q)
            if len(questions) >= 5:
                break

    return _result(questions, "bank", skills_covered)


# ── AI path: resume-specific questions via Groq (inert until a key exists) ──
def generate_with_groq(text: str) -> dict:
    # Import here so the service still runs with the groq package absent — if
    # it's not installed, this raises ImportError and generate_test() falls back.
    from groq import Groq

    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    prompt = (
        "You are writing a multiple-choice screening test from a candidate's "
        "resume. Write up to 10 questions that probe the SPECIFIC skills, tools, "
        "and projects the resume claims, so a candidate who exaggerated would "
        "struggle. Return ONLY JSON of the form "
        '{"questions":[{"text":"...","options":["a","b","c","d"],'
        '"correctIndex":0}]} with exactly 4 options each and correctIndex the '
        "index (0-3) of the correct option.\n\nRESUME:\n" + text[:6000]
    )

    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        response_format={"type": "json_object"},
    )
    data = json.loads(completion.choices[0].message.content)
    questions = data.get("questions", [])
    return _result(questions, "groq", match_skills(text))


# ── the public entry point ──────────────────────────────────────────────────
def generate_test(text: str) -> dict:
    if os.environ.get("GROQ_API_KEY"):
        try:
            return generate_with_groq(text)
        except Exception:
            # Any AI failure (no package, bad key, rate limit, bad JSON) must not
            # break the feature — quietly fall back to the bank.
            pass
    return generate_from_bank(text)


def _result(questions, source, skills_covered) -> dict:
    return {
        "questions": questions,
        "source": source,  # "bank" or "groq" — handy to show in the UI
        "skillsCovered": skills_covered,
    }
