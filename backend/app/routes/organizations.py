from flask import Blueprint
from flask_jwt_extended import jwt_required

from ..db import query_all, query_one
from ..utils import get_pagination, list_meta, ok

bp = Blueprint("organizations", __name__)
organizations_bp = bp


@bp.get("/organizations")
@jwt_required()
def list_organizations():
    page, limit, offset = get_pagination()

    total_row = query_one(
        "SELECT COUNT(*) AS total FROM Organizations"
    )
    total = int(total_row["total"])

    rows = query_all(
        """
        SELECT
            organization_id,
            name,
            type,
            website,
            location
        FROM Organizations
        ORDER BY name ASC, organization_id ASC
        LIMIT %s OFFSET %s
        """,
        (limit, offset)
    )

    return ok(
        rows,
        meta=list_meta(page, limit, total)
    )
