# Model training, registry, and inference

Tags → skill://snowflake/sources.md.

## Training

- Pin `snowflake-ml-python` (latest 2.1.0; 2.x needs Python >=3.10; `scikit-learn`/`xgboost`/`shap` are extras); `uv add` only with user approval. [REL:clients-drivers/snowpark-ml-2026, U]
- Train on Container Runtime (Notebook or ML Job) with open-source frameworks; `snowflake.ml.modeling` estimators are deprecated (2.0.0). [ML:train-models, REL:clients-drivers/snowpark-ml-2026]
- ML Jobs: `@remote(pool, stage_name=)`, `submit_file`, `submit_directory` return `MLJob` (`status`, `wait()`, `get_logs()`, `result()`); need CREATE SERVICE on schema, USAGE on pool and stage. [ML:ml-jobs/overview, ML:ml-jobs/access-control-requirements]
- Job packages: `artifact_repositories=["snowflake.snowpark.pypi_shared_repository"]` + `pip_requirements` (>=1.51.0, no egress) over EAIs; with both, only repositories apply. [ML:ml-jobs/overview]
- Scale out with `target_instances=N` (pool MAX_NODES >= N) and `snowflake.ml.modeling.distributors`/`snowflake.ml.modeling.tune`; register the native booster (`get_booster()`). [ML:ml-jobs/distributed-ml-jobs, ML:distributed-training, ML:container-hpo]
- Track runs with `ExperimentTracking(session)`: `set_experiment`, `with exp.start_run():`, `log_params`/`log_metrics`, `exp.log_model`. [ML:experiments]

## Logging models

- `Registry(session, database_name=, schema_name=)` on a per-env registry schema from config; needs CREATE MODEL. [ML:model-registry/overview, U]
- Pass `sample_input_data` or `signatures`; `infer_signature` reads 100 rows and drops all-NULL columns, so give sparse data an explicit `ModelSignature`. [ML:model-registry/model-signature]
- Set `target_platforms`: `target_platform.WAREHOUSE_ONLY`, `SNOWPARK_CONTAINER_SERVICES_ONLY`, or `BOTH_WAREHOUSE_AND_SNOWPARK_CONTAINER_SERVICES` (default since 2.0.0); WAREHOUSE fails at log time if unrunnable. [ML:model-registry/overview, REL:clients-drivers/snowpark-ml-2026]

| Avoid | Use |
|---|---|
| `conda_dependencies` + `pip_requirements` | one list; mixes build broken images [ML:inference/real-time-inference-troubleshooting] |
| Bare conda names on SPCS | SPCS resolves conda-forge (warehouse: Snowflake channel); `channel::pkg` [ML:model-registry/overview] |
| WAREHOUSE pip without repo | `artifact_repository_map={"pip": "snowflake.snowpark.pypi_shared_repository"}`, reused by SPCS builds [ML:model-registry/overview] |

- `options`: `relax_version` (default True: `==x.y.z` -> `>=x.y,<x+1`; False for version-sensitive pickles), `enable_explainability` (default False since 1.47.0); unknown keys raise. [ML:model-registry/overview, REL:clients-drivers/snowpark-ml-2026]
- Custom model methods default `VOLATILE`, which blocks incremental dynamic-table refresh; log `Volatility.IMMUTABLE` when deterministic. [ML:inference/native-batch-inference-sql]

## Custom models

- Subclass `custom_model.CustomModel`; pass objects/paths as `ModelContext(key=...)` kwargs (`artifacts=`/`models=` deprecated); read `self.context["key"]` in `__init__`, never a closure-captured model (serialized twice). [ML:model-registry/bring-your-own-model-types, DEV:snowpark-ml/reference/latest/api/model/snowflake.ml.model.custom_model.ModelContext]
- `@custom_model.inference_api`: pandas DataFrame in and out, always multi-row (requests are batched); one function per decorated method; keyword-only typed args with defaults become params (`mv.run(params=)`, SQL extra args, REST `"params"`). [ML:model-registry/bring-your-own-model-types]
- Ship helpers via `code_paths`; keep pre/post-processing and model chains inside one CustomModel. [ML:model-registry/overview, ML:model-registry/custom-processing-with-models]
- Replace UDFs that unpickle staged files with a CustomModel over the file: adds versions, RBAC, monitoring, SPCS serving. [ML:model-registry/overview]
- Partitioned: `@custom_model.partitioned_api` (`partitioned_inference_api` deprecated), `options={"function_type": "TABLE_FUNCTION"}`, `WAREHOUSE_ONLY`; call `mv.run(df, function_name=, partition_column=)` or `TABLE(m!predict(...) OVER (PARTITION BY c))`. [ML:model-registry/partitioned-models, ML:model-registry/overview]

## Promotion and access

- Promote dev->tst->prd by copy: `CREATE MODEL <prd> WITH VERSION V1 FROM MODEL <dev> VERSION V12`, then `ALTER MODEL ... ADD VERSION ... FROM MODEL` + `SET DEFAULT_VERSION` (rollback = old default). [ML:model-registry/model-management, SQL:sql/create-model, U]
- USAGE = warehouse inference only; READ = SPCS deploy/inference + metadata. [ML:model-registry/model-management]

## Inference

| Need | Use |
|---|---|
| SQL, dynamic tables, dbt; CPU, <=15 GB | warehouse: `MODEL(m, alias)!predict(...)`, `mv.run(df, function_name=)` [ML:inference/native-batch-inference-sql] |
| GPU, pip-only, >15 GB, HTTP | service: `svc!predict(...)`, `mv.run(df, service_name=)`, REST with `ingress_enabled=True` [ML:inference/native-batch-inference-sql] |
| Files, multimodal, backfills | `mv.run_batch(...)` [ML:inference/inference-overview] |

- `mv.create_service(service_name=, service_compute_pool=, image_build_compute_pool, image_repo, ingress_enabled=False, min_instances=0, max_instances=1, cpu_requests, memory_requests, gpu_requests, num_workers, max_batch_rows, force_rebuild=False, build_external_access_integrations, block=True, autocapture, inference_engine_options)`. [DEV:snowpark-ml/reference/latest/api/model/snowflake.ml.model.ModelVersion]
- Set `min_instances`/`max_instances` per env: 0 suspends after 30 min idle (cold start); prod >=1; HA >=3 or +50% on a `PLACEMENT_GROUP = 'DISTRIBUTED'` pool. [ML:inference/service-management, U]
- GPU: smallest node that fits, `gpu_requests="1"`, scale via `max_instances`, build on a CPU pool (`image_build_compute_pool`); Azure: `GPU_NV_XS` T4, `GPU_NV_SM` A10, `GPU_NV_2M`/`GPU_NV_3M`/`GPU_NV_SL` multi-GPU. [ML:inference/real-time-inference-rest-api, SPCS:instance-families-azure]
- Service specs are immutable; TABLE_FUNCTION methods aren't served online; drop services before their model versions. [ML:inference/service-management, ML:inference/real-time-inference-rest-api]
- SQL via a service: call from XSMALL/SMALL warehouses; grant service role `INFERENCE_SERVICE_FUNCTION_USAGE`. [ML:inference/native-batch-inference-sql]
- REST: URL from `mv.list_services()`, path = method with `_` -> `-`; header `Authorization: Snowflake Token="<PAT>"`; any auth failure is 404; grant service role `ALL_ENDPOINTS_USAGE`; send `dataframe_split` via `df.to_json(orient="split")`. [ML:inference/real-time-inference-rest-api]
- `run_batch` (2.x): `X` or `input_stage_location`, `compute_pool`, `output_spec=OutputSpec(stage_location=, mode=SaveMode.ERROR)`, `input_spec=InputSpec(params=, partition_column=)`, `job_name` -> `MLJob`; writes to internal `<stage_location>/<job_name>/`; read after `_SUCCESS`. [ML:inference/batch-inference-jobs]

## Monitoring, compute, SQL ML

- Explain: `options={"enable_explainability": True}` + `sample_input_data` (<=1,000 rows), then `function_name="explain"`; warehouse only (SPCS: batch jobs). [ML:model-registry/model-explainability, DEV:snowpark-ml/reference/latest/api/registry/snowflake.ml.registry.Registry]
- Monitor with `CREATE MODEL MONITOR`: set `task` at log time and BASELINE at create (drift needs it); one per version (<=250/account); TIMESTAMP_NTZ timestamps, NUMBER predictions, no NULL/NaN; suspends after 5 failed refreshes. [ML:model-registry/model-observability, SQL:sql/create-model-monitor]
- Compute pools bill in IDLE/ACTIVE/STOPPING/RESIZING; set `AUTO_SUSPEND_SECS` (default 3600, 0 = never); Azure current gen is `GEN_X64_G2_*` (`CPU_X64_*` previous). [SQL:sql/create-compute-pool, SPCS:accounts-orgs-usage-views, SPCS:instance-families-azure]
- `SNOWFLAKE.ML.FORECAST`/`ANOMALY_DETECTION`/`CLASSIFICATION` suit no-code SQL but live outside the Registry (FORECAST's algorithm is fixed); use Registry models for control, serving, monitoring. [SF:guides-overview-ml-functions, UG:ml-functions/forecasting, ML:model-registry/overview]
