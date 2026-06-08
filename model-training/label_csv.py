"""
Label REAL resumes (from the Kaggle Resume Dataset CSV) using Groq — the
distillation step on real data. Reads the `Resume_str` column, asks Groq to
extract the structured fields VERBATIM (so the values still appear in the text,
which our NER training needs), and appends {resume_text, fields} to dataset.jsonl.

Run (label the first 300 resumes):
  .\.venv\Scripts\python.exe label_csv.py --limit 300
Resume from where you stopped:
  .\.venv\Scripts\python.exe label_csv.py --skip 300 --limit 300
"""
import argparse
import csv
import json
import os
import re
import time

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

SCHEMA = (
    '{"name": string, "email": string, "phone": string, "location": string, '
    '"summary": string, "skills": [string], "experience": [{"company": string, '
    '"role": string, "duration": string}], "education": [{"institution": string, '
    '"degree": string, "year": string}]}'
)


def clean(text: str) -> str:
    # The CSV text is full of runs of whitespace — collapse to single spaces.
    return re.sub(r"\s+", " ", text or "").strip()


def label_one(client, model, text):
    prompt = (
        "Extract fields from this resume. IMPORTANT: copy each value VERBATIM, "
        "exactly as it appears in the text — do NOT normalize, expand, or "
        "rephrase (e.g. keep 'JS', don't change it to 'JavaScript'). The `name` "
        "must be a PERSON's name only; if the resume is anonymized or starts "
        "with a job title and has no personal name, set name to null. Use "
        "null/empty when a field is absent. Return ONLY JSON of this shape: "
        + SCHEMA + "\n\nRESUME:\n" + text[:7000]
    )
    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    return json.loads(completion.choices[0].message.content)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default=r"E:\archive\Resume\Resume.csv")
    parser.add_argument("--limit", type=int, default=300, help="how many to label")
    parser.add_argument("--skip", type=int, default=0, help="skip the first N rows")
    parser.add_argument("--out", default="dataset.jsonl")
    parser.add_argument("--sleep", type=float, default=0.0,
                        help="seconds to wait between calls (raise if rate-limited)")
    args = parser.parse_args()

    if not os.environ.get("GROQ_API_KEY"):
        raise SystemExit("GROQ_API_KEY not set — put it in model-training/.env")

    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    rows = list(csv.DictReader(open(args.csv, encoding="utf-8")))
    rows = rows[args.skip:args.skip + args.limit]

    written = 0
    with open(args.out, "a", encoding="utf-8") as f:
        for i, row in enumerate(rows):
            text = clean(row.get("Resume_str", ""))
            if len(text) < 50:
                continue
            try:
                fields = label_one(client, model, text)
                # Store the SAME (cleaned, truncated) text we labeled, so the
                # field values are guaranteed to be findable for BIO tagging.
                f.write(json.dumps(
                    {"resume_text": text[:7000], "fields": fields},
                    ensure_ascii=False) + "\n")
                written += 1
                if written % 10 == 0 or written <= 3:
                    print(f"[{written}] labeled (row {args.skip + i})")
            except Exception as e:
                print(f"[skip] row {args.skip + i}: {e}")
                time.sleep(2)  # back off briefly on errors (often rate limits)
            if args.sleep:
                time.sleep(args.sleep)

    print(f"\nDone. Wrote {written} labeled resumes to {args.out}")


if __name__ == "__main__":
    main()
