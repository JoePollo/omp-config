# Python packaging (uv)
Tags → skill://python/sources.md.

## Commands
- Deps: `uv add <pkg>` / `uv remove <pkg>`; dev, test, lint: `uv add --dev <pkg>` or `--group <g>`; extras: `uv add --optional <extra> <pkg>`. [uv]
- Execute: `uv run <cmd>` (syncs first); in a project never activate `.venv`, `pip install`, or `uv pip install`. [uv, P668]
- Tools: one-off `uvx <tool>`; persistent `uv tool install <tool>`. [uv]
- Python: `uv python pin <ver>` → commit `.python-version`; supported range lives in `requires-python`. [uv]
- Lock: commit `uv.lock`; never hand-edit; after a manual pyproject edit run `uv lock`; targeted upgrade `uv lock --upgrade-package <pkg>`. [uv, OAI]
- CI: `uv sync --locked` / `uv run --locked` (fail on a stale lock); `--frozen` only to skip freshness deliberately. [uv, OAI]
- New: `uv init --app` (service/script repo) · `uv init --lib` or `--package` (installable, src layout); keep the generated `[build-system]`. [uv]
- Scripts: `uv init --script f.py` → `uv add --script f.py <pkg>` (PEP 723 block with `requires-python`) → `uv run f.py`; lock with `uv lock --script f.py`. [uv, P723]
- Legacy import: `uv add -r requirements.txt`; an exported `requirements.txt` is output, not source. [uv]
- Platform-owned manifests (Astro `requirements.txt`, image builds): keep as the source of truth; don't migrate unasked. [ASTRO, U]

## pyproject
- `[project]`: `name`, `version`, `requires-python`, `dependencies`; `license` = SPDX expression + `license-files`. [P621, P639, PyPA]
- Runtime deps → `[project].dependencies`; user-selectable features → `[project.optional-dependencies]`; dev, test, lint → `[dependency-groups]`, never extras. [P735, PyPA, uv]
- Libraries: compatible ranges (`>=1.4,<2`), never exact pins; apps: ranges in pyproject, exact state in `uv.lock`. [PyPA, P440]
- Conditional deps via markers: `"tomli>=2; python_version < '3.11'"`. [P508]
- CLIs: `[project.scripts] tool = "pkg.cli:main"`. [PyPA]
- Layout: `src/<pkg>/`; `tests/` outside the package. [PyPA, pytest]
- Build: pure Python → `uv_build` (bounded, as `uv init` writes); C extensions or custom steps → another PEP 517 backend; build with `uv build`; no `setup.py` or `distutils` in new projects. [uv, P517, P518, P632, PyPA]
- Dev-only alternate sources (paths, git, indexes): `[tool.uv.sources]`; `dependencies` keep standard specifiers. [uv]

## Supply chain
- Apps: dependency cooldown `[tool.uv] exclude-newer = "7 days"`; urgent fix → one `exclude-newer-package` exception. [OAI]
- Security floors for transitive deps: `[tool.uv] constraint-dependencies`, not direct deps. [OAI]
- Before adding a dependency: check provenance, maintenance, lockfile diff, build hooks; scan with `uv audit` (preview). [OAI, uv]

## Lint baseline (new projects)
- Keep ruff defaults (0.16+: 413 rules incl. `B`, `UP`, `RUF`, `DTZ`, `I`) and add `extend-select = ["E", "W", "N", "ANN", "S", "PTH", "C90"]`; `[tool.ruff.lint.mccabe] max-complexity = 5` enforces the skill://coding-entropy procedural-function ceiling; `line-length = 100`; `per-file-ignores` for `tests/**/*.py`: `ANN`, `S101`. [ruff, U]
- Async codebases: add `ASYNC`. [OAI]
