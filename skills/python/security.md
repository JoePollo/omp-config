# Python security
Tags → skill://python/sources.md.

## Injection
- Subprocess: `subprocess.run([exe, *args], check=True, timeout=…)`; resolve executables with `shutil.which()`; `shell=True`, `os.system`, `os.popen` only for trusted constant strings. [SD:subprocess]
- SQL values: driver parameters only — `cursor.execute(sql, params)`, `executemany`; marker per `module.paramstyle` (pyodbc `?`); never f-string, `%`, or `+` values into SQL. [P249]
- SQL identifiers (table, column, sort order): choose from an allowlist defined in code; never raw input. [OWASP]
- Your own SQL-accepting APIs: `LiteralString` params. [P675]
- No `eval`/`exec` on external input; parse explicitly (`json`, Pydantic, `int()`). [ruff]
- LLM output, tool/MCP responses, remote content: untrusted data; validate before acting; never execute. [OAI]

## Data handling
- Never `pickle`/`marshal`/`shelve`/`dill` untrusted data; `yaml.safe_load`; JSON for interchange. [SD:pickle]
- Tar: `extractall(path, filter="data")` (3.12; default from 3.14). [P706, SD:tarfile]
- Untrusted XML: `defusedxml`. [SD:xml]
- Temp files: `tempfile.TemporaryDirectory()` / `NamedTemporaryFile()` in `with`; never `mktemp()`. [SD:tempfile]
- Tokens and nonces: `secrets` (`token_urlsafe`), never `random`. [SD:secrets, P506]
- Validate external input at the boundary into Pydantic models (constraints + validators), then trust types inside; I/O-dependent business checks run after parsing; schema-valid ≠ business-valid. [OAI, PYD]

## Secrets & auth
- Secrets from env vars, Key Vault, or managed identity; never hardcode or commit `.env`. Azure: `DefaultAzureCredential` (`azure.identity.aio` in async). [OAI]
- Single setting: required `os.environ["X"]`, optional `os.environ.get("X")`; ≥2 related settings: a `BaseSettings` model (skill://python/pydantic.md). [OAI, PYD]
- Models holding secrets: `SecretStr` fields plus `hide_input_in_errors=True` so `ValidationError` text omits raw input. [PYD]
- Redact auth headers, tokens, connection strings, customer data from logs, exceptions, snapshots, test output; `raise … from None` is not redaction. [OAI]

## HTTP
- Explicit timeout on every client and call (`requests` has none by default); split connect/read (`timeout=(3.05, 30)`). [OAI, ruff]
- Retry only connection errors and 408/409/429/5xx on replay-safe requests; exponential backoff + jitter + max delay + attempt cap; one retry layer (SDK `max_retries=0` when adding your own). [OAI]
- Never auto-retry a partially consumed stream. [OAI]
- Credential-bearing clients: one origin, `follow_redirects=False`, TLS verification on. [OAI]
- Close clients (`with`/`async with`); rebuild after credential rotation. [OAI]
- Log provider request IDs on failure. [OAI]
