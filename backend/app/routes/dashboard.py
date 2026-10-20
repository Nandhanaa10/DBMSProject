from flask import Blueprint
from flask_jwt_extended import jwt_required

from ..db import query_all, query_one
from ..utils import current_student_id, ok

bp = Blueprint("dashboard", __name__)
dashboard_bp = bp


@bp.get("/dashboard/summary")
@jwt_required()
def get_dashboard_summary():
    student_id = current_student_id()

    # Independent subqueries avoid incorrect counts from multi-table joins.
    counts = query_one(
        """
        SELECT
            (
                SELECT COUNT(*)
                FROM Applications
                WHERE student_id = %s
                  AND status = 'applied'
            ) AS applied,
            (
                SELECT COUNT(*)
                FROM Applications
                WHERE student_id = %s
                  AND status = 'shortlisted'
            ) AS shortlisted,
            (
                SELECT COUNT(*)
                FROM Applications
                WHERE student_id = %s
                  AND status = 'offered'
            ) AS offers,
            (
                SELECT COUNT(*)
                FROM Reminders
                WHERE student_id = %s
                  AND is_sent = 0
                  AND remind_at >= CURRENT_TIMESTAMP
            ) AS upcoming_reminders
        """,
        (student_id, student_id, student_id, student_id)
    )

    upcoming_deadlines = query_all(
        """
        SELECT
            opportunity_id,
            title,
            deadline
        FROM Opportunities
        WHERE deadline >= CURRENT_TIMESTAMP
        ORDER BY deadline ASC, opportunity_id ASC
        LIMIT 5
        """
    )

    # Count upcoming opportunities that require mandatory skills
    # missing from this student's StudentSkills records.
    top_skill_gaps = query_all(
        """
        SELECT
            s.skill_name,
            COUNT(DISTINCT os.opportunity_id) AS needed_by_count
        FROM OpportunitySkills os
        JOIN Opportunities o
            ON o.opportunity_id = os.opportunity_id
        JOIN Skills s
            ON s.skill_id = os.skill_id
        LEFT JOIN StudentSkills ss
            ON ss.student_id = %s
           AND ss.skill_id = os.skill_id
        WHERE os.is_mandatory = 1
          AND ss.skill_id IS NULL
          AND o.deadline >= CURRENT_TIMESTAMP
        GROUP BY s.skill_id, s.skill_name
        ORDER BY needed_by_count DESC, s.skill_name ASC
        LIMIT 5
        """,
        (student_id,)
    )

    data = {
        "counts": {
            "applied": int(counts["applied"]),
            "shortlisted": int(counts["shortlisted"]),
            "offers": int(counts["offers"]),
            "upcoming_reminders": int(counts["upcoming_reminders"]),
        },
        "upcoming_deadlines": upcoming_deadlines,
        "top_skill_gaps": [
            {"skill_name": row["skill_name"]}
            for row in top_skill_gaps
        ],
    }

    return ok(data)
