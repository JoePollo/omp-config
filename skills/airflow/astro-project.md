# Astro project and Runtime
Tags → skill://airflow/sources.md.

## Layout
- `dags/` (DAG files, DAG-coupled helpers), `include/` (SQL, configs, data; deployed, not parsed), `plugins/`, `tests/`, `Dockerfile`, `requirements.txt` (Python packages and providers), `packages.txt` (OS packages), `.astro/config.yaml`, `.astro/test_dag_integrity_default.py`; `.env` and `airflow_settings.yaml` are local only and never deployed. [CLI:develop-project, CLI:astro-deploy, CLI:astro-dev-parse]
- `.env` and `airflow_settings.yaml` hold plaintext local credentials: keep them out of Git; Deployment values come from Astro env vars and connections. [CLI:develop-project]
- Long SQL in `include/` files with DAG `template_searchpath="/usr/local/airflow/include"`; changes under `include/` ship with image deploys. [LEARN:airflow-sql, ASTRO:deploy-dags]

## Runtime image
- `Dockerfile`: `FROM astrocrpublic.azurecr.io/runtime:<major.minor>-<patch>`, an exact patch in production (floating `3.2` tracks the latest patch); Python override suffix `-python-3.12`; `-ubi` variant from 3.2 (Debian default). [RT:runtime-image-architecture]
- Current `3.2-6` (2026-07-14, Airflow 3.2.2); the latest 3.2 patch in the 2026-08-31 snapshot is `3.2-9` (same Airflow; 3.2-7 → 3.2-9 add scheduler, DAG-version, and authorization fixes). [RT:runtime-release-notes, U]
- The Runtime version comes only from the Dockerfile via an image deploy; Terraform's `original_astro_runtime_version` is creation-only. [TFA, ASTRO:deploy-dags]
- Lifecycle: each 3.x minor gets 2 years of maintenance + 6 months Basic Support (3.2 → 2028-04 / 2028-10; 3.1 → 2027-09); Astro allows upgrades to a minor's latest patch; Runtime 3.3 (Airflow 3.3) exists since 2026-07-09. [RT:runtime-version-lifecycle-policy, RT:runtime-release-notes]
- Runtime 3.x preinstalls only core providers (`celery`, `common-compat`, `common-io`, `common-sql`, `elasticsearch`, `openlineage`, `smtp`, `standard`); `databricks`, `microsoft-azure`, `microsoft-mssql`, `cncf-kubernetes`, `mysql`, `postgres` go in `requirements.txt`. [RT:runtime-provider-reference, RT:runtime-release-notes]

## Dependencies
- Pin every package and provider exactly in `requirements.txt` (`apache-airflow-providers-databricks==<x.y.z>`); unpinned entries install the latest release at build time. [CLI:add-providers-packages, ASTRO:best-practices/upgrading-astro-runtime]
- Installed versions: `astro dev bash pip freeze`; check a pinned provider's docs version before using newer arguments. [RT:runtime-image-architecture]
- `requirements.txt` is the platform manifest: no `uv`/`pyproject.toml` dependency migration unasked (skill://python/packaging.md). [U]
- OS packages → `packages.txt`. [CLI:develop-project]

## Local development (Astro CLI)
- `astro dev start` (Docker or Podman; `--standalone` runs without containers), `astro dev restart` (rebuild), `astro dev stop` (keeps the local DB), `astro dev kill` (removes containers and local DB). [CLI:astro-dev-start, CLI:astro-dev-restart, CLI:astro-dev-stop, CLI:astro-dev-kill, CLI:local-airflow-overview]
- `astro dev logs --dag-processor|--scheduler|--triggerer [--follow]`; `astro dev bash [--scheduler]`; `astro dev run <airflow CLI args>` against the local environment only (e.g. `astro dev run dags list-import-errors`). [CLI:astro-dev-logs, CLI:astro-dev-bash, CLI:astro-dev-run]
- Local connections, variables, pools: `airflow_settings.yaml` or `.env` (`AIRFLOW_CONN_*`, `AIRFLOW_VAR_*`); `astro dev object import|export`. [CLI:develop-project, CLI:astro-dev-object-import, CLI:astro-dev-object-export]
- Checks: `astro dev parse` (integrity) and `astro dev pytest` (`tests/`); both need a container runtime. [CLI:astro-dev-parse, CLI:test-your-astro-project-locally]
- CLI version: latest stable 1.43.1 in the 2026-08-31 docs snapshot; locally use the version the CI pipeline pins. [CLIREL, U]

## Upgrades and rollback
- Before any Runtime change: `astro dev upgrade-test --runtime-version <target>` (dependency diff, DAG import test, ruff Airflow checks; report dir `upgrade-test-<current>--<target>`), read the target's release notes, then `astro dev pytest`, a local run, and dev before tst/prd. [CLI:astro-dev-upgrade-test, ASTRO:best-practices/upgrading-astro-runtime, ASTRO:airflow3/upgrade-af3]
- Rollback = redeploy an earlier deploy from deploy history (kept 90 days): restores code, DAGs, Runtime version, and the DAG-deploy setting, not env vars or resources; a Runtime downgrade fails running tasks immediately. [ASTRO:deploy-history]
