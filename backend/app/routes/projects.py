from flask import Blueprint
from flask_jwt_extended import jwt_required

from ..db import query_all, query_one, transaction
from ..utils import ApiError, current_student_id, get_pagination, json_body, list_meta, ok, validate_int_id

bp = Blueprint("projects", __name__)

PROJECT_COLS = "project_id, student_id, title, description, repo_link"


def _skills_by_project(project_ids):
    if not project_ids:
        return {}
    placeholders = ",".join(["%s"] * len(project_ids))
    rows = query_all(
        "SELECT ps.project_id, sk.skill_id, sk.skill_name FROM ProjectSkills ps "
        "JOIN Skills sk ON sk.skill_id = ps.skill_id "
        f"WHERE ps.project_id IN ({placeholders}) ORDER BY sk.skill_name", project_ids)
    grouped = {pid: [] for pid in project_ids}
    for r in rows:
        grouped[r["project_id"]].append({"skill_id": r["skill_id"], "skill_name": r["skill_name"]})
    return grouped


def _shape(rows):
    skills = _skills_by_project([r["project_id"] for r in rows])
    return [{"project_id": r["project_id"], "title": r["title"], "description": r["description"],
             "repo_link": r["repo_link"], "skills": skills[r["project_id"]]} for r in rows]


def _owned(project_id, sid):
    row = query_one(f"SELECT {PROJECT_COLS} FROM Projects WHERE project_id = %s", (project_id,))
    if not row:
        raise ApiError("NOT_FOUND", "Project not found", 404)
    if row["student_id"] != sid:
        raise ApiError("FORBIDDEN", "You do not own this project", 403)
    return row


def _validate(body):
    title = str(body.get("title", "")).strip()
    if not 1 <= len(title) <= 150:
        raise ApiError("VALIDATION_ERROR", "title is required (max 150 characters)")
    description = body.get("description")
    description = str(description).strip() or None if description is not None else None
    repo_link = body.get("repo_link")
    repo_link = str(repo_link).strip() or None if repo_link is not None else None
    if repo_link and (len(repo_link) > 255 or not repo_link.lower().startswith(("http://", "https://"))):
        raise ApiError("VALIDATION_ERROR", "repo_link must be an http(s) URL")

    skill_ids = body.get("skill_ids")
    if skill_ids is not None:
        if not isinstance(skill_ids, list) or len(skill_ids) > 20:
            raise ApiError("VALIDATION_ERROR", "skill_ids must be a list of at most 20 ids")
        skill_ids = sorted({validate_int_id(s, "skill_ids") for s in skill_ids})
        if skill_ids:
            ph = ",".join(["%s"] * len(skill_ids))
            found = query_one(f"SELECT COUNT(*) AS n FROM Skills WHERE skill_id IN ({ph})", skill_ids)["n"]
            if found != len(skill_ids):
                raise ApiError("VALIDATION_ERROR", "skill_ids contains an unknown skill")
    return title, description, repo_link, skill_ids


@bp.get("/projects")
@jwt_required()
def list_projects():
    sid = current_student_id()
    page, limit, offset = get_pagination(default_limit=50)
    total = query_one("SELECT COUNT(*) AS total FROM Projects WHERE student_id = %s", (sid,))["total"]
    rows = query_all(f"SELECT {PROJECT_COLS} FROM Projects WHERE student_id = %s "
                     "ORDER BY project_id DESC LIMIT %s OFFSET %s", (sid, limit, offset))
    return ok(_shape(rows), meta=list_meta(page, limit, total))


@bp.post("/projects")
@jwt_required()
def create_project():
    sid = current_student_id()
    title, description, repo_link, skill_ids = _validate(json_body())
    with transaction() as tx:           # project row + its skill links succeed or fail together
        pid = tx.execute("INSERT INTO Projects (student_id, title, description, repo_link) VALUES (%s, %s, %s, %s)",
                         (sid, title, description, repo_link))
        for skill_id in skill_ids or []:
            tx.execute("INSERT INTO ProjectSkills (project_id, skill_id) VALUES (%s, %s)", (pid, skill_id))
    return ok(_shape([_owned(pid, sid)])[0], status=201)


@bp.put("/projects/<int:project_id>")
@jwt_required()
def update_project(project_id):
    sid = current_student_id()
    _owned(project_id, sid)
    title, description, repo_link, skill_ids = _validate(json_body())
    with transaction() as tx:
        tx.execute("UPDATE Projects SET title = %s, description = %s, repo_link = %s WHERE project_id = %s",
                   (title, description, repo_link, project_id))
        if skill_ids is not None:       # omitted => skills unchanged; [] => clear them
            tx.execute("DELETE FROM ProjectSkills WHERE project_id = %s", (project_id,))
            for skill_id in skill_ids:
                tx.execute("INSERT INTO ProjectSkills (project_id, skill_id) VALUES (%s, %s)", (project_id, skill_id))
    return ok(_shape([_owned(project_id, sid)])[0])


@bp.delete("/projects/<int:project_id>")
@jwt_required()
def delete_project(project_id):
    _owned(project_id, current_student_id())
    with transaction() as tx:
        tx.execute("DELETE FROM Projects WHERE project_id = %s", (project_id,))   # ProjectSkills cascade
    return ok({"project_id": project_id, "deleted": True})