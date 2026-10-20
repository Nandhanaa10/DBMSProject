from flask import Blueprint
from flask_jwt_extended import create_access_token
from mysql.connector import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from ..db import execute, query_one
from ..utils import EMAIL_RE, ApiError, json_body, ok, validate_profile

bp = Blueprint("auth", __name__)


def _auth_payload(student):
    # JWT 'sub' must be a string in recent PyJWT; utils.current_student_id() converts it back to int.
    token = create_access_token(identity=str(student["student_id"]))
    return {
        "token": token,
        "student": {"student_id": student["student_id"], "name": student["name"], "email": student["email"]},
    }


@bp.post("/auth/register")
def register():
    body = json_body()
    profile = validate_profile(body, require_all=True)
    email = str(body.get("email", "")).strip().lower()
    if not EMAIL_RE.match(email) or len(email) > 150:
        raise ApiError("VALIDATION_ERROR", "A valid email is required")
    password = body.get("password")
    if not isinstance(password, str) or len(password) < 8:
        raise ApiError("VALIDATION_ERROR", "password must be at least 8 characters")

    if query_one("SELECT student_id FROM Students WHERE email = %s", (email,)):
        raise ApiError("CONFLICT", "Email already registered", 409)
    try:
        student_id = execute(
            "INSERT INTO Students (name, email, password_hash, college, branch, year, cgpa) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (profile["name"], email, generate_password_hash(password),
             profile["college"], profile["branch"], profile["year"], profile["cgpa"]),
        )
    except IntegrityError as exc:       # two simultaneous registrations: the UNIQUE index decides
        if exc.errno == 1062:
            raise ApiError("CONFLICT", "Email already registered", 409)
        raise
    return ok(_auth_payload({"student_id": student_id, "name": profile["name"], "email": email}), status=201)


@bp.post("/auth/login")
def login():
    body = json_body()
    email = str(body.get("email", "")).strip().lower()
    password = body.get("password")
    if not email or not isinstance(password, str) or not password:
        raise ApiError("VALIDATION_ERROR", "email and password are required")

    row = query_one("SELECT student_id, name, email, password_hash FROM Students WHERE email = %s", (email,))
    if not row or not check_password_hash(row["password_hash"], password):
        raise ApiError("INVALID_CREDENTIALS", "Invalid email or password", 401)
    return ok(_auth_payload(row))