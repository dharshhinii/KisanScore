"""
main.py
-------
KisanScore FastAPI backend — MVP entry point.

Endpoints
---------
POST  /api/v1/applications                           → submit new farmer application
GET   /api/v1/applications                           → list all applications (dashboard)
GET   /api/v1/applications/{application_id}/score   → fetch AI score + SHAP
POST  /api/v1/applications/{application_id}/decision → officer final decision

Run with:
    uvicorn main:app --reload
"""

from __future__ import annotations

import random
import string
from datetime import datetime, timezone
from typing import Any, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from database import (
    get_all_applications,
    get_application_score,
    record_decision,
    save_application,
)
from middleware import add_middleware
from routing_logic import route_application

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="KisanScore API",
    description=(
        "Alternative credit-scoring engine for farmers with no CIBIL history. "
        "Built for India Post Payments Bank (IPPB) — SIH Hackathon MVP."
    ),
    version="1.0.0",
)

add_middleware(app)


# ---------------------------------------------------------------------------
# ── REQUEST / RESPONSE SCHEMAS ───────────────────────────────────────────────
# ---------------------------------------------------------------------------

# ── POST /api/v1/applications ────────────────────────────────────────────────

class ApplicationRequest(BaseModel):
    """Farmer application submitted by the mobile app."""

    aadhaar_token: str = Field(..., example="XXXX-XXXX-1234")
    farmer_name: str = Field(..., example="Ramesh Kumar")
    crop_type: str = Field(..., example="Paddy")
    land_size_acres: float = Field(..., gt=0, example=2.5)
    gps_polygon: List[List[float]] = Field(
        ...,
        example=[[12.97, 77.59], [12.98, 77.59], [12.98, 77.60], [12.97, 77.60]],
    )
    cibil_score: int = Field(
        ...,
        description="-1 = no history, else actual CIBIL score",
        example=-1,
    )
    consent_captured: bool = Field(..., example=True)


class ApplicationResponse(BaseModel):
    status: str
    application_id: str
    message: str


# ── GET /api/v1/applications ─────────────────────────────────────────────────

class ApplicationSummary(BaseModel):
    application_id: str
    farmer_name: str
    status: str
    created_at: str


# ── GET /api/v1/applications/{application_id}/score ──────────────────────────

class SHAPEntry(BaseModel):
    feature: str
    impact: str


class ScoreResponse(BaseModel):
    application_id: str
    routing_path: str
    kisan_score: int
    risk_level: str
    environmental_data: Optional[Any]
    shap_explainability: List[SHAPEntry]
    recommendation: str


# ── POST /api/v1/applications/{application_id}/decision ──────────────────────

class DecisionRequest(BaseModel):
    officer_id: str = Field(..., example="OFF_001")
    decision: str = Field(..., pattern="^(APPROVED|REJECTED)$", example="APPROVED")
    loan_amount: float = Field(..., gt=0, example=50000)
    insurance_bundled: bool = Field(..., example=True)


class DecisionResponse(BaseModel):
    status: str
    message: str


# ---------------------------------------------------------------------------
# ── HELPERS ──────────────────────────────────────────────────────────────────
# ---------------------------------------------------------------------------

def _generate_application_id() -> str:
    """Generate a short, human-readable application ID: APP_XXXX."""
    suffix = "".join(random.choices(string.digits, k=4))
    return f"APP_{suffix}"


def _utc_now() -> str:
    """Return the current UTC timestamp as an ISO-8601 string."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# ── ENDPOINTS ────────────────────────────────────────────────────────────────
# ---------------------------------------------------------------------------

@app.post(
    "/api/v1/applications",
    response_model=ApplicationResponse,
    status_code=201,
    summary="Submit a new farmer application",
    tags=["Applications"],
)
def create_application(body: ApplicationRequest) -> ApplicationResponse:
    """
    Receives a farmer application from the mobile app.

    1. Generates a unique application_id.
    2. Runs the routing engine (Route A / B / C) to produce an AI score.
    3. Persists the full record to SQLite.
    4. Returns the application_id immediately so the app can poll for results.
    """
    application_id = _generate_application_id()
    created_at = _utc_now()

    # Build the raw application dict (mirrors the DB schema)
    application: dict[str, Any] = {
        "application_id": application_id,
        "farmer_name": body.farmer_name,
        "aadhaar_token": body.aadhaar_token,
        "crop_type": body.crop_type,
        "land_size_acres": body.land_size_acres,
        "gps_polygon": body.gps_polygon,
        "cibil_score": body.cibil_score,
        "consent_captured": body.consent_captured,
        "status": "AI_Processing_Complete",
        "created_at": created_at,
    }

    # ── Route the application through the scoring engine ──────────────────
    # route_application() is the single integration seam for ML / data teams.
    # It returns routing_path, kisan_score, risk_level, environmental_data,
    # shap_explainability, recommendation.
    score_result = route_application(application)
    application.update(score_result)

    # ── Persist to SQLite ─────────────────────────────────────────────────
    save_application(application)

    return ApplicationResponse(
        status="success",
        application_id=application_id,
        message="Application received. Routing to AI Engine.",
    )


@app.get(
    "/api/v1/applications",
    response_model=List[ApplicationSummary],
    summary="List all applications",
    tags=["Applications"],
)
def list_applications() -> List[ApplicationSummary]:
    """
    Returns a summary list of all applications for the bank officer dashboard.
    Ordered by creation time (newest first).
    """
    rows = get_all_applications()
    return [ApplicationSummary(**row) for row in rows]


@app.get(
    "/api/v1/applications/{application_id}/score",
    response_model=ScoreResponse,
    summary="Get AI score and SHAP explanation for an application",
    tags=["Scoring"],
)
def get_score(application_id: str) -> ScoreResponse:
    """
    Returns the AI-generated KisanScore, risk level, environmental data,
    and SHAP explainability cards for a specific application.

    Used by the bank officer dashboard when the officer clicks on a farmer row.
    """
    record = get_application_score(application_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail=f"Application '{application_id}' not found.",
        )
    return ScoreResponse(**record)


@app.post(
    "/api/v1/applications/{application_id}/decision",
    response_model=DecisionResponse,
    summary="Record the bank officer's final loan decision",
    tags=["Decisions"],
)
def submit_decision(
    application_id: str, body: DecisionRequest
) -> DecisionResponse:
    """
    Persists the bank officer's final loan decision (APPROVED / REJECTED).

    In a production system this would also trigger:
    - IPPB disbursement API call
    - SMS notification to the farmer
    - Audit log entry
    """
    updated = record_decision(
        application_id=application_id,
        officer_id=body.officer_id,
        decision=body.decision,
        loan_amount=body.loan_amount,
        insurance_bundled=body.insurance_bundled,
        decided_at=_utc_now(),
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail=f"Application '{application_id}' not found.",
        )

    if body.decision == "APPROVED":
        message = "Loan Approved. Disbursement triggered to IPPB account."
    else:
        message = "Loan Rejected. Farmer will be notified via SMS."

    return DecisionResponse(status="success", message=message)


# ---------------------------------------------------------------------------
# ── HEALTH CHECK (bonus) ─────────────────────────────────────────────────────
# ---------------------------------------------------------------------------

@app.get("/health", include_in_schema=False)
def health() -> dict[str, str]:
    """Simple liveness probe."""
    return {"status": "ok", "service": "KisanScore API"}
