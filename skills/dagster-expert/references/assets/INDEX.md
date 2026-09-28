---
title: Asset Patterns
type: index
triggers:
  - "defining assets, dependencies, metadata, partitions, or multi-asset definitions"
---

## Asset Patterns

### When to Use Each Pattern

- **Basic `@dg.asset`** — simple one-to-one transformation
- **Parameter-based dependency** — asset depends on another managed asset, data loaded via IOManager
- **`deps=` dependency** — asset depends on external or non-Python asset, data dependency only
- **`@multi_asset`** — single operation produces multiple related assets
- **`@graph_asset`** — multiple op steps needed to produce one asset
- **`@graph_multi_asset`** — complex pipeline producing multiple assets from composed ops
- **Asset factory** — generate many similar assets programmatically

### Quick Notes on Basic Patterns

**Basic `@dg.asset`:** Function name becomes the asset key. Docstring becomes the description in the UI. Return type annotation is optional but recommended.

**Asset groups:** Use `group_name=` on the decorator to organize assets visually in the UI. Common groupings: by data layer (`raw`, `staging`, `analytics`), by domain (`sales`, `marketing`), or by source (`postgres`, `api`).

**Key prefixes:** Use `key_prefix=["warehouse", "raw"]` to namespace asset keys hierarchically (e.g. `warehouse/raw/orders`). Useful for multi-tenant or layered architectures.

**Configuration:** Subclass `dg.Config` with typed fields, then add as a parameter to your asset function. Fields become configurable at launch time.

**Execution context:** Add `context: dg.AssetExecutionContext` as a parameter to access `context.log`, `context.asset_key`, `context.partition_key` (if partitioned), and `context.run_id`.

**Return types:** Assets can return data directly (passed to downstream via IOManager) or `dg.MaterializeResult` (for metadata, or `dg.MaterializeResult[T]` for data + metadata). `MaterializeResult[T]` is preferred over `dg.Output[T]` in greenfield code.

### Common Anti-Patterns

- **Verb-based names** like `load_customers` — use nouns describing the output: `customers`
- **Giant asset doing everything** — split into focused, composable assets
- **No type annotations** — add a return type: `-> dict`, `-> None`
- **No docstring** — add a description via docstring or `description=`
- **Ignoring `MaterializeResult`** — return metadata for observability

### Reference Files

<!-- BEGIN GENERATED INDEX -->

- [Advanced Asset Patterns](./advanced-patterns.md) — @multi_asset, @graph_asset, @graph_multi_asset, or asset factories; MaterializeResult, dynamic metadata, MetadataValue types
- [Asset Definition Properties](./definition-metadata.md) — asset metadata, tags, owners, groups, key_prefix, code_version, AssetSpec properties
- [Asset Dependencies](./dependencies.md) — asset dependencies, parameter-based deps, deps= external dependencies
<!-- END GENERATED INDEX -->
