"""
Fine-tune DistilBERT to extract resume fields as NER (token classification).

Pipeline:
  1. Read dataset.jsonl  ({resume_text, fields} from generate_dataset.py)
  2. Turn each resume into word-level BIO tags (the "labels") by matching the
     known field values against the words  ← this is the data-prep heart of NER
  3. Tokenize + align labels to sub-word tokens
  4. Fine-tune distilbert-base-uncased
  5. Evaluate (precision / recall / F1 via seqeval) on a held-out split
  6. Save the model to trained-model/

Runs on your GPU automatically if available (RTX 3050), else CPU.
Run:  .\.venv\Scripts\python.exe train.py --epochs 5 --batch 8
"""
import argparse
import json

import numpy as np
import torch
from datasets import Dataset
from seqeval.metrics import f1_score, precision_score, recall_score
from transformers import (
    AutoModelForTokenClassification,
    AutoTokenizer,
    DataCollatorForTokenClassification,
    Trainer,
    TrainingArguments,
)

MODEL_NAME = "distilbert-base-uncased"

# The entities we extract (flat fields, v1). B- = first word of an entity,
# I- = inside (continuation), O = not an entity.
LABELS = [
    "O",
    "B-NAME", "I-NAME",
    "B-EMAIL", "I-EMAIL",
    "B-PHONE", "I-PHONE",
    "B-LOC", "I-LOC",
    "B-SKILL", "I-SKILL",
]
label2id = {label: i for i, label in enumerate(LABELS)}
id2label = {i: label for i, label in enumerate(LABELS)}


def _norm(word: str) -> str:
    # Strip trailing/leading punctuation so "York," matches "York".
    return word.lower().strip(".,()[]:;")


def _is_valid(val) -> bool:
    if not val:
        return False
    s = str(val).strip().lower()
    return s not in {"null", "none", "na", "n/a", "unknown", ""}


# ── Data prep: turn {resume_text, fields} into word-level BIO tags ──────────
# For each known field value, find where it appears in the words and tag those
# tokens. Longer values are matched first so "Machine Learning" wins over
# "Machine". We tag only the FIRST occurrence of each value (a simple, common
# weak-labeling choice).
def tag_words(text: str, fields: dict):
    words = text.split()
    tags = ["O"] * len(words)
    norm_words = [_norm(w) for w in words]

    spans = []
    if _is_valid(fields.get("name")):
        spans.append((str(fields["name"]), "NAME"))
    if _is_valid(fields.get("email")):
        spans.append((str(fields["email"]), "EMAIL"))
    if _is_valid(fields.get("phone")):
        spans.append((str(fields["phone"]), "PHONE"))
    if _is_valid(fields.get("location")):
        spans.append((str(fields["location"]), "LOC"))
    for skill in fields.get("skills") or []:
        if _is_valid(skill):
            spans.append((str(skill), "SKILL"))

    # Match multi-word values before single-word ones.
    spans.sort(key=lambda s: -len(s[0].split()))

    for value, ent in spans:
        value_words = [_norm(t) for t in value.split()]
        n = len(value_words)
        if n == 0:
            continue
        for i in range(len(norm_words) - n + 1):
            window = norm_words[i:i + n]
            if window == value_words and all(tags[i + k] == "O" for k in range(n)):
                tags[i] = "B-" + ent
                for k in range(1, n):
                    tags[i + k] = "I-" + ent
                break  # first occurrence only
    return words, tags


def load_dataset(path: str):
    rows = []
    skipped = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            ex = json.loads(line)
            text, fields = ex.get("resume_text"), ex.get("fields")
            # LLM-generated data isn't always well-formed: sometimes the model
            # returns resume_text as a LIST of lines. Join it; skip anything
            # else that isn't a usable string.
            if isinstance(text, list):
                text = "\n".join(str(t) for t in text)
            if not isinstance(text, str) or not text or not fields:
                skipped += 1
                continue
            words, tags = tag_words(text, fields)
            if not words:
                skipped += 1
                continue
            rows.append({"tokens": words, "ner_tags": [label2id[t] for t in tags]})
    print(f"Loaded {len(rows)} examples ({skipped} skipped).")
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="dataset.jsonl")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch", type=int, default=8)  # 4GB-VRAM friendly
    parser.add_argument("--out", default="trained-model")
    args = parser.parse_args()

    print("GPU available:", torch.cuda.is_available())

    rows = load_dataset(args.data)
    if len(rows) < 5:
        raise SystemExit("Need at least ~5 examples. Generate more first.")

    ds = Dataset.from_list(rows).train_test_split(test_size=0.2, seed=42)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    # Tokenize words into sub-words and align labels: only the FIRST sub-word of
    # each word keeps the label; continuations + special tokens get -100, which
    # the loss function ignores.
    def tokenize_and_align(batch):
        tokenized = tokenizer(
            batch["tokens"],
            truncation=True,
            is_split_into_words=True,
            max_length=256,
        )
        all_labels = []
        for i, tags in enumerate(batch["ner_tags"]):
            word_ids = tokenized.word_ids(batch_index=i)
            prev = None
            label_ids = []
            for wid in word_ids:
                if wid is None:
                    label_ids.append(-100)
                elif wid != prev:
                    label_ids.append(tags[wid])
                else:
                    label_ids.append(-100)
                prev = wid
            all_labels.append(label_ids)
        tokenized["labels"] = all_labels
        return tokenized

    tokenized = ds.map(
        tokenize_and_align, batched=True, remove_columns=ds["train"].column_names
    )

    model = AutoModelForTokenClassification.from_pretrained(
        MODEL_NAME, num_labels=len(LABELS), id2label=id2label, label2id=label2id
    )
    collator = DataCollatorForTokenClassification(tokenizer)

    def compute_metrics(p):
        preds, labels = p
        preds = np.argmax(preds, axis=2)
        true_preds, true_labels = [], []
        for pred, lab in zip(preds, labels):
            tp, tl = [], []
            for pi, li in zip(pred, lab):
                if li != -100:
                    tp.append(id2label[pi])
                    tl.append(id2label[li])
            true_preds.append(tp)
            true_labels.append(tl)
        return {
            "precision": precision_score(true_labels, true_preds),
            "recall": recall_score(true_labels, true_preds),
            "f1": f1_score(true_labels, true_preds),
        }

    training_args = TrainingArguments(
        output_dir=args.out,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch,
        per_device_eval_batch_size=args.batch,
        learning_rate=2e-5,
        logging_steps=10,
        report_to="none",  # don't try to log to wandb etc.
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["test"],
        data_collator=collator,
        processing_class=tokenizer,  # transformers 5.x (was `tokenizer=`)
        compute_metrics=compute_metrics,
    )

    trainer.train()
    print("\nEvaluation:", trainer.evaluate())

    trainer.save_model(args.out)
    tokenizer.save_pretrained(args.out)
    print(f"\nSaved model to {args.out}/")


if __name__ == "__main__":
    main()
