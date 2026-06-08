# A starter list of skills we look for in a resume. Deliberately small and
# easy to grow over time. Keep every entry LOWERCASE here — the matcher
# lowercases the resume text before comparing, so a candidate writing "Python"
# or "PYTHON" still matches "python".
#
# NOTE (v1 limitation): we stick to plain word/space skills for now. Skills
# with punctuation (C++, C#, Node.js, .NET) need special handling because the
# word-boundary matching below treats punctuation as a separator — that's a
# deliberate follow-up, not an oversight.
KNOWN_SKILLS = [
    # languages
    "python", "javascript", "typescript", "java", "golang", "rust", "php",
    # frontend
    "react", "angular", "vue", "html", "css", "tailwind",
    # backend / frameworks
    "nodejs", "express", "django", "flask", "fastapi", "spring",
    # databases
    "mongodb", "postgresql", "mysql", "redis", "sql",
    # devops / cloud / tools
    "docker", "kubernetes", "aws", "azure", "git", "linux",
    # data / ml
    "tensorflow", "pytorch", "pandas", "numpy", "machine learning",
]
