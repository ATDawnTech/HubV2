# ADT Hub V2 – Schema Tests

**Version:** 1.1
**Date:** March 2026
**Reference:** DATA_SCHEMA_MIGRATION.md

---

## Overview

Schema tests verify database-level constraints independent of the application layer. These tests run directly against the database (or via migration dry-run) and must pass before any application tests run.

**Test runner:** `pytest tests/schema` (connects directly to DB; no HTTP)
**When:** On every schema migration; CI gate before deploy

---

## D. Data Integrity Constraints

### D.1 Employees

| ID | Constraint | Test | Expected Result |
|---|---|---|---|
| D.1.1 | `employees.work_email` UNIQUE | Insert second employee with same work email | DB rejects; unique violation |
| D.1.2 | `employees.work_email` NOT NULL | Insert employee without work_email | DB rejects; not null violation |
| D.1.3 | `employees.employee_number` UNIQUE + auto-increment | Create two employees; check employee_numbers | Both unique; no gaps | ⚠️ NOT IMPLEMENTED — `employee_number` column exists but has no UNIQUE constraint in migration 0001. Deferred. |
| D.1.4 | `employees.status` CHECK | Insert employee with status = 'invalid_value' | DB rejects; check constraint violation |
| D.1.5 | `employees.personal_email` UNIQUE (when set) | Insert two employees with same personal email | DB rejects |

### D.2 Assets

| ID | Constraint | Test | Expected Result |
|---|---|---|---|
| D.2.1 | `assets.asset_tag` UNIQUE | Insert two assets with same asset_tag | DB rejects; unique violation |
| D.2.2 | `assets.asset_tag` NOT NULL | Insert asset without asset_tag | DB rejects |
| D.2.3 | `asset_assignment_history` append-only | Attempt UPDATE on any row | DB rejects (row-level trigger or RLS) |
| D.2.4 | `asset_assignment_history` no deletes | Attempt DELETE on any row | DB rejects |
| D.2.5 | `assets.assigned_to` FK to `employees` | Insert asset with non-existent employee UUID | DB rejects; FK violation |

### D.3 Timesheets

| ID | Constraint | Test | Expected Result |
|---|---|---|---|
| D.3.1 | `timesheets.hours` CHECK (0 < hours ≤ 24) | Insert timesheet with hours = 25 | DB rejects; check constraint violation |
| D.3.2 | `timesheets.hours` CHECK lower bound | Insert timesheet with hours = 0 | DB rejects; check constraint violation |
| D.3.3 | `timesheets.hours` CHECK negative | Insert timesheet with hours = -1 | DB rejects |
| D.3.4 | `timesheets.employee_id` FK NOT NULL | Insert timesheet without employee_id | DB rejects |
| D.3.5 | `timesheets.project_id` FK NOT NULL | Insert timesheet without project_id | DB rejects |

### D.4 Onboarding

| ID | Constraint | Test | Expected Result |
|---|---|---|---|
| D.4.1 | `onboarding_task_dependencies` no self-reference | Insert dependency where task_id = depends_on_task_id | DB rejects; CHECK (task_id ≠ depends_on_task_id) |
| D.4.2 | `onboarding_task_templates.template_id` FK | Insert task template with non-existent template_id | DB rejects; FK violation |
| D.4.3 | `onboarding_tasks.journey_id` FK | Insert task with non-existent journey_id | DB rejects |

### D.5 ATS

| ID | Constraint | Test | Expected Result |
|---|---|---|---|
| D.5.1 | `applications` UNIQUE (candidate_id, requisition_id) | Insert two applications for same candidate + requisition | DB rejects; unique violation |
| D.5.2 | `applications.candidate_id` FK | Insert application with non-existent candidate_id | DB rejects |
| D.5.3 | `applications.requisition_id` FK | Insert application with non-existent requisition_id | DB rejects |
| D.5.4 | `requisitions.intake_id` FK nullable | Insert requisition with NULL intake_id | Accepted; FK nullable |

### D.6 Skills & Config

| ID | Constraint | Test | Expected Result |
|---|---|---|---|
| D.6.1 | `skills_catalog.name` UNIQUE (case-insensitive) | Insert 'Javascript' when 'javascript' exists | DB rejects; unique violation |
| D.6.2 | `config_dropdowns` UNIQUE (module, category, value) | Insert duplicate (module, category, value) triple | DB rejects |
| D.6.3 | `config_dropdowns.value` NOT NULL | Insert dropdown with NULL value | DB rejects |

### D.7 Audit Events

| ID | Constraint | Test | Expected Result |
|---|---|---|---|
| D.7.1 | `audit_events` no UPDATE | Attempt UPDATE on any audit_events row | DB rejects (trigger or RLS) |
| D.7.2 | `audit_events` no DELETE | Attempt DELETE on any audit_events row | DB rejects |
| D.7.3 | Archive employee; audit events preserved | Archive employee; query audit_events by employee_id | Records remain; no cascade delete |
| D.7.4 | Delete project; employee_project_history preserved | Delete project row; check history | History row preserved with denormalized `project_name` intact; `project_id` set to NULL |

### D.8 Users & Security

> **OUT OF SCOPE for this schema.** HubV2 authenticates via SAML SSO — there is no local
> `users` table, no `password_hash` column, and no local credential storage. D.8 tests
> will not be implemented. Role protection (D.8.3) is enforced at the application layer,
> not via a DB constraint.

| ID | Constraint | Test | Expected Result | Status |
|---|---|---|---|---|
| D.8.1 | `users.email` UNIQUE | Insert two users with same email | DB rejects | ❌ N/A — no `users` table |
| D.8.2 | `users.password_hash` format | Read password_hash from DB | Value starts with `$argon2` or `$2b$` | ❌ N/A — SAML SSO; no password storage |
| D.8.3 | System roles not deletable | Attempt DELETE on system role | DB rejects | ❌ N/A — enforced at application layer |

### D.9 Referential Integrity — Cross-Module

| ID | Constraint | Test | Expected Result |
|---|---|---|---|
| D.9.1 | `offboarding_tasks.employee_id` FK | Insert offboarding task with non-existent employee_id | DB rejects |
| D.9.2 | `project_members.project_id` FK | Insert member with non-existent project_id | DB rejects |
| D.9.3 | `project_members.employee_id` FK | Insert member with non-existent employee_id | DB rejects |
| D.9.4 | `intake_skills.skill_id` FK | Insert intake_skill with non-existent skill_id | DB rejects |
| D.9.5 | `notification_queue` delivery status CHECK | Insert notification with status = 'invalid' | DB rejects; only valid statuses accepted | ⚠️ NOT IMPLEMENTED — `notification_queue` table not in current schema. Deferred. |

### D.10 Dashboard Tasks (Epic 1)

| ID | Constraint | Test | Expected Result |
|---|---|---|---|
| D.10.1 | `dashboard_tasks.status` CHECK | Insert task with status = `'in_progress'` | DB rejects; only `'open'` or `'completed'` accepted |
| D.10.2 | `dashboard_tasks.module` CHECK | Insert task with module = `'unknown_module'` | DB rejects; only valid module identifiers accepted |
| D.10.3 | `dashboard_tasks.module` NOT NULL | Insert task with NULL module | DB rejects |
| D.10.4 | `dashboard_tasks.title` NOT NULL | Insert task with NULL title | DB rejects |
| D.10.5 | `dashboard_tasks.source_record_id` NOT NULL | Insert task with NULL source_record_id | DB rejects |
| D.10.6 | `dashboard_tasks.assigned_to_id` FK to `employees` | Insert task with non-existent employee ID | DB rejects; FK violation |
| D.10.7 | `dashboard_tasks.assigned_to_id` nullable | Insert task with NULL assigned_to_id | Accepted; tasks start unassigned (pool model) |
| D.10.8 | `dashboard_tasks.assigned_to_id` FK valid | Insert task with valid employee ID | Accepted |
