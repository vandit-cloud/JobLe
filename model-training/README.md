# Model Training (R&D track)

Train a local resume-parsing model, the proper way — by **distillation**: use
Groq to auto-generate and auto-label training data, fine-tune a small pretrained
transformer (DistilBERT) on it, and (if it earns its place) serve it from
`resume-service` behind the same `/parse` interface.

This is a **separate environment** from the rest of the app. It has its own
`.venv` and never imports the Node/React code.

```
generate_dataset.py   →  dataset.jsonl     (Groq makes synthetic labeled resumes)
   (later) train.py   →  trained-model/    (fine-tune DistilBERT on your GPU)
   (later) serve       →  resume-service loads trained-model/ for inference
```

## Hardware
- Training: **RTX 3050, 4 GB VRAM** is enough for DistilBERT → use batch size 8,
  max length 256. Training takes minutes.
- Serving: any CPU is fine.

## Installs by phase

**Phase 1 — data collection (now, no GPU):**
```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

**Phase 2 — training (later, GPU):** install the CUDA build of PyTorch FIRST
(see `requirements-train.txt`), then:
```powershell
.\.venv\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cu121
.\.venv\Scripts\python.exe -m pip install -r requirements-train.txt
.\.venv\Scripts\python.exe -c "import torch; print('GPU:', torch.cuda.is_available())"   # expect True
```

**Phase 3 — serving (later):** in `resume-service/.venv`, add `torch` (CPU) + `transformers`.

## Usage (Phase 1)
```powershell
.\.venv\Scripts\python.exe generate_dataset.py --count 50
```
Produces `dataset.jsonl` — one `{resume_text, fields}` example per line. Run it
again (with more `--count`) to keep appending; aim for a few thousand before
training.
