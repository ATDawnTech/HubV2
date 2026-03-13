---
description: At Dawn engineering standards router — consulted automatically by AI agents to apply rules.
version: 1.1
last_updated: 2026-03-13
---

# At Dawn Engineering Standards Router

**FOR AI AGENTS:** Read `.standards/AGENTS.md` first — it contains shared AWS context,
all SSM parameter paths, ECS naming conventions, and DB auth patterns that apply across
all At Dawn products. Then consult the task-specific standards below.

**FOR AI AGENTS:** Before writing any code, identify your task type below and read the listed standards.

Standards are available at `.standards/` in this repo root (a symlink to the shared `at-dawn-standards` repository).

Always read `PRINCIPLES.md` and `task-completion-checklist.md` — they apply to every task.

---

## Mandatory Verification (Every Task)

Before declaring any task complete or calling `notify_user`, you **MUST** run the Standards Audit workflow:

1. Type `/standards-audit` to trigger the pedantic auditor persona.
2. Resolve all items in the Non-Compliance Log (NCL).
3. Confirm 100% compliance in your final message.

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
- Product name: `hub`
- GitHub repo: `ATDawnTech/HubV2`
- Backend port: `3001`

### AWS accounts
| Environment | Account ID | AWS profile |
|---|---|---|
| dev | `548470137722` | `internal-dev` |
| prod | `380958218583` | `internal-prod` |

### URLs
| Environment | Frontend | API |
|---|---|---|
| dev | `https://hub-dev.atdawntech.com` | `https://api.hub-dev.atdawntech.com` |
| prod | `https://hub.atdawntech.com` | `https://api.hub.atdawntech.com` |

### Infrastructure — cross-repo prerequisite order
HubV2 Terraform depends on resources provisioned by other repos. Confirm these SSM parameters
exist **before** running `terraform apply`:

| SSM path | Source repo |
|---|---|
| `/internal/{env}/vpc/id` | `at-dawn-infra` |
| `/internal/{env}/vpc/public-subnet-ids` | `at-dawn-infra` |
| `/internal/{env}/vpc/hubv2-private-subnet-ids` | `at-dawn-infra` |
| `/internal/{env}/rds/hubv2/database-url` | `at-dawn-shared-db` (Lambda bootstrap) |

All four parameters are already provisioned in both 548470137722 (dev) and 380958218583 (prod)
as of 2026-03-13.

### Terraform state
| Environment | S3 bucket | Key |
|---|---|---|
| dev | `shared-prod-s3-terraform-state` | `hub/dev/terraform.tfstate` |
| prod | `shared-prod-s3-terraform-state` | `hub/prod/terraform.tfstate` |

State bucket lives in the legacy shared account (662722197745).

### Terraform apply commands
```bash
# Dev
cd infrastructure/environments/dev
AWS_PROFILE=internal-dev terraform init -reconfigure
AWS_PROFILE=internal-dev terraform plan
AWS_PROFILE=internal-dev terraform apply

# Prod
cd infrastructure/environments/prod
AWS_PROFILE=internal-prod terraform init -reconfigure
AWS_PROFILE=internal-prod terraform plan
AWS_PROFILE=internal-prod terraform apply
```

### ECS / ECR naming
| Resource | Dev | Prod |
|---|---|---|
| ECS cluster | `hub-dev-ecs-cluster` | `hub-prod-ecs-cluster` |
| ECS service | `hub-dev-ecs-api` | `hub-prod-ecs-api` |
| ECR repo | `hub-dev-api` | `hub-prod-api` |
| ECR registry | `548470137722.dkr.ecr.us-east-1.amazonaws.com` | `380958218583.dkr.ecr.us-east-1.amazonaws.com` |
| S3 frontend bucket | `hub-dev-s3-frontend` | `hub-prod-s3-frontend` |
| CloudFront dist ID | `E1YT0QP70ZALGX` | `E2GSBB5RFF3562` |
| ALB DNS | (see terraform output) | `hub-prod-alb-38134155.us-east-1.elb.amazonaws.com` |

### GitHub Actions secrets and variables
| Name | Type | Value / notes |
|---|---|---|
| `AWS_DEV_DEPLOY_ROLE` | Secret | IAM role ARN in 548470137722 for dev deploys |
| `AWS_PROD_DEPLOY_ROLE` | Secret | `arn:aws:iam::380958218583:role/hub-prod-github-actions-role` |
| `ECR_REGISTRY_URL` | Variable | `548470137722.dkr.ecr.us-east-1.amazonaws.com` |
| `ECR_REGISTRY_URL_PROD` | Variable | `380958218583.dkr.ecr.us-east-1.amazonaws.com` |
| `CLOUDFRONT_DISTRIBUTION_ID_DEV` | Variable | `E1YT0QP70ZALGX` |
| `CLOUDFRONT_DISTRIBUTION_ID_PROD` | Variable | `E2GSBB5RFF3562` |

### SSM parameter paths (hub)
| Path | Source |
|---|---|
| `/internal/{env}/vpc/hubv2-private-subnet-ids` | `at-dawn-infra` (must exist before apply) |
| `/internal/{env}/rds/hubv2/database-url` | `at-dawn-shared-db` (must exist before apply) |
| `/hub/{env}/api/jwt-secret` | This repo's Terraform (auto-generated) |
| `/hub/{env}/api/saml-idp-sso-url` | Manual — see `.standards/.agent/skills/aws-sso-saml/SKILL.md` |
| `/hub/{env}/api/saml-idp-cert` | Manual — see `.standards/.agent/skills/aws-sso-saml/SKILL.md` |

### SAML entity IDs
`hub-dev`, `hub-prod`

### GitHub OIDC provider status
| Account | Provider exists |
|---|---|
| 548470137722 (dev) | Yes — `create_provider = false` in dev/main.tf |
| 380958218583 (prod) | Yes (created 2026-03-13) — keep `create_provider = true` in prod/main.tf |

### CI pipeline overview (deploy-dev.yml — triggers on push to main)
1. **Unit & Schema Tests** — pytest with Postgres service container on port 5434 (matches `config.py` defaults: `adthub_admin` / `adthub_test` / `localpassword`)
2. **Integration Tests** — ephemeral Postgres on port 5432, ephemeral secrets generated inline, runs alembic then pytest
3. **Frontend -> S3 + CloudFront (Dev)** — blocked until frontend code merged to main (needs `package-lock.json` in repo root)
4. **Backend -> ECR + ECS (Dev)** — blocked until `Dockerfile` added to `backend/`
5. **Smoke Test (Dev)** — hits `https://api.hub-dev.atdawntech.com/health`

### CI pipeline overview (deploy-prod.yml — manual workflow_dispatch only)
1. **Frontend -> S3 + CloudFront (Prod)**
2. **Backend -> ECR + ECS (Prod)**
3. **Smoke Test (Prod)** — hits `https://api.hub.atdawntech.com/health`

Requires `prod` GitHub Environment with Michael as required reviewer.

### Known gaps (as of 2026-03-13)
- Frontend code lives on a separate branch (not yet merged to main) — frontend deploy job will fail until merged
- No `Dockerfile` in `backend/` — backend deploy job will fail until added
- SAML IDP not yet configured for dev or prod (Issue #2)

### Full infrastructure reference
See `docs/INFRASTRUCTURE.md` for the complete setup checklist, subnet allocation, migration strategy,
and subdomain reference.

---

## Skills & Operational Protocols

**Mandatory Discovery**: List contents of `.standards/.agent/skills/` at session start. Read the `SKILL.md` for any skill before performing related work.

---

## When a Situation Is Not Covered

1. Read `.standards/PRINCIPLES.md` and apply the most relevant principle
2. Flag the gap — do not guess or invent a pattern
3. Document the decision in the relevant product standards file
