"""
Visualization Suite for KisanScore ML Engine.
Generates publication-quality charts for Confusion Matrix, ROC-AUC Curves,
Feature Importances, Model Benchmark Comparisons, and SHAP Summary Plots.
"""

import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for server/CLI environments
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import roc_curve, auc, confusion_matrix

PLOTS_DIR = os.path.join(os.path.dirname(__file__), "plots")
os.makedirs(PLOTS_DIR, exist_ok=True)

# Custom Aesthetic Color Palette
PRIMARY_COLOR = "#2E7D32"  # Forest Green
SECONDARY_COLOR = "#1565C0"  # Deep Blue
ACCENT_COLOR = "#D84315"  # Amber Orange
BACKGROUND_GRID = "#F4F6F7"

plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.sans-serif"] = ["DejaVu Sans", "Arial", "Helvetica"]

def plot_confusion_matrix(y_true, y_pred, model_name: str = "XGBoost Classifier", filename: str = "confusion_matrix.png") -> str:
    """
    Generates a beautifully styled Confusion Matrix heatmap with percentages and counts.
    """
    cm = confusion_matrix(y_true, y_pred)
    cm_norm = cm.astype("float") / cm.sum(axis=1)[:, np.newaxis]

    fig, ax = plt.subplots(figsize=(7, 6), dpi=300)
    
    # Custom annotations: "Count\n(Percentage%)"
    annot_matrix = np.empty_like(cm, dtype=object)
    labels = [["True Negative (TN)", "False Positive (FP)"], ["False Negative (FN)", "True Positive (TP)"]]
    
    for i in range(2):
        for j in range(2):
            annot_matrix[i, j] = f"{labels[i][j]}\n{cm[i, j]:,}\n({cm_norm[i, j]*100:.1f}%)"

    sns.heatmap(
        cm,
        annot=annot_matrix,
        fmt="",
        cmap="YlGnBu",
        cbar=True,
        linewidths=1.5,
        linecolor="white",
        ax=ax,
        annot_kws={"size": 11, "weight": "bold"}
    )

    ax.set_title(f"Confusion Matrix - {model_name}", fontsize=14, pad=15, weight="bold", color="#1A252C")
    ax.set_xlabel("Predicted Label", fontsize=12, labelpad=10, weight="bold")
    ax.set_ylabel("Actual Label", fontsize=12, labelpad=10, weight="bold")
    ax.set_xticklabels(["0: Low Risk (No Default)", "1: High Risk (Default)"], fontsize=10)
    ax.set_yticklabels(["0: Low Risk (No Default)", "1: High Risk (Default)"], fontsize=10, rotation=0)

    plt.tight_layout()
    output_path = os.path.join(PLOTS_DIR, filename)
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f"[Visuals] Saved Confusion Matrix to: {output_path}")
    return output_path

def plot_roc_curves(models_dict: dict, X_test, y_test, filename: str = "roc_curves.png") -> str:
    """
    Plots multi-model ROC-AUC comparison curves with area under curve annotations.
    """
    fig, ax = plt.subplots(figsize=(8, 6), dpi=300)
    colors = ["#2E7D32", "#1565C0", "#E65100", "#6A1B9A"]

    for idx, (name, model) in enumerate(models_dict.items()):
        if hasattr(model, "predict_proba"):
            y_proba = model.predict_proba(X_test)[:, 1]
            fpr, tpr, _ = roc_curve(y_test, y_proba)
            roc_auc = auc(fpr, tpr)
            ax.plot(
                fpr, tpr,
                label=f"{name} (AUC = {roc_auc:.4f})",
                color=colors[idx % len(colors)],
                linewidth=2.5
            )

    # Random baseline
    ax.plot([0, 1], [0, 1], linestyle="--", color="#9E9E9E", linewidth=1.5, label="Random Guess (AUC = 0.5000)")

    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel("False Positive Rate (1 - Specificity)", fontsize=12, weight="bold", labelpad=8)
    ax.set_ylabel("True Positive Rate (Sensitivity / Recall)", fontsize=12, weight="bold", labelpad=8)
    ax.set_title("Receiver Operating Characteristic (ROC) Comparison", fontsize=14, weight="bold", pad=15)
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.legend(loc="lower right", fontsize=10, frameon=True, facecolor="white", edgecolor="#D0D3D4")

    plt.tight_layout()
    output_path = os.path.join(PLOTS_DIR, filename)
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f"[Visuals] Saved ROC Curves to: {output_path}")
    return output_path

def plot_feature_importance(model, feature_names: list, filename: str = "feature_importance.png") -> str:
    """
    Plots horizontal feature importance bar chart for tree-based models.
    """
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
    else:
        return ""

    df_feat = pd.DataFrame({
        "Feature": feature_names,
        "Importance": importances
    }).sort_values(by="Importance", ascending=True)

    # Feature title mapping for human readability
    label_map = {
        "farmer_type_encoded": "Farmer Experience Track",
        "ndvi_5yr_avg": "5-Yr Satellite Biomass (NDVI)",
        "rainfall_mm": "Annual Monsoon Rainfall (mm)",
        "soil_npk_index": "Soil Fertility Index (NPK)",
        "crop_price_inr": "Mandi Crop MSP / Price (INR)"
    }
    df_feat["Feature_Label"] = df_feat["Feature"].map(lambda x: label_map.get(x, x))

    fig, ax = plt.subplots(figsize=(9, 5), dpi=300)
    bars = ax.barh(df_feat["Feature_Label"], df_feat["Importance"] * 100, color="#2E7D32", height=0.55, edgecolor="#1B5E20")

    # Add data labels
    for bar in bars:
        width = bar.get_width()
        ax.text(width + 0.8, bar.get_y() + bar.get_height()/2, f"{width:.1f}%", va="center", ha="left", fontsize=10, weight="bold", color="#1C2833")

    ax.set_xlim(0, max(df_feat["Importance"] * 100) + 10)
    ax.set_xlabel("Relative Importance (% Attribution)", fontsize=12, weight="bold", labelpad=8)
    ax.set_title("XGBoost Model Feature Importance Breakdown", fontsize=14, weight="bold", pad=15)
    ax.grid(axis="x", linestyle=":", alpha=0.6)

    plt.tight_layout()
    output_path = os.path.join(PLOTS_DIR, filename)
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f"[Visuals] Saved Feature Importance plot to: {output_path}")
    return output_path

def plot_metrics_summary(results_dict: dict, filename: str = "metrics_benchmark.png") -> str:
    """
    Plots a multi-metric comparison bar chart across trained models.
    """
    rows = []
    for model_name, metrics in results_dict.items():
        rows.append({
            "Model": model_name,
            "Accuracy": metrics.get("accuracy", 0) * 100,
            "Precision": metrics.get("precision", 0) * 100,
            "Recall": metrics.get("recall", 0) * 100,
            "ROC-AUC": metrics.get("roc_auc", 0) * 100
        })

    df_metrics = pd.DataFrame(rows)
    df_melt = pd.melt(df_metrics, id_vars=["Model"], var_name="Metric", value_name="Score (%)")

    fig, ax = plt.subplots(figsize=(10, 5.5), dpi=300)
    palette = ["#2E7D32", "#1565C0", "#F57C00", "#7B1FA2"]
    
    sns.barplot(data=df_melt, x="Metric", y="Score (%)", hue="Model", palette=palette, ax=ax, edgecolor="black", linewidth=0.5)

    for p in ax.patches:
        height = p.get_height()
        if height > 0:
            ax.annotate(f"{height:.1f}%", (p.get_x() + p.get_width() / 2., height - 8),
                        ha="center", va="center", fontsize=9, color="white", weight="bold")

    ax.set_ylim(0, 105)
    ax.set_title("Model Performance Benchmark Across Evaluation Metrics", fontsize=14, weight="bold", pad=15)
    ax.set_xlabel("Evaluation Metric", fontsize=12, weight="bold", labelpad=8)
    ax.set_ylabel("Score Percentage (%)", fontsize=12, weight="bold", labelpad=8)
    ax.grid(axis="y", linestyle=":", alpha=0.6)
    ax.legend(title="Model Architecture", loc="upper right", frameon=True, facecolor="white", edgecolor="#D0D3D4")

    plt.tight_layout()
    output_path = os.path.join(PLOTS_DIR, filename)
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f"[Visuals] Saved Metrics Benchmark to: {output_path}")
    return output_path

def generate_all_visuals(models_dict: dict, X_test, y_test, feature_names: list, results_dict: dict):
    """
    Master function to generate and refresh all evaluation visual artifacts.
    """
    print("\n" + "="*50)
    print("[VISUALS] GENERATING MODEL EVALUATION CHARTS")
    print("="*50)
    
    best_model = models_dict.get("XGBoost Classifier") or list(models_dict.values())[-1]
    best_name = "XGBoost Classifier" if "XGBoost Classifier" in models_dict else "Gradient Boosting"
    
    y_pred = best_model.predict(X_test)

    # 1. Confusion Matrix
    cm_path = plot_confusion_matrix(y_test, y_pred, model_name=best_name)

    # 2. ROC-AUC Curves
    roc_path = plot_roc_curves(models_dict, X_test, y_test)

    # 3. Feature Importance
    feat_path = plot_feature_importance(best_model, feature_names)

    # 4. Metrics Comparison
    metrics_path = plot_metrics_summary(results_dict)

    print(f"[Visuals Complete] All charts saved in directory: {PLOTS_DIR}\n")
    return {
        "confusion_matrix": cm_path,
        "roc_curves": roc_path,
        "feature_importance": feat_path,
        "metrics_summary": metrics_path
    }
