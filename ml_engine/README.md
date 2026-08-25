# 🌾 KisanScore ML Engine

The Machine Learning & Explainable AI (XAI) core for **KisanScore** — an alternative agricultural credit scoring system designed for rural Indian farmers and Cold-Start (first-year) land cultivators.

---

## 📁 Architecture Overview

```
ml_engine/
├── dataset.csv            # 1,000-row dummy agricultural training dataset
├── preprocess.py          # Data ingestion, encoding, scaling & split pipelines
├── train.py               # XGBoost classifier training & benchmark suite
├── evaluate.py            # 5-fold cross validation & subgroup fairness analysis
├── generate_shap.py       # SHAP TreeExplainer & credit score mapping (300-900)
├── inference.py           # Production inference module for FastAPI endpoints
├── train_model.ipynb      # Interactive Jupyter notebook for EDA & visualizations
├── xgboost_model.joblib   # Trained production XGBoost model artifact (generated)
├── preprocessor.joblib    # Preprocessor artifact (generated)
├── metrics.json           # Model evaluation metrics output (generated)
└── evaluation_report.md   # Comprehensive validation & fairness report (generated)
```

---

## 🚀 Pipeline Flow

1. **Preprocessing (`preprocess.py`)**:
   - Encodes `farmer_type` (`Experienced` -> 1, `New_Farmer` -> 0).
   - Standardizes numerical features (`ndvi_5yr_avg`, `rainfall_mm`, `soil_npk_index`, `crop_price_inr`).
   - Stratified train/test split preserving default risk ratios.

2. **Model Training (`train.py`)**:
   - Trains an **XGBoost Classifier** with hyperparameter tuning and class weighting.
   - Compares with baseline models (Logistic Regression, Random Forest).
   - Generates and saves model artifacts.

3. **Model Evaluation (`evaluate.py`)**:
   - Holdout test evaluation (Accuracy, ROC-AUC, Precision, Recall, F1, Log Loss).
   - 5-Fold Stratified Cross-Validation for variance checking.
   - Subgroup fairness analysis (Cold-Start applicants vs Experienced farmers).

4. **SHAP Explainability (`generate_shap.py`)**:
   - Uses `shap.TreeExplainer` on the gradient boosted trees.
   - Maps raw log-odds to intuitive, bank-friendly impact cards (`{"feature": "Rich Soil Quality (NPK: 75.0)", "impact": "+50"}`).
   - Scales default risk into a **KisanScore** credit rating ranging from **300 to 900**.

5. **Inference & API Contract (`inference.py`)**:
   - Handles the backend contract for `GET /api/v1/applications/{application_id}/score`.

---

## 🌐 API Endpoint Schema

### `GET /api/v1/applications/{application_id}/score`

#### Expected Output:
```json
{
  "application_id": "APP_9942",
  "farmer_type": "First-Year Farmer (No History)",
  "kisan_score": 640,
  "risk_level": "Moderate",
  "shap_explainability": [
    {
      "feature": "Rich Soil Quality (NPK: 72.5)",
      "impact": "+50"
    },
    {
      "feature": "High Crop Market Price (₹2600/Qtl)",
      "impact": "+20"
    },
    {
      "feature": "Optimal Regional Rainfall (579 mm)",
      "impact": "+15"
    },
    {
      "feature": "First-Year Farmer (No History)",
      "impact": "-30"
    }
  ],
  "system_recommendation": "Offer Starter Micro-Loan. Mandate Crop Insurance."
}
```

---

## 💻 Running Commands

```bash
# 1. Run Preprocessing & Training
python train.py

# 2. Run Comprehensive Evaluation
python evaluate.py

# 3. Test SHAP Explainability
python generate_shap.py

# 4. Test Production Inference API
python inference.py
```
