from datetime import datetime

from flask import Blueprint
from flask_jwt_extended import jwt_required
from mysql.connector.errors import IntegrityError

from ..db import query_all, query_one, execute, execute_count
from ..utils import (
    ApiError,
    current_student_id,
    fail,
    get_pagination,
    json_body,
    list_meta,
    ok,
    validate_int_id,
)

bp = Blueprint("reminders", __name__)
reminders_bp = bp


def _positive_int(value, field):
    number = validate_int_id(value, field)
    if number < 1:
        raise ApiError("VALIDATION_ERROR", f"{field} must be positive")
    return number


def _parse_remind_at(value):
    if not isinstance(value, str) or "T" not in value:
        raise ApiError(
            "VALIDATION_ERROR",
            "remind_at must be an ISO datetime, such as 2026-11-05T18:30:00"
        )

    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        raise ApiError(
            "VALIDATION_ERROR",
            "remind_at must be a valid ISO datetime"
        )

    if parsed.tzinfo is not None:
        raise ApiError(
            "VALIDATION_ERROR",
            "remind_at must not contain a timezone offset"
        )

    return parsed.replace(microsecond=0)


def _validate_reminder_body(body):
    required = ("opportunity_id", "remind_at", "message")

    for field in required:
        if field not in body:
            raise ApiError(
                "VALIDATION_ERROR",
                f"{field} is required"
            )

    opportunity_id = _positive_int(
        body["opportunity_id"],
        "opportunity_id"
    )
    remind_at = _parse_remind_at(body["remind_at"])

    message = body["message"]
    if not isinstance(message, str):
        raise ApiError("VALIDATION_ERROR", "message must be a string")

    message = message.strip()
    if not message:
        raise ApiError("VALIDATION_ERROR", "message cannot be empty")
    if len(message) > 255:
        raise ApiError(
            "VALIDATION_ERROR",
            "message must not exceed 255 characters"
        )

    return opportunity_id, remind_at, message


def _fetch_reminder(reminder_id, student_id):
    return query_one(
        """
        SELECT
            r.reminder_id,
            r.opportunity_id,
            r.remind_at,
            r.message,
            r.is_sent,
            o.title AS opportunity_title,
            o.deadline AS opportunity_deadline
        FROM Reminders r
        JOIN Opportunities o
            ON o.opportunity_id = r.opportunity_id
        WHERE r.reminder_id = %s
          AND r.student_id = %s
        """,
        (reminder_id, student_id)
    )


def _reminder_response(row):
    return {
        "reminder_id": row["reminder_id"],
        "opportunity_id": row["opportunity_id"],
        "remind_at": row["remind_at"],
        "message": row["message"],
        "is_sent": bool(row["is_sent"]),
        "opportunity": {
            "opportunity_id": row["opportunity_id"],
            "title": row["opportunity_title"],
            "deadline": row["opportunity_deadline"],
        },
    }


@bp.get("/reminders")
@jwt_required()
def list_reminders():
    student_id = current_student_id()
    page, limit, offset = get_pagination()

    total_row = query_one(
        """
        SELECT COUNT(*) AS total
        FROM Reminders
        WHERE student_id = %s
        """,
        (student_id,)
    )
    total = int(total_row["total"])

    rows = query_all(
        """
        SELECT
            r.reminder_id,
            r.opportunity_id,
            r.remind_at,
            r.message,
            r.is_sent,
            o.title AS opportunity_title,
            o.deadline AS opportunity_deadline
        FROM Reminders r
        JOIN Opportunities o
            ON o.opportunity_id = r.opportunity_id
        WHERE r.student_id = %s
        ORDER BY r.remind_at ASC, r.reminder_id ASC
        LIMIT %s OFFSET %s
        """,
        (student_id, limit, offset)
    )

    data = [_reminder_response(row) for row in rows]

    return ok(
        data,
        meta=list_meta(page, limit, total)
    )


@bp.post("/reminders")
@jwt_required()
def create_reminder():
    student_id = current_student_id()
    body = json_body()

    opportunity_id, remind_at, message = _validate_reminder_body(body)

    opportunity = query_one(
        """
        SELECT opportunity_id
        FROM Opportunities
        WHERE opportunity_id = %s
        """,
        (opportunity_id,)
    )

    if opportunity is None:
        return fail("NOT_FOUND", "Opportunity not found", 404)

    try:
        reminder_id = execute(
            """
            INSERT INTO Reminders (
                student_id,
                opportunity_id,
                remind_at,
                message
            )
            VALUES (%s, %s, %s, %s)
            """,
            (student_id, opportunity_id, remind_at, message)
        )
    except IntegrityError as exc:
        if getattr(exc, "errno", None) == 1452:
            return fail("NOT_FOUND", "Opportunity not found", 404)
        return fail(
            "REMINDER_CONFLICT",
            "The reminder could not be created because of a database constraint",
            409
        )

    row = _fetch_reminder(reminder_id, student_id)

    return ok(_reminder_response(row), status=201)


@bp.put("/reminders/<int:reminder_id>")
@jwt_required()
def update_reminder(reminder_id):
    student_id = current_student_id()
    body = json_body()

    opportunity_id, remind_at, message = _validate_reminder_body(body)

    existing = query_one(
        """
        SELECT reminder_id
        FROM Reminders
        WHERE reminder_id = %s
          AND student_id = %s
        """,
        (reminder_id, student_id)
    )

    if existing is None:
        return fail("NOT_FOUND", "Reminder not found", 404)

    opportunity = query_one(
        """
        SELECT opportunity_id
        FROM Opportunities
        WHERE opportunity_id = %s
        """,
        (opportunity_id,)
    )

    if opportunity is None:
        return fail("NOT_FOUND", "Opportunity not found", 404)

    try:
        updated = execute_count(
            """
            UPDATE Reminders
            SET opportunity_id = %s,
                remind_at = %s,
                message = %s
            WHERE reminder_id = %s
              AND student_id = %s
            """,
            (
                opportunity_id,
                remind_at,
                message,
                reminder_id,
                student_id,
            )
        )
    except IntegrityError:
        return fail(
            "REMINDER_CONFLICT",
            "The reminder could not be updated because of a database constraint",
            409
        )

    if updated == 0:
        return fail("NOT_FOUND", "Reminder not found", 404)

    row = _fetch_reminder(reminder_id, student_id)

    return ok(_reminder_response(row))


@bp.delete("/reminders/<int:reminder_id>")
@jwt_required()
def delete_reminder(reminder_id):
    student_id = current_student_id()

    deleted = execute_count(
        """
        DELETE FROM Reminders
        WHERE reminder_id = %s
          AND student_id = %s
        """,
        (reminder_id, student_id)
    )

    if deleted == 0:
        return fail("NOT_FOUND", "Reminder not found", 404)

    return ok({
        "message": "Reminder deleted successfully",
        "reminder_id": reminder_id,
    })
