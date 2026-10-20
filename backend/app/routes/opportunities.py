from datetime import datetime

from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from ..db import query_all, query_one
from ..utils import (
    ApiError,
    current_student_id,
    fail,
    get_pagination,
    list_meta,
    ok,
    validate_int_id,
)

bp = Blueprint("opportunities", __name__)
opportunities_bp = bp

OPPORTUNITY_TYPES = ("internship", "hackathon", "job", "research")


def _positive_int(value, field):
    number = validate_int_id(value, field)
    if number < 1:
        raise ApiError("VALIDATION_ERROR", f"{field} must be positive")
    return number


def _parse_iso_datetime(value, field):
    if not isinstance(value, str) or not value.strip():
        raise ApiError(
            "VALIDATION_ERROR",
            f"{field} must be an ISO datetime"
        )

    try:
        parsed = datetime.fromisoformat(value.strip())
    except ValueError:
        raise ApiError(
            "VALIDATION_ERROR",
            f"{field} must be an ISO datetime, such as 2026-11-05T18:30:00"
        )

    if parsed.tzinfo is not None:
        raise ApiError(
            "VALIDATION_ERROR",
            f"{field} must not contain a timezone offset"
        )

    return parsed.replace(microsecond=0)


def _parse_boolean(value, field):
    value = value.strip().lower()

    if value in ("true", "1"):
        return True
    if value in ("false", "0"):
        return False

    raise ApiError(
        "VALIDATION_ERROR",
        f"{field} must be true or false"
    )


def _build_filters():
    """Build fixed SQL conditions and a separate parameter list."""
    conditions = []
    params = []

    opportunity_type = request.args.get("type", "").strip()
    if opportunity_type:
        if opportunity_type not in OPPORTUNITY_TYPES:
            raise ApiError(
                "VALIDATION_ERROR",
                "type must be internship, hackathon, job, or research"
            )
        conditions.append("o.type = %s")
        params.append(opportunity_type)

    skill_id = request.args.get("skill_id")
    if skill_id:
        skill_id = _positive_int(skill_id, "skill_id")
        conditions.append("""
            EXISTS (
                SELECT 1
                FROM OpportunitySkills filter_os
                WHERE filter_os.opportunity_id = o.opportunity_id
                  AND filter_os.skill_id = %s
            )
        """)
        params.append(skill_id)

    search = request.args.get("q", "").strip()
    if search:
        conditions.append("""
            (
                o.title LIKE %s
                OR COALESCE(o.description, '') LIKE %s
                OR org.name LIKE %s
            )
        """)
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern, search_pattern])

    deadline_before = request.args.get("deadline_before")
    if deadline_before:
        parsed_deadline = _parse_iso_datetime(
            deadline_before,
            "deadline_before"
        )
        conditions.append("o.deadline < %s")
        params.append(parsed_deadline)

    eligible_only = _parse_boolean(
        request.args.get("eligible_only", "false"),
        "eligible_only"
    )

    if eligible_only:
        conditions.append("""
            (
                oe.eligibility_id IS NULL
                OR (
                    (oe.min_cgpa IS NULL OR st.cgpa >= oe.min_cgpa)
                    AND (
                        oe.allowed_branches IS NULL
                        OR FIND_IN_SET(
                            st.branch, oe.allowed_branches
                        ) > 0
                    )
                    AND (
                        oe.allowed_years IS NULL
                        OR FIND_IN_SET(
                            CAST(st.year AS CHAR),
                            oe.allowed_years
                        ) > 0
                    )
                )
            )
        """)

    return conditions, params


def _get_required_skills(opportunity_ids):
    """Fetch mandatory skills for a page of opportunities in one query."""
    grouped = {int(oid): [] for oid in opportunity_ids}

    if not opportunity_ids:
        return grouped

    placeholders = ", ".join(["%s"] * len(opportunity_ids))

    rows = query_all(
        f"""
        SELECT
            os.opportunity_id,
            s.skill_id,
            s.skill_name
        FROM OpportunitySkills os
        JOIN Skills s ON s.skill_id = os.skill_id
        WHERE os.is_mandatory = 1
          AND os.opportunity_id IN ({placeholders})
        ORDER BY os.opportunity_id, s.skill_name
        """,
        tuple(opportunity_ids)
    )

    for row in rows:
        grouped[int(row["opportunity_id"])].append({
            "skill_id": row["skill_id"],
            "skill_name": row["skill_name"],
        })

    return grouped


def _get_match_percent(student_id, opportunity_id):
    """Calculate match percentage in SQL, never in React or Python."""
    return query_one(
        """
        SELECT
            o.opportunity_id,
            COALESCE(
                ROUND(
                    100.0 * SUM(
                        CASE
                            WHEN ss.skill_id IS NOT NULL THEN 1
                            ELSE 0
                        END
                    ) / NULLIF(COUNT(os.skill_id), 0),
                    2
                ),
                0
            ) AS match_percent
        FROM Opportunities o
        LEFT JOIN OpportunitySkills os
            ON os.opportunity_id = o.opportunity_id
           AND os.is_mandatory = 1
        LEFT JOIN StudentSkills ss
            ON ss.student_id = %s
           AND ss.skill_id = os.skill_id
        WHERE o.opportunity_id = %s
        GROUP BY o.opportunity_id
        """,
        (student_id, opportunity_id)
    )


@bp.get("/opportunities")
@jwt_required()
def list_opportunities():
    student_id = current_student_id()
    page, limit, offset = get_pagination()

    conditions, filter_params = _build_filters()
    where_sql = (
        "WHERE " + " AND ".join(conditions)
        if conditions else ""
    )

    sort = request.args.get("sort", "deadline").strip().lower()

    # Only predefined SQL fragments are used for sorting.
    if sort == "deadline":
        order_sql = "o.deadline ASC, o.opportunity_id ASC"
    elif sort == "match":
        order_sql = (
            "match_percent DESC, o.deadline ASC, o.opportunity_id ASC"
        )
    else:
        raise ApiError(
            "VALIDATION_ERROR",
            "sort must be deadline or match"
        )

    total_row = query_one(
        f"""
        SELECT COUNT(DISTINCT o.opportunity_id) AS total
        FROM Opportunities o
        JOIN Organizations org
            ON org.organization_id = o.organization_id
        JOIN Students st
            ON st.student_id = %s
        LEFT JOIN OpportunityEligibility oe
            ON oe.opportunity_id = o.opportunity_id
        {where_sql}
        """,
        tuple([student_id] + filter_params)
    )
    total = int(total_row["total"])

    rows = query_all(
        f"""
        SELECT
            o.opportunity_id,
            o.title,
            o.type,
            org.organization_id,
            org.name AS organization_name,
            o.location,
            o.deadline,
            COALESCE(
                ROUND(
                    100.0 * SUM(
                        CASE
                            WHEN ss.skill_id IS NOT NULL THEN 1
                            ELSE 0
                        END
                    ) / NULLIF(COUNT(os.skill_id), 0),
                    2
                ),
                0
            ) AS match_percent
        FROM Opportunities o
        JOIN Organizations org
            ON org.organization_id = o.organization_id
        JOIN Students st
            ON st.student_id = %s
        LEFT JOIN OpportunityEligibility oe
            ON oe.opportunity_id = o.opportunity_id
        LEFT JOIN OpportunitySkills os
            ON os.opportunity_id = o.opportunity_id
           AND os.is_mandatory = 1
        LEFT JOIN StudentSkills ss
            ON ss.student_id = %s
           AND ss.skill_id = os.skill_id
        {where_sql}
        GROUP BY
            o.opportunity_id,
            o.title,
            o.type,
            org.organization_id,
            org.name,
            o.location,
            o.deadline
        ORDER BY {order_sql}
        LIMIT %s OFFSET %s
        """,
        tuple(
            [student_id, student_id]
            + filter_params
            + [limit, offset]
        )
    )

    skills_by_opportunity = _get_required_skills(
        [row["opportunity_id"] for row in rows]
    )

    data = []
    for row in rows:
        opportunity_id = int(row["opportunity_id"])

        data.append({
            "opportunity_id": opportunity_id,
            "title": row["title"],
            "type": row["type"],
            "organization": {
                "organization_id": row["organization_id"],
                "name": row["organization_name"],
            },
            "location": row["location"],
            "deadline": row["deadline"],
            "required_skills": skills_by_opportunity[opportunity_id],
            "match_percent": row["match_percent"],
        })

    return ok(data, meta=list_meta(page, limit, total))


@bp.get("/opportunities/<int:opportunity_id>")
@jwt_required()
def get_opportunity(opportunity_id):
    student_id = current_student_id()

    row = query_one(
        """
        SELECT
            o.opportunity_id,
            o.title,
            o.type,
            o.description,
            o.location,
            o.mode,
            o.stipend,
            o.deadline,
            o.apply_link,
            o.created_at,
            org.organization_id,
            org.name AS organization_name,
            org.type AS organization_type,
            org.website AS organization_website,
            org.location AS organization_location,
            oe.eligibility_id,
            oe.min_cgpa,
            oe.allowed_branches,
            oe.allowed_years
        FROM Opportunities o
        JOIN Organizations org
            ON org.organization_id = o.organization_id
        LEFT JOIN OpportunityEligibility oe
            ON oe.opportunity_id = o.opportunity_id
        WHERE o.opportunity_id = %s
        """,
        (opportunity_id,)
    )

    if row is None:
        return fail("NOT_FOUND", "Opportunity not found", 404)

    match_row = _get_match_percent(student_id, opportunity_id)
    skills = _get_required_skills([opportunity_id])[opportunity_id]

    eligibility = None
    if row["eligibility_id"] is not None:
        eligibility = {
            "min_cgpa": row["min_cgpa"],
            "allowed_branches": row["allowed_branches"],
            "allowed_years": row["allowed_years"],
        }

    data = {
        "opportunity_id": row["opportunity_id"],
        "title": row["title"],
        "type": row["type"],
        "description": row["description"],
        "location": row["location"],
        "mode": row["mode"],
        "stipend": row["stipend"],
        "deadline": row["deadline"],
        "apply_link": row["apply_link"],
        "created_at": row["created_at"],
        "organization": {
            "organization_id": row["organization_id"],
            "name": row["organization_name"],
            "type": row["organization_type"],
            "website": row["organization_website"],
            "location": row["organization_location"],
        },
        "required_skills": skills,
        "match_percent": match_row["match_percent"],
        "eligibility": eligibility,
    }

    return ok(data)


@bp.get("/opportunities/<int:opportunity_id>/match")
@jwt_required()
def get_opportunity_match(opportunity_id):
    student_id = current_student_id()
    row = _get_match_percent(student_id, opportunity_id)

    if row is None:
        return fail("NOT_FOUND", "Opportunity not found", 404)

    return ok({
        "opportunity_id": row["opportunity_id"],
        "match_percent": row["match_percent"],
    })
