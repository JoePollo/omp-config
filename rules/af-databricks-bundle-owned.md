---
description: "Databricks jobs, pipelines, and clusters are bundle-owned; DAGs trigger them, never define them"
condition:
  - '\bDatabricksWorkflowTaskGroup\b'
  - '\bDatabricksCreateJobsOperator\b'
  - '\bnew_cluster\s*='
  - '["'']new_cluster["'']\s*:'
scope: "tool:edit(**/dags/**/*.py), tool:write(**/dags/**/*.py), tool:edit(**/include/**/*.py), tool:write(**/include/**/*.py)"
interruptMode: never
---
The Databricks `data_platform` bundle defines and deploys jobs, pipelines, and compute; Airflow triggers and monitors them.

| avoid | use |
|---|---|
| `DatabricksSubmitRunOperator(new_cluster={...}, notebook_task={...})` | a bundle job + `DatabricksRunNowOperator(job_name="<job>", deferrable=True)` |
| `DatabricksWorkflowTaskGroup(...)`, `DatabricksCreateJobsOperator(...)` | jobs declared in the bundle, triggered by `job_name` |
| cluster specs in DAG code | bundle compute (serverless or bundle job clusters) |

Pipelines: `DatabricksSubmitRunOperator(pipeline_task={"pipeline_id": ...}, deferrable=True)`. Details: skill://airflow/databricks.md.
Exception: the user explicitly asks for Airflow-defined Databricks jobs.
