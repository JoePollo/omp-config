---
name: python
description: Python domain knowledge base (PEPs, Google style, Astral/OpenAI tooling, Meta typing practice). Routed by rule://domain-router.
hide: true
---
# Python KB
Defaults only: explicit instructions, AGENTS.md, repo config/conventions win. Read every topic whose trigger matches. Tags → skill://python/sources.md.

## Topics
| trigger | read |
|---|---|
| annotations, generics, Protocol, TypedDict, overloads, `*.pyi`, `py.typed`, ty errors | skill://python/typing.md |
| records, `BaseModel`, `pydantic`, validation rules, runtime validation, configs, JSON/YAML/TOML/env payloads, API/LLM/MCP tool I/O | skill://python/pydantic.md |
| `pyproject.toml` `uv.lock` `requirements*.txt` `.python-version`; deps, scripts, builds, new project | skill://python/packaging.md |
| `test_*.py` `*_test.py` `conftest.py` `tests/`; writing or fixing tests | skill://python/testing.md |
| `async`/`await`, threads, processes, executors, free-threading | skill://python/concurrency.md |
| subprocess, SQL, HTTP clients, secrets/auth, deserialization, archives, XML, temp files, LLM/MCP I/O | skill://python/security.md |

## Target
- Floor = `requires-python` lower bound → else `.python-version` → else deploy runtime; never use syntax/stdlib above it. [PyPA, uv]
- 3.10: `match`, `X | Y`, `zip(strict=True)`, `ParamSpec`, `@dataclass(slots=True)`
- 3.11: `Self`, `except*`, `add_note`, `TaskGroup`, `asyncio.timeout`, `tomllib`, `StrEnum`, `datetime.UTC`, `assert_never`
- 3.12: `def f[T]`, `class C[T]`, `type X = …`, `@override`, nested f-string quotes
- 3.13: `@warnings.deprecated`, `TypeIs`, TypeVar defaults, `ReadOnly`
- 3.14: deferred annotations, t-strings, `except A, B:`, `compression.zstd`, `concurrent.interpreters`
- 3.15: `lazy import`, `frozendict`, `sentinel()`, `[*xs for xs in xss]`, UTF-8 mode default
- New project floor = lowest Python across deploy targets; none → newest stable CPython. [PyPA, OAI]
- Keep `requires-python`, `.python-version`, ruff `target-version`, ty `python-version`, CI matrix aligned. [OAI]

## Workflow
- Run via `uv run …`; checks in order: `uvx ruff format .`, `uvx ruff check .`, `uvx ty check`, `uv run pytest`. [uv, U]
- Type-check after each edit batch, not only at the end; fix errors in code you touched, not unrelated legacy. [META]
- Formatter owns layout (line length, quotes, wrapping, import order); never hand-format or reformat untouched code. [ruff, P8]
- Never add suppressions (`noqa`, `ruff: ignore`, `ty: ignore`, `type: ignore`) or loosen tool config to pass checks unless the plan says so; then rule-scoped with a reason. [ruff, ty, META, U]
- Smallest change meeting the requirement; no speculative params, branches, or abstractions. [OAI]
- Internal APIs: migrate every caller in one cutover; published library APIs: `@warnings.deprecated` first, remove later. [U, P387, P702]

## Names & structure
- `lower_with_under` modules/functions/variables; `CapWords` classes and type aliases; `UPPER_CASE` constants; `_name` internal; no `__mangled`. [P8, G3.16]
- Descriptive names; no type-redundant (`user_dict`) or ambiguous abbreviations. [G3.16]
- One job per function; split past ~40 lines. [G3.18]
- Scripts: logic in `main()`; `if __name__ == "__main__": main()`. [G3.17]
- No mutable module-level state; module constants typed `Final`. [G2.5, P591]
- Package `__init__` re-exports listed in `__all__`. [P8]
- No power features: metaclasses, import hooks, `__getattr__` tricks, reflection hacks. [G2.19]

## Imports
- Absolute imports; `from pkg.mod import Name` allowed; never `import *`. [P8, G2.3]
- Import submodules explicitly (`import a.b`); never modify `sys.path`. [META]
- No import-time side effects (registration, monkey-patching, I/O); expose `init()`/`main()`. [P810, META, OAI]
- Optional deps: eager `try: import x` / `except ImportError:` probe; a missing extra never breaks the package import. [OAI, P810]
- Typing-only imports under `if TYPE_CHECKING:`; never used at runtime. [TBP, OAI]
- 3.15+: `lazy import x` / `lazy from x import y` at module level for startup-heavy code (CLIs); libraries never enable global lazy mode. [P810, META]

## Functions & classes
- Option-like params keyword-only (`*`); positional-only (`/`) when names aren't contract. [P3102, P570]
- New optional params go last; call sites pass options by keyword. [OAI]
- No mutable/computed defaults: functions take `None` then build; model fields use `Field(default_factory=…)`. [G2.12, PYD]
- Mutable class attributes: `ClassVar[...]`. [OAI]
- Plain attributes over trivial getters/setters; properties cheap and side-effect free. [P8, G2.13, G3.15]
- Alternate constructors: `@classmethod`; no `@staticmethod` (module function instead). [G2.17]
- Nested `def` only to close over locals. [G2.6]
- `def`, never `name = lambda`; lambdas one line. [P8, G2.10]
- `Enum`/`StrEnum` for symbolic constants; `IntEnum` only for int semantics. [P435]
- Consistent returns: every path `return value` (explicit `return None`) or none. [P8]
- Rich comparisons: all six or `functools.total_ordering`. [P8]

## Data contracts
- Record-shaped data (fixed fields, per-field types) is a Pydantic v2 `BaseModel`: parameters, returns, attributes, configs, payloads, results, private helpers included; never `dict`, `TypedDict`, `NamedTuple`, or dataclass records. [U, PYD]
- `dict` only for homogeneous dynamic-key maps (`dict[str, int]`, `dict[OrderId, Order]`); never `dict[str, Any]`, `dict[str, object]`, nested dicts, `list[dict]`, or bare `dict` annotations. [U]
- Raw payloads before validation (library returns, parsing-test inputs): `pydantic.JsonValue`, never `Any`. [PYD]
- Public functions returning several data fields return a model; iteration pairs (`items()`, `zip`, `enumerate`) and a private helper's pair to its one caller stay tuples. [U]
- Rules live in the model (`Field` constraints, validators), not in scattered `if … raise` or `isinstance` checks. [U, PYD]
- Runtime validation wherever values arrive untyped: parse I/O into models or a `TypeAdapter`; `@validate_call` on CLI, notebook, job, Airflow-task, and published-library entry points; typed internal calls rely on ty. [U, PYD]
- Library-imposed dicts (Airflow context/XCom, SDK/MCP payloads, `yaml`/`tomllib` loads): validate into a model on entry; emit `model.model_dump(mode="json")`. [U, PYD]
- Frames (Spark/pandas/Arrow): schema-level validation; models for parameters, configs, control records, and sampled rows in tests; no per-row model loops. [U]
- `@dataclass(frozen=True, slots=True)` only for a private hot-path struct after profiling shows model construction cost. [U, P557]
- Conventions, rules, parsing, boundaries: skill://python/pydantic.md.

## Idioms
- `is None` / `is not None`; never `== None` or `not x is None`. [P8]
- Truthiness for empty containers; explicit `is None` when `None` differs from empty/0. [P8, G2.14, META]
- Never compare bools with `==`/`is`. [P8]
- `isinstance(x, T)`; never `type(x) ==` or `x is Cls`. [P8, META]
- `startswith`/`endswith`/`removeprefix`/`removesuffix`, not slicing. [P8, P616]
- Iterate directly (`for k in d`, `for line in f`); never mutate a container while iterating it. [G2.8]
- Comprehensions: ≤1 `for` + ≤1 `if`, else a loop; generators for streams. [G2.7, G2.9]
- `enumerate`, `zip(strict=True)`, unpacking over index arithmetic. [P618]
- f-strings for formatting; `"".join(parts)` for accumulation; never build strings with `+`. [P498, P8, G3.10]
- t-strings (3.14) when a processor must see interpolations (SQL/HTML builders). [P750]
- `pathlib.Path` for paths; accept `os.PathLike`; `os.fspath()` only at str-only APIs. [P428, P519]
- `with` for files, sockets, locks, connections, clients, executors; `contextlib.closing` for close-only objects. [P343, P8, G3.11, OAI]
- Context managers that do more than acquire/release get a named method (`with conn.begin():`). [P8]
- Walrus only to reuse a computed value. [P572]
- `match` for structural dispatch; `case _:` last; never read captures after a failed case. [P634, P636]
- `None` is a valid value → distinct sentinel (`sentinel("MISSING")` 3.15; else module-level `object()`). [P661]
- Stream large data (iterators, `fetchmany`, chunked reads); no arbitrary size caps. [OAI, P249]

## Errors
- Catch specific exceptions; no bare `except:`; `except Exception` only at boundaries that log the traceback or re-raise; errors never pass silently. [P8, P20, G2.4]
- Minimal `try` body; success path in `else:`. [P8]
- Translate with `raise AppError(...) from err`; `from None` only to hide irrelevant context, copying needed details into the message. [P3134, P415, P8]
- Re-raise with bare `raise`, never `raise err`. [OAI]
- Add context without changing type: `err.add_note(...)` (3.11); no structured data in notes. [P678]
- Hierarchy by what callers must distinguish; derive from `Exception`; suffix `Error`. [P8, G2.4]
- Validate data through models (§Data contracts); explicit `raise` for other preconditions; `assert` only in tests and internal invariants. [G2.4, PYD, U]
- OS errors: `FileNotFoundError`, `PermissionError`, …; never `errno` checks. [P8, P3151]
- `ExceptionGroup` (TaskGroup failures): `except*`. [P654]
- No `return`/`break`/`continue` exiting `finally`. [P8, P765]
- `except A, B:` (3.14) only without `as`. [P758]
- Messages precise, name the offending value, greppable. [G3.10.2]
- Failure after acquiring resources: release them, keep the primary exception. [OAI]

## Logging
- Libraries: `logger = logging.getLogger(__name__)`; no handlers (optional `NullHandler`); never configure root. [LOGH]
- Applications: configure once at the entry point (`logging.config.dictConfig`). [LOGH]
- Lazy args: `logger.info("Loaded %d rows from %s", n, table)`; no f-strings, `%`, or `.format` in the call. [LOGH, G3.10.1, OAI]
- `logger.exception(...)` inside `except` for tracebacks. [LOGH]
- `print` only for intended CLI output. [LOGH, OAI]
- Context via `extra=`/`LoggerAdapter`; machine-read events as structured fields. [LOGH]
- Never log secrets, tokens, connection strings, auth headers, or customer data. [OAI]

## Time & text
- Aware datetimes only: `datetime.now(UTC)`, `datetime.fromtimestamp(ts, tz=UTC)`; never `utcnow()` or naive `now()`. [SD:datetime, OAI]
- Civil time: `ZoneInfo("America/Chicago")`; store and compare in UTC. [SD:zoneinfo, P615]
- Text I/O: `encoding="utf-8"` on `open`/`read_text`/`write_text` (locale default until 3.15). [P597, P686]

## Docstrings [U, G3.8, P257]
- Every module, class, function, and method, private included: triple-double-quoted docstring.
- Module: one line stating its responsibility.
- Function summary: one sentence, descriptive verb, period (`"""Loads the connections config; returns ConnectionsConfig."""`); then a behavior paragraph when non-obvious.
- Sections in order: `Args:` `name (type): meaning` · `Returns:`/`Yields:` `Type: meaning` · `Raises:` `ErrorType: condition` · `Example:` runnable usage lines.
- `Example:` on public callables; on private ones when the output shape isn't obvious.
- Classes: summary + `Attributes:` for public fields.
- Protocol members and trivial `@override`s: one line; overrides document only contract changes. [G3.8.3.1]
- Tests: module docstring; test functions rely on descriptive names (skill://python/testing.md).
- LLM/MCP tool and CLI docstrings are schema/help: complete `Args:`. [OAI]
- Inline comments only when unavoidable; why, never what. [U, G3.8.5]
