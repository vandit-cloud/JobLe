"""
Remove duplicate examples from dataset.jsonl (same resume_text = duplicate).

Why this matters: train.py does a random train/test split. If the SAME resume
sits in the file twice, one copy can land in train and the other in test —
the model is then "graded on a question it memorized" (data leakage), which
inflates the eval F1.

We keep the LAST occurrence of each text: when a row was labeled twice (e.g.
overlapping --skip runs), the later run is the freshest label.

Run:  .\.venv\Scripts\python.exe dedup.py
A backup of the original file is written to dataset.jsonl.bak first.
"""
import hashlib
import json
import shutil

PATH = "dataset.jsonl"

lines = [l for l in open(PATH, encoding="utf-8") if l.strip()]

# Map text-hash -> LAST line index holding that text (later = freshest label).
last_index = {}
for i, line in enumerate(lines):
    ex = json.loads(line)
    text = ex.get("resume_text")
    if not isinstance(text, str):
        continue  # malformed rows are dropped (train.py skips them anyway)
    key = hashlib.md5(text.encode("utf-8")).hexdigest()
    last_index[key] = i

keep = set(last_index.values())

shutil.copyfile(PATH, PATH + ".bak")
with open(PATH, "w", encoding="utf-8") as f:
    for i, line in enumerate(lines):
        if i in keep:
            f.write(line)

print(f"before: {len(lines)} examples")
print(f"after : {len(keep)} examples  ({len(lines) - len(keep)} removed)")
print(f"backup: {PATH}.bak")
