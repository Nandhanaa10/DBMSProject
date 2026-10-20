from flask import Blueprint
from flask_jwt_extended import jwt_required

from ..db import execute_count, query_one
from ..utils import ApiError, current_student_id, json_body, ok, validate_profile

bp = Blueprint("students", __name__)

PROFILE_SQL = ("SELECT student_id, name, email, college, branch, year, cgpa, created_at "
               "FROM Students WHERE student_id = %s")


def _profile(student_id):
    row = query_one(PROFILE_SQL, (student_id,))
    if not row:
        raise ApiError("NOT_FOUND", "Student not found", 404)
    return row


@bp.get("/students/me")
@jwt_required()
def get_me():
    return ok(_profile(current_student_id()))


@bp.put("/students/me")
@jwt_required()
def update_me():
    sid = current_student_id()
    clean = validate_profile(json_body(), require_all=False)
    if not clean:
        raise ApiError("VALIDATION_ERROR", "Provide at least one of: name, college, branch, year, cgpa")
    # Column names come from validate_profile's fixed whitelist; values are parameterized.
    assignments = ", ".join(f"{col} = %s" for col in clean)
    execute_count(f"UPDATE Students SET {assignments} WHERE student_id = %s", (*clean.values(), sid))
    return ok(_profile(sid))