# Secret Rotation Schedule

Per At Dawn engineering standards (secrets-management.md R6).

---

## Schedule

| Secret | Location | Frequency | Next Due |
|---|---|---|---|
| `JWT_SECRET` | SSM `/hub/dev/api/jwt-secret` | Every 90 days | 2026-06-17 |
| `AZURE_CLIENT_SECRET` (deployed) | SSM `/hub/dev/api/azure-client-secret` | Annually | 2027-03-19 |
| `AZURE_CLIENT_SECRET` (local) | Developer `.env` files | Annually or on exposure | 2027-03-19 |
| `DATABASE_URL` / DB password | SSM `/internal/dev/rds/hubv2/database-url` | Annually | 2027-03-19 |

---

## Rotation Procedures

### JWT Secret (every 90 days)

```bash
# 1. Generate a new secret (min 32 bytes)
NEW_SECRET=$(openssl rand -hex 32)

# 2. Update SSM — existing tokens remain valid until they expire (8h max)
aws ssm put-parameter \
  --name /hub/dev/api/jwt-secret \
  --type SecureString \
  --value "$NEW_SECRET" \
  --overwrite

# 3. Force ECS redeploy to pick up the new value
aws ecs update-service \
  --cluster hub-dev-ecs-cluster \
  --service hub-dev-ecs-api \
  --force-new-deployment

# 4. Verify health after redeploy
aws ecs wait services-stable --cluster hub-dev-ecs-cluster --services hub-dev-ecs-api
curl -s https://api.hub-dev.atdawntech.com/health | jq .
```

> Note: Rotating the JWT secret immediately invalidates all active sessions. Users will be logged out. Schedule during low-traffic hours.

---

### Azure Client Secret (annually or on suspected exposure)

**In Azure Portal:**
1. App registrations → `14743385-8ee5-4d60-94b8-c0f047bffa23`
2. Certificates & secrets → delete the old secret → New client secret
3. Copy the new value immediately (only shown once)
4. Create separate secrets for `hub-dev` (deployed) and `hub-local` (developer `.env` files)

**Update deployed environment:**
```bash
aws ssm put-parameter \
  --name /hub/dev/api/azure-client-secret \
  --type SecureString \
  --value "<new-hub-dev-secret>" \
  --overwrite

aws ecs update-service \
  --cluster hub-dev-ecs-cluster \
  --service hub-dev-ecs-api \
  --force-new-deployment
```

**Notify developers** to update their local `.env` with the new `hub-local` secret.

---

### Database Password (annually)

```bash
# 1. Update the RDS user password via AWS console or CLI
# 2. Update SSM with the new full DATABASE_URL
aws ssm put-parameter \
  --name /internal/dev/rds/hubv2/database-url \
  --type SecureString \
  --value "postgresql+psycopg2://adthub_admin:<new-password>@<host>/adthub_dev" \
  --overwrite

# 3. Force ECS redeploy
aws ecs update-service \
  --cluster hub-dev-ecs-cluster \
  --service hub-dev-ecs-api \
  --force-new-deployment
```

---

## Suspected Exposure Protocol

If any secret is believed to have been exposed (committed to git, shared in Slack, visible in logs, or read by an AI assistant):

1. **Rotate immediately** — do not wait to confirm exposure
2. Follow the rotation procedure above for the affected secret
3. Audit CloudWatch logs for unexpected access patterns
4. Update this document with the new rotation date
5. Notify Michael to document the incident

---

## Rotation Log

| Date | Secret | Reason | Rotated By |
|---|---|---|---|
| 2026-03-19 | `AZURE_CLIENT_SECRET` | Exposed in AI assistant session | — |
