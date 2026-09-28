---
description: "Custom inference goes through the Model Registry, not UDFs that unpickle staged models"
condition:
  - 'snowflake_import_directory[\s\S]{0,4000}?\b(?:pickle|joblib|cloudpickle)\.loads?\s*\('
  - '\bSnowflakeFile\.open\s*\([\s\S]{0,800}?\b(?:pickle|joblib|cloudpickle)\.loads?\s*\('
scope: "tool:edit(*.{py,sql,ipynb}), tool:write(*.{py,sql,ipynb})"
interruptMode: tool-only
---

Log the model to the Model Registry — wrap files and pre/post-processing in a `custom_model.CustomModel` with the file in `ModelContext` — and serve it with `mv.run(...)`, `MODEL(m, alias)!predict(...)`, `mv.create_service(...)`, or `mv.run_batch(...)`. The registry adds versions, RBAC, monitoring, explainability, and SPCS/GPU serving that a staged pickle lacks.

## Avoid

```python
import_dir = sys._xoptions["snowflake_import_directory"]
model = joblib.load(import_dir + "model.joblib")
```

## Use

```python
class ChurnModel(custom_model.CustomModel):
    def __init__(self, context: custom_model.ModelContext) -> None:
        super().__init__(context)
        self.model = joblib.load(self.context["model_file"])

    @custom_model.inference_api
    def predict(self, X: pd.DataFrame) -> pd.DataFrame:
        return pd.DataFrame({"score": self.model.predict_proba(X)[:, 1]})

mv = reg.log_model(ChurnModel(custom_model.ModelContext(model_file="model.joblib")), model_name="CHURN", version_name="V1", conda_dependencies=["scikit-learn"], sample_input_data=X, target_platforms=["WAREHOUSE"])
```

Details: skill://snowflake/ml-models.md.
Exception: models the registry can't express (document why in the PR).
