---
description: "Dagster definitions: secrets come from dg.EnvVar, never os.getenv/os.environ at load time"
condition:
  - '(?i)\bos\.(?:getenv|environ\.get)\s*\(\s*["''][a-z0-9_]*(?:password|passwd|secret|token|(?:api_?|access_|private_|account_)key|credential|conn(?:ection)?_?str(?:ing)?)[a-z0-9_]*["'']'
  - '(?i)\bos\.environ\s*\[\s*["''][a-z0-9_]*(?:password|passwd|secret|token|(?:api_?|access_|private_|account_)key|credential|conn(?:ection)?_?str(?:ing)?)[a-z0-9_]*["'']\s*\]'
scope: "tool:edit(**/defs/**/*.py), tool:write(**/defs/**/*.py), tool:edit(**/definitions.py), tool:write(**/definitions.py)"
interruptMode: tool-only
---

`dg.EnvVar` resolves when a run launches and stays hidden in the UI; a value read with `os.getenv` while definitions load is baked into resource config and shown in the UI.

## Avoid

```python
import os

import dagster as dg


@dg.definitions
def resources() -> dg.Definitions:
    return dg.Definitions(resources={"sql_server": SqlServerResource(password=os.getenv("SQL_SERVER_PASSWORD"))})
```

## Use

```python
import dagster as dg


@dg.definitions
def resources() -> dg.Definitions:
    return dg.Definitions(resources={"sql_server": SqlServerResource(password=dg.EnvVar("SQL_SERVER_PASSWORD"))})
```

- Integers: `dg.EnvVar.int("NAME")`; component YAML: `{{ env.NAME }}`.
- Values come from deployment configuration (Dagster+ environment variables only when configured) or a local `.env` that is never committed; secret delivery on the self-hosted AWS runtime is unspecified, so follow deployment config. Key Vault via CSI is an AKS reference only. Details: skill://dagster/resources.md.
Exception: tests and scripts outside Dagster definitions.
