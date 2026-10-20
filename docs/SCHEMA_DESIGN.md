# Schema Design

## 1. Tables and keys
12 tables, InnoDB, utf8mb4. Surrogate `INT UNSIGNED AUTO_INCREMENT` primary keys named `<entity>_id`; the three pure junction tables (`StudentSkills`, `OpportunitySkills`, `ProjectSkills`) use **composite primary keys**, so a duplicate pair is impossible without an extra constraint.

## 2. Constraints (what each one protects)
| Constraint | Where | Why |
|---|---|---|
| `UNIQUE(email)` | Students | one account per email; login lookup |
| `UNIQUE(skill_name)`, `UNIQUE(name)` | Skills, Organizations | no duplicate catalog entries |
| `UNIQUE(student_id, opportunity_id)` | Applications | one application per student per opportunity (API returns 409) |
| `UNIQUE(opportunity_id)` | OpportunityEligibility | enforces the 1:0..1 relationship |
| `CHECK(cgpa BETWEEN 0 AND 10)`, `CHECK(year BETWEEN 1 AND 4)` | Students | domain integrity at the DB, not only in Flask |
| `CHECK(stipend IS NULL OR stipend >= 0)` | Opportunities | no negative pay |
| `CHECK(min_cgpa IS NULL OR BETWEEN 0 AND 10)` | OpportunityEligibility | valid threshold |
| `ENUM(...)` | type, mode, proficiency, status | the four fixed contract enums are enforced by MySQL itself |
| `NOT NULL` on branch, year, cgpa, college | Students | eligibility checks always have data to compare |

## 3. Foreign-key actions
- Child rows owned by a parent use **`ON DELETE CASCADE`**: deleting a student removes their skills, projects, applications and reminders; deleting an opportunity removes its skill links, eligibility, applications and reminders; deleting an application removes its history.
- `Opportunities.organization_id` uses **`ON DELETE RESTRICT`**: an organization that still has opportunities cannot be deleted by mistake.
- `Skills` deletes cascade into the three junction tables.

## 4. Normalisation
- **1NF/2NF:** every table has atomic columns; in the junction tables each non-key column (`proficiency`, `is_mandatory`) depends on the *whole* composite key.
- **3NF:** organization details live only in `Organizations`; skill names only in `Skills`; no transitive dependencies (e.g. an opportunity stores `organization_id`, not the organization's name or location).
- **Why `OpportunityEligibility` is separate:** many opportunities (hackathons) have no restrictions. A separate optional 1:1 table avoids three mostly-NULL columns on every opportunity.
- **Why `ApplicationStatusHistory` is separate:** history is 1:N per application and append-only; keeping it out of `Applications` keeps the current status a single indexed column.

## 5. Deliberate trade-off (be ready to defend this)
`allowed_branches` and `allowed_years` are comma-separated strings (e.g. `'CSE,IT'`, `'3,4'`). Strictly this breaks 1NF. They follow the team contract (column names are fixed) and are queried with `FIND_IN_SET(value, column)`. The fully normalised alternative is two child tables (`OpportunityAllowedBranches`, `OpportunityAllowedYears`) with one row per allowed value. The CSV form is a conscious simplification: these lists are tiny, are only read as a whole, and are never joined or aggregated.

## 6. Data conventions other parts rely on
- `branch` is stored upper-case with no spaces or commas, so `FIND_IN_SET(s.branch, allowed_branches)` is exact.
- `NULL` in any eligibility column means "no restriction"; a missing eligibility row also means "open to all" (use a `LEFT JOIN`).
- `deadline`, `remind_at`, `applied_at`, `changed_at` are `DATETIME`; the API formats them as `YYYY-MM-DDTHH:MM:SS`.
- `Applications.applied_at` is the row's creation time, including for `saved` rows.
- `ApplicationStatusHistory.old_status` is `NULL` only on the first row of an application.

## 7. Indexing strategy
See `features.sql`. Indexes target the contract's filter and sort columns: `Opportunities(type)`, `Opportunities(deadline)`, `OpportunitySkills(skill_id)`, `StudentSkills(skill_id)`, `Applications(student_id, status)`, `Reminders(student_id, remind_at)`, `ApplicationStatusHistory(application_id, changed_at)`. Foreign-key columns are indexed automatically by InnoDB.