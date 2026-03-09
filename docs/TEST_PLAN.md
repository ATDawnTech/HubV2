# ADT Hub V2 – Test Plan Index

**Version:** 1.0
**Date:** March 2026
**Reference:** ADT Hub Spec Plan v1.0, DATA_SCHEMA_MIGRATION.md

---

## Test Suite Overview

| Document | Scope | Runner | When |
|---|---|---|---|
| [TEST_PLAN_SCHEMA.md](TEST_PLAN_SCHEMA.md) | DB-level constraints: UNIQUE, NOT NULL, CHECK, FK, immutability | `pytest tests/schema` — direct DB, no HTTP | Every schema migration |
| [TEST_PLAN_UNIT.md](TEST_PLAN_UNIT.md) | Pure business logic: formulas, date calculations, parsing | `pytest tests/unit` — no DB, no HTTP | Every commit |
| [TEST_PLAN_INTEGRATION.md](TEST_PLAN_INTEGRATION.md) | API + DB: all 10 epics, cross-module flows, RBAC matrix | `pytest tests/integration` | Every commit (test env) |
| This file | Smoke tests: critical path health checks against deployed env | Manual or post-deploy hook | After every deployment |

---

## Guiding Principles

- Acceptance criteria from the spec are the source of truth for test cases
- Every schema constraint (NOT NULL, UNIQUE, CHECK, FK) has a corresponding negative test in `TEST_PLAN_SCHEMA.md`
- RBAC is tested at the API layer — not just the UI — in `TEST_PLAN_INTEGRATION.md`
- Cross-module integrity is verified in integration tests, not unit tests
- All financial formulas have deterministic unit tests with known inputs/outputs in `TEST_PLAN_UNIT.md`
- Schema tests run first; a failed constraint blocks application tests

---

## Smoke Tests (Post-Deployment)

Run against each deployed environment (dev, test, prod) after every deployment. These are not a substitute for integration tests — they verify the deployed service is alive and reachable.

| ID | Test | Expected Result |
|---|---|---|
| S.1 | `GET /health` | 200 `{"status": "healthy"}` |
| S.2 | `GET /v1/auth/saml/metadata` | 200; Content-Type includes text/xml; body includes EntityDescriptor |
| S.3 | `GET /v1/auth/sso` (no redirect follow) | 302 or 307; Location header contains SAMLRequest |
| S.4 | `GET /v1/employees` (unauthenticated) | 401 |
| S.5 | `GET /v1/projects` (unauthenticated) | 401 |
| S.6 | `GET /v1/config/dropdowns` (unauthenticated) | 401 |
