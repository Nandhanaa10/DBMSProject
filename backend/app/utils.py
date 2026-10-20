"""Shared response helpers (contract) + a few small extras used by every route file."""
import re
from datetime import date, datetime
from decimal import Decimal

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity


# ---------- contract helpers ----------
def _clean(value):
    """Make DB values JSON-ready: datetime -> '2026-11-05T18:30:00', Decimal -> float."""
    if isinstance(value, datetime):
        return value.replace(microsecond=0).isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {k: _clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_clean(v) for v in value]
    return value


def ok(data, meta=None, status=200):
    body = {"data": _clean(data)}
    if meta is not None:
        body["meta"] = meta
    return jsonify(body), status


def fail(code, message, status):
    return jsonify({"error": {"code": code, "message": message}}), status


# ---------- extras ----------
class ApiError(Exception):
    """raise ApiError('NOT_FOUND', 'Project not found', 404); create_app turns it into fail()."""

    def __init__(self, code, message, status=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def current_student_id():
    """JWT identity is student_id (stored as a string in the token's 'sub'); returns int."""
    return int(get_jwt_identity())


def json_body():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise ApiError("VALIDATION_ERROR", "Request body must be a JSON object")
    return body


def get_pagination(default_limit=20, max_limit=100):
    """Reads ?page=&limit= ; returns (page, limit, offset)."""
    try:
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", default_limit))
    except ValueError:
        raise ApiError("VALIDATION_ERROR", "page and limit must be integers")
    if page < 1 or limit < 1 or limit > max_limit:
        raise ApiError("VALIDATION_ERROR", f"page must be >= 1 and limit between 1 and {max_limit}")
    return page, limit, (page - 1) * limit


def list_meta(page, limit, total):
    return {"page": page, "limit": limit, "total": total}


# ---------- validation shared by auth + students ----------
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
BRANCH_RE = re.compile(r"^[A-Z0-9&-]{2,20}$")
PROFICIENCIES = ("beginner", "intermediate", "advanced")


def _int(value, field):
    if isinstance(value, bool):
        raise ApiError("VALIDATION_ERROR", f"{field} must be an integer")
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ApiError("VALIDATION_ERROR", f"{field} must be an integer")


def validate_profile(body, require_all):
    """Validate name, college, branch, year, cgpa. Returns only the keys that were supplied.
    require_all=True (register) makes every field mandatory; False (PUT /students/me) allows a subset."""
    clean = {}

    def present(key):
        if key in body:
            return True
        if require_all:
            raise ApiError("VALIDATION_ERROR", f"{key} is required")
        return False

    if present("name"):
        v = str(body["name"]).strip()
        if not 2 <= len(v) <= 100:
            raise ApiError("VALIDATION_ERROR", "name must be 2-100 characters")
        clean["name"] = v
    if present("college"):
        v = str(body["college"]).strip()
        if not 2 <= len(v) <= 150:
            raise ApiError("VALIDATION_ERROR", "college must be 2-150 characters")
        clean["college"] = v
    if present("branch"):
        v = str(body["branch"]).strip().upper()
        if not BRANCH_RE.match(v):
            raise ApiError("VALIDATION_ERROR", "branch must be a short code like CSE, IT or ECE")
        clean["branch"] = v
    if present("year"):
        v = _int(body["year"], "year")
        if not 1 <= v <= 4:
            raise ApiError("VALIDATION_ERROR", "year must be between 1 and 4")
        clean["year"] = v
    if present("cgpa"):
        try:
            v = round(float(body["cgpa"]), 2)
        except (TypeError, ValueError):
            raise ApiError("VALIDATION_ERROR", "cgpa must be a number")
        if not 0 <= v <= 10:
            raise ApiError("VALIDATION_ERROR", "cgpa must be between 0 and 10")
        clean["cgpa"] = v
    return clean


def validate_proficiency(value):
    if value not in PROFICIENCIES:
        raise ApiError("VALIDATION_ERROR", "proficiency must be one of: " + ", ".join(PROFICIENCIES))
    return value


def validate_int_id(value, field):
    return _int(value, field)