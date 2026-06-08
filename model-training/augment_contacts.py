"""
Contact-injection augmentation, v2 — IN-PLACE enrichment.

v1 (abandoned) appended NEW examples from unlabeled CSV rows with skills=[].
That taught the model "resumes with contact headers have no skills" — skill
extraction collapsed on header-style resumes (catastrophic interference).

v2 instead ENRICHES the examples we already have: the real Kaggle entries in
dataset.jsonl carry Groq-labeled SKILLS but null contacts (anonymized). We
prepend a fake contact header to the TEXT and fill the same values into
FIELDS — so every example is now complete about every label type:
  - skills: Groq-quality labels (untouched)
  - name/email/phone/location: invented by us = 100% certain labels
No new rows (no duplication/leakage), no API calls.

A random ~30% of entries are left headerless so the model still copes with
anonymized resumes.

Run:  .\.venv\Scripts\python.exe augment_contacts.py
Backs up the original to dataset.jsonl.pre-inject first.
"""
import json
import random
import shutil

PATH = "dataset.jsonl"
HEADERLESS_KEEP = 0.30  # fraction of eligible entries left untouched

FIRST_NAMES = [
    "Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Arjun", "Divya",
    "Karan", "Meera", "James", "Maria", "Wei", "Fatima", "Daniel", "Sofia",
    "Liam", "Aisha", "Carlos", "Yuki",
]
LAST_NAMES = [
    "Sharma", "Patel", "Reddy", "Gupta", "Iyer", "Khan", "Smith", "Garcia",
    "Chen", "Okafor", "Müller", "Tanaka", "Singh", "Fernandez", "Kowalski",
]
CITIES = [
    "Bengaluru, India", "Mumbai, India", "Hyderabad", "Pune, Maharashtra",
    "New York, NY", "London, UK", "Berlin, Germany", "Singapore",
    "Toronto, Canada", "Dubai, UAE", "Chennai", "Remote",
]
EMAIL_DOMAINS = ["gmail.com", "outlook.com", "yahoo.com", "protonmail.com", "mail.com"]


def make_email(first: str, last: str) -> str:
    """An email that does NOT always mirror the name — this breaks the
    name-lookalike shortcut the model learned from synthetic data."""
    styles = [
        f"{first.lower()}.{last.lower()}",
        f"{first.lower()}{random.randint(1, 99)}",
        f"{first[0].lower()}{last.lower()}{random.randint(1980, 2005)}",
        f"{last.lower()}.{first.lower()[:3]}",
        # totally name-unrelated handles — the important hard cases:
        f"coder{random.randint(100, 999)}",
        f"dev.pro{random.randint(10, 99)}",
    ]
    return f"{random.choice(styles)}@{random.choice(EMAIL_DOMAINS)}"


def make_phone() -> str:
    styles = [
        f"+91 {random.randint(70000, 99999)} {random.randint(10000, 99999)}",
        f"+1 ({random.randint(200, 989)}) {random.randint(200, 999)}-{random.randint(1000, 9999)}",
        f"0{random.randint(7000000000, 9999999999)}",
        f"+44 {random.randint(7000, 7999)} {random.randint(100000, 999999)}",
    ]
    return random.choice(styles)


def make_header(name: str, email: str, phone: str, location: str) -> str:
    """Varied layouts on purpose: if every header had the same shape, the model
    would memorize the LAYOUT instead of learning what an email/phone IS."""
    templates = [
        # classic one-liner under the name (like our sample resume)
        f"{name}\n{location} | {email} | {phone}",
        # NAME IN CAPS + labeled fields, each on its own line
        f"{name.upper()}\nEmail: {email}\nPhone: {phone}\nLocation: {location}",
        # bullet separators, phone before email (order varies!)
        f"{name}\n{phone} • {email} • {location}",
        # terse labels, comma style
        f"{name} — {location}\nPh: {phone}, E-mail: {email}",
        # everything crammed on ONE line (common in exported PDFs)
        f"{name} | {email} | {phone} | {location}",
        # "Contact:" block style, location up top with the name
        f"{name}, {location}\nContact: {email} / {phone}",
        # minimal — bare values, no separators at all
        f"{name}\n{email}\n{phone}\n{location}",
    ]
    return random.choice(templates)


def main():
    lines = [l for l in open(PATH, encoding="utf-8") if l.strip()]
    shutil.copyfile(PATH, PATH + ".pre-inject")

    injected = skipped_has_contacts = skipped_kept_headerless = untouched = 0
    out = []
    for line in lines:
        ex = json.loads(line)
        text, fields = ex.get("resume_text"), ex.get("fields")

        # Eligible = real Kaggle entries: single-line text (the CSV cleaner
        # collapsed whitespace) with a fields dict. Synthetic resumes have \n.
        eligible = (
            isinstance(text, str) and "\n" not in text
            and isinstance(fields, dict)
        )
        # Don't inject on top of EXISTING contacts (a few real resumes kept
        # an email/phone) — two emails in one text would corrupt the labels,
        # because tag_words only tags the FIRST occurrence of a value.
        if eligible and (fields.get("email") or fields.get("phone")):
            skipped_has_contacts += 1
            eligible = False

        if not eligible:
            untouched += 1
            out.append(line)
            continue

        if random.random() < HEADERLESS_KEEP:
            skipped_kept_headerless += 1
            out.append(line)
            continue

        first, last = random.choice(FIRST_NAMES), random.choice(LAST_NAMES)
        name = f"{first} {last}"
        email, phone = make_email(first, last), make_phone()
        location = random.choice(CITIES)

        ex["resume_text"] = make_header(name, email, phone, location) + "\n" + text
        # Same values into the labels — certain by construction. Skills and
        # everything else in fields stay exactly as Groq labeled them.
        fields.update({"name": name, "email": email,
                       "phone": phone, "location": location})
        out.append(json.dumps(ex, ensure_ascii=False) + "\n")
        injected += 1

    with open(PATH, "w", encoding="utf-8") as f:
        f.writelines(out)

    print(f"injected headers : {injected}")
    print(f"kept headerless  : {skipped_kept_headerless} (robustness sample)")
    print(f"had own contacts : {skipped_has_contacts} (left alone)")
    print(f"not eligible     : {untouched} (synthetic/malformed)")
    print(f"backup           : {PATH}.pre-inject")


if __name__ == "__main__":
    main()
