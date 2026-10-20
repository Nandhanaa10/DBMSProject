from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from mysql.connector import IntegrityError

from ..db import execute, execute_count, query_all, query_one
from ..utils import (ApiError, current_student_id, get_pagination, json_body, list_meta, ok,
                     validate_int_id, validate_proficiency)

bp = Blueprint("skills", __name__)

MY_SKILL_SQL = ("SELECT sk.skill_id, sk.skill_name, sk.category, ss.proficiency "
                "FROM StudentSkills ss JOIN Skills sk ON sk.skill_id = ss.skill_id "
                "WHERE ss.student_id = %s")


def _like(text):
    return "%" + text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


@bp.get("/skills")
@jwt_required()
def list_skills():
    q = request.args.get("q", "").strip()
    page, limit, offset = get_pagination(default_limit=100)
    where, params = "", []
    if q:
        where, params = "WHERE skill_name LIKE %s", [_like(q)]
    total = query_one(f"SELECT COUNT(*) AS total FROM Skills {where}", params)["total"]
    rows = query_all(
        f"SELECT skill_id, skill_name, category FROM Skills {where} "
        "ORDER BY skill_name LIMIT %s OFFSET %s", params + [limit, offset])
    return ok(rows, meta=list_meta(page, limit, total))


@bp.get("/students/me/skills")
@jwt_required()
def my_skills():
    sid = current_student_id()
    page, limit, offset = get_pagination(default_limit=100)
    total = query_one("SELECT COUNT(*) AS total FROM StudentSkills WHERE student_id = %s", (sid,))["total"]
    rows = query_all(MY_SKILL_SQL + " ORDER BY sk.skill_name LIMIT %s OFFSET %s", (sid, limit, offset))
    return ok(rows, meta=list_meta(page, limit, total))


@bp.post("/students/me/skills")
@jwt_required()
def add_my_skill():
    sid = current_student_id()
    body = json_body()
    skill_id = validate_int_id(body.get("skill_id"), "skill_id")
    proficiency = validate_proficiency(body.get("proficiency"))
    if not query_one("SELECT skill_id FROM Skills WHERE skill_id = %s", (skill_id,)):
        raise ApiError("NOT_FOUND", "Skill not found", 404)
    try:
        execute("INSERT INTO StudentSkills (student_id, skill_id, proficiency) VALUES (%s, %s, %s)",
                (sid, skill_id, proficiency))
    except IntegrityError as exc:
        if exc.errno == 1062:
            raise ApiError("CONFLICT", "You already have this skill", 409)
        raise
    return ok(query_one(MY_SKILL_SQL + " AND ss.skill_id = %s", (sid, skill_id)), status=201)


@bp.put("/students/me/skills/<int:skill_id>")
@jwt_required()
def update_my_skill(skill_id):
    sid = current_student_id()
    proficiency = validate_proficiency(json_body().get("proficiency"))
    matched = execute_count(
        "UPDATE StudentSkills SET proficiency = %s WHERE student_id = %s AND skill_id = %s",
        (proficiency, sid, skill_id))
    if matched == 0:
        raise ApiError("NOT_FOUND", "You do not have this skill", 404)
    return ok(query_one(MY_SKILL_SQL + " AND ss.skill_id = %s", (sid, skill_id)))


@bp.delete("/students/me/skills/<int:skill_id>")
@jwt_required()
def delete_my_skill(skill_id):
    sid = current_student_id()
    if execute_count("DELETE FROM StudentSkills WHERE student_id = %s AND skill_id = %s", (sid, skill_id)) == 0:
        raise ApiError("NOT_FOUND", "You do not have this skill", 404)
    return ok({"skill_id": skill_id, "deleted": True})