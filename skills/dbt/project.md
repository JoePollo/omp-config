# Project and model design

Tags → skill://dbt/sources.md.

## Project structure

- Declare warehouse-loaded relations as dbt sources and use `source()` for them; use `ref()` for dbt models so dependencies and environment-specific relations stay in the DAG. [WORKFLOW, SOURCES]
- Separate source-conformed preparation from business-conformed transformation; treat staging, intermediate, and marts as an adaptable project structure, not a mandatory modeling methodology. [STRUCTURE, WORKFLOW]
- Rename and recast source fields once; split transformations when logic is reused, changes grain, or becomes difficult to reason about, not merely to turn every CTE into a model. [WORKFLOW, STRUCTURE]
- Keep SQL style and naming conventions in the repository; dbt's style guide establishes clarity and consistency, not a definitive SQL formatting rule set. [STYLE, U]
- Pin community package versions and review maintenance, licensing, and security before adoption; the dbt Package Hub does not certify packages. [PACKAGES, U]

## Materializations

- Start with a view for simple models; use a table when query performance or downstream reuse warrants persisted results. [MATERIALIZATIONS, WORKFLOW]
- Use incremental materialization only when full rebuild time or cost justifies its extra correctness and maintenance burden. [MATERIALIZATIONS, INCREMENTAL]
- Design incremental filters for updates and late-arriving data; use a non-null unique key where the strategy needs row matching, and rebuild history when changed logic would leave old rows inconsistent. [INCREMENTAL]
