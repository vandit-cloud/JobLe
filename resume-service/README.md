# Resume Service (Python / FastAPI)

A **separate** microservice that parses resumes. It is **not** part of the
Node/Express app — it runs on its own port and talks to the rest of the system
only over HTTP. It has no database.

```
React  ──▶  Node/Express (:5000)  ──▶  this service (:8000)
                                   ◀──  { email, phone, skills, textLength }
```

## One-time setup

From this folder (`E:\Joble\resume-service`):

```powershell
py -m venv .venv                              # create the virtual environment
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

A `.venv` folder is Python's `node_modules`: it keeps this service's packages
isolated from your system Python and every other project. It is gitignored.

## Run it

```powershell
.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Then visit:
- http://localhost:8000/health  → `{"status":"ok",...}`
- http://localhost:8000/docs    → interactive Swagger UI (try `POST /parse` here:
  click "Try it out", upload a PDF, Execute)

## What it does (v1)

Extracts plain text from a PDF/DOCX/TXT resume and returns:
- `email`, `phone` (regex)
- `skills` (whole-word matches against `skills.py`)
- `textLength`

No AI yet — that's a later enhancement layered on top of this baseline.
