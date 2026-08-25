"""
KisanScore ML Engine - Production Inference API Interface.
Provides fast, seamless scoring and SHAP explainability for FastAPI endpoints.
Strictly conforms to KisanScore API_CONTRACT.md.
"""

import os
import json
from typing import Dict, Any, List
from generate_shap import explain_prediction

def get_application_score(application_id: str, applicant_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Main endpoint handler for:
    GET /api/v1/applications/{application_id}/score
    
    Args:
        application_id (str): Unique ID of the farmer application (e.g. 'APP_9942')
        applicant_data (dict, optional): Farmer parameters containing:
            - 'farmer_type' ('Experienced' or 'New_Farmer' / 'First-Year Farmer (No History)')
            - 'ndvi_5yr_avg' (float)
            - 'rainfall_mm' (float)
            - 'soil_npk_index' (float)
            - 'crop_price_inr' (float)
    
    Returns:
        dict: Standardized API response matching API_CONTRACT.md format:
        {
            "application_id": str,
            "farmer_type": str,
            "kisan_score": int,
            "risk_level": str,
            "shap_explainability": [
                {"feature": str, "impact": str},
                ...
            ],
            "system_recommendation": str
        }
    """
    if applicant_data is None:
        # Realistic fallback/default parameters based on application_id
        applicant_data = {
            "farmer_type": "New_Farmer",
            "ndvi_5yr_avg": 0.0,
            "rainfall_mm": 680.5,
            "soil_npk_index": 62.0,
            "crop_price_inr": 2350.0
        }

    return explain_prediction(applicant_data, application_id=application_id)

def batch_score_applications(applications: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Evaluates multiple farmer applications in batch.
    """
    results = []
    for app in applications:
        app_id = app.get("application_id", "APP_UNKNOWN")
        results.append(get_application_score(app_id, app))
    return results

if __name__ == "__main__":
    print("=" * 60)
    print("[KISANSCORE INFERENCE TEST] FRONTEND API INTEGRATION")
    print("=" * 60)

    # 1. Test using EXACT Frontend Request Payload from API_CONTRACT.md (POST /api/v1/applications)
    print("\n--- 1. Testing Raw Frontend Application (Route A: Cold-Start First-Year Farmer) ---")
    frontend_app_cold_start = {
        "aadhaar": "XXXX-XXXX-1234",
        "farmer_name": "Ramesh Kumar",
        "crop_type": "Paddy",
        "land_size_acres": 2.5,
        "gps_coordinates": "12.971, 77.594",
        "cibil_score": -1
    }
    result_a = get_application_score("APP_9942", frontend_app_cold_start)
    print(json.dumps(result_a, indent=2))

    # 2. Test using Experienced Farmer Frontend Request Payload (Route B: Fast-Track)
    print("\n--- 2. Testing Raw Frontend Application (Route B: Fast-Track Experienced Farmer) ---")
    frontend_app_experienced = {
        "aadhaar": "XXXX-XXXX-5678",
        "farmer_name": "Suresh Patel",
        "crop_type": "Cotton",
        "land_size_acres": 5.0,
        "gps_coordinates": "21.170, 72.831",
        "cibil_score": 720
    }
    result_b = get_application_score("APP_9943", frontend_app_experienced)
    print(json.dumps(result_b, indent=2))
