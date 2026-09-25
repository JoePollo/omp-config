---
description: "Use the Pydantic v2 API, not v1 names or pydantic.v1"
condition:
  - '\.(?:parse_obj|parse_raw|parse_file|from_orm|update_forward_refs|schema_json)\('
  - '\bparse_obj_as\('
  - '@(?:pydantic\.)?(?:validator|root_validator)\b'
  - '\b(?:from|import)\s+pydantic\.v1\b'
  - '\bfrom pydantic import [^(\n]*\b(?:validator|root_validator|parse_obj_as|Extra)\b'
  - '\bfrom pydantic import \([^)]*\b(?:validator|root_validator|parse_obj_as|Extra)\b'
  - '(?m)^\s+class Config\s*:'
  - '\b(?:orm_mode|allow_population_by_field_name|allow_mutation|validate_all|smart_union)\s*='
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
Pydantic v2 (floor `pydantic>=2.11,<3`): v1 names are deprecated or removed; `pydantic.v1` is legacy.

| v1 | v2 |
|---|---|
| `Model.parse_obj(d)` / `parse_raw(s)` / `parse_file(p)` | `Model.model_validate(d)` / `model_validate_json(s)` / `model_validate_json(p.read_bytes())` |
| `m.dict()` / `m.json()` / `m.copy()` | `m.model_dump()` / `m.model_dump_json()` / `m.model_copy()` |
| `Model.construct()` / `schema()` / `schema_json()` / `update_forward_refs()` | `model_construct()` / `model_json_schema()` / `json.dumps(Model.model_json_schema())` / `model_rebuild()` |
| `Model.from_orm(o)`, `orm_mode = True` | `Model.model_validate(o, from_attributes=True)`, `from_attributes=True` |
| `@validator("x")` / `@root_validator` | `@field_validator("x")` + `@classmethod` / `@model_validator(mode="after")` |
| `class Config:` | `model_config = ConfigDict(...)` |
| `allow_population_by_field_name` / `allow_mutation = False` / `validate_all` / `smart_union` | `validate_by_name=True` / `frozen=True` / `validate_default=True` / default smart unions |
| `parse_obj_as(T, d)` | module-level `TypeAdapter(T)`, then `.validate_python(d)` |

Platform ships 1.x (DBR 15.4 LTS: 1.10.6): pin `pydantic>=2.11,<3` in the job environment; never write v1 code.
