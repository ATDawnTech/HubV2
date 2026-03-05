---
description: At Dawn engineering standards router — consulted automatically by AI agents to apply rules.
---

# At Dawn Engineering Standards Router

**FOR AI AGENTS:** Before writing any code, identify your task type below and read the listed standards.

Standards are available at `.standards/` in this repo root (a symlink to the shared `at-dawn-standards` repository).

Always read `PRINCIPLES.md` and `task-completion-checklist.md` — they apply to every task.

---

## Always Read (Every Task)

- `.standards/PRINCIPLES.md` — 10 core engineering principles, the tiebreaker for every decision
- `.standards/task-completion-checklist.md` — run every applicable section before declaring done

---

## Task-Specific Standards

### Writing or modifying a Python service, repository, or business logic
- `.standards/python.md`
- `.standards/postgresql.md`
- `.standards/multi-tenant-data-access.md`
- `.standards/testing.md`

### Writing or modifying an API endpoint
- `.standards/api-design.md`
- `.standards/python.md`
- `.standards/security.md`
- `.standards/testing.md`

### Writing or modifying frontend code (TypeScript/React)
- `.standards/typescript-frontend.md`
- `.standards/api-design.md` (for consuming the API envelope)
- `.standards/testing.md`

### Writing or modifying database schema or migrations
- `.standards/postgresql.md`
- `.standards/multi-tenant-data-access.md`

### Writing or modifying AWS infrastructure or Terraform
- `.standards/terraform.md`
- `.standards/aws-infrastructure.md`
- `.standards/ci-cd.md`
- `.standards/secrets-management.md`

### Adding or modifying a secret, API key, or environment variable
- `.standards/secrets-management.md`
- `.standards/environment-variables.md`

### Adding logging, metrics, health checks, or alerting
- `.standards/observability.md`

### Writing or modifying a CI/CD pipeline or deployment configuration
- `.standards/ci-cd.md`
- `.standards/terraform.md`

### Writing code that handles external user input, auth, or data storage
- `.standards/security.md`
- `.standards/api-design.md`

---

## Repository-Specific Rules

*(Engineers: Add any repository-specific constraints or architectural rules here.)*

---

## When a Situation Is Not Covered

1. Read `.standards/PRINCIPLES.md` and apply the most relevant principle
2. Flag the gap — do not guess or invent a pattern
3. Document the decision in the relevant product standards file
