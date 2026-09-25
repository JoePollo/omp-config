# Python typing
Floors: skill://python §Target. Tags → skill://python/sources.md.

## Modernize (floor ≥ min → modern form)
| legacy | modern | min |
|---|---|---|
| `List` `Dict` `Set` `FrozenSet` `Tuple` `Type` | `list` `dict` `set` `frozenset` `tuple` `type` | 3.9 |
| `typing.Deque` `DefaultDict` `OrderedDict` `Counter` `ChainMap` | `collections.*` | 3.9 |
| `typing.Iterable` `Iterator` `Generator` `Sequence` `Mapping` `Callable` `Awaitable` `AsyncIterator` … | `collections.abc.*` | 3.9 |
| `typing.ContextManager` `AsyncContextManager` | `contextlib.AbstractContextManager` `AbstractAsyncContextManager` | 3.9 |
| `typing.Pattern` `Match` | `re.Pattern` `re.Match` | 3.9 |
| `Optional[X]` `Union[A, B]` | `X \| None` `A \| B` | 3.10 |
| `NoReturn` outside return position | `Never` | 3.11 |
| `TypeVar` + `Generic[T]` | `def f[T](…)` `class C[T]:` `[T: Bound]` `[**P]` | 3.12 |
| `X: TypeAlias = …` | `type X = …` | 3.12 |
| `typing.Hashable` `Sized` | `collections.abc.Hashable` `Sized` | 3.12 |
| `TypeGuard` needing both branches | `TypeIs` | 3.13 |
| `typing.Text`, `# type:` comments | `str`, annotations | — |

[TMG, P585, P604, P613, P647, P695, P742]

## Where to annotate
- Every param and return of public functions, callbacks, decorators; explicit returns even when inferable; locals only when inference fails. [META, G3.19]
- Empty containers: `rows: list[Row] = []` (ty/pyright don't infer from later use). [META]
- Attributes set to `None`/empty/transformed in `__init__`: declare their types in the class body. [META]
- Generics always parameterized: `list[int]`, `tuple[int, ...]`, `Callable[[int], str]`; bare = `Any`. [META, G3.19.15]
- Lambdas: typed `Callable` context or `def`; untyped lambda params are `Any`. [META]

## API design
- Params: widest abstract type used (`Iterable`, `Sequence`, `Mapping`); returns: concrete (`list`, `dict`). [TBP]
- Arbitrary values: `object`, not `Any`; `Any` only at untyped boundaries, validated immediately into a model or `TypeAdapter`. [TBP, PYD]
- Structural contract: `Protocol`; shared implementation or nominal typing: `ABC`. [TBP, P544]
- Structured data (JSON objects, configs, tool args/results, records): Pydantic models (skill://python/pydantic.md); never `TypedDict` records. [U, PYD]
- Variant payloads: Pydantic discriminated unions (`Literal` tag + `Field(discriminator=…)`); narrow on the tag. [META, P586, PYD]
- Return type depends on argument types: `@overload`, not a union return. [META, TBP]
- Fluent methods and alternate constructors return `Self` (3.11). [P673]
- Every override: `@override` (3.12); keep the base parameter names. [P698, META]
- Deprecating: `@warnings.deprecated("use X")` (3.13). [P702]
- `Literal` for finite values; `Final` for single assignment; `@final` to forbid subclassing/overriding. [P586, P591]
- Distinct IDs/units: `NewType`. [P484]
- SQL-accepting APIs: `LiteralString` params; values bound separately. [P675]
- Signature-preserving decorators: `def deco[**P, R](fn: Callable[P, R]) -> Callable[P, R]`. [P612, P695]
- Known `**kwargs`: keyword-only params; `**kwargs: Unpack[Opts]` (`TypedDict`) only to forward kwargs to a library. [P589, P692, U]
- Constrained tool/request fields: `Annotated[T, Field(ge=…, description=…)]`. [P593, OAI]
- Exhaustive `match` on enums/unions: `case _: assert_never(x)` (3.11). [META, P634]
- Narrowed attribute reused across calls: copy it to a local first. [META]

## Annotations at runtime
- Floor ≥ 3.14: no `from __future__ import annotations`; forward references unquoted. [P649, P749, TMG]
- Floor < 3.14: quote forward references or keep the future import, per repo. [TMG, G3.19.3]
- Introspection: `annotationlib.get_annotations` (3.14) / `inspect.get_annotations` (3.10–3.13); never `obj.__annotations__`. [ANNH]

## Packages & stubs
- Typed library: ship `py.typed`; public API type-complete. [P561, TLG]
- A `.pyi` shadows its `.py` for checkers: keep it complete and in sync. [META, P484]
- Untyped third-party import: add its stubs package (`types-…` / `…-stubs`) as a dev dependency. [META]

## ty
- `uvx ty check` or `uv run ty check`; ty uses `VIRTUAL_ENV`, else `.venv` in the project root → `uv sync` first. [ty]
- Config in `[tool.ty]` (or `ty.toml`); set `environment.python-version` when metadata can't imply it; per-rule levels, never blanket. [ty]
- Unresolved import: fix env, layout, or deps first; `analysis.allowed-unresolved-imports` only for genuinely absent modules. [ty, META]
- Plan-approved suppression only: `# ty: ignore[rule]`; shared with other checkers: `# type: ignore[ty:rule]`. [ty]
