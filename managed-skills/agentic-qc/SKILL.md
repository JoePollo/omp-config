---
name: agentic-qc
description: "Run and adjudicate data-at-rest QC for PowerCenter-deprecation QC stories with the gfs-agentic-qa MCP: pass the PC session name, register missing targets in ~/.config/gaq/targets.yaml with user approval, run compare_at_rest, drill into findings with lookup_rows, and draft the sign-off comment (never posted without approval)."
---

# Agentic QC (PowerCenter deprecation)

Data-at-rest QC of a Databricks replacement against the legacy PowerCenter-produced SQL Server table via the gfs-agentic-qa MCP (`compare_at_rest`, `lookup_rows`). Jira, SQL Server, and Databricks are read-only; never comment on, edit, or transition Jira without explicit user approval.

## 1. Scope

- Story: QC story `QC - DP-<impl> - <session>` or its implementation story. Atlassian cloudId `312bcfb3-bcfa-4a50-8288-79546cce4310`; body via `getJiraIssue`, comments via `executeRead` `listJiraIssueComments`.
- Pass criteria (QC template): every legacy key in the candidate (candidate may hold more; it is more current); sampled matched keys equal on every column, derived/lookup fields included; no unexplained nulls, duplicates, malformed values, or quarantined rows; sign-off before egress cutover. Egress is out of scope.
- Target: `<session>` from the QC story title is the only identifier the tools take. GAQ resolves the oracle table, candidate table, keys, and comparison rules from `~/.config/gaq/targets.yaml`, and the SQL Server connection, Databricks catalog, and candidate schema (`silver_schema`/`bronze_schema`) from `~/.config/gaq/connections.yaml`. Never pass, guess, or search for table names to run a comparison.
- `_History` tables: no Databricks counterpart (bronze SCD2 `__START_AT`/`__END_AT`); compare current tables only and say so.

## 2. Register a missing target

- Only when a tool returns `QC target '<session>' is not registered`. Draft the entry, show it with its evidence, and write it to `targets.yaml` only after the user approves.
- `oracle` (`database`, `schema`, `table`): the table the session loads. Evidence: the implementation story's target, the session's `Table Name Prefix` and `Pre SQL` in `~/src/Databricks/legacy/pc_artifacts/<folder>/<workflow>/<workflow>.XML`, and the table in SQL Server `INFORMATION_SCHEMA.TABLES` (agent-sql-server `query_sql`). Names repeat across schemas (`raw.UTSVolumeDetail`, `InfoZone.UTSVolumeDetail`).
- `candidate` (`layer`, `table`): `silver` for silver `legacy_*` pipelines, `bronze` for legacy_bronze `legacy_stage_*` pipelines; `table` is the pipeline name in `~/src/Databricks/bundles/data_platform/src/data_platform/config/{silver,legacy_bronze}/` or the implementation story's deployed table. Names follow no reliable rule (`servdata.raw.PBSCharges` → `legacy_gpsg_raw_pbscharges`; `stage.dbo.ServicerZone_*` → `legacy_stage_gpsgvision_*`).
- `keys`: omit when the SQL Server table has a primary key; else the PC target fields marked `KEYTYPE="PRIMARY KEY"`; else the bundle `cdc.keys` or egress `write.keys`; else ask the user.
- `distribution_column`: stage tables only (business date). `freshness_column`: a created/modified date or timestamp on both sides, preferring a source modified date over `CDC_Date`; omit when none. `population`: omit (`oracle_in_candidate`) unless the candidate must be an exact replica. `columns`: omit at first.
- Record the legacy load pattern before judging populations: truncate-reload; incremental cutoff (`CDC_Date >= LAST_RUN_DATE` → legacy holds only a delta); current-date filters (compare same-day loads).

## 3. Run

- `compare_at_rest` with `environment` and `target`; set `sample_size` only to fit the run budget. Sign-off runs are prd; dev/tst runs settle keys and column rules.
- Before reading findings, confirm the result's `target`, `oracle`, and `candidate` match the story.
- Changing keys, renames, exclusions (with reason), normalization, freshness, distribution, or population means editing the target's entry, justified by the legacy mapping and approved by the user, then rerunning; never vary rules between calls any other way.

## 4. Adjudicate

- Work `findings` in order; follow each `next_step`. Accept a finding only with evidence: freshness counts, `lookup_rows` output, upstream source rows, or legacy mapping SQL. Unproven → defect.
- `lookup_rows` takes `environment`, `target`, and key maps copied unchanged from evidence. Upstream source rows come from read-only SQL (agent-sql-server `query_sql` for SQL Server sources).
- Accepted in prior QC (DP-25975, 25978, 25980, 25998, 26010, 26074, 26075, 26077): candidate-only keys created after the legacy load; legacy-only exact duplicates removed by the candidate; legacy-only rows the candidate filters by design (null except key); legacy-only rows absent upstream; matched differences where the candidate equals the upstream source; legacy columns null everywhere that the candidate populates; representation-only differences (Y/N vs 0/1) once confirmed per value.
- Defects unless the implementation owner accepts in writing: `not_null_violation`, `length_exceeds_oracle`, `candidate_all_null`, `blank_value_rows`, `quarantined_rows`, unexplained `oracle_only_keys`.

## 5. Report

- Draft the QC comment; the user posts it. Lines:
  - `Compared <catalog>.<schema>.<table> vs <database>.<schema>.<table> via <oracle connection> (<env>; target <session>; run <run_id>; verdict <verdict>).`
  - `Population:` oracle-only and candidate-only counts, each with its proven cause.
  - `Matched keys:` sampled count; mismatches per column with cause.
  - `Data quality:` flags and quarantine counts with cause.
  - `Rules applied:` the target entry's keys, renames, exclusions, and normalizations with justification.
  - `Open defects:` each with evidence, or `none`.
  - `Testing does not include egress.`
- Cite the evidence file `qa/gaq/<env>/<database>_<schema>_<table>/<run_id>.json` under the gaq working directory.
