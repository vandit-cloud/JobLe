# Model Training — Full Context & Handoff

> **Purpose of this file:** a complete, self-contained briefing so a *new* AI
> assistant (or a future me) can continue the resume-parsing model effort with
> zero prior memory. Read this top-to-bottom before doing anything. It explains
> the goal, the decisions and *why*, the exact current state, and the precise
> commands to continue — written as a runbook you can execute.

---

## 0. The 60-second summary

We are training a **local NER model (DistilBERT) that extracts fields from
resumes** (name, email, phone, location, skills). It is part of a larger hiring
platform called **TalentLeague**. The model is **R&D / a learning project**, not
a product blocker — the live product already parses resumes with the **Groq LLM**.
We train our own model via **distillation**: Groq generates/labels the training
data, and a small model learns to imitate it.

**Current status:** a full pipeline is built and *works*. First real GPU training
run scored **F1 0.37** (precision 0.71, recall 0.25) on ~340 examples. The model
is "accurate but cautious" — low recall because the dataset is still small. **The
single next lever is MORE DATA** (we have 2,484 real resumes available to label).

---

## 1. The bigger project (essential background)

**TalentLeague** = an AI-powered hiring/assessment platform. A recruiter creates
skills tests and job openings, uploads candidate resumes, the system parses +
skill-matches them, ranks a shortlist, and can auto-generate resume-specific MCQ
tests. Phases 1 & 2 (the whole recruiter loop) are **complete**.

**Architecture — the golden rule (NEVER violate):** the system is *polyglot but
split into separate services that talk over HTTP*. Three runtimes, never merged
into one repo/runtime:
- `E:\Joble\client\` — React + Vite (frontend)
- `E:\Joble\server\` — Node/Express + MongoDB (gateway: owns data + auth)
- `E:\Joble\resume-service\` — Python/FastAPI on :8000 (the "AI brain": parse,
  match, generate-test; calls Groq). **No database.**

A previous version of this project *died* because someone merged a Node+Mongo
backend with a Python+Postgres backend into one repo. So: **the trained model
will be served from `resume-service` (Python), behind HTTP, never merged into
Node.** This model-training work happens in its own folder, `model-training\`,
with its own virtualenv, totally isolated.

---

## 2. Why we're training a model at all (the honest framing)

An LLM (Groq) already parses resumes very well with zero training. So why build a
custom model? **Be honest with the user about this** — it was discussed and
agreed:
- As a *pure accuracy play*, a custom model probably **won't beat Groq** soon.
- It IS justified by: **learning value** (the team is learning ML), and
  **cost/privacy/offline** (a local model = no per-call API cost, candidate data
  never leaves the machine, works offline, no rate limits).

**The past failure to avoid repeating:** an earlier attempt trained a BERT NER
model and got F1≈0.40 on ~50 mislabeled rows with a mismatched tokenizer — a toy.
The fixes baked into *this* effort: (1) **fine-tune a pretrained model**
(DistilBERT), never from scratch; (2) get **thousands of well-labeled examples**
via distillation instead of hand-labeling; (3) measure properly (seqeval F1).

**The data insight that drives everything:** in ML, the model code is the easy
10%; **the data is the hard 90%.** Every quality problem here traces back to data
quantity/quality, not code.

---

## 3. The technical approach

**Task framing:** NER = *token classification*. Each word in the resume gets a
tag. We use **BIO tagging**: `B-SKILL` = first word of a skill, `I-SKILL` = a
continuation word, `O` = not an entity. Entities (v1, flat fields only):
`NAME, EMAIL, PHONE, LOC, SKILL` (each has a `B-` and `I-` variant; plus `O`).
*Nested* fields (experience/education objects) are deliberately NOT modeled yet —
that's a v2 (or stays with Groq).

**Model:** `distilbert-base-uncased` (small, ~66M params — fits a 4GB GPU, trains
in seconds). Fine-tuned with HuggingFace `Trainer`.

**Distillation pipeline:**
```
raw resumes ──(Groq labels them)──> {resume_text, fields} (dataset.jsonl)
   │
   └─ train.py: string-match field values back into the text to create
      word-level BIO tags ──> tokenize + align to sub-words ──> fine-tune
      DistilBERT ──> evaluate (seqeval P/R/F1) ──> save to trained-model/
```

**Two data sources, combined (each covers the other's weakness):**
- **Synthetic** (`generate_dataset.py`): Groq invents fictional resumes AND their
  matching labels in one call. → clean **names/emails/phones/locations** + skills.
  Privacy-safe, format-varied.
- **Real** (`label_csv.py`): the Kaggle Resume Dataset (real resume text), labeled
  by Groq. → rich real-world **skills** + authentic layouts. BUT this dataset is
  **ANONYMIZED** — no person names/emails/phones (so `name` is labeled `null`).

> ⚠️ **Key data fact:** real data = great for SKILLS + format variety, useless for
> NAME/EMAIL/PHONE. Synthetic data = good for those contact fields. **You need
> BOTH mixed** for a well-rounded model.

**A subtle but critical labeling rule:** training tags words by *string-matching*
the field values into the resume text. So when Groq labels real resumes
(`label_csv.py`), it's instructed to copy values **VERBATIM** (keep "JS", don't
normalize to "JavaScript") — otherwise a normalized value won't be found in the
text and won't get a label, hurting both training and the score.

---

## 4. Environment & hardware (already set up)

- **OS:** Windows 11. **Shell:** PowerShell. **Python:** 3.10.9.
- **GPU:** NVIDIA RTX 3050 **Laptop** GPU, **4 GB VRAM**, driver 610.47.
  → 4GB means: **batch size 8, max sequence length 256** (already set in train.py).
- **Virtualenv:** `E:\Joble\model-training\.venv` (run python as
  `.\.venv\Scripts\python.exe`).
- **Installed:** `torch 2.5.1+cu121` (the **CUDA/GPU** build), `transformers 5.9.0`,
  `datasets`, `seqeval`, `accelerate`, `groq`, `python-dotenv`.

> ⚠️ **The CUDA gotcha (cost us time, don't repeat):** `pip install torch` gives a
> **CPU-only** build (`+cpu`) that ignores the GPU — `torch.cuda.is_available()`
> returns `False`. Installing the NVIDIA CUDA *Toolkit* does NOT fix this. The fix
> is reinstalling **PyTorch itself** from the CUDA index:
> `pip uninstall -y torch` then
> `pip install torch --index-url https://download.pytorch.org/whl/cu121`.
> The wheel bundles its own CUDA runtime. Verify with
> `python -c "import torch; print(torch.cuda.is_available())"` → must be `True`.

- **Transformers 5.x note:** the `Trainer` uses `processing_class=tokenizer`, NOT
  the old `tokenizer=tokenizer` (already handled in train.py).
- **Groq:** key is in `model-training\.env` (`GROQ_API_KEY`, gitignored). Model =
  `llama-3.3-70b-versatile`. ⚠️ The key was shared in plaintext during setup — the
  user should rotate it at console.groq.com when convenient and update `.env`.

---

## 5. The files (what each does)

```
E:\Joble\model-training\
  generate_dataset.py   Generate SYNTHETIC labeled resumes via Groq.
                        Run: python generate_dataset.py --count 300
                        Appends {resume_text, fields} lines to dataset.jsonl.

  label_csv.py          Label the REAL Kaggle resumes via Groq (verbatim).
                        Run: python label_csv.py --skip 300 --limit 1700
                        --skip lets you resume where you left off.
                        Reads E:\archive\Resume\Resume.csv (Resume_str column).
                        Appends to dataset.jsonl.

  train.py              Fine-tune DistilBERT. Run: python train.py --epochs 15 --batch 8
                        - loads dataset.jsonl
                        - tag_words(): string-matches field values -> word-level BIO
                          (longer values matched first; first occurrence; punctuation
                          stripped via _norm()). LABELS list defines the entities — if
                          you add an entity type, add BOTH its B- and I- (a missing
                          I- once crashed with KeyError).
                        - tokenize_and_align(): sub-word alignment, only the first
                          sub-word of a word keeps the label, rest = -100 (ignored).
                        - Trains, evaluates (seqeval), saves to trained-model/.
                        - Uses GPU automatically if available.

  dataset.jsonl         The training data. One JSON per line: {resume_text, fields}.
                        Currently ~340 lines (40 synthetic + ~300 real). GITIGNORED.

  trained-model/        The saved fine-tuned model (config, weights, tokenizer).
                        GITIGNORED. This is what gets loaded for inference.

  requirements.txt          Phase-1 deps (groq, python-dotenv).
  requirements-train.txt    Phase-2 deps (transformers, datasets, seqeval, accelerate)
                            + a note to install CUDA torch separately.
  .env                  GROQ_API_KEY + GROQ_MODEL (gitignored).
  README.md             Short setup/run notes.
  CONTEXT.md            This file.
```

**The dataset:** Kaggle "Resume Dataset" lives at `E:\archive\`:
- `E:\archive\Resume\Resume.csv` — 2,484 rows; columns `ID, Resume_str,
  Resume_html, Category`. We use `Resume_str` (plain text). 24 industry categories.
- `E:\archive\data\data\<CATEGORY>\*.pdf` — the original PDFs (not currently used;
  we use the pre-extracted text from the CSV).

---

## 6. EXACTLY where we are right now

- Pipeline built and verified end-to-end on the GPU.
- `dataset.jsonl` ≈ **340 examples** (40 synthetic + ~300 real labeled; rows 0–299
  of the CSV have been labeled — **resume real labeling from `--skip 300`**).
- Last training run: 10 epochs, ~340 examples, **17.5s on GPU**.
- **Result: precision 0.71, recall 0.25, F1 0.37.** Saved to `trained-model/`.
- Interpretation: high precision / low recall = trained on too little data; model
  is cautious (predicts few entities, but usually correct). **More data → higher
  recall → higher F1.**

---

## 7. THE PLAN — how to continue (do this next, in order)

### Step A — Scale the data (the main lever)
We have 2,484 real resumes; only ~300 are labeled. Label the rest, and add more
synthetic for contact-field coverage. (These are many Groq calls — minutes each
batch; the scripts back off on rate-limit errors and you can resume with `--skip`.)
```powershell
cd E:\Joble\model-training
# Label more real resumes (continue from row 300). Do in chunks if rate-limited.
.\.venv\Scripts\python.exe label_csv.py --skip 300  --limit 700
.\.venv\Scripts\python.exe label_csv.py --skip 1000 --limit 700
.\.venv\Scripts\python.exe label_csv.py --skip 1700 --limit 784
# Add clean synthetic contact examples (run a few times).
.\.venv\Scripts\python.exe generate_dataset.py --count 300
.\.venv\Scripts\python.exe generate_dataset.py --count 300
# Sanity-check size:
.\.venv\Scripts\python.exe -c "print(sum(1 for _ in open('dataset.jsonl',encoding='utf-8')),'examples')"
```
Target: **2,000–3,000+** examples.

### Step B — Retrain & evaluate
```powershell
.\.venv\Scripts\python.exe train.py --epochs 15 --batch 8
```
Read the final `Evaluation:` line. **Expect recall and F1 to climb** as data grows.
Iterate: more data, more epochs (try 15–20), re-evaluate. Watch for overfitting
(train loss tiny but eval F1 stalls) — if so, you've hit the data ceiling; add more
data rather than more epochs.

### Step C — (Optional) improve the model
- Tune: learning rate (currently 2e-5), epochs, batch (keep ≤8 for 4GB VRAM).
- Better weak-labeling: the string-match in `tag_words()` misses skills Groq
  phrased differently than the text. Could fuzzy-match or expand entities
  (add ORG/TITLE/DEGREE/INSTITUTION — remember to add B- AND I- for each).
- Consider class imbalance handling (most tokens are `O`).

### Step D — Wire the model into the live product (the payoff)
Once F1 is satisfying on real resumes, serve it from `resume-service` **behind the
existing dispatcher**, so it becomes a 3rd parsing option without changing any
other code:
1. Copy `trained-model/` into `E:\Joble\resume-service\` (e.g.
   `resume-service\resume-model\`).
2. In `resume-service\.venv`, install inference deps: `torch` (CPU build is fine
   for serving) + `transformers`.
3. In `resume-service\resume_parser.py` add `parse_with_model(text)` that loads the
   model (HuggingFace `pipeline("token-classification", model=..., aggregation_
   strategy="simple")`), runs it, and assembles the same result dict shape as
   `parse_with_groq`/`parse_fields` (keys: name, email, phone, location, summary,
   skills, experience, education, source, textLength). Set `source="model"`.
4. In the `parse_resume(text)` dispatcher, decide the order/flag (e.g. env var
   `USE_LOCAL_MODEL=1` → try model first, fall back to Groq, then regex). **Keep
   the same return shape** so Node/React are untouched.
5. Test: `POST /parse` with a resume; confirm the structured output.

> The contract (`/parse` returns the same JSON shape) never changes — that's the
> whole point of the dispatcher. Swap the engine, nothing downstream breaks.

---

## 8. Mental model / gotchas cheat-sheet
- F1=0.0 + "no predicted samples" warning = model predicts all-`O` (too little
  data). Normal at tiny scale.
- High precision + low recall = cautious model = needs more data.
- KeyError on a label (e.g. `I-PHONE`) = an entity is missing its `B-`/`I-` pair in
  the `LABELS` list in train.py.
- `torch.cuda.is_available() == False` while a GPU exists = you have the `+cpu`
  torch build; reinstall from the cu121 index (see §4).
- Real (Kaggle) data has no names/emails — don't expect the model to learn those
  from it; that's what synthetic data is for.
- Many Groq calls hit rate limits; scripts back off + you resume with `--skip`.

---

## 9. Definition of done (for this track)
A DistilBERT model that, on held-out **real** resumes, extracts skills (and ideally
contact fields) with an F1 that's "good enough" for the user — then served locally
from `resume-service` behind `/parse`, giving a free, private, offline parsing
option alongside Groq. Hitting that = success. Not beating Groq = still a success
as a learning outcome (be honest about this with the user).
