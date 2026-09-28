---
name: snowflake
description: Snowflake knowledge base (warehouses and cost, performance, tables, loading, streaming and Openflow, pipelines, access, governance, CLI and CI/CD, Snowpark, Snowflake ML feature engineering and custom inference, Cortex AI). Routed by rule://domain-router.
hide: true
kb:
  files: ['**/snowflake.yml', '**/snowflake.yaml', '**/connections.toml', '**/.snowflake/**']
  content:
    - { files: '**/*.py', pattern: '^\s*(?:from|import)\s+snowflake\b' }
    - { files: '**/*.ipynb', pattern: '\b(?:snowflake\.|SNOWFLAKE\.)', flags: i }
    - { files: '**/*.sql', pattern: '\b(?:SNOWFLAKE\.(?:CORTEX|ML|ACCOUNT_USAGE|CORE|TELEMETRY)|CREATE\s+(?:OR\s+(?:REPLACE|ALTER)\s+)?(?:WAREHOUSE|DYNAMIC\s+TABLE|PIPE|TASK|STREAM|STAGE|STORAGE\s+INTEGRATION|NETWORK\s+RULE|MASKING\s+POLICY|ROW\s+ACCESS\s+POLICY|CORTEX\s+SEARCH\s+SERVICE|OPENFLOW\s+CONNECTOR)|COPY\s+INTO|SNOWPIPE(?:\s+STREAMING)?|OPENFLOW|AI_[A-Z0-9_]+|CORTEX\s+(?:SEARCH|ANALYST|AGENT)|VARIANT|IS_ROLE_IN_SESSION|CURRENT_ROLE|TYPE\s*=\s*SERVICE|GRANT\b[^;\n]*\bTO\s+ROLE)\b', flags: i }
    - { files: '**/*.{yml,yaml}', pattern: '\bsnowflake\b', flags: i }
    - { files: '**/.sqlfluff', pattern: '^\s*dialect\s*=\s*snowflake\s*$', flags: i }
  commands: ['^(?:uv\s+run\s+)?snow\b', '^snowsql\b']
  mcp: ['mcp__snowflake_']
  topics:
    - file: warehouses.md
      content: [{ files: '**/*.{sql,yml,yaml}', pattern: '\b(?:WAREHOUSE|AUTO_SUSPEND|AUTO_RESUME|RESOURCE\s+MONITOR|QUERY_ACCELERATION|QUERY_TAG|CREDITS_USED_COMPUTE|COMPUTE\s+POOL)\b', flags: i }]
    - file: performance.md
      content: [{ files: '**/*.sql', pattern: '\b(?:QUERY_HISTORY|QUERY_INSIGHTS|GET_QUERY_OPERATOR_STATS|SYSTEM\$CLUSTERING_INFORMATION|SEARCH\s+OPTIMIZATION|MATERIALIZED\s+VIEW|PARTITIONS_SCANNED|PARTITIONS_TOTAL)\b', flags: i }]
    - file: tables.md
      content: [{ files: '**/*.sql', pattern: '\b(?:VARIANT|TIME\s+TRAVEL|FAILSAFE|DATA_RETENTION_TIME_IN_DAYS|CREATE\s+OR\s+(?:REPLACE|ALTER)\s+TABLE|ICEBERG|HYBRID\s+TABLE|UNDROP\s+TABLE|SECURE\s+VIEW)\b', flags: i }]
    - file: ingestion.md
      content:
        - { files: '**/*.sql', pattern: '\b(?:COPY\s+INTO|CREATE\s+STAGE|FILE\s+FORMAT|INFER_SCHEMA|SNOWPIPE|STORAGE\s+INTEGRATION|STRIP_NULL_VALUES|UNLOAD)\b', flags: i }
        - { files: '**/*.py', pattern: '\b(?:write_pandas|copy_into_table|snowflake\.connector\.pandas_tools)\b' }
    - file: streaming.md
      content:
        - { files: '**/*.sql', pattern: '\b(?:SNOWPIPE\s+STREAMING|OPENFLOW\s+CONNECTOR|CREATE\s+OPENFLOW\s+CONNECTOR|KAFKA)\b', flags: i }
        - { files: '**/*.{yml,yaml}', pattern: '\b(?:openflow|snowpipe\s+streaming|kafka)\b', flags: i }
        - { files: '**/*.py', pattern: '\b(?:StreamingIngestClient|snowflake\.ingest|kafka)\b', flags: i }
    - file: pipelines.md
      content:
        - { files: '**/*.sql', pattern: '\b(?:DYNAMIC\s+TABLE|CREATE\s+STREAM|CREATE\s+TASK|MERGE\s+INTO|CREATE\s+PROCEDURE|EXECUTE\s+TASK|SNOWFLAKE\s+SCRIPTING|CREATE\s+ALERT)\b', flags: i }
        - { files: '**/*.py', pattern: '\b(?:airflow\.providers\.snowflake|SnowflakeOperator)\b' }
    - file: access.md
      content: [{ files: '**/*.sql', pattern: '\b(?:CREATE\s+ROLE|GRANT\b[^;\n]*\bTO\s+ROLE|CREATE\s+USER|TYPE\s*=\s*SERVICE|WORKLOAD_IDENTITY|MFA|NETWORK\s+POLICY|PRIVATE\s+LINK|CREATE\s+SECURITY\s+INTEGRATION|CREATE\s+SECRET)\b', flags: i }]
    - file: governance.md
      content: [{ files: '**/*.sql', pattern: '\b(?:MASKING\s+POLICY|ROW\s+ACCESS\s+POLICY|IS_ROLE_IN_SESSION|TAG_REFERENCES|ACCESS_HISTORY|DATA\s+METRIC\s+FUNCTION|CREATE\s+SHARE|REPLICATION|FAILOVER)\b', flags: i }]
    - file: devops.md
      files: ['**/snowflake.yml', '**/snowflake.yaml', '**/connections.toml', '**/.snowflake/**', '**/.sqlfluff']
      content: [{ files: '**/*.{yml,yaml,toml}', pattern: '\bsnowflake\b', flags: i }]
      commands: ['^(?:uv\s+run\s+)?snow\b', '^snowsql\b']
    - file: snowpark.md
      content:
        - { files: '**/*.py', pattern: '\b(?:snowflake\.snowpark|Snowpark|Session\.builder|save_as_table|to_pandas)\b', flags: i }
        - { files: '**/*.ipynb', pattern: '\b(?:snowflake\.snowpark|Snowpark)\b', flags: i }
    - file: ml-features.md
      content:
        - { files: '**/*.py', pattern: '\b(?:snowflake\.ml\.feature_store|FeatureStore|generate_dataset|spine_timestamp_col|ASOF\s+JOIN)\b', flags: i }
        - { files: '**/*.sql', pattern: '\b(?:ASOF\s+JOIN|TIME_SLICE|RESAMPLE)\b', flags: i }
    - file: ml-models.md
      content:
        - { files: '**/*.py', pattern: '\b(?:snowflake\.ml\.registry|ModelRegistry|CustomModel|inference_api|MLJob|target_platforms|SPCS)\b', flags: i }
        - { files: '**/*.sql', pattern: '\b(?:CREATE\s+MODEL|MODEL\s+REGISTRY|MODEL_SERVING_USAGE_HISTORY)\b', flags: i }
    - file: cortex.md
      content:
        - { files: '**/*.sql', pattern: '\b(?:AI_COMPLETE|AI_CLASSIFY|AI_FILTER|AI_EMBED|AI_EXTRACT|CORTEX\s+SEARCH|CORTEX\s+ANALYST|CORTEX\s+AGENT|SNOWFLAKE\.CORTEX)\b', flags: i }
        - { files: '**/*.py', pattern: '\b(?:snowflake\.cortex|ai_complete|cortex)\b', flags: i }
---

# Snowflake KB

Defaults only: explicit instructions, AGENTS.md, repo config/conventions win; skill://python owns general Python style, skill://airflow DAG design, skill://terraform HCL. Read every topic whose trigger matches. Tags → skill://snowflake/sources.md.

## Topics

| trigger | read |
|---|---|
| `CREATE`/`ALTER WAREHOUSE`, warehouse type, size, Gen2, Snowpark-optimized, Adaptive, multi-cluster, `AUTO_SUSPEND`, QAS, statement timeouts, credits, resource monitors, budgets, cost attribution, `QUERY_TAG` | skill://snowflake/warehouses.md |
| slow or expensive queries, Query Profile, query insights, pruning, spilling, result cache, clustering keys, search optimization, materialized views | skill://snowflake/performance.md |
| table DDL and types (permanent, transient, temporary), data types, VARIANT, identifiers, constraints, Time Travel, Fail-safe, retention, cloning, `UNDROP`, `CREATE OR REPLACE`/`CREATE OR ALTER`, Iceberg, hybrid, external tables, secure views | skill://snowflake/tables.md |
| stages, storage and notification integrations, file formats, `COPY INTO`, Snowpipe, `INFER_SCHEMA`, schema evolution, unloading | skill://snowflake/ingestion.md |
| Snowpipe Streaming, Kafka connector, Openflow connectors and their CI/CD | skill://snowflake/streaming.md |
| dynamic tables, streams, tasks and task graphs, stored procedures, Snowflake Scripting, `MERGE`, alerts, notifications, dbt Projects on Snowflake, Airflow Snowflake provider | skill://snowflake/pipelines.md |
| roles, grants, ownership, future and inherited grants, users (`TYPE = SERVICE`), MFA, key pairs, OAuth, workload identity federation, PATs, network policies, Private Link, secrets, external access integrations | skill://snowflake/access.md |
| tags, masking, row access, projection, aggregation policies, classification, access history, lineage, data metric functions, data sharing, listings, replication, failover, backups | skill://snowflake/governance.md |
| Snowflake CLI (`snow`), `snowflake.yml`, `connections.toml`, account identifiers, Python connector, SQLAlchemy, Git repositories, `EXECUTE IMMEDIATE FROM`, DCM Projects, CI/CD pipelines | skill://snowflake/devops.md |
| Snowpark Python (`snowflake.snowpark`), DataFrames, pandas on Snowflake, UDFs, UDTFs, UDAFs, Python procedures, packages and artifact repositories, logging and tracing, Notebooks, Streamlit | skill://snowflake/snowpark.md |
| feature engineering, `ASOF JOIN`, time-series features, Feature Store (`snowflake.ml.feature_store`), entities, feature views, training sets, Datasets, `DataConnector`, online features | skill://snowflake/ml-features.md |
| model training (Container Runtime, ML Jobs, distributed training), experiment tracking, Model Registry (`snowflake.ml.registry`), custom models, inference (warehouse, SPCS services, batch jobs), REST endpoints, GPUs and compute pools, model monitoring, explainability, SQL ML functions | skill://snowflake/ml-models.md |
| Cortex AI functions (`AI_COMPLETE`, `AI_CLASSIFY`, `AI_FILTER`, `AI_EMBED`, `AI_EXTRACT`, …), LLM model access and cost, Cortex Search and RAG, Cortex Analyst, semantic views, Cortex Agents, MCP servers, vectors, fine-tuning | skill://snowflake/cortex.md |

## Core

- Syntax and APIs move fast: the SQL Reference and the versioned Python API reference beat memory, above all for Cortex AI functions, dynamic tables, Iceberg, Snowpark, and snowflake-ml-python 2.x. [IDX, REL:clients-drivers/snowpark-ml-2026]
- Code is environment-agnostic: connect with `connection_name` and the `<orgname>-<accountname>` identifier; databases, roles, warehouses, integrations, and model names for dev, tst, prd come from config or CLI/Jinja variables, never literals. [UG:admin-account-identifier, CLI:project-definitions/use-sql-variables, U]
- Snowflake accounts are read-only for agents: diagnostics are `SELECT`/`SHOW`/`DESCRIBE` under a read-only role; DDL, DML, `REFRESH`, `EXECUTE TASK`, grants, and account parameters need explicit permission. New packages or tools (connector, Snowpark, snowflake-ml-python, Snowflake CLI, PyPI repositories) need explicit approval, then `uv add`/`uv tool install`. [U]
- Service identities are `TYPE = SERVICE` users on workload identity federation (Azure managed identity), else named key pairs with `ROLE_RESTRICTION`; never passwords, which Phase 3 (rolling Aug–Oct 2026) blocks for non-human users. Humans use SSO with MFA. [SF:guides-overview-secure, UG:workload-identity-federation, UG:security-mfa-rollout]
- Privileges go to roles, never users: object privileges → access roles → functional roles → SYSADMIN, in managed access schemas; ACCOUNTADMIN is never a default role and never used by code or automation. [UG:security-access-control-considerations]
- Compute: one warehouse per workload class, named by workload; set `GENERATION`, `AUTO_SUSPEND`, `AUTO_RESUME`, statement timeouts, and QAS explicitly; resource monitors cap warehouses, budgets cover serverless and AI; object tags plus `QUERY_TAG` attribute cost. [UG:warehouses-considerations, UG:warehouses-gen2, UG:budgets, UG:cost-attributing]
- Diagnose before tuning (Query Profile, `QUERY_INSIGHTS`); fix the SQL first, then estimate with `SYSTEM$ESTIMATE_*` before paying for clustering, search optimization, or materialized views. [UG:query-insights, UG:performance-query-storage]
- Loading: external stages authenticate through storage integrations, never inline credentials; one file set loads through bulk COPY or Snowpipe, never both; files are 100–250 MB compressed. [UG:data-load-azure-config, UG:data-load-snowpipe-intro, UG:data-load-considerations-prepare]
- Pipelines: dynamic tables for declarative SQL with explicit `REFRESH_MODE` and `TARGET_LAG`; streams + tasks for procedural logic and upserts; `MERGE` sources deduped to one row per key. [UG:dynamic-tables/refresh-modes, UG:dynamic-tables/decision-guide, SQL:sql/merge]
- Governance: masking and row access policies test roles with `IS_ROLE_IN_SESSION`, live in one governance schema, and are applied by a policy-admin role. [UG:security-column-intro, SQL:functions/is_role_in_session]
- ML: training data is point-in-time (`spine_timestamp_col`) and versioned (`generate_dataset`); open-source frameworks train on Container Runtime (`snowflake.ml.modeling` estimators and preprocessing are deprecated since 2.0.0); every model is logged to the Registry, custom logic as `CustomModel`, and served by warehouse, SPCS service, or batch job, never by UDFs over staged pickles. [ML:feature-store/modeling, REL:clients-drivers/snowpark-ml-2026, ML:model-registry/overview]
- Cortex: `AI_*` functions only (legacy `SNOWFLAKE.CORTEX.*` LLM functions are deprecated by end of 2026); model access through model RBAC; size prompts with `AI_COUNT_TOKENS` and watch `CORTEX_AI_FUNCTIONS_USAGE_HISTORY`. [SQL:functions/complete-snowflake-cortex, REL:bcr-bundles/un-bundled/bcr-2378, CX:ai-func-cost-management]
- Snowflake SQL files: the quality gate lints with sqlfluff and needs the repo's `.sqlfluff` to declare `dialect = snowflake`. [U, SQLFLUFF]

## Diagnose (read-only)

Read-only role; `SNOWFLAKE.ACCOUNT_USAGE` views lag 45 min to 8 h and keep 365 days; `INFORMATION_SCHEMA` table functions are live but keep 7–14 days. [SQL:account-usage, U]

| question | query |
|---|---|
| slow, spilling, or poorly pruned queries | `ACCOUNT_USAGE.QUERY_HISTORY` (`partitions_scanned`/`partitions_total`, `bytes_spilled_to_remote_storage`); `TABLE(GET_QUERY_OPERATOR_STATS('<query_id>'))` |
| fixable query patterns | `ACCOUNT_USAGE.QUERY_INSIGHTS WHERE is_opportunity` |
| warehouse credits, idle time, queuing | `WAREHOUSE_METERING_HISTORY` (`CREDITS_USED_COMPUTE - CREDITS_ATTRIBUTED_COMPUTE_QUERIES`); `WAREHOUSE_LOAD_HISTORY` (`AVG_QUEUED_LOAD`) |
| who drove spend; billed truth | `QUERY_ATTRIBUTION_HISTORY` by `USER_NAME`, `QUERY_TAG`, `ROOT_QUERY_ID`; `METERING_DAILY_HISTORY.CREDITS_BILLED` |
| clustering and search optimization cost | `AUTOMATIC_CLUSTERING_HISTORY`; `SEARCH_OPTIMIZATION_HISTORY`; `SYSTEM$CLUSTERING_INFORMATION('<table>')` |
| storage churn, retention, clones | `TABLE_STORAGE_METRICS` (`ACTIVE_BYTES`, `FAILSAFE_BYTES`, `RETAINED_FOR_CLONE_BYTES`) |
| loads and pipes | `SYSTEM$PIPE_STATUS('<pipe>')`; `TABLE(INFORMATION_SCHEMA.COPY_HISTORY(TABLE_NAME => '<t>', START_TIME => ...))`; `PIPE_USAGE_HISTORY` |
| tasks and dynamic tables | `TABLE(INFORMATION_SCHEMA.TASK_HISTORY(TASK_NAME => '<t>', ERROR_ONLY => TRUE))`; `TABLE(INFORMATION_SCHEMA.DYNAMIC_TABLE_REFRESH_HISTORY(NAME_PREFIX => '<db>.<schema>', ERROR_ONLY => TRUE))`; `SHOW DYNAMIC TABLES` (`refresh_mode_reason`) |
| authentication exposure | `LOGIN_HISTORY` (`FIRST_AUTHENTICATION_FACTOR`, `SECOND_AUTHENTICATION_FACTOR`); `USERS` (`TYPE`, `HAS_MFA`, `HAS_PASSWORD`, `HAS_WORKLOAD_IDENTITY`) |
| privileged and direct grants | `GRANTS_TO_USERS WHERE ROLE = 'ACCOUNTADMIN'`; `GRANTS_TO_ROLES WHERE GRANTED_TO = 'USER'` |
| policies, tags, reads, data quality | `TABLE(INFORMATION_SCHEMA.POLICY_REFERENCES(REF_ENTITY_NAME => '<t>', REF_ENTITY_DOMAIN => 'table'))`; `TAG_REFERENCES`; `ACCESS_HISTORY`; `SNOWFLAKE.LOCAL.DATA_QUALITY_MONITORING_RESULTS` |
| Python runtime and packages | `INFORMATION_SCHEMA.PACKAGES WHERE LANGUAGE = 'python'`; `DESCRIBE FUNCTION <f>(<types>)`; `SNOWFLAKE.TELEMETRY.EVENTS_VIEW` |
| features, datasets, lineage | `fs.get_refresh_history(fv, verbose=True)`; `SHOW VERSIONS IN DATASET <d>`; `mv.lineage(direction="upstream")` |
| models and serving | `SHOW VERSIONS IN MODEL <m>` (`runnable_in`, `is_default_version`); `mv.list_services()`; `TABLE(<svc>!SPCS_GET_LOGS())`; `MODEL_SERVING_USAGE_HISTORY` |
| AI spend and model access | `CORTEX_AI_FUNCTIONS_USAGE_HISTORY`; `CORTEX_SEARCH_SERVING_USAGE_HISTORY`; `CORTEX_AGENT_USAGE_HISTORY`; `SHOW CORTEX BASE MODELS IN SCHEMA SNOWFLAKE.MODELS` |

[SQL:account-usage/query_history, SQL:account-usage/query_insights, SQL:account-usage/warehouse_metering_history, SQL:account-usage/query_attribution_history, SQL:account-usage/table_storage_metrics, SQL:functions/system_pipe_status, SQL:functions/copy_history, SQL:functions/task_history, UG:dynamic-tables/monitoring, SQL:account-usage/login_history, SQL:account-usage/users, SQL:account-usage/grants_to_users, UG:data-quality-results, DEV:udf/python/udf-python-packages, ML:ml-lineage, ML:inference/service-management, SQL:account-usage/cortex_ai_functions_usage_history]
