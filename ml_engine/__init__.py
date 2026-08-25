"""
KisanScore ML Engine Package
Contains preprocessing, XGBoost model training, evaluation, SHAP explainability, and inference API service.
"""

from .inference import get_application_score, batch_score_applications
from .generate_shap import explain_prediction, calculate_kisan_score
from .preprocess import load_and_preprocess_data, transform_single_input
from .train import train_and_evaluate_models
from .evaluate import run_evaluation

__all__ = [
    "get_application_score",
    "batch_score_applications",
    "explain_prediction",
    "calculate_kisan_score",
    "load_and_preprocess_data",
    "transform_single_input",
    "train_and_evaluate_models",
    "run_evaluation"
]
