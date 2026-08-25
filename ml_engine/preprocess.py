"""
Pre-processing pipeline for KisanScore ML Engine.
Handles data loading, categorical encoding, feature scaling, and train/test splitting.
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib

DUMMY_DATA_PATH = os.path.join(os.path.dirname(__file__), "dummy_data.csv")
FALLBACK_DATASET_PATH = os.path.join(os.path.dirname(__file__), "dataset.csv")
DATASET_PATH = DUMMY_DATA_PATH if os.path.exists(DUMMY_DATA_PATH) else FALLBACK_DATASET_PATH
PREPROCESSOR_PATH = os.path.join(os.path.dirname(__file__), "preprocessor.joblib")

FEATURE_COLUMNS = [
    "farmer_type_encoded",
    "ndvi_5yr_avg",
    "rainfall_mm",
    "soil_npk_index",
    "crop_price_inr"
]

def encode_farmer_type(farmer_type_str: str) -> int:
    """
    Encodes farmer_type string to binary integer:
    - 'Experienced' -> 1
    - 'New_Farmer' (or others like 'First-Year Farmer (No History)') -> 0
    """
    if str(farmer_type_str).strip().lower() in ["experienced", "experienced farmer", "1"]:
        return 1
    return 0

def load_and_preprocess_data(csv_path: str = DATASET_PATH, test_size: float = 0.2, random_state: int = 42):
    """
    Loads dataset.csv, applies encoding and feature preparation, splits into train and test sets.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")

    df = pd.read_csv(csv_path)

    # Clean whitespace
    df.columns = [col.strip() for col in df.columns]

    # Categorical encoding
    df["farmer_type_encoded"] = df["farmer_type"].apply(encode_farmer_type)

    X = df[FEATURE_COLUMNS].copy()
    y = df["default_risk_label"].astype(int)

    # Train / Test split with stratification
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    # Fit a standard scaler for explainability baselines / normalized comparisons
    scaler = StandardScaler()
    scaler.fit(X_train)

    # Save preprocessor artifact
    preprocessor_meta = {
        "scaler": scaler,
        "feature_columns": FEATURE_COLUMNS,
        "farmer_type_map": {"Experienced": 1, "New_Farmer": 0}
    }
    joblib.dump(preprocessor_meta, PREPROCESSOR_PATH)
    print(f"[Preprocessing] Artifacts successfully saved to {PREPROCESSOR_PATH}")

    return X_train, X_test, y_train, y_test, X, y

# Standard MSP and Mandi Pricing Mapping for Indian Crops (INR / Quintal)
CROP_PRICE_MAP = {
    "paddy": 2320.0,
    "rice": 2320.0,
    "wheat": 2275.0,
    "cotton": 2850.0,
    "maize": 2090.0,
    "corn": 2090.0,
    "sugarcane": 3150.0,
    "soybean": 2600.0,
    "groundnut": 2750.0,
    "pulses": 2500.0,
    "millet": 2150.0,
    "mustard": 2650.0,
    "tomato": 1800.0,
    "onion": 1950.0,
    "potato": 1600.0
}

def adapt_frontend_payload(frontend_data: dict) -> dict:
    """
    Translates raw frontend form inputs (from API_CONTRACT.md) into ML model feature dictionary.
    
    Frontend Inputs Supported:
    - 'cibil_score': int (-1 for cold-start / new farmer, >0 for experienced)
    - 'farmer_name': str
    - 'crop_type' or 'crop': str ("Paddy", "Cotton", "Wheat", etc.)
    - 'land_size_acres': float
    - 'gps_coordinates': str ("12.971, 77.594")
    - 'farmer_type': str (optional override)
    - 'ndvi_5yr_avg': float (optional override)
    - 'rainfall_mm': float (optional override)
    - 'soil_npk_index': float (optional override)
    - 'crop_price_inr': float (optional override)
    """
    adapted = {}

    # 1. Determine Farmer Type & Cold-Start Route
    cibil = frontend_data.get("cibil_score")
    farmer_type_raw = frontend_data.get("farmer_type")
    
    if farmer_type_raw is not None:
        adapted["farmer_type"] = farmer_type_raw
    elif cibil is not None and int(cibil) > 0:
        adapted["farmer_type"] = "Experienced"
    else:
        # Default cold-start for CIBIL = -1 or missing
        adapted["farmer_type"] = "New_Farmer"

    # 2. Determine NDVI (0.0 for First-Year / Cold-start, historical average for experienced)
    if "ndvi_5yr_avg" in frontend_data:
        adapted["ndvi_5yr_avg"] = float(frontend_data["ndvi_5yr_avg"])
    else:
        adapted["ndvi_5yr_avg"] = 0.0 if adapted["farmer_type"] == "New_Farmer" else 0.72

    # 3. Determine Crop Mandi / MSP Price
    crop = str(frontend_data.get("crop_type") or frontend_data.get("crop") or "").strip().lower()
    if "crop_price_inr" in frontend_data:
        adapted["crop_price_inr"] = float(frontend_data["crop_price_inr"])
    else:
        adapted["crop_price_inr"] = CROP_PRICE_MAP.get(crop, 2300.0)

    # 4. Resolve GPS Coordinates -> Soil NPK & Rainfall
    gps = str(frontend_data.get("gps_coordinates", "")).strip()
    lat, lon = 12.971, 77.594
    if gps and "," in gps:
        try:
            parts = gps.split(",")
            lat, lon = float(parts[0].strip()), float(parts[1].strip())
        except Exception:
            pass

    # Deterministic spatial hash for realistic soil and weather simulation per GPS location
    coord_seed = int((abs(lat) * 100 + abs(lon) * 10) % 1000)
    
    if "soil_npk_index" in frontend_data:
        adapted["soil_npk_index"] = float(frontend_data["soil_npk_index"])
    else:
        # Realistic soil NPK index based on region (45.0 - 85.0)
        adapted["soil_npk_index"] = round(48.0 + ((coord_seed % 38) + 1.0), 1)

    if "rainfall_mm" in frontend_data:
        adapted["rainfall_mm"] = float(frontend_data["rainfall_mm"])
    else:
        # Realistic annual precipitation (520mm - 980mm)
        adapted["rainfall_mm"] = round(520.0 + ((coord_seed * 3) % 460), 1)

    # Pass through metadata
    if "land_size_acres" in frontend_data:
        adapted["land_size_acres"] = float(frontend_data["land_size_acres"])
    if "crop_type" in frontend_data:
        adapted["crop_type"] = frontend_data["crop_type"]
    if "farmer_name" in frontend_data:
        adapted["farmer_name"] = frontend_data["farmer_name"]

    return adapted

def transform_single_input(input_dict: dict) -> pd.DataFrame:
    """
    Transforms a raw input dictionary (either frontend form or direct features) into model DataFrame format.
    """
    # Adapt frontend payload if needed
    adapted = adapt_frontend_payload(input_dict)
    
    farmer_type_encoded = encode_farmer_type(adapted.get("farmer_type", "New_Farmer"))
    ndvi = float(adapted.get("ndvi_5yr_avg", 0.0 if farmer_type_encoded == 0 else 0.65))
    rainfall = float(adapted.get("rainfall_mm", 720.0))
    soil_npk = float(adapted.get("soil_npk_index", 60.0))
    crop_price = float(adapted.get("crop_price_inr", 2300.0))

    row_data = {
        "farmer_type_encoded": [farmer_type_encoded],
        "ndvi_5yr_avg": [ndvi],
        "rainfall_mm": [rainfall],
        "soil_npk_index": [soil_npk],
        "crop_price_inr": [crop_price]
    }

    df_single = pd.DataFrame(row_data, columns=FEATURE_COLUMNS)
    return df_single

if __name__ == "__main__":
    X_train, X_test, y_train, y_test, X, y = load_and_preprocess_data()
    print(f"Data Loaded: {len(X)} total rows.")
    print(f"Train Shape: {X_train.shape}, Test Shape: {X_test.shape}")
    print(f"Target Distribution (Train): Defaults={sum(y_train)}, Non-Defaults={len(y_train)-sum(y_train)}")
