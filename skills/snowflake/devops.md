# CLI, connections, and change management

Tags → skill://snowflake/sources.md. Auth objects (users, keys, PATs, policies) → skill://snowflake/access.md; HCL → skill://terraform.

## Snowflake CLI

- New scripts use `snow`, never `snowsql` (legacy, feature-frozen; 1.5.x supported to 2028-04-16); port with `snow helpers import-snowsql-connections`. [UG:snowsql, UG:snowsql-migrate]
- Install with `uv tool install snowflake-cli` (Python 3.10+); pin the version in CI. OIDC needs CLI 3.11+, `snow dcm` 3.24.0+. [CLI:installation/installation, CLI:cicd/github-action, CLI:data-pipelines/dcm-projects]
- Config lookup: `--config-file` > `$SNOWFLAKE_HOME` > `~/.snowflake/` (if present) > OS default (Windows `%USERPROFILE%\AppData\Local\snowflake\`). A `connections.toml` there (sections `[name]`) replaces `config.toml` connections; `default_connection_name` stays in `config.toml`. [CLI:connecting/configure-cli, CLI:connecting/configure-connections]
- Value precedence: flags > `SNOWFLAKE_CONNECTIONS_<NAME>_<KEY>` > toml > generic `SNOWFLAKE_<KEY>`. Commit only credential-free toml; `0600` on Linux/macOS. [CLI:connecting/configure-connections, CLI:cicd/integrate-ci-cd]
- `-x`/`--temporary-connection` ignores toml and uses flags plus `SNOWFLAKE_*` env vars. Smoke-check with `snow connection test -c <name>`. [CLI:connecting/configure-connections]
- Windows: set `PYTHONUTF8=1` or `[cli.encoding]` `file_io`/`subprocess`/`stdout = "utf-8"`; PowerShell 5.x `Out-File utf8` writes a BOM the CLI won't strip. [CLI:connecting/configure-cli]

## Running SQL

- `snow sql -f a.sql -f b.sql` runs files in order on one connection; add `--single-transaction` for all-or-nothing and `--enhanced-exit-codes` (2 = bad options, 5 = query error). [CLI:sql/execute-sql, CLI:command-reference/sql-commands/sql]
- Variables: `<% name %>` + `-D "name=value"`, or `<% ctx.env.name %>` from `env:` in `snowflake.yml` (`definition_version: 2`; same-name shell var overrides). SnowSQL `&name` also resolves by default: pass `--enable-templating STANDARD`. [CLI:sql/execute-sql, CLI:project-definitions/use-sql-variables, CLI:project-definitions/about]
- Put `$$` Scripting blocks in files, not `-q` (shells expand `$$`). [CLI:sql/execute-sql]

## Identifiers and drivers

- `account = "<orgname>-<accountname>"`; no locators, no `.snowflakecomputing.com` suffix; account/user/role/warehouse/database from per-env config. [UG:admin-account-identifier, DEV:python-connector/python-connector-connect, U]
- Python: `snowflake.connector.connect(connection_name=...)`. Unattended auth: `authenticator="WORKLOAD_IDENTITY"` + `workload_identity_provider="AWS"` for AWS IAM runtimes, `"AZURE"` for Azure managed identities, or `"OIDC"` + `token`; connector 3.17.0+; else `SNOWFLAKE_JWT` + `private_key_file`, or `PROGRAMMATIC_ACCESS_TOKEN`. [DEV:python-connector/python-connector-connect, UG:workload-identity-federation]
- Tag work: `session_parameters={"QUERY_TAG": ...}` (≤2000 chars) → `ACCOUNT_USAGE.QUERY_HISTORY.query_tag`. [DEV:python-connector/python-connector-connect, SQL:parameters, SQL:account-usage/query_history]
- Bind values, never f-strings/`format()`: default `pyformat` (`%s`, client-side); `paramstyle="qmark"` binds server-side and speeds `executemany`, but can't bind IN lists. [DEV:python-connector/python-connector-example]
- Stay on connector 4.x: 5.x (Universal Core) is a Preview RC; Snowpark, CLI, `snowflake-ml-python` require <5. [DEV:python-connector/python-connector-universal-core]
- SQLAlchemy: `snowflake.sqlalchemy.URL()` lacks key-pair fields, use `connect_args={"private_key": ...}`; `connection.close()` before `engine.dispose()`. New packages need approval, then `uv add`. [DEV:python-connector/sqlalchemy, U]

## Git and EXECUTE IMMEDIATE FROM

- `CREATE API INTEGRATION ... API_PROVIDER = git_https_api API_ALLOWED_PREFIXES = (...)` (OAuth2, `SNOWFLAKE_GITHUB_APP`, or `ALLOWED_AUTHENTICATION_SECRETS` with a `TYPE = password` secret), then `CREATE GIT REPOSITORY ... ORIGIN = 'https://...'`; Azure DevOps supported. [DEV:git/git-setting-up-public, DEV:git/git-overview]
- `ALTER GIT REPOSITORY <r> FETCH` before use; paths `@r/branches/<b>/`, `@r/tags/<t>/`, `@r/commits/<sha>/`. Only Workspaces (GA 2025-09-11), Streamlit, Notebooks write back; no submodules; ≤2 GB. [DEV:git/git-operations, DEV:git/git-limitations, REL:2025/other/2025-09-11-workspaces-ga]
- `snow git execute @r/branches/main/dir/ -D "env='dev'"` runs matching `.sql`/`.py` (path ends `/`; `.py` gets `-D` keys upper-cased in `os.environ`). [CLI:command-reference/git-commands/execute]
- `EXECUTE IMMEDIATE FROM @stage/f.sql USING (env => 'dev')` renders Jinja2 (or `--!jinja` header); `DRY_RUN = TRUE` returns rendered SQL (`USING`, `DRY_RUN` Preview). File ≤10 MB, UTF-8, uncompressed; nesting ≤5; not atomic. [SQL:sql/execute-immediate-from]

## Change management

- DCM Projects (GA 2026-08-07) own in-database objects: `manifest.yml` targets + `DEFINE` SQL, plan then deploy. Terraform `snowflakedb/snowflake` owns account objects (only latest ≥2.0.0 supported). One tool per object. [UG:dcm-projects/dcm-projects-overview, DEV:builders/devops-with-snowflake, UG:terraform, REL:2026/other/2026-08-07-dcm-projects-ga]
- DCM Preview: `snow dcm test`/`preview`, `DEFINE MASKING POLICY`/`ROW ACCESS POLICY`/`STREAMLIT`/`CODE BUNDLE`, `ATTACH TAG`. Caps: 10,000 entities, 10 MB; template vars aren't redacted. [REL:2026/other/2026-08-07-dcm-projects-ga, REL:2026/other/2026-09-24-dcm-projects-capability-updates, UG:dcm-projects/dcm-projects-overview]
- `snow dcm purge` drops every managed object; `snow dcm drop` leaves them unmanaged: never run either unasked. [CLI:data-pipelines/dcm-projects, U]
- Standalone scripts: `CREATE OR ALTER` (GA 2026-07-14) keeps data, grants, tags but unsets omitted properties (FUNCTION too after BCR 2026_04): state every non-default property. [SQL:sql/create-or-alter, REL:2026/other/2026-07-14-create-or-alter-ga, REL:bcr-bundles/2026_04/bcr-2264]
- CREATE OR ALTER can't rename (drop+add loses data), run CTAS, or cast incompatibly; suspend tasks first. [SQL:sql/create-or-alter]
- dev/tst/prd each get own target, service user, and database or account; test data via `CREATE DATABASE <tst> CLONE <src>` (→ skill://snowflake/tables.md). [DEV:builders/devops-with-snowflake, SQL:sql/create-clone, U]

## CI/CD

- PR runs `snow dcm plan --target <env>`; merge runs `snow dcm deploy` or `snow sql -f`; then verify. [CLI:cicd/integrate-ci-cd]
- Azure DevOps: `ConfigureSnowflakeCLI@1` (Preview), `useWorkloadIdentity: true`, `connectedServiceName: <ARM connection>`; user `WORKLOAD_IDENTITY = (TYPE = OIDC ISSUER = 'https://vstoken.dev.azure.com/<tenant>' SUBJECT = 'sc://<org>/<project>/<conn>' OIDC_AUDIENCE_LIST = ('api://AzureADTokenExchange'))`; map `SNOWFLAKE_TOKEN: $(SNOWFLAKE_TOKEN)` in each later step. [CLI:cicd/azure-devops-extension]
- GitHub: `snowflakedb/snowflake-actions@v3` (GA), `use-oidc: true`, `permissions: id-token: write`. [CLI:cicd/github-action]
- No OIDC: `SNOWFLAKE_PRIVATE_KEY_RAW` secret + `SNOWFLAKE_AUTHENTICATOR=SNOWFLAKE_JWT`; passwords are legacy. [CLI:cicd/integrate-ci-cd, CLI:cicd/azure-devops-extension]
- Openflow gen 2 connectors deploy as code too: config in a Git repository stage, versioned promotion with `COMMIT` (skill://snowflake/streaming.md §Openflow). [UG:data-integration/openflow/gen2/connector-versioning]
