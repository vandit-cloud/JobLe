"""
The web layer — a tiny FastAPI app that exposes the parser over HTTP.

This is the ENTIRE public surface of the resume service:
  • GET  /health  — is the service up? (handy for Node to check)
  • POST /parse   — send a resume file, get structured JSON back

It holds NO state and touches NO database. File in, JSON out, done.
Run it with:  uvicorn main:app --reload --port 8000
"""
from dotenv import load_dotenv

# Load resume-service/.env (e.g. GROQ_API_KEY) into the environment BEFORE the
# generator reads it. With a key present, /generate-test uses Groq; without one,
# it silently falls back to the question bank.
load_dotenv()

import json

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from resume_parser import (
    extract_text,
    match_required_skills,
    match_skills,
    parse_resume,
)
from test_generator import generate_test

app = FastAPI(title="TalentLeague Resume Service")

# In production only the Node backend should call this. During dev we also
# allow the Vite frontend origin so it's easy to test directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",  # Node/Express backend
        "http://localhost:5173",  # Vite dev frontend
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "resume-parser"}


@app.post("/parse")
async def parse(resume: UploadFile = File(...)):
    # Read the uploaded bytes, turn them into text, then into fields. Uses Groq
    # when a key is set (handles any format), else the regex baseline.
    file_bytes = await resume.read()
    text = extract_text(file_bytes, resume.filename)
    result = parse_resume(text)
    # Include the extracted raw text so Node can STORE it (parse-once:
    # later matching/test-generation reads this text, never the file again).
    result["resumeText"] = text
    return result


@app.post("/match")
async def match_endpoint(
    resume: UploadFile = File(...),
    required_skills: str = Form("[]"),  # JSON array string sent by Node
):
    file_bytes = await resume.read()
    text = extract_text(file_bytes, resume.filename)
    skills = json.loads(required_skills)
    result = match_required_skills(text, skills)
    result["candidateSkills"] = match_skills(text)  # extra context for the UI
    return result


@app.post("/match-text")
async def match_text_endpoint(payload: dict):
    # Same scoring as /match, but for a resume we ALREADY parsed and stored —
    # Node sends the stored text instead of re-uploading the file
    # (parse-once / match-many). Body: {"text": str, "required_skills": [str]}.
    text = payload.get("text", "")
    skills = payload.get("required_skills", [])
    result = match_required_skills(text, skills)
    result["candidateSkills"] = match_skills(text)
    return result


@app.post("/generate-test")
async def generate_test_endpoint(resume: UploadFile = File(...)):
    # Same first two steps as /parse, then draft a test from the text.
    # Returns { questions, source, skillsCovered }.
    file_bytes = await resume.read()
    text = extract_text(file_bytes, resume.filename)
    return generate_test(text)


@app.post("/generate-test-text")
async def generate_test_text_endpoint(payload: dict):
    # Test generation for a STORED candidate — text in, no file needed.
    return generate_test(payload.get("text", ""))
