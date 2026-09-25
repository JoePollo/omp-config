# Unity Catalog
Tags → skill://databricks-platform/sources.md.

## Identities & ownership
- Provision users, groups, and service principals at account level from the IdP (automatic identity management, else account SCIM); no workspace-level SCIM; manage groups in the IdP, not in Databricks. [UC:best-practices]
- Grant to groups, never users; groups own production catalogs, schemas, and objects (creators reassign ownership); jobs and pipelines run as service principals. [UC:best-practices]
- Admin roles to groups; metastore admin optional; `ALL PRIVILEGES` (excludes `MANAGE`, `EXTERNAL USE LOCATION`, `EXTERNAL USE SCHEMA`) and `MANAGE` sparingly — `MANAGE` can grant itself data access. [UC:best-practices]
- Direct `MODIFY` on production tables: service principals only. [UC:best-practices]

## Privileges
- Privileges inherit to current and future children; ownership doesn't. `USE CATALOG` + `USE SCHEMA` gate everything below: grant them only to principals allowed to see the data. [UC:best-practices, UC:manage-privileges/]
- Team schema pattern: `USE CATALOG` on the catalog + `USE SCHEMA`, `CREATE TABLE` on the team's schema. [UC:best-practices, UC:manage-privileges/]
- `BROWSE` = metadata-only discovery (no data access) plus access requests; grant it to named groups — the local grant manifest rejects broad principals such as `All account users`. [UC:best-practices, U]
- Shared editing of views and metric views: a group owner with access to the sources. [UC:best-practices]

## Catalogs, bindings, storage
- Catalog = isolation unit (environment, team, business unit); schemas organize within it. [UC:best-practices]
- Bind catalogs to workspaces when environments need isolation (unbound workspaces are denied despite grants); read-only binding for query-only workspaces; binding changes need catalog ownership or `MANAGE`. [UC:best-practices, UC:access-control/workspace-catalog-binding]
- Managed storage at catalog level on dedicated containers nothing outside UC can reach; never reuse the DBFS root container; Azure: stripe storage-heavy workloads across storage accounts (20,000 requests/s per account). [UC:best-practices]
- One metastore per region for every environment; OpenSharing across regions or clouds (you pay egress); never register one external table in two metastores. [UC:best-practices]

## External locations & volumes
- `CREATE EXTERNAL LOCATION` only for admins or trusted engineers; no `READ FILES`/`WRITE FILES` for end users; never mount storage that backs an external location; never create tables or volumes at a location's root; enable file events. [UC:best-practices]
- Path access through volumes (`/Volumes/<catalog>/<schema>/<volume>/`); external volumes for landing and staging (Auto Loader, `COPY INTO`); one external location per schema for external volumes/tables. [UC:best-practices]

## Fine-grained access
- Many tables, consistent rules → ABAC policies on governed tags, attached at the highest catalog/schema scope; table-specific logic or few stable tables → `ALTER TABLE ... SET ROW FILTER` / `ALTER TABLE ... ALTER COLUMN ... SET MASK`. [UC:abac/abac-vs-rls-cm, UC:abac/policies, UC:filters-and-masks/]
- Policies restrict, never grant: table privileges still required. Target or exempt with `TO` / `EXCEPT` (exempt principals see raw data; ≤ 20 principals per policy); control `APPLY TAG` and `ASSIGN`, since retagging changes which policies apply. [UC:abac/core-concepts, UC:abac/requirements]
- Policy UDFs: SQL, simple, deterministic, error-safe (`try_cast`, `try_divide`); principal targeting in `TO`/`EXCEPT`, not inside UDFs; small broadcastable lookup tables; reuse one mask across sensitive columns. [UC:abac/performance]
- Row filters and masks apply to tables, not views (dynamic views for multi-table logic); no time travel on filtered/masked tables; no Delta or Iceberg REST API access to them. Compute: ABAC needs serverless or DBR 16.4+; row filters/masks DBR 12.2 LTS+; exempt a pipeline's run-as identity when its output must be unfiltered. [UC:filters-and-masks/, UC:abac/requirements]

## Compute & APIs
- Compute policies that force UC access modes; standard access mode for all workloads, dedicated only for unsupported features; serverless and SQL warehouses always use UC. [UC:best-practices]
- REST: paginate LIST calls (`max_results=0` + `next_page_token`), retry `429` with backoff and jitter, `omit_properties=true` / `omit_columns=true` for name listings; SDKs and CLI paginate for you. [UC:best-practices]
