"""
routing_logic.py
----------------
Houses the three routing paths and all stub integration points.

Each stub function is clearly named and documented so a teammate can
drop in a real implementation without touching main.py.

Routing matrix (keyed on cibil_score from the application):
  cibil_score == -1  → Route A (Cold-Start)   – no CIBIL history, use env data
  cibil_score >  700 → Route B (Fast-Track)   – strong credit, auto-recommend
  cibil_score <  700 → Route C (Distress Check)– weak credit, drought lookup
"""

from __future__ import annotations

import random
from typing import Any

# ---------------------------------------------------------------------------
# ── STUB INTEGRATION POINTS ─────────────────────────────────────────────────
# Each function below is the *seam* where a real module will be plugged in.
# The function signature and return shape are the agreed contract between
# teams — only the body needs to change.
# ---------------------------------------------------------------------------


def get_environmental_data(gps_polygon: list[list[float]]) -> dict[str, Any]:
    """
    STUB → Replace with a real call to the weather/soil microservice.

    Expected future implementation:
        - Hit NASA POWER / IMD API for rainfall_mm
        - Hit ISRIC SoilGrids API for soil_nitrogen
        - Hit Sentinel-2 NDVI service for historical_ndvi

    Args:
        gps_polygon: List of [lat, lon] pairs defining the farm boundary.

    Returns:
        dict with keys: historical_ndvi (float), rainfall_mm (int),
        soil_nitrogen (str: "High" | "Medium" | "Low")
    """
    # MOCK DATA — swap body for real API calls when ready
    return {
        "historical_ndvi": 0.75,
        "rainfall_mm": 110,
        "soil_nitrogen": "High",
    }


def score_application(env_data: dict[str, Any]) -> dict[str, Any]:
    """
    STUB → Replace with XGBoost/ML model inference call.

    Expected future implementation:
        - Load ml_engine/model.pkl
        - Build feature vector from env_data
        - Run model.predict_proba() → kisan_score
        - Run shap.TreeExplainer → shap_values → explainability cards

    Args:
        env_data: Output from get_environmental_data().

    Returns:
        dict with keys: kisan_score (int 300-900), risk_level (str),
        shap_explainability (list of {"feature": str, "impact": str})
    """
    # MOCK DATA — deterministic enough for a demo, replace with real inference
    kisan_score = 782
    risk_level = "Low"
    shap_explainability = [
        {"feature": "Healthy Crop History", "impact": "+45"},
        {"feature": "Rich Soil Quality", "impact": "+20"},
        {"feature": "Slight Rain Deficit", "impact": "-5"},
    ]
    return {
        "kisan_score": kisan_score,
        "risk_level": risk_level,
        "shap_explainability": shap_explainability,
    }


def lookup_drought_years(gps_polygon: list[list[float]]) -> dict[str, Any]:
    """
    STUB → Replace with IMD/NDVI drought-year lookup.

    Expected future implementation:
        - Query historical IMD rainfall records for the district.
        - Cross-reference with NDVI anomaly years.
        - Classify default risk as "Climate Distress Default" or
          "Willful Default" based on whether drought years overlap
          with the farmer's reported repayment failures.

    Args:
        gps_polygon: Farm boundary polygon.

    Returns:
        dict with keys:
            drought_years (list[int]),
            default_classification (str: "Climate Distress" | "Willful" | "Unknown")
    """
    # MOCK DATA — assume a recent climate distress event
    return {
        "drought_years": [2018, 2022],
        "default_classification": "Climate Distress",
    }


# ---------------------------------------------------------------------------
# ── ROUTING FUNCTIONS ────────────────────────────────────────────────────────
# ---------------------------------------------------------------------------


def route_application(application: dict[str, Any]) -> dict[str, Any]:
    """
    Main routing dispatcher. Called by main.py after an application is saved.

    Returns a result dict that will be merged into the application record.
    Keys: routing_path, kisan_score, risk_level, environmental_data,
          shap_explainability, recommendation
    """
    cibil_score: int = application.get("cibil_score", -1)
    gps_polygon: list = application.get("gps_polygon", [])

    if cibil_score == -1:
        return _route_a_cold_start(gps_polygon)
    elif cibil_score > 700:
        return _route_b_fast_track(cibil_score)
    else:
        return _route_c_distress_check(gps_polygon, cibil_score)


# ── Route A: Cold-Start (no CIBIL history) ──────────────────────────────────

def _route_a_cold_start(gps_polygon: list[list[float]]) -> dict[str, Any]:
    """
    Route A — Farmer has no CIBIL history (cibil_score == -1).
    Strategy: derive creditworthiness entirely from environmental/satellite data.
    """
    # Integration point 1: fetch satellite + soil + weather data
    env_data = get_environmental_data(gps_polygon)

    # Integration point 2: run ML scoring model
    score_result = score_application(env_data)

    recommendation = _derive_recommendation(score_result["kisan_score"])

    return {
        "routing_path": "Route A (Cold-Start)",
        "kisan_score": score_result["kisan_score"],
        "risk_level": score_result["risk_level"],
        "environmental_data": env_data,
        "shap_explainability": score_result["shap_explainability"],
        "recommendation": recommendation,
    }


# ── Route B: Fast-Track (strong CIBIL) ──────────────────────────────────────

def _route_b_fast_track(cibil_score: int) -> dict[str, Any]:
    """
    Route B — Farmer has strong CIBIL score (> 700).
    Strategy: skip ML scoring; auto-recommend approval.
    """
    # Map CIBIL range to a synthetic KisanScore for dashboard consistency
    kisan_score = min(900, int(cibil_score * 0.95) + 50)

    return {
        "routing_path": "Route B (Fast-Track)",
        "kisan_score": kisan_score,
        "risk_level": "Low",
        "environmental_data": None,       # not needed for this route
        "shap_explainability": [
            {"feature": "Strong CIBIL Credit History", "impact": f"+{cibil_score}"},
            {"feature": "Fast-Track Auto-Approval", "impact": "+100"},
        ],
        "recommendation": "Approve with Standard Rate",
    }


# ── Route C: Distress Check (weak CIBIL) ────────────────────────────────────

def _route_c_distress_check(
    gps_polygon: list[list[float]], cibil_score: int
) -> dict[str, Any]:
    """
    Route C — Farmer has a weak CIBIL score (< 700, but not -1).
    Strategy: check whether defaults were due to climate distress vs. willful.
    This distinguishes farmers who were *victims of drought* from genuine
    credit risks, enabling fairer lending decisions.
    """
    # Integration point 3: drought-year cross-reference
    drought_data = lookup_drought_years(gps_polygon)

    classification = drought_data["default_classification"]

    if classification == "Climate Distress":
        risk_level = "Moderate"
        kisan_score = min(700, max(400, cibil_score + 150))
        recommendation = (
            "Approve with Reduced Rate. Mandate Crop Insurance (PMFBY)."
        )
        shap_note = "Climate Distress Default detected — not willful"
    else:
        risk_level = "High"
        kisan_score = max(300, cibil_score - 50)
        recommendation = "Manual Review Required. Refer to Senior Officer."
        shap_note = "Willful Default pattern detected"

    return {
        "routing_path": "Route C (Distress Check)",
        "kisan_score": kisan_score,
        "risk_level": risk_level,
        "environmental_data": {
            "drought_years": drought_data["drought_years"],
            "default_classification": classification,
        },
        "shap_explainability": [
            {"feature": shap_note, "impact": "+0"},
            {"feature": f"CIBIL Score {cibil_score}", "impact": f"{cibil_score - 700}"},
        ],
        "recommendation": recommendation,
    }


# ---------------------------------------------------------------------------
# ── HELPERS ──────────────────────────────────────────────────────────────────
# ---------------------------------------------------------------------------

def _derive_recommendation(kisan_score: int) -> str:
    """Map a KisanScore integer to a human-readable loan recommendation."""
    if kisan_score >= 750:
        return "Approve with Standard Rate"
    elif kisan_score >= 600:
        return "Approve with Reduced Loan Amount. Mandate Crop Insurance."
    elif kisan_score >= 450:
        return "Offer Starter Micro-Loan. Mandate Crop Insurance (PMFBY)."
    else:
        return "Manual Review Required. High Risk — Refer to Senior Officer."
