---
description: "Feature Store training sets are point-in-time: pass spine_timestamp_col"
condition:
  - '(?<!def )\b(?:generate_training_set|generate_dataset)\s*\((?![\s\S]{0,600}?\bspine_timestamp_col\b)'
scope: "tool:edit(*.{py,ipynb}), tool:write(*.{py,ipynb})"
interruptMode: tool-only
---

Pass `spine_timestamp_col` whenever a feature view has `timestamp_col`: it drives the ASOF join that returns each feature as of the spine row's event time. Without it the latest values join and future data leaks into training.

## Avoid

```python
ds = fs.generate_dataset(name="CHURN_TRAIN", spine_df=spine, features=[fv_orders], spine_label_cols=["CHURNED"])
```

## Use

```python
ds = fs.generate_dataset(
    name="CHURN_TRAIN",
    spine_df=spine,
    features=[fv_orders],
    spine_timestamp_col="EVENT_TS",
    spine_label_cols=["CHURNED"],
)
```

Train from `generate_dataset` (immutable, versioned) for reproducibility; `generate_training_set` for exploration. Details: skill://snowflake/ml-features.md.
Exception: feature views without `timestamp_col` (static attributes only).
