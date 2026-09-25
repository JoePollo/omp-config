---
description: "Use builtin and collections.abc generics, not typing aliases (PEP 585, 3.9)"
condition:
  - '\bfrom typing import [^(\n]*\b(?:List|Dict|Set|FrozenSet|Tuple|Type|Deque|DefaultDict|OrderedDict|Counter|ChainMap|Callable|Iterable|Iterator|Generator|Sequence|MutableSequence|Mapping|MutableMapping|AbstractSet|MutableSet|Collection|Container|Awaitable|Coroutine|AsyncIterable|AsyncIterator|AsyncGenerator|ContextManager|AsyncContextManager|Pattern|Match|Text)\b'
  - '\bfrom typing import \([^)]*\b(?:List|Dict|Set|FrozenSet|Tuple|Type|Deque|DefaultDict|OrderedDict|Counter|ChainMap|Callable|Iterable|Iterator|Generator|Sequence|MutableSequence|Mapping|MutableMapping|AbstractSet|MutableSet|Collection|Container|Awaitable|Coroutine|AsyncIterable|AsyncIterator|AsyncGenerator|ContextManager|AsyncContextManager|Pattern|Match|Text)\b'
  - '\btyping\.(?:List|Dict|Set|FrozenSet|Tuple|Type|Deque|DefaultDict|OrderedDict|Counter|ChainMap|Callable|Iterable|Iterator|Generator|Sequence|MutableSequence|Mapping|MutableMapping|AbstractSet|MutableSet|Collection|Container|Awaitable|Coroutine|AsyncIterable|AsyncIterator|AsyncGenerator|ContextManager|AsyncContextManager|Pattern|Match|Text)\b'
scope: "tool:edit(*.py), tool:write(*.py), tool:edit(*.pyi), tool:write(*.pyi)"
interruptMode: never
---
PEP 585 (3.9+): generics come from builtins and stdlib modules, not `typing`.

| typing | use |
|---|---|
| `List` `Dict` `Set` `FrozenSet` `Tuple` `Type` | `list` `dict` `set` `frozenset` `tuple` `type` |
| `Deque` `DefaultDict` `OrderedDict` `Counter` `ChainMap` | `collections.*` |
| `Callable` `Iterable` `Iterator` `Generator` `Sequence` `Mapping` `Awaitable` `AsyncIterator` … | `collections.abc.*` |
| `ContextManager` `AsyncContextManager` | `contextlib.AbstractContextManager` `contextlib.AbstractAsyncContextManager` |
| `Pattern` `Match` | `re.Pattern` `re.Match` |
| `Text` | `str` |

Keep from `typing`: `Any`, `Protocol`, `TypedDict`, `Literal`, `Final`, `ClassVar`, `Self`, `Never`, `overload`, `override`, `cast`, `TYPE_CHECKING`.
Exception: `requires-python` < 3.9.
