# Snowflake domain knowledge (JIT skill pack + router row + TTSR), incl. AI engineering

## Context
Add Snowflake as a domain of the omp JIT domain-knowledge framework in `C:/Users/jpollock/.omp/agent/` (live domains: python, coding-entropy, databricks-platform, databricks-silver-modeling, terraform, airflow). The user requires AI engineering coverage (custom inference, feature engineering, LLM features) alongside platform best practices. Deliverables: hidden skill pack `skill://snowflake` (index + topic files + `sources.md`), one router row, non-interrupting `sf-` TTSR reminders, and the quality-gate SQLFluff hint naming `snowflake`. Content is grounded in docs.snowflake.com (found through https://docs.snowflake.com/llms.txt section indexes), Snowflake release notes, and Snowflake blog/developer guides only where docs lack a point; verified 2026-09-25.

## Findings (verified this session)

### Framework contract (files read this session)
- Router `C:/Users/jpollock/.omp/agent/rules/domain-router.md` (13 lines): frontmatter `alwaysApply: true`; header `Domain KB: before first edit/review/plan touching a trigger → read skill://<domain>, then topics its index selects. Once per context; re-read after compaction. Repo config > AGENTS.md > KB.`; blank line; `| domain | triggers | read |`; `|---|---|---|`; rows in order python, coding-entropy, databricks-platform, databricks-silver-modeling, terraform, airflow. Row = `| <domain> | <globs>; <keywords> | skill://<domain> |`.
- Pack shape (`skills/databricks-platform/SKILL.md`, `skills/airflow/SKILL.md` via its plan): frontmatter `name`, `description` ending `Routed by rule://domain-router.`, `hide: true`; `# <Name> KB`; precedence line `Defaults only: explicit instructions, AGENTS.md, repo config/conventions win; … Read every topic whose trigger matches. Tags → skill://<domain>/sources.md.`; `## Topics` table `| trigger | read |`; `## Core` bullets ending `[TAG, …]`; `## Diagnose` table; optional `## Local platform`.
- Topic file: `# <Title>`, `Tags → skill://<domain>/sources.md.` (+ optional cross-KB pointer), `##` sections of tagged bullets. `sources.md`: `# <Name> KB sources`, verification line, `| tag | source |` legend, `## Snapshot`, `## Conflicts resolved`.
- TTSR rule (`rules/dbp-liquid-clustering.md`, `rules/af-env-literals.md`): frontmatter `description` (double-quoted), `condition` list of single-quoted JS regexes, `scope: "tool:edit(<glob>), tool:write(<glob>)"`, `interruptMode: never`; body = one-line rule, `## Avoid`/`## Use` code blocks or an avoid/use table, KB pointer, `Exception:` line. Existing prefixes: `af-`, `dbp-`, `dbx-silver-`, `py-`, `tf-`; no `sf-*` file exists.
- omp mechanics (recorded by the implemented airflow plan, `sessions/-src/2026-09-25T19-37-08-266Z_01a0da12-4faa-7633-8cde-e3eb0c931752/local/airflow-astro-domain-knowledge-plan.md` L13-16): skills one level deep, `hide: true` hides from the prompt listing while `skill://` URIs resolve, discovered at process start; `condition` makes a rule TTSR-only; leading `(?i)` becomes a regex flag; `interruptMode: never` → one `<system-reminder reason="rule_violation">` per session; CLI `omp ttsr list|test|scan`, `omp read skill://…`, headless `omp -p --no-session [--mode json]`.
- Consumers: `agents/code-review.md` §2 reads `rule://domain-router` at run time and selects rows by trigger → no edit needed. `agents/quality-gate.md` L87 blocker detail says `Needs a .sqlfluff with dialect = tsql or databricks.` → misleading for Snowflake SQL.
- Pending, unexecuted plan `sessions/-.omp-agent/2026-09-25T20-32-37-673Z_01a0da45-1d29-7774-81a0-6b3a1f91505e/local/harness-determinism-plan.md` would move routing into `extensions/domain-router.ts` + `extensions/lib/domains.ts` (`DomainName` union, path/content/command/MCP trigger tables), rewrite the router body to a semantic-trigger table, add `autoloadSkills` to `agents/code-review.md`, and port the gate to `extensions/lib/gate-runner.ts` with the same dialect strings (its L278, L306). Today `extensions/` holds only `quality-gate.ts` → this plan targets the markdown router and carries a contingency for the extension form.

### Snowflake sources
- https://docs.snowflake.com/llms.txt: section indexes (user guide, loading, Cortex, Snowflake ML, Snowpark, SPCS, CLI, developer guide, SQL commands/functions/general, account usage, SQL classes, connectors, release notes); page markdown at `https://docs.snowflake.com/en/<path>.md`. Its LLM notes: prefer SQL Reference over memorized syntax (Cortex AI functions, dynamic tables, Iceberg); use `<orgname>-<accountname>` identifiers in new code; verify Snowpark API signatures against the versioned reference.
- SQLFluff dialect label `snowflake` exists (https://docs.sqlfluff.com/en/stable/reference/dialects.html: "Label: `snowflake`", default casing UPPERCASE).

### User environment (read-only audit)
- No Snowflake footprint: no `snowflake` match in `C:/Users/jpollock/src` (excluding `.venv`), skills, rules, agents, extensions; no Snowflake MCP server in `C:/Users/jpollock/.omp/agent/mcp.json` (servers: atlassian, airflow-{dev,tst,prd}, databricks-sql-{dev,tst,prd}, agent-sql-server); no `C:/Users/jpollock/.snowflake/`. → KB is generic: no `## Local platform` section; `[U]` lines carry only AGENTS.md policy (dev/tst/prd separation, read-only external services, uv-only Python, no new dependencies without approval, Azure/Azure DevOps/Entra ID, Airflow on Astronomer).
- KB content constraint carried from the airflow KB session (user): no absence claims ("not configured", "not used") and no point-in-time local file references (clone paths, file:line) — they go stale.
- Prior user interest (session `sessions/-src/2026-09-25T20-50-24-648Z_01a0da55-6508-73c4-a223-dfe322949f47.jsonl`): "snowflake openflow - does it support cicd?" → answered from docs: Openflow Gen 2 connectors are SQL-managed, config in a Git repository stage, versioned promotion via `COMMIT`, secrets as Snowflake SECRET objects; documented for Gen 2 only. The ingestion and devops topics carry it.
- Existing TTSR rules vs Snowflake snippets (static regex review of every `*.sql`/`*.py`-scoped rule): no `af-`/`dbp-`/`dbx-silver-` condition matches typical Snowflake SQL (`GRANT … TO ROLE`, `CLUSTER BY`, `COPY INTO`, `MERGE`, `DATA_RETENTION_TIME_IN_DAYS`, `CREATE DYNAMIC TABLE`) or Snowpark calls (`save_as_table`, `to_pandas`, `cache_result`); generic `py-*` rules (e.g. `py-sql-parameters`, `py-unsafe-deserialization`) apply to Snowpark code as intended.


### KB design (decided)
- Domain id `snowflake`; skill dir `C:/Users/jpollock/.omp/agent/skills/snowflake/`; TTSR prefix `sf-` (unused today).
- 15 skill files: `SKILL.md` (index: Topics, Core, Diagnose), 13 topics — `warehouses.md` (compute, cost), `performance.md`, `tables.md`, `ingestion.md` (files, stages, COPY, Snowpipe, unloading), `streaming.md` (Snowpipe Streaming, Kafka, Openflow incl. gen 2 CI/CD), `pipelines.md` (dynamic tables, streams, tasks, procedures, dbt Projects, Airflow provider), `access.md`, `governance.md`, `devops.md` (CLI, connections, drivers, Git, DCM, CI/CD), `snowpark.md`, `ml-features.md` (feature engineering, Feature Store, Datasets), `ml-models.md` (training, Model Registry, custom models, inference/serving, monitoring, SPCS GPUs), `cortex.md` (AI functions, Search/RAG, Analyst, Agents, vectors) — and `sources.md` (tag legend, Snapshot, Conflicts resolved).
- AI engineering = Snowflake ML (feature engineering, custom inference through the Model Registry, SPCS serving) plus Cortex AI; both are first-class topics and Core rules.
- 15 non-interrupting `sf-` reminders target mistakes current models make from stale training data or that are costly/unsafe: ACCOUNTADMIN use, password/literal-host connections, inline stage credentials, unsafe COPY options, implicit dynamic-table refresh mode, renamed SQL, legacy Cortex functions, SnowSQL, `CURRENT_ROLE()` in policies, point-in-time leakage, deprecated snowflake-ml-python 2.x APIs, UDF-over-pickle inference, removed Airflow `SnowflakeOperator`, never-suspending compute/unscoped search optimization, zero container retention. Every condition uses Snowflake-only tokens; negatives cover Databricks SQL, T-SQL, and generic Python.
- Drafts (source of truth for Steps 2–3) were written this session from 12 parallel research drafts, reviewed, split (`streaming.md` out of `ingestion.md`), and trimmed: `C:/Users/jpollock/.omp/agent/sessions/-src/2026-09-25T21-10-32-962Z_01a0da67-d502-7041-9019-0bbfbfa3637e/local/snowflake-kb/` (15 skill files; its `_reports/` and `_plan/` subfolders hold research notes and plan fragments, not deliverables) and its `rules/` subfolder (15 rules). No TTSR case was executed during planning (AGENTS.md: the planner never performs evaluation); Verification runs them.

## Approach
Steps 1–4 are independent after Step 0. Write every file UTF-8, LF line endings, one trailing newline, byte-identical to its draft; the fenced blocks below (content = lines between the opening four-backtick `markdown` fence and its closing four-backtick fence, both exclusive; inner three-backtick blocks are file content) are the same bytes and the fallback source. Files live outside git: the plan-end quality gate reporting "Not a git repository" is expected, not a blocker.

### 0. Preflight (read-only)
1. If `C:/Users/jpollock/.omp/agent/skills/snowflake/SKILL.md` exists and its `description` does not start with `Snowflake knowledge base`, stop and report the conflict. Otherwise continue (re-runs overwrite this pack).
2. Glob `C:/Users/jpollock/.omp/agent/rules/sf-*.md`: any file whose name is not one of the 15 in Step 3 → install the 15 rules as `snowflake-<rest>.md` (e.g. `snowflake-accountadmin.md`; names only, contents unchanged) and use those names in Verification.
3. If `C:/Users/jpollock/.omp/agent/rules/dbp-liquid-clustering.md` contains `interruptMode: tool-only`, the harness-determinism rework has landed: install every `sf-` rule with `interruptMode: never` replaced by `interruptMode: tool-only` (the only permitted content change) and compare against drafts with that one substitution applied.
4. If `C:/Users/jpollock/.omp/agent/extensions/lib/domains.ts` exists, also run Step 5.
5. Either draft directory missing, or not holding exactly its 15 `.md` files (count only `.md` files directly inside; subfolders such as `_reports/`, `_plan/`, `rules/` are ignored), → write that group from the fenced blocks instead of copying, then check each file's SHA-256 against the manifest in Step 2 or Step 3.

### 1. Upsert the router row
Re-read the router immediately before editing (sibling sessions edit it); keep that content as BEFORE. Router = `C:/Users/jpollock/.omp/agent/rules/domain-router.md`; if absent but another `C:/Users/jpollock/.omp/agent/rules/*.md` contains a line starting `Domain KB:`, that file is the router.
- Router present → replace the row whose first cell is `snowflake`, else append this row after the last table row. Touch nothing else (frontmatter, header, separator, other rows):
````markdown
| snowflake | snowflake.yml snowflake.yaml connections.toml .snowflake/**; Snowflake SQL (warehouses, stages, COPY INTO, Snowpipe, streams, tasks, dynamic tables, VARIANT, roles and grants, masking and row access policies), Snowpark (snowflake.snowpark), Snowflake CLI (snow), snowflake-connector-python, Openflow, Snowflake ML (snowflake.ml: Feature Store, Model Registry, custom models, inference, SPCS model serving, ML Jobs), Cortex AI (AI_COMPLETE and AI_* functions, Cortex Search, Cortex Analyst, Cortex Agents), Snowflake cost, performance, security, governance, Airflow Snowflake provider | skill://snowflake |
````
- Router absent → write this exact file as `domain-router.md`:
````markdown
---
alwaysApply: true
---
Domain KB: before first edit/review/plan touching a trigger → read skill://<domain>, then topics its index selects. Once per context; re-read after compaction. Repo config > AGENTS.md > KB.

| domain | triggers | read |
|---|---|---|
| snowflake | snowflake.yml snowflake.yaml connections.toml .snowflake/**; Snowflake SQL (warehouses, stages, COPY INTO, Snowpipe, streams, tasks, dynamic tables, VARIANT, roles and grants, masking and row access policies), Snowpark (snowflake.snowpark), Snowflake CLI (snow), snowflake-connector-python, Openflow, Snowflake ML (snowflake.ml: Feature Store, Model Registry, custom models, inference, SPCS model serving, ML Jobs), Cortex AI (AI_COMPLETE and AI_* functions, Cortex Search, Cortex Analyst, Cortex Agents), Snowflake cost, performance, security, governance, Airflow Snowflake provider | skill://snowflake |
````

### 2. Skill pack
`mkdir -p C:/Users/jpollock/.omp/agent/skills/snowflake`, then copy the 15 drafts: `cp C:/Users/jpollock/.omp/agent/sessions/-src/2026-09-25T21-10-32-962Z_01a0da67-d502-7041-9019-0bbfbfa3637e/local/snowflake-kb/*.md C:/Users/jpollock/.omp/agent/skills/snowflake/` (the glob matches exactly the 15 skill files; subfolders are not matched). No equivalent skill exists (`skills/` holds airflow, coding-entropy, databricks-platform, databricks-silver-modeling, python, terraform).


SHA-256 manifest (UTF-8, LF):

| file | bytes | sha256 |
|---|---|---|
| `skills/snowflake/SKILL.md` | 10719 | `cc33a80983f574fb4231eb79a33f591a51a5d06d723aae5242821d4026a8a9b5` |
| `skills/snowflake/warehouses.md` | 7133 | `36c02bfa257a0bb39632833bab1723c69601d864d6b03bc17213f2f00a5d4f43` |
| `skills/snowflake/performance.md` | 7389 | `42414871c18cd0cc0089395a6efb86b67f7e10487490b7d80f6764cfd227e860` |
| `skills/snowflake/tables.md` | 6993 | `5e9f9325887f37c2974d62cc6918c70e8bd65830483000541356f1360f03044e` |
| `skills/snowflake/ingestion.md` | 9011 | `20801b9473cdfee8fb5fbfd4822cee6bb1f9e6eeb5d26c21f15f8132ee85e3b6` |
| `skills/snowflake/streaming.md` | 4180 | `f09082f7b880812fe770335e67989f1c327e169737a4165c0f9b152d796d4d7c` |
| `skills/snowflake/pipelines.md` | 9792 | `14425fb0a96138dac7334046fc206815187d388a48d93d9986128ee0d3e83c77` |
| `skills/snowflake/access.md` | 7302 | `b809444a0c687b094351b4a1eef697663e8df8d3303e0d77a860f35598b066af` |
| `skills/snowflake/governance.md` | 9312 | `51961de56e1ae3d44a2b3263384c45ae084f62cb0391d9c55c187a877bf71011` |
| `skills/snowflake/devops.md` | 7341 | `5a382625964e3a65a3e01dce6dfcdb2dd21d9148e8e257e7ebdf3e27e5052302` |
| `skills/snowflake/snowpark.md` | 8067 | `30c6313fcdb32e0dbfc900099e2df216734570a9c8cf27f5312de48de50cbba1` |
| `skills/snowflake/ml-features.md` | 8309 | `3555e25c0c3e11ed45a00276fb893cc35166911e4c9f1590d651141123c40a3e` |
| `skills/snowflake/ml-models.md` | 8052 | `b447e4281a45c1ce8734d425dfba499d750c300f57cbb87869904c12caeca6ed` |
| `skills/snowflake/cortex.md` | 8189 | `d34f2ef946a2cb3c087bbfad20588f4ffa08e7122cbacd852b0f0c1343178d20` |
| `skills/snowflake/sources.md` | 11434 | `0646fab4399fa4956c9ee694772277bc95783fb8b8613ae373ce6ab174b6b729` |

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/SKILL.md`
````markdown
---
name: snowflake
description: Snowflake knowledge base (warehouses and cost, performance, tables, loading, streaming and Openflow, pipelines, access, governance, CLI and CI/CD, Snowpark, Snowflake ML feature engineering and custom inference, Cortex AI). Routed by rule://domain-router.
hide: true
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
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/warehouses.md`
````markdown
# Compute and cost
Tags → skill://snowflake/sources.md. Warehouse grant design → skill://snowflake/access.md.

## Warehouse types
| Type | Use for | Gate |
|---|---|---|
| Standard `GENERATION = '2'` | Default for SQL, ETL, BI; `'1'` only for X5LARGE/X6LARGE or regions/failover targets without Gen2 | GA [UG:warehouses-gen2] |
| `'SNOWPARK-OPTIMIZED'` | Memory- or CPU-arch-bound Snowpark, single-node ML training | 1 TB Preview, AWS only [UG:warehouses-snowpark-optimized] |
| `ADAPTIVE` | Bursty mixed BI/ETL without size, cluster, QAS, suspend tuning | Enterprise+, select regions [UG:warehouses-adaptive] |
| `CREATE INTERACTIVE WAREHOUSE` | Low-latency dashboards/APIs on interactive tables | 5 s statement cap, 1 h minimum billing [UG:interactive] |

- Always set `GENERATION = '2'` (quoted) unless a Gen1 case applies; omitted means `'2'` where available, existing Gen1 stays Gen1. [UG:warehouses-gen2, REL:bcr-bundles/2026_03/bcr-2250]
- Changing `GENERATION`, `RESOURCE_CONSTRAINT`, or `WAREHOUSE_TYPE` on a running warehouse bills old and new compute until in-flight queries end; suspend first. [UG:warehouses-gen2]
- Snowpark-optimized `RESOURCE_CONSTRAINT`: `MEMORY_1X` 16 GB (XSMALL+), `MEMORY_16X` 256 GB (MEDIUM+, default), `MEMORY_64X` 1 TB (LARGE+); `_x86` variants pin CPU. [UG:warehouses-snowpark-optimized]
- Adaptive: tune `MAX_QUERY_PERFORMANCE_LEVEL` (default `XLARGE`) and `QUERY_THROUGHPUT_MULTIPLIER` (default `2`, `0` = unlimited); billed per query; convert online; keep HTAP-heavy on Gen2. [UG:warehouses-adaptive]

## Sizing and isolation
- One warehouse per workload class (load, transform, BI, ad hoc, app, Snowpark), each running homogeneous queries. [UG:warehouses-considerations, BLOG:managing-snowflakes-compute-resources]
- Size by experiment: run the same representative 5-10 min queries on several sizes; each size step doubles credits/hour. [UG:warehouses-considerations, UG:warehouses-overview]
- Scale up (resize) for slow complex queries, out (multi-cluster) for concurrency; resizing skips running queries; downsizing drops cache. [UG:warehouses-considerations]
- Name by workload (`transform_wh`, `loader_wh`), never by size; per-env names and sizes come from config, never literals. [BLOG:managing-snowflakes-compute-resources, U]
- Set `DEFAULT_WAREHOUSE` on every user, service users included; client config overrides it, connection parameters override both. [UG:warehouses-overview]

## Suspend, resume, billing
- Per-second billing with a 60 s minimum per start or resume; resizing up bills 60 s of the added compute. [UG:cost-understanding-compute]
- `AUTO_SUSPEND` (seconds, default `600`, checked ~30 s): tasks `60`, ad hoc/data science ~`300`, BI >= `600` (cache); below regular query gaps it re-bills the minimum each resume; `0`/`NULL` never suspends; keep `AUTO_RESUME = TRUE`. [SQL:sql/create-warehouse, UG:performance-query-warehouse-cache, UG:warehouses-considerations]
- Create with `INITIALLY_SUSPENDED = TRUE` (default `FALSE` starts it running); `OR REPLACE` aborts running queries. [SQL:sql/create-warehouse]

## Multi-cluster (Enterprise+)
- Auto-scale every warehouse: `MIN_CLUSTER_COUNT = 1`, `MAX_CLUSTER_COUNT` 2-3, then raise from observed load; `MIN` > 1 only for HA; Maximized (`MIN = MAX`) only for flat high concurrency. [UG:warehouses-considerations, UG:warehouses-multicluster]
- `SCALING_POLICY = STANDARD` (default) adds clusters when queries queue; `ECONOMY` adds only when >= 6 min of load is estimated; use it where queuing is acceptable. [UG:warehouses-multicluster]

## QAS, concurrency, timeouts
- QAS (Enterprise+) offloads big selective scans and bulk DML/COPY to separately billed serverless compute; cap via `QUERY_ACCELERATION_MAX_SCALE_FACTOR` (`0` = none); test with `SYSTEM$ESTIMATE_QUERY_ACCELERATION('<query_id>')`. [UG:query-acceleration-service]
- Set `ENABLE_QUERY_ACCELERATION` explicitly: new Gen2/multi-cluster auto-enable at factor `2`, bundle 2026_06 at `8` for all new standard; ALTER never toggles it. [REL:bcr-bundles/un-bundled/bcr-2113, REL:bcr-bundles/2026_06/bcr-2373]
- `MAX_CONCURRENCY_LEVEL` (default `8`): lower it for heavy multi-statement jobs; in Auto-scale, reaching it starts clusters. [SQL:parameters]
- `STATEMENT_TIMEOUT_IN_SECONDS` (default `172800`; `0` means the `604800` max) spans queue, compile, and run; set it per warehouse to the workload SLA; lowest non-zero of warehouse and session wins. [SQL:parameters, UG:cost-controlling-controls]
- `STATEMENT_QUEUED_TIMEOUT_IN_SECONDS` (default `0`, never): set it on ad hoc and BI warehouses. [SQL:parameters, BLOG:managing-snowflakes-compute-resources]

## Spend controls
- Resource monitors cover warehouses only (plus their cloud services, unadjusted); one per warehouse plus one account monitor; only ACCOUNTADMIN creates and assigns them. [UG:resource-monitors, UG:security-access-control-privileges]
- Suspend below quota (`TRIGGERS ON 90 PERCENT DO SUSPEND`) since suspension lags; one warehouse per monitor for strict caps. [UG:resource-monitors, SQL:sql/create-resource-monitor]
- Budgets cover warehouses, serverless, and AI: account budget plus up to 100 custom budgets; alert-only unless custom actions call owner's-rights, idempotent procedures; refresh lag up to 6.5 h. [UG:budgets, UG:budgets/custom-actions]
- Shared-warehouse chargeback: a user-tag budget with `ADD_SHARED_RESOURCE('WAREHOUSE', ...)` counts only user-attributable query cost (no idle time or tasks). [UG:budgets/budget-shared-resources-warehouses]

## Attribution and billing data
- Object-tag warehouses and users (e.g., `cost_center`); set `QUERY_TAG` per job on shared service connections. [UG:cost-attributing, U]
- `QUERY_ATTRIBUTION_HISTORY` (8 h lag): per-query warehouse credits, excluding idle, cloud services, serverless, AI tokens, queries <= ~100 ms, and Adaptive (`QUERY_METERING_HISTORY`); sum procedures by `ROOT_QUERY_ID`. [SQL:account-usage/query_attribution_history]
- Idle credits = `WAREHOUSE_METERING_HISTORY` `CREDITS_USED_COMPUTE` - `CREDITS_ATTRIBUTED_COMPUTE_QUERIES` (NULL for Adaptive). [SQL:account-usage/warehouse_metering_history]
- Cloud services bill only above 10% of that UTC day's warehouse credits; billed truth is `METERING_DAILY_HISTORY.CREDITS_BILLED`, not `CREDITS_USED`. [UG:cost-understanding-compute, SQL:account-usage/metering_daily_history]
- Serverless features bill per-second compute-hours at per-feature rates, cloud services included. [UG:cost-understanding-compute]
- Lag: ACCOUNT_USAGE metering/load up to 3 h (365-day retention); ORGANIZATION_USAGE `WAREHOUSE_METERING_HISTORY` 24 h, `USAGE_IN_CURRENCY_DAILY` 72 h, revised until month close. [SQL:account-usage, SQL:organization-usage]
- Snowsight Admin > Cost management: weekly Optimization insights, Budgets, Anomalies. [UG:cost-insights, UG:cost-anomalies]

## Privileges
- Workload roles get `USAGE` and `MONITOR`; grant `OPERATE`, `MODIFY` (size, `AUTO_SUSPEND`), and `CREATE WAREHOUSE` only to a warehouse-admin role; `MANAGE WAREHOUSES` grants MODIFY/MONITOR/OPERATE on all. [UG:security-access-control-privileges, BLOG:managing-snowflakes-compute-resources]
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/performance.md`
````markdown
# Query performance
Tags → skill://snowflake/sources.md. Warehouse size, QAS, queuing, auto-suspend → skill://snowflake/warehouses.md.

## Diagnose
- Triage in `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY` (≤45 min lag): rank by `total_elapsed_time`, group by `query_parameterized_hash`, compare `partitions_scanned` to `partitions_total`, check `bytes_spilled_to_local_storage`/`bytes_spilled_to_remote_storage`. [UG:performance-query-exploring, SQL:account-usage/query_history]
- Drill into one query with the Query Profile (kept 14 d) or `SELECT * FROM TABLE(GET_QUERY_OPERATOR_STATS('<query_id>'))` (needs OPERATE or MONITOR on the warehouse); start at the most expensive operator. [UG:ui-snowsight-activity, SQL:functions/get_query_operator_stats]
- `SNOWFLAKE.ACCOUNT_USAGE.QUERY_INSIGHTS WHERE is_opportunity` (≤90 min lag) names the condition and the fix; no insights for multi-step plans, secure objects, hybrid tables, or reused results. [UG:query-insights, SQL:account-usage/query_insights]
- `EXPLAIN USING TEXT <stmt>` compiles without a warehouse; `partitionsAssigned` vs `partitionsTotal` shows compile-time pruning. [SQL:sql/explain]

## Symptoms
| Profile signal (insight) | Fix |
|---|---|
| TableScan partitions scanned ≈ total; Filter above it drops rows (`QUERY_INSIGHT_UNSELECTIVE_FILTER`) | Prunable filter, clustering key, or search optimization |
| Join outputs far more rows than it reads (`QUERY_INSIGHT_EXPLODING_JOIN`) | Fix the join condition; filter inputs first |
| UnionAll with Aggregate on top (`QUERY_INSIGHT_UNNECESSARY_UNION_DISTINCT`) | `UNION ALL` |
| Bytes spilled, remote worst (`QUERY_INSIGHT_REMOTE_SPILLAGE`) | Smaller batches, else larger warehouse |
- Small nonzero `bytes_spilled_to_remote_storage` is normal when QAS is enabled on the warehouse. [UG:ui-snowsight-activity, UG:query-insights, UG:performance-query-warehouse-memory]

## Caches
- Result reuse needs identical text (case and aliases count), no `RANDOM`/`UUID_STRING`/external functions/hybrid tables, and unchanged data and micro-partitions (reclustering invalidates); lasts 24 h, each reuse extends it up to 31 d. [UG:querying-persisted-results]
- `USE_CACHED_RESULT` defaults TRUE; set FALSE via `ALTER SESSION` only to benchmark. Post-process with `RESULT_SCAN(LAST_QUERY_ID())` instead of rerunning. [SQL:parameters, UG:querying-persisted-results]
- The warehouse data cache drops on suspend; track `percentage_scanned_from_cache`. `SELECT COUNT(*) FROM t` is answered from metadata. [UG:performance-query-warehouse-cache, UG:ui-snowsight-activity]

## Pruning and SQL shape
- Micro-partitions (50–500 MB uncompressed) are columnar with per-column min/max: select only needed columns; filter on columns aligned with load order or the clustering key; predicates with a subquery never prune, even if constant. [UG:tables-clustering-micropartitions]
- Keep filter columns bare: `UPPER`/`LOWER` on a column prune poorly; casts on a column (except NUMBER→VARCHAR) disable search optimization; cast the constant instead. [UG:snowflake-optima, UG:search-optimization/queries-that-benefit]
- Top-K pruning needs `ORDER BY ... LIMIT` whose first key is an INTEGER/DATE/TIMESTAMP/string/binary column or a VARIANT field cast to its stored type (`v:i::NUMBER`); in joins it must come from the larger table; `DESC` on nullable needs `NULLS LAST`; with aggregates it must be a GROUP BY key. [UG:querying-top-k-pruning-optimization]
- VARIANT elements holding any JSON null or mixed types are not subcolumnarized (max 200 per partition) and force full-document scans: load with `STRIP_NULL_VALUES = TRUE` when null means missing; store dates, numbers-in-strings, and arrays as typed columns. [UG:semistructured-considerations]
- Snowflake Optima (all editions; Indexing/Metadata/Planning on Gen2 standard or Adaptive warehouses) adds hidden indexes at no cost, pruning metadata, and learned plans automatically; it complements these rules, not replaces them. [UG:snowflake-optima]

## Storage optimizations
| Workload | Use | Edition |
|---|---|---|
| Range/inequality filters, joins, sorts on the same few columns | Clustering key (one per table) | All |
| Selective lookups returning few rows; LIKE/RLIKE; VARIANT fields; GEOGRAPHY | Search optimization | Enterprise+ |
| Repeated aggregation or flattening of a subset of one table; external tables | Materialized view | Enterprise+ |
- Skip queries already ≤1 s; baseline query cost; start with 1–2 tables; the initial build can take about a week on very large tables. [UG:performance-query-storage, UG:performance-query-options]
- Search optimization or MVs on an auto-clustered table cost more because every recluster re-maintains them; batch DML and trim with infrequent DELETEs. [UG:performance-query-storage, UG:search-optimization/cost-estimation, UG:views-materialized]

## Clustering keys
- Cluster only multi-TB tables whose queries mostly filter or sort on the same columns and that are queried far more often than changed. [UG:tables-clustering-keys]
- Use ≤3–4 expressions: selective filters (dates) first, then join columns; order lowest→highest cardinality; reduce cardinality in an order-preserving way (`TO_DATE(ts)`, `TRUNC(n, -5)`); VARIANT only as `v:path::type`. [UG:tables-clustering-keys]
- Evaluate with `SYSTEM$CLUSTERING_INFORMATION('t', '(c1, c2)')` (high `average_depth` = poorly clustered; `version` OPTIMA/CLASSIC) and `SYSTEM$ESTIMATE_AUTOMATIC_CLUSTERING_COSTS('t', '(c1, c2)')` (±100%; average several runs). [SQL:functions/system_clustering_information, SQL:functions/system_estimate_automatic_clustering_costs]
- Since 2026-09-01 new clustering uses Optima Clustering: billed per uncompressed GB ingested × overlap factor (append-only by ingest date ≈ 0), key up to 1 KB vs Classic's first 5 bytes per column; existing tables stay on Classic. [UG:tables-auto-reclustering, UG:tables-clustering-keys]
- To stop Optima cost, `DROP CLUSTERING KEY` (resuming after `SUSPEND RECLUSTER` bills catch-up); any `CLUSTER BY` change reclusters; clones start suspended; CTAS doesn't carry the key. [UG:tables-auto-reclustering, UG:tables-clustering-keys]

## Search optimization (Enterprise+)
- Fits multi-second queries filtering a non-cluster-key column with ~100,000+ distinct values (`APPROX_COUNT_DISTINCT`); not FLOAT/GEOMETRY, external/hybrid/temporary tables, MVs, or Time Travel. [UG:search-optimization/queries-that-benefit]
- Scope columns: `ALTER TABLE t ADD SEARCH OPTIMIZATION ON EQUALITY(c1), SUBSTRING(c2), EQUALITY(v:user.uuid), GEO(g)`; bare `ADD SEARCH OPTIMIZATION` covers every eligible column, including future ones. [UG:search-optimization/enabling]
- Estimate first, especially SUBSTRING and VARIANT: `SYSTEM$ESTIMATE_SEARCH_OPTIMIZATION_COSTS('db.sch.t', 'SUBSTRING(c2)')` (±50%); index storage is typically ~1/4 of the table. [UG:search-optimization/cost-estimation, SQL:functions/system_estimate_search_optimization_costs]
- Measure only after `SHOW TABLES` shows `search_optimization_progress` at 100 and the profile shows "Search Optimization Access". [UG:search-optimization/enabling]

## Materialized views (Enterprise+)
- One table only; no joins, UDFs, window functions, HAVING, ORDER BY, or LIMIT; the optimizer rewrites base-table queries to use them; no maintenance-cost estimator; suspending only defers cost; avoid `SELECT *`. [UG:views-materialized]
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/tables.md`
````markdown
# Tables, types, and storage lifecycle
Tags → skill://snowflake/sources.md.

## Table types and Time Travel
- Permanent is default (fixed 7-day Fail-safe, Snowflake-support recovery only); use TRANSIENT for reproducible staging/ETL, TEMPORARY for session scratch. [UG:tables-temp-transient, UG:data-failsafe]
- Type is fixed at creation; TRANSIENT databases/schemas make all children transient; convert via `CREATE TRANSIENT TABLE n LIKE o COPY GRANTS` + `INSERT ... SELECT`. [UG:tables-temp-transient, UG:table-considerations]
- A temporary table shadows a same-named table in its session (DROP and CREATE OR REPLACE hit it); drop temps explicitly. [UG:tables-temp-transient]
- `DATA_RETENTION_TIME_IN_DAYS` (default 1): Standard 0-1; Enterprise+ 0-90 permanent, 0-1 transient/temporary; unset levels inherit from the parent. [SQL:parameters, UG:data-time-travel]
- `MIN_DATA_RETENTION_TIME_IN_DAYS` (account-only, default 0) floors permanent tables at MAX(both). Keep >= 1 day; 0 disables Time Travel and UNDROP. [SQL:parameters, UG:data-time-travel]
- `UNDROP TABLE` restores the latest dropped version; rename a same-named table first. [UG:data-time-travel]

## Storage cost
- Updates, deletes and every CREATE OR REPLACE keep billed old versions through Time Travel then Fail-safe; spot churn via `FAILSAFE_BYTES / ACTIVE_BYTES` in `TABLE_STORAGE_METRICS`. [UG:tables-storage-considerations, SQL:account-usage/table_storage_metrics]
- Large high-churn tables: TRANSIENT with `DATA_RETENTION_TIME_IN_DAYS = 0` plus periodic copies to a permanent backup. [UG:tables-storage-considerations]

## Replace, alter, swap, clone
| | CREATE OR REPLACE | CREATE OR ALTER |
|---|---|---|
| Data | new table; old one in Time Travel; streams stale | kept; dropped columns lose data |
| Grants | explicit lost unless COPY GRANTS; future grants only without it | kept |
| Tags | only with COPY TAGS | kept (policies too); not settable |
| Atomic | yes | no |
| Rejects | - | CTAS, LIKE, CLONE, CHECK, Iceberg, hybrid, external |
- CREATE OR ALTER: a rename is drop + add (use `ALTER TABLE ... RENAME COLUMN`); omitted properties are unset; new columns go last. [SQL:sql/create-or-alter]
- Cut over rebuilds with `ALTER TABLE t SWAP WITH t_new` (atomic; OWNERSHIP on both; streams go stale). [SQL:sql/alter-table, SQL:sql/create-table]
- Clones share micro-partitions until changed; a dropped source keeps billing as `RETAINED_FOR_CLONE_BYTES`, so drop stale clones. [UG:tables-storage-considerations, SQL:account-usage/table_storage_metrics]
- Cloned tables get Automatic Clustering suspended and no lifecycle policy; database/schema clones inherit child grants only, skip external tables and internal-stage pipes, suspend tasks. [UG:object-clone, SQL:sql/create-clone]
- Clones keep fully qualified references pointing at the source; use partially qualified names so dev/tst clones resolve locally. [SQL:sql/create-clone, U]

## Data types
- Money: `NUMBER(p,s)`, never FLOAT (~15 digits, SUM/AVG drift); fix scale at creation, ALTER can't change it. DECFLOAT is exact but not for Iceberg, hybrid, Snowpark or non-SQL UDFs. [SQL:data-types-numeric, SQL:sql/alter-table-column]
- VARCHAR(n) counts characters (default 16777216, 128 MB byte cap); declare known lengths to catch misloads; CTAS of >16 MB values needs `VARCHAR(134217728)`. [SQL:data-types-text, UG:table-considerations, REL:bcr-bundles/2025_03/bcr-1942]
- Dates as DATE/TIMESTAMP_*, never VARCHAR; name the variant, bare TIMESTAMP follows `TIMESTAMP_TYPE_MAPPING` (default NTZ). LTZ renders in session `TIMEZONE`; TZ keeps a fixed offset (DST drifts). [UG:table-considerations, SQL:parameters, SQL:data-types-datetime]
- VARIANT/OBJECT/ARRAY max 128 MB; extract dates, numeric strings and arrays to typed columns. [SQL:data-types-semistructured, UG:semistructured-considerations]
- Structured `ARRAY(t)`, `OBJECT(k t)`, `MAP(k, v)` type nested data; not in dynamic, hybrid or external tables. [SQL:data-types-structured]
- Native `UUID` doesn't enforce uniqueness (not in hybrid or Snowpark); `VECTOR(INT|FLOAT, n<=4096)` usage: skill://snowflake/cortex.md. [SQL:data-types-uuid, SQL:data-types-vector]
- `LATERAL FLATTEN(INPUT => ..., OUTER => TRUE)` keeps rows with empty or missing arrays. [SQL:functions/flatten]

## Identifiers
- Create names unquoted (stored uppercase); quoted names stay case-sensitive and need quotes in every reference. [SQL:identifiers-syntax]
- Dynamic names: `IDENTIFIER()` over a literal, `$var`, bind or Scripting variable, never concatenation; env names from config. [SQL:identifier-literal, U]

## Constraints, sequences, defaults
- Standard tables enforce only NOT NULL and CHECK (CHECK blocks COPY INTO and pipes); PK/UNIQUE/FK are informational, and ENABLE or VALIDATE on them skips creation. [SQL:constraints-overview, SQL:sql/create-table-constraint]
- `RELY` on PK and FK enables join elimination; set it only when pipelines guarantee integrity, else results are wrong. [SQL:sql/create-table-constraint, UG:join-elimination]
- Sequences/IDENTITY are unique, not gap-free; NOORDER is default (`NOORDER_SEQUENCE_AS_DEFAULT`); manual IDENTITY inserts can duplicate. [UG:querying-sequences, SQL:sql/create-table, SQL:parameters]
- Set defaults at creation: ALTER can't add or change a non-sequence DEFAULT on an existing column. [SQL:sql/alter-table-column]

## Iceberg, hybrid, external, views, archiving
- Snowflake-managed Iceberg (`CATALOG = 'SNOWFLAKE'`): full DML and compaction; `EXTERNAL_VOLUME = 'SNOWFLAKE_MANAGED'` gives permanent tables Fail-safe, customer volumes don't. [UG:tables-iceberg]
- External-catalog Iceberg (catalog integration + external volume) has limited support; Time Travel is capped by snapshot age (max 5 days). [UG:tables-iceberg, UG:tables-iceberg-metadata]
- Catalog-linked databases (`LINKED_CATALOG = (CATALOG = '<int>')`, REST only) auto-sync namespaces; no clone/replication; CREATE OR REPLACE recreates the remote table. [UG:tables-iceberg-catalog-linked-database, UG:tables-iceberg]
- Hybrid tables (AWS/Azure) fit high-concurrency point reads/writes: PK required, keys enforced, 2 TB and ~16,000 ops/s per database; no Fail-safe, UNDROP, streams, clustering or replication. [UG:tables-hybrid, UG:tables-hybrid-limitations]
- External tables are read-only and slower; prefer Iceberg for Parquet/Delta. [UG:tables-external-intro]
- Use SECURE views only for privacy (they skip optimizations); views don't track base-column changes. [UG:views-secure, SQL:sql/create-view]
- Storage lifecycle policy: `CREATE STORAGE LIFECYCLE POLICY p AS (c TIMESTAMP) RETURNS BOOLEAN -> <expr>` + `ALTER TABLE t ADD STORAGE LIFECYCLE POLICY p ON (c)`; runs daily. [UG:storage-management/storage-lifecycle-policies-create-manage, SQL:sql/alter-table]
- `ARCHIVE_TIER` is fixed per table: COOL (min 90 days, fast) or COLD (min 180 days, 1/4 of COOL, up to 48 h retrieval, no Azure); restore via `CREATE TABLE ... FROM ARCHIVE OF`. [UG:storage-management/storage-lifecycle-policies]
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/ingestion.md`
````markdown
# Loading and unloading
Tags → skill://snowflake/sources.md. Post-landing transforms (streams, tasks, dynamic tables) → skill://snowflake/pipelines.md.

## Method choice
| Method | Fit | Latency | Billing | Src |
|---|---|---|---|---|
| `COPY INTO <table>` | scheduled batch from staged files | per run | user warehouse time | [UG:data-load-overview] |
| Snowpipe `AUTO_INGEST = TRUE` | files landing in cloud storage | ~1 min after notification | 0.0037 credits/GB; text uncompressed, binary observed size | [UG:data-load-snowpipe-billing, REL:2025/other/2025-12-08-snowpipe-simplified-pricing] |
| Snowpipe Streaming (high-performance) | rows from apps, devices, CDC; no files | as low as 5 s | credits per uncompressed GB | [UG:snowpipe-streaming/data-load-snowpipe-streaming-overview, UG:snowpipe-streaming/snowpipe-streaming-high-performance-cost] |
| Snowflake Connector for Kafka v4 | Kafka Connect clusters | 5–10 s | Streaming per-GB rate | [UG:kafka-connector/index] |
| Openflow connector | SaaS, database CDC, unstructured sources | connector-dependent | SPCS compute pools + ingestion + telemetry | [UG:data-integration/openflow/cost-spcs] |

- Load a given file set with bulk COPY or Snowpipe, never both; load metadata is separate (table 64 days, pipe 14 days) and mixing duplicates rows. [UG:data-load-snowpipe-intro]
- Highly concurrent COPY into one table → migrate to Snowpipe. [UG:data-load-considerations-load]

## File preparation
- Target 100–250 MB compressed files; parallelism ≤ file count; avoid ≥ 100 GB files; loads over 24 h can abort with nothing committed. [UG:data-load-considerations-prepare]
- Snowpipe queue overhead scales with file count: aggregate small files, stage about once per minute. [UG:data-load-considerations-prepare, UG:data-load-snowpipe-intro]
- JSON: `STRIP_NULL_VALUES = TRUE` when null means missing; one type per element keeps subcolumnarization. [UG:data-load-considerations-prepare, UG:data-load-considerations-load]
- Reuse named `FILE FORMAT` objects in stages, COPY, and `INFER_SCHEMA` (named format required). [UG:data-load-azure-config, SQL:functions/infer_schema]
- Partition paths by source/date/hour and load the narrowest path; selectors fastest→slowest: `FILES` (≤ 1,000) > path > `PATTERN`; for Snowpipe filter at Event Grid, not `PATTERN`. [UG:data-load-considerations-stage, UG:data-load-considerations-load, UG:data-load-considerations-manage]

## Stages and integrations
- Use named internal stages (grantable); user `@~` and table `@%t` stages can't be granted or dropped. Internal encryption defaults to `SNOWFLAKE_FULL` and is fixed at create; use `SNOWFLAKE_SSE` only for pre-signed URLs (no Tri-Secret Secure). [UG:data-load-overview, SQL:sql/create-stage]
- Azure: `CREATE STORAGE INTEGRATION ... STORAGE_PROVIDER = 'AZURE' AZURE_TENANT_ID = ... STORAGE_ALLOWED_LOCATIONS = (...)` → `DESC STORAGE INTEGRATION` → open `AZURE_CONSENT_URL` → grant the `AZURE_MULTI_TENANT_APP_NAME` principal `Storage Blob Data Reader` (load) or `Contributor` (unload/REMOVE/PURGE). [UG:data-load-azure-config]
- Use `blob.core.windows.net` URLs, including for ADLS Gen2; service-principal consent can take 1 h or more; revoked access lingers up to 60 min (credential cache). [UG:data-load-azure-config]
- Never inline `CREDENTIALS = (AZURE_SAS_TOKEN = ...)`; `REQUIRE_STORAGE_INTEGRATION_FOR_STAGE_CREATION` and `..._OPERATION` (default FALSE) enforce integrations. [UG:data-load-azure-config, SQL:parameters]
- Private path: `USE_PRIVATELINK_ENDPOINT = TRUE` plus `SYSTEM$PROVISION_PRIVATELINK_ENDPOINT` (Business Critical+; billed per endpoint and per GB). [UG:data-load-azure-private]
- Directory tables: `DIRECTORY = (ENABLE = TRUE AUTO_REFRESH = TRUE NOTIFICATION_INTEGRATION = '<ni>')`, billed as Snowpipe; `CREATE OR REPLACE STAGE` empties the directory and unlinks external tables. [UG:data-load-dirtables, SQL:sql/create-stage]

## Snowpipe on Azure
- Chain: Event Grid subscription (Event Grid schema) → Storage Queue → `CREATE NOTIFICATION INTEGRATION ... TYPE = QUEUE NOTIFICATION_PROVIDER = AZURE_STORAGE_QUEUE` → consent → `Storage Queue Data Contributor` → `CREATE PIPE ... AUTO_INGEST = TRUE INTEGRATION = '<UPPERCASE>'`. [UG:data-load-snowpipe-auto-azure]
- Filter `data.api` to `CopyBlob PutBlob PutBlockList FlushWithClose SftpCommit`; renames don't trigger; one queue per integration; never overlap pipe paths. [UG:data-load-snowpipe-auto-azure]
- Pipes default to `ON_ERROR = SKIP_FILE`, don't guarantee file order, and can't `PURGE`; clean up with `REMOVE` or storage lifecycle rules. [SQL:sql/copy-into-table, UG:data-load-snowpipe-intro, UG:data-load-snowpipe-manage]
- `ALTER PIPE ... REFRESH [PREFIX = ...] [MODIFIED_AFTER = ...]` covers files staged in the last 7 days; repair only, not scheduling. [SQL:sql/alter-pipe]
- Change a pipe: pause with `PIPE_EXECUTION_PAUSED = TRUE`, check `SYSTEM$PIPE_STATUS` shows `PAUSED` with `pendingFileCount` 0, `CREATE OR REPLACE PIPE` (drops load history), resume. [UG:data-load-snowpipe-manage]
- A pipe paused > 14 days is stale; resume with `SYSTEM$PIPE_FORCE_RESUME(..., 'staleness_check_override')`; alert via `ERROR_INTEGRATION`. [UG:data-load-snowpipe-manage, UG:data-load-snowpipe-errors-azure]

## COPY options
- `ON_ERROR` defaults: `ABORT_STATEMENT` for COPY, `SKIP_FILE` for pipes (buffers whole files); use `CONTINUE` only with an error check. [SQL:sql/copy-into-table]
- Pre-check with `VALIDATION_MODE = RETURN_ERRORS | RETURN_ALL_ERRORS | RETURN_<n>_ROWS` (not with transforms, `MATCH_BY_COLUMN_NAME`, or Iceberg); post-check with `VALIDATE(t, JOB_ID => '<id>' | '_last')` (empty under ABORT_STATEMENT). [SQL:sql/copy-into-table, SQL:functions/validate]
- `MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE` (default `NONE`) can't combine with COPY transforms; `INCLUDE_METADATA = (col = METADATA$FILENAME)` requires it. [SQL:sql/copy-into-table]
- Bootstrap: `CREATE TABLE ... USING TEMPLATE (SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*)) FROM TABLE(INFER_SCHEMA(LOCATION => '@stg/p/', FILE_FORMAT => 'fmt')))`; no table stages; CSV needs `PARSE_HEADER = TRUE`. [SQL:functions/infer_schema]
- `ENABLE_SCHEMA_EVOLUTION = TRUE` needs `MATCH_BY_COLUMN_NAME` plus EVOLVE SCHEMA or OWNERSHIP; ≤ 100 new columns per COPY; not via INSERT or tasks. [UG:data-load-schema-evolution]
- Files with expired (64-day) metadata are skipped: `LOAD_UNCERTAIN_FILES = TRUE` still dedupes where metadata exists; `FORCE = TRUE` reloads (duplicates). [UG:data-load-considerations-load, SQL:sql/copy-into-table]
- `PURGE = TRUE` fails silently; delete files only after COPY_HISTORY shows `Loaded`. [SQL:sql/copy-into-table, UG:data-load-considerations-manage]
- COPY transforms `(SELECT $1:a::NUMBER, METADATA$FILENAME FROM @stg)` allow no WHERE, ORDER BY, LIMIT, FLATTEN, JOIN, or GROUP BY; use `METADATA$START_SCAN_TIME` for load time. [UG:data-load-transform]
- Keep load and query warehouses separate; Small–Large is enough unless hundreds of files load concurrently. [UG:data-load-considerations-plan]

## Unloading
- `COPY INTO @stg/path/ FROM (SELECT ...)` supports CSV, JSON, PARQUET; `MAX_FILE_SIZE` defaults to 16 MB (max 5 GB); `SINGLE = TRUE` with an explicit filename. [SQL:sql/copy-into-location, UG:data-unload-considerations]
- Rerun-safe: `INCLUDE_QUERY_ID = TRUE` and a fresh path per run, not `OVERWRITE = TRUE`. [SQL:sql/copy-into-location]
- `PARTITION BY` forces INCLUDE_QUERY_ID and excludes SINGLE/OVERWRITE; partition only on dates, timestamps, or booleans (values reach internal logs). [SQL:sql/copy-into-location]
- `HEADER = TRUE` writes CSV headers and keeps real Parquet column names. [SQL:sql/copy-into-location]
- CSV: `FIELD_OPTIONALLY_ENCLOSED_BY`, or `EMPTY_FIELD_AS_NULL = FALSE` plus `NULL_IF`, to keep empty ≠ NULL. [UG:data-unload-considerations]
- Parquet: VARIANT becomes a JSON string; TIMESTAMP_NTZ(9) becomes milliseconds; cast TIMESTAMP_LTZ(9), ARRAY, OBJECT, MAP first. [UG:data-unload-considerations]
- Exfiltration guards (all default FALSE): `PREVENT_UNLOAD_TO_INLINE_URL`, `REQUIRE_STORAGE_INTEGRATION_FOR_STAGE_OPERATION`, `PREVENT_UNLOAD_TO_INTERNAL_STAGES`. [SQL:parameters, SQL:sql/copy-into-location]

## Monitoring
- Diagnose with read-only queries; REFRESH, FORCE_RESUME, and reloads need explicit permission. [U]
- `INFORMATION_SCHEMA.COPY_HISTORY` covers 14 days, post-TRUNCATE only; `ACCOUNT_USAGE.COPY_HISTORY` covers 365 days (latency ≤ 2 h); `LOAD_HISTORY` is bulk only. [SQL:functions/copy_history, SQL:account-usage/copy_history, SQL:account-usage/load_history]
- `ABORT_STATEMENT` failures don't appear in COPY_HISTORY; search QUERY_HISTORY. [SQL:sql/copy-into-table]
- Snowpipe cost is in `PIPE_USAGE_HISTORY` (`CREDITS_USED`, `BYTES_BILLED`); Streaming cost is in `METERING_HISTORY` with `SERVICE_TYPE = 'SNOWPIPE_STREAMING'`; resource monitors don't cap Snowpipe. [SQL:account-usage/pipe_usage_history, UG:snowpipe-streaming/snowpipe-streaming-high-performance-cost, UG:data-load-snowpipe-billing]
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/streaming.md`
````markdown
# Streaming and connectors
Tags → skill://snowflake/sources.md. Files, stages, COPY, and Snowpipe → skill://snowflake/ingestion.md.

## Choosing
- Snowpipe Streaming (high-performance): rows from apps, devices, CDC without files; latency as low as 5 s; billed in credits per uncompressed GB. Kafka connector v4: 5–10 s at the Streaming per-GB rate. Openflow: SaaS, database CDC, unstructured sources; bills SPCS compute pools + ingestion + telemetry. [UG:snowpipe-streaming/data-load-snowpipe-streaming-overview, UG:snowpipe-streaming/snowpipe-streaming-high-performance-cost, UG:kafka-connector/index, UG:data-integration/openflow/cost-spcs]

## Snowpipe Streaming
- New streaming code targets the high-performance architecture (GA AWS 2025-09-23, Azure 2025-11-05); classic has an advance deprecation notice (formal notice planned mid-2026, then 18-month sunset). [REL:2025/other/2025-09-23-snowpipe-streaming-high-performance-architecture, REL:2025/other/2025-11-05-snowpipe-streaming-azure-ga, UG:snowpipe-streaming/snowpipe-streaming-classic-deprecation]
- Elastic Channels (GA 2026-09-15, SDK ≥ 1.8.0) for at-least-once, unordered producers; Named Channels with offset tokens for ordered exactly-once (Kafka partitions, CDC). [REL:2026/other/2026-09-15-snowpipe-streaming-elastic-channels-ga, UG:snowpipe-streaming/data-load-snowpipe-streaming-overview]
- Prefer the SDK (Python `snowpipe-streaming` ≥ 3.9, Java 11+, Node.js 20+) over REST; adding it needs user approval via `uv add`. [UG:snowpipe-streaming/data-load-snowpipe-streaming-overview, U]
- Default pipe `<TABLE_NAME>-STREAMING` uses `MATCH_BY_COLUMN_NAME`, no transforms; create a named pipe for transforms or `CLUSTER_AT_INGEST_TIME = TRUE`. [UG:snowpipe-streaming/snowpipe-streaming-pipe-object, SQL:sql/copy-into-table]

## Kafka
- Kafka v4 (GA 2026-04-20): v3 cutover must finish within `offsets.retention.minutes` (default 7 days); no schema evolution into Iceberg tables. [REL:2026/other/2026-04-20-kafka-connector-v4-ga, UG:kafka-connector/index]

## Openflow
- Snowflake Deployments (SPCS) run on Azure; BYOC is AWS only; new deployments are gen 2 only since 2026-09-09. [UG:data-integration/openflow/about, REL:2026/other/2026-09-09-openflow-gen1-deployment-retirement]
- `Openflow_Control_Pool_0` bills while a deployment exists; suspend idle runtimes, consolidate deployments, pick the smallest runtime; CDC connectors also use a warehouse. [UG:data-integration/openflow/cost-spcs]
- Openflow Kafka connector: no autoscaling; set runtime min = max nodes. [UG:data-integration/openflow/connectors/kafka/about]
- Gen 2 connector as code (Preview): `CREATE OPENFLOW CONNECTOR <c> IN RUNTIME <r> FROM DEFINITION <id>` → edit `config.json` on `snow://openflow_connector/<db>.<schema>.<c>/versions/live/` with `GET`/`PUT` (Snowflake CLI; Snowsight can't) → `ALTER OPENFLOW CONNECTOR <c> COMMIT` → `START`; poll `SYSTEM$WAIT_FOR_STABLE_OPENFLOW_CONNECTORS`. [UG:data-integration/openflow/gen2/configure-connector-sql, REL:2026/other/2026-09-08-openflow-gen2-deployment-runtime-ga]
- Edits: `ADD LIVE VERSION FROM LAST` → PUT → `COMMIT` or `ABORT`; live edits don't touch a running connector until COMMIT. [UG:data-integration/openflow/gen2/connector-versioning]
- Promote a validated config via a Git repository stage: `ALTER ... PUSH TO '@repo/branches/<b>/connectors/<c>'`, then per environment `CREATE OPENFLOW CONNECTOR ... FROM '@repo/.../'` (starts with a default version, no COMMIT) or `ADD VERSION FROM '<stage>'` on a STOPPED connector. [UG:data-integration/openflow/gen2/connector-versioning, SQL:sql/create-openflow-connector, SQL:sql/alter-openflow-connector]
- Keep a `config.json` per environment (URLs, secret references, destinations updated before CREATE); names come from env config, never literals. [UG:data-integration/openflow/gen2/connector-versioning, U]
- Secrets: `valueType = SECRET_REFERENCE` to a Snowflake SECRET (usually `TYPE = GENERIC_STRING`); grant READ on it plus USAGE on its db/schema to the runtime `EXECUTE_AS_ROLE`; keep Git tokens out of committed SQL. [UG:data-integration/openflow/gen2/configure-connector-sql, SQL:sql/alter-openflow-connector]
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/pipelines.md`
````markdown
# Transformations and orchestration
Tags → skill://snowflake/sources.md. Airflow DAG design lives in skill://airflow.

## Choosing
| Need | Use |
|---|---|
| Declarative multi-step SQL (joins, aggregates, windows) | Dynamic table (DT) |
| Procedures, MERGE/upsert, SCD2, SEQ/UUID keys, external calls, CRON, DML on output | Stream + task |
| Single-table acceleration, zero lag, optimizer rewrite (Enterprise+) | Materialized view |
- DT limits: `TARGET_LAG` ≥ 60 s; read-only except frozen-region DML; no stream, external, directory-table, or MV sources; definition changes reinitialize. [UG:dynamic-tables/decision-guide, UG:dynamic-tables/frozen-regions, UG:views-materialized]

## Dynamic tables
- Duration `TARGET_LAG` on leaf DTs (staleness target, not a schedule); `TARGET_LAG = DOWNSTREAM` on intermediates; a DOWNSTREAM DT without consumers never refreshes and never warns. [UG:dynamic-tables/target-lag, UG:dynamic-tables/best-practices]
- Set `REFRESH_MODE` explicitly in prod: `ADAPTIVE` (GA 2026-07-30) when incrementalizable, else `INCREMENTAL` or `FULL`; default `AUTO` resolves once at create, never to ADAPTIVE, and later fails instead of falling back; check `refresh_mode_reason` in SHOW DYNAMIC TABLES. [UG:dynamic-tables/refresh-modes, REL:2026/other/2026-07-30-dynamic-tables-adaptive-refresh-mode-ga]
- Change refresh mode with CREATE OR ALTER DYNAMIC TABLE (ALTER can't); CREATE OR REPLACE reinitializes the DT and downstream incremental DTs: add `COPY GRANTS`, pick a window. [UG:dynamic-tables/refresh-modes, UG:dynamic-tables/best-practices]
- Incremental blockers: EXCEPT/INTERSECT/MINUS, LIMIT/TOP, subqueries outside FROM, non-equi outer joins, ROLLUP/CUBE/GROUPING SETS, WITH RECURSIVE, sequences, RANDOM/UUID_STRING, UDTFs, external functions, `CURRENT_TIMESTAMP` outside WHERE/HAVING/QUALIFY (use `METADATA$ROW_LAST_COMMIT_TIME`), base tables without change tracking. [UG:dynamic-tables/supported-queries]
- One GROUP BY/DISTINCT/window per incremental DT; chain DTs instead. Add `PRIMARY KEY ... RELY` to base tables reloaded by INSERT OVERWRITE or TRUNCATE+COPY. [UG:dynamic-tables/best-practices, UG:dynamic-tables/cost]
- `INITIALIZE = ON_CREATE` (default) blocks CREATE on the first refresh and needs OPERATE on upstream DTs; `ON_SCHEDULE` returns at once: confirm the first refresh before exposing it. [SQL:sql/create-dynamic-table, UG:dynamic-tables/privileges, UG:dynamic-tables/best-practices]
- Dedicated `WAREHOUSE` per pipeline; larger `INITIALIZATION_WAREHOUSE` for (re)initializations. [UG:dynamic-tables/best-practices, UG:dynamic-tables/refresh-modes]
- Stable history: `FROZEN WHERE (<DT-column predicate>)` (was IMMUTABLE WHERE) skips it on refresh; expanding keeps state, shrinking/removing reinitializes; seed with `BACKFILL FROM <table>` (CREATE only). [UG:dynamic-tables/frozen-regions]
- Cost = refresh warehouse + Cloud Services change checks every cycle, even NO_DATA (billed above 10% of daily warehouse credits) + storage; lengthen lag on mostly-NO_DATA DTs; `TRANSIENT` drops fail-safe. [UG:dynamic-tables/cost, SQL:sql/create-dynamic-table]
- Refreshes run as the owner role (keep USAGE/SELECT on inputs); grant OPERATE/MONITOR, not OWNERSHIP, to operators. [UG:dynamic-tables/privileges]
- Failures raise no alert: set `LOG_EVENT_LEVEL = WARN` and alert on the event table. [UG:dynamic-tables/best-practices, UG:dynamic-tables/monitoring]
- Externally orchestrated DT: `SCHEDULER = DISABLE` (no `TARGET_LAG`) plus `ALTER DYNAMIC TABLE <dt> REFRESH`. [SQL:sql/create-dynamic-table, UG:dynamic-tables/target-lag]

## Streams
- Standard = net delta incl. deletes; `APPEND_ONLY = TRUE` for insert-only ELT (cheaper); `INSERT_ONLY = TRUE` required on external/externally managed Iceberg tables; type fixed at create. `SHOW_INITIAL_ROWS = TRUE` returns existing rows on first consumption. [UG:streams-intro, SQL:sql/create-stream]
- Offset advances only when a committed DML reads the stream (incl. CTAS, COPY INTO location); SELECT never does. Multi-statement consumption in BEGIN…COMMIT (repeatable read). One stream per consumer. [UG:streams-intro, UG:streams-manage, SQL:sql/create-task]
- Consume before `stale_after` (SHOW STREAMS); stale means recreate. Unconsumed streams extend source retention up to `MAX_DATA_EXTENSION_TIME_IN_DAYS` (default 14) at storage cost; CREATE OR REPLACE of the source stales them. [UG:streams-intro, UG:streams-manage]

## Tasks
- Serverless (omit `WAREHOUSE`; EXECUTE MANAGED TASK; ≤ XXLARGE; cap `SERVERLESS_TASK_MAX_STATEMENT_SIZE`) for stable runs needing schedule adherence; user-managed warehouse for busy shared warehouses, > XXLARGE, or `EXECUTE DBT PROJECT`. [UG:tasks-intro, SQL:sql/create-task, UG:data-engineering/dbt-projects-on-snowflake-orchestration]
- `SCHEDULE = '<n> MINUTES'` or `'USING CRON <expr> <tz>'`; a run still going skips the next slot. Triggered: `WHEN SYSTEM$STREAM_HAS_DATA('<s>')`, no SCHEDULE; serverless triggered needs `TARGET_COMPLETION_INTERVAL`. [UG:tasks-intro, UG:tasks-triggered]
- Graphs: root + `AFTER`; ≤ 1000 tasks, ≤ 100 parents/children each; one owner and schema; `FINALIZE = <root>` task for cleanup/notify. Suspend root before edits; `SYSTEM$TASK_DEPENDENTS_ENABLE('<root>')` resumes all; `EXECUTE TASK <root> RETRY LAST`. [UG:tasks-graphs, SQL:sql/create-task]
- On the root: `SUSPEND_TASK_AFTER_NUM_FAILURES` (default 10), `TASK_AUTO_RETRY_ATTEMPTS` (default 0, root only), `USER_TASK_TIMEOUT_MS` (default 3600000, whole graph; lowest non-zero with `STATEMENT_TIMEOUT_IN_SECONDS` wins). [SQL:sql/create-task, UG:tasks-graphs]
- `OVERLAP_POLICY` (`NO_OVERLAP` default, `ALLOW_CHILD_OVERLAP`, `ALLOW_ALL_OVERLAP`) replaces deprecated `ALLOW_OVERLAPPING_EXECUTION`; overlap only idempotent graphs. [REL:2026/other/2026-03-13-tasks-overlap-policy, UG:tasks-graphs]
- `ERROR_INTEGRATION`/`SUCCESS_INTEGRATION` take only queue integrations on the account's cloud (Azure Event Grid), at-least-once; for email/Teams use task events + an alert on new data. [UG:tasks-errors, UG:tasks-events, U]
- Owner role needs EXECUTE TASK (+EXECUTE MANAGED TASK if serverless) and warehouse USAGE; runs as a system service with owner privileges; grant OPERATE to operators; `EXECUTE AS USER` only for a dedicated service user (IMPERSONATE). Keep `AUTOCOMMIT = TRUE`. [UG:tasks-intro, SQL:sql/create-task]
- Environment values via `CONFIG = $${...}$$` + `SYSTEM$GET_TASK_GRAPH_CONFIG`; `EXECUTE TASK ... USING CONFIG` overrides one run. Tasks start suspended: `EXECUTE TASK` to test, then `ALTER TASK ... RESUME`. [UG:data-engineering/dbt-projects-on-snowflake-orchestration, REL:2026/other/2026-01-26-dynamic-task-config, UG:tasks-intro, U]

## Procedures and Snowflake Scripting
- Default owner's rights: owner privileges, proc's database/schema, no caller session variables (pass args); `EXECUTE AS CALLER` only when caller privileges/session are required. [DEV:stored-procedure/stored-procedures-rights]
- Dynamic SQL: `EXECUTE IMMEDIATE :sql USING (a, b)` with `?` binds; never concatenate inputs. [SQL:sql/execute-immediate, DEV:stored-procedure/stored-procedures-usage]
- Procedures aren't atomic: pair `BEGIN TRANSACTION … COMMIT` inside one proc; DDL commits implicitly; a transaction open at proc end rolls back with an error. [DEV:stored-procedure/stored-procedures-usage, SQL:transactions]
- Handle `STATEMENT_ERROR`, `EXPRESSION_ERROR`, `OTHER`; log `SQLCODE`/`SQLERRM`/`SQLSTATE`, then bare `RAISE;` so the caller sees the failure. [DEV:snowflake-scripting/exceptions]

## Idempotent loads
- MERGE source must be ≤ 1 row per key: `QUALIFY ROW_NUMBER() OVER (PARTITION BY <k> ORDER BY <ts> DESC) = 1` or GROUP BY; multi-matches error (`ERROR_ON_NONDETERMINISTIC_MERGE` default TRUE), unmatched duplicates all insert. [SQL:sql/merge, SQL:constructs/qualify]
- Stream MERGE: DELETE when `METADATA$ACTION = 'DELETE' AND NOT METADATA$ISUPDATE`; upsert from INSERT rows. [UG:dynamic-tables/decision-guide, UG:streams-intro]

## Alerts
- `CREATE ALERT ... SCHEDULE = '<n> minute' IF (EXISTS (<query>)) THEN <action>`, then `ALTER ALERT ... RESUME`; needs EXECUTE ALERT (+EXECUTE MANAGED ALERT if serverless); set `SUSPEND_ALERT_AFTER_NUM_FAILURES`; window with `SNOWFLAKE.ALERT.LAST_SUCCESSFUL_SCHEDULED_TIME()`..`SCHEDULED_TIME()`. [UG:alerts]
- Alerts on new data (GA 2025-07-18; one change-tracked table/view, no joins/CTEs/DML) watch event-table failures; notify via `SYSTEM$SEND_SNOWFLAKE_NOTIFICATION` over email, webhook (Teams, Slack), or queue integrations. [UG:alerts, REL:2025/other/2025-07-18-alerts-on-new-data, UG:notifications/about-notifications]

## dbt Projects on Snowflake
- GA 2025-11-06. Deploy with `snow dbt deploy` from CI; no `--force` (CREATE OR REPLACE loses run history); SQL deploy from a Git stage skips review (dev only). [REL:2025/other/2025-11-06-dbt-projects-on-snowflake-ga, UG:data-engineering/dbt-projects-on-snowflake-deploy]
- `EXECUTE DBT PROJECT <db>.<schema>.<proj> ARGS='build --target <env>'`; concurrent runs `WRITEBACK = FALSE`; caller needs EXECUTE DBT PROJECT, profile role governs data; same warehouse in task/connection and profile. [UG:data-engineering/dbt-projects-on-snowflake-orchestration]

## Airflow orchestration
- Provider 6.x removed `SnowflakeOperator`: use `SQLExecuteQueryOperator(conn_id=...)`; long statements: `SnowflakeSqlApiOperator(snowflake_conn_id=..., statement_count=<n>, deferrable=True)`. [AFP:changelog, AFP:operators/snowflake]
- Connection per environment, service user: key pair via extra `private_key_content` (base64) or `private_key_file`, passphrase in Password; Entra via `azure_conn_id` or `authenticator = WORKLOAD_IDENTITY` + `workload_identity_provider = AZURE`. [AFP:connections/snowflake, UG:data-engineering/dbt-projects-on-snowflake-orchestration, U]
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/access.md`
````markdown
# Access control and authentication
Tags → skill://snowflake/sources.md. Data policies and sharing: skill://snowflake/governance.md.

## Roles
- System roles: ACCOUNTADMIN inherits SECURITYADMIN (global MANAGE GRANTS; inherits USERADMIN, which creates users and roles) and SYSADMIN (warehouses, databases); PUBLIC = everyone; prefer GLOBALORGADMIN, ORGADMIN is being phased out. [UG:security-access-control-overview]
- ACCOUNTADMIN: at least two but few users, all with MFA; never a DEFAULT_ROLE, never for creating objects or automation. [UG:security-access-control-considerations]
- Grant object privileges to access roles, access roles to functional roles, top functional roles to SYSADMIN; objects of roles outside that tree are manageable only via MANAGE GRANTS. [UG:security-access-control-considerations]
- Database roles scope privileges to one database and can't be activated; grant them to account roles. [UG:security-access-control-considerations]
- Only the primary role authorizes and owns CREATE; DEFAULT_SECONDARY_ROLES defaults to ('ALL'), so set `()` or `USE SECONDARY ROLES NONE` for single-role sessions. [UG:security-access-control-overview, SQL:sql/use-secondary-roles, REL:bcr-bundles/2024_08/bcr-1692]

## Grants
- Grant to roles; `GRANT ... TO USER` (UBAC) is for person-to-person dev sharing: needs secondary roles ALL, no future grants, no CREATE or OWNERSHIP. [SQL:sql/grant-privilege-user]
- Use `CREATE SCHEMA ... WITH MANAGED ACCESS` so only the schema owner or MANAGE GRANTS holders grant. [UG:security-access-control-considerations]
- `ON ALL` covers existing objects only; add `ON FUTURE` (needs MANAGE GRANTS unless managed-schema owner); schema-level future grants void database-level ones for that type. [SQL:sql/grant-privilege]
- Inherited grants (GA 2026-09-10; opt-in `FEATURE_RBAC_INHERITED_GRANTS = 'ENABLED'`): `GRANT INHERITED <priv> ON ALL <plural> IN {ACCOUNT|DATABASE|SCHEMA}` replaces ALL+FUTURE pairs for uniform access. [UG:inherited-grants-intro]

## Users
- TYPE: PERSON (default), SERVICE, SERVICE_AGENT (AI agents), LEGACY_SERVICE (deprecated); SERVICE and SERVICE_AGENT can't use passwords, SAML, or MFA. [SQL:sql/create-user, UG:admin-user-management]
- Password deprecation: Phase 2 (rolling May-Jul 2026) makes LEGACY_SERVICE invalid in CREATE/ALTER USER; Phase 3 (rolling Aug-Oct 2026) blocks non-human passwords, converts LEGACY_SERVICE to SERVICE, and requires MFA on every human password login. [UG:security-mfa-rollout]
- Managing service-user credentials needs OWNERSHIP or MODIFY PROGRAMMATIC AUTHENTICATION METHODS on the user; grant the latter to the owning role. [UG:key-pair-auth, UG:programmatic-access-tokens]

## Humans
- SSO: SAML2 (Entra ID native) with `authenticator='externalbrowser'`; OIDC (Preview) needs `OAUTH_AUTHORIZATION_CODE`. [UG:admin-security-fed-auth-overview, REL:2026/other/2026-07-17-oidc-federated-authentication-preview]
- Local tools: `authenticator='OAUTH_AUTHORIZATION_CODE'` via `SNOWFLAKE$LOCAL_APPLICATION` (Python connector >= 3.16.0, Snowflake CLI >= 3.8.1). [UG:oauth-local-applications]
- MFA: passkeys recommended (Duo isn't replicated); `MFA_ENROLLMENT = 'REQUIRED'` or `'REQUIRED_PASSWORD_ONLY'` ('OPTIONAL' is backward-compat only); SSO MFA via `ENFORCE_MFA_ON_EXTERNAL_AUTHENTICATION = 'ALL'`. [UG:security-mfa, SQL:sql/create-authentication-policy]

## Services
- WIF (preferred for services): `CREATE USER u TYPE = SERVICE WORKLOAD_IDENTITY = (TYPE = AZURE ISSUER = 'https://login.microsoftonline.com/<tenant_id>/v2.0' SUBJECT = '<managed_identity_object_id>')`; connect with `authenticator='WORKLOAD_IDENTITY'`, `workload_identity_provider='AZURE'` (Python connector >= 3.17.0). [SF:guides-overview-secure, UG:workload-identity-federation]
- Azure WIF: tenant admin consents to the Snowflake EntraID app; user-assigned identities need `MANAGED_IDENTITY_CLIENT_ID`; no impersonation; pin tenants with `WORKLOAD_IDENTITY_POLICY = (ALLOWED_AZURE_ISSUERS = (...))`. [UG:workload-identity-federation, SQL:sql/create-authentication-policy]
- Key pair otherwise: RSA >= 2048-bit, encrypted PKCS#8, Python `authenticator='SNOWFLAKE_JWT'`; `ALTER USER u ADD KEY PAIR k PUBLIC_KEY = '...' ROLE_RESTRICTION = 'r' DAYS_TO_EXPIRY = 90` (max 10); `ROTATE KEY PAIR` keeps the old key 24 h; RSA_PUBLIC_KEY_2 swap is legacy. [UG:key-pair-auth, SQL:sql/alter-user-add-key-pair, DEV:python-connector/python-connector-connect]
- External OAuth: `EXTERNAL_OAUTH_TYPE = AZURE`; ACCOUNTADMIN, SECURITYADMIN, ORGADMIN, GLOBALORGADMIN blocked by default; tokens need a role scope; drivers pass `authenticator='oauth'` + `token`. [UG:oauth-ext-overview, UG:oauth-azure]
- PAT: user must be under a network policy (SERVICE: to generate and use; PERSON: to use); service tokens need ROLE_RESTRICTION by default and ignore secondary roles; expiry default 15, max 365 days. [UG:programmatic-access-tokens]

## Policies
- Order: network -> authentication -> password (local auth) -> session; user-level overrides account-level. [UG:authentication-policies]
- Authentication policy AUTHENTICATION_METHODS: SAML, OIDC, PASSWORD, OAUTH, KEYPAIR, PROGRAMMATIC_ACCESS_TOKEN, WORKLOAD_IDENTITY; `ALTER ACCOUNT SET AUTHENTICATION POLICY p FOR ALL SERVICE USERS`; keep a permissive break-glass admin policy. [UG:authentication-policies, SQL:sql/create-authentication-policy]
- Session policy: SESSION_IDLE_TIMEOUT_MINS (default 240) and SESSION_UI_IDLE_TIMEOUT_MINS (default 1080), 5 min-24 h; avoid CLIENT_SESSION_KEEP_ALIVE. [UG:session-policies]
- Password policy defaults: min length 14, max age 90 days, 5 retries, 15-min lockout, history 5. [SQL:sql/create-password-policy]

## Network
- Network policies reference schema-level network rules (`MODE = INGRESS`, `TYPE = IPV4 | AZURELINKID`), not ALLOWED_IP_LIST; rules can't guard Azure internal stages. [UG:network-policies, UG:network-rules]
- Allowed lists block other identifiers of their type; blocked wins on overlap; precedence integration > user > account; one policy per account or user; account activation fails unless your IP is allowed. [UG:network-policies]
- Azure Private Link (Business Critical+): SYSTEM$GET_PRIVATELINK_CONFIG, SYSTEM$AUTHORIZE_PRIVATELINK, DNS, then SYSTEM$ENFORCE_PRIVATELINK_ACCESS_ONLY. [UG:privatelink-azure, UG:security-disable-public-access-privatelink]

## External access
- EGRESS network rule (`TYPE = HOST_PORT`) + SECRET + EXTERNAL ACCESS INTEGRATION (ALLOWED_NETWORK_RULES, ALLOWED_AUTHENTICATION_SECRETS); function creators need USAGE on it and READ on each secret. [DEV:external-network-access/creating-using-external-network-access]
- SECRET types: PASSWORD, GENERIC_STRING, OAUTH2, CLOUD_PROVIDER_TOKEN, SYMMETRIC_KEY, WORKLOAD_IDENTITY_FEDERATION. [SQL:sql/create-secret]

## Monitoring
- Trust Center: Security Essentials is always on; enable CIS Benchmarks and Threat Intelligence (serverless cost); access via SNOWFLAKE.TRUST_CENTER_VIEWER or TRUST_CENTER_ADMIN. [UG:trust-center/overview]

## Environment
- Role, user, integration, and policy names come from per-environment config (dev, tst, prd); diagnostics stay read-only. [U]
- Azure DevOps CI and Airflow: WIF where the runtime has an Azure managed identity, else a named key pair with ROLE_RESTRICTION and DAYS_TO_EXPIRY. [U, UG:workload-identity-federation]
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/governance.md`
````markdown
# Data governance, sharing, and continuity
Tags → skill://snowflake/sources.md. Roles and grants: skill://snowflake/access.md; Time Travel and cloning: skill://snowflake/tables.md.

## Edition gates
| Capability | Edition | Source |
|---|---|---|
| Tags; database/share replication; replication groups; backups | All | UG:object-tagging/introduction, UG:account-replication-intro, UG:backups |
| Masking, row access, projection, aggregation policies; tag-based masking; tag propagation; classification; Access History; lineage; DMFs | Enterprise+ | UG:security-column-intro, UG:security-row-intro, UG:aggregation-policies, UG:classify-intro, UG:access-history, UG:data-quality-intro |
| Failover groups; account-object replication; Client Redirect; backup retention lock and legal hold | Business Critical+ | UG:replication-intro, UG:backups |

## Policy administration
- Keep tags, policies, classification profiles, and custom DMFs in one governance database (schemas such as `tags`, `policies`, `dmfs`); build qualified names from per-env config. [UG:tag-based-masking-policies, UG:security-row-using, U]
- Centralize: a security role creates policies and holds `APPLY MASKING POLICY ON ACCOUNT` and `APPLY TAG ON ACCOUNT`; object owners can't unset policies or see masked values. [UG:security-column-intro, UG:tag-based-masking-policies]
- Edit bodies in place with `ALTER MASKING POLICY` / `ALTER ROW ACCESS POLICY` (protection never lapses); simulate roles with `POLICY_CONTEXT` before rollout. [UG:security-column-intro, UG:security-row-intro]

## Masking and row access
- Check roles with `IS_ROLE_IN_SESSION('R')` (primary and secondary hierarchy; stored casing), not `CURRENT_ROLE() IN (...)`. Role names vary per env: read them from a mapping table or tag (`IS_ROLE_IN_SESSION(SYSTEM$GET_TAG_ON_CURRENT_TABLE('<db>.<sch>.allowed_role'))`). [SQL:functions/is_role_in_session, U]
- Masking applies in projections, JOIN, WHERE, and GROUP BY; an unmasked role's INSERT ... SELECT copies clear text, so protect target columns too. [UG:security-column-intro]
- A direct column policy beats a tag-based one; a column can't be in both masking and row access signatures; UDF, column, and policy types must match. [UG:tag-based-masking-policies, UG:security-column-intro]
- Row access policies run as the policy owner and filter SELECT and UPDATE/DELETE/MERGE targets, but never block INSERT; the table policy runs before view policies. [UG:security-row-intro]
- Keep mapping tables in the protected table's database (external tables not allowed); replace `EXISTS (SELECT ...)` lookups with a `MEMOIZABLE` SQL UDF returning ARRAY plus `ARRAY_CONTAINS`; cluster large tables on policy columns. [UG:security-row-intro, UG:security-row-using]

## Projection and aggregation
- Projection policy (`AS () RETURNS PROJECTION_CONSTRAINT`) hides output only; filters and joins still leak, so use it with trusted partners only. [UG:projection-policies, REL:2024/other/2024-05-03-policies]
- Aggregation policy (`AS () RETURNS AGGREGATION_CONSTRAINT`) sets a minimum group size, and small groups fold into a NULL-key remainder. Window functions, ROLLUP/CUBE, and recursive CTEs are blocked. Add an entity key for entity-level privacy. [UG:aggregation-policies]

## Tags
- Values are strings; `ALLOWED_VALUES` (<=5,000) must come first; limit is 50 tags per object and 50 distinct tags across a table's columns. [SQL:sql/create-tag, UG:object-tagging/introduction]
- Tags inherit down the hierarchy (schema to table to column), not through views; a manual set overrides inheritance; propagation and classification overwrite it. [UG:object-tagging/inheritance]
- `PROPAGATE = ON_DEPENDENCY | ON_DATA_MOVEMENT | ON_DEPENDENCY_AND_DATA_MOVEMENT` (Enterprise+): dependencies stay synced; CTAS, INSERT, MERGE, UPDATE, and COPY INTO copy once; manual target tags win; limit is 10,000 targets per transaction. [UG:object-tagging/propagation]
- Set `ON_CONFLICT` (the default value is `CONFLICT`): `ALLOWED_VALUES_SEQUENCE`, or `MERGE`, which needs irreversible `MULTI_VALUE = TRUE`. `CREATE OR ALTER TAG` resets omitted params, including `PROPAGATE`. [UG:object-tagging/propagation, UG:object-tagging/multi-value-tags, SQL:sql/create-tag]

## Tag-based policies
- `ALTER TAG t SET MASKING POLICY p_str, MASKING POLICY p_num` (one policy per data type); tag the schema to protect future tables. Tag-based row access, projection, aggregation, and join policies are (Preview, 2026-07-21). [UG:tag-based-policies, REL:2026/other/2026-07-21-tag-based-policies-preview]
- Assigned tags and policies can't be dropped; no MVs over tag-masked tables; a table moved to another schema is covered by the target schema's tag policy, not the source's. [UG:tag-based-masking-policies]

## Classification
- `CREATE SNOWFLAKE.DATA_PRIVACY.CLASSIFICATION_PROFILE p({'minimum_object_age_for_classification_days': 0, 'maximum_classification_validity_days': 30, 'auto_tag': true, 'tag_map': {...}})`; then `ALTER DATABASE d SET CLASSIFICATION_PROFILE = '<db>.<sch>.p'`. [UG:classify-auto]
- A `tag_map` from `SNOWFLAKE.CORE.SEMANTIC_CATEGORY` to your tag plus tag-based masking masks new PII automatically; dry-run with `CALL SYSTEM$CLASSIFY('<table>', '<profile>')`. [UG:classify-auto, SQL:stored-procedures/system_classify]
- Runs on serverless credits; views are excluded by default (they cost more). Read results in `ACCOUNT_USAGE.DATA_CLASSIFICATION_LATEST` (<=3 h lag). `'ai_mode': true` is (Preview, 2026-08-17). [UG:classify-intro, UG:classify-results, REL:2026/other/2026-08-17-sensitive-data-classification-ai-mode-preview]

## Audit and lineage
- `ACCOUNT_USAGE.ACCESS_HISTORY` (365 d, <=3 h lag) columns: `direct_objects_accessed`, `base_objects_accessed`, `objects_modified` (column lineage), and `policies_referenced`. [UG:access-history, SQL:account-usage/access_history]
- `OBJECT_DEPENDENCIES` misses references hidden in session variables or functions, so keep session variables out of view and UDF bodies. [UG:object-dependencies]
- `SNOWFLAKE.CORE.GET_LINEAGE('<obj>', 'TABLE', 'DOWNSTREAM', 5)` (max distance 5; 1-year retention). PUBLIC holds `VIEW LINEAGE` by default; revoke it to restrict. [SQL:functions/get_lineage-snowflake-core, UG:ui-snowsight-lineage, REL:bcr-bundles/un-bundled/bcr-1933]

## Data quality
- `ALTER TABLE t ADD DATA METRIC FUNCTION SNOWFLAKE.CORE.NULL_COUNT ON (c) EXPECTATION no_nulls (VALUE = 0)`. Expectations allow only comparison and logical operators on `VALUE`. [UG:data-quality-working, UG:data-quality-expectations]
- `DATA_METRIC_SCHEDULE` applies per object: default 1 h; `'<n> MINUTE'`, `'USING CRON ... UTC'`, or `'TRIGGER_ON_CHANGES'`; `''` suspends all. [UG:data-quality-working, REL:bcr-bundles/2025_07/bcr-2101]
- Only scheduled runs are billed; limit is 50,000 associations per account; not supported on hybrid tables, streams, or shared objects. [UG:data-quality-intro]
- System DMFs live in `SNOWFLAKE.CORE`. Custom DMFs take `TABLE(...)` args and run as the table owner unless `EXECUTE AS ROLE` is set, and that role changes policy-filtered counts. [UG:data-quality-system-dmfs, UG:data-quality-custom-dmfs, UG:data-quality-access-control]
- Evaluate `SNOWFLAKE.LOCAL.DATA_QUALITY_MONITORING_RESULTS` by `measurement_time`. [UG:data-quality-results, UG:data-quality-working]

## Sharing
- Shares are zero-copy and read-only. Direct shares stay in-region; listings reach any region via auto-fulfillment (10 TB default cap). [UG:data-sharing-intro, SF:guides-overview-sharing, SF:collaboration/collaboration-listings-about, SF:collaboration/provider-listings-auto-fulfillment]
- Share secure views or UDFs over a private schema, filtered on `CURRENT_ACCOUNT()`; test with `SIMULATED_DATA_SHARING_CONSUMER`. `SECURE_OBJECTS_ONLY = FALSE` is irreversible. [UG:data-sharing-secure-views, UG:data-sharing-views]
- Consumers get NULL from `CURRENT_ROLE`, `CURRENT_USER`, and `IS_ROLE_IN_SESSION`, so share a database role and check `IS_DATABASE_ROLE_IN_SESSION`. [UG:security-column-intro, UG:data-sharing-policy-protected-data]
- Reader accounts (`CREATE MANAGED ACCOUNT ... TYPE = READER`): the provider pays all credits, so add resource monitors (default limit is 20 accounts). [UG:data-sharing-reader-create]
- Cross-region direct share: a replication group with `OBJECT_TYPES = DATABASES, SHARES` that includes every database the view references. [UG:secure-data-sharing-across-regions-platforms]

## Continuity
- Failover groups can be promoted to read-write; set `REPLICATION_SCHEDULE` on the primary (lag <= 2x interval). [UG:account-replication-intro, UG:replication-intro]
- Not replicated: temporary, external, and hybrid tables, or Time Travel history. Replicate the policy database first; dangling policy references leave targets unprotected. [UG:account-replication-intro, UG:account-replication-considerations]
- Backups (GA 2025-12-10; never use the deprecated `SNAPSHOT` names): `CREATE BACKUP SET s FOR TABLE t WITH BACKUP POLICY p`; restore with `CREATE TABLE t2 FROM BACKUP SET s IDENTIFIER '<id>'`. [UG:backups, REL:2025/other/2025-12-10-worm-backups]
- `WITH RETENTION LOCK` is irreversible, even by Support, and blocks dropping the containing schema, database, or account. New backups skip transient tables (Pending). [UG:backups, REL:bcr-bundles/2026_06/bcr-2360]
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/devops.md`
````markdown
# CLI, connections, and change management
Tags → skill://snowflake/sources.md. Auth objects (users, keys, PATs, policies) → skill://snowflake/access.md; HCL → skill://terraform.

## Snowflake CLI
- New scripts use `snow`, never `snowsql` (legacy, feature-frozen; 1.5.x supported to 2028-04-16); port with `snow helpers import-snowsql-connections`. [UG:snowsql, UG:snowsql-migrate]
- Install with `uv tool install snowflake-cli` (Python 3.10+); pin the version in CI. OIDC needs CLI 3.11+, `snow dcm` 3.24.0+. [CLI:installation/installation, CLI:cicd/github-action, CLI:data-pipelines/dcm-projects]
- Config lookup: `--config-file` > `$SNOWFLAKE_HOME` > `~/.snowflake/` (if present) > OS default (Windows `%USERPROFILE%\AppData\Local\snowflake\`). A `connections.toml` there (sections `[name]`) replaces `config.toml` connections; `default_connection_name` stays in `config.toml`. [CLI:connecting/configure-cli, CLI:connecting/configure-connections]
- Value precedence: flags > `SNOWFLAKE_CONNECTIONS_<NAME>_<KEY>` > toml > generic `SNOWFLAKE_<KEY>`. Commit only credential-free toml; `0600` on Linux/macOS. [CLI:connecting/configure-connections, CLI:cicd/integrate-ci-cd]
- `-x`/`--temporary-connection` ignores toml and uses flags plus `SNOWFLAKE_*` env vars. Smoke-check with `snow connection test -c <name>`. [CLI:connecting/configure-connections]
- Windows: set `PYTHONUTF8=1` or `[cli.encoding]` `file_io`/`subprocess`/`stdout = "utf-8"`; PowerShell 5.x `Out-File utf8` writes a BOM the CLI won't strip. [CLI:connecting/configure-cli]

## Running SQL
- `snow sql -f a.sql -f b.sql` runs files in order on one connection; add `--single-transaction` for all-or-nothing and `--enhanced-exit-codes` (2 = bad options, 5 = query error). [CLI:sql/execute-sql, CLI:command-reference/sql-commands/sql]
- Variables: `<% name %>` + `-D "name=value"`, or `<% ctx.env.name %>` from `env:` in `snowflake.yml` (`definition_version: 2`; same-name shell var overrides). SnowSQL `&name` also resolves by default: pass `--enable-templating STANDARD`. [CLI:sql/execute-sql, CLI:project-definitions/use-sql-variables, CLI:project-definitions/about]
- Put `$$` Scripting blocks in files, not `-q` (shells expand `$$`). [CLI:sql/execute-sql]

## Identifiers and drivers
- `account = "<orgname>-<accountname>"`; no locators, no `.snowflakecomputing.com` suffix; account/user/role/warehouse/database from per-env config. [UG:admin-account-identifier, DEV:python-connector/python-connector-connect, U]
- Python: `snowflake.connector.connect(connection_name=...)`. Unattended auth: `authenticator="WORKLOAD_IDENTITY"` + `workload_identity_provider="AZURE"` or `"OIDC"` (+ `token`), connector 3.17.0+; else `SNOWFLAKE_JWT` + `private_key_file`, or `PROGRAMMATIC_ACCESS_TOKEN`. [DEV:python-connector/python-connector-connect, UG:workload-identity-federation]
- Tag work: `session_parameters={"QUERY_TAG": ...}` (≤2000 chars) → `ACCOUNT_USAGE.QUERY_HISTORY.query_tag`. [DEV:python-connector/python-connector-connect, SQL:parameters, SQL:account-usage/query_history]
- Bind values, never f-strings/`format()`: default `pyformat` (`%s`, client-side); `paramstyle="qmark"` binds server-side and speeds `executemany`, but can't bind IN lists. [DEV:python-connector/python-connector-example]
- Stay on connector 4.x: 5.x (Universal Core) is a Preview RC; Snowpark, CLI, `snowflake-ml-python` require <5. [DEV:python-connector/python-connector-universal-core]
- SQLAlchemy: `snowflake.sqlalchemy.URL()` lacks key-pair fields, use `connect_args={"private_key": ...}`; `connection.close()` before `engine.dispose()`. New packages need approval, then `uv add`. [DEV:python-connector/sqlalchemy, U]

## Git and EXECUTE IMMEDIATE FROM
- `CREATE API INTEGRATION ... API_PROVIDER = git_https_api API_ALLOWED_PREFIXES = (...)` (OAuth2, `SNOWFLAKE_GITHUB_APP`, or `ALLOWED_AUTHENTICATION_SECRETS` with a `TYPE = password` secret), then `CREATE GIT REPOSITORY ... ORIGIN = 'https://...'`; Azure DevOps supported. [DEV:git/git-setting-up-public, DEV:git/git-overview]
- `ALTER GIT REPOSITORY <r> FETCH` before use; paths `@r/branches/<b>/`, `@r/tags/<t>/`, `@r/commits/<sha>/`. Only Workspaces (GA 2025-09-11), Streamlit, Notebooks write back; no submodules; ≤2 GB. [DEV:git/git-operations, DEV:git/git-limitations, REL:2025/other/2025-09-11-workspaces-ga]
- `snow git execute @r/branches/main/dir/ -D "env='dev'"` runs matching `.sql`/`.py` (path ends `/`; `.py` gets `-D` keys upper-cased in `os.environ`). [CLI:command-reference/git-commands/execute]
- `EXECUTE IMMEDIATE FROM @stage/f.sql USING (env => 'dev')` renders Jinja2 (or `--!jinja` header); `DRY_RUN = TRUE` returns rendered SQL (`USING`, `DRY_RUN` Preview). File ≤10 MB, UTF-8, uncompressed; nesting ≤5; not atomic. [SQL:sql/execute-immediate-from]

## Change management
- DCM Projects (GA 2026-08-07) own in-database objects: `manifest.yml` targets + `DEFINE` SQL, plan then deploy. Terraform `snowflakedb/snowflake` owns account objects (only latest ≥2.0.0 supported). One tool per object. [UG:dcm-projects/dcm-projects-overview, DEV:builders/devops-with-snowflake, UG:terraform, REL:2026/other/2026-08-07-dcm-projects-ga]
- DCM Preview: `snow dcm test`/`preview`, `DEFINE MASKING POLICY`/`ROW ACCESS POLICY`/`STREAMLIT`/`CODE BUNDLE`, `ATTACH TAG`. Caps: 10,000 entities, 10 MB; template vars aren't redacted. [REL:2026/other/2026-08-07-dcm-projects-ga, REL:2026/other/2026-09-24-dcm-projects-capability-updates, UG:dcm-projects/dcm-projects-overview]
- `snow dcm purge` drops every managed object; `snow dcm drop` leaves them unmanaged: never run either unasked. [CLI:data-pipelines/dcm-projects, U]
- Standalone scripts: `CREATE OR ALTER` (GA 2026-07-14) keeps data, grants, tags but unsets omitted properties (FUNCTION too after BCR 2026_04): state every non-default property. [SQL:sql/create-or-alter, REL:2026/other/2026-07-14-create-or-alter-ga, REL:bcr-bundles/2026_04/bcr-2264]
- CREATE OR ALTER can't rename (drop+add loses data), run CTAS, or cast incompatibly; suspend tasks first. [SQL:sql/create-or-alter]
- dev/tst/prd each get own target, service user, and database or account; test data via `CREATE DATABASE <tst> CLONE <src>` (→ skill://snowflake/tables.md). [DEV:builders/devops-with-snowflake, SQL:sql/create-clone, U]

## CI/CD
- PR runs `snow dcm plan --target <env>`; merge runs `snow dcm deploy` or `snow sql -f`; then verify. [CLI:cicd/integrate-ci-cd]
- Azure DevOps: `ConfigureSnowflakeCLI@1` (Preview), `useWorkloadIdentity: true`, `connectedServiceName: <ARM connection>`; user `WORKLOAD_IDENTITY = (TYPE = OIDC ISSUER = 'https://vstoken.dev.azure.com/<tenant>' SUBJECT = 'sc://<org>/<project>/<conn>' OIDC_AUDIENCE_LIST = ('api://AzureADTokenExchange'))`; map `SNOWFLAKE_TOKEN: $(SNOWFLAKE_TOKEN)` in each later step. [CLI:cicd/azure-devops-extension]
- GitHub: `snowflakedb/snowflake-actions@v3` (GA), `use-oidc: true`, `permissions: id-token: write`. [CLI:cicd/github-action]
- No OIDC: `SNOWFLAKE_PRIVATE_KEY_RAW` secret + `SNOWFLAKE_AUTHENTICATOR=SNOWFLAKE_JWT`; passwords are legacy. [CLI:cicd/integrate-ci-cd, CLI:cicd/azure-devops-extension]
- Openflow gen 2 connectors deploy as code too: config in a Git repository stage, versioned promotion with `COMMIT` (skill://snowflake/streaming.md §Openflow). [UG:data-integration/openflow/gen2/connector-versioning]
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/snowpark.md`
````markdown
# Snowpark and Python in Snowflake
Tags → skill://snowflake/sources.md. Python style → skill://python; ML compute and serving → skill://snowflake/ml-models.md.

## Sessions
- Local: `Session.builder.config("connection_name", name).create()` with `name` from config; never literal credentials or env names. [DEV:snowpark/python/creating-session, U]
- In Snowflake: procs receive `session` as first handler arg; notebooks call `get_active_session()` (`snowflake.snowpark.context`); `Session.builder.getOrCreate()` returns the last created session. [DEV:snowpark/python/creating-sprocs, UG:ui-snowsight/notebooks-sessions, DEV:snowpark/reference/python/latest/snowpark/api/snowflake.snowpark.Session.SessionBuilder.getOrCreate]

## DataFrames
- Lazy: transforms only build SQL; actions (`collect`, `count`, `show`, `to_pandas`, `save_as_table`) run it in Snowflake, UDFs included. [DEV:snowpark/python/working-with-dataframes]
- No client-side row loops or per-row `session.sql`; use set-based DataFrame ops or a UDF/UDTF so Snowflake parallelizes. [DEV:snowpark/index]
- `session.sql(q, params=[...])` binds qmark `?` only; never format values into SQL. [DEV:snowpark/reference/python/latest/snowpark/api/snowflake.snowpark.Session.sql]
- `to_pandas()` loads every row into client memory; reduce first or iterate `to_pandas_batches()`. [DEV:snowpark/reference/python/latest/snowpark/api/snowflake.snowpark.DataFrame.to_pandas_batches]
- Reused expensive intermediate: `cache_result()` (temp table, dropped at session close). [DEV:snowpark/reference/python/latest/snowpark/api/snowflake.snowpark.DataFrame.cache_result]
- `save_as_table(name, mode=)`: `append` (creates if missing), `overwrite` (drop+recreate; `overwrite_condition` = atomic delete-insert), `truncate`, `errorifexists`, `ignore`; `table_type="transient"`. [DEV:snowpark/reference/python/latest/snowpark/api/snowflake.snowpark.DataFrameWriter.save_as_table]
- pandas on Snowflake: `import modin.pandas as pd` + `import snowflake.snowpark.modin.plugin` (extra `snowflake-snowpark-python[modin]`); `pd.read_snowflake(...)`, `df.to_snowflake(name, if_exists=..., index=False)`. [DEV:snowpark/python/pandas-on-snowflake]
- Its hybrid execution (default since 1.40.0) runs small frames in local pandas (`df.get_backend()`); `apply`, `iterrows`, `plot` pull data local. [DEV:snowpark/python/pandas-on-snowflake]

## UDFs, UDTFs, UDAFs
- UDTF: `process` yields tuples; `__init__`/`end_partition` hold partition state; call `TABLE(f(...) OVER (PARTITION BY k))`. UDAF: `aggregate_state` (max 64 MB serialized), `accumulate`, `merge`, `finish`; no OVER. [DEV:udf/python/udf-python-tabular-functions, DEV:udf/python/udf-python-aggregate-functions]
- Inference or pandas libraries: vectorized UDF (pandas batch in, same-length Series out) via Snowpark `PandasDataFrame`/`PandasSeries` hints or SQL `@vectorized(input=pandas.DataFrame)`; 180 s per batch; `max_batch_size` only caps. [DEV:udf/python/udf-python-batch, DEV:snowpark/python/creating-udfs]
- Whole partition as one DataFrame: UDTF with vectorized `end_partition` (exclusive with vectorized `process`). [DEV:udf/python/udf-python-tabular-vectorized]
- No network in handlers: stage models/data, load once at module scope or `@cachetools.cached`; handlers thread-safe, single-threaded, stateless across rows. [DEV:udf/python/udf-python-designing, DEV:udf/python/udf-python-packages, DEV:snowpark/python/creating-udfs]
- Imported files: `sys._xoptions["snowflake_import_directory"]`; per-call stage files: `SnowflakeFile.open` on a `BUILD_SCOPED_FILE_URL`. [DEV:snowpark/python/creating-udfs]
- CPU parallelism: `joblib.Parallel`, never `multiprocessing`. [DEV:udf/python/udf-python-tabular-functions, DEV:stored-procedure/python/procedure-python-limitations]
- Snowpark `udf`/`udtf`/`sproc` default temporary; deploy with `is_permanent=True, stage_location="@...", replace=True`; use `session.udf.register` in multi-session code. [DEV:snowpark/python/creating-udfs]
- `RUNTIME_VERSION` GA 3.10-3.14; 3.9 decommissioned 30 Apr 2026, 3.10 deprecated 04 Oct 2026. [DEV:udf/python/udf-python-creating, DEV:python-runtime-support-policy]
- `SECURE` only to hide data or logic; it disables optimizations. [DEV:secure-udf-procedure]

## Stored procedures
- Proc for DDL/DML, orchestration, admin, training; UDF for per-row values in SQL. [DEV:stored-procedures-vs-udfs]
- Default `EXECUTE AS OWNER` (proc's schema, no caller session state, no named temp objects); `EXECUTE AS CALLER` for caller privileges and context; `RESTRICTED CALLER` is Preview. [DEV:stored-procedure/stored-procedures-rights, SQL:sql/create-procedure, DEV:stored-procedure/python/procedure-python-limitations]
- Add `snowflake-snowpark-python` to `packages` (server copy usually one version behind); no PUT/GET via `session.sql`; one-off `CALL ... WITH` needs no CREATE PROCEDURE. [DEV:stored-procedure/python/procedure-python-writing, DEV:stored-procedure/python/procedure-python-limitations, DEV:stored-procedure/python/procedure-python-overview]

## Packages
- Source: `ARTIFACT_REPOSITORY` > `DEFAULT_PYTHON_ARTIFACT_REPOSITORY` (schema > database > account) > implicit (Anaconda for 3.13 and lower in existing accounts; PyPI for 3.14+ and new accounts since 26 Jun 2026); set it explicitly per environment. [DEV:udf/python/udf-python-packages, REL:bcr-bundles/un-bundled/bcr-2325]
- PyPI: `ARTIFACT_REPOSITORY = snowflake.snowpark.pypi_shared_repository` (role `SNOWFLAKE.PYPI_REPOSITORY_USER`; not in anonymous procs); pin or bound versions; x86-only wheels need `RESOURCE_CONSTRAINT=(architecture='x86')`. [DEV:udf/python/udf-python-packages]
- Anaconda: check `INFORMATION_SCHEMA.PACKAGES` (`LANGUAGE = 'python'`); list top-level packages only; 2026_06 bundle requires `SNOWFLAKE.ANACONDA_REPOSITORY_USER`. [DEV:udf/python/udf-python-packages, REL:bcr-bundles/2026_06/bcr-2379]
- Versions freeze at CREATE; pin in temp UDFs; `DESCRIBE FUNCTION` lists them; cold warehouses install on first call (~30 s). [DEV:udf/python/udf-python-packages, DEV:snowpark/python/creating-udfs]
- Private code: stage zips in `IMPORTS` (unique file names); build with `snow snowpark package create`/`upload`. [DEV:udf/python/udf-python-creating, CLI:snowpark/upload]
- Any new package or repository needs explicit user approval; locally `uv add`. [U]
- UDF memory errors or single-node training: Snowpark-optimized warehouse (skill://snowflake/warehouses.md). [DEV:udf/python/udf-python-designing, UG:warehouses-snowpark-optimized]

## Telemetry
- stdlib `logging.getLogger(name)` (`extra=` lands in RECORD_ATTRIBUTES); traces via `from snowflake import telemetry` (`add_event`, `set_span_attribute`). [DEV:logging-tracing/logging-python, DEV:logging-tracing/tracing-python]
- Default event table `SNOWFLAKE.TELEMETRY.EVENTS` (read `EVENTS_VIEW`); per-database `EVENT_TABLE` is Enterprise+. [DEV:logging-tracing/event-table-setting-up]
- Defaults `LOG_LEVEL=OFF`, `TRACE_LEVEL=OFF`, `METRIC_LEVEL=NONE`; set on function/proc/schema/database; session vs object: most verbose wins. [SQL:parameters, DEV:logging-tracing/telemetry-levels]

## Notebooks and Streamlit
- Notebooks in Workspaces (GA 05 Feb 2026): Container Runtime on a compute pool, Python 3.10-3.12, SQL/Snowpark still on a warehouse; `!pip install` (PyPI repo, staged `.whl`, EAI), no Anaconda; fully qualify names. [REL:2026/other/2026-02-05-notebooks-in-workspaces, UG:ui-snowsight/notebooks-in-workspaces/notebooks-in-workspaces-migrate, UG:ui-snowsight/notebooks-in-workspaces/notebooks-in-workspaces-packages-runtime]
- Legacy Notebooks: no creation since 01 Sep 2026 (`CREATE NOTEBOOK PROJECT` instead); run, edit and `EXECUTE NOTEBOOK` stop Nov 2026. [REL:bcr-bundles/un-bundled/bcr-disable-legacy-notebooks]
- Streamlit warehouse runtime: per-viewer, Conda `environment.yml`, up to Python 3.11. Container runtime: shared, PyPI `requirements.txt`/`pyproject.toml`, Python 3.11, cross-session caching, cheaper for busy apps. Session: `st.connection("snowflake").session()`. [DEV:streamlit/app-development/runtime-environments]
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/ml-features.md`
````markdown
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
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/ml-models.md`
````markdown
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
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/cortex.md`
````markdown
# Cortex AI
Tags → skill://snowflake/sources.md. Custom-model serving → skill://snowflake/ml-models.md.

## AI functions
- New code uses `AI_*`; `SNOWFLAKE.CORTEX.*` LLM functions are backward-compat only and "will be deprecated by the end of 2026". [SQL:functions/complete-snowflake-cortex, CX:aisql-programmatic-use]

| Avoid `SNOWFLAKE.CORTEX.` | Use |
|---|---|
| `COMPLETE`, `TRY_COMPLETE` | `AI_COMPLETE` |
| `CLASSIFY_TEXT`, `EXTRACT_ANSWER` | `AI_CLASSIFY`, `AI_EXTRACT` |
| `SENTIMENT`, `ENTITY_SENTIMENT` | `AI_SENTIMENT` |
| `EMBED_TEXT_768`, `EMBED_TEXT_1024` | `AI_EMBED` |
| `TRANSLATE`, `SUMMARIZE_AGG`, `COUNT_TOKENS`, `PARSE_DOCUMENT` | `AI_` + same name |
| Python `snowflake.cortex.complete` | `snowflake.snowpark.functions.ai_complete` |

- `AI_COMPLETE(model, prompt [, model_parameters, response_format, show_details])`; defaults `temperature` 0, `max_tokens` 4096, `guardrails` FALSE; `show_details => TRUE` adds `usage`. [SQL:functions/ai_complete-single-string]
- Structured output: `response_format => TYPE OBJECT(...)` or a JSON schema object; OpenAI models need `additionalProperties: false` and full `required` per node. [SQL:functions/ai_complete-structured-outputs]
- Files: `PROMPT('… {0}', TO_FILE('@stage', 'path'))` from a named server-side-encrypted stage; user/table stages fail. [CX:ai-complete-document-intelligence, SQL:functions/ai_embed]
- Failed rows return NULL (2026_02 bundle, generally enabled); final arg `return_error_details` TRUE yields `{value, error}`; not AI_AGG, AI_SUMMARIZE_AGG, AI_EMBED. [REL:bcr-bundles/2026_02/bcr-2184, REL:bcr-bundles/2026_02_bundle]
- Routine tasks → task functions, open-ended → AI_COMPLETE: `AI_CLASSIFY(input, labels [, {'output_mode': 'multi'}])` (best ≤20 labels), `AI_FILTER(PROMPT(...))` in WHERE or JOIN ON, `AI_SENTIMENT`, `AI_TRANSLATE`, `AI_REDACT`, cross-row `AI_AGG`/`AI_SUMMARIZE_AGG` with GROUP BY; `AI_SUMMARIZE` is Preview. [CX:aisql, SQL:functions/ai_classify, SQL:functions/ai_filter, SQL:functions/ai_agg, REL:2026/other/2026-09-14-ai-summarize-multimodal-preview]
- Reusable prompts: `CREATE AI FUNCTION f(x VARCHAR) RETURNS VARCHAR AS $$ <AI_COMPLETE expr> $$`; `FROM EXPERIMENT e RUN r` promotes an optimization winner (Preview). [SQL:sql/create-ai-function, REL:2026/other/2026-09-21-ai-function-optimization-preview]

## Documents
- `AI_EXTRACT(file => TO_FILE(...), responseFormat => {...})` extracts entities, lists, tables (≤125 pages, 100 MB, 100 questions, table question = 10; 970 tokens/page) and replaces Document AI, decommissioned 2026-03-16. [SQL:functions/ai_extract, REL:bcr-bundles/un-bundled/bcr-2156]
- `AI_PARSE_DOCUMENT(file, {'mode': 'LAYOUT', 'page_split': TRUE})` returns Markdown for chunking; ≤2,000 pages, billed per page. [CX:parse-document]

## Models, access, cost
- Keep model names in config; check `SHOW CORTEX BASE MODELS IN SCHEMA SNOWFLAKE.MODELS` for `lifecycle_status`, `legacy_date`, `eol_date`. [SQL:sql/show-cortex-base-models, U]
- `CORTEX_ENABLED_CROSS_REGION` (ACCOUNTADMIN; agents only read it): `ANY_REGION`, `AZURE_US`, `AZURE_EU`, `AWS_*`, `DISABLED`; billed in home region. Azure scopes lack Claude: Claude needs `ANY_REGION`. [CX:cross-region-inference, CX:cortex-agents, U]
- Calls need `USE AI FUNCTIONS` (or `USE AI FUNCTION <name>`) plus `SNOWFLAKE.CORTEX_USER` or `AI_FUNCTIONS_USER`; scoped: `CORTEX_EMBED_USER`, `CORTEX_AGENT_USER`, `CORTEX_ANALYST_USER`. [CX:aisql-privileges-and-access, CX:cortex-agents, CX:cortex-analyst]
- Model access is RBAC-only (`CORTEX_MODELS_ALLOWLIST` accepts only `'None'` since 2026-08-05): grant `SNOWFLAKE."CORTEX-MODEL-ROLE-<MODEL>"` to execution roles, not only PUBLIC; drop default all-models via `SNOWFLAKE.LOCAL.REVOKE_FROM_PUBLIC_APPLICATION_ROLE('APP_ROLE', 'CORTEX-MODEL-ROLE-ALL')`. [REL:bcr-bundles/un-bundled/bcr-2378, CX:aisql-privileges-and-access]
- Bills tokens (in+out; AI_EMBED in only) or pages (AI_PARSE_DOCUMENT); task functions add hidden prompt tokens; warehouse ≤ MEDIUM; interactive latency → REST API. [CX:aisql-cost, CX:aisql]
- Size prompts on samples with `AI_COUNT_TOKENS` and `QUERY_TAG`; runaway guard: task over `CORTEX_AI_FUNCTIONS_USAGE_HISTORY` (hourly, ≤5 min lag) summing `CREDITS` per `QUERY_ID` where `BOOLOR_AGG(IS_COMPLETED) = FALSE` → `SYSTEM$CANCEL_QUERY`. [SQL:functions/ai_count_tokens, SQL:account-usage/cortex_ai_functions_usage_history, CX:ai-func-cost-management]
- Cortex Guard (`'guardrails': TRUE`) filters harmful output; Cortex AI Guardrails (Enterprise+, `AI_SETTINGS`) block prompt injection in Agents, CoWork, CoCo. [SQL:functions/ai_complete-single-string, CX:cortex-ai-guardrails]

## Cortex Search
- `CREATE CORTEX SEARCH SERVICE s ON chunk ATTRIBUTES cols WAREHOUSE = wh TARGET_LAG = '1 hour' EMBEDDING_MODEL = '…' AS <query>`: model is immutable (default `snowflake-arctic-embed-m-v1.5`); source needs incremental refresh and change tracking. [SQL:sql/create-cortex-search, CX:cortex-search/cortex-search-overview]
- Chunk ≤512 tokens via `SNOWFLAKE.CORTEX.SPLIT_TEXT_RECURSIVE_CHARACTER(text, 'markdown', chunk_size, overlap)` (sizes in characters). [CX:cortex-search/cortex-search-overview, SQL:functions/split_text_recursive_character-snowflake-cortex]
- Set a TEXT `PRIMARY KEY` for changed-rows refresh; MERGE sources (CREATE OR REPLACE re-embeds all). [CX:cortex-search/cortex-search-overview, CX:cortex-search/cortex-search-costs]
- Query via Python `.search(query, columns, filter, limit)` or `/api/v2/databases/{db}/schemas/{sch}/cortex-search-services/{svc}:query` (limit default 10, max 1000; filters `@eq @contains @gte @lte @and @or @not`); `SEARCH_PREVIEW` is test-only; retry 429s. [CX:cortex-search/query-cortex-search-service, CX:cortex-search/cortex-search-overview]
- Owner's rights: USAGE grantees see every indexed row despite source row access or masking policies. [CX:cortex-search/query-cortex-search-service]
- RAG: Search top-k chunks into an `AI_COMPLETE` prompt; ≥2,000 offline queries → `LATERAL CORTEX_SEARCH_BATCH(...)`. [CX:cortex-search/cortex-search-overview, CX:cortex-search/batch-cortex-search]
- Serving bills per GB-month while resumed: set `AUTO_SUSPEND` (≥1800 s) on dev/idle services. [CX:cortex-search/cortex-search-overview, CX:cortex-search/cortex-search-costs]

## Vectors
- `VECTOR(FLOAT|INT, n)` (n ≤ 4096); compare via `VECTOR_COSINE_SIMILARITY`, `VECTOR_INNER_PRODUCT`, `VECTOR_L2_DISTANCE`; unsupported in VARIANT, clustering keys, Iceberg, Snowpipe; load as ARRAY, cast. [SQL:data-types-vector]
- Dims: 768 = `snowflake-arctic-embed-m-v1.5`, `e5-base-v2`; 1024 = `snowflake-arctic-embed-l-v2.0`, `voyage-multilingual-2`. [SQL:functions/ai_embed, CX:vector-embeddings]

## Analyst, Agents, MCP
- Semantic layer = `CREATE SEMANTIC VIEW` (`AI_SQL_GENERATION`, `AI_VERIFIED_QUERIES`); staged YAML models are legacy; prefer Cortex Agents over standalone Analyst. [SQL:sql/create-semantic-view, CX:cortex-analyst, REL:2026/other/2026-08-28-cortex-analyst-transition-cortex-agents]
- `CREATE OR REPLACE AGENT a COPY GRANTS FROM SPECIFICATION $$ <YAML> $$`: `models.orchestration: auto`, `orchestration.budget {seconds, tokens}`, `tools`, `tool_resources`. [SQL:sql/create-agent]
- `POST /api/v2/databases/{db}/schemas/{sch}/agents/{a}:run` runs as the caller's default role: needs `CORTEX_AGENT_USER` or `CORTEX_USER` plus USAGE on the agent and tools. [CX:cortex-agents]
- CoWork visibility: `ALTER SNOWFLAKE INTELLIGENCE SNOWFLAKE_INTELLIGENCE_OBJECT_DEFAULT ADD AGENT db.sch.a`; the `SNOWFLAKE_INTELLIGENCE.AGENTS` schema is deprecated. [CX:snowflake-cowork/deploy-agents]
- `CREATE MCP SERVER`: expose one `CORTEX_AGENT_RUN` tool; `SYSTEM_EXECUTE_SQL` only on a separate least-privilege server; OAuth over PATs. [CX:cortex-agents-mcp]
- REST inference: `/api/v2/cortex/v1/chat/completions` (OpenAI) or `/api/v2/cortex/v1/messages` (Claude); send `max_completion_tokens`. [CX:cortex-rest-api]

## Fine-tuning
- `SNOWFLAKE.CORTEX.FINETUNE('CREATE', 'db.sch.m', 'llama3.1-8b', '<SELECT … AS prompt, … AS completion>')`: sole base model, needs CREATE MODEL, no cross-region inference; infer via `AI_COMPLETE('db.sch.m', …)`. [CX:cortex-finetuning]
````

#### `C:/Users/jpollock/.omp/agent/skills/snowflake/sources.md`
````markdown
# Snowflake KB sources
Verified 2026-09-25 against docs.snowflake.com (pages found through the llms.txt section indexes; markdown at `<page URL>.md`), Snowflake release notes and behavior change (BCR) bundles, the Apache Airflow Snowflake provider docs, the SQLFluff dialect reference, one Snowflake blog post, and the user's AGENTS.md. Re-verify on snowflake-ml-python, Snowflake CLI, Python connector, or Snowflake provider major releases; when a listed BCR bundle becomes generally enabled; and after 2026-12-31 (legacy Cortex function deprecation).

| tag | source |
|---|---|
| `SF:<path>` | https://docs.snowflake.com/en/<path> |
| `UG:<p>` | `SF:user-guide/<p>` |
| `SQL:<p>` | `SF:sql-reference/<p>` |
| `DEV:<p>` | `SF:developer-guide/<p>` (includes the versioned Snowpark and snowflake-ml-python API reference) |
| `ML:<p>` | `SF:developer-guide/snowflake-ml/<p>` |
| `CX:<p>` | `SF:user-guide/snowflake-cortex/<p>` |
| `SPCS:<p>` | `SF:developer-guide/snowpark-container-services/<p>` |
| `CLI:<p>` | `SF:developer-guide/snowflake-cli/<p>` |
| `REL:<p>` | `SF:release-notes/<p>` |
| `IDX` | https://docs.snowflake.com/llms.txt (documentation index and its notes for LLMs) |
| `BLOG:<slug>` | https://www.snowflake.com/en/blog/<slug>/ (`managing-snowflakes-compute-resources`: published 2020-12-16, modified 2024-08-12) |
| `AFP:<p>` | https://airflow.apache.org/docs/apache-airflow-providers-snowflake/stable/<p>.html |
| `SQLFLUFF` | https://docs.sqlfluff.com/en/stable/reference/dialects.html (dialect label `snowflake`) |
| `U` | user environment, observed 2026-09-25: AGENTS.md policy (separate dev, tst, prd; external services read-only unless permitted; Python only through uv; no new dependencies without approval; Azure, Azure DevOps, Entra ID; Airflow on Astronomer) and the omp quality gate (sqlfluff on changed `*.sql`) |

## Snapshot
- Libraries: snowflake-ml-python 2.1.0 (2026-09-14); 2.0.0 (2026-09-10) needs Python ≥ 3.10, moves scikit-learn/xgboost/shap to extras, deprecates `snowflake.ml.modeling` estimators and preprocessing, and reworks `run_batch`. Python connector 4.x (5.x Universal Core is a Preview RC; Snowpark, CLI, snowflake-ml-python require < 5); workload identity needs connector ≥ 3.17.0, local-app OAuth ≥ 3.16.0. Snowflake CLI: OIDC ≥ 3.11, `snow dcm` ≥ 3.24.0. Airflow Snowflake provider 6.x removed `SnowflakeOperator`. SnowSQL 1.5.x supported to 2028-04-16, no new features.
- Python runtimes for UDFs and procedures: 3.10–3.14 GA; 3.9 decommissioned 2026-04-30; 3.10 deprecated 2026-10-04. Implicit package source: Anaconda for ≤ 3.13 in existing accounts, PyPI for 3.14+ and accounts created since 2026-06-26 (BCR 2325).
- GA: Gen2 standard warehouses (default where available, BCR 2026_03); Adaptive compute 2026-06-16; interactive tables 2025-12-11; Query Insights 2025-10-07; Optima Clustering for newly clustered tables from 2026-09-01; Snowpipe per-GB pricing (0.0037 credits/GB) 2025-12-08; Snowpipe Streaming high-performance (Azure 2025-11-05), Elastic Channels 2026-09-15; Kafka connector v4 2026-04-20; Openflow gen 2 deployments and runtimes 2026-09-08 (new gen 1 deployments retired 2026-09-09); dynamic tables `ADAPTIVE` refresh 2026-07-30, custom incremental 2026-07-27; task `OVERLAP_POLICY` 2026-03-13; alerts on new data 2025-07-18; dbt Projects on Snowflake 2025-11-06; Workspaces 2025-09-11; Notebooks in Workspaces 2026-02-05; `CREATE OR ALTER` 2026-07-14; DCM Projects 2026-08-07; workload identity federation 2025-08-14; PATs 2025-04-30; named key pairs 2026-07-15; `SERVICE_AGENT` users 2026-07-23; inherited grants 2026-09-10; backups 2025-12-10; Feature Store 2024-09-25; Datasets 2025-03-20; ML Jobs 2025-08-12; ML Experiments 2026-02-19; real-time model inference (REST) with snowflake-ml-python 1.25.0; AI_COMPLETE 2025-11-21; AI_CLASSIFY, AI_EMBED, AI_SIMILARITY, AI_TRANSCRIBE 2025-11-04; AI_FILTER, AI_AGG, AI_SUMMARIZE_AGG 2026-01-22; AI_COUNT_TOKENS 2026-01-27; AI_REDACT 2025-12-08; Cortex Agents and the Snowflake-managed MCP server 2025-11-04; Cortex Search multi-index 2026-03-12.
- GA (tables): hybrid tables on Azure 2025-10-06 (CHECK constraints 2026-09-24); Snowflake storage for Iceberg (`EXTERNAL_VOLUME = 'SNOWFLAKE_MANAGED'`) 2026-06-01; writes to externally managed Iceberg and catalog-linked databases 2025-10-17; storage lifecycle policies 2025-11-07 (Azure COOL tier 2026-01-23; COLD is AWS/GCP only); VARCHAR/VARIANT/ARRAY/OBJECT caps raised to 128 MB (BCR 2025_03, default VARCHAR length still 16777216).
- Preview: tag-based row access, projection, aggregation, join policies (2026-07-21); classification `ai_mode` (2026-08-17); Postgres online feature store (2026-07-10) and feature groups; stream and real-time feature views; AI_SUMMARIZE (2026-09-14); AI Function Optimization (2026-09-21); OIDC federated SSO (2026-07-17); external secret providers (2026-09-10); DCM `test`/`preview`; `EXECUTE IMMEDIATE FROM ... USING`/`DRY_RUN`; Azure DevOps `ConfigureSnowflakeCLI@1`; Container Runtime version pinning (2026-02-18); custom runtime images (2026-05-19); shadow-traffic gateways (2026-09-08); `RESTRICTED CALLER`; Snowpark-optimized `MEMORY_64X` (AWS only).
- Deadlines: password deprecation Phase 2 (rolling May–Jul 2026: `TYPE = LEGACY_SERVICE` rejected by CREATE/ALTER USER) and Phase 3 (rolling Aug–Oct 2026: non-human passwords blocked, MFA on every human password login); legacy `SNOWFLAKE.CORTEX.*` LLM functions deprecated by end of 2026; `CORTEX_MODELS_ALLOWLIST` accepts only `'None'` since 2026-08-05, retired 2026-11-18 (model RBAC instead); Document AI decommissioned 2026-03-16 (use AI_EXTRACT); Legacy Notebooks creation disabled 2026-09-01, execution ends Nov 2026; Snowpipe Streaming classic: advance deprecation notice, 18-month sunset after the formal notice.
- Pending BCRs (2026_06 bundle): QAS auto-enabled at scale factor 8 for new standard warehouses (2373); `SEARCH_OPTIMIZATION_HISTORY` index columns (2384); dbt Projects single `live` version (2362); new backups skip transient tables (2360); `SNOWFLAKE.ANACONDA_REPOSITORY_USER` required (2379). 2026_07 bundle: embedding-model RBAC for AI_EMBED and Cortex Search.
- Limits: dynamic table `TARGET_LAG` ≥ 60 s; task graphs ≤ 1,000 tasks; VARIANT value ≤ 128 MB; clustering keys 3–4 expressions; load metadata 64 days (pipes 14); unload `MAX_FILE_SIZE` default 16 MB, max 5 GB; ALTER PIPE REFRESH covers 7 days; tags 50 per object; DMF associations ≤ 50,000 per account; PAT expiry default 15 days, max 365; key pairs ≤ 10 per user; model versions ≤ 1,000 per model, warehouse model size ≤ 15 GB; model monitors ≤ 250 per account; Cortex Search 20 QPS per service, 140 per account, source < 400M rows; AI_EXTRACT ≤ 125 pages; AI_PARSE_DOCUMENT ≤ 2,000 pages; VECTOR dimension ≤ 4,096; fine-tuning base model llama3.1-8b only.
- Usage-view latency: `QUERY_HISTORY` 45 min; `WAREHOUSE_METERING_HISTORY`, `WAREHOUSE_LOAD_HISTORY`, `ACCESS_HISTORY`, `DATA_CLASSIFICATION_LATEST` 3 h; `LOGIN_HISTORY`, `TAG_REFERENCES`, `COPY_HISTORY` 2 h; `QUERY_ATTRIBUTION_HISTORY`, `MODEL_SERVING_USAGE_HISTORY` 8 h; `QUERY_INSIGHTS` 90 min; `CORTEX_AI_FUNCTIONS_USAGE_HISTORY` 5 min (data from 2026-01-05).

## Conflicts resolved
- Docs pages lag release notes and BCRs; the newer statement wins: Gen2 is the default (BCR 2250) though the warehouse overview says otherwise; QAS defaults differ between the 2026_03 behavior and BCR 2373, so `ENABLE_QUERY_ACCELERATION` and the scale factor are always set explicitly; Snowpipe bills per GB though its intro page still describes warehouse compute; Python 3.9 is decommissioned though UDF pages still list it; `snowflake.ml.modeling.preprocessing` is deprecated though ML guides still recommend it; AI_SUMMARIZE is Preview per its 2026-09-14 release note; Cortex Search and structured-output pages still teach legacy `SNOWFLAKE.CORTEX` functions, replaced by `AI_*` here.
- `AUTO_SUSPEND`: sources range from "5–10 minutes or less" to 60 s (BLOG, 2020) → tiers by workload per the warehouse-cache page: tasks 60 s, ad hoc ~300 s, BI ≥ 600 s.
- `MAX_CLUSTER_COUNT`: "as large as possible" vs "start small" → start at 2–3 and raise from observed load.
- Inline stage credentials appear in doc examples → forbidden; storage integrations are the documented recommendation and `REQUIRE_STORAGE_INTEGRATION_*` enforces them.
- Openflow gen 2: docs pass literal Git credentials in `ALTER OPENFLOW CONNECTOR ... PUSH` → keep tokens in secrets; `COMMIT` promotes within one connector, while another environment gets `CREATE OPENFLOW CONNECTOR ... FROM '@repo/...'` or `ADD VERSION FROM '<stage>'` with a per-environment `config.json` (no templating is documented).
- Tasks: `EXECUTE MANAGED TASK` is needed for serverless tasks only; `SUSPEND_TASK_AFTER_NUM_FAILURES` defaults to 10 (create-task, task graphs) though the intro page calls it opt-in.
- `MERGE` in dynamic tables: custom incremental refresh accepts `MERGE INTO SELF`, but streams + tasks stay the default for upserts.
- Constraints: standard tables enforce NOT NULL and CHECK (older guidance says NOT NULL only); PK, UNIQUE, FK stay informational, so `RELY` (join elimination) is set only when pipelines guarantee integrity despite the join-elimination page's "enforcing" wording. Value caps are 128 MB, not the legacy 16 MB.
- Feature Store: `Entity(join_keys=...)` per the API reference (guides show `keys=`); `block=` is deprecated in favor of `initialize="ON_SCHEDULE"`; tiled aggregations need `join_method="cte"` although the API marks it internal.
- Model Registry: `enable_explainability` defaults to False (1.47.0) though the explainability page says on by default; `target_platforms` defaults to warehouse + SPCS since 2.0.0 → set it explicitly; SPCS image builds resolve conda packages from conda-forge while warehouses use the Snowflake channel; `ModelContext` takes keyword args (`artifacts=`/`models=` deprecated).
- Session idle timeout: 240 min programmatic, 1,080 min Snowsight (not the 30 min stated once on the same page); PAT default expiry 15 days (not 30); user `TYPE` defaults to `PERSON`, never NULL; `MFA_ENROLLMENT = 'OPTIONAL'` is backward-compat only.
- AI function access: the privileges page (`USE AI FUNCTIONS` or per-function `USE AI FUNCTION`, plus `CORTEX_USER` or `AI_FUNCTIONS_USER`) wins over function pages naming only `CORTEX_USER`; model names come from `SHOW CORTEX BASE MODELS`, not from stale model lists on function pages.
- SnowSQL migration page says `--config`; the CLI uses `--config-file`. Variables need `definition_version: 2` in `snowflake.yml` (one page still says 1.1).
- Tag-based projection policies: Preview per the 2026-07-21 release note although the projection page says tags can't carry them.
- Cross-KB: Airflow DAG design, imports, and connections policy live in skill://airflow; this KB owns only Snowflake-side operators and SQL. Terraform `snowflakedb/snowflake` HCL follows skill://terraform; DCM Projects own in-database objects and Terraform owns account objects, never both for one object. Python style follows skill://python, except Snowflake handler rules (module-scope model loading, no network in UDFs).
- AGENTS.md vs docs install steps: docs tell users to install packages and CLIs (`uv tool install snowflake-cli`, `uv add snowflake-ml-python`); here every new package, tool, or PyPI repository needs explicit user approval first.
````

### 3. TTSR rules
Copy the 15 drafts: `cp C:/Users/jpollock/.omp/agent/sessions/-src/2026-09-25T21-10-32-962Z_01a0da67-d502-7041-9019-0bbfbfa3637e/local/snowflake-kb/rules/sf-*.md C:/Users/jpollock/.omp/agent/rules/`, applying the Step 0.2 names and the Step 0.3 substitution only when those steps triggered. They are non-interrupting reminders like the sibling `af-`/`dbp-`/`tf-` rules; single-quoted YAML (`''` is one `'`); scopes are extension globs (`*.{sql,py,ipynb}` and similar) except `sf-airflow-operator` (Airflow project paths) and `sf-snowsql` (adds `**/Dockerfile`).

SHA-256 manifest (UTF-8, LF):

| file | bytes | sha256 |
|---|---|---|
| `rules/sf-accountadmin.md` | 1464 | `1de91ed127be50cb935a571d2391356c4e566be7cdf6852e614ee0801900f043` |
| `rules/sf-airflow-operator.md` | 1166 | `ab6ed6dc5727e0261d9af2da2fd8390493493ebff5345be886a969cd853b36ec` |
| `rules/sf-connection-auth.md` | 2092 | `ed03fc7d26860e747167eb10dc44289a86028f220b513544f2b89ee4048e8fd8` |
| `rules/sf-copy-safety.md` | 1189 | `558ac53287c6016ad9d1846b3f2ec947580ea0d63f8f7189b7bc82f3d7e88800` |
| `rules/sf-cortex-legacy.md` | 1370 | `833427dee99e8177ad3818923d5e9541d8f63ef85f5c57b9126d594cf46892ee` |
| `rules/sf-cost-guards.md` | 1354 | `3153a9d18806b7f728b63236aef62720b8012597d3b85bed4ce5e33c3a2fcc09` |
| `rules/sf-deprecated-sql.md` | 1169 | `6fafdfcba36d6e413e2b3e5340f5fc5784d2202058a8eadc302dda9723568a88` |
| `rules/sf-dt-refresh-mode.md` | 1172 | `1a31d60d778c08a8d3e894c0738dc964ba37a30a4fd2eaa036655d53adaa36fb` |
| `rules/sf-inline-credentials.md` | 1066 | `ad892e29f05e85fbe843fe77c0a82ea52e58415b81507bdfa746294efb49fbdb` |
| `rules/sf-ml-deprecated.md` | 1823 | `4419c2974356b4747e6ea436339ba8e8763786b914c43fae3e25a9da7619b660` |
| `rules/sf-pit-training-set.md` | 1082 | `b10e70a8a8b8acf31a6809c944686d0e01fd3727334cbd9ef208d0fa64ce2807` |
| `rules/sf-policy-current-role.md` | 1083 | `00fc64a5a9344c97dbfac1e92689deabb6a703e91ed0d3a1bfc61eb43e64505a` |
| `rules/sf-retention-zero.md` | 1125 | `1ffd2b1a7c40828ec104d391005bb252f1e9e26c9e9765adcf4fc78560a8b101` |
| `rules/sf-snowsql.md` | 1056 | `772d3c6c6ca4b501e4945593579f7ca5585059aaeaf4b685a05c37949a8c281e` |
| `rules/sf-udf-model-inference.md` | 1613 | `a5e945dac6ec2ef831e1fb2d5788bd206cceca0703198f34e85c1c5bb9c17c72` |

#### `C:/Users/jpollock/.omp/agent/rules/sf-accountadmin.md`
````markdown
---
description: "ACCOUNTADMIN is never a default, connection, or automation role"
condition:
  - '(?i)\bUSE\s+ROLE\s+"?ACCOUNTADMIN"?(?![\w$])'
  - '(?i)\brole\s*=\s*"ACCOUNTADMIN"'
  - '(?i)["'']role["'']\s*:\s*["'']ACCOUNTADMIN["'']'
  - '(?i)\bDEFAULT_ROLE\s*=\s*[''"]?ACCOUNTADMIN\b'
  - '(?i)(?:^|\n)[ \t]*role[ \t]*:[ \t]*["'']?ACCOUNTADMIN["'']?[ \t]*(?:\r?\n|$)'
scope: "tool:edit(*.{sql,py,ipynb,toml,yml,yaml}), tool:write(*.{sql,py,ipynb,toml,yml,yaml})"
interruptMode: never
---
ACCOUNTADMIN: few human users with MFA, account-level administration only. Code, CI, tools, and default roles use least-privileged functional or service roles; objects are owned by custom roles under SYSADMIN.

| avoid | use |
|---|---|
| `USE ROLE ACCOUNTADMIN;` before creating databases, schemas, tables, warehouses | the environment's functional role from config (`USE ROLE <role>;`) |
| `snowflake.connector.connect(..., role="ACCOUNTADMIN")`, `role = "ACCOUNTADMIN"` in `connections.toml`, `role: ACCOUNTADMIN` in a dbt profile | a named connection whose role is the service role |
| `CREATE USER etl_svc DEFAULT_ROLE = ACCOUNTADMIN` | `CREATE USER etl_svc TYPE = SERVICE DEFAULT_ROLE = <service role>` |

Steps that require it (resource monitors, account parameters, some integrations) run once, by a human, with explicit approval. Details: skill://snowflake/access.md.
Exception: read-only audit queries that compare a role name as a single-quoted string literal.
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-airflow-operator.md`
````markdown
---
description: "Airflow Snowflake provider 6.x removed SnowflakeOperator"
condition:
  - '\bfrom\s+airflow\.providers\.snowflake\.operators\.snowflake\s+import\s+[^\n]*\bSnowflakeOperator\b'
  - '\bSnowflakeOperator\s*\('
scope: "tool:edit(**/dags/**/*.py), tool:write(**/dags/**/*.py), tool:edit(**/include/**/*.py), tool:write(**/include/**/*.py), tool:edit(**/plugins/**/*.py), tool:write(**/plugins/**/*.py)"
interruptMode: never
---
Run Snowflake SQL from DAGs through the common SQL operator, or the SQL API operator for long multi-statement work.

| avoid | use |
|---|---|
| `from airflow.providers.snowflake.operators.snowflake import SnowflakeOperator` | `from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator` with `conn_id=<snowflake connection>` |
| `SnowflakeOperator(task_id="load", sql="...")` for long scripts | `SnowflakeSqlApiOperator(task_id="load", snowflake_conn_id=..., sql=..., statement_count=<n>, deferrable=True)` |

Connections authenticate with a key pair or workload identity, one per environment. Details: skill://snowflake/pipelines.md §Airflow orchestration; DAG design: skill://airflow.
Exception: none.
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-connection-auth.md`
````markdown
---
description: "Snowflake connections: named config, org-account identifier, workload identity or key pair; no passwords or literal hosts"
condition:
  - 'snowflake\.connector\.connect\s*\([\s\S]{0,600}?\bpassword\s*='
  - '\baccount\s*=[\s\S]{0,400}?\bpassword\s*=|\bpassword\s*=[\s\S]{0,400}?\baccount\s*='
  - '["'']account["'']\s*:[\s\S]{0,300}?["'']password["'']\s*:|["'']password["'']\s*:[\s\S]{0,300}?["'']account["'']\s*:'
  - '(?i)\b[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\.snowflakecomputing\.(?:com|cn)\b'
  - '(?i)\bTYPE\s*=\s*LEGACY_SERVICE\b'
scope: "tool:edit(*.{py,ipynb,sql,toml,yml,yaml}), tool:write(*.{py,ipynb,sql,toml,yml,yaml})"
interruptMode: never
---
Connect through a named connection from per-environment config. Services authenticate with workload identity federation (Azure managed identity) or a key pair; Snowflake blocks password sign-in for non-human users (Phase 3, rolling Aug–Oct 2026).

| avoid | use |
|---|---|
| `snowflake.connector.connect(account="myorg-prd.snowflakecomputing.com", user="svc", password=pw)` | `snowflake.connector.connect(connection_name=os.environ["SNOWFLAKE_CONNECTION_NAME"])` |
| `Session.builder.configs({"account": a, "user": u, "password": p}).create()` | `Session.builder.config("connection_name", name).create()` |
| `account = "xy12345.east-us-2.azure.snowflakecomputing.com"` | `account = "<orgname>-<accountname>"` from config |
| `CREATE USER etl_svc TYPE = LEGACY_SERVICE PASSWORD = '...'` | `CREATE USER etl_svc TYPE = SERVICE WORKLOAD_IDENTITY = (TYPE = AZURE ISSUER = '...' SUBJECT = '...')`, or `ALTER USER etl_svc ADD KEY PAIR ...` |

Service connections: `authenticator="WORKLOAD_IDENTITY"`, `workload_identity_provider="AZURE"` (connector ≥ 3.17.0); else `authenticator="SNOWFLAKE_JWT"` with `private_key_file`. Humans: `externalbrowser` or `OAUTH_AUTHORIZATION_CODE`. Details: skill://snowflake/access.md, skill://snowflake/devops.md.
Exception: a programmatic access token passed as `password` from a secret store under a network policy; read-only audits comparing `type = 'LEGACY_SERVICE'` as a string literal.
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-copy-safety.md`
````markdown
---
description: "COPY INTO: no silent partial loads, forced reloads, or blind purges"
condition:
  - '(?i)\bON_ERROR\s*[=:]\s*[''"]?CONTINUE\b'
  - '(?i)\bCOPY\s+INTO\b[\s\S]{0,2000}?\bFORCE\s*=\s*TRUE\b'
  - '(?i)\bPURGE\s*=\s*TRUE\b'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: never
---
Loads are complete and exactly-once: keep the defaults (`ON_ERROR = ABORT_STATEMENT` for COPY, `SKIP_FILE` for pipes), let load metadata dedupe files, and delete staged files only after a verified load.

| avoid | use |
|---|---|
| `ON_ERROR = CONTINUE` (or `on_error="continue"`) with no error check | default `ABORT_STATEMENT`; pre-check with `VALIDATION_MODE = RETURN_ERRORS`; when CONTINUE is required, fail the job if `VALIDATE(<table>, JOB_ID => '_last')` returns rows |
| `FORCE = TRUE` to reload a path | `LOAD_UNCERTAIN_FILES = TRUE` for files past the 64-day load metadata; `FORCE` only for a deliberate full reload into an emptied table |
| `PURGE = TRUE` | `REMOVE @stage/<path>` after `COPY_HISTORY` shows `Loaded` (PURGE failures are silent) |

Details: skill://snowflake/ingestion.md.
Exception: throwaway exploration loads into scratch tables.
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-cortex-legacy.md`
````markdown
---
description: "Legacy SNOWFLAKE.CORTEX LLM functions are deprecated by end of 2026; use AI_* functions"
condition:
  - '(?i)\bSNOWFLAKE\.CORTEX\.(?:COMPLETE|TRY_COMPLETE|SUMMARIZE_AGG|TRANSLATE|SENTIMENT|ENTITY_SENTIMENT|EXTRACT_ANSWER|CLASSIFY_TEXT|EMBED_TEXT_(?:768|1024)|COUNT_TOKENS|PARSE_DOCUMENT)\s*\('
  - '\bfrom\s+snowflake\.cortex\s+import\b'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: never
---
New code calls the `AI_*` functions; the `SNOWFLAKE.CORTEX.*` LLM functions remain for backward compatibility only.

| avoid | use |
|---|---|
| `SNOWFLAKE.CORTEX.COMPLETE`, `TRY_COMPLETE` | `AI_COMPLETE(model, prompt [, model_parameters, response_format, show_details])` |
| `CLASSIFY_TEXT`, `EXTRACT_ANSWER` | `AI_CLASSIFY`, `AI_EXTRACT` |
| `SENTIMENT`, `ENTITY_SENTIMENT` | `AI_SENTIMENT` |
| `EMBED_TEXT_768`, `EMBED_TEXT_1024` | `AI_EMBED` |
| `TRANSLATE`, `SUMMARIZE_AGG`, `COUNT_TOKENS`, `PARSE_DOCUMENT` | `AI_TRANSLATE`, `AI_SUMMARIZE_AGG`, `AI_COUNT_TOKENS`, `AI_PARSE_DOCUMENT` |
| Python `from snowflake.cortex import complete` | `snowflake.snowpark.functions.ai_complete` |

Model names come from config; access, cost guards, and structured output: skill://snowflake/cortex.md.
Exception: current `SNOWFLAKE.CORTEX` utilities (`SPLIT_TEXT_RECURSIVE_CHARACTER`, `SEARCH_PREVIEW`, `FINETUNE`) are not covered.
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-cost-guards.md`
````markdown
---
description: "Snowflake cost guards: suspending compute, scoped search optimization, result reuse"
condition:
  - '(?i)\bAUTO_SUSPEND\s*=\s*(?:0|NULL)\b'
  - '(?i)\bAUTO_SUSPEND_SECS\s*=\s*0\b'
  - '(?i)\bADD\s+SEARCH\s+OPTIMIZATION\b(?!\s+ON\b)'
  - '(?i)\bALTER\s+(?:ACCOUNT|USER\s+\S+)\s+SET\s+USE_CACHED_RESULT\s*=\s*(?:FALSE|0)\b'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: never
---
Keep idle compute suspending and serverless optimizations scoped.

| avoid | use |
|---|---|
| warehouse `AUTO_SUSPEND = 0` or `NULL` (never suspends) | `AUTO_SUSPEND = 60` for tasks, ~`300` ad hoc, `600`+ for BI caches; `AUTO_RESUME = TRUE` |
| compute pool `AUTO_SUSPEND_SECS = 0` (GPU and CPU nodes bill while idle) | `AUTO_SUSPEND_SECS` sized to the idle gap (default 3600) |
| `ALTER TABLE t ADD SEARCH OPTIMIZATION` (every eligible column, including future ones) | `ADD SEARCH OPTIMIZATION ON EQUALITY(c1), SUBSTRING(c2)` after `SYSTEM$ESTIMATE_SEARCH_OPTIMIZATION_COSTS` |
| `ALTER USER etl_svc SET USE_CACHED_RESULT = FALSE` | default `TRUE`; `ALTER SESSION SET USE_CACHED_RESULT = FALSE` only while benchmarking |

Details: skill://snowflake/warehouses.md, skill://snowflake/performance.md, skill://snowflake/ml-models.md.
Exception: a documented steady 24×7 workload where suspension costs more than idle time.
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-deprecated-sql.md`
````markdown
---
description: "Retired or renamed Snowflake SQL: task overlap flag, snapshots, immutability constraints"
condition:
  - '(?i)\bALLOW_OVERLAPPING_EXECUTION\b'
  - '(?i)\b(?:CREATE|ALTER|DROP|SHOW|DESC(?:RIBE)?)\s+(?:OR\s+REPLACE\s+)?SNAPSHOT\s+(?:POLICY|POLICIES|SET|SETS)\b'
  - '(?i)\bFROM\s+SNAPSHOT\s+SET\b'
  - '(?i)\bIMMUTABLE\s+WHERE\b'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: never
---
Write the current syntax; the old forms are deprecated or renamed.

| avoid | use |
|---|---|
| `ALLOW_OVERLAPPING_EXECUTION = TRUE` | `OVERLAP_POLICY = NO_OVERLAP` (default) \| `ALLOW_CHILD_OVERLAP` \| `ALLOW_ALL_OVERLAP` on the root task; overlap only idempotent graphs |
| `CREATE SNAPSHOT POLICY`, `CREATE SNAPSHOT SET`, `... FROM SNAPSHOT SET` | `CREATE BACKUP POLICY`, `CREATE BACKUP SET s FOR TABLE t WITH BACKUP POLICY p`, `CREATE TABLE t2 FROM BACKUP SET s IDENTIFIER '<id>'` |
| `IMMUTABLE WHERE (...)` on a dynamic table | `FROZEN WHERE (...)` |

Details: skill://snowflake/pipelines.md (tasks, dynamic tables), skill://snowflake/governance.md (backups).
Exception: read-only `SHOW`/audit queries over existing objects.
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-dt-refresh-mode.md`
````markdown
---
description: "Dynamic tables state REFRESH_MODE explicitly; AUTO resolves once at create"
condition:
  - '(?i)\bCREATE\s+(?:OR\s+(?:REPLACE|ALTER)\s+)?(?:TRANSIENT\s+)?DYNAMIC\s+(?:ICEBERG\s+)?TABLE\b(?![\s\S]{0,1500}?\bREFRESH_MODE\s*=\s*(?:ADAPTIVE|INCREMENTAL|FULL|CUSTOM_INCREMENTAL)\b)'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: never
---
Production dynamic tables set `REFRESH_MODE` (`ADAPTIVE` when the query is incrementalizable, else `INCREMENTAL` or `FULL`) and a duration `TARGET_LAG` on leaf tables (`DOWNSTREAM` on intermediates). `AUTO` resolves once at create, never to `ADAPTIVE`, and later fails instead of falling back.

## Avoid

```sql
CREATE OR REPLACE DYNAMIC TABLE daily_orders TARGET_LAG = '1 hour' WAREHOUSE = transform_wh AS SELECT ...;
```

## Use

```sql
CREATE OR ALTER DYNAMIC TABLE daily_orders
  TARGET_LAG = '1 hour'
  WAREHOUSE = transform_wh
  REFRESH_MODE = ADAPTIVE
  AS SELECT ...;
```

Check `refresh_mode_reason` in `SHOW DYNAMIC TABLES`; change the mode with `CREATE OR ALTER`, not `ALTER`. Details: skill://snowflake/pipelines.md.
Exception: scratch experiments in a developer sandbox.
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-inline-credentials.md`
````markdown
---
description: "Snowflake stages authenticate through storage integrations, never inline cloud credentials"
condition:
  - '(?i)\bCREDENTIALS\s*=\s*["'']?\s*\(?\s*(?:AZURE_SAS_TOKEN|AWS_KEY_ID|AWS_SECRET_KEY|AWS_TOKEN)\s*='
scope: "tool:edit(*.{sql,py,ipynb,tf,yml,yaml}), tool:write(*.{sql,py,ipynb,tf,yml,yaml})"
interruptMode: never
---
External stages and COPY/unload locations use `STORAGE_INTEGRATION = <integration name from env config>`; SAS tokens and keys written into DDL land in query history and Git.

## Avoid

```sql
CREATE STAGE raw_stage URL = 'azure://acct.blob.core.windows.net/raw/' CREDENTIALS = (AZURE_SAS_TOKEN = '?sv=...');
```

## Use

```sql
CREATE STAGE raw_stage URL = 'azure://acct.blob.core.windows.net/raw/' STORAGE_INTEGRATION = raw_azure_int FILE_FORMAT = parquet_fmt;
```

Integration setup (Azure consent, `Storage Blob Data Reader`/`Contributor` on the Snowflake service principal) and the `REQUIRE_STORAGE_INTEGRATION_FOR_STAGE_CREATION`/`_OPERATION` guards: skill://snowflake/ingestion.md.
Exception: none for committed code.
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-ml-deprecated.md`
````markdown
---
description: "snowflake-ml-python 2.x: deprecated modeling estimators, preprocessing, and ML API arguments"
condition:
  - '\bsnowflake\.ml\.modeling\.(?:preprocessing|pipeline|impute|linear_model|ensemble|tree|svm|neighbors|naive_bayes|cluster|decomposition|xgboost|lightgbm|model_selection|feature_selection|compose|covariance|discriminant_analysis|gaussian_process|isotonic|kernel_approximation|kernel_ridge|manifold|mixture|multiclass|multioutput|neural_network|semi_supervised|calibration)\b'
  - '\bfrom\s+snowflake\.ml\.modeling\s+import\s+[^\n]*\b(?:preprocessing|pipeline|impute|linear_model|ensemble|tree|svm|neighbors|xgboost|lightgbm|model_selection)\b'
  - '\bregister_feature_view\s*\([^)]{0,400}?\bblock\s*='
  - '@custom_model\.partitioned_inference_api\b'
  - '\bModelContext\s*\(\s*(?:artifacts|models)\s*='
scope: "tool:edit(*.{py,ipynb}), tool:write(*.{py,ipynb})"
interruptMode: never
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
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-pit-training-set.md`
````markdown
---
description: "Feature Store training sets are point-in-time: pass spine_timestamp_col"
condition:
  - '(?<!def )\b(?:generate_training_set|generate_dataset)\s*\((?![\s\S]{0,600}?\bspine_timestamp_col\b)'
scope: "tool:edit(*.{py,ipynb}), tool:write(*.{py,ipynb})"
interruptMode: never
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
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-policy-current-role.md`
````markdown
---
description: "Masking and row access policies test roles with IS_ROLE_IN_SESSION, not CURRENT_ROLE()"
condition:
  - '(?i)\b(?:CREATE|ALTER)\s+(?:OR\s+(?:REPLACE|ALTER)\s+)?(?:MASKING|ROW\s+ACCESS|PROJECTION|AGGREGATION)\s+POLICY\b[\s\S]{0,800}?\bCURRENT_ROLE\s*\(\s*\)'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: never
---
Policy bodies check roles with `IS_ROLE_IN_SESSION('<ROLE>')` (primary and secondary role hierarchy) or a mapping table or tag; role names differ per environment, and `CURRENT_ROLE()` returns NULL for share consumers.

## Avoid

```sql
CREATE MASKING POLICY pii_mask AS (v STRING) RETURNS STRING ->
  CASE WHEN CURRENT_ROLE() IN ('PAYROLL_PRD') THEN v ELSE '***' END;
```

## Use

```sql
CREATE MASKING POLICY pii_mask AS (v STRING) RETURNS STRING ->
  CASE WHEN IS_ROLE_IN_SESSION(SYSTEM$GET_TAG_ON_CURRENT_TABLE('governance.tags.pii_reader_role')) THEN v ELSE '***' END;
```

Keep policies in one governance schema; edit bodies with `ALTER ... SET BODY`. Details: skill://snowflake/governance.md.
Exception: none.
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-retention-zero.md`
````markdown
---
description: "Keep Time Travel on databases and schemas: no zero data retention at container level"
condition:
  - '(?i)\b(?:CREATE|ALTER)\s+(?:OR\s+(?:REPLACE|ALTER)\s+)?(?:TRANSIENT\s+)?(?:ACCOUNT|DATABASE|SCHEMA)\b[^;]{0,400}?\bDATA_RETENTION_TIME_IN_DAYS\s*=\s*0(?!\d)'
  - '(?i)\bMIN_DATA_RETENTION_TIME_IN_DAYS\s*=\s*0(?!\d)'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: never
---
`DATA_RETENTION_TIME_IN_DAYS = 0` on an account, database, or schema disables Time Travel, point-in-time `CLONE`, and `UNDROP` for everything that inherits it; keep ≥ 1 day there and a `MIN_DATA_RETENTION_TIME_IN_DAYS` floor ≥ 1 on the account.

| avoid | use |
|---|---|
| `ALTER DATABASE analytics SET DATA_RETENTION_TIME_IN_DAYS = 0;` | inherit the default (1) or set 1–90 (Enterprise+) |
| zero retention to cut storage on churny data | `CREATE TRANSIENT TABLE ... DATA_RETENTION_TIME_IN_DAYS = 0` for that table only, with periodic copies to a permanent backup |

Details: skill://snowflake/tables.md.
Exception: transient scratch databases or schemas that hold only reproducible data.
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-snowsql.md`
````markdown
---
description: "Scripts and pipelines use Snowflake CLI (snow), not legacy SnowSQL"
condition:
  - '(?m)(?:^|[\s;&|(`''"])snowsql(?:\.exe)?\s+(?:-[A-Za-z]|--[a-z])'
scope: "tool:edit(*.{sh,ps1,psm1,cmd,bat,yml,yaml,py}), tool:write(*.{sh,ps1,psm1,cmd,bat,yml,yaml,py}), tool:edit(**/Dockerfile), tool:write(**/Dockerfile)"
interruptMode: never
---
SnowSQL is legacy and feature-frozen; new scripts, CI steps, and images call `snow`.

| avoid | use |
|---|---|
| `snowsql -c prd -f deploy.sql -o exit_on_error=true` | `snow sql -c <connection> -f deploy.sql --enhanced-exit-codes` |
| `snowsql -a <account> -u <user> ...` | a named connection in `connections.toml`, or `SNOWFLAKE_CONNECTIONS_<NAME>_<KEY>` env vars in CI |
| `&var` substitution | `<% var %>` with `-D "var=value"` (or `<% ctx.env.var %>` from `snowflake.yml`) |

Installing Snowflake CLI (`uv tool install snowflake-cli`) is a new dependency: explicit user approval first. Details: skill://snowflake/devops.md.
Exception: maintenance of existing SnowSQL jobs without a migration request.
````

#### `C:/Users/jpollock/.omp/agent/rules/sf-udf-model-inference.md`
````markdown
---
description: "Custom inference goes through the Model Registry, not UDFs that unpickle staged models"
condition:
  - 'snowflake_import_directory[\s\S]{0,4000}?\b(?:pickle|joblib|cloudpickle)\.loads?\s*\('
  - '\bSnowflakeFile\.open\s*\([\s\S]{0,800}?\b(?:pickle|joblib|cloudpickle)\.loads?\s*\('
scope: "tool:edit(*.{py,sql,ipynb}), tool:write(*.{py,sql,ipynb})"
interruptMode: never
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
````

### 4. Quality-gate SQLFluff hint
- `C:/Users/jpollock/.omp/agent/agents/quality-gate.md` §4 step 1 (L87): replace the literal `dialect = tsql or databricks` with `dialect = tsql, databricks, or snowflake`. Nothing else in the file changes.
- Then search `C:/Users/jpollock/.omp/agent/agents/` and `C:/Users/jpollock/.omp/agent/extensions/` (recursive) for the literal `dialect = tsql or databricks` and replace every remaining occurrence the same way (present only if the harness-determinism rework ported the gate to `extensions/`). No other match → done.

### 5. Extension-router contingency (only when Step 0.4 triggered)
The harness-determinism rework replaced the router table with `extensions/domain-router.ts` + `extensions/lib/domains.ts`; Step 1's row format no longer applies, so this step replaces Step 1. Follow each file's existing syntax; append, never reorder:
- `extensions/lib/domains.ts`: `DomainName` gains `"snowflake"`. Domain row `snowflake` — paths `**/snowflake.yml` `**/snowflake.yaml` `**/connections.toml` `**/.snowflake/**`; content regexes on `**/*.py` `**/*.ipynb` `**/*.sql`: `/^\s*(?:from|import)\s+snowflake\b/m`, `/\bSNOWFLAKE\.(?:CORTEX|ML|ACCOUNT_USAGE|CORE|TELEMETRY)\./i`, `/\b(?:CREATE|ALTER)\s+(?:OR\s+(?:REPLACE|ALTER)\s+)?(?:WAREHOUSE|DYNAMIC\s+TABLE|PIPE|TASK|STAGE|STORAGE\s+INTEGRATION|NETWORK\s+RULE|CORTEX\s+SEARCH\s+SERVICE|COMPUTE\s+POOL|SEMANTIC\s+VIEW)\b/i`, `/\bAI_(?:COMPLETE|FILTER|AGG|EMBED|SUMMARIZE_AGG|COUNT_TOKENS|TRANSCRIBE|REDACT)\s*\(/i`; commands `/^snow\b/` `/^snowsql\b/`; mcp `/^mcp__snowflake/`. Topic rows: `snowflake/devops.md` — paths `**/snowflake.yml` `**/snowflake.yaml` `**/connections.toml` `**/.snowflake/**`, commands `/^snow\s+(?:sql|connection|git|dcm|object|helpers)\b/` `/^snowsql\b/`; `snowflake/snowpark.md` — commands `/^snow\s+(?:snowpark|streamlit|notebook)\b/`; `snowflake/pipelines.md` — commands `/^snow\s+dbt\b/`; `snowflake/ml-models.md` — commands `/^snow\s+spcs\b/`.
- `rules/domain-router.md` (semantic-trigger table): append `| snowflake | Snowflake SQL, warehouses and cost, performance, loading, streaming and Openflow, pipelines, access, governance, CLI and CI/CD, Snowpark, Snowflake ML (feature engineering, Model Registry, custom inference), Cortex AI |`.
- `agents/code-review.md` frontmatter `autoloadSkills`: append `snowflake` in the form the file already uses.
- Verification 1 then checks that semantic row instead of the Step 1 row.

### Execution
- Main agent runs Step 0, then (AGENTS.md: fan out; smol model for reads and writes) one `task` batch of two `sonic` subagents, each given this plan's absolute path (`C:/Users/jpollock/.omp/agent/sessions/-src/2026-09-25T21-10-32-962Z_01a0da67-d502-7041-9019-0bbfbfa3637e/local/snowflake-domain-knowledge-plan.md`) and the Step 0 outcomes: (a) Step 1 (skipped when Step 0.4 triggered), Step 3, Step 4; (b) Step 2. Each runs `cmp <draft> <installed>` for every file it copied (after the Step 0.3 substitution when applied) and reports any difference. When Step 0.4 triggered, the main agent runs Step 5 after the batch. The main agent then runs Verification.

## Critical files & anchors
- `C:/Users/jpollock/.omp/agent/rules/domain-router.md` — shared by every domain session; only the `snowflake` row changes.
- `C:/Users/jpollock/.omp/agent/agents/quality-gate.md` L87 — SQLFluff config blocker text; one literal changes.
- `C:/Users/jpollock/.omp/agent/skills/snowflake/SKILL.md` — `hide: true` + non-empty `description` keep it discoverable yet unlisted; `## Topics` routes the second hop.
- `C:/Users/jpollock/.omp/agent/rules/sf-connection-auth.md` — broadest conditions (literal hosts, `account=`/`password=` pairs); its negative rows guard generic database code.
- `C:/Users/jpollock/.omp/agent/sessions/-.omp-agent/2026-09-25T20-32-37-673Z_01a0da45-1d29-7774-81a0-6b3a1f91505e/local/harness-determinism-plan.md` L67-163, L277-306, L326-336 — source of the Step 0.3/0.4/5 contingencies; read-only.

## Verification
Use the Step 0 rule names everywhere below. Scratch work goes under `C:/Users/jpollock/AppData/Local/Temp/sf-kb-smoke/`, outside every repo.

1. Router: exactly one line of the router starts with `| snowflake |` and equals the Step 1 row; every other line equals BEFORE.
2. Copies: `cmp` reports no difference for all 30 files against their drafts (Step 0.3 substitution applied first when triggered); files written from fenced blocks match the SHA-256 manifests (`sha256sum`).
3. `omp ttsr list`: all 15 `sf-*` names appear with conditions and scopes exactly as written; no condition shown as `.*` and no condition turned into a scope.
4. Per case: `omp ttsr test --rule C:/Users/jpollock/.omp/agent/rules/<rule>.md --source tool <tool flags> '<snippet>'` → `Triggered (1)` when expect = triggered, `No rules triggered.` otherwise (exit code 1 is then normal). Snippet = the code-span text inside single quotes; a `'` inside a snippet is written as `'\''`.

| rule | tool flags | snippet | expect |
|---|---|---|---|
| `sf-accountadmin` | `--tool write --path probe.sql` | `USE ROLE ACCOUNTADMIN;` | triggered |
| `sf-accountadmin` | `--tool edit --path models/staging/probe.sql` | `USE ROLE ACCOUNTADMIN;` | triggered |
| `sf-accountadmin` | `--tool edit --path probe.py` | `conn = snowflake.connector.connect(connection_name="prd", role="ACCOUNTADMIN")` | triggered |
| `sf-accountadmin` | `--tool edit --path probe.py` | `cfg = {"role": "ACCOUNTADMIN", "warehouse": "wh"}` | triggered |
| `sf-accountadmin` | `--tool edit --path probe.sql` | `CREATE USER etl_svc TYPE = SERVICE DEFAULT_ROLE = ACCOUNTADMIN;` | triggered |
| `sf-accountadmin` | `--tool write --path profiles.yml` | `role: ACCOUNTADMIN` | triggered |
| `sf-accountadmin` | `--tool edit --path probe.sql` | `USE ROLE SYSADMIN;` | nothing |
| `sf-accountadmin` | `--tool edit --path probe.sql` | `USE ROLE ACCOUNTADMIN_RO;` | nothing |
| `sf-accountadmin` | `--tool edit --path probe.sql` | `SELECT grantee_name FROM snowflake.account_usage.grants_to_users WHERE role = 'ACCOUNTADMIN';` | nothing |
| `sf-connection-auth` | `--tool edit --path probe.py` | `conn = snowflake.connector.connect(account=acct, user=u, password=os.environ["SF_PASSWORD"])` | triggered |
| `sf-connection-auth` | `--tool edit --path probe.py` | `session = Session.builder.configs({"account": a, "user": u, "password": p}).create()` | triggered |
| `sf-connection-auth` | `--tool write --path connections.toml` | `account = "xy12345.east-us-2.azure.snowflakecomputing.com"` | triggered |
| `sf-connection-auth` | `--tool edit --path probe.sql` | `CREATE USER etl_svc TYPE = LEGACY_SERVICE;` | triggered |
| `sf-connection-auth` | `--tool edit --path probe.py` | `conn = snowflake.connector.connect(connection_name=os.environ["SNOWFLAKE_CONNECTION_NAME"])` | nothing |
| `sf-connection-auth` | `--tool edit --path probe.py` | `conn = snowflake.connector.connect(connection_name=name, authenticator="WORKLOAD_IDENTITY", workload_identity_provider="AZURE")` | nothing |
| `sf-connection-auth` | `--tool edit --path probe.py` | `conn = snowflake.connector.connect(connection_name=n, private_key_file_pwd=pw)` | nothing |
| `sf-connection-auth` | `--tool edit --path probe.py` | `conn = pyodbc.connect(server=host, uid=user, password=pw)` | nothing |
| `sf-connection-auth` | `--tool edit --path probe.py` | `NO_PROXY = ".snowflakecomputing.com"` | nothing |
| `sf-connection-auth` | `--tool edit --path probe.sql` | `SELECT name FROM snowflake.account_usage.users WHERE type = 'LEGACY_SERVICE';` | nothing |
| `sf-inline-credentials` | `--tool write --path probe.sql` | `CREATE STAGE raw_stage URL = 'azure://acct.blob.core.windows.net/raw/' CREDENTIALS = (AZURE_SAS_TOKEN = '?sv=abc');` | triggered |
| `sf-inline-credentials` | `--tool edit --path main.tf` | `credentials = "AZURE_SAS_TOKEN='${var.sas}'"` | triggered |
| `sf-inline-credentials` | `--tool edit --path probe.sql` | `CREATE STAGE raw_stage URL = 'azure://acct.blob.core.windows.net/raw/' STORAGE_INTEGRATION = raw_azure_int;` | nothing |
| `sf-inline-credentials` | `--tool edit --path probe.sql` | `COPY INTO t FROM 'abfss://c@a.dfs.core.windows.net/p' WITH (CREDENTIAL (AZURE_SAS_TOKEN = 'x')) FILEFORMAT = CSV` | nothing |
| `sf-copy-safety` | `--tool edit --path probe.sql` | `COPY INTO raw.orders FROM @raw_stage ON_ERROR = 'CONTINUE';` | triggered |
| `sf-copy-safety` | `--tool edit --path probe.sql` | `COPY INTO raw.orders FROM @raw_stage/2026/09/ FORCE = TRUE;` | triggered |
| `sf-copy-safety` | `--tool edit --path probe.sql` | `COPY INTO raw.orders FROM @raw_stage PURGE = TRUE;` | triggered |
| `sf-copy-safety` | `--tool edit --path probe.py` | `df.copy_into_table("ORDERS", on_error="continue")` | triggered |
| `sf-copy-safety` | `--tool edit --path probe.sql` | `COPY INTO raw.orders FROM @raw_stage ON_ERROR = ABORT_STATEMENT;` | nothing |
| `sf-copy-safety` | `--tool edit --path probe.sql` | `COPY INTO raw.orders FROM @raw_stage FORCE = FALSE;` | nothing |
| `sf-copy-safety` | `--tool edit --path probe.sql` | `COPY INTO t FROM '/mnt/x' FILEFORMAT = CSV COPY_OPTIONS ('force' = 'true')` | nothing |
| `sf-dt-refresh-mode` | `--tool write --path probe.sql` | `CREATE OR REPLACE DYNAMIC TABLE daily_orders TARGET_LAG = '1 hour' WAREHOUSE = transform_wh AS SELECT * FROM orders;` | triggered |
| `sf-dt-refresh-mode` | `--tool edit --path probe.sql` | `CREATE DYNAMIC TABLE d TARGET_LAG = DOWNSTREAM WAREHOUSE = w REFRESH_MODE = AUTO AS SELECT 1;` | triggered |
| `sf-dt-refresh-mode` | `--tool edit --path probe.sql` | `create dynamic iceberg table d target_lag = '5 minutes' warehouse = w as select 1` | triggered |
| `sf-dt-refresh-mode` | `--tool edit --path probe.sql` | `CREATE OR ALTER DYNAMIC TABLE daily_orders TARGET_LAG = '1 hour' WAREHOUSE = transform_wh REFRESH_MODE = ADAPTIVE AS SELECT * FROM orders;` | nothing |
| `sf-dt-refresh-mode` | `--tool edit --path probe.sql` | `CREATE OR REPLACE TRANSIENT DYNAMIC TABLE stg_d TARGET_LAG = DOWNSTREAM WAREHOUSE = w REFRESH_MODE = INCREMENTAL AS SELECT 1;` | nothing |
| `sf-dt-refresh-mode` | `--tool edit --path probe.sql` | `CREATE OR REFRESH STREAMING TABLE events AS SELECT * FROM STREAM(raw_events);` | nothing |
| `sf-deprecated-sql` | `--tool edit --path probe.sql` | `CREATE TASK t WAREHOUSE = w SCHEDULE = '5 MINUTES' ALLOW_OVERLAPPING_EXECUTION = TRUE AS SELECT 1;` | triggered |
| `sf-deprecated-sql` | `--tool edit --path probe.sql` | `alter task root set allow_overlapping_execution = false;` | triggered |
| `sf-deprecated-sql` | `--tool edit --path probe.sql` | `CREATE SNAPSHOT POLICY p SCHEDULE = '60 MINUTE' EXPIRE_AFTER_DAYS = 7;` | triggered |
| `sf-deprecated-sql` | `--tool edit --path probe.sql` | `CREATE TABLE t2 FROM SNAPSHOT SET s IDENTIFIER 'abc';` | triggered |
| `sf-deprecated-sql` | `--tool edit --path probe.sql` | `CREATE DYNAMIC TABLE d TARGET_LAG = '1 day' WAREHOUSE = w REFRESH_MODE = INCREMENTAL IMMUTABLE WHERE (ts < '2026-01-01') AS SELECT * FROM src;` | triggered |
| `sf-deprecated-sql` | `--tool edit --path probe.sql` | `CREATE TASK t OVERLAP_POLICY = NO_OVERLAP AS SELECT 1;` | nothing |
| `sf-deprecated-sql` | `--tool edit --path probe.sql` | `CREATE BACKUP POLICY p SCHEDULE = '60 MINUTE' EXPIRE_AFTER_DAYS = 7;` | nothing |
| `sf-deprecated-sql` | `--tool edit --path probe.sql` | `SET TRANSACTION ISOLATION LEVEL SNAPSHOT;` | nothing |
| `sf-cortex-legacy` | `--tool edit --path probe.sql` | `SELECT SNOWFLAKE.CORTEX.COMPLETE('mistral-large2', prompt) FROM t;` | triggered |
| `sf-cortex-legacy` | `--tool edit --path probe.sql` | `SELECT snowflake.cortex.try_complete('m', p) FROM t;` | triggered |
| `sf-cortex-legacy` | `--tool edit --path probe.py` | `from snowflake.cortex import complete` | triggered |
| `sf-cortex-legacy` | `--tool edit --path probe.sql` | `SELECT AI_COMPLETE('m', prompt) FROM t;` | nothing |
| `sf-cortex-legacy` | `--tool edit --path probe.sql` | `SELECT SNOWFLAKE.CORTEX.SPLIT_TEXT_RECURSIVE_CHARACTER(txt, 'markdown', 2000, 200) FROM docs;` | nothing |
| `sf-cortex-legacy` | `--tool edit --path probe.sql` | `SELECT ai_query('databricks-meta-llama-3-3-70b-instruct', prompt) FROM t;` | nothing |
| `sf-snowsql` | `--tool write --path deploy.sh` | `snowsql -c prd -f deploy.sql -o exit_on_error=true` | triggered |
| `sf-snowsql` | `--tool edit --path azure-pipelines.yml` | `- script: snowsql -a $(ACCOUNT) -u $(USER) -f deploy.sql` | triggered |
| `sf-snowsql` | `--tool edit --path build/Dockerfile` | `RUN snowsql --version` | triggered |
| `sf-snowsql` | `--tool edit --path deploy.ps1` | `& snowsql.exe -c prd -f deploy.sql` | triggered |
| `sf-snowsql` | `--tool edit --path deploy.sh` | `snow sql -c prd -f deploy.sql --enhanced-exit-codes` | nothing |
| `sf-snowsql` | `--tool edit --path deploy.sh` | `alias snowsql='snow sql'` | nothing |
| `sf-policy-current-role` | `--tool edit --path probe.sql` | `CREATE MASKING POLICY pii_mask AS (v STRING) RETURNS STRING -> CASE WHEN CURRENT_ROLE() IN ('PAYROLL_PRD') THEN v ELSE '***' END;` | triggered |
| `sf-policy-current-role` | `--tool edit --path probe.sql` | `ALTER ROW ACCESS POLICY rap SET BODY -> CURRENT_ROLE() = 'SALES_EU';` | triggered |
| `sf-policy-current-role` | `--tool edit --path probe.sql` | `CREATE MASKING POLICY pii_mask AS (v STRING) RETURNS STRING -> CASE WHEN IS_ROLE_IN_SESSION('PII_READER') THEN v ELSE '***' END;` | nothing |
| `sf-policy-current-role` | `--tool edit --path probe.sql` | `CREATE FUNCTION mask_ssn(s STRING) RETURN CASE WHEN is_account_group_member('hr') THEN s ELSE '***' END;` | nothing |
| `sf-pit-training-set` | `--tool edit --path probe.py` | `ds = fs.generate_dataset(name="CHURN_TRAIN", spine_df=spine, features=[fv_orders], spine_label_cols=["CHURNED"])` | triggered |
| `sf-pit-training-set` | `--tool edit --path probe.py` | `train_df = fs.generate_training_set(spine_df=spine, features=[fv])` | triggered |
| `sf-pit-training-set` | `--tool edit --path probe.py` | `ds = fs.generate_dataset(name="CHURN_TRAIN", spine_df=spine, features=[fv_orders], spine_timestamp_col="EVENT_TS", spine_label_cols=["CHURNED"])` | nothing |
| `sf-pit-training-set` | `--tool edit --path probe.py` | `training_set = fe.create_training_set(df=df, feature_lookups=lookups, label="y")` | nothing |
| `sf-pit-training-set` | `--tool edit --path probe.py` | `def generate_training_set(self, spine_df):` | nothing |
| `sf-ml-deprecated` | `--tool edit --path probe.py` | `from snowflake.ml.modeling.preprocessing import StandardScaler` | triggered |
| `sf-ml-deprecated` | `--tool edit --path probe.py` | `from snowflake.ml.modeling.xgboost import XGBClassifier` | triggered |
| `sf-ml-deprecated` | `--tool edit --path probe.py` | `from snowflake.ml.modeling import preprocessing` | triggered |
| `sf-ml-deprecated` | `--tool edit --path probe.py` | `fs.register_feature_view(feature_view=fv, version="V1", block=False)` | triggered |
| `sf-ml-deprecated` | `--tool edit --path probe.py` | `@custom_model.partitioned_inference_api` | triggered |
| `sf-ml-deprecated` | `--tool edit --path probe.py` | `ctx = custom_model.ModelContext(artifacts={"model_file": "m.joblib"})` | triggered |
| `sf-ml-deprecated` | `--tool edit --path probe.py` | `from snowflake.ml.modeling.distributors.xgboost import XGBEstimator` | nothing |
| `sf-ml-deprecated` | `--tool edit --path probe.py` | `from snowflake.ml.modeling.tune import Tuner` | nothing |
| `sf-ml-deprecated` | `--tool edit --path probe.py` | `from sklearn.preprocessing import StandardScaler` | nothing |
| `sf-ml-deprecated` | `--tool edit --path probe.py` | `mv.create_service(service_name="s", service_compute_pool="p", block=True)` | nothing |
| `sf-ml-deprecated` | `--tool edit --path probe.py` | `ctx = custom_model.ModelContext(model_file="m.joblib")` | nothing |
| `sf-udf-model-inference` | `--tool edit --path probe.py` | `d = sys._xoptions["snowflake_import_directory"]; model = joblib.load(d + "model.joblib")` | triggered |
| `sf-udf-model-inference` | `--tool edit --path probe.py` | `with SnowflakeFile.open("@models/m.pkl", "rb") as f: model = pickle.load(f)` | triggered |
| `sf-udf-model-inference` | `--tool edit --path probe.py` | `model = joblib.load("/dbfs/models/model.joblib")` | nothing |
| `sf-udf-model-inference` | `--tool edit --path probe.py` | `cfg = json.load(open(sys._xoptions["snowflake_import_directory"] + "cfg.json", encoding="utf-8"))` | nothing |
| `sf-udf-model-inference` | `--tool edit --path probe.py` | `self.model = joblib.load(self.context["model_file"])` | nothing |
| `sf-airflow-operator` | `--tool edit --path dags/orders.py` | `from airflow.providers.snowflake.operators.snowflake import SnowflakeOperator` | triggered |
| `sf-airflow-operator` | `--tool edit --path dags/orders.py` | `load = SnowflakeOperator(task_id="load", sql="CALL load_orders()")` | triggered |
| `sf-airflow-operator` | `--tool edit --path dags/orders.py` | `from airflow.providers.snowflake.operators.snowflake import SnowflakeCheckOperator, SnowflakeOperator` | triggered |
| `sf-airflow-operator` | `--tool edit --path dags/orders.py` | `from airflow.providers.snowflake.operators.snowflake import SnowflakeSqlApiOperator` | nothing |
| `sf-airflow-operator` | `--tool edit --path dags/orders.py` | `check = SnowflakeValueCheckOperator(task_id="chk", sql="SELECT 1", pass_value=1)` | nothing |
| `sf-airflow-operator` | `--tool edit --path src/etl/load.py` | `from airflow.providers.snowflake.operators.snowflake import SnowflakeOperator` | nothing (scope) |
| `sf-cost-guards` | `--tool edit --path probe.sql` | `CREATE WAREHOUSE bi_wh WAREHOUSE_SIZE = 'MEDIUM' AUTO_SUSPEND = 0;` | triggered |
| `sf-cost-guards` | `--tool edit --path probe.sql` | `ALTER WAREHOUSE w SET AUTO_SUSPEND = NULL;` | triggered |
| `sf-cost-guards` | `--tool edit --path probe.sql` | `CREATE COMPUTE POOL gpu_pool MIN_NODES = 1 MAX_NODES = 2 INSTANCE_FAMILY = GPU_NV_SM AUTO_SUSPEND_SECS = 0;` | triggered |
| `sf-cost-guards` | `--tool edit --path probe.sql` | `ALTER TABLE logs ADD SEARCH OPTIMIZATION;` | triggered |
| `sf-cost-guards` | `--tool edit --path probe.sql` | `ALTER USER etl_svc SET USE_CACHED_RESULT = FALSE;` | triggered |
| `sf-cost-guards` | `--tool edit --path probe.sql` | `CREATE WAREHOUSE bi_wh WAREHOUSE_SIZE = 'MEDIUM' AUTO_SUSPEND = 600 AUTO_RESUME = TRUE;` | nothing |
| `sf-cost-guards` | `--tool edit --path probe.sql` | `ALTER TABLE logs ADD SEARCH OPTIMIZATION ON EQUALITY(sender_ip);` | nothing |
| `sf-cost-guards` | `--tool edit --path probe.sql` | `ALTER SESSION SET USE_CACHED_RESULT = FALSE;` | nothing |
| `sf-retention-zero` | `--tool edit --path probe.sql` | `ALTER DATABASE analytics SET DATA_RETENTION_TIME_IN_DAYS = 0;` | triggered |
| `sf-retention-zero` | `--tool edit --path probe.sql` | `CREATE OR ALTER SCHEMA staging DATA_RETENTION_TIME_IN_DAYS = 0;` | triggered |
| `sf-retention-zero` | `--tool edit --path probe.sql` | `ALTER ACCOUNT SET MIN_DATA_RETENTION_TIME_IN_DAYS = 0;` | triggered |
| `sf-retention-zero` | `--tool edit --path probe.sql` | `ALTER DATABASE analytics SET DATA_RETENTION_TIME_IN_DAYS = 7;` | nothing |
| `sf-retention-zero` | `--tool edit --path probe.sql` | `CREATE TRANSIENT TABLE stg.churn (id NUMBER) DATA_RETENTION_TIME_IN_DAYS = 0;` | nothing |
| `sf-retention-zero` | `--tool edit --path probe.sql` | `ALTER TABLE t SET TBLPROPERTIES ('delta.deletedFileRetentionDuration' = 'interval 0 days');` | nothing |

5. Scans: `omp ttsr scan C:/Users/jpollock/src/Databricks`, `omp ttsr scan C:/Users/jpollock/src/Databricks-IaC`, `omp ttsr scan C:/Users/jpollock/src/astro-tf-platform`, `omp ttsr scan C:/Users/jpollock/src/agent-sql-server/src` → no `sf-*` hits (other prefixes may appear).
6. `omp read skill://snowflake` shows `# Snowflake KB`; `omp read skill://snowflake/<file>` shows: `warehouses.md` `# Compute and cost`, `performance.md` `# Query performance`, `tables.md` `# Tables, types, and storage lifecycle`, `ingestion.md` `# Loading and unloading`, `streaming.md` `# Streaming and connectors`, `pipelines.md` `# Transformations and orchestration`, `access.md` `# Access control and authentication`, `governance.md` `# Data governance, sharing, and continuity`, `devops.md` `# CLI, connections, and change management`, `snowpark.md` `# Snowpark and Python in Snowflake`, `ml-features.md` `# Feature engineering and Feature Store`, `ml-models.md` `# Model training, registry, and inference`, `cortex.md` `# Cortex AI`, `sources.md` `# Snowflake KB sources`.
7. Tags: a throwaway bun script in the scratch dir collects every bracketed tag group in the 14 skill files other than `sources.md` (regex `\[((?:U|[A-Z]{2,8}(?::[^,\]]+)?)(?:, (?:U|[A-Z]{2,8}(?::[^,\]]+)?))*)\]`), drops `U`, expands per the `sources.md` legend (`SF`-family tags → `https://docs.snowflake.com/en/<path>.md`; `IDX`, `BLOG`, `AFP`, `SQLFLUFF` as written there), and GETs each unique URL once (20 s timeout, ≤ 4 parallel requests) → every URL returns HTTP 200. Delete the script afterwards.
8. Headless router E2E, cwd `C:/Users/jpollock/AppData/Local/Temp/sf-kb-smoke` (fresh, empty):
   - `omp -p --no-session --mode json "Create features/churn_training.py: build a churn training dataset with the Snowflake Feature Store from an orders feature view keyed by CUSTOMER_ID with event timestamps and a spine of labeled churn events. Do not connect to Snowflake."` → a read of `skill://snowflake` precedes the first write of the file and `skill://snowflake/ml-features.md` is read; the file contains `spine_timestamp_col=` and `generate_dataset(` or `generate_training_set(`, and contains neither `password=` nor `snowflake.ml.modeling.preprocessing`.
   - `omp -p --no-session --mode json "Create inference/churn_model.py: package a trained scikit-learn churn model with custom preprocessing for Snowflake, log it to the Snowflake Model Registry, and score a table in a warehouse. Do not connect to Snowflake."` → `skill://snowflake/ml-models.md` is read; the file contains `custom_model.CustomModel`, `@custom_model.inference_api`, `log_model(`, and `target_platforms`, and does not contain `snowflake_import_directory`.
   - `omp -p --no-session --mode json "Create sql/review_sentiment.sql: classify product review text into sentiment labels with Snowflake Cortex. Do not connect to Snowflake."` → `skill://snowflake/cortex.md` is read; the file contains `AI_` and does not contain `SNOWFLAKE.CORTEX.`.
9. Live TTSR E2E, same cwd: `omp -p --no-session --mode json "Create legacy_cortex.sql as a byte-exact lint fixture containing exactly this one line: SELECT SNOWFLAKE.CORTEX.COMPLETE('mistral-large2', 'hi');  Do not modernize it."` → output contains `rule_violation` and `sf-cortex-legacy`.
10. Subagent reach: `omp -p --no-session "Spawn exactly one task subagent whose task is: reply with only the read URL your domain router lists for the snowflake domain. Print its reply verbatim."` → prints `skill://snowflake`.
11. Hidden: `omp -p --no-session "Reply with the comma-separated names in your available skills list, or none."` → the reply does not contain `snowflake`.
12. Durability: case-insensitive search of the 15 installed skill files and 15 installed rule files for `~/src|\b[a-z]:/(?!/)|\.tfvars|\.tf:\d|\.py:\d|\.ya?ml:\d|not cloned|not under|not configured` → no matches.
13. Gate hint: `agents/quality-gate.md` contains `dialect = tsql, databricks, or snowflake` exactly once, and `dialect = tsql or databricks` occurs nowhere under `agents/` or `extensions/`.
14. Delete `C:/Users/jpollock/AppData/Local/Temp/sf-kb-smoke/`.

## Assumptions & contingencies
- Assumption — "AI engineering" covers Snowflake ML (feature engineering, Feature Store, training, Model Registry, custom inference, SPCS serving, monitoring) and Cortex AI (AI functions, Search/RAG, Analyst, Agents). Override → delete `cortex.md`, its Topics row, the Cortex Core bullet, `sf-cortex-legacy`, and Verification rows for them.
- Assumption — cloud specifics are Azure-first (storage integrations with Azure consent, Event Grid for Snowpipe, Private Link, workload identity with Azure managed identities, Azure GPU families) to match the stated stack; other clouds appear only where docs coincide.
- Assumption — no `## Local platform` section: no Snowflake account, repo, or MCP server exists locally; add one (dated, repo config wins) once a Snowflake platform appears.
- Assumption — the quality-gate hint (Step 4) is part of the incorporation so Snowflake repos get the right `.sqlfluff` advice; the gate still never creates config files.
- Assumption — knowledge is dated 2026-09-25; `sources.md` lists re-verify triggers (library majors, BCR bundles, end-2026 Cortex deprecation).
- A sibling session added router rows meanwhile → keep them; upsert only the `snowflake` row.
- `omp ttsr list` lacks an `sf-*` rule or shows different conditions or scope → the copy isn't byte-exact: recopy and rerun Verification 2–4.
- A condition shows as a scope or `.*` → it was taken for a glob: wrap that condition in `(?:…)` in draft and installed file, rerun Verification 3–4.
- The `models/staging/probe.sql` row reports nothing while `probe.sql` triggers → rewrite every `sf-` scope from `*.{…}` to `**/*.{…}` (and `tool:edit(*.x)` forms likewise) in drafts and installed files, rerun Verification 3–4.
- Any other Verification 4 row disagrees while the file matches its draft → change only the failing condition of that rule so every row of that rule passes (avoid/use body unchanged, same change in the draft), rerun Verification 3–4 for it. `(?<!def )` in `sf-pit-training-set` fails to compile → drop the lookbehind and delete the `def generate_training_set` row.
- A Verification 5 scan reports an `sf-*` hit → list file:line and condition in the final report; leave the rule unchanged (non-interrupting reminder).
- A Verification 7 URL fails → retry once; still failing → list tag, file, and status in the final report; KB text unchanged.
- Verification 8–11 miss a criterion → report the exact deviation; no KB edits beyond this plan.
