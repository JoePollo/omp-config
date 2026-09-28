---
description: "Dagster 1.13: deprecated or removed APIs have replacements (AutomationCondition, AssetSpec, deps lists, FreshnessPolicy, kinds)"
condition:
  - '\bAutoMaterialize(?:Policy|Rule)\b'
  - '\bauto_materialize_policy\s*='
  - '\bSourceAsset\s*\('
  - '\bnon_argument_deps\s*='
  - '\bexternal_assets?_from_specs?\s*\('
  - '\bget_all_asset_specs\s*\('
  - '\bLegacyFreshnessPolicy\b'
  - '\blegacy_freshness_polic(?:y|ies_by_output_name)\s*='
  - '\bbuild_\w+_freshness_checks\s*\('
  - '\basset_partition(?:_key|_keys|_key_range|s_time_window)_for_output\s*\('
  - '\bcompute_kind\s*='
  - '\bdagster_embedded_elt\b'
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: tool-only
---

Dagster 1.13 code uses the current APIs; these are deprecated, superseded, or removed.

| avoid | use |
|---|---|
| `AutoMaterializePolicy`, `AutoMaterializeRule`, `auto_materialize_policy=` | `automation_condition=dg.AutomationCondition.eager()` / `.on_cron("…")` / `.on_missing()` |
| `SourceAsset(...)` | `dg.AssetSpec(...)`; IO manager key via `.with_io_manager_key(...)` |
| `external_asset_from_spec(...)`, `external_assets_from_specs(...)` (removed 1.13.0) | `dg.AssetSpec` objects passed to `dg.Definitions(assets=[...])` |
| `non_argument_deps=`, `deps=dg.AssetKey(...)` | `deps=[upstream]` or `deps=[dg.AssetDep("upstream")]` |
| `Definitions.get_all_asset_specs()` (removed 1.13.0) | `Definitions.resolve_all_asset_specs()` |
| `LegacyFreshnessPolicy`, `legacy_freshness_policy=`, `build_*_freshness_checks(...)` | `freshness_policy=dg.FreshnessPolicy.time_window(fail_window=...)` or `dg.FreshnessPolicy.cron(deadline_cron=..., lower_bound_delta=...)` |
| `context.asset_partition_key_for_output()` and siblings | `context.partition_key`, `context.partition_keys`, `context.partition_key_range`, `context.partition_time_window` |
| `compute_kind="…"` | `kinds={"…"}` |
| `dagster_embedded_elt` | `dagster_sling` or `dagster_dlt` |

Details: skill://dagster/assets.md, skill://dagster/automation.md.
Exception: projects pinned below the Dagster version that introduced a replacement keep the old API until upgraded.
