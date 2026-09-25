---
description: "Use PEP 695 type parameters and type statements (3.12+)"
condition:
  - '\bTypeVar\('
  - '\bTypeAlias\b'
  - '\bGeneric\['
  - '\bParamSpec\('
scope: "tool:edit(*.py), tool:write(*.py), tool:edit(*.pyi), tool:write(*.pyi)"
interruptMode: never
---
PEP 695 (3.12+): declare type parameters inline; `type` for aliases.

| legacy | 3.12+ |
|---|---|
| `T = TypeVar("T")` + `def first(xs: list[T]) -> T` | `def first[T](xs: list[T]) -> T` |
| `class Box(Generic[T])` | `class Box[T]:` |
| `TypeVar("T", bound=Base)` | `def f[T: Base](x: T) -> T` |
| `P = ParamSpec("P")` | `def deco[**P, R](fn: Callable[P, R]) -> Callable[P, R]` |
| `Rows: TypeAlias = list[Row]` | `type Rows = list[Row]` |

Defaults (3.13, PEP 696): `class Page[T = dict]:`. Variance is inferred; never declare it.
Exception: `requires-python` < 3.12, or a library that documents `Generic[T]` as required.
