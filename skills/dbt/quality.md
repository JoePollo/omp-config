# Tests, contracts, and snapshots

Tags → skill://dbt/sources.md.

## Tests and contracts

- Use reusable generic data tests for repeated assertions and singular SQL data tests for one-off conditions; tests should assert business invariants and model grain. [TESTS, WORKFLOW]
- Use unit tests for complex SQL logic and meaningful edge cases before building full model data; keep static-fixture unit tests in development and CI. [UNIT]
- Use model contracts when consumers need a stable output schema; contracts validate shape at build time, while data tests validate produced data. [CONTRACT, TESTS]
- On Snowflake, primary-key, unique, and foreign-key constraints are informational; use dbt data tests for uniqueness and referential integrity. [CONTRACT, SFTABLE]
- Treat the contract guide as dbt Core guidance even though it is filed under the Mesh documentation path; do not import Mesh product workflows. [CONTRACT, LIC]

## Sources and history

- Configure source freshness when freshness is part of the data SLA; source definitions also provide lineage, documentation, and source-level tests. [SOURCES, TESTS]
- Use snapshots to preserve changing source-row history; prefer the timestamp strategy when a reliable update timestamp exists. [SNAPSHOTS]
- Keep snapshots distinct from incremental models: snapshots capture row changes over time, while incremental models maintain a transformed relation. [SNAPSHOTS, INCREMENTAL]
