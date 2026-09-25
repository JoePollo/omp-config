---
description: "Model record-shaped data with Pydantic, not dicts, TypedDict, or NamedTuple"
condition:
  - '\b(?:dict|Dict|Mapping|MutableMapping)\[\s*(?:str|Any)\s*,\s*(?:typing\.)?(?:Any|object)\s*\]'
  - '\b(?:dict|Dict|Mapping|MutableMapping)\[[^\]]*\b(?:dict|Dict|Mapping|MutableMapping)\['
  - '\b(?:list|List|tuple|Tuple|set|frozenset|Sequence|Iterable|Iterator|Generator|AsyncIterator)\[\s*(?:dict|Dict|Mapping|MutableMapping)\b'
  - '(?m)->\s*(?:dict|Dict|Mapping|MutableMapping)\s*(?=[:|,\]]|$)'
  - '(?m)\b\w+\s*:\s*(?:dict|Dict|Mapping|MutableMapping)\s*(?=[,)=|\]]|$)'
  - '\bclass\s+\w+\s*\((?:[^()]*,\s*)?(?:typing(?:_extensions)?\.)?TypedDict\b'
  - '\bTypedDict\(\s*["'']'
  - '\b(?:NamedTuple\b|namedtuple\()'
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
Record-shaped data (fixed fields, per-field types) is a Pydantic `BaseModel` (skill://python §Data contracts).

## Avoid

```python
def load_orders(raw: str) -> list[dict[str, Any]]:
    return json.loads(raw)
```

## Use

```python
class Order(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    order_id: int
    total: Decimal


ORDERS: Final = TypeAdapter(tuple[Order, ...])


def load_orders(raw: str) -> tuple[Order, ...]:
    return ORDERS.validate_json(raw)
```

- `dict` stays for homogeneous dynamic-key maps: `dict[str, int]`, `dict[OrderId, Order]`.
- Raw payloads before validation: `pydantic.JsonValue`, not `Any`.
- Library-imposed dicts (Airflow context, SDK/MCP payloads): validate into a model on entry; emit `model.model_dump(mode="json")`.
- `TypedDict` only for `**kwargs: Unpack[...]` forwarding to a library.
- Details: skill://python/pydantic.md.
