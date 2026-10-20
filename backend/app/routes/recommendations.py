from flask import Blueprint
from flask_jwt_extended import jwt_required

from ..db import query_all, query_one
from ..utils import current_student_id, get_pagination, list_meta, ok

bp = Blueprint("recommendations", __name__)

# Skills required by opportunities the student SAVED or APPLIED to, that the student lacks,
# ranked by how many of those opportunities need them.
#   JOIN x3            : Applications -> OpportunitySkills -> Skills
#   NOT EXISTS         : anti-join against StudentSkills (the skills the student already has)
#   GROUP BY + COUNT   : needed_by_count per skill
GAP_BASE_SQL = """
SELECT sk.skill_id, sk.skill_name, COUNT(*) AS needed_by_count
FROM Applications a
JOIN OpportunitySkills os ON os.opportunity_id = a.opportunity_id
JOIN Skills sk            ON sk.skill_id = os.skill_id
WHERE a.student_id = %s
  AND a.status IN ('saved', 'applied')
  AND NOT EXISTS (SELECT 1 FROM StudentSkills ss
                  WHERE ss.student_id = a.student_id AND ss.skill_id = os.skill_id)
GROUP BY sk.skill_id, sk.skill_name
"""


def skill_gap_rows(student_id, limit=10, offset=0):
    """Reusable by routes/dashboard.py (top_skill_gaps): returns (rows, total)."""
    rows = query_all(GAP_BASE_SQL + " ORDER BY needed_by_count DESC, sk.skill_name ASC LIMIT %s OFFSET %s",
                     (student_id, limit, offset))
    total = query_one(f"SELECT COUNT(*) AS total FROM ({GAP_BASE_SQL}) AS gaps", (student_id,))["total"]
    return rows, total


@bp.get("/recommendations/skill-gap")
@jwt_required()
def skill_gap():
    page, limit, offset = get_pagination(default_limit=10)
    rows, total = skill_gap_rows(current_student_id(), limit, offset)
    return ok(rows, meta=list_meta(page, limit, total))