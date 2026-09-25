---
description: "Data Vault hash keys: md5 hex STRING, never xxhash64"
condition:
  - '(?i)\bxxhash64\s*\('
scope: "tool:edit(*.sql), tool:write(*.sql), tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
Vault hash keys and hashdiffs: `md5()` hex STRING from the repo's one hashing convention.

## Avoid

```sql
SELECT xxhash64(<business_key>) AS <hash_key> FROM <staged>
```

## Use

```sql
SELECT md5(<normalized_business_key>) AS <hash_key> FROM <staged>
```

- 64-bit hashes collide and aren't portable; `sha2(<x>, 256)` only when a stronger guarantee is required.
- STRING, not BINARY: BINARY can't be a clustering key.
- No hashing convention in the repo → ask user (skill://databricks-silver-modeling/modeling.md).

## Exceptions
- Non-key uses: sampling, bucketing, checksums outside the vault.
- Legacy-origin models (skill://databricks-silver-modeling § Gate).
