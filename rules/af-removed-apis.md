---
description: "Airflow 3 removed schedule_interval, timetable, fail_stop, SLAs, SubDAGs, and days_ago"
condition:
  - '\bschedule_interval\s*='
  - '\bfail_stop\s*='
  - '\bsla_miss_callback\s*='
  - '(?m)(?:[(,]\s*|^[ \t]+)(?:timetable|sla)\s*=(?!=)'
  - '\bSubDagOperator\b'
  - '\bdays_ago\s*\('
scope: "tool:edit(**/dags/**/*.py), tool:write(**/dags/**/*.py), tool:edit(**/include/**/*.py), tool:write(**/include/**/*.py), tool:edit(**/plugins/**/*.py), tool:write(**/plugins/**/*.py)"
interruptMode: never
---
These Airflow 2 arguments and helpers no longer exist in Airflow 3.

| avoid | use |
|---|---|
| `schedule_interval="@daily"`, `timetable=CronTriggerTimetable(...)` | `schedule="@daily"`, `schedule=CronTriggerTimetable(...)` |
| `fail_stop=True` | `fail_fast=True` |
| `sla=timedelta(...)`, `sla_miss_callback=...` | Deadline Alerts (3.1+) or Astro Timeliness/Duration alerts |
| `SubDagOperator(...)` | `@task_group` or asset-scheduled DAGs |
| `start_date=days_ago(1)` | `start_date=pendulum.datetime(2026, 1, 1, tz="UTC")` |

Details: skill://airflow/authoring.md.
Exception: Airflow 2 code kept unchanged on purpose (a documented legacy fixture).
