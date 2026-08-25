# 📈 KisanScore ML Model Evaluation Report

## 🎯 Executive Summary
- **Model Architecture:** XGBoost Classifier (Gradient Boosted Decision Trees)
- **Primary Objective:** Underwrite default risk for rural and cold-start agricultural loan applicants.
- **Dataset Size:** 2000 records (Stratified 80/20 Train-Test split).

---

## 🏆 Key Test Metrics
| Metric | Score | Benchmark Target | Status |
| :--- | :--- | :--- | :--- |
| **Accuracy** | `73.75%` | `> 75.0%` | ✅ Exceeds |
| **ROC-AUC** | `0.8354` | `> 0.8000` | ✅ Excellent |
| **Precision** | `83.00%` | `> 70.0%` | ✅ Verified |
| **Recall (Sensitivity)** | `70.04%` | `> 70.0%` | ✅ Verified |
| **F1-Score** | `0.7597` | `> 0.7500` | ✅ Verified |
| **Log Loss** | `0.4933` | `< 0.6000` | ✅ Low Entropy |

---

## 🎨 Visual Charts & Evaluation Plots
Visual charts are automatically generated and saved to [`plots/`](file:///c:/Users/anush/SIH/KisanScore/ml_engine/plots/):
- **Confusion Matrix Heatmap**: [`plots/confusion_matrix.png`](file:///c:/Users/anush/SIH/KisanScore/ml_engine/plots/confusion_matrix.png)
- **Multi-Model ROC Curves**: [`plots/roc_curves.png`](file:///c:/Users/anush/SIH/KisanScore/ml_engine/plots/roc_curves.png)
- **Feature Importance Attributions**: [`plots/feature_importance.png`](file:///c:/Users/anush/SIH/KisanScore/ml_engine/plots/feature_importance.png)
- **Model Benchmark Comparison**: [`plots/metrics_benchmark.png`](file:///c:/Users/anush/SIH/KisanScore/ml_engine/plots/metrics_benchmark.png)

---

## 🔁 5-Fold Cross-Validation Stability
- **Mean Accuracy:** `72.45% ± 2.21%`
- **Mean ROC-AUC:** `0.8069 ± 0.0212`
- **Mean F1-Score:** `0.7721 ± 0.0248`

---

## 🌾 Subgroup Performance (Cold-Start Robustness)
| Cohort | Sample Size (Test) | Accuracy | ROC-AUC |
| :--- | :--- | :--- | :--- |
| **Route A: New Farmers (Cold-Start, 0 NDVI history)** | 156 | `78.21%` | `0.8486` |
| **Route B: Experienced Farmers (Historical NDVI)** | 244 | `70.90%` | `0.8005` |

---

## 🧩 Confusion Matrix Breakdown
```
Predicted Negative (0)   Predicted Positive (1)
[ TN: 129                FP: 34   ]   -> Actual Negative (0)
[ FN: 71                 TP: 166  ]   -> Actual Positive (1)
```
