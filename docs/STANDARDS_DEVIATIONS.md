# HubV2 — Engineering Standards Deviations

This document records deliberate deviations from the At Dawn engineering standards.
Per `GOVERNANCE.md`, exceptions must be approved by Michael and documented in
`products/adthub.md` inside the `at-dawn-standards` repository.

The entries below are **draft exceptions awaiting formal approval**. Until approved,
they serve as the rationale record and a prompt to create the product standard file.

---

## Exception: Skills endpoint uses offset-based pagination

**Date:** 2026-03-14
**Standard reference:** `api-design.md` R6 (cursor-based pagination required)
**Status:** Pending Michael's approval — to be moved to `products/adthub.md`

### Rationale

The skills catalog supports server-side sorting by three columns: `name`
(alphabetical), `created_at` (timestamp), and `usage_count` (correlated
subquery aggregate). Multi-column server-side sorting is incompatible with
keyset cursor pagination because:

1. `usage_count` is not a stored column — it is computed via a correlated
   subquery against `employee_skills`. There is no stable index to base a
   keyset cursor on.
2. Ties in `usage_count` or `created_at` cannot be deterministically broken
   by a single cursor value without composite key encoding that couples the
   pagination logic to the sort logic in a fragile way.

Offset-based pagination (`LIMIT n OFFSET k`) is the correct choice here
because the skills catalog is an admin-only list, not a high-cardinality
user-facing feed. The performance implications of deep offsets are
acceptable at the expected scale of this dataset (thousands of skills, not millions).

### Scope

Applies only to `GET /v1/admin/skills`. All other paginated endpoints in HubV2
must use cursor-based pagination per `api-design.md` R6.

### Files affected

- `backend/src/adthub/db/repositories/skill_repository.py` — `find_all_paginated()`
- `backend/src/adthub/services/skill_service.py` — `list_skills()`
- `backend/src/adthub/api/skills.py` — `GET /v1/admin/skills`
