# Entra SSO — Handoff Document

**Date:** 2026-03-19
**Status:** Infrastructure deployed, SSO secrets not yet configured

---

## Where We Are

The Entra SSO login flow is **fully implemented** in code and **deployed** to dev (`hub-dev.atdawntech.com`). However, the login endpoint currently returns **503 "SSO is not configured"** because the Azure secrets in AWS SSM Parameter Store still have `PLACEHOLDER` values.

### What's Done

| Area | Status |
|---|---|
| OAuth 2.0 auth code flow (login → callback → token) | Complete |
| Employee auto-provisioning on first SSO login | Complete |
| Role sync from Entra group membership | Complete |
| Scheduled Entra directory sync (every 4 hours) | Complete |
| Terraform infrastructure (ECS, ALB, SSM, IAM) | Complete |
| CI/CD pipeline (GitHub Actions → ECR → ECS) | Complete |
| Smoke tests (skip gracefully when SSO unconfigured) | Complete |
| Unit tests (365 passing, including 49 SSO-specific) | Complete |
| **Azure SSM secrets populated** | **Not done** |
| **Azure App Registration redirect URI verified** | **Not done** |
| **Entra security groups created and mapped** | **Not done** |
| **Database role mappings seeded** | **Not done** |

---

## What Needs to Happen

### Step 1: Azure Portal — App Registration

Go to **Azure Portal → App registrations → `14743385-8ee5-4d60-94b8-c0f047bffa23`**

1. **Create a client secret** (if one doesn't exist):
   - Certificates & secrets → New client secret
   - Copy the secret **value** (not the ID)

2. **Verify the redirect URI** is registered:
   - Authentication → Add platform → Web
   - Redirect URI: `https://api.hub-dev.atdawntech.com/v1/auth/callback`

3. **Enable ID token issuance:**
   - Authentication → Implicit grant → check "ID tokens"

4. **Add optional claims:**
   - Token configuration → Add optional claim → ID token → `email`, `groups`
   - If prompted, consent to Microsoft Graph permissions

5. **API Permissions** (should already exist):
   - `openid`, `email`, `profile` (delegated)
   - `GroupMember.Read.All` or `Group.Read.All` (application — for background sync)
   - Grant admin consent

### Step 2: Azure Portal — Security Groups

Create three Entra security groups (or identify existing ones):

| Group Purpose | Example Name | Maps to App Role |
|---|---|---|
| System Administrators | `HubV2-Sysadmin` | `System Administrator` |
| Developers | `HubV2-Developer` | `Developer` |
| Regular Users | `HubV2-User` | `User` |

Copy each group's **Object ID** from Azure AD → Groups.

### Step 3: AWS CLI — Set SSM Secrets

Run these commands (requires AWS credentials with SSM write access):

```bash
# Azure client secret (from Step 1)
aws ssm put-parameter \
  --name /hub/dev/api/azure-client-secret \
  --type SecureString \
  --value "<your-azure-client-secret>" \
  --overwrite

# Entra group Object IDs (from Step 2)
aws ssm put-parameter \
  --name /hub/dev/api/azure-sysadmin-group-id \
  --type SecureString \
  --value "<sysadmin-group-object-id>" \
  --overwrite

aws ssm put-parameter \
  --name /hub/dev/api/azure-developer-group-id \
  --type SecureString \
  --value "<developer-group-object-id>" \
  --overwrite

aws ssm put-parameter \
  --name /hub/dev/api/azure-user-group-id \
  --type SecureString \
  --value "<user-group-object-id>" \
  --overwrite
```

### Step 4: Seed Database Role Mappings

The `entra_group_role_mappings` table needs rows linking each Entra group ID to an app role ID. This can be done via:

- A new Alembic migration, or
- Direct SQL insert, or
- The admin API (if exposed)

```sql
INSERT INTO entra_group_role_mappings (id, entra_group_id, role_id, created_at, updated_at)
VALUES
  (gen_random_uuid(), '<sysadmin-group-object-id>', '<sysadmin-role-id>', now(), now()),
  (gen_random_uuid(), '<developer-group-object-id>', '<developer-role-id>', now(), now()),
  (gen_random_uuid(), '<user-group-object-id>', '<user-role-id>', now(), now());
```

Query existing role IDs with: `SELECT id, name FROM roles;`

### Step 5: Force ECS Redeploy

After SSM values are set, ECS needs to restart to pick up the new secrets:

```bash
aws ecs update-service \
  --cluster hub-dev-ecs-cluster \
  --service hub-dev-ecs-api \
  --force-new-deployment
```

Wait for the service to stabilize (~2-3 minutes).

### Step 6: Verify

1. Hit `https://api.hub-dev.atdawntech.com/v1/auth/login` — should 302 to `login.microsoftonline.com`
2. Complete login — should redirect to `https://hub-dev.atdawntech.com/auth/callback?code=<otc>`
3. Frontend exchanges OTC for JWT via `POST /v1/auth/token`
4. Check ECS logs for: `"SSO login successful."` and `"Entra sync scheduler started."`

---

## Architecture Reference

### Authentication Flow

```
Browser                    Backend API                Microsoft Entra
  │                           │                            │
  ├── GET /v1/auth/login ────►│                            │
  │                           ├── Generate CSRF state      │
  │◄── 302 Redirect ─────────┤                            │
  │                           │                            │
  ├── Login at Microsoft ─────┼───────────────────────────►│
  │                           │                            │
  │◄──────────────────────────┼── Redirect with code ──────┤
  │                           │                            │
  ├── GET /v1/auth/callback ─►│                            │
  │                           ├── Validate state           │
  │                           ├── POST /token ────────────►│
  │                           │◄── ID token ───────────────┤
  │                           ├── Extract claims           │
  │                           ├── Provision employee       │
  │                           ├── Sync roles               │
  │                           ├── Issue one-time code      │
  │◄── 302 → frontend ───────┤                            │
  │                           │                            │
  ├── POST /v1/auth/token ───►│                            │
  │                           ├── Validate OTC             │
  │                           ├── Issue 8-hour JWT         │
  │◄── { token } ────────────┤                            │
```

### Background Sync (Every 4 Hours)

```
APScheduler → EntraSyncService.run_scheduled_sync()
  ├── For each EntraGroupRoleMapping:
  │     ├── GraphService.get_group_members(group_id)
  │     │     └── GET https://graph.microsoft.com/v1.0/groups/{id}/members
  │     └── For each member:
  │           ├── Create or update employee record
  │           ├── Sync fields: name, email, job_title, department, location, hire_date
  │           ├── Auto-create missing department/location dropdowns
  │           └── Assign mapped role (idempotent)
  └── Return stats: { created, updated, skipped, errors }
```

### Key Configuration

| Setting | Dev Value | Source |
|---|---|---|
| `AZURE_TENANT_ID` | `6ad1429d-1599-4127-be7e-f6e525c0f158` | terraform.tfvars → ECS env var |
| `AZURE_CLIENT_ID` | `14743385-8ee5-4d60-94b8-c0f047bffa23` | terraform.tfvars → ECS env var |
| `AZURE_REDIRECT_URI` | `https://api.hub-dev.atdawntech.com/v1/auth/callback` | ECS env var (computed) |
| `FRONTEND_URL` | `https://hub-dev.atdawntech.com` | ECS env var |
| `AZURE_CLIENT_SECRET` | (SSM) | `/hub/dev/api/azure-client-secret` |
| `AZURE_SYSADMIN_GROUP_ID` | (SSM) | `/hub/dev/api/azure-sysadmin-group-id` |
| `AZURE_DEVELOPER_GROUP_ID` | (SSM) | `/hub/dev/api/azure-developer-group-id` |
| `AZURE_USER_GROUP_ID` | (SSM) | `/hub/dev/api/azure-user-group-id` |

### Key Files

| File | Purpose |
|---|---|
| `backend/src/adthub/api/auth.py` | Auth API endpoints |
| `backend/src/adthub/services/auth_service.py` | OAuth flow orchestration |
| `backend/src/adthub/services/entra_sync_service.py` | Background directory sync |
| `backend/src/adthub/services/graph_service.py` | Microsoft Graph API client |
| `backend/src/adthub/config.py` | All settings (loaded from env vars) |
| `infrastructure/environments/dev/main.tf` | Full dev infrastructure |
| `infrastructure/modules/ecs/main.tf` | ECS task definition with env vars |

### Test Coverage

| Test File | Count | Covers |
|---|---|---|
| `tests/unit/services/test_auth_service.py` | 20 | Core auth flow units |
| `tests/unit/services/test_auth_service_extended.py` | 35 | Edge cases, handle_callback, JWT, multi-group |
| `tests/unit/api/test_auth_endpoints.py` | 14 | API endpoint behavior |
| `tests/unit/services/test_entra_sync_service.py` | 25 | Sync service |
| `tests/unit/services/test_graph_service.py` | 6 | Graph API client |
| `tests/smoke/test_env.py` | 1 | Login redirect (skips if unconfigured) |
| **Total** | **101** | |

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| 503 "SSO is not configured" | `AZURE_CLIENT_ID` or `AZURE_TENANT_ID` empty | Check SSM/ECS env vars, redeploy |
| 302 but Microsoft shows "invalid redirect" | Redirect URI mismatch | Add exact URI to Azure App Registration |
| 400 "Authentication failed" on callback | State expired or client secret wrong | Check SSM `azure-client-secret` value |
| Login works but no roles assigned | Missing `entra_group_role_mappings` rows | Seed the database (Step 4) |
| Sync runs but no employees created | Group IDs wrong or Graph API permission missing | Check SSM group IDs, verify API permissions |
