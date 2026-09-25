---
description: "Airflow 3: DAG-authoring names come from airflow.sdk; operators and sensors from provider packages"
condition:
  - '\bfrom\s+airflow\s+import\s+[^\n]*\bDAG\b'
  - '\bfrom\s+airflow\.models(?:\.dag)?\s+import\s+[^\n]*\b(?:DAG|Variable|Connection|BaseOperator|Param)\b'
  - '\bfrom\s+airflow\.models\.(?:baseoperator|variable|connection|param)\s+import\b'
  - '\bfrom\s+airflow\.decorators\s+import\b'
  - '\bfrom\s+airflow\.(?:sensors\.base|hooks\.base|utils\.task_group|utils\.dates|datasets)\s+import\b'
  - '\bfrom\s+airflow\.(?:operators|sensors)\.(?:bash|python|empty|dummy|trigger_dagrun|latest_only|external_task|date_time|time_delta|filesystem)\s+import\b'
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
Airflow 3.2 authoring imports come from `airflow.sdk` and provider packages; Airflow 2 paths are removed or deprecated shims.

| avoid | use |
|---|---|
| `from airflow import DAG`, `from airflow.models import DAG` | `from airflow.sdk import DAG` |
| `from airflow.decorators import dag, task, task_group` | `from airflow.sdk import dag, task, task_group` |
| `airflow.models.baseoperator.BaseOperator`, `airflow.sensors.base.BaseSensorOperator`, `airflow.hooks.base.BaseHook` | `from airflow.sdk import BaseOperator, BaseSensorOperator, BaseHook` |
| `airflow.models.Variable`, `Connection`, `Param` | `from airflow.sdk import Variable, Connection, Param` |
| `airflow.utils.task_group.TaskGroup` | `from airflow.sdk import TaskGroup` |
| `airflow.datasets.Dataset` | `from airflow.sdk import Asset` |
| `airflow.operators.python.PythonOperator`, `airflow.operators.bash.BashOperator` | `airflow.providers.standard.operators.python` / `.bash` |
| `airflow.operators.empty.EmptyOperator`, `airflow.operators.dummy.DummyOperator` | `airflow.providers.standard.operators.empty.EmptyOperator` |
| `airflow.sensors.external_task.ExternalTaskSensor` | `airflow.providers.standard.sensors.external_task.ExternalTaskSensor` |
| `airflow.utils.dates.days_ago` | a fixed `pendulum.datetime(2026, 1, 1, tz="UTC")` |

Bulk fix: `ruff check dags/ --select AIR301,AIR302,AIR311,AIR312 --fix`. Details: skill://airflow/authoring.md.
Exception: code that must also import on Airflow 2 keeps its compatibility layer.
