# Airflow on Astro KB sources
Verified 2026-09-25 against Apache Airflow 3.2.2 docs, provider stable docs, Ruff rule docs, Astronomer docs (Wayback snapshots 2025-07 → 2026-09; astronomer.io itself was unreachable), and the user's repositories. Re-verify on Runtime or Airflow upgrades (next: 3.2-9 patch, 3.3 minor) and provider bumps.

| tag | source |
|---|---|
| `AF:<p>` | https://airflow.apache.org/docs/apache-airflow/3.2.2/<p>.html |
| `PRV:<pkg>/<p>` | https://airflow.apache.org/docs/apache-airflow-providers-<pkg>/stable/<p>.html (versions in Snapshot) |
| `ASTRO:<p>` | https://www.astronomer.io/docs/astro/<p> (archive: https://web.archive.org/web/2026/https://www.astronomer.io/docs/astro/<p>) |
| `LEARN:<p>` | https://www.astronomer.io/docs/learn/<p> (archive as for `ASTRO`) |
| `RT:<p>` | https://www.astronomer.io/docs/runtime/<p> (archive as for `ASTRO`) |
| `CLI:<p>` | https://www.astronomer.io/docs/astro/cli/<p> (archive as for `ASTRO`) |
| `CLIREL` | https://www.astronomer.io/docs/cli/v1.43/release-notes (archive as for `ASTRO`) |
| `RUFF` · `RUFF:<rule>` | https://docs.astral.sh/ruff/rules/#airflow-air · https://docs.astral.sh/ruff/rules/<rule>/ |
| `TFA` | https://github.com/astronomer/terraform-provider-astro/blob/main/docs/resources/deployment.md |
| `U` | user environment, observed 2026-09-25: omp config (`~/.omp/agent`: AGENTS.md, mcp.json, quality-gate agent); Astro Terraform repos `astro-tf-platform`, `astro-admin-rbac`; Databricks repos `Databricks` (`data_platform` bundle), `Databricks-IaC`, `data-admin-rbac` |

## Snapshot
- Versions: Astro Runtime `3.2-6` (2026-07-14) = Airflow 3.2.2 (`3.2.2+astro.3`), Task SDK 1.2.2, Python 3.12–3.14 (default 3.13); latest 3.2 patch `3.2-9` (2026-08-31, same Airflow); Runtime 3.3 (Airflow 3.3.x) since 2026-07-09; Runtime 3.2 maintained to 2028-04, Basic Support to 2028-10.
- Runtime 3.2 preinstalled providers (3.2-5 table): celery, common-compat, common-io, common-sql, elasticsearch, openlineage, smtp, standard (+ astronomer-providers-logging).
- Provider docs read: databricks 7.20.0, microsoft-azure 15.1.0, standard 1.19.0, common-sql 2.1.1, microsoft-mssql 4.7.1, cncf-kubernetes 10.22.0 (each requires Airflow ≥ 2.11); DAG-repo pins may be older.
- Astro CLI latest stable 1.43.1 (2026-07-02).
- 3.3+ only (unavailable on 3.2.2): `ExceptionRetryPolicy`, Databricks `durable`, HITL scheduler timeout handling.
- Ruff `AIR` preview rules (need `preview = true`): `AIR003`, `AIR004`, `AIR201`, `AIR202`, `AIR304`, `AIR321`.

## Conflicts resolved
- Imports in DAG files: Airflow's parse-time rule (heavy imports inside task callables) overrides top-of-file import style from skill://python for `dags/` modules only (AF:best-practices).
- Legacy import shims: 3.x release notes disagree on whether `airflow.operators.*` and `airflow.decorators` still import; the migration guide calls them deprecated → always use `airflow.sdk` and provider paths (AF:release_notes, AF:installation/upgrading_to_airflow3).
- Params precedence: Apache (run conf > task > DAG) wins over Astronomer Learn's ordering (AF:core-concepts/params vs LEARN:airflow-params).
- Worker concurrency default: executor pages say 16; the worker-type table says 5 (`A5`) … 160 (`A160`) → the worker-type table governs queue defaults (ASTRO:configure-worker-queues vs ASTRO:astro-executor).
- Triggerer setting: `[triggerer] capacity` (Airflow 3); `default_capacity` in LEARN:deferrable-operators is the deprecated name (AF:configurations-ref).
- LEARN:testing-airflow and LEARN:airflow-passing-data-between-tasks are not updated for Airflow 3: only their version-neutral advice is used.
- Astro's Azure DevOps sample is image-only and single-branch; DAG-only/image selection follows ASTRO:ci-cd-templates/template-overview.
- ASTRO:best-practices/cross-deployment-dependencies calls `/api/v1`; Airflow 3 uses `/api/v2` (ASTRO:airflow-api).
- Runtime version: Terraform's `original_astro_runtime_version` can differ from the running Runtime → the deployed image (Dockerfile) sets the running version; the Terraform value only seeds Deployment creation (TFA).
- Pydantic models as XCom: Airflow 3 serde doesn't list `BaseModel` (AF:authoring-and-scheduling/serializers) → push `model.model_dump(mode="json")`, as skill://python/pydantic.md requires.
- Databricks ownership: provider docs offer Airflow-defined jobs (`DatabricksWorkflowTaskGroup`, `DatabricksCreateJobsOperator`); this platform's bundle owns jobs, pipelines, and compute (U) → DAGs trigger only.
