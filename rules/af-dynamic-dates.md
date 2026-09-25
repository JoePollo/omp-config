---
description: "DAG and task dates are fixed; now()/today() in constructor arguments re-versions the DAG on every parse"
condition:
  - '\b(?:start_date|end_date)\s*=\s*(?:\w+\.)*(?:now|today|utcnow)\s*\('
scope: "tool:edit(**/dags/**/*.py), tool:write(**/dags/**/*.py)"
interruptMode: never
---
A runtime-varying `start_date`/`end_date` changes the serialized DAG on every parse: endless DAG versions, unbounded metadata growth, broken scheduling.

| avoid | use |
|---|---|
| `start_date=datetime.now(UTC)`, `start_date=pendulum.now("UTC").subtract(days=1)` | `start_date=pendulum.datetime(2026, 1, 1, tz="UTC")` |
| `end_date=pendulum.today()` | a fixed `pendulum.datetime(...)` or no `end_date` |

Dates inside tasks come from the run context (`data_interval_start`, `logical_date`), not the clock. Details: skill://airflow/authoring.md.
Exception: none for DAG and task constructors.
