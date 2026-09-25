---
description: "DAG files: no heavy imports, Variable/Connection lookups, hooks, or HTTP calls at module level; they run on every parse"
condition:
  - '(?m)^(?:import|from)\s+(?:pandas|polars|pyarrow|numpy|scipy|sklearn|torch|tensorflow|pyspark|matplotlib)\b'
  - '(?m)^[A-Za-z_][^#\n]*\bVariable\.get\s*\('
  - '(?m)^[A-Za-z_][^#\n]*\b(?:BaseHook\.get_connection|Connection\.get)\s*\('
  - '(?m)^(?!class\s|def\s|async\s)[A-Za-z_][^#\n]*\b\w+Hook\s*\('
  - '(?m)^[A-Za-z_][^#\n]*\b(?:requests|httpx|urllib\.request)\.\w+\s*\('
scope: "tool:edit(**/dags/**/*.py), tool:write(**/dags/**/*.py)"
interruptMode: never
---
Module-level code in DAG files runs on every parse (at least every 30 s): it slows the dag processor and hits external systems.

## Avoid

```python
import pandas as pd
from airflow.sdk import Variable, dag, task

TABLES = Variable.get("tables", deserialize_json=True)
```

## Use

```python
import pendulum

from airflow.sdk import Variable, dag, task


@dag(schedule="@daily", start_date=pendulum.datetime(2026, 1, 1, tz="UTC"), catchup=False)
def orders_daily():
    @task
    def summarize() -> int:
        import pandas as pd

        tables = Variable.get("tables", deserialize_json=True)
        return len(pd.DataFrame({"table": tables}))

    summarize()


orders_daily()
```

- Parse-time values: environment variables or config files shipped in `dags/`; templated fields (`{{ var.value.<key> }}`) render at run time.
- The same rule holds inside `with DAG(...)` blocks and `@dag` bodies. Details: skill://airflow/parsing.md.
Exception: cheap modules (stdlib, `pendulum`, `airflow.*`) stay at module top.
