---
description: "data_platform config YAML: comment-free, strict keys, order preserved"
condition:
  - '(?m)^\s*#'
  - '\bdb_schema\s*:'
scope: "tool:edit(**/data_platform/config/**/*.yaml), tool:write(**/data_platform/config/**/*.yaml)"
interruptMode: never
---
data_platform config YAML is the metadata contract: strict Pydantic loaders reject unknown keys, and the files stay comment-free.

## Avoid

```yaml
source:
  db_schema: <raw_schema>
tables:
# new documents feed
- source:
    table: <raw_destination_table>
```

## Use

```yaml
source:
  schema: <raw_schema>
tables:
- source:
    table: <raw_destination_table>
```

- YAML spells `schema` (Python field `db_schema` is never a YAML key); the only aliases are `connector.type`, `connector.mode`, `schema`.
- Non-obvious source facts go in `CONTRIBUTING.md`, not YAML comments; preserve file, mapping, and list order.
- Existing comments stay unless removal is requested. Details: skill://databricks-platform/data-platform-bundle.md.
