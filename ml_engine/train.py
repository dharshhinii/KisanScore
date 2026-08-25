"""
Training Flow & Evaluation for KisanScore ML Engine.
Trains XGBoost Classifier for farmer default risk prediction, evaluates performance,
and persists the model artifacts.
"""

import os
import json
import numpy as np
import pandas as pd
import joblib

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

from preprocess import load_and_preprocess_data

MODEL_PATH = os.path.join(os.path.dirname(__file__), "xgboost_model.joblib")
METRICS_PATH = os.path.join(os.path.dirname(__file__), "metrics.json")

def train_and_evaluate_models():
    print("=" * 60)
    print("[KISANSCORE ML ENGINE] TRAINING & EVALUATION PIPELINE")
    print("=" * 60)

    # 1. Load & Preprocess
    print("\n[Step 1/4] Loading & Preprocessing Dataset...")
    X_train, X_test, y_train, y_test, X_all, y_all = load_and_preprocess_data()
    print(f"-> Total Samples: {len(X_all)}")
    print(f"-> Training Set: {X_train.shape[0]} samples, Test Set: {X_test.shape[0]} samples")
    print(f"-> Class Balance (Train): {dict(pd.Series(y_train).value_counts())}")

    # 2. Define Models for Benchmarking
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    }

    if HAS_XGBOOST:
        models["XGBoost Classifier"] = XGBClassifier(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            scale_pos_weight=(len(y_train) - sum(y_train)) / max(1, sum(y_train)),
            eval_metric="logloss",
            random_state=42
        )
    else:
        models["Gradient Boosting"] = GradientBoostingClassifier(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.85,
            random_state=42
        )

    results = {}
    best_model = None
    best_auc = -1

    # 3. Model Training & Comparison
    print("\n[Step 2/4] Training & Benchmarking Models...")
    for name, model in models.items():
        print(f"\n--- Training {name} ---")
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else y_pred

        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        auc = roc_auc_score(y_test, y_pred_proba)
        cm = confusion_matrix(y_test, y_pred).tolist()

        results[name] = {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "roc_auc": round(float(auc), 4),
            "confusion_matrix": cm
        }

        print(f"Accuracy : {acc:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f} | ROC-AUC: {auc:.4f}")

        if name in ["XGBoost Classifier", "Gradient Boosting"] or auc > best_auc:
            best_auc = auc
            best_model = model
            best_model_name = name

    # 4. In-depth Evaluation for Selected Production Model
    print(f"\n[Step 3/4] Production Model ({best_model_name}) Classification Report:")
    y_pred_best = best_model.predict(X_test)
    print(classification_report(y_test, y_pred_best, target_names=["Low Risk (0)", "High Risk Default (1)"]))

    # 5. Persist Model & Metrics
    print("\n[Step 4/4] Saving Artifacts...")
    joblib.dump(best_model, MODEL_PATH)
    print(f"-> Model saved to: {MODEL_PATH}")

    with open(METRICS_PATH, "w") as f:
        json.dump(results, f, indent=2)
    print(f"-> Evaluation metrics saved to: {METRICS_PATH}")

    # 6. Generate Evaluation Charts & Visualizations
    try:
        from visualize import generate_all_visuals
        generate_all_visuals(models, X_test, y_test, X_train.columns.tolist(), results)
    except Exception as e:
        print(f"[Visuals Warning] Could not generate plots: {e}")

    print("\n[Training Complete] ML Engine is ready for SHAP explainability and inference!")
    return best_model, results

if __name__ == "__main__":
    train_and_evaluate_models()
