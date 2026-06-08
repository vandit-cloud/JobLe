"""
Run the fine-tuned model on raw resume text -> extracted fields.

This is the "usability check": train.py only reports F1 on tensors;
this script answers "if I paste a real resume in, what comes out?"

Run:  .\.venv\Scripts\python.exe predict.py            (built-in sample)
      .\.venv\Scripts\python.exe predict.py --file path\to\resume.txt
"""
import argparse
import json

import torch
from transformers import AutoModelForTokenClassification, AutoTokenizer

MODEL_DIR = "trained-model"

SAMPLE = """Priya Sharma
Bengaluru, India | priya.sharma@example.com | +91 98765 43210

Backend developer with 3 years of experience building REST APIs.
Skills: Python, FastAPI, MongoDB, Docker, React
Worked at Acme Corp as a Software Engineer building payment systems.
"""


def predict_word_tags(text: str, tokenizer, model):
    """Raw text -> list of (word, tag) pairs, one per whitespace word.

    Mirrors training exactly: split on whitespace, tokenize with
    is_split_into_words=True, and keep only the FIRST sub-word's
    prediction for each word (the rest were -100 during training,
    so the model was never graded on them).
    """
    words = text.split()
    enc = tokenizer(
        words, is_split_into_words=True, truncation=True,
        max_length=256, return_tensors="pt",
    )
    with torch.no_grad():
        logits = model(**enc).logits[0]          # (num_tokens, num_labels)
    pred_ids = logits.argmax(dim=-1).tolist()

    tags = []
    prev_wid = None
    for token_idx, wid in enumerate(enc.word_ids(0)):
        if wid is None or wid == prev_wid:       # special token / continuation
            prev_wid = wid
            continue
        tags.append(model.config.id2label[pred_ids[token_idx]])
        prev_wid = wid
    # truncation can drop trailing words; keep words/tags the same length
    return list(zip(words[: len(tags)], tags))


def group_entities(word_tags):
    """Stitch per-word BIO tags back into entities.

    Input:  [("Priya","B-NAME"), ("Sharma","I-NAME"), ("Bengaluru,","B-LOC"), ...]
    Output: [("NAME", "Priya Sharma"), ("LOC", "Bengaluru,"), ...]

    Rules of BIO decoding:
      - "B-XXX" starts a new entity of type XXX
      - "I-XXX" continues the CURRENT entity *if* it's the same type;
        a stray I- with no open entity (or wrong type) is a model mistake —
        you decide: drop it, or treat it as a new entity start?
      - "O" closes any open entity
    """
    entities = []
    current_type, current_words = None, []

    def close():
        nonlocal current_type, current_words
        if current_type:
            # same punctuation strip as training's _norm, so "Python," -> "Python"
            value = " ".join(w.strip(".,()[]:;|") for w in current_words).strip()
            if value:
                entities.append((current_type, value))
        current_type, current_words = None, []

    for word, tag in word_tags:
        if tag == "O":
            close()
        elif tag.startswith("B-"):
            close()
            current_type, current_words = tag[2:], [word]
        else:  # "I-XXX"
            ent = tag[2:]
            if ent == current_type:
                current_words.append(word)       # normal continuation
            else:
                close()                          # stray I-: lenient — treat as a new start
                current_type, current_words = ent, [word]
    close()  # entity still open at end of text
    return entities


def entities_to_fields(entities):
    """Group entities into the same JSON shape as Groq /parse output."""
    fields = {"name": None, "email": None, "phone": None, "location": None, "skills": []}
    key = {"NAME": "name", "EMAIL": "email", "PHONE": "phone", "LOC": "location"}
    for ent_type, value in entities:
        if ent_type == "SKILL":
            if value.lower() not in (s.lower() for s in fields["skills"]):
                fields["skills"].append(value)
        elif ent_type in key and fields[key[ent_type]] is None:
            fields[key[ent_type]] = value        # first occurrence wins
    return fields


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", help="path to a .txt resume (default: built-in sample)")
    parser.add_argument("--show-tags", action="store_true", help="print raw word/tag pairs")
    parser.add_argument("--model", default=MODEL_DIR,
                        help="model directory (e.g. trained-model-v3) for A/B comparison")
    args = parser.parse_args()

    text = SAMPLE
    if args.file:
        with open(args.file, encoding="utf-8") as f:
            text = f.read()

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForTokenClassification.from_pretrained(args.model)
    model.eval()

    word_tags = predict_word_tags(text, tokenizer, model)
    if args.show_tags:
        for w, t in word_tags:
            if t != "O":
                print(f"  {t:10s} {w}")

    entities = group_entities(word_tags)
    print(json.dumps(entities_to_fields(entities), indent=2))


if __name__ == "__main__":
    main()
