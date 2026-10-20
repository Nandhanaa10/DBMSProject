"""Thin MySQL helper: explicit parameterized SQL only (use %s placeholders, never f-string user input).

query_all(sql, params)   -> list[dict]
query_one(sql, params)   -> dict | None
execute(sql, params)     -> lastrowid (INSERT)
execute_count(sql, params) -> matched row count (UPDATE/DELETE) -- extra helper, see note below
transaction()            -> context manager yielding a Tx with the same four methods on ONE connection;
                            commits on success, rolls back on any exception.
"""
from contextlib import contextmanager

from mysql.connector import pooling
from mysql.connector.constants import ClientFlag

from .config import Config

_pool = None


def _get_pool():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="oh_pool",
            pool_size=Config.DB_POOL_SIZE,
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            charset="utf8mb4",
            autocommit=True,
            # FOUND_ROWS makes rowcount = rows MATCHED (not changed), so an UPDATE that
            # sets identical values is not mistaken for "row not found".
            client_flags=[ClientFlag.FOUND_ROWS],
        )
    return _pool


def _run(conn, sql, params, mode):
    cur = conn.cursor(dictionary=True, buffered=True)
    try:
        cur.execute(sql, params or ())
        if mode == "all":
            return cur.fetchall()
        if mode == "one":
            return cur.fetchone()
        if mode == "insert":
            return cur.lastrowid
        return cur.rowcount
    finally:
        cur.close()


def _single(sql, params, mode):
    conn = _get_pool().get_connection()
    try:
        return _run(conn, sql, params, mode)
    finally:
        conn.close()  # returns the connection to the pool


def query_all(sql, params=None):
    return _single(sql, params, "all")


def query_one(sql, params=None):
    return _single(sql, params, "one")


def execute(sql, params=None):
    return _single(sql, params, "insert")


def execute_count(sql, params=None):
    return _single(sql, params, "count")


class _Tx:
    def __init__(self, conn):
        self._conn = conn

    def query_all(self, sql, params=None):
        return _run(self._conn, sql, params, "all")

    def query_one(self, sql, params=None):
        return _run(self._conn, sql, params, "one")

    def execute(self, sql, params=None):
        return _run(self._conn, sql, params, "insert")

    def execute_count(self, sql, params=None):
        return _run(self._conn, sql, params, "count")


@contextmanager
def transaction():
    """with transaction() as tx:  tx.execute(...); tx.execute(...)   # atomic"""
    conn = _get_pool().get_connection()
    try:
        conn.start_transaction()
        yield _Tx(conn)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()