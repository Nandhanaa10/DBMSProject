"""Give every seeded student the demo password. Run from backend/:  python scripts/set_demo_passwords.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from werkzeug.security import generate_password_hash  # noqa: E402

from app.db import execute_count  # noqa: E402

DEMO_PASSWORD = "Password@123"

n = execute_count(
    "UPDATE Students SET password_hash = %s WHERE password_hash = %s",
    (generate_password_hash(DEMO_PASSWORD), "SEED_PLACEHOLDER"),
)
print(f"Updated {n} seeded students. Login with e.g. aarav@example.edu / {DEMO_PASSWORD}")
