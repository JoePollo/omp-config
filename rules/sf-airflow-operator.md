---
description: "Airflow Snowflake provider 6.x removed SnowflakeOperator"
condition:
  - '\bfrom\s+airflow\.providers\.snowflake\.operators\.snowflake\s+import\s+[^\n]*\bSnowflakeOperator\b'
  - '\bSnowflakeOperator\s*\('
scope: "tool:edit(**/dags/**/*.py), tool:write(**/dags/**/*.py), tool:edit(**/include/**/*.py), tool:write(**/include/**/*.py), tool:edit(**/plugins/**/*.py), tool:write(**/plugins/**/*.py)"
interruptMode: tool-only
---

Run Snowflake SQL from DAGs through the common SQL operator, or the SQL API operator for long multi-statement work.

| avoid | use |
|---|---|
| `from airflow.providers.snowflake.operators.snowflake import SnowflakeOperator` | `from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator` with `conn_id=<snowflake connection>` |
| `SnowflakeOperator(task_id="load", sql="...")` for long scripts | `SnowflakeSqlApiOperator(task_id="load", snowflake_conn_id=..., sql=..., statement_count=<n>, deferrable=True)` |

Connections authenticate with a key pair or workload identity, one per environment. Details: skill://snowflake/pipelines.md §Airflow orchestration; DAG design: skill://airflow.
Exception: none.
