---
description: "snowflake-ml-python 2.x: deprecated modeling estimators, preprocessing, and ML API arguments"
condition:
  - '\bsnowflake\.ml\.modeling\.(?:preprocessing|pipeline|impute|linear_model|ensemble|tree|svm|neighbors|naive_bayes|cluster|decomposition|xgboost|lightgbm|model_selection|feature_selection|compose|covariance|discriminant_analysis|gaussian_process|isotonic|kernel_approximation|kernel_ridge|manifold|mixture|multiclass|multioutput|neural_network|semi_supervised|calibration)\b'
  - '\bfrom\s+snowflake\.ml\.modeling\s+import\s+[^\n]*\b(?:preprocessing|pipeline|impute|linear_model|ensemble|tree|svm|neighbors|xgboost|lightgbm|model_selection)\b'
  - '\bregister_feature_view\s*\([^)]{0,400}?\bblock\s*='
  - '@custom_model\.partitioned_inference_api\b'
  - '\bModelContext\s*\(\s*(?:artifacts|models)\s*='
scope: "tool:edit(*.{py,ipynb}), tool:write(*.{py,ipynb})"
interruptMode: tool-only
---

Use the current snowflake-ml-python 2.x APIs.

| avoid | use |
|---|---|
| `snowflake.ml.modeling.preprocessing` / `.pipeline` / estimator modules (`linear_model`, `xgboost`, …) | SQL or feature views for transforms; native scikit-learn, XGBoost, LightGBM trained on Container Runtime and logged to the Model Registry; `snowflake.ml.modeling.distributors` and `.tune` stay current |
| `fs.register_feature_view(fv, version="V1", block=False)` | `FeatureView(..., initialize="ON_SCHEDULE")`, then `register_feature_view(fv, version="V1")` |
| `@custom_model.partitioned_inference_api` | `@custom_model.partitioned_api` |
| `ModelContext(artifacts={...}, models={...})` | `ModelContext(model_file="...", encoder=enc)` (keyword args) |

Details: skill://snowflake/ml-features.md, skill://snowflake/ml-models.md.
Exception: maintenance of code pinned below snowflake-ml-python 2.0.0 without an upgrade request.
