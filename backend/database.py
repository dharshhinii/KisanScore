"""
database.py
-----------
Lightweight SQLite persistence layer for KisanScore (MVP).

Uses Python's built-in sqlite3 — no ORM, no extra deps.
The DB file is created automatically next to this file on first run.

Schema (single table: applications):
    application_id  TEXT PRIMARY KEY
    farmer_name     TEXT
    aadhaar_token   TEXT
    crop_type       TEXT
    land_size_acres REAL
    gps_polygon     TEXT   (JSON-serialised list of [lat, lon] pairs)
    cibil_score     INTEGER
    consent_captured INTEGER  (0 | 1)
    status          TEXT
    created_at      TEXT   (ISO-8601 UTC)
    routing_path    TEXT
    kisan_score     INTEGER
    risk_level      TEXT
    environmental_data TEXT  (JSON)
    shap_explainability TEXT  (JSON)
    recommendation  TEXT
    officer_id      TEXT
    officer_decision TEXT
    loan_amount     REAL
    insurance_bundled INTEGER  (0 | 1)
    decided_at      TEXT   (ISO-8601 UTC)
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).parent / "kisanscore.db"


def _get_connection() -> sqlite3.Connection:
    """Return a connection to the SQLite database with row_factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row   # lets us access columns by name
    return conn


def _init_db() -> None:
    """Create the applications table if it doesn't already exist."""
    with _get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS applications (
                application_id    TEXT PRIMARY KEY,
                farmer_name       TEXT NOT NULL,
                aadhaar_token     TEXT,
                crop_type         TEXT,
                land_size_acres   REAL,
                gps_polygon       TEXT,
                cibil_score       INTEGER,
                consent_captured  INTEGER DEFAULT 0,
                status            TEXT DEFAULT 'Received',
                created_at        TEXT,
                routing_path      TEXT,
                kisan_score       INTEGER,
                risk_level        TEXT,
                environmental_data TEXT,
                shap_explainability TEXT,
                recommendation    TEXT,
                officer_id        TEXT,
                officer_decision  TEXT,
                loan_amount       REAL,
                insurance_bundled INTEGER,
                decided_at        TEXT
            )
            """
        )
        conn.commit()


# Initialise on module import (harmless if table already exists)
_init_db()


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def save_application(app_data: dict[str, Any]) -> None:
    """Insert a new application record."""
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO applications
                (application_id, farmer_name, aadhaar_token, crop_type,
                 land_size_acres, gps_polygon, cibil_score, consent_captured,
                 status, created_at,
                 routing_path, kisan_score, risk_level,
                 environmental_data, shap_explainability, recommendation)
            VALUES
                (:application_id, :farmer_name, :aadhaar_token, :crop_type,
                 :land_size_acres, :gps_polygon, :cibil_score, :consent_captured,
                 :status, :created_at,
                 :routing_path, :kisan_score, :risk_level,
                 :environmental_data, :shap_explainability, :recommendation)
            """,
            {
                **app_data,
                "gps_polygon": json.dumps(app_data.get("gps_polygon", [])),
                "environmental_data": json.dumps(
                    app_data.get("environmental_data")
                ),
                "shap_explainability": json.dumps(
                    app_data.get("shap_explainability", [])
                ),
                "consent_captured": int(app_data.get("consent_captured", False)),
            },
        )
        conn.commit()


def get_all_applications() -> list[dict[str, Any]]:
    """Return summary rows for the dashboard table."""
    with _get_connection() as conn:
        rows = conn.execute(
            """
            SELECT application_id, farmer_name, status, created_at
            FROM applications
            ORDER BY created_at DESC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def get_application_score(application_id: str) -> dict[str, Any] | None:
    """Return the full AI-score record for one application, or None."""
    with _get_connection() as conn:
        row = conn.execute(
            """
            SELECT application_id, routing_path, kisan_score, risk_level,
                   environmental_data, shap_explainability, recommendation
            FROM applications
            WHERE application_id = ?
            """,
            (application_id,),
        ).fetchone()

    if row is None:
        return None

    result = dict(row)
    # Deserialise JSON columns
    result["environmental_data"] = json.loads(result["environmental_data"] or "null")
    result["shap_explainability"] = json.loads(
        result["shap_explainability"] or "[]"
    )
    return result


def record_decision(
    application_id: str,
    officer_id: str,
    decision: str,
    loan_amount: float,
    insurance_bundled: bool,
    decided_at: str,
) -> bool:
    """
    Persist the officer's decision.
    Returns True if a row was updated, False if application_id not found.
    """
    with _get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE applications
            SET officer_id        = ?,
                officer_decision  = ?,
                loan_amount       = ?,
                insurance_bundled = ?,
                decided_at        = ?,
                status            = ?
            WHERE application_id = ?
            """,
            (
                officer_id,
                decision,
                loan_amount,
                int(insurance_bundled),
                decided_at,
                f"Decision_{decision}",
                application_id,
            ),
        )
        conn.commit()
        return cursor.rowcount > 0
