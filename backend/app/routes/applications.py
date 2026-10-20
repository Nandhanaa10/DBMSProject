from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from mysql.connector.errors import IntegrityError

from ..db import execute, query_all, query_one, transaction
from ..utils import fail, ok
from ._common import (APPLICATION_STATUSES, BRANCH_OK, CGPA_OK, YEAR_OK, clean,
                      current_student_id, parse_page)

bp = Blueprint("applications", __name__)

# ---------------------------------------------------------------------------
# SQL
# ---------------------------------------------------------------------------

# Concept: eligibility evaluated INSIDE the database (cgpa / branch / year as three boolean
# columns) so we can tell the student exactly which rule failed.
ELIGIBILITY_CHECK_SQL = f"""
SELECT o.opportunity_id,
       {CGPA_OK} AS cgpa_ok,
       {BRANCH_OK} AS branch_ok,
       {YEAR_OK} AS year_ok
FROM Opportunities o
JOIN Students s ON s.student_id = %s
LEFT JOIN OpportunityEligibility e ON e.opportunity_id = o.opportunity_id
WHERE o.opportunity_id = %s
"""

# Concept: UNIQUE(student_id, opportunity_id) is the real duplicate guard. We INSERT and catch
# MySQL error 1062 instead of SELECT-then-INSERT, which would be a race condition.
INSERT_APPLICATION_SQL = """
INSERT INTO Applications (student_id, opportunity_id, status, applied_at)
VALUES (%s, %s, 'applied', NOW())
"""

# Concept: 3-table JOIN, filtered by owner (student_id) so students only see their own rows.
APP_SELECT = """
SELECT a.application_id, a.status, a.applied_at,
       o.opportunity_id, o.title, o.type, o.deadline,
       org.organization_id AS org_id, org.name AS org_name
FROM Applications a
JOIN Opportunities o ON o.opportunity_id = a.opportunity_id
JOIN Organizations org ON org.organization_id = o.organization_id
WHERE a.student_id = %s
"""
APP_ORDER = " ORDER BY a.applied_at DESC, a.application_id DESC"

# Concept: TRANSACTION (ACID) + pessimistic row lock. FOR UPDATE locks the application row so two
# concurrent PATCH requests cannot both read the same old_status and write inconsistent history.
LOCK_APP_SQL = ("SELECT status FROM Applications "
                "WHERE application_id = %s AND student_id = %s FOR UPDATE")
UPDATE_STATUS_SQL = "UPDATE Applications SET status = %s WHERE application_id = %s"
INSERT_HISTORY_SQL = """
INSERT INTO ApplicationStatusHistory (application_id, old_status, new_status, note, changed_at)
VALUES (%s, %s, %s, %s, NOW())
"""

OWNS_APP_SQL = "SELECT application_id FROM Applications WHERE application_id = %s AND student_id = %s"
HISTORY_SQL = """
SELECT old_status, new_status, changed_at, note
FROM ApplicationStatusHistory
WHERE application_id = %s
ORDER BY changed_at ASC, history_id ASC
"""


def _item(r):
    return {
        "application_id": r["application_id"],
        "status": r["status"],
        "applied_at": r["applied_at"],
        "opportunity": {
            "opportunity_id": r["opportunity_id"], "title": r["title"],
            "type": r["type"], "deadline": r["deadline"],
            "organization": {"organization_id": r["org_id"], "name": r["org_name"]},
        },
    }


@bp.post("/applications")
@jwt_required()
def create_application():
    sid = current_student_id()
    body = request.get_json(silent=True) or {}
    opp_id = body.get("opportunity_id")
    if not isinstance(opp_id, int) or isinstance(opp_id, bool):
        return fail("VALIDATION_ERROR", "opportunity_id must be an integer", 400)

    chk = query_one(ELIGIBILITY_CHECK_SQL, (sid, opp_id))
    if chk is None:
        return fail("NOT_FOUND", "Opportunity not found", 404)
    failed = [label for passed, label in ((chk["cgpa_ok"], "minimum CGPA"),
                                          (chk["branch_ok"], "branch"),
                                          (chk["year_ok"], "year")) if not passed]
    if failed:
        return fail("NOT_ELIGIBLE", "Eligibility not met: " + ", ".join(failed), 403)

    try:
        app_id = execute(INSERT_APPLICATION_SQL, (sid, opp_id))
    except IntegrityError as e:
        if e.errno == 1062:  # duplicate entry on UNIQUE(student_id, opportunity_id)
            return fail("DUPLICATE_APPLICATION", "You have already applied to this opportunity", 409)
        raise
    row = query_one(APP_SELECT + " AND a.application_id = %s", (sid, app_id))
    return ok(clean(_item(row)), status=201)


@bp.get("/applications")
@jwt_required()
def list_applications():
    sid = current_student_id()
    status = request.args.get("status")
    try:
        page, limit, offset = parse_page()
    except ValueError as e:
        return fail("VALIDATION_ERROR", str(e), 400)
    if status and status not in APPLICATION_STATUSES:
        return fail("VALIDATION_ERROR", "status must be one of: " + ", ".join(APPLICATION_STATUSES), 400)

    cond, params = (" AND a.status = %s", [sid, status]) if status else ("", [sid])
    total = query_one("SELECT COUNT(*) AS total FROM Applications a WHERE a.student_id = %s" + cond,
                      params)["total"]
    rows = query_all(APP_SELECT + cond + APP_ORDER + " LIMIT %s OFFSET %s", params + [limit, offset])
    return ok(clean([_item(r) for r in rows]), meta={"page": page, "limit": limit, "total": total})


@bp.patch("/applications/<int:application_id>/status")
@jwt_required()
def change_status(application_id):
    sid = current_student_id()
    body = request.get_json(silent=True) or {}
    new_status = body.get("status")
    note = body.get("note")
    if new_status not in APPLICATION_STATUSES:
        return fail("VALIDATION_ERROR", "status must be one of: " + ", ".join(APPLICATION_STATUSES), 400)
    if note is not None and not isinstance(note, str):
        return fail("VALIDATION_ERROR", "note must be a string", 400)
    note = (note or "").strip() or None

    # One transaction: lock row -> update status -> insert history. Any exception inside the
    # `with` block makes transaction() roll back both statements (assumed, see notes).
    with transaction() as cur:
        cur.execute(LOCK_APP_SQL, (application_id, sid))
        rows = cur.fetchall()
        if not rows:
            return fail("NOT_FOUND", "Application not found", 404)
        old_status = rows[0]["status"]
        if old_status == new_status:
            return fail("VALIDATION_ERROR", f"Application is already '{new_status}'", 400)
        cur.execute(UPDATE_STATUS_SQL, (new_status, application_id))
        cur.execute(INSERT_HISTORY_SQL, (application_id, old_status, new_status, note))

    row = query_one(APP_SELECT + " AND a.application_id = %s", (sid, application_id))
    return ok(clean(_item(row)))


@bp.get("/applications/<int:application_id>/history")
@jwt_required()
def get_history(application_id):
    sid = current_student_id()
    if query_one(OWNS_APP_SQL, (application_id, sid)) is None:
        return fail("NOT_FOUND", "Application not found", 404)
    rows = query_all(HISTORY_SQL, (application_id,))
    return ok(clean(rows), meta={"page": 1, "limit": max(len(rows), 1), "total": len(rows)})
