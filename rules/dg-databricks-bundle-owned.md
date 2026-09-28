---
description: "Databricks jobs, pipelines, and compute are bundle-owned; Dagster triggers deployed jobs, never defines clusters or one-time runs"
condition:
  - '\bnew_cluster\b'
  - '\bjobs\.SubmitTask\b'
  - '\bPipesDatabricks(?:Serverless)?Client\b'
  - '\bcreate_databricks_submit_run_op\b'
  - '\.jobs\.(?:submit(?:_and_wait)?|create)\s*\('
scope: "tool:edit(**/defs/**/*.{py,yaml,yml}), tool:write(**/defs/**/*.{py,yaml,yml}), tool:edit(**/definitions.py), tool:write(**/definitions.py)"
interruptMode: tool-only
---

The Databricks `data_platform` bundle defines and deploys jobs, pipelines, and compute; Dagster triggers deployed jobs and records their runs.

| avoid | use |
|---|---|
| `PipesDatabricksClient` with `jobs.SubmitTask(new_cluster={...})` | a bundle job + `workspace.jobs.run_now_and_wait(job_id=<resolved by name>, job_parameters={...})` inside a resource |
| `workspace.jobs.submit(...)`, `workspace.jobs.create(...)`, `create_databricks_submit_run_op(...)` | jobs declared in the bundle, triggered by name |
| cluster specs in Dagster code or `defs.yaml` | bundle compute (serverless or bundle job clusters) |

Details: skill://dagster/databricks.md.
Exception: the user explicitly asks for Dagster-defined Databricks runs (Pipes).
