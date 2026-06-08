"""
The LOCAL trained model path — our own fine-tuned DistilBERT (NER) extracting
name/email/phone/location/skills from resume text. The middle tier of the
/parse dispatcher: better than regex, free/offline/private unlike Groq.

WHERE THE MODEL COMES FROM: the model-training/ R&D track. Training produces a
folder of weights (trained-model-v6/ etc.); LOCAL_MODEL_DIR points at the
champion. UPGRADING = train a better one over there, A/B it with predict.py,
then point LOCAL_MODEL_DIR at the new folder and restart — nothing here changes.

The model is LAZY-LOADED on first use (so the service starts fast and still
runs fine on machines without torch installed) and then kept in memory.
"""
import os
import re

# Default: the champion model inside the model-training folder, resolved
# relative to this file so it works no matter where uvicorn was started from.
_DEFAULT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "model-training",
    "trained-model-v6",
)
MODEL_DIR = os.environ.get("LOCAL_MODEL_DIR", _DEFAULT_DIR)

# Module-level cache: load once, reuse for every request after that.
_tokenizer = None
_model = None


def is_available() -> bool:
    """Can the local-model path run at all? (deps installed + weights exist)"""
    if not os.path.isdir(MODEL_DIR):
        return False
    try:
        import torch  # noqa: F401
        import transformers  # noqa: F401
        return True
    except ImportError:
        return False


def _load():
    """Load tokenizer+model into the module cache on first call."""
    global _tokenizer, _model
    if _model is None:
        from transformers import AutoModelForTokenClassification, AutoTokenizer

        _tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
        _model = AutoModelForTokenClassification.from_pretrained(MODEL_DIR)
        _model.eval()  # inference mode — no training behavior
    return _tokenizer, _model


# ── The same decode pipeline as model-training/predict.py ───────────────────
# (text → per-word BIO tags → stitched entities → fields dict)

def _predict_word_tags(text: str):
    import torch

    tokenizer, model = _load()
    words = text.split()
    enc = tokenizer(
        words, is_split_into_words=True, truncation=True,
        max_length=256, return_tensors="pt",
    )
    with torch.no_grad():
        logits = model(**enc).logits[0]
    pred_ids = logits.argmax(dim=-1).tolist()

    tags = []
    prev_wid = None
    for token_idx, wid in enumerate(enc.word_ids(0)):
        if wid is None or wid == prev_wid:  # special token / sub-word continuation
            prev_wid = wid
            continue
        tags.append(model.config.id2label[pred_ids[token_idx]])
        prev_wid = wid
    return list(zip(words[: len(tags)], tags))


def _group_entities(word_tags):
    """BIO decode: [("Priya","B-NAME"),("Sharma","I-NAME")] -> [("NAME","Priya Sharma")]"""
    entities = []
    current_type, current_words = None, []

    def close():
        nonlocal current_type, current_words
        if current_type:
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
        else:  # stray I- handled leniently, same as predict.py
            ent = tag[2:]
            if ent == current_type:
                current_words.append(word)
            else:
                close()
                current_type, current_words = ent, [word]
    close()
    return entities


def extract_fields(text: str) -> dict:
    """Raw resume text -> the same fields shape the other /parse paths return.

    NOTE the model's truncation limit: it reads the first 256 tokens (~200
    words). Contacts live at the top of resumes so that's usually fine, but
    skills deep in long resumes can be missed — a known v1 limitation.
    """
    word_tags = _predict_word_tags(text)
    entities = _group_entities(word_tags)

    fields = {"name": None, "email": None, "phone": None, "location": None}
    skills = []
    key = {"NAME": "name", "EMAIL": "email", "PHONE": "phone", "LOC": "location"}
    for ent_type, value in entities:
        if ent_type == "SKILL":
            if value.lower() not in (s.lower() for s in skills):
                skills.append(value)
        elif ent_type in key and fields[key[ent_type]] is None:
            fields[key[ent_type]] = value  # first occurrence wins

    # The model was trained on whitespace-split words, so a glued-together
    # email sometimes survives with stray punctuation — light cleanup only.
    if fields["email"] and not re.search(r"\S+@\S+", fields["email"]):
        fields["email"] = None

    return {
        **fields,
        "summary": None,        # our NER doesn't extract these richer fields —
        "experience": [],       # that's Groq-tier capability (or a future vN
        "education": [],        # trained with EDU/EXP labels)
        "skills": skills,
        "source": "local-model",
        "textLength": len(text),
    }
