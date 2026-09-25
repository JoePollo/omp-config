---
description: "Airflow 3 removed execution_date and the next_/prev_/yesterday_/tomorrow_ date context keys"
condition:
  - '\{\{[^}]*\b(?:execution_date|next_execution_date|prev_execution_date(?:_success)?|(?:next|prev|yesterday|tomorrow)_ds(?:_nodash)?)\b'
  - '\[\s*["''](?:execution_date|next_execution_date|prev_execution_date(?:_success)?|(?:next|prev|yesterday|tomorrow)_ds(?:_nodash)?)["'']\s*\]'
  - '\.get\(\s*["''](?:execution_date|next_execution_date|prev_execution_date(?:_success)?|(?:next|prev|yesterday|tomorrow)_ds(?:_nodash)?)["'']'
scope: "tool:edit(**/dags/**/*.{py,sql,sh}), tool:write(**/dags/**/*.{py,sql,sh}), tool:edit(**/include/**/*.{py,sql,sh}), tool:write(**/include/**/*.{py,sql,sh}), tool:edit(**/plugins/**/*.py), tool:write(**/plugins/**/*.py)"
interruptMode: never
---
Airflow 3 removed these keys from the task context and templates.

| removed | use |
|---|---|
| `execution_date`, `dag_run.execution_date` | `logical_date` (a trigger time, not a data slice) or `data_interval_start` |
| `next_ds`, `next_execution_date` | `data_interval_end` (data-interval timetables) |
| `prev_ds`, `prev_execution_date`, `prev_execution_date_success` | `prev_data_interval_start_success`, `prev_start_date_success` |
| `yesterday_ds`, `tomorrow_ds` (+ `_nodash`) | `macros.ds_add(ds, -1)`, `macros.ds_add(ds, 1)` |

`ds`, `ts`, and `logical_date` exist only when the run has a logical date. Details: skill://airflow/authoring.md.
Exception: a column or field that merely shares the name (e.g. `row["execution_date"]` from a source table); keep it.
