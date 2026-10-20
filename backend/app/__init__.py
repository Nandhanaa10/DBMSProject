import importlib

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import HTTPException

from .config import Config
from .utils import ApiError, fail

API_PREFIX = "/api/v1"
BLUEPRINT_MODULES = [
    "auth", "students", "skills", "projects", "recommendations",          # Person A
    "opportunities", "organizations", "applications", "reminders", "dashboard",  # Person B
]
HTTP_CODES = {400: "VALIDATION_ERROR", 401: "UNAUTHORIZED", 403: "FORBIDDEN",
              404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})

    jwt = JWTManager(app)

    @jwt.unauthorized_loader          # no / malformed Authorization header
    def _missing(reason):
        return fail("UNAUTHORIZED", "Missing or malformed Authorization header", 401)

    @jwt.invalid_token_loader         # bad signature etc. (library default would be 422)
    def _invalid(reason):
        return fail("UNAUTHORIZED", "Invalid token", 401)

    @jwt.expired_token_loader
    def _expired(header, payload):
        return fail("UNAUTHORIZED", "Token expired, please log in again", 401)

    @app.errorhandler(ApiError)
    def _api_error(e):
        return fail(e.code, e.message, e.status)

    @app.errorhandler(HTTPException)
    def _http_error(e):
        return fail(HTTP_CODES.get(e.code, "ERROR"), e.description, e.code)

    # Each routes/<name>.py defines `bp`; files that do not exist yet are skipped.
        # Each routes/<name>.py defines `bp`; missing or still-empty files are skipped.
    for name in BLUEPRINT_MODULES:
        try:
            module = importlib.import_module(f".routes.{name}", package=__name__)
        except ModuleNotFoundError as exc:
            if exc.name == f"{__name__}.routes.{name}":
                app.logger.warning("routes/%s.py not found, skipping", name)
                continue
            raise
        bp = getattr(module, "bp", None)
        if bp is None:
            app.logger.warning("routes/%s.py has no `bp` yet, skipping", name)
            continue
        app.register_blueprint(bp, url_prefix=API_PREFIX)

    return app