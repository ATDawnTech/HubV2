# ADT Hub V2 – Integration Tests

**Version:** 1.1
**Date:** March 2026
**Reference:** ADT Hub Spec Plan v1.1, DATA_SCHEMA_MIGRATION.md

---

## Overview

Integration tests cover API endpoints + database interactions and cross-module data flows. Each test makes real HTTP requests against a running API with a real database.

**Test runner:** `pytest tests/integration`
**Prerequisites:** DB running + migrated; API running; test fixtures loaded
**When:** On every commit (against test environment)

---

## 0. Epic 0 – Hub Dashboard

### 0.1 My Tasks Aggregation

| ID | Test Case | Expected Result |
|---|---|---|
| 0.1.1 | `GET /v1/my-tasks` as IT user with assigned onboarding task | 200; task appears with module=Onboarding |
| 0.1.2 | Complete task in source module | Task no longer in `GET /v1/my-tasks` |
| 0.1.3 | `GET /v1/my-tasks` as user with no assignments | 200; empty list |
| 0.1.4 | User with two roles sees union of tasks from both roles | All tasks visible |

### 0.2 Role-Based Dashboard Configuration

| ID | Test Case | Expected Result |
|---|---|---|
| 0.2.1 | Role with no module assignments | `GET /v1/dashboard/modules` displays no results |
| 0.2.2 | Role with Manager Type flag | Supervisor widgets included in dashboard response |

---

## 1. Epic 1 – Employee Management

### 1.1 Employee Directory

| ID | Test Case | Expected Result |
|---|---|---|
| 1.1.1 | `GET /v1/employees` as authenticated HR user | 200; body contains columns: id, name, role, department, location, manager, work_email |
| 1.1.2 | Default sort is by employee_number ascending | First item has lowest employee_number |
| 1.1.3 | `GET /v1/employees` unauthenticated | 401 |
| 1.1.4 | `GET /v1/employees` as Employee role | 200 read-only; no admin_mode fields |

### 1.2 Employee Creation

| ID | Test Case | Expected Result |
|---|---|---|
| 1.2.1 | `POST /v1/employees` with complete valid body | 201; `employee_number` auto-assigned |
| 1.2.2 | `POST /v1/employees` missing `work_email` | 422 |
| 1.2.3 | `POST /v1/employees` with attachment | 201; `employee_attachments` record created; S3 key stored |
| 1.2.4 | `POST /v1/employees` with inline project | 201; `projects` record created in same transaction |
| 1.2.5 | Cancel mid-creation (no save) | No `projects` record in DB |

### 1.3 Duplicate Detection

| ID | Test Case | Expected Result |
|---|---|---|
| 1.3.1 | `GET /v1/employees/check-email?email=existing@co.com` | 409 Conflict |
| 1.3.2 | Duplicate check case-insensitive | "User@Example.com" conflicts with "user@example.com" |
| 1.3.3 | Duplicate check trims whitespace | " user@example.com " conflicts with "user@example.com" |
| 1.3.4 | `POST /v1/employees` with duplicate work_email | 409; record not created |
| 1.3.5 | Race condition: two concurrent POSTs with same email | Only one 201; second 409; DB has one record |

### 1.4 Employee Profile

| ID | Test Case | Expected Result |
|---|---|---|
| 1.4.1 | `GET /v1/employees/{id}` | 200; body contains employee, contact, emergency, assets, projects, attachments sections |
| 1.4.2 | `PATCH /v1/employees/{id}` as HR | 200; `updated_at` updated |
| 1.4.3 | `GET /v1/employees/{id}/attachments/{file_id}` (view permission) | 200 signed URL; `audit_events` record created |
| 1.4.4 | `DELETE /v1/employees/{id}/attachments/{file_id}` (edit permission) | 200; file unlinked; `audit_events` logged |
| 1.4.5 | `PATCH /v1/employees/{id}` as Employee role (other employee) | 403 |

### 1.5 Search & Filtering

| ID | Test Case | Expected Result |
|---|---|---|
| 1.5.1 | `GET /v1/employees?search=smi` | Returns all employees with "smi" in name |
| 1.5.2 | `GET /v1/employees?department=Engineering` | Returns only Engineering employees |
| 1.5.3 | Multiple filters simultaneously | Returns intersection |
| 1.5.4 | Default query excludes archived/archiving | Status = archived/archiving not in results |
| 1.5.5 | `GET /v1/employees?include_non_active=true` | Archiving records included |
| 1.5.6 | `GET /v1/employees?sort=name&direction=asc` | Records sorted A→Z |

### 1.6 Bulk Actions

| ID | Test Case | Expected Result |
|---|---|---|
| 1.6.1 | `GET /v1/employees/export?ids=1,2,3` | 200 CSV; only selected employees |
| 1.6.2 | `GET /v1/employees/export` (no ids) | 200 CSV; all employees |
| 1.6.3 | `POST /v1/employees/bulk-archive` as Admin | 200; all specified employees set to archiving |
| 1.6.4 | `POST /v1/employees/bulk-archive` > 10 employees | 403; Category 2 security block |
| 1.6.5 | `POST /v1/employees/bulk-import` valid CSV | 201; only imported records in response |

### 1.7 Offboarding Workflow

| ID | Test Case | Expected Result |
|---|---|---|
| 1.7.1 | `PATCH /v1/employees/{id}` status=archiving | 200; `offboarding_tasks` table has 4 new rows |
| 1.7.2 | Offboarding tasks initially have NULL assignee_id | All 4 tasks: `assignee_id` IS NULL |
| 1.7.3 | IT user self-assigns task | `PATCH /v1/offboarding-tasks/{id}` → assignee_id updated; `audit_events` logged |
| 1.7.4 | `PATCH /v1/employees/{id}` status=archived with incomplete tasks | 422; blocked until all 4 tasks completed |
| 1.7.5 | `PATCH /v1/employees/{id}` status=archived when all tasks complete | 200; employee archived |
| 1.7.6 | Archived employee excluded from default directory | `GET /v1/employees` does not include status=archived |

### 1.8 System-Wide Referencing

| ID | Test Case | Expected Result |
|---|---|---|
| 1.8.1 | `GET /v1/employees/assignable` excludes archiving | Employees with status=archiving not in list |
| 1.8.2 | `GET /v1/employees/assignable` excludes archived | Employees with status=archived not in list |

---

## 2. Epic 2 – System Configuration

### 2.1 Dropdown Management

| ID | Test Case | Expected Result |
|---|---|---|
| 2.1.1 | `POST /v1/config/dropdowns` new Department value | 201; value available in employee creation |
| 2.1.2 | `PATCH /v1/config/dropdowns/{id}` rename value | 200; all employees referencing old value display new |
| 2.1.3 | `DELETE /v1/config/dropdowns/{id}` value in use | 409; error body includes usage count |
| 2.1.4 | `POST /v1/config/dropdowns` as non-admin | 403 |
| 2.1.5 | `GET /v1/config/dropdowns?module=employees&category=department` | 200; list matches `config_dropdowns` table |

### 2.2 Skill Management

| ID | Test Case | Expected Result |
|---|---|---|
| 2.2.1 | `GET /v1/skills?q=JS` | Returns suggestion "Javascript" |
| 2.2.2 | `DELETE /v1/skills` bulk; skills with usage > 0 | 409; usage count per skill returned |
| 2.2.3 | `POST /v1/skills` duplicate name | 409 Conflict |

### 2.3 Role & Permission Management

| ID | Test Case | Expected Result |
|---|---|---|
| 2.3.1 | `POST /v1/roles` with permissions | 201; `roles` + `permissions` records created |
| 2.3.2 | `POST /v1/role-assignments` assign role to employee | 201; `role_assignments` record created |
| 2.3.3 | Employee with two roles has union of permissions | API allows action permitted by either role |
| 2.3.4 | Role without `can_access_admin_mode` calls admin endpoint | 403 |
| 2.3.5 | `DELETE /v1/roles/{id}` for system role (Admin/HR/Staff) | 403 |
| 2.3.6 | Role without "Reveal PII" calls `GET /v1/employees/{id}` | personal_email, phone, address masked |
| 2.3.7 | HR role attempts to assign Admin role | 403 |

### 2.4 Notifications

| ID | Test Case | Expected Result |
|---|---|---|
| 2.4.1 | Global kill-switch on; trigger any notifiable event | No records added to `notification_queue` |
| 2.4.2 | Module-level disable for Timesheets; approve timesheet | No notification queued for Timesheets event |
| 2.4.3 | Assignment-specific alert | `notification_queue.recipient_email` = assignee only |
| 2.4.4 | Role-wide alert | One queue record per user with that role |

### 2.5 Audit Retention

| ID | Test Case | Expected Result |
|---|---|---|
| 2.5.1 | Set retention to 90 days; query log at 91 days | 404 after grace period |
| 2.5.2 | `PATCH /v1/audit-events/{id}` | 405 |
| 2.5.3 | `DELETE /v1/audit-events/{id}` | 405 |
| 2.5.4 | `GET /v1/audit-events/export` | 200 CSV; all events within retention window |
| 2.5.5 | Retention policy change; log within 7-day grace period | Log still accessible |

### 2.6 Security Blocks

| ID | Test Case | Expected Result |
|---|---|---|
| 2.6.1 | Bulk archive 11 employees | 403; admin alert created in `audit_events` |
| 2.6.2 | Velocity: 10+ write actions in 1 hour | Subsequent actions blocked; admin notified |

---

## 3. Epic 3 – Intake Management

### 3.1 Form Submission

| ID | Test Case | Expected Result |
|---|---|---|
| 3.1.1 | `POST /v1/intakes` complete valid body | 201; status=submitted; `reference_number` assigned |
| 3.1.2 | `POST /v1/intakes` missing `role_title` | 422 |
| 3.1.3 | `POST /v1/intakes` as draft | 201; status=draft; mandatory fields not required |

### 3.2 Skill Tagging

| ID | Test Case | Expected Result |
|---|---|---|
| 3.2.1 | Add existing skill to intake | `intake_skills` record created with existing `skill_id` |
| 3.2.2 | Add new skill; save intake | New skill in `skills_catalog`; `intake_skills` record created |
| 3.2.3 | Add new skill; cancel intake | Skill NOT in `skills_catalog` |
| 3.2.4 | `GET /v1/intakes?skill=Python` | Returns all intakes with Python skill tag |

### 3.3 Approval Workflow

| ID | Test Case | Expected Result |
|---|---|---|
| 3.3.1 | `POST /v1/intakes/{id}/submit` | 201 `intake_approvals` with status=pending |
| 3.3.2 | `PATCH /v1/intake-approvals/{id}` status=approved | `intake_records.status` = approved |
| 3.3.3 | `PATCH /v1/intake-approvals/{id}` status=rejected | `intake_records.status` = rejected; submitter notified |
| 3.3.4 | Non-approver attempts approval | 403 |

### 3.4 ATS Handoff

| ID | Test Case | Expected Result |
|---|---|---|
| 3.4.1 | Approve intake | `requisitions` record auto-created; `intake_id` FK set |
| 3.4.2 | Requisition inherits fields | Budget, role_level, skills match intake source values |

### 3.5 AI Summary

| ID | Test Case | Expected Result |
|---|---|---|
| 3.5.1 | `POST /v1/intakes/{id}/generate-jd` | 200; `ai_generated_jd` populated; `ai_jd_generated_at` set |
| 3.5.2 | `POST /v1/intakes/{id}/email-summary` | 200; email queued in `notification_queue` |
| 3.5.3 | JD generation logged | `intake_audit` record with action=updated |

### 3.6 Audit Trail

| ID | Test Case | Expected Result |
|---|---|---|
| 3.6.1 | Every intake status change | One `intake_audit` record per transition |
| 3.6.2 | Edit intake fields | `intake_audit.snapshot` contains full record at time of change |

---

## 4. Epic 4 – Onboarding Management

### 4.1 Template Management

| ID | Test Case | Expected Result |
|---|---|---|
| 4.1.1 | `POST /v1/onboarding-templates` with tasks | 201; template + task templates persisted |
| 4.1.2 | `PATCH /v1/onboarding-templates/{id}` with active journeys | 200; existing journeys unaffected; `version` incremented |
| 4.1.3 | Version increment on update | `onboarding_templates.version` = previous + 1 |

### 4.2 Task Dependencies

| ID | Test Case | Expected Result |
|---|---|---|
| 4.2.1 | Start journey; task with unmet dependency | `onboarding_tasks.status` = waiting_for_dependency |
| 4.2.2 | Complete prerequisite; dependent task becomes active | Dependent task status = pending; assignee notified |
| 4.2.3 | Template creation with circular dependency | 422 error |

### 4.3 Team Assignment

| ID | Test Case | Expected Result |
|---|---|---|
| 4.3.1 | Start journey; IT block assigned to IT group | `onboarding_tasks.owner_group_id` = IT group ID |
| 4.3.2 | IT user self-assigns from pool | `assignee` = IT user's employee_id |
| 4.3.3 | Manager reassigns task | `assignee` updated; `audit_events` logged |

### 4.4 SLA Monitoring

| ID | Test Case | Expected Result |
|---|---|---|
| 4.4.1 | Task past SLA | `task_sla_events` record with overdue event |
| 4.4.2 | 24hr warning | `notification_queue` record created 24hr before `due_at` |
| 4.4.3 | Escalation routing | Notification targets department manager role |

### 4.5 Audit

| ID | Test Case | Expected Result |
|---|---|---|
| 4.5.1 | Task status change | `task_sla_events` event recorded with actor and timestamp |
| 4.5.2 | Template config change | `audit_events` record with entity=onboarding_templates |

### 4.6 Journey State Transitions

Spec 6.1 defines five journey states: Not Started, In Progress, Paused, Cancelled, Completed.

| ID | Test Case | Expected Result |
|---|---|---|
| 4.6.1 | `PATCH /v1/onboarding-journeys/{id}` status=paused | 200; SLA clock stops; tasks remain assigned |
| 4.6.2 | `PATCH /v1/onboarding-journeys/{id}` status=in_progress from paused | 200; SLA resumes |
| 4.6.3 | `PATCH /v1/onboarding-journeys/{id}` status=cancelled | 200; open tasks cleared |

### 4.7 Enrollment & Finalization

Spec 6.2: Enrollment creates a shell employee record with status=new_onboard. Spec 6.3: Finalization is hard-gated until all tasks complete; transitions employee to active.

| ID | Test Case | Expected Result |
|---|---|---|
| 4.7.1 | `POST /v1/onboarding/candidates` enroll new candidate | 201; shell `employees` record created with status=new_onboard; employee_id and work_email auto-assigned |
| 4.7.2 | New Onboard candidate visible in onboarding dashboard | `GET /v1/onboarding/candidates` includes the enrolled candidate |
| 4.7.3 | New Onboard candidate NOT in employee directory | `GET /v1/employees` default view excludes status=new_onboard |
| 4.7.4 | `POST /v1/onboarding-journeys/{id}/finalize` with incomplete tasks | 422; blocked |
| 4.7.5 | `POST /v1/onboarding-journeys/{id}/finalize` with all tasks complete | 200; `employees.status` = active; candidate now appears in employee directory |

---

## 5. Epic 5 – Asset Management

### 5.1 Asset Creation

| ID | Test Case | Expected Result |
|---|---|---|
| 5.1.1 | `POST /v1/assets` all required fields | 201; asset persisted |
| 5.1.2 | `POST /v1/assets` duplicate `asset_tag` | 409 Conflict |
| 5.1.3 | `POST /v1/assets` missing mandatory field | 422 |

### 5.2 Asset Lifecycle & Immutability

| ID | Test Case | Expected Result |
|---|---|---|
| 5.2.1 | `DELETE /v1/assets/{id}` | 405 |
| 5.2.2 | `PATCH /v1/assets/{id}` status=in_repair | 200; `asset_assignment_history` record created; `audit_events` logged |
| 5.2.3 | `DELETE /v1/asset-assignment-history/{id}` | 405 |

### 5.3 Asset Assignment

| ID | Test Case | Expected Result |
|---|---|---|
| 5.3.1 | `PATCH /v1/assets/{id}` assigned_to=employee_uuid | 200; employee profile shows asset |
| 5.3.2 | Assign to archived employee | 422 |
| 5.3.3 | Reassign to different employee | `asset_assignment_history` record with from/to/by/at |

### 5.4 Search & Filtering

| ID | Test Case | Expected Result |
|---|---|---|
| 5.4.1 | `GET /v1/assets?category=Laptop` | Returns only Laptop assets |
| 5.4.2 | `GET /v1/assets?assigned_to={employee_id}` | Returns only that employee's assets |
| 5.4.3 | `GET /v1/assets?status=in_repair` | Returns only in_repair assets |

### 5.5 Warranty Alerts

| ID | Test Case | Expected Result |
|---|---|---|
| 5.5.1 | Asset `warranty_end_date` = today + 60 days | Notification queued to responsible admin |
| 5.5.2 | Asset `warranty_end_date` = today + 61 days | No notification queued |

### 5.6 Bulk Import

| ID | Test Case | Expected Result |
|---|---|---|
| 5.6.1 | `POST /v1/assets/import` valid CSV | Preview returned; assets created on confirm |
| 5.6.2 | Import CSV with unrecognized headers | Smart-match step required before proceeding |
| 5.6.3 | Import CSV with duplicate asset_tag | Preview flags duplicates; user decides skip/overwrite |

### 5.7 Invoice Verification

| ID | Test Case | Expected Result |
|---|---|---|
| 5.7.1 | Attach invoice to asset | 201 `asset_attachments` with label=Invoice |
| 5.7.2 | Mark invoice verified | `assets.invoice_verified_status` = verified |
| 5.7.3 | Flag invoice discrepancy | `assets.invoice_verified_status` = mismatch; `audit_events` logged |

---

## 6. Epic 6 – Timesheets

### 6.1 Hour Logging

| ID | Test Case | Expected Result |
|---|---|---|
| 6.1.1 | `POST /v1/timesheets` weekday 8 hours | 201; billable=true by default |
| 6.1.2 | `PATCH /v1/timesheets/{id}` override billable=false | 200; only that entry affected |
| 6.1.3 | `POST /v1/timesheets` missing project | 422 |
| 6.1.4 | `POST /v1/timesheets` date=Saturday or Sunday | 422 |
| 6.1.5 | `POST /v1/timesheets` hours=25 | 422; CHECK constraint |

### 6.2 Approval Workflow

| ID | Test Case | Expected Result |
|---|---|---|
| 6.2.1 | `POST /v1/timesheets/{id}/submit` | 200; status=submitted |
| 6.2.2 | `PATCH /v1/timesheets/{id}` status=approved by Manager | 200; `approved_by` and `approved_at` set |
| 6.2.3 | `PATCH /v1/timesheets/{id}` status=rejected | 200; `rejection_reason` stored |
| 6.2.4 | `PATCH /v1/timesheets/{id}` by Employee after approved | 403 |
| 6.2.5 | `PATCH /v1/timesheets/{id}` by Admin (any timesheet) | 200; change logged in `audit_events` |

### 6.3 CSV Export

| ID | Test Case | Expected Result |
|---|---|---|
| 6.3.1 | `GET /v1/timesheets/export?status=approved&from=...&to=...` by Finance | 200 CSV; 6 columns: Date, Project, Hours, Notes, Status, Employee |
| 6.3.2 | Same endpoint as non-Finance user | 403 |

---

## 7. Epic 7 – Productivity Management

### 7.1 Timesheets Integration with P&L

| ID | Test Case | Expected Result |
|---|---|---|
| 7.1.1 | Approve timesheet; verify P&L | Project earnings increase by approved billable hours × bill rate |
| 7.1.2 | Reject and resubmit timesheet | P&L recalculated after resubmission approval |
| 7.1.3 | Draft timesheet not in P&L | Only approved timesheets included in earnings |

### 7.2 Multi-Currency (DB side)

| ID | Test Case | Expected Result |
|---|---|---|
| 7.2.1 | `PATCH /v1/fx-rates/{currency}` update INR rate | 200; subsequent P&L uses new rate |

### 7.3 Access Control

| ID | Test Case | Expected Result |
|---|---|---|
| 7.3.1 | `GET /v1/projects/{id}/pl` as non-admin, non-finance | 403 |
| 7.3.2 | Edit P&L field | `audit_events` record with user and timestamp |

---

## 8. Epic 8 – Project Management

### 8.1 Project CRUD

| ID | Test Case | Expected Result |
|---|---|---|
| 8.1.1 | `POST /v1/projects` required fields | 201; record in `projects` |
| 8.1.2 | `GET /v1/projects/{id}/members` | 200; all `project_members` with roles |
| 8.1.3 | `PATCH /v1/projects/{id}` status=active from pipeline | 200; change logged |
| 8.1.4 | `PATCH /v1/projects/{id}` status=active from completed | 422; invalid transition |

### 8.2 Inline Project Creation

| ID | Test Case | Expected Result |
|---|---|---|
| 8.2.1 | `POST /v1/employees` with new inline project | 201; `projects` record created atomically |
| 8.2.2 | Cancel employee creation with inline project | No `projects` record in DB |

---

## 9. Epic 9 – Audit & Logging

### 9.1 Event Capture

| ID | Test Case | Expected Result |
|---|---|---|
| 9.1.1 | Create employee | `audit_events`: module=employees, action=create, entity_id=new id |
| 9.1.2 | Update employee | `audit_events`: action=update; old_value and new_value captured |
| 9.1.3 | Rejected delete (asset) | `audit_events`: action=delete, severity=warn |
| 9.1.4 | Upload employee document | `audit_events`: action=create, module=employees |
| 9.1.5 | Download employee document | `audit_events`: action=view, module=employees |
| 9.1.6 | Admin login | `audit_events`: action=login |

### 9.2 Immutability

| ID | Test Case | Expected Result |
|---|---|---|
| 9.2.1 | `PATCH /v1/audit-events/{id}` | 405 |
| 9.2.2 | `DELETE /v1/audit-events/{id}` | 405 |

### 9.3 Retention

| ID | Test Case | Expected Result |
|---|---|---|
| 9.3.1 | `GET /v1/audit-events/{id}` after retention purge | 404 |
| 9.3.2 | `GET /v1/audit-events/{id}` within 7-day grace period | 200 |

---

## 10. Epic 10 – ATS & Job Management

### 10.1 Requisition Management

| ID | Test Case | Expected Result |
|---|---|---|
| 10.1.1 | Requisition auto-created from approved intake | `requisitions.intake_id` = intake record ID |
| 10.1.2 | Requisition inherits budget, role_level, skills | Fields match; `requisition_skills` populated from `intake_skills` |
| 10.1.3 | `POST /v1/requisitions` without intake | 201; `intake_id` is NULL |
| 10.1.4 | `PATCH /v1/requisitions/{id}` status=open | 200; posting fields required |

### 10.2 Candidate Pipeline

| ID | Test Case | Expected Result |
|---|---|---|
| 10.2.1 | `PATCH /v1/applications/{id}` stage=screen from sourced | 200; stage updated immediately |
| 10.2.2 | Duplicate application (same candidate + requisition) | 409; UNIQUE (candidate_id, requisition_id) |
| 10.2.3 | `PATCH /v1/applications/{id}` status=hired | 200; status=hired, stage=hired |

### 10.3 Advanced Search

| ID | Test Case | Expected Result |
|---|---|---|
| 10.3.1 | `GET /v1/candidates?skill=Python` | Returns only candidates with Python in `candidate_proficiencies` |

### 10.4 Interview Feedback

| ID | Test Case | Expected Result |
|---|---|---|
| 10.4.1 | `POST /v1/interview-feedback` by interviewer | 201; viewable on candidate profile |
| 10.4.2 | `GET /v1/interview-feedback/{id}` by non-authorized role | 403 |

### 10.5 Job Lifecycle

| ID | Test Case | Expected Result |
|---|---|---|
| 10.5.1 | Requisition open → on_hold | 200; sourcing suspended |
| 10.5.2 | Requisition on_hold → open | 200; sourcing resumes |
| 10.5.3 | Requisition open → closed | 200; new applications return 422 |

---

## 11. Cross-Module Integration

| ID | Test Case | Modules | Expected Result |
|---|---|---|---|
| X.1 | Create employee → start onboarding journey | Epic 1 + 4 | `onboarding_journeys.employee_id` = new employee ID |
| X.2 | Approve intake → requisition auto-created → candidate pipeline active | Epic 3 + 10 | Full handoff chain verified in DB |
| X.3 | Assign asset to employee → employee profile shows asset | Epic 5 + 1 | `assets.assigned_to` = employee; profile asset count = 1 |
| X.4 | Approve timesheet → P&L updates in Productivity | Epic 6 + 7 | Project earnings increase by correct calculated amount |
| X.5 | Archive employee → removed from all active assignments | Epic 1 + 4 + 5 | Onboarding tasks reassigned; assets flagged; ATS dropdowns exclude |
| X.6 | Rename department in System Config → all employees reflect new name | Epic 2 + 1 | Employee directory shows updated department name |
| X.7 | Create project inline in employee modal → project available in Timesheets | Epic 1 + 8 + 6 | Project selectable in timesheet project dropdown |
| X.8 | Remove config dropdown value → disappears from all consuming modules | Epic 2 + All | Value absent from all module dropdowns after deletion |
| X.9 | Enroll candidate in onboarding → shell employee record created with employee_id | Epic 4 + 1 | `employees.status` = new_onboard; employee_id assigned from sequence |
| X.10 | Finalize onboarding journey → employee becomes active | Epic 4 + 1 | `employees.status` changes from new_onboard → active; no duplicate record; employee visible in directory |

---

## 12. RBAC Matrix

Each ✗ entry requires a test asserting `403 Forbidden` at the API layer against a real request.

| Action | Admin | HR | Finance | Staff | Recruiter | IT |
|---|---|---|---|---|---|---|
| Create employee | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Archive employee | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View all employees | ✓ | ✓ | ✗ | View-only | ✗ | ✗ |
| Access Admin Mode endpoints | ✓ (with permission) | ✓ (with permission) | ✗ | ✗ | ✗ | ✗ |
| Assign asset | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| View Productivity P&L | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Edit any timesheet | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Approve timesheet | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Approve intake | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage system config | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View audit trail | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Create/edit requisition | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| Submit interview feedback | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
