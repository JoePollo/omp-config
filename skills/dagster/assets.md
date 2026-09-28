# Assets and lineage

Tags → skill://dagster/sources.md.

## Modeling

- One `@dg.asset` per persistent object, named for the output (`customers`, not `load_customers`), with a docstring or `description=` and a return annotation. [DG:guides/build/assets/defining-assets, SK:references/assets/INDEX.md]
- Separate assets per phase when phases need their own visibility, retries, selection, or reuse; one asset when simple phases always run together. [DG:guides/build/assets/modeling-etl-pipelines]
- `@dg.multi_asset` when one computation produces several assets; `can_subset=True` only if outputs can materialize independently; `@dg.graph_asset` or `@dg.graph_multi_asset` when an asset needs several ops. [DG:guides/build/assets/defining-assets, DG:guides/build/assets/modeling-etl-pipelines]
- Ops and op jobs (`@dg.op`, `@dg.job`) only for workflows without a persistent asset. [DG:api/dagster/assets, DG:api/dagster/definitions]
- Asset jobs: `dg.define_asset_job(name=..., selection=...)`, launched by schedules, sensors, or the UI. [DG:guides/build/jobs/asset-jobs]

## Keys, groups, and metadata

- `key_prefix` (string or list) builds hierarchical keys; `key=` excludes `name` and `key_prefix`; segments use letters, digits, and underscores. [DG:guides/build/assets/defining-assets, DG:api/dagster/assets]
- Set `group_name` (one group per asset; `/` nests groups from 1.13.9), `owners` (`team:<name>` or email), `kinds={...}` (up to ten; `compute_kind` is superseded), and string `tags` for other dimensions. [DG:guides/build/assets/metadata-and-tags, DG:guides/build/assets/metadata-and-tags/groups, DG:guides/build/assets/metadata-and-tags/kind-tags]
- Per-run metadata: return `dg.MaterializeResult(metadata={...})` (`dg.MaterializeResult[T]` over `dg.Output[T]` when also returning a value); a multi-asset yields one per `asset_key`. [DG:guides/build/assets/metadata-and-tags, SK:references/assets/INDEX.md]
- Table assets publish `dagster/column_schema` so data-contract checks can compare it. [DG:guides/test/data-contracts]
- Keep definition metadata small: repeated per-asset metadata inflates code-location snapshots (130 MB limit on Dagster+). [DG:deployment/dagster-plus/management/snapshot-size-limits]

## Dependencies and data passing

- `deps=[...]` for lineage and ordering when the asset reads storage itself (SQL tables, Delta, files); a function parameter only when an I/O manager loads the upstream value. [DG:guides/build/assets/defining-assets-with-asset-dependencies, DG:guides/build/io-managers]
- No I/O managers for warehouse tables, self-managed storage, or data larger than memory; the default `FilesystemIOManager` pickles to the local filesystem, which isolated run pods don't share. [DG:guides/build/io-managers, DG:deployment/execution/run-retries]
- `deps` takes a list (`deps=[upstream]`, `deps=[dg.AssetDep("upstream")]`): a bare `AssetKey` was removed in 1.13.0 and `non_argument_deps=` is deprecated. [DG:migration/upgrading, GH:MIGRATION.md]
- Cross-code-location inputs: a local `dg.AssetSpec(<key>).with_io_manager_key(...)`, never `SourceAsset`. [DG:guides/build/assets/defining-assets-with-asset-dependencies, GH:MIGRATION.md]

## External and virtual assets

- Data another system produces is a `dg.AssetSpec` (not `SourceAsset`) passed straight to `dg.Definitions`; the owning system's updates arrive as sensor or REST API reports. [DG:guides/build/assets/external-assets, GH:MIGRATION.md, DG:migration/upgrading]
- Report external facts as `dg.AssetObservation` (free on Dagster+) rather than materializations (one credit each). [DG:guides/build/assets/metadata-and-tags/asset-observations, DG:deployment/dagster-plus/management/report-external-system-events]
- Virtual assets (`is_virtual=True`, e.g. views) are preview. [DG:guides/build/assets/virtual-assets]

## Dynamic fanout

- `DynamicOut` with `.map()` and `.collect()` only when every item needs its own visibility and retries (each output can cost a Dagster+ credit); otherwise parallelize inside one asset or op. [DG:examples/best-practices/dynamic-vs-parallel, DG:examples/best-practices/dynamic-fanout]
