"""
Build a resume training dataset by GENERATING synthetic resumes with Groq.

Each LLM call does two things at once:
  (a) writes a realistic, FICTIONAL resume as plain text in a varied layout, and
  (b) returns the structured fields that exactly match it.
So every line of the output is a ready (text -> labels) training example — no
manual labeling. It's privacy-safe (fully made up) and format-diverse (we vary
the layout style on purpose, since handling many formats is the whole goal).

Run:
  .\.venv\Scripts\python.exe generate_dataset.py --count 50
Output: dataset.jsonl  (one JSON object per line, appended)
"""
import argparse
import json
import os
import random

from dotenv import load_dotenv
from groq import Groq

load_dotenv()  # read model-training/.env (GROQ_API_KEY)

# Roles to spread the dataset across many domains.
ROLES = [
    "software engineer", "data scientist", "frontend developer",
    "backend developer", "devops engineer", "product manager",
    "UX designer", "machine learning engineer", "QA engineer",
    "mobile developer", "data analyst", "full-stack developer",
]

# Different layouts so the model learns to handle varied formats — the point.
STYLES = [
    "a clean single-column layout with CAPITALIZED section headers",
    "a compact one-page layout",
    "a layout that lists skills as one comma-separated line",
    "a minimal layout with short bullet points",
    "a detailed layout with several work experiences",
    "a layout where all contact info sits on one line at the top",
]

# The exact JSON shape we want back (matches resume-service /parse output).
SCHEMA = (
    '{"resume_text": string, "fields": {"name": string, "email": string, '
    '"phone": string, "location": string, "summary": string, '
    '"skills": [string], "experience": [{"company": string, "role": string, '
    '"duration": string}], "education": [{"institution": string, '
    '"degree": string, "year": string}]}}'
)


def generate_one(client, model, role, style):
    prompt = (
        f"Generate a realistic but FICTIONAL resume for a {role}. "
        f"Write resume_text as plain text using {style}. "
        "Then fill `fields` with data that EXACTLY matches resume_text — do not "
        "invent anything that isn't in the text. "
        f"Return ONLY JSON of this shape: {SCHEMA}"
    )
    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.9,  # higher temperature = more variety between resumes
        response_format={"type": "json_object"},
    )
    return json.loads(completion.choices[0].message.content)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=20,
                        help="how many resumes to generate")
    parser.add_argument("--out", default="dataset.jsonl",
                        help="output file (appended to)")
    args = parser.parse_args()

    if not os.environ.get("GROQ_API_KEY"):
        raise SystemExit("GROQ_API_KEY not set — put it in model-training/.env")

    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    written = 0
    with open(args.out, "a", encoding="utf-8") as f:
        for i in range(args.count):
            role = random.choice(ROLES)
            style = random.choice(STYLES)
            try:
                example = generate_one(client, model, role, style)
                # Only keep well-formed examples; skip anything malformed.
                # The TYPE check matters: the model occasionally returns
                # resume_text as a list of lines, which breaks training.
                if (
                    isinstance(example.get("resume_text"), str)
                    and isinstance(example.get("fields"), dict)
                ):
                    f.write(json.dumps(example, ensure_ascii=False) + "\n")
                    written += 1
                    print(f"[{written}/{args.count}] generated: {role}")
                else:
                    print(f"[skip] missing keys for: {role}")
            except Exception as e:
                print(f"[skip] {role}: {e}")

    print(f"\nDone. Wrote {written} examples to {args.out}")


if __name__ == "__main__":
    main()
