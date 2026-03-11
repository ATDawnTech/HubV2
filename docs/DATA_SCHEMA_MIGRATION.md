# ADT Hub V2 – Data Schema

**Version:** 1.0
**Date:** March 2026
**Source:** 19 ADTHUB Supabase migrations + Legacy API Map + ADT Hub Spec Plan v1.0

---

## Overview

This document defines the HubV2 data schema. It is derived from the legacy ADTHUB Supabase schema and updated to support the full ADT Hub Spec Plan. Each section identifies:
- The final resolved legacy table state (after all 19 migrations)
- Whether each table is reused as-is, extended, replaced, or retired
- Net new tables required by HubV2 that have no legacy equivalent
- Cross-module foreign key relationships

**Tech note:** HubV2 moves away from Supabase Auth (`auth.users`) as the identity anchor. The new `employees` table is the authoritative identity record. All module FKs reference `employees.id`.

---

## A. Legacy Schema Inventory & Reuse Assessment

### Legend
- **Reuse** — table maps cleanly to HubV2 with no changes required
- **Extend** — table is reusable but needs new columns
- **Replace** — concept exists but table structure needs redesign
- **Retire** — legacy-only, not needed in HubV2

---

### `profiles` → **Extend** → becomes `employees`
**HubV2 Module:** Epic 1 – Employee Management

The legacy `profiles` table is the core employee identity record. In HubV2 it is renamed to `employees` and extended with fields required by the spec. The `auth.users` dependency is removed; identity management is handled by HubV2's own auth layer.

| Column        | Type           | Nullable | Default           | Constraints                             | HubV2 Status                          |
| ------------- | -------------- | -------- | ----------------- | --------------------------------------- | ------------------------------------- |
| id            | uuid           | NO       | gen_random_uuid() | PK                                      | Keep                                  |
| user_id       | uuid           | NO       | —                 | UNIQUE (FK → auth.users.id)             | Replace with internal auth FK         |
| email         | text           | NO       | —                 | UNIQUE                                  | Keep as `work_email`                  |
| full_name     | text           | YES      | —                 | —                                       | Split into `first_name`, `last_name`  |
| role          | user_role ENUM | YES      | 'staff'           | CHECK: admin, staff, hr, finance        | Migrate to roles table (Epic 2.3)     |
| photo_path    | text           | YES      | —                 | —                                       | Keep                                  |
| location      | text           | YES      | —                 | —                                       | Keep                                  |
| is_active     | boolean        | YES      | true              | —                                       | Replace with `status` ENUM            |
| cost_annual   | numeric        | YES      | —                 | CHECK >= 0                              | Keep                                  |
| currency_code | text           | YES      | 'USD'             | CHECK: USD, INR, VND, SGD               | Keep; move to FK → `config_dropdowns` |
| margin_pct    | numeric        | YES      | 30                | CHECK 0–100                             | Keep                                  |
| rate_hourly   | numeric        | YES      | GENERATED STORED  | (cost_annual * (1 + margin/100)) / 1920 | Keep                                  |
| employee_code | text           | YES      | —                 | UNIQUE                                  | Keep                                  |
| job_title     | text           | YES      | —                 | —                                       | Keep                                  |
| department    | text           | YES      | —                 | FK → config_dropdowns                   | Keep; FK-ify                          |
| manager_id    | uuid           | YES      | —                 | FK → employees.id                       | Keep                                  |
| joined_on     | date           | YES      | —                 | —                                       | Keep as `hire_date`                   |
| blocked       | boolean        | YES      | false             | —                                       | Replace with `status` field           |
| ats_role      | ats_role ENUM  | YES      | —                 | —                                       | Move to role_assignments table        |
| created_at    | timestamptz    | NO       | now()             | —                                       | Keep                                  |
| updated_at    | timestamptz    | NO       | now()             | —                                       | Keep                                  |

**New columns to add:**
| Column          | Type        | Notes                                                           |
| --------------- | ----------- | --------------------------------------------------------------- |
| employee_number | text        |
| first_name      | text        | Split from full_name                                            |
| last_name       | text        | Split from full_name                                            |
| personal_email  | text        | UNIQUE; required by Epic 1                                      |
| phone           | text        | —                                                               |
| address         | text        | —                                                               |
| hire_type       | text        | FK → config_dropdowns; Full-time/Part-time/Contractor/Staff Aug |
| work_mode       | text        | FK → config_dropdowns; Remote/Hybrid/In-Person                  |
| status          | text        | ENUM: active, archiving, archived                               |
| archived_at     | timestamptz | Set when status → archiving                                     |

---

### `skills_catalog` → **Reuse**
**HubV2 Module:** Epic 2 – System Config (Skill Repository)

| Column     | Type        | Nullable | Default           | Constraints                        |
| ---------- | ----------- | -------- | ----------------- | ---------------------------------- |
| id         | uuid        | NO       | gen_random_uuid() | PK                                 |
| name       | text        | NO       | —                 | UNIQUE                             |
| category   | text        | YES      | —                 | —                                  |
| created_by | uuid        | YES      | —                 | FK → employees.id *(add in HubV2)* |
| created_at | timestamptz | YES      | now()             | —                                  |
| updated_at | timestamptz | YES      | now()             | —                                  |

---

### `employee_skills` → **Extend**
**HubV2 Module:** Epic 1 – Employee Management

| Column     | Type        | Nullable | Default | Constraints                            |
| ---------- | ----------- | -------- | ------- | -------------------------------------- |
| user_id    | uuid        | NO       | —       | PK (composite), FK → employees.id      |
| skill_id   | uuid        | NO       | —       | PK (composite), FK → skills_catalog.id |
| level      | int         | NO       | —       | CHECK 0–9                              |
| years      | numeric     | YES      | 0       | —                                      |
| created_at | timestamptz | YES      | now()   | —                                      |
| updated_at | timestamptz | YES      | now()   | —                                      |

---

### `employee_certifications` → **Reuse**
**HubV2 Module:** Epic 1 – Employee Management

| Column        | Type        | Nullable | Default           | Constraints       |
| ------------- | ----------- | -------- | ----------------- | ----------------- |
| id            | uuid        | NO       | gen_random_uuid() | PK                |
| user_id       | uuid        | YES      | —                 | FK → employees.id |
| name          | text        | NO       | —                 | —                 |
| authority     | text        | YES      | —                 | —                 |
| credential_id | text        | YES      | —                 | —                 |
| issued_on     | date        | YES      | —                 | —                 |
| expires_on    | date        | YES      | —                 | —                 |
| created_at    | timestamptz | YES      | now()             | —                 |
| updated_at    | timestamptz | YES      | now()             | —                 |

---

### `employee_rates` → **Extend**
**HubV2 Module:** Epic 7 – Productivity Management

Legacy table has a single row per user (PK = user_id). HubV2 requires time-series rate history.

| Column         | Type        | Nullable | Default           | Constraints                         |
| -------------- | ----------- | -------- | ----------------- | ----------------------------------- |
| id             | uuid        | NO       | gen_random_uuid() | PK *(change from user_id PK)*       |
| user_id        | uuid        | NO       | —                 | FK → employees.id ON DELETE CASCADE |
| base_rate_usd  | numeric     | NO       | —                 | —                                   |
| effective_from | date        | NO       | now()             | —                                   |
| effective_to   | date        | YES      | —                 | NULL = current rate                 |
| notes          | text        | YES      | —                 | —                                   |
| updated_at     | timestamptz | YES      | now()             | —                                   |

**Add:** composite UNIQUE on (user_id, effective_from).

---

### `projects` → **Extend**
**HubV2 Module:** Epic 8 – Project Management / Epic 7 – Productivity

| Column          | Type        | Nullable | Default           | Constraints                                           |
| --------------- | ----------- | -------- | ----------------- | ----------------------------------------------------- |
| id              | uuid        | NO       | gen_random_uuid() | PK                                                    |
| name            | text        | NO       | —                 | —                                                     |
| description     | text        | YES      | —                 | —                                                     |
| status          | text        | YES      | 'pipeline'        | CHECK: pipeline, active, completed, cancelled *(add)* |
| category        | text        | YES      | —                 | FK → config_dropdowns *(add)*                         |
| start_date      | date        | YES      | —                 | —                                                     |
| end_date        | date        | YES      | —                 | —                                                     |
| project_manager | uuid        | YES      | —                 | FK → employees.id                                     |
| sales_manager   | uuid        | YES      | —                 | FK → employees.id                                     |
| internal_lead   | uuid        | YES      | —                 | FK → employees.id *(add)*                             |
| client          | text        | YES      | —                 | —                                                     |
| discount_pct    | numeric     | YES      | 0                 | —                                                     |
| discount_reason | text        | YES      | —                 | —                                                     |
| tag_color       | text        | YES      | —                 | Hex color for UI tag display *(add)*                  |
| created_by      | uuid        | YES      | —                 | FK → employees.id                                     |
| created_at      | timestamptz | YES      | now()             | —                                                     |
| updated_at      | timestamptz | YES      | now()             | —                                                     |

---

### `project_members` → **Reuse**
**HubV2 Module:** Epic 7 – Productivity / Epic 8 – Project Management

| Column              | Type        | Nullable | Default      | Constraints                                         |
| ------------------- | ----------- | -------- | ------------ | --------------------------------------------------- |
| project_id          | uuid        | NO       | —            | PK (composite), FK → projects.id ON DELETE CASCADE  |
| user_id             | uuid        | NO       | —            | PK (composite), FK → employees.id ON DELETE CASCADE |
| bill_rate_usd       | numeric     | NO       | —            | —                                                   |
| role                | text        | YES      | —            | —                                                   |
| member_discount_pct | numeric     | YES      | 0            | —                                                   |
| effective_from      | date        | YES      | CURRENT_DATE | —                                                   |
| effective_to        | date        | YES      | —            | —                                                   |
| status              | text        | YES      | 'active'     | CHECK: active, ended                                |
| created_at          | timestamptz | YES      | now()        | —                                                   |
| updated_at          | timestamptz | YES      | now()        | —                                                   |

---

### `timesheets` → **Extend**
**HubV2 Module:** Epic 6 – Timesheets

| Column           | Type        | Nullable | Default           | Constraints                                 |
| ---------------- | ----------- | -------- | ----------------- | ------------------------------------------- |
| id               | uuid        | NO       | gen_random_uuid() | PK                                          |
| project_id       | uuid        | YES      | —                 | FK → projects.id ON DELETE CASCADE          |
| user_id          | uuid        | YES      | —                 | FK → employees.id ON DELETE CASCADE         |
| work_date        | date        | NO       | —                 | —                                           |
| hours            | numeric     | NO       | —                 | CHECK 0–24                                  |
| notes            | text        | YES      | —                 | —                                           |
| status           | text        | NO       | 'submitted'       | CHECK: draft, submitted, approved, rejected |
| billable         | boolean     | NO       | true              | —                                           |
| week_start       | date        | YES      | —                 | —                                           |
| approved_by      | uuid        | YES      | —                 | FK → employees.id                           |
| approved_at      | timestamptz | YES      | —                 | —                                           |
| rejection_reason | text        | YES      | —                 | —                                           |
| created_at       | timestamptz | YES      | now()             | —                                           |

---

### `fx_rates` → **Reuse**
**HubV2 Module:** Epic 7 – Productivity Management

| Column      | Type        | Nullable | Default | Constraints |
| ----------- | ----------- | -------- | ------- | ----------- |
| code        | text        | NO       | —       | PK          |
| rate_to_usd | numeric     | NO       | —       | —           |
| updated_at  | timestamptz | YES      | now()   | —           |

---

### `holidays` → **Reuse**
**HubV2 Module:** Epic 6 – Timesheets

| Column       | Type | Nullable | Default           | Constraints |
| ------------ | ---- | -------- | ----------------- | ----------- |
| id           | uuid | NO       | gen_random_uuid() | PK          |
| region       | text | NO       | —                 | —           |
| holiday_date | date | NO       | —                 | —           |
| name         | text | NO       | —                 | —           |

---

### `leaves` → **Extend**
**HubV2 Module:** Epic 6 – Timesheets

| Column      | Type        | Nullable | Default           | Constraints                                |
| ----------- | ----------- | -------- | ----------------- | ------------------------------------------ |
| id          | uuid        | NO       | gen_random_uuid() | PK                                         |
| user_id     | uuid        | YES      | —                 | FK → employees.id                          |
| start_date  | date        | NO       | —                 | —                                          |
| end_date    | date        | NO       | —                 | —                                          |
| type        | text        | NO       | —                 | FK → config_dropdowns *(FK-ify)*           |
| approved    | boolean     | YES      | false             | —                                          |
| status      | text        | YES      | 'pending'         | CHECK: pending, approved, rejected *(add)* |
| approved_by | uuid        | YES      | —                 | FK → employees.id *(add)*                  |
| approved_at | timestamptz | YES      | —                 | *(add)*                                    |

---

### `config` → **Replace** → becomes `config_dropdowns` + `system_settings`
**HubV2 Module:** Epic 2 – System Configuration

Legacy `config` is a per-user key-value store. HubV2 requires system-wide hierarchical configuration. See Net New tables: `config_dropdowns` and `system_settings`.

---

### `onboarding_templates` → **Extend**
**HubV2 Module:** Epic 4 – Onboarding Management

| Column              | Type        | Nullable | Default           | Constraints                                        |
| ------------------- | ----------- | -------- | ----------------- | -------------------------------------------------- |
| id                  | uuid        | NO       | gen_random_uuid() | PK                                                 |
| name                | text        | NO       | —                 | —                                                  |
| version             | int         | NO       | 1                 | —                                                  |
| is_active           | boolean     | YES      | true              | —                                                  |
| settings            | jsonb       | YES      | —                 | —                                                  |
| location            | text        | YES      | —                 | —                                                  |
| applicable_roles    | text[]      | YES      | —                 | *(add)*                                            |
| notification_config | jsonb       | YES      | —                 | Per-template notification channel settings *(add)* |
| created_by          | uuid        | YES      | —                 | FK → employees.id                                  |
| created_at          | timestamptz | NO       | now()             | —                                                  |
| updated_at          | timestamptz | NO       | now()             | —                                                  |

---

### `onboarding_task_templates` → **Reuse**
**HubV2 Module:** Epic 4 – Onboarding Management

| Column               | Type        | Nullable | Default           | Constraints                                    |
| -------------------- | ----------- | -------- | ----------------- | ---------------------------------------------- |
| id                   | uuid        | NO       | gen_random_uuid() | PK                                             |
| template_id          | uuid        | NO       | —                 | FK → onboarding_templates.id ON DELETE CASCADE |
| block                | text        | NO       | —                 | CHECK: HR, IT, Facilities, Finance, Vendor     |
| name                 | text        | NO       | —                 | —                                              |
| description          | text        | YES      | —                 | —                                              |
| owner_group_id       | uuid        | YES      | —                 | FK → owner_groups.id                           |
| sla_hours            | int         | YES      | 72                | —                                              |
| depends_on           | uuid        | YES      | —                 | FK → onboarding_task_templates.id (self-ref)   |
| dynamic_rules        | jsonb       | YES      | —                 | —                                              |
| external_completion  | boolean     | YES      | false             | —                                              |
| required_attachments | jsonb       | YES      | —                 | —                                              |
| order_index          | int         | YES      | 0                 | —                                              |
| created_at           | timestamptz | NO       | now()             | —                                              |
| updated_at           | timestamptz | NO       | now()             | —                                              |

---

### `onboarding_task_template_dependencies` → **Reuse**
**HubV2 Module:** Epic 4 – Onboarding Management

| Column                      | Type        | Nullable | Default           | Constraints                                         |
| --------------------------- | ----------- | -------- | ----------------- | --------------------------------------------------- |
| id                          | uuid        | NO       | gen_random_uuid() | PK                                                  |
| task_template_id            | uuid        | NO       | —                 | FK → onboarding_task_templates.id ON DELETE CASCADE |
| depends_on_task_template_id | uuid        | NO       | —                 | FK → onboarding_task_templates.id ON DELETE CASCADE |
| created_at                  | timestamptz | NO       | now()             | —                                                   |

**Unique:** (task_template_id, depends_on_task_template_id)

---

### `onboarding_journeys` → **Extend**
**HubV2 Module:** Epic 4 – Onboarding Management

| Column           | Type        | Nullable | Default           | Constraints                                             |
| ---------------- | ----------- | -------- | ----------------- | ------------------------------------------------------- |
| id               | uuid        | NO       | gen_random_uuid() | PK                                                      |
| employee_id      | uuid        | NO       | —                 | FK → employees.id *(replace candidate_id)*              |
| template_id      | uuid        | NO       | —                 | FK → onboarding_templates.id                            |
| template_version | int         | NO       | —                 | —                                                       |
| status           | text        | YES      | 'in_progress'     | CHECK: draft, in_progress, completed, paused, cancelled |
| doj              | date        | YES      | —                 | —                                                       |
| geo              | text        | YES      | —                 | —                                                       |
| location         | text        | YES      | —                 | —                                                       |
| completed_at     | timestamptz | YES      | —                 | *(add)*                                                 |
| paused_reason    | text        | YES      | —                 | *(add)*                                                 |
| created_by       | uuid        | YES      | —                 | FK → employees.id                                       |
| created_at       | timestamptz | NO       | now()             | —                                                       |
| updated_at       | timestamptz | NO       | now()             | —                                                       |

---

### `onboarding_tasks` → **Extend**
**HubV2 Module:** Epic 4 – Onboarding Management

| Column               | Type        | Nullable | Default           | Constraints                                                                      |
| -------------------- | ----------- | -------- | ----------------- | -------------------------------------------------------------------------------- |
| id                   | uuid        | NO       | gen_random_uuid() | PK                                                                               |
| journey_id           | uuid        | NO       | —                 | FK → onboarding_journeys.id ON DELETE CASCADE                                    |
| template_task_id     | uuid        | YES      | —                 | FK → onboarding_task_templates.id *(add for auditability)*                       |
| block                | text        | NO       | —                 | CHECK: HR, IT, Facilities, Finance, Vendor                                       |
| name                 | text        | NO       | —                 | —                                                                                |
| description          | text        | YES      | —                 | —                                                                                |
| owner_group_id       | uuid        | YES      | —                 | FK → owner_groups.id                                                             |
| assignee             | uuid        | YES      | —                 | FK → employees.id ON DELETE SET NULL                                             |
| status               | text        | YES      | 'pending'         | CHECK: pending, in_progress, waiting_for_dependency, completed, skipped, blocked |
| due_at               | timestamptz | YES      | —                 | —                                                                                |
| started_at           | timestamptz | YES      | —                 | —                                                                                |
| completed_at         | timestamptz | YES      | —                 | —                                                                                |
| notification_sent_at | timestamptz | YES      | —                 | *(add)*                                                                          |
| sla_hours            | int         | YES      | 72                | —                                                                                |
| depends_on           | uuid        | YES      | —                 | FK → onboarding_tasks.id (self-ref)                                              |
| external_completion  | boolean     | YES      | false             | —                                                                                |
| required_attachments | jsonb       | YES      | —                 | —                                                                                |
| meta                 | jsonb       | YES      | —                 | —                                                                                |
| created_at           | timestamptz | NO       | now()             | —                                                                                |
| updated_at           | timestamptz | NO       | now()             | —                                                                                |

**Remove:** `candidate_email`, `official_email` (legacy artifacts; replaced by employee FK on journey).

---

### `onboarding_task_dependencies` → **Reuse**
**HubV2 Module:** Epic 4 – Onboarding Management

| Column             | Type | Nullable | Default | Constraints                                                |
| ------------------ | ---- | -------- | ------- | ---------------------------------------------------------- |
| task_id            | uuid | NO       | —       | PK (composite), FK → onboarding_tasks.id ON DELETE CASCADE |
| depends_on_task_id | uuid | NO       | —       | PK (composite), FK → onboarding_tasks.id ON DELETE CASCADE |

---

### `owner_groups` → **Extend**
**HubV2 Module:** Epic 4 – Onboarding Management / Epic 2 – System Config

| Column          | Type        | Nullable | Default           | Constraints                                          |
| --------------- | ----------- | -------- | ----------------- | ---------------------------------------------------- |
| id              | uuid        | NO       | gen_random_uuid() | PK                                                   |
| name            | text        | NO       | —                 | UNIQUE                                               |
| description     | text        | YES      | —                 | —                                                    |
| department      | text        | YES      | —                 | For escalation routing *(add)*                       |
| manager_role_id | uuid        | YES      | —                 | FK → roles.id; used for notification routing *(add)* |
| created_at      | timestamptz | NO       | now()             | —                                                    |
| updated_at      | timestamptz | NO       | now()             | —                                                    |

---

### `group_members` → **Reuse**
**HubV2 Module:** Epic 4 – Onboarding Management

| Column     | Type        | Nullable | Default           | Constraints                            |
| ---------- | ----------- | -------- | ----------------- | -------------------------------------- |
| id         | uuid        | NO       | gen_random_uuid() | PK                                     |
| group_id   | uuid        | NO       | —                 | FK → owner_groups.id ON DELETE CASCADE |
| user_id    | uuid        | NO       | —                 | FK → employees.id                      |
| role       | text        | YES      | 'member'          | CHECK: member, lead                    |
| created_at | timestamptz | NO       | now()             | —                                      |

**Unique:** (group_id, user_id)

---

### `task_sla_events` → **Reuse**
**HubV2 Module:** Epic 4 – Onboarding / Epic 9 – Audit

| Column     | Type        | Nullable | Default           | Constraints                                |
| ---------- | ----------- | -------- | ----------------- | ------------------------------------------ |
| id         | uuid        | NO       | gen_random_uuid() | PK                                         |
| task_id    | uuid        | NO       | —                 | FK → onboarding_tasks.id ON DELETE CASCADE |
| event      | text        | NO       | —                 | —                                          |
| meta       | jsonb       | YES      | —                 | —                                          |
| created_at | timestamptz | NO       | now()             | —                                          |

---

### `task_attachments` → **Reuse**
**HubV2 Module:** Epic 4 – Onboarding Management

| Column      | Type        | Nullable | Default           | Constraints                                |
| ----------- | ----------- | -------- | ----------------- | ------------------------------------------ |
| id          | uuid        | NO       | gen_random_uuid() | PK                                         |
| task_id     | uuid        | NO       | —                 | FK → onboarding_tasks.id ON DELETE CASCADE |
| file_url    | text        | NO       | —                 | —                                          |
| file_name   | text        | YES      | —                 | —                                          |
| kind        | text        | YES      | —                 | —                                          |
| uploaded_by | uuid        | YES      | —                 | FK → employees.id                          |
| uploaded_at | timestamptz | NO       | now()             | —                                          |

---

### `approvals` → **Extend**
**HubV2 Module:** Epic 3 – Intake / Epic 4 – Onboarding / Epic 2 – Admin

Generalize from onboarding-only to a polymorphic approval pattern supporting both intake and onboarding.

| Column            | Type        | Nullable | Default           | Constraints                                                          |
| ----------------- | ----------- | -------- | ----------------- | -------------------------------------------------------------------- |
| id                | uuid        | NO       | gen_random_uuid() | PK                                                                   |
| resource_type     | text        | NO       | —                 | CHECK: onboarding_task, intake_record *(add)*                        |
| resource_id       | uuid        | NO       | —                 | Polymorphic FK                                                       |
| task_id           | uuid        | YES      | —                 | FK → onboarding_tasks.id ON DELETE CASCADE (legacy; keep for compat) |
| approver_group_id | uuid        | YES      | —                 | FK → owner_groups.id                                                 |
| approver_user_id  | uuid        | YES      | —                 | FK → employees.id                                                    |
| status            | text        | YES      | 'requested'       | CHECK: requested, approved, rejected                                 |
| comments          | text        | YES      | —                 | —                                                                    |
| decided_at        | timestamptz | YES      | —                 | —                                                                    |
| created_at        | timestamptz | NO       | now()             | —                                                                    |

---

### `assets` → **Extend**
**HubV2 Module:** Epic 5 – Asset Management

| Column                  | Type        | Nullable | Default           | Constraints                                          |
| ----------------------- | ----------- | -------- | ----------------- | ---------------------------------------------------- |
| id                      | uuid        | NO       | gen_random_uuid() | PK                                                   |
| asset_tag               | text        | NO       | —                 | UNIQUE                                               |
| model                   | text        | NO       | —                 | —                                                    |
| manufacturer            | text        | YES      | —                 | FK → config_dropdowns *(add)*                        |
| category                | uuid        | YES      | —                 | FK → asset_categories.id ON UPDATE CASCADE           |
| serial_number           | text        | YES      | —                 | —                                                    |
| location                | text        | YES      | —                 | —                                                    |
| assigned_to             | uuid        | YES      | —                 | FK → employees.id *(formalize FK constraint)*        |
| status                  | text        | YES      | 'active'          | CHECK: available, assigned, in_repair, retired, lost |
| poor *(add)*            |
| procurement_date        | date        | YES      | —                 | —                                                    |
| warranty_start_date     | date        | YES      | —                 | —                                                    |
| warranty_end_date       | date        | YES      | —                 | —                                                    |
| warranty_type           | text        | YES      | —                 | CHECK: standard, extended *(add)*                    |
| vendor                  | text        | YES      | —                 | —                                                    |
| invoice_verified_status | text        | YES      | 'unverified'      | CHECK: unverified, verified, mismatch *(add)*        |
| import_source           | text        | YES      | —                 | e.g. CSV import filename *(add)*                     |
| import_date             | date        | YES      | —                 | *(add)*                                              |
| notes                   | text        | YES      | —                 | —                                                    |
| created_at              | timestamptz | YES      | now()             | —                                                    |
| updated_at              | timestamptz | YES      | now()             | —                                                    |

**Remove:** `owner text` (free-text; replaced by `assigned_to` FK), `attachments json` (move to `asset_attachments` table).

---

### `asset_categories` → **Extend**
**HubV2 Module:** Epic 2 – System Config / Epic 5 – Asset Management

| Column      | Type        | Nullable | Default           | Constraints |
| ----------- | ----------- | -------- | ----------------- | ----------- |
| id          | uuid        | NO       | gen_random_uuid() | PK          |
| name        | text        | NO       | —                 | UNIQUE      |
| description | text        | YES      | —                 | —           |
| code        | varchar(5)  | YES      | —                 | UNIQUE      |
| is_active   | boolean     | YES      | true              | *(add)*     |
| sort_order  | int         | YES      | 0                 | *(add)*     |
| created_at  | timestamptz | NO       | now()             | —           |
| updated_at  | timestamptz | NO       | now()             | —           |

---

### `ats_candidates` → **Extend**
**HubV2 Module:** Epic 10 – ATS & Job Management

| Column                  | Type         | Nullable | Default           | Constraints                      |
| ----------------------- | ------------ | -------- | ----------------- | -------------------------------- |
| id                      | uuid         | NO       | gen_random_uuid() | PK                               |
| full_name               | text         | NO       | —                 | —                                |
| email                   | text         | NO       | —                 | UNIQUE                           |
| phone                   | text         | YES      | —                 | —                                |
| location                | text         | YES      | —                 | —                                |
| source                  | text         | YES      | —                 | FK → config_dropdowns *(FK-ify)* |
| current_company         | text         | YES      | —                 | —                                |
| current_title           | text         | YES      | —                 | —                                |
| resume_url              | text         | YES      | —                 | —                                |
| linkedin_profile        | text         | YES      | —                 | —                                |
| notes                   | text         | YES      | —                 | —                                |
| resume_score            | numeric(5,2) | YES      | —                 | —                                |
| resume_analysis         | jsonb        | YES      | —                 | —                                |
| ai_parsed_skills        | jsonb        | YES      | —                 | *(add)*                          |
| last_scored_at          | timestamptz  | YES      | —                 | —                                |
| ai_summary              | text         | YES      | —                 | —                                |
| ai_summary_generated_at | timestamptz  | YES      | —                 | —                                |
| current_step            | text         | YES      | 'sourced'         | —                                |
| created_at              | timestamptz  | YES      | now()             | —                                |
| updated_at              | timestamptz  | YES      | now()             | —                                |

---

### `requisitions` → **Extend**
**HubV2 Module:** Epic 10 – ATS & Job Management

| Column             | Type        | Nullable | Default           | Constraints                                       |
| ------------------ | ----------- | -------- | ----------------- | ------------------------------------------------- |
| id                 | uuid        | NO       | gen_random_uuid() | PK                                                |
| intake_id          | uuid        | YES      | —                 | FK → intake_records.id *(add: Epic 3.7 handoff)*  |
| title              | text        | NO       | —                 | —                                                 |
| dept               | text        | YES      | —                 | FK → config_dropdowns                             |
| location           | text        | YES      | —                 | —                                                 |
| employment_type    | text        | YES      | —                 | CHECK: full_time, part_time, contract, internship |
| description        | text        | YES      | —                 | —                                                 |
| min_experience     | int         | YES      | 0                 | —                                                 |
| max_experience     | int         | YES      | —                 | —                                                 |
| priority           | text        | YES      | —                 | CHECK: low, medium, high, urgent *(add)*          |
| budget_min         | numeric     | YES      | —                 | *(add)*                                           |
| budget_max         | numeric     | YES      | —                 | *(add)*                                           |
| posting_start_date | date        | YES      | —                 | *(add)*                                           |
| posting_end_date   | date        | YES      | —                 | *(add)*                                           |
| status             | text        | YES      | 'draft'           | CHECK: draft, open, on_hold, closed               |
| hiring_manager_id  | uuid        | YES      | —                 | FK → employees.id ON DELETE SET NULL              |
| created_by         | uuid        | YES      | —                 | FK → employees.id                                 |
| linkedin_job_id    | text        | YES      | —                 | —                                                 |
| linkedin_posted_at | timestamptz | YES      | —                 | —                                                 |
| created_at         | timestamptz | YES      | now()             | —                                                 |
| updated_at         | timestamptz | YES      | now()             | —                                                 |

**Remove:** `skills text[]` → replace with `requisition_skills` join table (see Net New).

---

### `applications` → **Reuse**
**HubV2 Module:** Epic 10 – ATS & Job Management

| Column         | Type        | Nullable | Default           | Constraints                                                    |
| -------------- | ----------- | -------- | ----------------- | -------------------------------------------------------------- |
| id             | uuid        | NO       | gen_random_uuid() | PK                                                             |
| candidate_id   | uuid        | YES      | —                 | FK → ats_candidates.id ON DELETE CASCADE                       |
| requisition_id | uuid        | YES      | —                 | FK → requisitions.id ON DELETE CASCADE                         |
| stage          | text        | YES      | 'sourced'         | CHECK: sourced, screen, manager, panel, offer, hired, rejected |
| status         | text        | YES      | 'active'          | CHECK: active, on_hold, rejected, withdrawn, hired             |
| owner_id       | uuid        | YES      | —                 | FK → employees.id                                              |
| created_at     | timestamptz | YES      | now()             | —                                                              |
| updated_at     | timestamptz | YES      | now()             | —                                                              |

**Unique:** (candidate_id, requisition_id)

---

### `interviews` + `ats_interviews` → **Replace** → single `interviews` table
**HubV2 Module:** Epic 10 – ATS & Job Management

Two parallel interview tables in legacy. Consolidated:

| Column          | Type        | Nullable | Default           | Constraints                                         |
| --------------- | ----------- | -------- | ----------------- | --------------------------------------------------- |
| id              | uuid        | NO       | gen_random_uuid() | PK                                                  |
| application_id  | uuid        | YES      | —                 | FK → applications.id ON DELETE CASCADE              |
| requisition_id  | uuid        | YES      | —                 | FK → requisitions.id                                |
| interviewer_id  | uuid        | YES      | —                 | FK → employees.id                                   |
| candidate_id    | uuid        | YES      | —                 | FK → ats_candidates.id ON DELETE CASCADE            |
| type            | text        | YES      | —                 | CHECK: screen, technical, behavioral, panel, final  |
| scheduled_start | timestamptz | YES      | —                 | —                                                   |
| scheduled_end   | timestamptz | YES      | —                 | —                                                   |
| meeting_link    | text        | YES      | —                 | —                                                   |
| status          | text        | YES      | 'scheduled'       | CHECK: scheduled, completed, cancelled, rescheduled |
| notes           | text        | YES      | —                 | —                                                   |
| created_by      | uuid        | YES      | —                 | FK → employees.id                                   |
| created_at      | timestamptz | NO       | now()             | —                                                   |
| updated_at      | timestamptz | NO       | now()             | —                                                   |

---

### `interview_assignments` → **Reuse**
**HubV2 Module:** Epic 10 – ATS & Job Management

| Column         | Type        | Nullable | Default           | Constraints                              |
| -------------- | ----------- | -------- | ----------------- | ---------------------------------------- |
| id             | uuid        | NO       | gen_random_uuid() | PK                                       |
| interview_id   | uuid        | YES      | —                 | FK → interviews.id ON DELETE CASCADE     |
| interviewer_id | uuid        | YES      | —                 | FK → employees.id                        |
| candidate_id   | uuid        | YES      | —                 | FK → ats_candidates.id ON DELETE CASCADE |
| role           | text        | YES      | 'primary'         | CHECK: primary, observer                 |
| created_at     | timestamptz | YES      | now()             | —                                        |

**Unique:** (interview_id, interviewer_id)

---

### `interview_feedback` → **Reuse**
**HubV2 Module:** Epic 10 – ATS & Job Management

| Column         | Type        | Nullable | Default           | Constraints                                        |
| -------------- | ----------- | -------- | ----------------- | -------------------------------------------------- |
| id             | uuid        | NO       | gen_random_uuid() | PK                                                 |
| interview_id   | uuid        | YES      | —                 | FK → interviews.id ON DELETE CASCADE               |
| interviewer_id | uuid        | YES      | —                 | FK → employees.id                                  |
| ratings        | jsonb       | YES      | —                 | —                                                  |
| summary        | text        | YES      | —                 | —                                                  |
| recommendation | text        | YES      | —                 | CHECK: strong_yes, yes, leaning_yes, no, strong_no |
| is_final       | boolean     | YES      | false             | —                                                  |
| created_at     | timestamptz | YES      | now()             | —                                                  |
| updated_at     | timestamptz | YES      | now()             | —                                                  |

---

### `feedback` + `feedback_scores` → **Extend**
**HubV2 Module:** Epic 10 – ATS & Job Management

Keep both tables; align `feedback.candidate_id` FK to `ats_candidates.id` explicitly and link `feedback` to `applications.id` for context.

---

### `candidate_activities` → **Reuse**
**HubV2 Module:** Epic 10 – ATS / Epic 9 – Audit

| Column               | Type        | Nullable | Default           | Constraints                              |
| -------------------- | ----------- | -------- | ----------------- | ---------------------------------------- |
| id                   | uuid        | NO       | gen_random_uuid() | PK                                       |
| candidate_id         | uuid        | NO       | —                 | FK → ats_candidates.id ON DELETE CASCADE |
| actor_id             | uuid        | YES      | —                 | FK → employees.id                        |
| activity_type        | text        | NO       | —                 | —                                        |
| activity_description | text        | NO       | —                 | —                                        |
| metadata             | jsonb       | YES      | '{}'              | —                                        |
| seen_by              | uuid[]      | YES      | '{}'              | —                                        |
| created_at           | timestamptz | YES      | now()             | —                                        |

---

### `candidate_comments` → **Reuse**
**HubV2 Module:** Epic 10 – ATS

---

### `ats_comments` → **Reuse**
**HubV2 Module:** Epic 10 – ATS

---

### `ats_attachments` → **Reuse**
**HubV2 Module:** Epic 10 – ATS

---

### `compensation_private` → **Reuse**
**HubV2 Module:** Epic 10 – ATS

---

### `requisition_activities` → **Reuse**
**HubV2 Module:** Epic 10 – ATS / Epic 9 – Audit

---

### `requisition_comments` → **Reuse**
**HubV2 Module:** Epic 10 – ATS

---

### `ats_audit` + `audit_logs` + `app_logs` → **Replace** → unified `audit_events`
**HubV2 Module:** Epic 9 – Audit & Logging

Three overlapping audit tables in legacy. HubV2 consolidates into a single structured audit table. See Net New: `audit_events`.

---

### `test_templates`, `test_assignments`, `test_sessions`, `test_responses`, `test_scores`, `proctor_events`, `proctor_images`, `ai_prompts` → **Reuse**
**HubV2 Module:** Epic 10 – ATS (Technical Assessment)

Entire assessment + proctoring subsystem is well-built and maps cleanly to Epic 10. Reuse as-is; update employee FKs to point to `employees.id`.

---

### `notification_queue`, `notification_preferences`, `email_templates`, `notification_logs`, `dead_letter_queue` → **Reuse**
**HubV2 Module:** Epic 2 – System Config (Notification Module)

Notification system is fully built and aligns with Epic 2.4. Extend `notification_preferences` to add `all_modules` master toggle. Update `module_id` CHECK to include all 10 HubV2 modules.

---

### `access_grants` → **Reuse**
**HubV2 Module:** Epic 2 – System Config

---

### `pending_invites` → **Reuse**
**HubV2 Module:** Epic 2 – System Config / User Management

---

### `candidate_proficiencies` → **Reuse**
**HubV2 Module:** Epic 10 – ATS

---

### `external_completions` → **Retire**
Legacy tokenized external completion flow. HubV2 onboarding does not use this pattern — all tasks completed within the system.

---

### `workflow_updates` → **Retire**
Catch-all status machine log from the old onboarding workflow (29 tracking columns dropped in migration 20260302145304). Replaced by `audit_events` (Epic 9) and `task_sla_events` (Epic 4).

### `task_dependencies` → **Retire**
Duplicate of `onboarding_task_dependencies`. No FK constraints; appears to be an older parallel table. Superseded.

### `hiring_surveys` → **Replace** → `intake_records`
See Net New section. The flat form structure is replaced by a full lifecycle intake module.

### `candidates` → **Replace**
Legacy new-joiner record conflating ATS candidates with onboarding subjects. In HubV2, `employees` is the onboarding subject and `ats_candidates` is the recruitment subject. The `candidates` table is retired; its data is migrated to the appropriate target.

### `docs` → **Retire**
Internal documentation table. Not referenced in any HubV2 spec module.

---

## B. Net New Tables

Tables with no legacy equivalent, required by HubV2 spec.

---

### `employee_emergency_contacts`
**HubV2 Module:** Epic 1 – Employee Management

| Column       | Type        | Nullable | Default           | Constraints                         |
| ------------ | ----------- | -------- | ----------------- | ----------------------------------- |
| id           | uuid        | NO       | gen_random_uuid() | PK                                  |
| employee_id  | uuid        | NO       | —                 | FK → employees.id ON DELETE CASCADE |
| name         | text        | NO       | —                 | —                                   |
| relationship | text        | NO       | —                 | —                                   |
| phone        | text        | NO       | —                 | —                                   |
| created_at   | timestamptz | NO       | now()             | —                                   |
| updated_at   | timestamptz | NO       | now()             | —                                   |

---

### `employee_attachments`
**HubV2 Module:** Epic 1 – Employee Management

Stores employment contracts, IDs, certifications uploaded to employee profiles.

| Column      | Type        | Nullable | Default           | Constraints                                 |
| ----------- | ----------- | -------- | ----------------- | ------------------------------------------- |
| id          | uuid        | NO       | gen_random_uuid() | PK                                          |
| employee_id | uuid        | NO       | —                 | FK → employees.id ON DELETE CASCADE         |
| file_url    | text        | NO       | —                 | S3/storage path                             |
| file_name   | text        | NO       | —                 | —                                           |
| label       | text        | YES      | —                 | Category label (e.g. "Employment Contract") |
| uploaded_by | uuid        | YES      | —                 | FK → employees.id                           |
| uploaded_at | timestamptz | NO       | now()             | —                                           |

---

### `employee_project_history`
**HubV2 Module:** Epic 1 – Employee Management

Editable project history per employee. Active project assignments are stored in `project_members`; this table tracks historical/concluded assignments and admin-added entries.

| Column       | Type        | Nullable | Default           | Constraints                           |
| ------------ | ----------- | -------- | ----------------- | ------------------------------------- |
| id           | uuid        | NO       | gen_random_uuid() | PK                                    |
| employee_id  | uuid        | NO       | —                 | FK → employees.id ON DELETE CASCADE   |
| project_id   | uuid        | YES      | —                 | FK → projects.id ON DELETE SET NULL   |
| project_name | text        | NO       | —                 | Denormalized for historical integrity |
| role         | text        | YES      | —                 | —                                     |
| start_date   | date        | YES      | —                 | —                                     |
| end_date     | date        | YES      | —                 | —                                     |
| notes        | text        | YES      | —                 | —                                     |
| created_by   | uuid        | YES      | —                 | FK → employees.id                     |
| created_at   | timestamptz | NO       | now()             | —                                     |
| updated_at   | timestamptz | NO       | now()             | —                                     |

---

### `offboarding_tasks`
**HubV2 Module:** Epic 1 – Employee Management (Feature 1.10 – Newly Offboarded)

Task pool for employee archiving workflow. Distinct from onboarding tasks.

| Column         | Type        | Nullable | Default           | Constraints                                                                           |
| -------------- | ----------- | -------- | ----------------- | ------------------------------------------------------------------------------------- |
| id             | uuid        | NO       | gen_random_uuid() | PK                                                                                    |
| employee_id    | uuid        | NO       | —                 | FK → employees.id ON DELETE CASCADE                                                   |
| task_type      | text        | NO       | —                 | CHECK: email_decommission, project_migration, asset_retrieval, system_account_removal |
| assigned_group | text        | NO       | —                 | CHECK: IT, HR, Finance, Manager                                                       |
| assignee_id    | uuid        | YES      | —                 | FK → employees.id; NULL = pooled                                                      |
| status         | text        | NO       | 'pending'         | CHECK: pending, in_progress, completed                                                |
| due_at         | timestamptz | YES      | —                 | —                                                                                     |
| completed_by   | uuid        | YES      | —                 | FK → employees.id                                                                     |
| completed_at   | timestamptz | YES      | —                 | —                                                                                     |
| sign_off_notes | text        | YES      | —                 | —                                                                                     |
| created_at     | timestamptz | NO       | now()             | —                                                                                     |
| updated_at     | timestamptz | NO       | now()             | —                                                                                     |

---

### `roles`
**HubV2 Module:** Epic 2 – System Config (Role & Permission Management)

| Column      | Type        | Nullable | Default           | Constraints                                       |
| ----------- | ----------- | -------- | ----------------- | ------------------------------------------------- |
| id          | uuid        | NO       | gen_random_uuid() | PK                                                |
| name        | text        | NO       | —                 | UNIQUE                                            |
| description | text        | YES      | —                 | —                                                 |
| is_system   | boolean     | NO       | false             | System roles (Admin, HR, Staff) cannot be deleted |
| created_at  | timestamptz | NO       | now()             | —                                                 |
| updated_at  | timestamptz | NO       | now()             | —                                                 |

---

### `permissions`
**HubV2 Module:** Epic 2 – System Config (Role & Permission Management)

| Column     | Type        | Nullable | Default           | Constraints                                                                                          |
| ---------- | ----------- | -------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| id         | uuid        | NO       | gen_random_uuid() | PK                                                                                                   |
| role_id    | uuid        | NO       | —                 | FK → roles.id ON DELETE CASCADE                                                                      |
| module     | text        | NO       | —                 | CHECK: employees, intake, onboarding, assets, timesheets, productivity, ats, audit, config, projects |
| action     | text        | NO       | —                 | CHECK: view, create, edit, delete, admin_mode, export, bulk_import                                   |
| created_at | timestamptz | NO       | now()             | —                                                                                                    |

**Unique:** (role_id, module, action)

---

### `role_assignments`
**HubV2 Module:** Epic 2 – System Config

| Column      | Type        | Nullable | Default | Constraints                                         |
| ----------- | ----------- | -------- | ------- | --------------------------------------------------- |
| employee_id | uuid        | NO       | —       | PK (composite), FK → employees.id ON DELETE CASCADE |
| role_id     | uuid        | NO       | —       | PK (composite), FK → roles.id ON DELETE CASCADE     |
| assigned_by | uuid        | YES      | —       | FK → employees.id                                   |
| assigned_at | timestamptz | NO       | now()   | —                                                   |

---

### `config_dropdowns`
**HubV2 Module:** Epic 2 – System Config (Feature 2.1)

Replaces `config`. System-wide hierarchical dropdown configuration.

| Column     | Type        | Nullable | Default           | Constraints                                         |
| ---------- | ----------- | -------- | ----------------- | --------------------------------------------------- |
| id         | uuid        | NO       | gen_random_uuid() | PK                                                  |
| module     | text        | NO       | —                 | CHECK: employees, intake, onboarding, assets, audit |
| category   | text        | NO       | —                 | e.g. Department, Location, Hire Type                |
| value      | text        | NO       | —                 | Display value                                       |
| sort_order | int         | YES      | 0                 | —                                                   |
| is_active  | boolean     | NO       | true              | —                                                   |
| created_by | uuid        | YES      | —                 | FK → employees.id                                   |
| created_at | timestamptz | NO       | now()             | —                                                   |
| updated_at | timestamptz | NO       | now()             | —                                                   |

**Unique:** (module, category, value)

---

### `system_settings`
**HubV2 Module:** Epic 2 – System Config

Global system-level settings (retention rules, security thresholds, etc.).

| Column      | Type        | Nullable | Default | Constraints       |
| ----------- | ----------- | -------- | ------- | ----------------- |
| key         | text        | NO       | —       | PK                |
| value       | text        | NO       | —       | —                 |
| description | text        | YES      | —       | —                 |
| updated_by  | uuid        | YES      | —       | FK → employees.id |
| updated_at  | timestamptz | NO       | now()   | —                 |

---

### `intake_records`
**HubV2 Module:** Epic 3 – Intake Management

Replaces `hiring_surveys`. Full lifecycle intake with approval workflow.

| Column               | Type        | Nullable | Default           | Constraints                                                          |
| -------------------- | ----------- | -------- | ----------------- | -------------------------------------------------------------------- |
| id                   | uuid        | NO       | gen_random_uuid() | PK                                                                   |
| reference_number     | text        | NO       | —                 | UNIQUE; auto-generated (e.g. INT-2026-001)                           |
| status               | text        | NO       | 'draft'           | CHECK: draft, submitted, under_review, approved, rejected, escalated |
| role_title           | text        | NO       | —                 | —                                                                    |
| department           | text        | YES      | —                 | FK → config_dropdowns                                                |
| location             | text        | YES      | —                 | —                                                                    |
| work_model           | text        | YES      | —                 | CHECK: remote, hybrid, in_person                                     |
| hire_type            | text        | NO       | —                 | CHECK: internal, external, staff_aug                                 |
| reason_for_hire      | text        | YES      | —                 | FK → config_dropdowns                                                |
| priority             | text        | YES      | —                 | CHECK: low, medium, high, urgent                                     |
| number_of_positions  | int         | NO       | 1                 | —                                                                    |
| experience_range_min | int         | YES      | —                 | —                                                                    |
| experience_range_max | int         | YES      | —                 | —                                                                    |
| salary_range_min     | numeric     | YES      | —                 | —                                                                    |
| salary_range_max     | numeric     | YES      | —                 | —                                                                    |
| salary_currency      | text        | NO       | 'USD'             | CHECK: INR, USD                                                      |
| budget_approved      | boolean     | YES      | —                 | —                                                                    |
| preferred_start_date | date        | YES      | —                 | —                                                                    |
| client_facing        | boolean     | YES      | false             | —                                                                    |
| client_expectations  | text        | YES      | —                 | —                                                                    |
| key_perks_benefits   | text        | YES      | —                 | —                                                                    |
| comments_notes       | text        | YES      | —                 | —                                                                    |
| hiring_manager_id    | uuid        | YES      | —                 | FK → employees.id                                                    |
| ai_generated_jd      | text        | YES      | —                 | AI-generated job description                                         |
| ai_jd_generated_at   | timestamptz | YES      | —                 | —                                                                    |
| submitted_by         | uuid        | YES      | —                 | FK → employees.id                                                    |
| submitted_at         | timestamptz | YES      | —                 | —                                                                    |
| created_at           | timestamptz | NO       | now()             | —                                                                    |
| updated_at           | timestamptz | NO       | now()             | —                                                                    |

---

### `intake_skills`
**HubV2 Module:** Epic 3 – Intake Management

Normalized replacement for `hiring_surveys.mandatory_skills` / `nice_to_have_skills` free text.

| Column     | Type        | Nullable | Default           | Constraints                              |
| ---------- | ----------- | -------- | ----------------- | ---------------------------------------- |
| id         | uuid        | NO       | gen_random_uuid() | PK                                       |
| intake_id  | uuid        | NO       | —                 | FK → intake_records.id ON DELETE CASCADE |
| skill_id   | uuid        | NO       | —                 | FK → skills_catalog.id                   |
| type       | text        | NO       | —                 | CHECK: mandatory, nice_to_have           |
| created_at | timestamptz | NO       | now()             | —                                        |

**Unique:** (intake_id, skill_id, type)

---

### `intake_approvals`
**HubV2 Module:** Epic 3 – Intake Management

| Column      | Type        | Nullable | Default           | Constraints                              |
| ----------- | ----------- | -------- | ----------------- | ---------------------------------------- |
| id          | uuid        | NO       | gen_random_uuid() | PK                                       |
| intake_id   | uuid        | NO       | —                 | FK → intake_records.id ON DELETE CASCADE |
| approver_id | uuid        | NO       | —                 | FK → employees.id                        |
| status      | text        | NO       | 'pending'         | CHECK: pending, approved, rejected       |
| comments    | text        | YES      | —                 | —                                        |
| decided_at  | timestamptz | YES      | —                 | —                                        |
| created_at  | timestamptz | NO       | now()             | —                                        |

---

### `intake_audit`
**HubV2 Module:** Epic 3 – Intake Management / Epic 9 – Audit

Version history for intake record changes.

| Column     | Type        | Nullable | Default           | Constraints                                                       |
| ---------- | ----------- | -------- | ----------------- | ----------------------------------------------------------------- |
| id         | uuid        | NO       | gen_random_uuid() | PK                                                                |
| intake_id  | uuid        | NO       | —                 | FK → intake_records.id ON DELETE CASCADE                          |
| actor_id   | uuid        | YES      | —                 | FK → employees.id                                                 |
| action     | text        | NO       | —                 | CHECK: created, updated, submitted, approved, rejected, escalated |
| snapshot   | jsonb       | YES      | —                 | Full record snapshot at time of action                            |
| created_at | timestamptz | NO       | now()             | —                                                                 |

---

### `requisition_skills`
**HubV2 Module:** Epic 10 – ATS & Job Management

Replaces `requisitions.skills text[]`.

| Column         | Type | Nullable | Default | Constraints                                            |
| -------------- | ---- | -------- | ------- | ------------------------------------------------------ |
| requisition_id | uuid | NO       | —       | PK (composite), FK → requisitions.id ON DELETE CASCADE |
| skill_id       | uuid | NO       | —       | PK (composite), FK → skills_catalog.id                 |
| type           | text | NO       | —       | CHECK: mandatory, nice_to_have                         |

---

### `asset_attachments`
**HubV2 Module:** Epic 5 – Asset Management

Replaces `assets.attachments json` inline blob.

| Column      | Type        | Nullable | Default           | Constraints                        |
| ----------- | ----------- | -------- | ----------------- | ---------------------------------- |
| id          | uuid        | NO       | gen_random_uuid() | PK                                 |
| asset_id    | uuid        | NO       | —                 | FK → assets.id ON DELETE CASCADE   |
| file_url    | text        | NO       | —                 | —                                  |
| file_name   | text        | NO       | —                 | —                                  |
| label       | text        | YES      | —                 | e.g. Invoice, Warranty Certificate |
| uploaded_by | uuid        | YES      | —                 | FK → employees.id                  |
| uploaded_at | timestamptz | NO       | now()             | —                                  |

---

### `audit_events`
**HubV2 Module:** Epic 9 – Audit & Logging

Unified audit log replacing `ats_audit`, `audit_logs`, and `app_logs`.

| Column     | Type        | Nullable | Default | Constraints                                                                                   |
| ---------- | ----------- | -------- | ------- | --------------------------------------------------------------------------------------------- |
| id         | bigserial   | NO       | —       | PK                                                                                            |
| actor_id   | uuid        | YES      | —       | FK → employees.id                                                                             |
| module     | text        | NO       | —       | CHECK: employees, intake, onboarding, assets, timesheets, productivity, ats, config, projects |
| entity     | text        | NO       | —       | Table/entity name                                                                             |
| entity_id  | uuid        | YES      | —       | —                                                                                             |
| action     | text        | NO       | —       | CHECK: create, update, delete, view, export, login, logout                                    |
| severity   | text        | YES      | 'info'  | CHECK: info, warn, error                                                                      |
| old_value  | jsonb       | YES      | —       | —                                                                                             |
| new_value  | jsonb       | YES      | —       | —                                                                                             |
| metadata   | jsonb       | YES      | '{}'    | —                                                                                             |
| ip_address | text        | YES      | —       | —                                                                                             |
| created_at | timestamptz | NO       | now()   | —                                                                                             |

---

## C. Cross-Module Foreign Key Map

| Source Module | Source Table               | FK Column                               | Target Module | Target Table                             |
| ------------- | -------------------------- | --------------------------------------- | ------------- | ---------------------------------------- |
| All modules   | All tables                 | `*employee_id`, `*user_id`, `*assignee` | Epic 1        | `employees.id`                           |
| Epic 1        | `employees`                | `manager_id`                            | Epic 1        | `employees.id` (self-ref)                |
| Epic 1        | `employee_project_history` | `project_id`                            | Epic 8        | `projects.id`                            |
| Epic 3        | `intake_records`           | `hiring_manager_id`                     | Epic 1        | `employees.id`                           |
| Epic 3        | `intake_skills`            | `skill_id`                              | Epic 2        | `skills_catalog.id`                      |
| Epic 4        | `onboarding_journeys`      | `employee_id`                           | Epic 1        | `employees.id`                           |
| Epic 4        | `onboarding_tasks`         | `assignee`                              | Epic 1        | `employees.id`                           |
| Epic 5        | `assets`                   | `assigned_to`                           | Epic 1        | `employees.id`                           |
| Epic 5        | `assets`                   | `category`                              | Epic 5/2      | `asset_categories.id`                    |
| Epic 5        | `asset_assignment_history` | `asset_id`                              | Epic 5        | `assets.id`                              |
| Epic 6        | `timesheets`               | `project_id`                            | Epic 8        | `projects.id`                            |
| Epic 6        | `timesheets`               | `user_id`                               | Epic 1        | `employees.id`                           |
| Epic 7        | `project_members`          | `project_id`                            | Epic 8        | `projects.id`                            |
| Epic 7        | `project_members`          | `user_id`                               | Epic 1        | `employees.id`                           |
| Epic 7        | `employee_rates`           | `user_id`                               | Epic 1        | `employees.id`                           |
| Epic 9        | `audit_events`             | `actor_id`                              | Epic 1        | `employees.id`                           |
| Epic 10       | `requisitions`             | `intake_id`                             | Epic 3        | `intake_records.id`                      |
| Epic 10       | `requisitions`             | `hiring_manager_id`                     | Epic 1        | `employees.id`                           |
| Epic 10       | `requisition_skills`       | `skill_id`                              | Epic 2        | `skills_catalog.id`                      |
| Epic 10       | `applications`             | `candidate_id`                          | Epic 10       | `ats_candidates.id`                      |
| Epic 10       | `applications`             | `requisition_id`                        | Epic 10       | `requisitions.id`                        |
| Epic 10       | `interviews`               | `application_id`                        | Epic 10       | `applications.id`                        |
| Epic 2        | `permissions`              | `role_id`                               | Epic 2        | `roles.id`                               |
| Epic 2        | `role_assignments`         | `employee_id`                           | Epic 1        | `employees.id`                           |
| Epic 2        | `config_dropdowns`         | *(source of truth)*                     | All           | Departments, Locations, Hire Types, etc. |

---

## D. Schema Summary by Epic

| Epic | Module               | Reuse                                                                                                                                                                                                                                                                                    | Extend                                                            | Replace                                 | Retire                                                          | Net New                                                                                                |
| ---- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1    | Employee Management  | `employee_certifications`                                                                                                                                                                                                                                                                | `profiles→employees`, `employee_skills`, `leaves`                 | `candidates`                            | —                                                               | `employee_emergency_contacts`, `employee_attachments`, `employee_project_history`, `offboarding_tasks` |
| 2    | System Config        | `skills_catalog`, `access_grants`, `pending_invites`, `notification_*`, `email_templates`                                                                                                                                                                                                | `asset_categories`, `owner_groups`                                | `config`                                | —                                                               | `roles`, `permissions`, `role_assignments`, `config_dropdowns`, `system_settings`                      |
| 3    | Intake Management    | —                                                                                                                                                                                                                                                                                        | `approvals`                                                       | `hiring_surveys`                        | —                                                               | `intake_records`, `intake_skills`, `intake_approvals`, `intake_audit`                                  |
| 4    | Onboarding           | `onboarding_task_templates`, `onboarding_task_template_dependencies`, `onboarding_task_dependencies`, `group_members`, `task_sla_events`, `task_attachments`                                                                                                                             | `onboarding_templates`, `onboarding_journeys`, `onboarding_tasks` | —                                       | `external_completions`, `workflow_updates`, `task_dependencies` | —                                                                                                      |
| 5    | Asset Management     | —                                                                                                                                                                                                                                                                                        | `assets`                                                          | —                                       | —                                                               | `asset_attachments`, `asset_assignment_history`                                                        |
| 6    | Timesheets           | `holidays`, `fx_rates`                                                                                                                                                                                                                                                                   | `timesheets`, `leaves`                                            | —                                       | —                                                               | —                                                                                                      |
| 7    | Productivity         | `project_members`                                                                                                                                                                                                                                                                        | `employee_rates`, `projects`                                      | —                                       | —                                                               | —                                                                                                      |
| 8    | Project Management   | —                                                                                                                                                                                                                                                                                        | `projects`                                                        | —                                       | —                                                               | —                                                                                                      |
| 9    | Audit & Logging      | `task_sla_events`                                                                                                                                                                                                                                                                        | —                                                                 | `ats_audit` + `audit_logs` + `app_logs` | `workflow_updates`                                              | `audit_events`                                                                                         |
| 10   | ATS & Job Management | `applications`, `interview_assignments`, `interview_feedback`, `candidate_activities`, `candidate_comments`, `ats_comments`, `ats_attachments`, `compensation_private`, `requisition_activities`, `requisition_comments`, `candidate_proficiencies`, `test_*`, `proctor_*`, `ai_prompts` | `ats_candidates`, `requisitions`, `feedback`, `feedback_scores`   | `interviews` + `ats_interviews`         | `hiring_surveys`, `docs`                                        | `requisition_skills`                                                                                   |
