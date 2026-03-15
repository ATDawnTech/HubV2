#!/usr/bin/env python3
"""Seed the skills catalog via the admin API.

Uses only stdlib (urllib) — no extra packages required beyond PyJWT which is
already a backend dependency.

Usage:
    # From the backend/ directory (with the venv active):
    python scripts/seed_skills.py

    # Custom base URL or JWT secret:
    BASE_URL=http://localhost:8000 JWT_SECRET=my-secret python scripts/seed_skills.py
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

import jwt  # PyJWT — already in pyproject.toml

BASE_URL    = os.getenv("BASE_URL", "http://localhost:3001")
EMPLOYEE_ID = os.getenv("SEED_EMPLOYEE_ID", "emp_seed_script")

# Read JWT_SECRET from env var, falling back to .env file in the backend dir
def _resolve_jwt_secret() -> str:
    env_val = os.getenv("JWT_SECRET")
    if env_val:
        return env_val
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.isfile(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("JWT_SECRET=") and not line.startswith("#"):
                    return line.split("=", 1)[1].strip()
    return "dev-secret-change-in-production"

JWT_SECRET = _resolve_jwt_secret()

# ---------------------------------------------------------------------------
# Skills list — (name, category)
# ---------------------------------------------------------------------------

SKILLS: list[tuple[str, str]] = [
    # Programming Languages
    ("Python",              "Programming Languages"),
    ("JavaScript",          "Programming Languages"),
    ("TypeScript",          "Programming Languages"),
    ("Java",                "Programming Languages"),
    ("C#",                  "Programming Languages"),
    ("C++",                 "Programming Languages"),
    ("C",                   "Programming Languages"),
    ("Go",                  "Programming Languages"),
    ("Rust",                "Programming Languages"),
    ("Ruby",                "Programming Languages"),
    ("PHP",                 "Programming Languages"),
    ("Swift",               "Programming Languages"),
    ("Kotlin",              "Programming Languages"),
    ("Scala",               "Programming Languages"),
    ("R",                   "Programming Languages"),
    ("Dart",                "Programming Languages"),
    ("Elixir",              "Programming Languages"),
    ("Haskell",             "Programming Languages"),
    ("Lua",                 "Programming Languages"),
    ("Perl",                "Programming Languages"),
    ("Groovy",              "Programming Languages"),
    ("Objective-C",         "Programming Languages"),
    ("F#",                  "Programming Languages"),
    ("Clojure",             "Programming Languages"),
    ("Erlang",              "Programming Languages"),
    ("Bash / Shell",        "Programming Languages"),
    ("PowerShell",          "Programming Languages"),
    ("COBOL",               "Programming Languages"),
    ("Zig",                 "Programming Languages"),
    ("Julia",               "Programming Languages"),

    # Frontend
    ("React",               "Frontend"),
    ("Vue.js",              "Frontend"),
    ("Angular",             "Frontend"),
    ("Svelte",              "Frontend"),
    ("Next.js",             "Frontend"),
    ("Nuxt.js",             "Frontend"),
    ("Remix",               "Frontend"),
    ("Astro",               "Frontend"),
    ("HTML",                "Frontend"),
    ("CSS",                 "Frontend"),
    ("SASS / SCSS",         "Frontend"),
    ("Tailwind CSS",        "Frontend"),
    ("Bootstrap",           "Frontend"),
    ("Material UI",         "Frontend"),
    ("Redux",               "Frontend"),
    ("Zustand",             "Frontend"),
    ("Webpack",             "Frontend"),
    ("Vite",                "Frontend"),
    ("Three.js",            "Frontend"),
    ("D3.js",               "Frontend"),
    ("WebAssembly",         "Frontend"),
    ("Storybook",           "Frontend"),
    ("Electron",            "Frontend"),
    ("Tauri",               "Frontend"),

    # Backend
    ("Node.js",             "Backend"),
    ("Express.js",          "Backend"),
    ("FastAPI",             "Backend"),
    ("Django",              "Backend"),
    ("Flask",               "Backend"),
    ("Spring Boot",         "Backend"),
    ("ASP.NET",             "Backend"),
    ("Laravel",             "Backend"),
    ("Ruby on Rails",       "Backend"),
    ("NestJS",              "Backend"),
    ("GraphQL",             "Backend"),
    ("gRPC",                "Backend"),
    ("WebSockets",          "Backend"),
    ("Celery",              "Backend"),
    ("RabbitMQ",            "Backend"),
    ("Apache Kafka",        "Backend"),
    ("Nginx",               "Backend"),
    ("OAuth / OAuth2",      "Backend"),
    ("JWT",                 "Backend"),
    ("REST API Design",     "Backend"),
    ("Microservices",       "Backend"),

    # Mobile
    ("React Native",        "Mobile"),
    ("Flutter",             "Mobile"),
    ("SwiftUI",             "Mobile"),
    ("Jetpack Compose",     "Mobile"),
    ("Expo",                "Mobile"),
    ("Ionic",               "Mobile"),
    ("Capacitor",           "Mobile"),
    ("Firebase",            "Mobile"),

    # DevOps & Cloud
    ("Docker",              "DevOps & Cloud"),
    ("Kubernetes",          "DevOps & Cloud"),
    ("AWS",                 "DevOps & Cloud"),
    ("Azure",               "DevOps & Cloud"),
    ("Google Cloud Platform", "DevOps & Cloud"),
    ("Terraform",           "DevOps & Cloud"),
    ("Ansible",             "DevOps & Cloud"),
    ("Pulumi",              "DevOps & Cloud"),
    ("Jenkins",             "DevOps & Cloud"),
    ("GitHub Actions",      "DevOps & Cloud"),
    ("GitLab CI/CD",        "DevOps & Cloud"),
    ("CircleCI",            "DevOps & Cloud"),
    ("ArgoCD",              "DevOps & Cloud"),
    ("Helm",                "DevOps & Cloud"),
    ("Prometheus",          "DevOps & Cloud"),
    ("Grafana",             "DevOps & Cloud"),
    ("Datadog",             "DevOps & Cloud"),
    ("ELK Stack",           "DevOps & Cloud"),
    ("Linux",               "DevOps & Cloud"),
    ("Git",                 "DevOps & Cloud"),
    ("Serverless",          "DevOps & Cloud"),
    ("Vercel",              "DevOps & Cloud"),
    ("Netlify",             "DevOps & Cloud"),
    ("CI/CD",               "DevOps & Cloud"),
    ("AWS CDK",             "DevOps & Cloud"),
    ("CloudFormation",      "DevOps & Cloud"),

    # Databases
    ("PostgreSQL",          "Databases"),
    ("MySQL",               "Databases"),
    ("SQLite",              "Databases"),
    ("MongoDB",             "Databases"),
    ("Redis",               "Databases"),
    ("Cassandra",           "Databases"),
    ("DynamoDB",            "Databases"),
    ("Elasticsearch",       "Databases"),
    ("CockroachDB",         "Databases"),
    ("Neo4j",               "Databases"),
    ("InfluxDB",            "Databases"),
    ("SQL Server",          "Databases"),
    ("Oracle DB",           "Databases"),
    ("MariaDB",             "Databases"),
    ("Supabase",            "Databases"),
    ("Firestore",           "Databases"),
    ("SQLAlchemy",          "Databases"),
    ("Prisma",              "Databases"),
    ("TypeORM",             "Databases"),

    # Data & AI/ML
    ("Machine Learning",    "Data & AI/ML"),
    ("Deep Learning",       "Data & AI/ML"),
    ("TensorFlow",          "Data & AI/ML"),
    ("PyTorch",             "Data & AI/ML"),
    ("Keras",               "Data & AI/ML"),
    ("scikit-learn",        "Data & AI/ML"),
    ("Pandas",              "Data & AI/ML"),
    ("NumPy",               "Data & AI/ML"),
    ("Matplotlib",          "Data & AI/ML"),
    ("Plotly",              "Data & AI/ML"),
    ("Jupyter",             "Data & AI/ML"),
    ("Apache Spark",        "Data & AI/ML"),
    ("Apache Airflow",      "Data & AI/ML"),
    ("dbt",                 "Data & AI/ML"),
    ("Power BI",            "Data & AI/ML"),
    ("Tableau",             "Data & AI/ML"),
    ("Looker",              "Data & AI/ML"),
    ("NLP",                 "Data & AI/ML"),
    ("Computer Vision",     "Data & AI/ML"),
    ("LLMs",                "Data & AI/ML"),
    ("LangChain",           "Data & AI/ML"),
    ("RAG",                 "Data & AI/ML"),
    ("Hugging Face",        "Data & AI/ML"),
    ("OpenAI API",          "Data & AI/ML"),
    ("Pinecone",            "Data & AI/ML"),
    ("Data Engineering",    "Data & AI/ML"),
    ("ETL",                 "Data & AI/ML"),

    # Security
    ("Penetration Testing", "Security"),
    ("OWASP",               "Security"),
    ("Network Security",    "Security"),
    ("Application Security","Security"),
    ("Cloud Security",      "Security"),
    ("Identity & Access Management", "Security"),
    ("Zero Trust",          "Security"),
    ("SOC Analysis",        "Security"),
    ("Incident Response",   "Security"),
    ("SIEM",                "Security"),
    ("Cryptography",        "Security"),
    ("TLS / SSL",           "Security"),
    ("OpenID Connect",      "Security"),
    ("SAML",                "Security"),
    ("DevSecOps",           "Security"),
    ("Security Compliance", "Security"),

    # Testing
    ("Unit Testing",        "Testing"),
    ("Integration Testing", "Testing"),
    ("End-to-End Testing",  "Testing"),
    ("TDD",                 "Testing"),
    ("BDD",                 "Testing"),
    ("Load Testing",        "Testing"),
    ("API Testing",         "Testing"),
    ("Jest",                "Testing"),
    ("Vitest",              "Testing"),
    ("Pytest",              "Testing"),
    ("JUnit",               "Testing"),
    ("Selenium",            "Testing"),
    ("Playwright",          "Testing"),
    ("Cypress",             "Testing"),
    ("k6",                  "Testing"),
    ("JMeter",              "Testing"),
    ("Postman",             "Testing"),

    # Design & UX
    ("Figma",               "Design & UX"),
    ("Adobe XD",            "Design & UX"),
    ("Sketch",              "Design & UX"),
    ("Framer",              "Design & UX"),
    ("UI/UX Design",        "Design & UX"),
    ("Accessibility (WCAG)","Design & UX"),
    ("Design Systems",      "Design & UX"),
    ("Wireframing",         "Design & UX"),
    ("Prototyping",         "Design & UX"),
    ("User Research",       "Design & UX"),

    # Architecture & Practices
    ("System Design",       "Architecture & Practices"),
    ("Architecture Design", "Architecture & Practices"),
    ("Domain-Driven Design","Architecture & Practices"),
    ("Event Sourcing",      "Architecture & Practices"),
    ("CQRS",                "Architecture & Practices"),
    ("Agile",               "Architecture & Practices"),
    ("Scrum",               "Architecture & Practices"),
    ("Code Review",         "Architecture & Practices"),
    ("Monorepo Management", "Architecture & Practices"),
    ("API Design",          "Architecture & Practices"),
    ("Technical Documentation", "Architecture & Practices"),
]


def make_token() -> str:
    payload = {"sub": EMPLOYEE_ID, "iat": int(time.time()), "exp": int(time.time()) + 300}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def post_skill(url: str, token: str, name: str, category: str) -> int:
    """POST a single skill. Returns the HTTP status code."""
    body = json.dumps({"name": name, "category": category}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code


def main() -> None:
    url = f"{BASE_URL}/v1/admin/skills"
    token = make_token()
    created = skipped = failed = 0

    batch = 0
    for name, category in SKILLS:
        status = post_skill(url, token, name, category)
        if status == 201:
            created += 1
            batch += 1
            print(f"  +  {name}")
        elif status == 409:
            skipped += 1
            print(f"  -  {name} (already exists)")
        elif status == 429:
            # Rate limited — wait and retry
            print(f"  …  rate limited, waiting 60s…")
            time.sleep(60)
            token = make_token()  # refresh token in case it expired
            status = post_skill(url, token, name, category)
            if status == 201:
                created += 1
                batch = 1
                print(f"  +  {name}")
            elif status == 409:
                skipped += 1
                print(f"  -  {name} (already exists)")
            else:
                failed += 1
                print(f"  !  {name} — HTTP {status}", file=sys.stderr)
        else:
            failed += 1
            print(f"  !  {name} — HTTP {status}", file=sys.stderr)
        # Pause before hitting rate limit (30/min)
        if batch >= 28:
            print(f"  …  pausing 60s to avoid rate limit…")
            time.sleep(60)
            token = make_token()
            batch = 0

    print(f"\nDone — {created} created, {skipped} skipped, {failed} failed.")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
