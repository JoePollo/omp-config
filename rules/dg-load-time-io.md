---
description: "Dagster definition modules: no API, database, HTTP, or Spark calls at module level; they run on every code-location load"
condition:
  - '(?m)^[A-Za-z_][^#\n]*\b(?:requests|httpx|urllib\.request)\.\w+\s*\('
  - '(?m)^(?!class\s|def\s|async\s)[A-Za-z_][^#\n]*\bWorkspaceClient\s*\('
  - '(?m)^[A-Za-z_][^#\n]*\b(?:pyodbc|pymssql|psycopg2?)\.connect\s*\('
  - '(?m)^[A-Za-z_][^#\n]*\bspark\.(?:read|sql|table)\b'
scope: "tool:edit(**/defs/**/*.py), tool:write(**/defs/**/*.py), tool:edit(**/definitions.py), tool:write(**/definitions.py)"
interruptMode: tool-only
---

Module code in Dagster definition modules runs whenever a code location loads (deploys, reloads, `dg check defs`); external calls there make loading slow and dependent on those systems.

## Avoid

```python
from databricks.sdk import WorkspaceClient

JOBS = [job.settings.name for job in WorkspaceClient().jobs.list()]
```

## Use

```python
import dagster as dg


@dg.asset(kinds={"databricks"})
def orders_daily(databricks: DatabricksJobs) -> dg.MaterializeResult:
    run_id = databricks.run("orders_refresh", {})
    return dg.MaterializeResult(metadata={"databricks_run_id": run_id})
```

- Clients open inside resources at run time; definitions built from external metadata use a state-backed component whose state refreshes in CI (`dg utils refresh-defs-state`).
- `@dg.definitions` functions follow the same rule. Details: skill://dagster/project.md.
Exception: cheap local reads of files shipped with the project (YAML or JSON beside the module).
