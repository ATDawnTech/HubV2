# ADT Hub V2 — Infrastructure Guide

**Product name:** `adthub`
**Stack:** ECS Fargate (API) + S3/CloudFront (Frontend) + Shared RDS PostgreSQL
**Environments:** local (Docker), dev, test, prod

---

## Architecture Overview

HubV2 follows the At Dawn shared infrastructure model:

```
Cloudflare DNS
    ├── adthub-dev.atdawntech.com   → CloudFront → S3 (frontend, dev)
    ├── api.adthub-dev.atdawntech.com → ALB → ECS Fargate (API, dev)
    ├── adthub-test.atdawntech.com  → CloudFront → S3 (frontend, test)
    ├── api.adthub-test.atdawntech.com → ALB → ECS Fargate (API, test)
    └── adthub.atdawntech.com       → [migration] → CloudFront → S3 (prod, after cutover)

Shared VPC (at-dawn-infra)
    └── adthub private subnets: 10.x.40.0/24, 10.x.41.0/24 (to be allocated)

Shared RDS (at-dawn-shared-db)
    └── adthub database + user (to be created)

SSM Parameter Store
    ├── /shared/{env}/vpc/adthub-private-subnet-ids  (published by at-dawn-infra)
    ├── /shared/{env}/rds/adthub/database-url        (published by at-dawn-shared-db)
    └── /adthub/{env}/api/{secret-name}              (managed by this repo's Terraform)
```

---

## Prerequisites: Cross-Repo Steps

These must be done **before** running `terraform apply` in this repo.

### Step 1 — `at-dawn-infra`: Allocate adthub subnets

1. Open `at-dawn-infra/modules/shared-vpc/main.tf`
2. Add adthub private subnets (index 40–41):
   ```hcl
   resource "aws_subnet" "adthub_private" {
     count             = 2
     vpc_id            = aws_vpc.main.id
     cidr_block        = cidrsubnet(var.vpc_cidr, 8, 40 + count.index)
     availability_zone = var.availability_zones[count.index]
     tags = { Name = "shared-${var.environment}-subnet-adthub-private-${count.index + 1}" }
   }
   ```
3. Add SSM parameter publishing in each environment's `main.tf`:
   ```hcl
   resource "aws_ssm_parameter" "adthub_private_subnet_ids" {
     name  = "/shared/${var.environment}/vpc/adthub-private-subnet-ids"
     type  = "String"
     value = join(",", module.vpc.adthub_private_subnet_ids)
   }
   ```
4. Apply in dev, then test, then prod.
5. Update `shared-networking.md` R3 allocation table: `40–49 | ADTHub | Private subnets (ECS tasks)`

### Step 2 — `at-dawn-shared-db`: Add adthub database + user

1. Open `at-dawn-shared-db` and add:
   - A `adthub_admin` PostgreSQL user with password stored in SSM
   - A `adthub_{env}` database owned by that user
   - Inbound rules in the shared RDS security group for adthub subnet CIDRs:
     ```hcl
     # adthub private subnets
     cidrsubnet(var.vpc_cidr, 8, 40)  → x.x.40.0/24
     cidrsubnet(var.vpc_cidr, 8, 41)  → x.x.41.0/24
     ```
   - SSM parameters:
     ```
     /shared/{env}/rds/adthub/password      (SecureString)
     /shared/{env}/rds/adthub/database-url  (SecureString — full pg:// URL)
     ```
2. Apply `at-dawn-shared-db` in dev, then test, then prod **before** applying HubV2 Terraform.

---

## Applying HubV2 Terraform

After the cross-repo steps are done:

```bash
cd infrastructure/environments/dev
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Repeat for test, then prod. Review the `terraform plan` output before each apply.

### After first apply — required manual steps

1. **ACM certificate validation** — `terraform output acm_validation_records` shows the CNAME records. Add them to Cloudflare. Certificate validates automatically within 5 minutes.

2. **Cloudflare DNS** — after cert validation, add:
   - `adthub-dev.atdawntech.com` CNAME → `terraform output cloudfront_domain_name`
   - `api.adthub-dev.atdawntech.com` CNAME → `terraform output alb_dns_name`
   - Both records: DNS only (not proxied)

3. **GitHub Secrets** — add per-environment:
   - `AWS_DEV_DEPLOY_ROLE` = `terraform output github_actions_role_arn` (dev env)
   - `AWS_TEST_DEPLOY_ROLE` = (test env output)
   - `AWS_PROD_DEPLOY_ROLE` = (prod env output)

4. **GitHub Variables** — add per-environment:
   - `CLOUDFRONT_DISTRIBUTION_ID_DEV` = CloudFront distribution ID (dev)
   - `CLOUDFRONT_DISTRIBUTION_ID_TEST` = (test)
   - `CLOUDFRONT_DISTRIBUTION_ID_PROD` = (prod)
   - `ECR_REGISTRY_URL` = ECR registry URL (account-level, not per-env)

5. **SAML SSO** — for each environment, create an AWS Identity Center SAML app:
   - App name: `ADTHub Dev`, `ADTHub Test`, `ADTHub Prod`
   - ACS URL: `https://api.{domain}/v1/auth/callback`
   - Entity ID: `adthub-dev`, `adthub-test`, `adthub-prod`
   - Attribute mappings: Subject → `${user:email}` (emailAddress format), email → `${user:email}`
   - Then store the IdP SSO URL and cert in SSM (see `.agent/skills/aws-sso-saml/SKILL.md`):
     ```bash
     aws ssm put-parameter --name "/adthub/{env}/api/saml-idp-sso-url" --value "..." --type SecureString --overwrite
     aws ssm put-parameter --name "/adthub/{env}/api/saml-idp-cert" \
       --value "$(grep -v '^-----' ~/Downloads/certificate.pem | tr -d '\n')" \
       --type SecureString --overwrite
     ```
   - Force a new ECS deployment to pick up the updated SSM values.

---

## SSM Parameter Reference

| Path | Type | Owner | Notes |
|---|---|---|---|
| `/shared/{env}/vpc/adthub-private-subnet-ids` | String | at-dawn-infra | Subnet IDs for ECS tasks |
| `/shared/{env}/rds/adthub/database-url` | SecureString | at-dawn-shared-db | Full pg:// connection URL |
| `/adthub/{env}/api/jwt-secret` | SecureString | This repo (Terraform) | Auto-generated at apply |
| `/adthub/{env}/api/saml-idp-sso-url` | SecureString | Manual (per SKILL.md) | Set after SSO app creation |
| `/adthub/{env}/api/saml-idp-cert` | SecureString | Manual (per SKILL.md) | Set after SSO app creation |
| `/adthub/test/ci/postgres-password` | SecureString | This repo (Terraform, test only) | Isolated CI postgres |
| `/adthub/test/ci/jwt-secret` | SecureString | This repo (Terraform, test only) | Integration test JWT |

---

## Migration Strategy (Legacy ADTHUB → HubV2)

The legacy ADTHUB application (`adthub.atdawntech.com`) runs on S3 + CloudFront backed by Supabase. HubV2 replaces it with ECS Fargate + RDS.

### Approach: parallel run with DNS cutover

1. **Deploy HubV2** to dev and test. Validate fully.
2. **Deploy HubV2 prod** — the new CloudFront and ECS are live but `adthub.atdawntech.com` still points to the old S3 distribution. The new prod runs silently.
3. **Migrate data** — run the Alembic migration from the Supabase schema. Validate data integrity against the test plan.
4. **Smoke test prod** — access the new prod via the ALB DNS name directly (before DNS cutover) to confirm the API is healthy.
5. **DNS cutover** — update the Cloudflare CNAME for `adthub.atdawntech.com` from the old CloudFront domain to the new one. This is the moment the old app stops serving traffic.
6. **Decommission old infra** — after 30 days of stable operation, remove the old Supabase project and old CloudFront distribution.

### What does NOT change at cutover
- The `adthub.atdawntech.com` domain — users see no URL change
- Cloudflare DNS ownership — only the CNAME target changes

### Rollback
- Update the Cloudflare CNAME back to the old CloudFront domain
- Old Supabase data is unaffected — no data was deleted

---

## Local Development

```bash
cd backend
cp .env.example .env
# Edit .env — fill in JWT_SECRET at minimum

docker compose up --build
# API available at http://localhost:3001
# Postgres available at localhost:5432

# Run migrations
poetry run alembic upgrade head

# Health check
curl http://localhost:3001/health
```

---

## Subdomain Reference

| Environment | Frontend | API |
|---|---|---|
| local | http://localhost:5173 | http://localhost:3001 |
| dev | https://adthub-dev.atdawntech.com | https://api.adthub-dev.atdawntech.com |
| test | https://adthub-test.atdawntech.com | https://api.adthub-test.atdawntech.com |
| prod | https://adthub.atdawntech.com | https://api.adthub.atdawntech.com |

---

## SAML Entity IDs

| Environment | Entity ID |
|---|---|
| dev | `adthub-dev` |
| test | `adthub-test` |
| prod | `adthub-prod` |
