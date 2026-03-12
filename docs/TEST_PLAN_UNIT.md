# ADT Hub V2 – Unit Tests

**Version:** 1.1
**Date:** March 2026
**Reference:** ADT Hub Spec Plan v1.1

---

## Overview

Unit tests cover pure business logic: formulas, date calculations, string parsing, and validation rules. No database or HTTP connections. All inputs and outputs are deterministic.

**Test runner:** `pytest tests/unit`
**When:** On every commit; fastest suite — must pass in < 30 seconds

---

## U.1 Date Calculations

### U.1.1 Sunday Week Boundary Rule

Timesheet week starts on Monday. A Sunday entry belongs to the *previous* week (ending that Sunday).

| ID | Test Case | Input | Expected `week_start` |
|---|---|---|---|
| U.1.1.1 | Sunday belongs to ending week | Log hours on Sunday 2026-03-08 | 2026-03-02 (Mon of that week) |
| U.1.1.2 | Monday starts new week | Log hours on Monday 2026-03-09 | 2026-03-09 |
| U.1.1.3 | Friday mid-week | Log hours on Friday 2026-03-13 | 2026-03-09 |
| U.1.1.4 | Saturday mid-week | Log hours on Saturday 2026-03-14 | 2026-03-09 |
| U.1.1.5 | Year boundary: Sunday Dec 28 | Log hours on 2025-12-28 (Sun) | 2025-12-22 |
| U.1.1.6 | Year boundary: Monday Dec 29 | Log hours on 2025-12-29 (Mon) | 2025-12-29 |

### U.1.2 Timesheet Date Validation

| ID | Test Case | Input | Expected Result |
|---|---|---|---|
| U.1.2.1 | Weekend blocked | Date = Saturday | Validation error: weekend not allowed |
| U.1.2.2 | Weekend blocked | Date = Sunday | Validation error: weekend not allowed |
| U.1.2.3 | Weekday allowed | Date = Wednesday | Passes validation |
| U.1.2.4 | Future date rejected | Date = tomorrow | Validation error: future date not allowed |

---

## U.2 Financial Formulas

### U.2.1 Project Margin

Formula: `margin_pct = (revenue - cost) / revenue × 100`

| ID | Test Case | Inputs | Expected Output |
|---|---|---|---|
| U.2.1.1 | Standard margin | revenue=10000, cost=6000 | margin_pct = 40.00% |
| U.2.1.2 | Zero margin | revenue=10000, cost=10000 | margin_pct = 0.00% |
| U.2.1.3 | Negative margin (loss) | revenue=8000, cost=10000 | margin_pct = -25.00% |
| U.2.1.4 | Revenue = 0 guard | revenue=0, cost=5000 | Error: division by zero; result = undefined |
| U.2.1.5 | Fractional result rounds to 2dp | revenue=3, cost=1 | margin_pct = 66.67% |

### U.2.2 Projected Earnings

Formula: `projected_earnings = revenue - cost - discount`

| ID | Test Case | Inputs | Expected Output |
|---|---|---|---|
| U.2.2.1 | Standard | revenue=100000, cost=60000, discount=5000 | projected_earnings = 35000 |
| U.2.2.2 | No discount | revenue=100000, cost=60000, discount=0 | projected_earnings = 40000 |
| U.2.2.3 | Discount exceeds margin | revenue=100000, cost=60000, discount=50000 | projected_earnings = -10000 (allowed) |

### U.2.3 Projected Revenue

Formula: `projected_revenue = bill_rate × approved_billable_hours`

| ID | Test Case | Inputs | Expected Output |
|---|---|---|---|
| U.2.3.1 | Standard | bill_rate=150.00, approved_hours=80 | projected_revenue = 12000.00 |
| U.2.3.2 | Zero hours | bill_rate=150.00, approved_hours=0 | projected_revenue = 0.00 |
| U.2.3.3 | Fractional rate | bill_rate=33.33, approved_hours=3 | projected_revenue = 99.99 |

### U.2.4 Effective Date Rate Splits

When bill rate changes mid-project, hours before the change use the old rate; hours after use the new rate.

| ID | Test Case | Setup | Expected Output |
|---|---|---|---|
| U.2.4.1 | Rate change mid-week | 40 hrs @ $100 before rate change; 40 hrs @ $120 after | revenue = $4000 + $4800 = $8800 |
| U.2.4.2 | Rate change on exact hour boundary | Last old-rate hour at 17:00; new rate effective 17:01 | Revenue split at correct timestamp |
| U.2.4.3 | No rate change | 80 hrs @ $100 all in same period | revenue = $8000 |

---

## U.3 Multi-Currency Conversion

Formula: `cost_in_usd = local_cost / rate_to_usd` (where `rate_to_usd` = USD per 1 local unit)

| ID | Test Case | Inputs | Expected Output |
|---|---|---|---|
| U.3.1 | INR to USD | cost=830000 INR, rate_to_usd=83.00 | cost_usd = 10000.00 |
| U.3.2 | GBP to USD | cost=8000 GBP, rate_to_usd=0.79 | cost_usd ≈ 10126.58 |
| U.3.3 | Already USD | cost=10000 USD, rate_to_usd=1.00 | cost_usd = 10000.00 |
| U.3.4 | Zero rate guard | rate_to_usd=0 | Error: division by zero |
| U.3.5 | Margin with mixed currencies | Employee cost in INR, revenue in USD | INR cost converted before margin calc |

---

## U.4 CV / Candidate Parsing

| ID | Test Case | Input | Expected Output |
|---|---|---|---|
| U.4.1 | Name on first line | CV starts with "Jane Smith\n..." | `full_name` = "Jane Smith" |
| U.4.2 | ALL CAPS name | "JANE SMITH" | `full_name` = "Jane Smith" |
| U.4.3 | Email extraction | Body contains "jane.smith@example.com" | `email` = "jane.smith@example.com" |
| U.4.4 | International phone | Body contains "+44 7911 123456" | `phone` = "+447911123456" |
| U.4.5 | Year numbers excluded from phone | "2019–2023" in experience section | Not parsed as phone number |
| U.4.6 | Fallback name from email | No name found; email = "j.smith@example.com" | `full_name` = "J Smith" or "j.smith" |
| U.4.7 | Name with prefix/suffix stripped | "Dr. Jane Smith, PhD" | `full_name` = "Jane Smith" |
| U.4.8 | Empty CV | Empty string | Returns empty candidate; no crash |

---

## U.5 Skill Abbreviation Matching

| ID | Test Case | Input | Expected Match |
|---|---|---|---|
| U.5.1 | Common abbreviation | "JS" | "Javascript" |
| U.5.2 | Common abbreviation | "TS" | "Typescript" |
| U.5.3 | No match for unknown abbreviation | "ZZZ" | No suggestion |
| U.5.4 | Case-insensitive lookup | "js" | "Javascript" |
| U.5.5 | Substring match | "java" | "Javascript", "Java" |
| U.5.6 | Exact match preferred | "Java" | "Java" ranked above "Javascript" |

---

## U.6 Duplicate Detection Logic

| ID | Test Case | Input | Expected Result |
|---|---|---|---|
| U.6.1 | Exact email match | "user@example.com" vs "user@example.com" | Duplicate detected |
| U.6.2 | Case-insensitive match | "User@Example.COM" vs "user@example.com" | Duplicate detected |
| U.6.3 | Leading/trailing whitespace | " user@example.com " vs "user@example.com" | Duplicate detected (trimmed before compare) |
| U.6.4 | Different emails | "a@example.com" vs "b@example.com" | No duplicate |
| U.6.5 | Null personal email not flagged | NULL vs "user@example.com" | No duplicate |

---

## U.7 Work Email Generation

Formula (Spec 2.2, 6.2 — Entra Alignment): Trim leading/trailing whitespace → replace internal spaces with `.` → append `@AtDawnTech.com`.

| ID | Test Case | Input | Expected Output |
|---|---|---|---|
| U.7.1 | Standard name | "Jane Smith" | `Jane.Smith@AtDawnTech.com` |
| U.7.2 | Leading/trailing whitespace stripped | " Ryan Tjan " | `Ryan.Tjan@AtDawnTech.com` |
| U.7.3 | Single name (no space) | "Alice" | `Alice@AtDawnTech.com` |
| U.7.4 | Multiple internal spaces collapsed | "Mary  Jane  Watson" | `Mary.Jane.Watson@AtDawnTech.com` |

---

## U.8 Budget Min/Max Validation

Intake submission is blocked if `min_budget > max_budget` (Spec 5.2).

| ID | Test Case | Input | Expected Result |
|---|---|---|---|
| U.8.1 | Min exceeds Max | min=100000, max=80000 | Validation error |
| U.8.2 | Min equals Max | min=80000, max=80000 | Passes |
| U.8.3 | Min below Max | min=60000, max=100000 | Passes |
| U.8.4 | Both zero (no budget) | min=0, max=0 | Passes |

---

## U.9 Asset ID Generation

Formula (Spec 4.2): `[First 3 chars of Location]-[First 3 chars of Category]-[4-digit sequence]`.

| ID | Test Case | Input | Expected Output |
|---|---|---|---|
| U.9.1 | Standard generation | location="India", category="Laptop", seq=1 | `IND-LAP-0001` |
| U.9.2 | Sequence padding | location="India", category="Monitor", seq=42 | `IND-MON-0042` |
| U.9.3 | Short location name | location="UK", category="Phone", seq=1 | `UK-PHO-0001` |
| U.9.4 | Sequence exceeds 4 digits | seq=10000 | `IND-LAP-10000` (no cap) |
