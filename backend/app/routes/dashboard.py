from flask import Blueprint
from flask_jwt_extended import jwt_required

from ..db import query_all, query_one
from ..utils import ok
from ._common import clean, current_student_id

bp = Blueprint("dashboard", __name__)

# ---------------------------------------------------------------------------
# SQL
# ---------------------------------------------------------------------------

# Concept: CONDITIONAL AGGREGATION. One scan of Applications produces three counts
# (SUM of a boolean = number of true rows). The scalar subquery adds the reminder count.
COUNTS_SQL = """
SELECT CAST(COALESCE(SUM(a.status = 'applied'), 0) AS UNSIGNED)     AS applied,
       CAST(COALESCE(SUM(a.status = 'shortlisted'), 0) AS UNSIGNED) AS shortlisted,
       CAST(COALESCE(SUM(a.status = 'offered'), 0) AS UNSIGNED)     AS offers,
       (SELECT COUNT(*) FROM Reminders r
         WHERE r.student_id = %s AND r.is_sent = 0 AND r.remind_at >= NOW()) AS upcoming_reminders
FROM Applications a
WHERE a.student_id = %s
"""

# Concept: ANTI-JOIN with NOT EXISTS: next 5 open deadlines the student has NOT applied to yet.
DEADLINES_SQL = """
SELECT o.opportunity_id, o.title, o.deadline
FROM Opportunities o
WHERE o.deadline >= NOW()
  AND NOT EXISTS (SELECT 1 FROM Applications a
                  WHERE a.opportunity_id = o.opportunity_id AND a.student_id = %s)
ORDER BY o.deadline ASC
LIMIT 5
"""

# Concept: ANTI-JOIN with LEFT JOIN ... IS NULL + GROUP BY / COUNT / ORDER BY.
# Skills required by still-open opportunities that the student does not have, most demanded first.
GAPS_SQL = """
SELECT sk.skill_name
FROM OpportunitySkills os
JOIN Opportunities o ON o.opportunity_id = os.opportunity_id AND o.deadline >= NOW()
JOIN Skills sk ON sk.skill_id = os.skill_id
LEFT JOIN StudentSkills ss ON ss.skill_id = os.skill_id AND ss.student_id = %s
WHERE ss.skill_id IS NULL
GROUP BY sk.skill_id, sk.skill_name
ORDER BY COUNT(*) DESC, sk.skill_name ASC
LIMIT 5
"""


@bp.get("/dashboard/summary")
@jwt_required()
def summary():
    sid = current_student_id()
    counts = query_one(COUNTS_SQL, (sid, sid))
    deadlines = query_all(DEADLINES_SQL, (sid,))
    gaps = query_all(GAPS_SQL, (sid,))
    return ok(clean({
        "counts": counts,
        "upcoming_deadlines": deadlines,
        "top_skill_gaps": gaps,
    }))
