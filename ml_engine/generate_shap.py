"""
SHAP Explainability and Scoring Engine for KisanScore.
Generates human-readable SHAP impact cards and calculates KisanScore credit ratings.
"""

import os
import json
import numpy as np
import pandas as pd
import joblib

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

from preprocess import transform_single_input, FEATURE_COLUMNS

MODEL_PATH = os.path.join(os.path.dirname(__file__), "xgboost_model.joblib")
EXPLAINER_PATH = os.path.join(os.path.dirname(__file__), "shap_explainer.joblib")

_model = None
_explainer = None

def get_model_and_explainer():
    """
    Lazy loads the trained model and SHAP TreeExplainer.
    """
    global _model, _explainer
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Trained model not found at {MODEL_PATH}. Run train.py first.")
        _model = joblib.load(MODEL_PATH)
    
    if _explainer is None and HAS_SHAP:
        try:
            _explainer = shap.TreeExplainer(_model)
        except Exception:
            _explainer = None
    
    return _model, _explainer

def map_feature_explanation(feature_name: str, value: float, shap_val: float) -> tuple[str, str]:
    """
    Converts raw feature names and values into intuitive, domain-specific impact descriptors.
    Returns: (Human Readable Feature Title, Impact string like '+45' or '-30')
    Note: Lower default risk means higher credit score contribution (+).
    """
    # Scale SHAP log-odds to score point delta (approx ~20-80 scale points)
    # SHAP value > 0 means higher default risk -> negative score impact
    # SHAP value < 0 means lower default risk -> positive score impact
    score_delta = int(round(-shap_val * 60))
    if score_delta == 0:
        score_delta = 10 if shap_val <= 0 else -10
        
    impact_str = f"+{score_delta}" if score_delta > 0 else f"{score_delta}"

    if feature_name == "soil_npk_index":
        if value >= 60:
            title = f"Rich Soil Quality (NPK: {value:.1f})"
        elif value < 40:
            title = f"Low Soil Nutrient Index (NPK: {value:.1f})"
        else:
            title = f"Moderate Soil Quality (NPK: {value:.1f})"

    elif feature_name == "ndvi_5yr_avg":
        if value >= 0.65:
            title = f"Healthy 5-Yr Satellite Biomass (NDVI: {value:.2f})"
        elif value > 0:
            title = f"Subdued Historical Vegetation (NDVI: {value:.2f})"
        else:
            title = "First-Year Land (Satellite Cold-Start)"

    elif feature_name == "rainfall_mm":
        if 500 <= value <= 1000:
            title = f"Optimal Regional Rainfall ({value:.0f} mm)"
        elif value > 1000:
            title = f"Excessive Precipitation / Flood Risk ({value:.0f} mm)"
        else:
            title = f"Sub-optimal Rainfall / Dry Spell ({value:.0f} mm)"

    elif feature_name == "crop_price_inr":
        if value >= 2400:
            title = f"High Crop Market Price (Rs.{value:.0f}/Qtl)"
        elif value < 1800:
            title = f"Depressed Mandi Price (Rs.{value:.0f}/Qtl)"
        else:
            title = f"Stable Crop Mandi Rate (Rs.{value:.0f}/Qtl)"

    elif feature_name == "farmer_type_encoded":
        if value == 1:
            title = "Established Farming Experience"
        else:
            title = "First-Year Farmer (No History)"
    else:
        title = feature_name

    return title, impact_str

def calculate_kisan_score(p_default: float) -> int:
    """
    Converts default probability (0.0 to 1.0) into KisanScore (300 to 900).
    Higher score = stronger creditworthiness.
    """
    p_good = 1.0 - p_default
    score = int(round(300 + (p_good * 600)))
    return max(300, min(900, score))

def get_risk_level_and_recommendation(score: int, is_new_farmer: bool) -> tuple[str, str]:
    """
    Generates standardized risk category and actionable loan recommendation.
    """
    if score >= 720:
        risk_level = "Low"
        rec = "Eligible for Full Credit Limit & Fast-Track Kisan Credit Card (KCC)."
    elif score >= 580:
        risk_level = "Moderate"
        if is_new_farmer:
            rec = "Offer Starter Micro-Loan. Mandate Crop Insurance."
        else:
            rec = "Approve with Standard Loan Tranche. Weather Insurance Recommended."
    else:
        risk_level = "High"
        rec = "High Risk Default Potential. Require Co-Guarantor or Direct Subsidy Linkage."
    
    return risk_level, rec

def explain_prediction(input_data: dict, application_id: str = "APP_9942") -> dict:
    """
    Core function called by the API endpoint:
    Takes farmer application features, calculates prediction, SHAP breakdown, and KisanScore.
    Returns dictionary strictly matching API_CONTRACT.md specification.
    """
    model, explainer = get_model_and_explainer()
    
    # 1. Transform Input
    df_input = transform_single_input(input_data)
    
    # 2. Model Prediction
    p_default = float(model.predict_proba(df_input)[0][1])
    kisan_score = calculate_kisan_score(p_default)
    
    farmer_type_raw = input_data.get("farmer_type", "New_Farmer")
    is_new_farmer = (df_input["farmer_type_encoded"].iloc[0] == 0)
    farmer_type_label = "First-Year Farmer (No History)" if is_new_farmer else "Experienced Farmer"

    # 3. Fast & Exact Tree SHAP Calculation
    shap_vals_1d = None
    try:
        if hasattr(model, "get_booster"):
            import xgboost as xgb
            dmat = xgb.DMatrix(df_input)
            contribs = model.get_booster().predict(dmat, pred_contribs=True)
            # contribs has shape (1, num_features + 1), last column is bias
            shap_vals_1d = contribs[0][:-1]
    except Exception as e:
        shap_vals_1d = None

    if shap_vals_1d is None and explainer is not None:
        try:
            shap_values = explainer.shap_values(df_input)
            if isinstance(shap_values, list):
                shap_vals_1d = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
            elif len(shap_values.shape) == 2:
                shap_vals_1d = shap_values[0]
            else:
                shap_vals_1d = shap_values
        except Exception:
            shap_vals_1d = None

    if shap_vals_1d is None:
        # Tree feature contribution heuristic
        importances = getattr(model, "feature_importances_", [0.2]*len(FEATURE_COLUMNS))
        p_diff = p_default - 0.5
        shap_vals_1d = [imp * p_diff * 2.0 for imp in importances]

    # Rank features by absolute impact
    feature_impacts = []
    for col, shap_val in zip(FEATURE_COLUMNS, shap_vals_1d):
        val = float(df_input[col].iloc[0])
        title, impact_str = map_feature_explanation(col, val, float(shap_val))
        feature_impacts.append({
            "feature": title,
            "impact": impact_str,
            "abs_impact": abs(float(shap_val))
        })
    
    # Sort by impact significance and take top 3-4 cards
    feature_impacts.sort(key=lambda x: x["abs_impact"], reverse=True)
    shap_cards = [
        {"feature": item["feature"], "impact": item["impact"]}
        for item in feature_impacts[:4]
    ]

    # 4. Risk Level & Recommendation
    risk_level, recommendation = get_risk_level_and_recommendation(kisan_score, is_new_farmer)

    # Formatted Output matching GET /api/v1/applications/{application_id}/score
    response = {
        "application_id": application_id,
        "farmer_type": farmer_type_label,
        "kisan_score": kisan_score,
        "risk_level": risk_level,
        "shap_explainability": shap_cards,
        "system_recommendation": recommendation
    }

    return response

if __name__ == "__main__":
    # Test with sample input
    sample_new_farmer = {
        "farmer_type": "New_Farmer",
        "ndvi_5yr_avg": 0.0,
        "rainfall_mm": 579.39,
        "soil_npk_index": 72.5,
        "crop_price_inr": 2600.0
    }
    result = explain_prediction(sample_new_farmer, "APP_9942")
    print("\n--- SHAP Explainability & KisanScore Output ---")
    print(json.dumps(result, indent=2))
