---
alwaysApply: true
---
Domain KB: before first edit/review/plan touching a trigger → read skill://<domain>, then topics its index selects. Once per context; re-read after compaction. Repo config > AGENTS.md > KB.

| domain | triggers | read |
|---|---|---|
| python | *.py *.pyi *.ipynb pyproject.toml uv.lock requirements*.txt setup.py setup.cfg .python-version | skill://python |
| coding-entropy | code bound for a commit, any language: write, edit, plan, review (diff/PR). Skip: ad hoc/one-off/scratch code, eval/REPL, shell one-liners, ad hoc queries, temp/local:// files | skill://coding-entropy |
| databricks-platform | databricks.yml databricks.yaml spark-pipeline.yml spark-pipeline.yaml data_platform/**; Databricks notebooks/SQL, data_platform bundle, Lakeflow Connect, pyspark.pipelines/dlt, STREAMING TABLE, MATERIALIZED VIEW, AUTO CDC, CLUSTER BY, OPTIMIZE, VACUUM, Unity Catalog, data quality | skill://databricks-platform |
| databricks-silver-modeling | new Databricks silver models, tables, views, pipelines (dwh_<env>.silver), Business Vault, PIT, bridge, gold marts over them; Data Vault work (hub, link, satellite, hash key): write, edit, plan, review. Skip: legacy-origin models (ported, rebuilt at parity, or maintained from on-prem SQL Server DW, SSIS, IICS, CDI-PC; `legacy*` pipelines) | skill://databricks-silver-modeling |
| terraform | *.tf *.tfvars *.tftest.hcl *.tf.json .terraform.lock.hcl; HCL, terraform CLI (init, validate, plan, apply, import, state), backends and state, providers azurerm azuread azapi databricks astro, Azure DevOps pipelines that run terraform | skill://terraform |
| airflow | dags/** .astro/** airflow_settings.yaml .airflowignore; Airflow DAGs, tasks, operators, sensors, hooks, TaskFlow, XCom, assets, schedules, Airflow 2 → 3 migration, Astro projects (Dockerfile runtime image, requirements.txt, packages.txt, include/, plugins/), astro CLI, Astro Runtime, Astro deploys and Deployments, Airflow MCP or REST API, Databricks jobs/pipelines triggered from Airflow | skill://airflow |
