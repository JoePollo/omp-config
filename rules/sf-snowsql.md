---
description: "Scripts and pipelines use Snowflake CLI (snow), not legacy SnowSQL"
condition:
  - '(?m)(?:^|[\s;&|(`''"])snowsql(?:\.exe)?\s+(?:-[A-Za-z]|--[a-z])'
scope: "tool:edit(*.{sh,ps1,psm1,cmd,bat,yml,yaml,py}), tool:write(*.{sh,ps1,psm1,cmd,bat,yml,yaml,py}), tool:edit(**/Dockerfile), tool:write(**/Dockerfile)"
interruptMode: tool-only
---

SnowSQL is legacy and feature-frozen; new scripts, CI steps, and images call `snow`.

| avoid | use |
|---|---|
| `snowsql -c prd -f deploy.sql -o exit_on_error=true` | `snow sql -c <connection> -f deploy.sql --enhanced-exit-codes` |
| `snowsql -a <account> -u <user> ...` | a named connection in `connections.toml`, or `SNOWFLAKE_CONNECTIONS_<NAME>_<KEY>` env vars in CI |
| `&var` substitution | `<% var %>` with `-D "var=value"` (or `<% ctx.env.var %>` from `snowflake.yml`) |

Installing Snowflake CLI (`uv tool install snowflake-cli`) is a new dependency: explicit user approval first. Details: skill://snowflake/devops.md.
Exception: maintenance of existing SnowSQL jobs without a migration request.
