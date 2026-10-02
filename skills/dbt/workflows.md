# CLI and CI workflows

Tags → skill://dbt/sources.md.

## Development and validation

- Version-control the dbt project and review changes before production promotion; run local development against `dev`, not `prd`. [WORKFLOW, U]
- Keep `dev`, `tst`, and `prd` targets isolated in profiles or environment configuration; never hardcode environment-specific databases, schemas, or secrets in models. [WORKFLOW, U]
- Use dbt's Core CLI selection syntax for local work and sandboxed CI; do not substitute dbt platform job or hosted CI instructions. [WORKFLOW, LIC]
- For slim CI, compare against production artifacts and defer unselected parents, for example `dbt run -s state:modified+ --defer --state <prod-artifacts>` followed by `dbt test -s state:modified+ --defer --state <prod-artifacts>`. [WORKFLOW]
- In Dagster-orchestrated workloads, use `DbtProjectComponent` to invoke dbt selections and let Dagster own scheduling and orchestration; do not schedule the same dbt work independently. [DGCOMPONENT, DGPROJECT, U]
