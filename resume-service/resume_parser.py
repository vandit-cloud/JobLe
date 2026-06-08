"""
The parsing logic — pure functions that take resume TEXT and pull fields out.
No web stuff here (that's main.py), no database. This separation means we can
test the logic in isolation, and swap in an AI parser later without touching
the web layer.

(File is named resume_parser.py, not parser.py, on purpose: "parser" collides
with an old Python built-in module name — avoid the confusion.)
"""
import io
import json
import os
import re

from skills import KNOWN_SKILLS


# ── Step 1: get plain text out of an uploaded file ──────────────────────────
# We support the two common resume formats (PDF, DOCX) and fall back to
# treating anything else as plain text.
def extract_text(file_bytes: bytes, filename: str) -> str:
    name = (filename or "").lower()

    if name.endswith(".pdf"):
        import pdfplumber

        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            # Each page's extract_text() can be None (e.g. a scanned image),
            # so "or ''" keeps the join from crashing.
            return "\n".join(page.extract_text() or "" for page in pdf.pages)

    if name.endswith(".docx"):
        import docx

        document = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)

    # Unknown / .txt: best-effort decode, ignoring bytes we can't read.
    return file_bytes.decode("utf-8", errors="ignore")


# ── Step 2: pull individual fields out of the text ──────────────────────────
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
# Loose phone matcher: optional leading +, then a run of digits possibly broken
# up by spaces or dashes. Good enough for a first pass; refine later.
PHONE_RE = re.compile(r"\+?\d[\d\s-]{8,}\d")


def extract_email(text: str):
    match = EMAIL_RE.search(text)
    return match.group(0) if match else None


def extract_phone(text: str):
    match = PHONE_RE.search(text)
    return match.group(0).strip() if match else None


# ──────────────────────────────────────────────────────────────────────────
#  TODO (YOUR PART): match_skills
#
#  Given the full resume `text`, return the list of skills from KNOWN_SKILLS
#  that the candidate actually mentions.
#
#  The decision that matters here is HOW you match — and it has a real
#  correctness trap:
#    • A naive `if skill in text` substring check is WRONG: the skill "java"
#      would match inside "javascript", and "go"/"php" would match inside
#      ordinary words. You'd report skills the candidate never claimed.
#    • The fix is WORD-BOUNDARY matching: only count a skill when it appears
#      as a whole word. Python's `re` gives you `\b` for word boundaries.
#
#  Suggested approach (≈5-8 lines):
#    1. Lowercase the text once (KNOWN_SKILLS is already lowercase).
#    2. For each skill, build a pattern like  r"\b" + re.escape(skill) + r"\b"
#       (re.escape is harmless here and protects you if a skill ever contains
#       a regex character).
#    3. If re.search(pattern, lowered) finds it, keep that skill.
#    4. Return the list of matched skills.
#
#  Edge thought worth deciding: do you want to de-duplicate, or preserve the
#  order of KNOWN_SKILLS? (Iterating KNOWN_SKILLS once gives you stable order
#  and no duplicates for free.)
# ──────────────────────────────────────────────────────────────────────────
def match_skills(text: str):
    # Lowercase once so matching is case-insensitive (KNOWN_SKILLS is lowercase).
    lowered = text.lower()
    found = []
    for skill in KNOWN_SKILLS:
        # \b...\b = whole-word match, so "java" won't fire inside "javascript".
        # re.escape keeps any future punctuation-bearing skill from breaking the
        # pattern. Iterating KNOWN_SKILLS once gives stable order + no dupes.
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, lowered):
            found.append(skill)
    return found


# ── Matching: score a resume against a job's required skills ────────────────
# The JOB drives this: for each skill the recruiter marked as required, we check
# whether the resume actually mentions it (same \b whole-word match as above).
# matched / total = the match %. This is the keyword v1; semantic matching
# (synonyms, "reactjs" == "react") layers in here later behind the same call.
def match_required_skills(text: str, required_skills) -> dict:
    lowered = text.lower()
    matched = []
    missing = []
    for raw in required_skills:
        skill = (raw or "").strip()
        if not skill:
            continue
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, lowered):
            matched.append(skill)
        else:
            missing.append(skill)

    total = len(matched) + len(missing)
    score = round(len(matched) / total * 100) if total else 0
    return {
        "matchScore": score,          # 0–100
        "matchedSkills": matched,
        "missingSkills": missing,
    }


# ── Step 3: the REGEX baseline (no AI) ──────────────────────────────────────
# Always-available fallback. Fills what regex/keyword can find; leaves the
# richer fields (name, location, summary, experience, education) empty because
# regex can't reliably get those. source="regex" tells the UI which path ran.
def parse_fields(text: str) -> dict:
    return {
        "name": None,
        "email": extract_email(text),
        "phone": extract_phone(text),
        "location": None,
        "summary": None,
        "skills": match_skills(text),
        "experience": [],   # list of {company, role, duration}
        "education": [],    # list of {institution, degree, year}
        "source": "regex",
        "textLength": len(text),
    }


# ── The AI path: rich extraction via Groq (handles any format) ──────────────
# Inert until GROQ_API_KEY + the groq package exist; the dispatcher below falls
# back to the regex baseline on any failure.
def parse_with_groq(text: str) -> dict:
    from groq import Groq  # imported here so the service runs without the pkg

    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    prompt = (
        "Extract structured data from this resume. Return ONLY JSON with keys: "
        "name (string|null), email (string|null), phone (string|null), "
        "location (string|null), summary (string|null), skills (array of "
        "strings), experience (array of {company, role, duration}), education "
        "(array of {institution, degree, year}). Use null/empty when a field "
        "isn't present. Do not invent data.\n\nRESUME:\n" + text[:8000]
    )

    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,  # low = stick to the facts, don't be creative
        response_format={"type": "json_object"},
    )
    data = json.loads(completion.choices[0].message.content)

    # Normalize: guarantee every key exists, and fall back to regex for the
    # contact fields if the LLM happened to miss them.
    return {
        "name": data.get("name"),
        "email": data.get("email") or extract_email(text),
        "phone": data.get("phone") or extract_phone(text),
        "location": data.get("location"),
        "summary": data.get("summary"),
        "skills": data.get("skills") or [],
        "experience": data.get("experience") or [],
        "education": data.get("education") or [],
        "source": "groq",
        "textLength": len(text),
    }


# ── Online distillation: capture Groq's answers as training data ────────────
# Every successful Groq parse is also a perfect (text → labels) training
# example for OUR local model — the same teacher-student distillation that
# built dataset.jsonl, but fed by REAL traffic instead of Kaggle/synthetic.
# OFF by default: production resumes are real people's PII, so capturing them
# for training is an explicit opt-in (set CAPTURE_TRAINING_DATA=1 in .env).
CAPTURE_FILE = os.path.join(os.path.dirname(__file__), "training-capture.jsonl")


def _capture_for_training(text: str, parsed: dict):
    if os.environ.get("CAPTURE_TRAINING_DATA") != "1":
        return
    try:
        # Same {resume_text, fields} shape as model-training/dataset.jsonl,
        # so merging later is a plain file concat + dedup.
        fields = {k: parsed.get(k) for k in
                  ("name", "email", "phone", "location", "summary",
                   "skills", "experience", "education")}
        with open(CAPTURE_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(
                {"resume_text": text, "fields": fields}, ensure_ascii=False
            ) + "\n")
    except Exception:
        pass  # capturing is a bonus — never let it break a real parse


# ── The dispatcher: Groq → OUR trained model → regex ────────────────────────
# Three tiers, best-available wins:
#   1. Groq        — richest extraction (summary/experience/education too),
#                    but needs internet + an API key (and costs per call)
#   2. local model — our fine-tuned DistilBERT (model-training/ track):
#                    free, offline, private; contacts + skills only
#   3. regex       — always works, finds the least
# Each tier falls through silently on failure, so /parse never dies — and the
# `source` field in the result tells the UI which tier actually answered.
def parse_resume(text: str) -> dict:
    if os.environ.get("GROQ_API_KEY"):
        try:
            result = parse_with_groq(text)
            _capture_for_training(text, result)  # the teacher just taught
            return result
        except Exception:
            pass  # Groq down / rate-limited → try the next tier

    try:
        import local_model

        if local_model.is_available():
            result = local_model.extract_fields(text)
            # Same safety net Groq gets: regex backstops the contact fields,
            # and the keyword list backstops skills if the model found none.
            result["email"] = result["email"] or extract_email(text)
            result["phone"] = result["phone"] or extract_phone(text)
            result["skills"] = result["skills"] or match_skills(text)
            return result
    except Exception:
        pass  # model failed to load/run → regex baseline

    return parse_fields(text)
