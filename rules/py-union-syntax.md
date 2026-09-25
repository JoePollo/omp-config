---
description: "Write X | None and A | B, not Optional/Union (PEP 604, 3.10)"
condition:
  - '(?m)(?:^|[^\w.])(?:typing\.)?(?:Optional|Union)\['
scope: "tool:edit(*.py), tool:write(*.py), tool:edit(*.pyi), tool:write(*.pyi)"
interruptMode: never
---
PEP 604 (3.10+): unions use `|` in annotations, aliases, and `isinstance`.

## Avoid

```python
def load(path: Optional[Path] = None) -> Union[dict, list]: ...
```

## Use

```python
def load(path: Path | None = None) -> dict | list: ...
```

`None` goes last. Exception: `requires-python` < 3.10 in runtime-evaluated positions.
