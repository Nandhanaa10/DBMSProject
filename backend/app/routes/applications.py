from mysql.connector.errors import IntegrityError
from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from ..db import query_all, query_one, transaction
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

bp = Blueprint("applications", __name__)
applications_bp = bp

APPLICATION_STATUSES = (
    "saved",
    "applied",
    "shortlisted",
    "interview",
    "offered",
    "rejected",
    "withdrawn",
)


def _positive_int(value, field):
    number = validate_int_id(value, field)
    if number < 1:
        raise ApiError("VALIDATION_ERROR", f"{field} must be positive")
    return number


def _validate_status(value):
    if not isinstance(value, str) or value not in APPLICATION_STATUSES:
        raise ApiError(
            "VALIDATION_ERROR",
            "status must be one of: " + ", ".join(APPLICATION_STATUSES)
        )
    return value


def _validate_note(value):
    if value is None:
        return None

    if not isinstance(value, str):
        raise ApiError("VALIDATION_ERROR", "note must be a string or null")

    value = value.strip()

    if len(value) > 255:
        raise ApiError("VALIDATION_ERROR", "note must not exceed 255 characters")

    return value or None


@bp.post("/applications")
@jwt_required()
def create_application():
    student_id = current_student_id()
    body = json_body()

    opportunity_id = _positive_int(
        body.get("opportunity_id"),
        "opportunity_id"
    )

    # SQL performs the eligibility check against the student's real profile.
    eligibility = query_one(
        """
        SELECT
            CASE
                WHEN oe.eligibility_id IS NULL
                    OR (
                        (oe.min_cgpa IS NULL OR s.cgpa >= oe.min_cgpa)
                        AND (
                            oe.allowed_branches IS NULL
                            OR FIND_IN_SET(
                                s.branch,
                                oe.allowed_branches
                            ) > 0
                        )
                        AND (
                            oe.allowed_years IS NULL
                            OR FIND_IN_SET(
                                CAST(s.year AS CHAR),
                                oe.allowed_years
                            ) > 0
                        )
                    )
                THEN 1
                ELSE 0
            END AS is_eligible
        FROM Opportunities o
        JOIN Students s
            ON s.student_id = %s
        LEFT JOIN OpportunityEligibility oe
            ON oe.opportunity_id = o.opportunity_id
        WHERE o.opportunity_id = %s
        """,
        (student_id, opportunity_id)
    )

    if eligibility is None:
        return fail("NOT_FOUND", "Opportunity not found", 404)

    if not int(eligibility["is_eligible"]):
        return fail(
            "INELIGIBLE",
            "You do not meet this opportunity's eligibility requirements",
            403
        )

    try:
        with transaction() as tx:
            # The database UNIQUE constraint remains the final
            # protection against duplicate applications.
            existing = tx.query_one(
                """
                SELECT application_id
                FROM Applications
                WHERE student_id = %s
                  AND opportunity_id = %s
                FOR UPDATE
                """,
                (student_id, opportunity_id)
            )

            if existing is not None:
                return fail(
                    "DUPLICATE_APPLICATION",
                    "You have already applied to this opportunity",
                    409
                )

            application_id = tx.execute(
                """
                INSERT INTO Applications (
                    student_id,
                    opportunity_id,
                    status
                )
                VALUES (%s, %s, %s)
                """,
                (student_id, opportunity_id, "applied")
            )

    except IntegrityError as exc:
        # Handles a duplicate created by a concurrent request too.
        if getattr(exc, "errno", None) == 1062:
            return fail(
                "DUPLICATE_APPLICATION",
                "You have already applied to this opportunity",
                409
            )

        if getattr(exc, "errno", None) == 1452:
            return fail("NOT_FOUND", "Opportunity not found", 404)

        return fail(
            "APPLICATION_CONFLICT",
            "The application could not be created because of a database constraint",
            409
        )

    return ok(
        {
            "application_id": application_id,
            "student_id": student_id,
            "opportunity_id": opportunity_id,
            "status": "applied",
        },
        status=201
    )


@bp.get("/applications")
@jwt_required()
def list_applications():
    student_id = current_student_id()
    page, limit, offset = get_pagination()

    conditions = ["a.student_id = %s"]
    params = [student_id]

    status = request.args.get("status", "").strip()

    if status:
        status = _validate_status(status)
        conditions.append("a.status = %s")
        params.append(status)

    where_sql = "WHERE " + " AND ".join(conditions)

    total_row = query_one(
        f"""
        SELECT COUNT(*) AS total
        FROM Applications a
        {where_sql}
        """,
        tuple(params)
    )
    total = int(total_row["total"])

    rows = query_all(
        f"""
        SELECT
            a.application_id,
            a.opportunity_id,
            a.status,
            a.applied_at,
            o.title AS opportunity_title,
            o.type AS opportunity_type,
            o.location AS opportunity_location,
            o.deadline AS opportunity_deadline,
            o.apply_link,
            org.organization_id,
            org.name AS organization_name
        FROM Applications a
        JOIN Opportunities o
            ON o.opportunity_id = a.opportunity_id
        JOIN Organizations org
            ON org.organization_id = o.organization_id
        {where_sql}
        ORDER BY a.applied_at DESC, a.application_id DESC
        LIMIT %s OFFSET %s
        """,
        tuple(params + [limit, offset])
    )

    data = []

    for row in rows:
        data.append({
            "application_id": row["application_id"],
            "status": row["status"],
            "applied_at": row["applied_at"],
            "opportunity": {
                "opportunity_id": row["opportunity_id"],
                "title": row["opportunity_title"],
                "type": row["opportunity_type"],
                "location": row["opportunity_location"],
                "deadline": row["opportunity_deadline"],
                "apply_link": row["apply_link"],
                "organization": {
                    "organization_id": row["organization_id"],
                    "name": row["organization_name"],
                },
            },
        })

    return ok(
        data,
        meta=list_meta(page, limit, total)
    )


@bp.patch("/applications/<int:application_id>/status")
@jwt_required()
def update_application_status(application_id):
    student_id = current_student_id()
    body = json_body()

    new_status = _validate_status(body.get("status"))
    note = _validate_note(body.get("note"))

    with transaction() as tx:
        # Lock this student's application while its status is changing.
        application = tx.query_one(
            """
            SELECT application_id, status
            FROM Applications
            WHERE application_id = %s
              AND student_id = %s
            FOR UPDATE
            """,
            (application_id, student_id)
        )

        if application is None:
            return fail("NOT_FOUND", "Application not found", 404)

        old_status = application["status"]

        if old_status != new_status:
            updated = tx.execute_count(
                """
                UPDATE Applications
                SET status = %s
                WHERE application_id = %s
                  AND student_id = %s
                """,
                (new_status, application_id, student_id)
            )

            if updated == 0:
                raise ApiError(
                    "NOT_FOUND",
                    "Application not found",
                    404
                )

            # Same transaction as UPDATE. Any failure rolls both back.
            tx.execute(
                """
                INSERT INTO ApplicationStatusHistory (
                    application_id,
                    old_status,
                    new_status,
                    note
                )
                VALUES (%s, %s, %s, %s)
                """,
                (application_id, old_status, new_status, note)
            )

    return ok({
        "application_id": application_id,
        "status": new_status,
    })


@bp.get("/applications/<int:application_id>/history")
@jwt_required()
def get_application_history(application_id):
    student_id = current_student_id()

    # Never expose another student's application history.
    owned = query_one(
        """
        SELECT application_id
        FROM Applications
        WHERE application_id = %s
          AND student_id = %s
        """,
        (application_id, student_id)
    )

    if owned is None:
        return fail("NOT_FOUND", "Application not found", 404)

    page, limit, offset = get_pagination()

    total_row = query_one(
        """
        SELECT COUNT(*) AS total
        FROM ApplicationStatusHistory
        WHERE application_id = %s
        """,
        (application_id,)
    )
    total = int(total_row["total"])

    history = query_all(
        """
        SELECT old_status, new_status, changed_at, note
        FROM ApplicationStatusHistory
        WHERE application_id = %s
        ORDER BY changed_at ASC, history_id ASC
        LIMIT %s OFFSET %s
        """,
        (application_id, limit, offset)
    )

    return ok(
        history,
        meta=list_meta(page, limit, total)
    )
