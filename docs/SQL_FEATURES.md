# SQL Features — where they are and how to explain them

| # | Feature | Location | Concept demonstrated |
|---|---|---|---|
| 1 | Primary / composite keys | `schema.sql` | entity identity; junction-table uniqueness |
| 2 | Foreign keys with CASCADE / RESTRICT | `schema.sql` | referential integrity, delete behaviour |
| 3 | UNIQUE constraints | `schema.sql` | email, skill name, one application per student+opportunity |
| 4 | CHECK constraints | `schema.sql` | domain integrity (CGPA, year, stipend, flags) — enforced from MySQL 8.0.16 |
| 5 | ENUM columns | `schema.sql` | fixed contract enums enforced by the database |
| 6 | Indexes on filter columns | `features.sql` §1 | B-tree indexes, composite index, leftmost-prefix rule |
| 7 | View `v_dashboard_counts` | `features.sql` §2 | view, correlated scalar subqueries |
| 8 | Trigger `trg_applications_after_insert` | `features.sql` §3 | AFTER INSERT trigger, automatic audit row |
| 9 | Procedure `sp_skill_gap` | `features.sql` §4 | stored procedure with parameters, anti-join, GROUP BY |
| 10 | GROUP BY + HAVING | `features.sql` §5a | aggregation; HAVING filters groups, WHERE filters rows |
| 11 | 4-table JOIN | `features.sql` §5b | INNER JOIN across Applications, Students, Opportunities, Organizations |
| 12 | Scalar subquery | `features.sql` §5c | `cgpa > (SELECT AVG(cgpa) ...)` |
| 13 | Correlated subquery | `features.sql` §5d | inner query re-evaluated per outer row (average per type) |
| 14 | LEFT JOIN … IS NULL | `features.sql` §5e | outer join used as an anti-join |
| 15 | Transactions | `app/db.py`, `routes/projects.py` | project + skill links written atomically (COMMIT / ROLLBACK) |
| 16 | Parameterized queries | every route | `%s` placeholders; values never concatenated into SQL |

## The skill-gap query (the core of my part)
```sql
SELECT sk.skill_id, sk.skill_name, COUNT(*) AS needed_by_count
FROM Applications a
JOIN OpportunitySkills os ON os.opportunity_id = a.opportunity_id
JOIN Skills sk            ON sk.skill_id = os.skill_id
WHERE a.student_id = ? AND a.status IN ('saved','applied')
  AND NOT EXISTS (SELECT 1 FROM StudentSkills ss
                  WHERE ss.student_id = a.student_id AND ss.skill_id = os.skill_id)
GROUP BY sk.skill_id, sk.skill_name
ORDER BY needed_by_count DESC, sk.skill_name;
```
Reading order: take the student's saved/applied applications → expand each into its required skills → drop skills the student already has (`NOT EXISTS`) → group by skill and count how many opportunities need it → rank.
- **Why `NOT EXISTS` and not `NOT IN`:** `NOT IN` returns no rows if the subquery can produce a NULL; `NOT EXISTS` is NULL-safe and can use the `StudentSkills` primary key.
- **Why `COUNT(*)` is a correct count of opportunities:** `Applications` is unique per (student, opportunity) and `OpportunitySkills` is unique per (opportunity, skill), so each (opportunity, skill) pair appears once per student.

## Trigger vs. application code
The trigger writes the first history row (`old_status = NULL`, `new_status = <initial status>`, note "Application created") so the audit log starts correctly however the row is inserted. Later status changes are written by `PATCH /applications/{id}/status` (Person B) inside one transaction with the status update, because that route also carries the user's `note`, which a trigger cannot see. Viva line: *"The trigger guarantees the beginning of the history; the transaction guarantees every change after it."*

## Indexes — what to say
- `Opportunities(type)` and `Opportunities(deadline)` serve the `type` and `deadline_before` filters and `sort=deadline`.
- `OpportunitySkills(skill_id)`: the composite primary key starts with `opportunity_id`, so searching by `skill_id` needs its own index (leftmost-prefix rule).
- `Applications(student_id, status)` serves "my applications filtered by status" and the dashboard counts.
- To demonstrate the effect, run `EXPLAIN SELECT ... WHERE type = 'job'` and compare `type`, `key` and `rows` with and without the index. Do this on your machine and quote your own numbers; the seed is small, so the optimizer may still choose a scan.

## Likely viva questions
1. *Why a junction table for skills?* Students↔Skills is M:N; a junction table with a composite PK stores each pair once and carries `proficiency`.
2. *What happens if I delete a student?* Skills, projects, applications (and their history) and reminders cascade away; organizations and opportunities are untouched.
3. *Why CHECK and Flask validation both?* Flask gives friendly errors; CHECK protects the data from any other client or script.
4. *Why a view for the dashboard?* It names the counting logic once, so any route can read it without repeating four subqueries.
5. *How do you stop two simultaneous registrations with the same email?* The `UNIQUE(email)` index decides; the route catches MySQL error 1062 and returns 409.