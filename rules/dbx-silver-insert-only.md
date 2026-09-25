---
description: "Raw Vault hubs, links, satellites are insert-only"
condition:
  - '(?i)\bUPDATE\s+\S*\bsilver`?\.[^;]*?\bSET\b'
  - '(?i)\bDELETE\s+FROM\s+\S*\bsilver`?\.'
  - '(?i)\bMERGE\s+INTO\s+\S*\bsilver`?\.[^;]*?\bTHEN\s+(?:UPDATE|DELETE)\b'
  - 'silver[\s\S]*?\.when(?:Matched(?:Update|UpdateAll|Delete)|NotMatchedBySource(?:Update|Delete))\s*\('
scope: "tool:edit(*.sql), tool:write(*.sql), tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
Raw Vault hub, link, satellite: insert-only; history = new satellite rows, never updates or deletes.

## Avoid

```sql
MERGE INTO dwh_dev.silver.<satellite> t USING <staged> s ON t.<parent_hash_key> = s.<parent_hash_key>
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;
```

## Use

```sql
MERGE INTO dwh_dev.silver.<hub> t USING <deduped_staged_keys> s ON t.<hash_key> = s.<hash_key>
WHEN NOT MATCHED THEN INSERT *;
```

- Satellite: insert rows whose hash key is new or whose hashdiff differs from the key's latest row; end dates derived at read time.
- One writer per hub/link per run: PK unenforced; concurrent insert-only MERGEs can duplicate keys.

## Exceptions
- Legal erasure of personal data.
- Business Vault, PIT, bridge rebuild/refresh; non-vault silver tables.
- Legacy-origin models (skill://databricks-silver-modeling § Gate).
