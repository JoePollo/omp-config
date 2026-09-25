# Python data contracts (Pydantic v2)
Policy: skill://python §Data contracts. Tags → skill://python/sources.md.

## Dependency
- Declare `pydantic>=2.11,<3` (2.11 adds `validate_by_name`, `serialize_by_alias`, full `type`-alias support): `uv add "pydantic>=2.11,<3"`; platform manifests (Astro `requirements.txt`, Databricks job/cluster environment) take the same pin. [PYD, uv, ASTRO]
- Platform versions: Airflow 3 already requires `pydantic>=2.11.0`; Airflow 2.10/2.11 ship it only via the `pydantic` extra; DBR 15.4 LTS ships 1.10.6 and 16.4 LTS–18.0 ship 2.8.2–2.10.6 → pin in the job environment. [AF, DBR]
- v2 API only; never `pydantic.v1` or v1 names (§v1 → v2). [PYD]

## Models
- Owned models (configs, requests, tool args, records): `model_config = ConfigDict(frozen=True, extra="forbid")`. [U, PYD]
- Payloads from services you don't own (third-party API responses, webhooks): `ConfigDict(frozen=True, extra="ignore")` so additive upstream fields don't break parsing. [PYD, OAI]
- ≥2 models sharing one config: one project base model holding `model_config`; else set it on the class. [U]
- Field types concrete: collections `tuple[T, ...]` or `frozenset[T]`, maps `dict[K, V]` (homogeneous); never `list`, `Sequence`, `Iterable`, or `Mapping` fields. [PYD, U]
- Required fields: no default; optional: `x: T | None = None`; computed defaults: `Field(default_factory=…)`. [PYD]
- Constraints: `Annotated[int, Field(ge=1)]`, `Field(min_length=1, pattern=…)`; reuse as named aliases `type Port = Annotated[int, Field(ge=1, le=65535)]` (constraints only; no `default`/`alias` inside aliases). [PYD, P695]
- Closed value sets: `Literal[...]` or `StrEnum`. [PYD, P586]
- Variants: each model has `kind: Literal["…"]`; `type Event = Annotated[Created | Deleted, Field(discriminator="kind")]`; never plain unions of models (smart mode guesses). [PYD]
- Derived values: `@computed_field` on a `@property`; never assign fields in `model_post_init` via `object.__setattr__`. [PYD]
- Secrets: `SecretStr`/`SecretBytes` (masked in `repr` and dumps) plus `hide_input_in_errors=True`; call `.get_secret_value()` only where the raw value is used. [PYD, OAI]
- Wire names: snake_case fields; `alias` or `alias_generator=to_camel` (`pydantic.alias_generators`) with `validate_by_name=True, serialize_by_alias=True`; never `populate_by_name`. [PYD]
- Construct in code with keywords and typed values (`Order(order_id=order_id)`); ty checks them via `dataclass_transform`; untyped data goes through `model_validate*`. [P681, ty, PYD]
- ty gaps (ty#3959): `BeforeValidator`, `Field(frozen=True)` → `@field_validator(..., mode="before")`, model-level `frozen`. [ty]
- Docs: class docstring with `Attributes:`; models whose JSON schema is published (LLM/MCP tools, HTTP APIs) also set `Field(description=…)` per field. [U, PYD, OAI]

## Rules
- Single-field rule: `@field_validator("field")` above `@classmethod` (mode `after`), returning the value; raise `ValueError` naming the offending value; never `assert` (stripped by `-O`). [PYD, G3.10.2]
- Cross-field rule: `@model_validator(mode="after")` instance method `-> Self` returning `self`. [PYD, P673]
- Reshaping legacy input: `mode="before"` validators; no wrap validators (slow). [PYD]
- Rules needing I/O (DB lookups, remote checks): a function called after parsing, never a validator. [OAI]
- Boundary failures: catch `ValidationError` (a `ValueError` subclass), translate with `raise ConfigError(f"invalid {path}") from err`, log `err.errors(include_url=False, include_input=False)`. [PYD, P3134]

## Parsing & emitting
- JSON text/bytes: `Model.model_validate_json(raw)`, never `Model.model_validate(json.loads(raw))`. [PYD]
- Parsed objects (YAML, TOML, Airflow context, SDK dicts): `Model.model_validate(obj)`; attribute objects (ORM rows, SDK objects): `Model.model_validate(obj, from_attributes=True)`. [PYD]
- Top-level collections, unions, scalars: module-level `ORDERS: Final = TypeAdapter(tuple[Order, ...])`, then `ORDERS.validate_json(raw)`; never a `TypeAdapter` per call. [PYD, P591]
- Emit: `model.model_dump(mode="json")` (JSON-safe dict for SDKs/clients) or `model.model_dump_json()`; never hand-built dicts. [PYD]
- Changed copies: `model.model_copy(update=…)` skips validation → only with already-validated values; else `Model.model_validate({**model.model_dump(), **changes})`. [PYD]
- Never `model_construct()` on external or unvalidated data. [PYD]

## Boundaries
- Untyped entry points (CLI handlers, notebook/job entry functions, Airflow task callables, published-library functions): `@validate_call` with model or constrained-alias params. [U, PYD]
- Env settings, ≥2 related variables: `pydantic_settings.BaseSettings` with `model_config = SettingsConfigDict(env_prefix="APP_", frozen=True)` (`extra="forbid"` by default; `uv add "pydantic-settings>=2,<3"`); a missing required variable raises `ValidationError`. [PYD]
- HTTP: send `json=request.model_dump(mode="json")`; parse `Reply.model_validate_json(response.content)`. [PYD]
- OpenAI: `client.responses.parse(..., text_format=Model)`; agents `Agent(output_type=Model)`; tool params `Annotated[T, Field(description=…)]`. [OAI]
- MCP (FastMCP): tools return a `BaseModel`; FastMCP emits `outputSchema` and validated `structuredContent`; never hand-built `structuredContent` dicts. [MCP]
- Airflow: task callables validate `params`/XCom input into models first; push `model.model_dump(mode="json")`. [U, AF]
- Frames: schema-level validation (Databricks KB); tests validate sampled rows through a row model (skill://python/testing.md). [U]

## v1 → v2
| v1 | v2 |
|---|---|
| `parse_obj(d)` / `parse_raw(s)` / `parse_file(p)` | `model_validate(d)` / `model_validate_json(s)` / `model_validate_json(p.read_bytes())` |
| `.dict()` / `.json()` / `.copy()` | `model_dump()` / `model_dump_json()` / `model_copy()` |
| `construct()` / `schema()` / `update_forward_refs()` | `model_construct()` / `model_json_schema()` / `model_rebuild()` |
| `from_orm(o)`, `orm_mode` | `model_validate(o, from_attributes=True)`, `from_attributes` |
| `@validator` / `@root_validator` | `@field_validator` / `@model_validator` |
| `class Config:` | `model_config = ConfigDict(...)` |
| `allow_population_by_field_name` / `allow_mutation=False` / `validate_all` | `validate_by_name=True` / `frozen=True` / `validate_default=True` |
| `parse_obj_as(T, d)` | module-level `TypeAdapter(T)`, then `.validate_python(d)` |
