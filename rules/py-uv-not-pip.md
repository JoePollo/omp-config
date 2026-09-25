---
description: "In uv projects manage dependencies with uv, not pip"
condition:
  - '\bpip3?\s+install\b'
scope: "tool:bash"
interruptMode: never
---
| goal | command |
|---|---|
| project dependency | `uv add <pkg>` |
| dev/test tool | `uv add --dev <pkg>` |
| script dependency | `uv add --script f.py <pkg>` |
| run a CLI once | `uvx <tool>` |
| install a CLI | `uv tool install <tool>` |

Never install into system Python (PEP 668). `uv pip install` only for non-project environments (image builds, legacy venvs). No `pyproject.toml` (e.g. Astro `requirements.txt`): edit that manifest; don't migrate unasked.
