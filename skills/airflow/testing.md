# Testing DAGs
Tags → skill://airflow/sources.md. General pytest conventions: skill://python/testing.md.

## Gates
- Before every merge and deploy: `astro dev parse` (DAG integrity: syntax, import errors, UI render) and `astro dev pytest` (runs `tests/` inside the Runtime image, where Airflow and the pinned providers exist); both need a container runtime. [CLI:astro-dev-parse, CLI:test-your-astro-project-locally]
- CI mirrors them: image deploys parse by default; DAG-only deploys add `--pytest`. [CLI:astro-deploy, ASTRO:deploy-dags]
- Ruff on DAG code: `select` includes `"AIR"`; preview-only rules (`AIR003` Variable.get outside tasks, `AIR304` runtime-varying DAG values, `AIR004`, `AIR201`, `AIR202`, `AIR321`) need `preview = true`; Airflow 2 leftovers: `ruff check dags/ --select AIR301 --fix`. [RUFF, AF:installation/upgrading_to_airflow3]
- Bare `uv run pytest` or `uvx ty check` resolve Airflow imports only where Airflow and the pinned providers are installed; `astro dev pytest` always has them. [CLI:test-your-astro-project-locally, U]

## What to test
- Integrity of every DAG file: no import errors, unique DAG ids, no cycles, required task arguments — the project's `.astro/test_dag_integrity_default.py` and scaffold tests show the pattern. [CLI:astro-dev-parse, CLI:test-your-astro-project-locally, LEARN:testing-airflow]
- Team policy as one suite over all DAGs (tags, required tasks, trigger-rule criteria). [LEARN:testing-airflow]
- Business logic lives in plain functions (helpers under `dags/` or `include/`) tested without a scheduler; DAG files stay thin configuration. [LEARN:dag-best-practices]
- Whole DAG without a scheduler: `dag.test()` (options `run_conf`, `use_executor`, `mark_success_pattern`), `airflow dags test <dag_id> [logical_date]`, or `astro dev run dags test <dag_id>`; one task: `airflow tasks test <dag_id> <task_id> [logical_date_or_run_id]`. [AF:core-concepts/debug, AF:best-practices, AF:cli-and-env-variables-ref, CLI:astro-dev-run]
- Parse cost: time `python dags/<file>.py`, which runs only parse-time code. [AF:best-practices]

## Mocking
- Variables via `AIRFLOW_VAR_<KEY>`, connections via `AIRFLOW_CONN_<CONN_ID>` set to `Connection(...).get_uri()` or JSON, applied with `monkeypatch.setenv`; never real credentials. [AF:best-practices, LEARN:connections]
- No live Airflow, Astro, or Databricks in unit tests; end-to-end runs happen in the dev Deployment with environment values parameterized, not edited. [AF:best-practices]
