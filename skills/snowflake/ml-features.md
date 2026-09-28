# Feature engineering and Feature Store

Tags → skill://snowflake/sources.md. Model training and serving: skill://snowflake/ml-models.md.

## SQL feature engineering

- Time windows: `RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW` (gap-tolerant); `ROWS BETWEEN` only for last-N-rows features; in feature views prefer the aggregation API over hand-rolled windows or legacy `DataFrame.analytics` helpers. [UG:querying-time-series-data, ML:feature-store/examples]
- Point-in-time SQL joins: `ASOF JOIN r MATCH_CONDITION(l.ts >= r.ts) ON l.k = r.k`; operators `>= <= > <` only; unmatched rows are NULL-padded; tied right-side timestamps return an arbitrary row, so dedupe the right side. [SQL:constructs/asof-join]
- Downsample with `TIME_SLICE`/`DATE_TRUNC`; gap-fill with `RESAMPLE(USING ts INCREMENT BY INTERVAL '5 minutes' PARTITION BY k)` + `INTERPOLATE_FFILL|BFILL|LINEAR` over the same partitions; filter columns go in `PARTITION BY`. [UG:querying-time-series-data, SQL:constructs/resample]
- UDFs in managed feature views must be deterministic to refresh incrementally: SQL `IMMUTABLE`, Snowpark `immutable=True`. [ML:feature-store/examples]
- `snowflake.ml.modeling.preprocessing` transformers and `snowflake.ml.modeling.pipeline.Pipeline` (warehouse pushdown; fitted state such as `mean_` lives on the object) are deprecated since snowflake-ml-python 2.0.0; new code: SQL in feature views, or native scikit-learn logged to the Model Registry. [REL:clients-drivers/snowpark-ml-2026, DEV:snowpark-ml/reference/latest/api/modeling/snowflake.ml.modeling.preprocessing.StandardScaler]

## Feature Store setup

- Store = schema; managed feature view = dynamic table `NAME$VERSION`, external = view; entities and metadata = tags. [ML:feature-store/overview, ML:feature-store/replication-sharing]
- App code connects with `FeatureStore(session, database, name, default_warehouse)` (default `CreationMode.FAIL_IF_NOT_EXIST`); `CREATE_IF_NOT_EXIST` only when provisioning (database must exist, dedicated database eases replication); names from env config. [ML:feature-store/create, DEV:snowpark-ml/reference/latest/api/feature_store/snowflake.ml.feature_store.FeatureStore, U]
- Roles via `setup_feature_store(session, database, schema, warehouse, producer_role, consumer_role)`: producers create dynamic tables/views/tags/tables/datasets and OPERATE refreshes; consumers get USAGE, SELECT+MONITOR on dynamic tables, SELECT+REFERENCES on views, USAGE on datasets and warehouse. [ML:feature-store/rbac]
- `Entity(name, join_keys=[...], desc=...)` (not `keys=`); join keys are immutable; tag limits 10,000/account, 50/object. [DEV:snowpark-ml/reference/latest/api/feature_store/snowflake.ml.feature_store.Entity, ML:feature-store/entities]

## Feature views

| | Managed | External |
|---|---|---|
| `refresh_freq` | `"5 minutes"` (min 1 minute), cron + time zone, `DOWNSTREAM` | `None` |
| Backing | dynamic table, incremental when supported | view on your table (dbt), no extra storage |

- `feature_df` final projection = join keys + features + `timestamp_col`; set `timestamp_col` on every time-series view. [DEV:snowpark-ml/reference/latest/api/feature_store/snowflake.ml.feature_store.FeatureView]
- Incremental refresh needs change tracking on sources (auto-enabled only with OWNERSHIP) else `refresh_mode='FULL'`; queries a dynamic table can't maintain incrementally full-refresh (lag, cost): split them. [ML:feature-store/feature-views]
- `warehouse=` overrides the store default; `initialization_warehouse=` (1.45.0+) takes initial/reinit full scans; `initialize="ON_SCHEDULE"` defers the first build (replaces deprecated `block=`). [DEV:snowpark-ml/reference/latest/api/feature_store/snowflake.ml.feature_store.FeatureView]
- `register_feature_view(fv, version)`: versions of letters/digits/underscore, <=128 chars; definitions are immutable, so feature changes = new version; `overwrite=True` drops, recreates, and re-backfills; `update_feature_view` changes `refresh_freq`, `warehouse`, `desc`, `online_config`. [DEV:snowpark-ml/reference/latest/api/feature_store/snowflake.ml.feature_store.FeatureStore, ML:feature-store/feature-views]
- Document every view and feature: `desc=` plus `attach_feature_desc({...})` (Universal Search); delete a version only after consumers move off it. [ML:feature-store/feature-views]
- `ALTER SESSION SET TIMEZONE = 'UTC'` before offline `read_feature_view` on `TIMESTAMP_NTZ`/`TIMESTAMP_LTZ` views. [ML:feature-store/feature-views]

## Aggregations

- Tiled windows (1.24.0+): `features=[Feature.sum("AMOUNT", "7d").alias("SPEND_7D")]`, `feature_granularity="1h"`, `timestamp_col`, `refresh_freq`; also `min/max/count/avg`, `approx_count_distinct` (`precision` 4-21, default 8), `last_distinct_n` (offline only); windows and `offset=` are multiples of granularity; training sets need `join_method="cte"`; `refresh_freq` = slowest cadence meeting freshness. [ML:feature-store/advanced-feature-engineering]
- Rollups `RollupConfig(source=fv, mapping_df=df)` (1.26.0+), snapshot history `append_only=True` (1.41+; cron `refresh_freq`, extend-only schema, no `overwrite=True`), Iceberg `StorageConfig(format=StorageFormat.ICEBERG, external_volume=...)` (1.26.0+); stream and real-time views (Preview). [ML:feature-store/advanced-feature-engineering]

## Training data and retrieval

- Spine = entity keys + event timestamp + labels; pass `spine_timestamp_col` whenever views have `timestamp_col`: it drives the ASOF point-in-time join that prevents future-data leakage. [ML:feature-store/modeling, ML:feature-store/advanced-feature-engineering]

| | `generate_training_set` | `generate_dataset` |
|---|---|---|
| Output | lazy DataFrame; `save_as` -> mutable table | immutable `Dataset`, always materialized |
| Identity | none | `name`; `version` defaults to a timestamp |
| Use | exploration | reproducible training, lineage |

- Shared args: `spine_label_cols`, `exclude_columns`, `include_feature_view_timestamp_col=False`, `fv.slice([...])`; avoid column collisions with `auto_prefix=True` or `fv.with_name("p")`. [ML:feature-store/modeling, ML:feature-store/advanced-feature-engineering]
- Inference enrichment: `retrieve_feature_values(spine_df, features)` returns latest values; add `spine_timestamp_col` for backtests. [ML:feature-store/modeling]

## Online serving

- Hybrid-table online store (GA, 1.18.0+): `OnlineConfig(enable=True, target_lag="30 seconds")`, default store type; no aggregations, streams, or REST. [ML:feature-store/online-feature-store]
- Postgres Online Feature Store (Preview since 2026-07-10, 1.41+): `store_type=OnlineStoreType.POSTGRES`; `fs.create_online_service(producer_role, consumer_role, size=...)` once per store, bills until `drop_online_service()`; name+version <=46 chars; reads need the `[feature_store]` extra (httpx, approval required). [ML:feature-store/online-feature-store, REL:2026/other/2026-07-10-online-feature-store-preview, U]
- Online lag ~ `refresh_freq` + `target_lag` (10 seconds to 8 days); 5 consecutive sync failures suspend the online table. [ML:feature-store/online-feature-store]
- Feature groups (Preview; Postgres views only) give identical columns via `read_feature_group` and `generate_training_set(feature_group=fg)`. [ML:feature-store/feature-groups]

## Datasets and loading

- `dataset.create_from_dataframe(session, name, version, input_dataframe=df)` (GA 2025-03-20): immutable Parquet versions; storage billed, delete unused; CREATE DATASET to create, OWNERSHIP to add/drop versions, USAGE to read. [ML:dataset, REL:2025/other/2025-03-20-snowflake-ml-datasets]
- Read the selected version: `ds.read.to_pandas()`, `to_torch_dataset(batch_size=...)`, `to_tf_dataset(batch_size=...)`, `to_snowpark_dataframe()`, `files()` + `filesystem()` for fsspec. [DEV:snowpark-ml/reference/latest/api/dataset/snowflake.ml.dataset.DatasetReader, ML:dataset]
- `DataConnector.from_dataframe(df)` in development, `DataConnector.from_dataset(ds)` in production; pass connectors straight to Container Runtime distributed trainers; `FileSet` is deprecated. [ML:load-data, REL:clients-drivers/snowpark-ml-2026]
- ML Lineage (Enterprise+, VIEW LINEAGE) auto-links source -> feature view -> dataset -> model; `obj.lineage(direction="upstream", domain_filter=["feature_view"])`; not replicated. [ML:ml-lineage]
