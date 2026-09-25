# Python KB sources
Verified 2026-09-25. Re-verify § Snapshot on tool or CPython upgrades.

| tag | source |
|---|---|
| `P<n>` | PEP n — https://peps.python.org/pep-<nnnn>/ |
| `G<§>` | Google Python Style Guide — https://google.github.io/styleguide/pyguide.html |
| `TBP` | https://typing.python.org/en/latest/reference/best_practices.html |
| `TMG` | https://typing.python.org/en/latest/guides/modernizing.html |
| `TLG` | https://typing.python.org/en/latest/guides/libraries.html |
| `ANNH` | https://docs.python.org/3/howto/annotations.html |
| `SD:<x>` | https://docs.python.org/3/library/<x>.html (`SD:ft` = https://docs.python.org/3/howto/free-threading-python.html) |
| `LOGH` | https://docs.python.org/3/howto/logging.html, https://docs.python.org/3/howto/logging-cookbook.html |
| `uv` `ruff` `ty` | https://docs.astral.sh/uv/, https://docs.astral.sh/ruff/, https://docs.astral.sh/ty/ — Astral, joined OpenAI 2026-03-19 (https://astral.sh/blog/openai) |
| `PyPA` | https://packaging.python.org/en/latest/ (guides + specifications) |
| `pytest` | https://docs.pytest.org/en/stable/ |
| `PYD` | https://pydantic.dev/docs/validation/latest/ (Pydantic v2, pydantic-settings; formerly docs.pydantic.dev) |
| `OAI` | https://github.com/openai/openai-python and https://github.com/openai/openai-agents-python (AGENTS.md, CONTRIBUTING.md, pyproject.toml, README) |
| `META` | https://pyrefly.org/en/docs/, https://pyrefly.org/blog/, https://engineering.fb.com/ (typing, lazy imports, free-threading) |
| `OWASP` | https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html |
| `ASTRO` | https://github.com/astronomer/astro-cli (project `requirements.txt` is the dependency manifest) |
| `MCP` | https://github.com/modelcontextprotocol/python-sdk (FastMCP structured output) |
| `AF` | https://github.com/apache/airflow (`airflow-core/pyproject.toml` dependencies) |
| `DBR` | https://docs.databricks.com/aws/en/release-notes/runtime/ (installed Python libraries) |
| `U` | user conventions: ~/.omp/agent/AGENTS.md, ~/src/agent-sql-server, user decisions in § Conflicts resolved |

## Snapshot
- CPython: 3.15 final 2026-10-01; 3.14 and 3.13 bugfix; 3.12, 3.11, 3.10 security; 3.10 EOL 2026-10 (https://peps.python.org/api/release-cycle.json).
- ruff 0.16.0 (2026-07-23): 413 default rules (was 59); E401 E402 E701–E703 E711–E714 E721 E731 E741–E743 F403 F405 F406 F722 left the defaults; `# ruff: ignore[CODE] reason` comments. Latest 0.16.9.
- ty: Beta since 2025-12-16; 0.0.84 on 2026-09-24; supports targets 3.10+.
- uv: 0.12.19; `uv audit` preview; `uv_build` is pure-Python only.
- pytest 9: native `[tool.pytest]`, `strict`, `strict_xfail` (alias `xfail_strict`).
- Pyrefly (Meta) 1.0 stable 2026-05-12; not the checker here (ty is).
- Pydantic 2.13.5 (2026-08-28), no 3.x; pydantic-settings 2.15.0 (2026-08-07). KB floor `pydantic>=2.11,<3`.
- Platform Pydantic: Airflow 3 core `pydantic>=2.11.0`; Airflow 2.10/2.11 via the `pydantic` extra only; DBR 15.4 LTS 1.10.6, 16.4 LTS 2.8.2, 17.3 LTS 2.10.6, 18.0 2.10.6.
- ty Pydantic support: constructors, `Field` aliases, `validate_by_name` (ty#2403 closed); open ty#3959: `BeforeValidator`, `Field(frozen=True)`.

## Conflicts resolved
- Imports: Google §2.2 modules-only rejected → PEP 8 + user repos (`from pkg.mod import Name`).
- Line length: PEP 8 79 / Google 80 / ruff 88 / OpenAI 100–120 → repo formatter config; new projects 100 (U).
- Docstrings: user convention (every function, Google sections + `Example:`, types in `Args:`) over PEP 257/Google public-only and Google's omit-annotated-types.
- Generics/aliases: PEP 695 syntax at floor ≥ 3.12 over TypeVar/TypeAlias.
- `from __future__ import annotations`: dropped at floor ≥ 3.14 (PEP 749); kept below.
- Checker strictness: explicit per-rule config; "strict" bundles differ across mypy, pyright, Pyrefly, ty (META).
- Empty containers: annotate; ty/pyright infer `list[Unknown]` where mypy/Pyrefly infer from first use (META).
- Records: Pydantic `BaseModel` for all record-shaped data, private included (user), over dataclasses, `TypedDict`, `NamedTuple`; dataclass only for profiled hot paths; Pydantic's "Use TypedDict over nested models" performance tip rejected.
- Unknown keys: `extra="forbid"` on owned models (user); OpenAI SDK's `extra="allow"` forward-compat pattern → `extra="ignore"` only for payloads from services you don't own.
- Runtime validation: I/O boundaries + `@validate_call` on untyped entry points (user), not every public function.
- Frames: schema-level validation (user); no per-row Pydantic validation in pipelines.

## PEP coverage
- Encoded: 8, 20, 249, 257, 343, 387, 415, 428, 435, 440, 484, 498, 506, 508, 517, 518, 519, 544, 557, 561, 565, 567, 570, 572, 585, 586, 589, 591, 593, 597, 604, 612, 613, 615, 616, 618, 621, 632, 634, 636, 639, 647, 649, 654, 661, 668, 673, 675, 678, 680, 681, 686, 692, 695, 696, 698, 701, 702, 703, 706, 723, 734, 735, 742, 749, 750, 758, 765, 779, 784, 798, 810, 814, 3102, 3134, 3151.
- Not encoded: 751 (uv.lock is the lock of record) · 563 (superseded by 649/749) · 594, 263, 3120 (removed modules / UTF-8 source: nothing to write) · 646, 728, 747, 800 (niche typing) · 655, 705 (TypedDict qualifiers; records are Pydantic models) · 492, 525, 530, 3156 (asyncio basics; practice encoded from asyncio docs) · 3333 (framework-level) · 458, 503, 658, 691, 700, 714, 740, 752, 770, 792, 794, 808, 825 (index/distribution formats) · 683, 684, 697, 709, 741, 757, 768, 782, 788, 793, 803, 820, 831 (CPython internals, C API) · 602, 729, 745, 772, 790, 826, 8016 (release/governance) · 773 (uv manages Python) · 791, 799, 829 (no agent directive).
