"""
A small, hand-written bank of MCQs keyed by skill. This is the NO-AI fallback
used when no Groq API key is configured: we look at which skills the resume
mentions and pull matching questions from here.

Each question has the SAME shape as a hand-made test question in the main app:
  { "text": str, "options": [str, str, str, str], "correctIndex": int }
so the generated draft drops straight into the existing TestForm.

Grow this freely — more skills and more questions per skill = better drafts.
Keys must be lowercase and match entries in skills.py.
"""
QUESTION_BANK = {
    "python": [
        {
            "text": "What is the output of: len([1, 2, 3])?",
            "options": ["2", "3", "4", "Error"],
            "correctIndex": 1,
        },
        {
            "text": "Which keyword defines a function in Python?",
            "options": ["func", "def", "function", "lambda"],
            "correctIndex": 1,
        },
    ],
    "javascript": [
        {
            "text": "Which keyword declares a block-scoped variable in JS?",
            "options": ["var", "let", "int", "def"],
            "correctIndex": 1,
        },
        {
            "text": "What does '===' check in JavaScript?",
            "options": [
                "Value only",
                "Type only",
                "Value AND type",
                "Reference only",
            ],
            "correctIndex": 2,
        },
    ],
    "typescript": [
        {
            "text": "TypeScript adds what to JavaScript?",
            "options": ["A runtime", "Static types", "A database", "A bundler"],
            "correctIndex": 1,
        },
    ],
    "react": [
        {
            "text": "What does the useState hook return?",
            "options": [
                "A single value",
                "A [value, setter] pair",
                "A promise",
                "Nothing",
            ],
            "correctIndex": 1,
        },
        {
            "text": "When does a React component re-render?",
            "options": [
                "Only on page reload",
                "When its state or props change",
                "Every second",
                "Never automatically",
            ],
            "correctIndex": 1,
        },
    ],
    "nodejs": [
        {
            "text": "Node.js runs JavaScript using which engine?",
            "options": ["SpiderMonkey", "V8", "Chakra", "Nashorn"],
            "correctIndex": 1,
        },
    ],
    "express": [
        {
            "text": "In Express, what does app.get() define?",
            "options": [
                "A database query",
                "A route for HTTP GET requests",
                "A template",
                "A middleware error handler",
            ],
            "correctIndex": 1,
        },
    ],
    "mongodb": [
        {
            "text": "MongoDB stores data as:",
            "options": ["Tables and rows", "Documents (BSON/JSON)", "CSV files", "Graphs"],
            "correctIndex": 1,
        },
    ],
    "sql": [
        {
            "text": "Which SQL clause filters rows?",
            "options": ["ORDER BY", "WHERE", "GROUP BY", "SELECT"],
            "correctIndex": 1,
        },
    ],
    "postgresql": [
        {
            "text": "PostgreSQL is what kind of database?",
            "options": ["Relational (SQL)", "Document", "Key-value", "Graph"],
            "correctIndex": 0,
        },
    ],
    "docker": [
        {
            "text": "A Docker image is best described as:",
            "options": [
                "A running process",
                "A read-only template for containers",
                "A virtual machine",
                "A network port",
            ],
            "correctIndex": 1,
        },
    ],
    "git": [
        {
            "text": "Which command creates a new commit?",
            "options": ["git push", "git commit", "git clone", "git fetch"],
            "correctIndex": 1,
        },
    ],
    "html": [
        {
            "text": "What does the <a> tag create?",
            "options": ["An image", "A hyperlink", "A list", "A table"],
            "correctIndex": 1,
        },
    ],
    "css": [
        {
            "text": "Which CSS property changes text color?",
            "options": ["font", "color", "background", "text-align"],
            "correctIndex": 1,
        },
    ],
    "java": [
        {
            "text": "Java programs run on top of the:",
            "options": ["JVM", "V8", "CLR", "Node runtime"],
            "correctIndex": 0,
        },
    ],
    "fastapi": [
        {
            "text": "FastAPI is primarily used to build:",
            "options": ["Mobile apps", "REST APIs", "Desktop GUIs", "Databases"],
            "correctIndex": 1,
        },
    ],
    "django": [
        {
            "text": "Django is a web framework for which language?",
            "options": ["Ruby", "Python", "PHP", "Go"],
            "correctIndex": 1,
        },
    ],
    "flask": [
        {
            "text": "Flask is best described as:",
            "options": [
                "A heavy, batteries-included framework",
                "A lightweight (micro) web framework",
                "A database",
                "A frontend library",
            ],
            "correctIndex": 1,
        },
    ],
    "aws": [
        {
            "text": "Amazon S3 is mainly used for:",
            "options": ["Compute", "Object storage", "DNS", "Email"],
            "correctIndex": 1,
        },
    ],
    "machine learning": [
        {
            "text": "In supervised learning, the training data is:",
            "options": ["Unlabeled", "Labeled", "Random", "Encrypted"],
            "correctIndex": 1,
        },
    ],
}

# Used to top up a draft when the resume matched too few skills, so the
# recruiter never ends up with an almost-empty test.
GENERIC_QUESTIONS = [
    {
        "text": "What does API stand for?",
        "options": [
            "Applied Programming Interface",
            "Application Programming Interface",
            "Automated Process Integration",
            "Advanced Protocol Interface",
        ],
        "correctIndex": 1,
    },
    {
        "text": "Which data structure works first-in, first-out (FIFO)?",
        "options": ["Stack", "Queue", "Tree", "Graph"],
        "correctIndex": 1,
    },
    {
        "text": "What is the time complexity of binary search on a sorted array?",
        "options": ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
        "correctIndex": 1,
    },
]
