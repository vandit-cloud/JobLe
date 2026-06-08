"""Quick composition report for dataset.jsonl — which fields actually have labels?"""
import json

rows = [json.loads(l) for l in open("dataset.jsonl", encoding="utf-8") if l.strip()]


def valid(v):
    return v and str(v).strip().lower() not in {"null", "none", "na", "n/a", ""}


def count(key):
    return sum(1 for r in rows if valid(r.get("fields", {}).get(key)))


print(f"total examples : {len(rows)}")
for k in ("name", "email", "phone", "location"):
    print(f"  has {k:9s}: {count(k)}")
skills = sum(len(r.get("fields", {}).get("skills") or []) for r in rows)
print(f"  skill labels : {skills}  (avg {skills/len(rows):.1f}/resume)")
