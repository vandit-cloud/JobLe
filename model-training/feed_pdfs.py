"""
Feed real PDF resumes through the resume-service /parse endpoint so the
online-distillation capture collects (real-extracted-text → Groq labels)
training pairs. The PDFs go through the EXACT serving pipeline (pdfplumber
extraction), which is the whole point — training text that matches what the
model sees in production.

Creates NOTHING in Mongo (talks to Python directly, not the Node app);
the only output is lines appended to resume-service/training-capture.jsonl.

REQUIRES the service running with the teacher awake:
  - uvicorn up on :8000
  - GROQ_API_KEY set (Groq must answer for a lesson to be captured)
  - CAPTURE_TRAINING_DATA=1 in resume-service/.env

Run:  .\.venv\Scripts\python.exe feed_pdfs.py --limit 150
      .\.venv\Scripts\python.exe feed_pdfs.py --skip 150 --limit 150   (next batch)
"""
import argparse
import os
import random
import time

import requests  # already a dependency of the groq package

PDF_ROOT = r"E:\archive\data\data"
PARSE_URL = "http://localhost:8000/parse"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--skip", type=int, default=0)
    parser.add_argument("--sleep", type=float, default=1.0,
                        help="seconds between files (be gentle to Groq's rate limit)")
    args = parser.parse_args()

    # Gather every PDF across the 24 category folders, then SHUFFLE with a
    # fixed seed: a batch of 150 spans many industries instead of being
    # 150 accountants (alphabetical first folder = biased batch).
    pdfs = []
    for root, _dirs, files in os.walk(PDF_ROOT):
        for f in files:
            if f.lower().endswith(".pdf"):
                pdfs.append(os.path.join(root, f))
    random.Random(42).shuffle(pdfs)  # same seed = same order across runs,
    pdfs = pdfs[args.skip:args.skip + args.limit]  # so --skip continues cleanly

    ok = failed = 0
    for i, path in enumerate(pdfs, 1):
        try:
            with open(path, "rb") as fh:
                resp = requests.post(
                    PARSE_URL,
                    files={"resume": (os.path.basename(path), fh, "application/pdf")},
                    timeout=60,
                )
            if resp.ok and resp.json().get("source") == "groq":
                ok += 1   # captured (only Groq answers teach)
            else:
                failed += 1  # parse worked but teacher didn't answer — no lesson
        except Exception as e:
            failed += 1
            print(f"[error] {os.path.basename(path)}: {e}")
        if i % 10 == 0:
            print(f"{i}/{len(pdfs)} sent  ({ok} taught, {failed} skipped)")
        time.sleep(args.sleep)

    print(f"\nDone. {ok} lessons captured, {failed} skipped/failed.")
    print("Captures land in resume-service/training-capture.jsonl")


if __name__ == "__main__":
    main()
