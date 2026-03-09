---
description: At Dawn engineering standards router — consulted automatically by AI agents to apply rules.
---

# At Dawn Engineering Standards Router

**FOR AI AGENTS:** Read `.standards/AGENTS.md` first — it contains shared AWS context,
all SSM parameter paths, ECS naming conventions, and DB auth patterns that apply across
all At Dawn products. Then consult the task-specific standards below.

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

### Product identity
- Product name: `adthub`
- GitHub repo: `ATDawnTech/HubV2`
- Backend port: `3001`

### Infrastructure — cross-repo prerequisite order
HubV2 Terraform cannot be applied until two other repos are applied first:
1. **`at-dawn-infra`** must allocate adthub private subnets (indices 40–41) and publish
   `/shared/{env}/vpc/adthub-private-subnet-ids` to SSM — without this, the `data` lookups fail
2. **`at-dawn-shared-db`** must create the `adthub_admin` user + `adthub_{env}` database and publish
   `/shared/{env}/rds/adthub/database-url` to SSM — without this, ECS tasks cannot connect to the DB

Attempting `terraform apply` in this repo before these two are applied will fail. Always check that
the SSM parameters exist before applying.

### Infrastructure — migration state (prod)
`adthub.atdawntech.com` currently serves the **legacy ADTHUB app** (S3 + CloudFront + Supabase).
The HubV2 prod infrastructure is declared in `infrastructure/environments/prod/` but the DNS cutover
has **not yet happened**. Do not touch Cloudflare DNS for `adthub.atdawntech.com` or
`api.adthub.atdawntech.com` without explicit instruction. See `docs/INFRASTRUCTURE.md` for the
full migration and cutover plan.

### SSM parameter paths (adthub)
| Path | Source |
|---|---|
| `/shared/{env}/vpc/adthub-private-subnet-ids` | `at-dawn-infra` (must exist before apply) |
| `/shared/{env}/rds/adthub/database-url` | `at-dawn-shared-db` (must exist before apply) |
| `/adthub/{env}/api/jwt-secret` | This repo's Terraform (auto-generated) |
| `/adthub/{env}/api/saml-idp-sso-url` | Manual — see `.standards/.agent/skills/aws-sso-saml/SKILL.md` |
| `/adthub/{env}/api/saml-idp-cert` | Manual — see `.standards/.agent/skills/aws-sso-saml/SKILL.md` |
| `/adthub/test/ci/postgres-password` | This repo's Terraform (test env only) |
| `/adthub/test/ci/jwt-secret` | This repo's Terraform (test env only) |

### SAML entity IDs
`adthub-dev`, `adthub-test`, `adthub-prod`

### Full infrastructure reference
See `docs/INFRASTRUCTURE.md` for the complete setup checklist, subnet allocation, migration strategy,
and subdomain reference.

---

## When a Situation Is Not Covered

1. Read `.standards/PRINCIPLES.md` and apply the most relevant principle
2. Flag the gap — do not guess or invent a pattern
3. Document the decision in the relevant product standards file
