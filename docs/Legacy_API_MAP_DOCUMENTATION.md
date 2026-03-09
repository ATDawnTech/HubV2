# ADTHUB: Supabase API & Data Logic Map

This document provides a comprehensive mapping of the communication between the ADTHUB React frontend and the Supabase backend. It covers table interactions, logic flows, and audit tracking.

---

## 1. Onboarding & Workflow Engine

Manages the transition from candidate to employee through automated and manual tasks.

### Core Tables

| Table                                   | Description                               | Operations                                                                                      |
| :-------------------------------------- | :---------------------------------------- | :---------------------------------------------------------------------------------------------- |
| `onboarding_templates`                  | Blueprint for workflows.                  | **GET**: Fetch all selectable templates.                                                        |
| `onboarding_task_templates`             | Individual tasks within a template.       | **GET**: Loads tasks for a selected blueprint.                                                  |
| `onboarding_task_template_dependencies` | Logic for task ordering in templates.     | **GET**: Resolves blocking logic during instantiation.                                          |
| `onboarding_journeys`                   | Active instance of an onboarding process. | **POST**: Created when a "Start Onboarding" dialog is confirmed.                                |
| `onboarding_tasks`                      | Live tasks for a journey.                 | **GET/PATCH**: Fetch user tasks; update status (`todo`, `in_progress`, `completed`, `overdue`). |
| `onboarding_task_dependencies`          | Active blocking logic for live tasks.     | **GET**: Determines if a task is "ready" or "blocked".                                          |
| `task_assignees`                        | Individual ownership of tasks.            | **GET/POST**: Maps specific profiles to tasks (Many-to-Many).                                   |
| `group_members`                         | Team/Group mapping.                       | **GET**: Determines task visibility in "My Tasks".                                              |

### Tracking & Logs

| Table                   | Logic                          | Action                                                      |
| :---------------------- | :----------------------------- | :---------------------------------------------------------- |
| `onboarding_tasks_logs` | Trigger-based status tracking. | **AUTO**: Records every status transition for auditability. |

---

## 2. Asset Management & Inventory

Tracks physical hardware provisioning and maintenance.

### Core Tables

| Table              | Description              | Operations                                                  |
| :----------------- | :----------------------- | :---------------------------------------------------------- |
| `assets`           | Hardware inventory list. | **GET**: List assets (filtered by status/location).         |
|                    |                          | **POST**: Register new inventory with tags.                 |
|                    |                          | **PATCH**: Assign user (`assigned_to`) or update condition. |
| `asset_categories` | Classification levels.   | **GET/POST**: Manage asset types (e.g., Laptops).           |

### Audit System

| Table        | Logic                              | Action                                                     |
| :----------- | :--------------------------------- | :--------------------------------------------------------- |
| `audit_logs` | Manual service-driven audit trail. | **POST**: Files `CREATE`, `UPDATE`, or `DELETE` snapshots. |

---

## 3. Recruitment & ATS Pipeline

Handles applicant tracking and hiring requests.

### Core Tables

| Table            | Description                         | Operations                                               |
| :--------------- | :---------------------------------- | :------------------------------------------------------- |
| `candidates`     | Central employee/candidate profile. | **GET/POST/PATCH/DELETE**: CRUD for candidate lifecycle. |
| `hiring_surveys` | Job intake forms.                   | **POST**: Registers new job requirements.                |
|                  |                                     | **PATCH**: Handles Soft Delete (`is_deleted = true`).    |

---

## 4. Identity & Configuration

Global settings and permission resolution.

### System Tables

| Table      | Description            | Operations                                          |
| :--------- | :--------------------- | :-------------------------------------------------- |
| `profiles` | User identity & roles. | **GET/PATCH**: Identity and admin-level resolution  |
| `config`   | Global app constants.  | **UPSERT**: Manages stages and notification emails. |


