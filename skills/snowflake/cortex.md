# Cortex AI

Tags → skill://snowflake/sources.md. Custom-model serving → skill://snowflake/ml-models.md.

## AI functions

- New code uses `AI_*`; `SNOWFLAKE.CORTEX.*` LLM functions are backward-compat only and "will be deprecated by the end of 2026". [SQL:functions/complete-snowflake-cortex, CX:aisql-programmatic-use]

| Avoid `SNOWFLAKE.CORTEX.` | Use |
|---|---|
| `COMPLETE`, `TRY_COMPLETE` | `AI_COMPLETE` |
| `CLASSIFY_TEXT`, `EXTRACT_ANSWER` | `AI_CLASSIFY`, `AI_EXTRACT` |
| `SENTIMENT`, `ENTITY_SENTIMENT` | `AI_SENTIMENT` |
| `EMBED_TEXT_768`, `EMBED_TEXT_1024` | `AI_EMBED` |
| `TRANSLATE`, `SUMMARIZE_AGG`, `COUNT_TOKENS`, `PARSE_DOCUMENT` | `AI_` + same name |
| Python `snowflake.cortex.complete` | `snowflake.snowpark.functions.ai_complete` |

- `AI_COMPLETE(model, prompt [, model_parameters, response_format, show_details])`; defaults `temperature` 0, `max_tokens` 4096, `guardrails` FALSE; `show_details => TRUE` adds `usage`. [SQL:functions/ai_complete-single-string]
- Structured output: `response_format => TYPE OBJECT(...)` or a JSON schema object; OpenAI models need `additionalProperties: false` and full `required` per node. [SQL:functions/ai_complete-structured-outputs]
- Files: `PROMPT('… {0}', TO_FILE('@stage', 'path'))` from a named server-side-encrypted stage; user/table stages fail. [CX:ai-complete-document-intelligence, SQL:functions/ai_embed]
- Failed rows return NULL (2026_02 bundle, generally enabled); final arg `return_error_details` TRUE yields `{value, error}`; not AI_AGG, AI_SUMMARIZE_AGG, AI_EMBED. [REL:bcr-bundles/2026_02/bcr-2184, REL:bcr-bundles/2026_02_bundle]
- Routine tasks → task functions, open-ended → AI_COMPLETE: `AI_CLASSIFY(input, labels [, {'output_mode': 'multi'}])` (best ≤20 labels), `AI_FILTER(PROMPT(...))` in WHERE or JOIN ON, `AI_SENTIMENT`, `AI_TRANSLATE`, `AI_REDACT`, cross-row `AI_AGG`/`AI_SUMMARIZE_AGG` with GROUP BY; `AI_SUMMARIZE` is Preview. [CX:aisql, SQL:functions/ai_classify, SQL:functions/ai_filter, SQL:functions/ai_agg, REL:2026/other/2026-09-14-ai-summarize-multimodal-preview]
- Reusable prompts: `CREATE AI FUNCTION f(x VARCHAR) RETURNS VARCHAR AS $$ <AI_COMPLETE expr> $$`; `FROM EXPERIMENT e RUN r` promotes an optimization winner (Preview). [SQL:sql/create-ai-function, REL:2026/other/2026-09-21-ai-function-optimization-preview]

## Documents

- `AI_EXTRACT(file => TO_FILE(...), responseFormat => {...})` extracts entities, lists, tables (≤125 pages, 100 MB, 100 questions, table question = 10; 970 tokens/page) and replaces Document AI, decommissioned 2026-03-16. [SQL:functions/ai_extract, REL:bcr-bundles/un-bundled/bcr-2156]
- `AI_PARSE_DOCUMENT(file, {'mode': 'LAYOUT', 'page_split': TRUE})` returns Markdown for chunking; ≤2,000 pages, billed per page. [CX:parse-document]

## Models, access, cost

- Keep model names in config; check `SHOW CORTEX BASE MODELS IN SCHEMA SNOWFLAKE.MODELS` for `lifecycle_status`, `legacy_date`, `eol_date`. [SQL:sql/show-cortex-base-models, U]
- `CORTEX_ENABLED_CROSS_REGION` (ACCOUNTADMIN; agents only read it): `ANY_REGION`, `AZURE_US`, `AZURE_EU`, `AWS_*`, `DISABLED`; billed in home region. Azure scopes lack Claude: Claude needs `ANY_REGION`. [CX:cross-region-inference, CX:cortex-agents, U]
- Calls need `USE AI FUNCTIONS` (or `USE AI FUNCTION <name>`) plus `SNOWFLAKE.CORTEX_USER` or `AI_FUNCTIONS_USER`; scoped: `CORTEX_EMBED_USER`, `CORTEX_AGENT_USER`, `CORTEX_ANALYST_USER`. [CX:aisql-privileges-and-access, CX:cortex-agents, CX:cortex-analyst]
- Model access is RBAC-only (`CORTEX_MODELS_ALLOWLIST` accepts only `'None'` since 2026-08-05): grant `SNOWFLAKE."CORTEX-MODEL-ROLE-<MODEL>"` to execution roles, not only PUBLIC; drop default all-models via `SNOWFLAKE.LOCAL.REVOKE_FROM_PUBLIC_APPLICATION_ROLE('APP_ROLE', 'CORTEX-MODEL-ROLE-ALL')`. [REL:bcr-bundles/un-bundled/bcr-2378, CX:aisql-privileges-and-access]
- Bills tokens (in+out; AI_EMBED in only) or pages (AI_PARSE_DOCUMENT); task functions add hidden prompt tokens; warehouse ≤ MEDIUM; interactive latency → REST API. [CX:aisql-cost, CX:aisql]
- Size prompts on samples with `AI_COUNT_TOKENS` and `QUERY_TAG`; runaway guard: task over `CORTEX_AI_FUNCTIONS_USAGE_HISTORY` (hourly, ≤5 min lag) summing `CREDITS` per `QUERY_ID` where `BOOLOR_AGG(IS_COMPLETED) = FALSE` → `SYSTEM$CANCEL_QUERY`. [SQL:functions/ai_count_tokens, SQL:account-usage/cortex_ai_functions_usage_history, CX:ai-func-cost-management]
- Cortex Guard (`'guardrails': TRUE`) filters harmful output; Cortex AI Guardrails (Enterprise+, `AI_SETTINGS`) block prompt injection in Agents, CoWork, CoCo. [SQL:functions/ai_complete-single-string, CX:cortex-ai-guardrails]

## Cortex Search

- `CREATE CORTEX SEARCH SERVICE s ON chunk ATTRIBUTES cols WAREHOUSE = wh TARGET_LAG = '1 hour' EMBEDDING_MODEL = '…' AS <query>`: model is immutable (default `snowflake-arctic-embed-m-v1.5`); source needs incremental refresh and change tracking. [SQL:sql/create-cortex-search, CX:cortex-search/cortex-search-overview]
- Chunk ≤512 tokens via `SNOWFLAKE.CORTEX.SPLIT_TEXT_RECURSIVE_CHARACTER(text, 'markdown', chunk_size, overlap)` (sizes in characters). [CX:cortex-search/cortex-search-overview, SQL:functions/split_text_recursive_character-snowflake-cortex]
- Set a TEXT `PRIMARY KEY` for changed-rows refresh; MERGE sources (CREATE OR REPLACE re-embeds all). [CX:cortex-search/cortex-search-overview, CX:cortex-search/cortex-search-costs]
- Query via Python `.search(query, columns, filter, limit)` or `/api/v2/databases/{db}/schemas/{sch}/cortex-search-services/{svc}:query` (limit default 10, max 1000; filters `@eq @contains @gte @lte @and @or @not`); `SEARCH_PREVIEW` is test-only; retry 429s. [CX:cortex-search/query-cortex-search-service, CX:cortex-search/cortex-search-overview]
- Owner's rights: USAGE grantees see every indexed row despite source row access or masking policies. [CX:cortex-search/query-cortex-search-service]
- RAG: Search top-k chunks into an `AI_COMPLETE` prompt; ≥2,000 offline queries → `LATERAL CORTEX_SEARCH_BATCH(...)`. [CX:cortex-search/cortex-search-overview, CX:cortex-search/batch-cortex-search]
- Serving bills per GB-month while resumed: set `AUTO_SUSPEND` (≥1800 s) on dev/idle services. [CX:cortex-search/cortex-search-overview, CX:cortex-search/cortex-search-costs]

## Vectors

- `VECTOR(FLOAT|INT, n)` (n ≤ 4096); compare via `VECTOR_COSINE_SIMILARITY`, `VECTOR_INNER_PRODUCT`, `VECTOR_L2_DISTANCE`; unsupported in VARIANT, clustering keys, Iceberg, Snowpipe; load as ARRAY, cast. [SQL:data-types-vector]
- Dims: 768 = `snowflake-arctic-embed-m-v1.5`, `e5-base-v2`; 1024 = `snowflake-arctic-embed-l-v2.0`, `voyage-multilingual-2`. [SQL:functions/ai_embed, CX:vector-embeddings]

## Analyst, Agents, MCP

- Semantic layer = `CREATE SEMANTIC VIEW` (`AI_SQL_GENERATION`, `AI_VERIFIED_QUERIES`); staged YAML models are legacy; prefer Cortex Agents over standalone Analyst. [SQL:sql/create-semantic-view, CX:cortex-analyst, REL:2026/other/2026-08-28-cortex-analyst-transition-cortex-agents]
- `CREATE OR REPLACE AGENT a COPY GRANTS FROM SPECIFICATION $$ <YAML> $$`: `models.orchestration: auto`, `orchestration.budget {seconds, tokens}`, `tools`, `tool_resources`. [SQL:sql/create-agent]
- `POST /api/v2/databases/{db}/schemas/{sch}/agents/{a}:run` runs as the caller's default role: needs `CORTEX_AGENT_USER` or `CORTEX_USER` plus USAGE on the agent and tools. [CX:cortex-agents]
- CoWork visibility: `ALTER SNOWFLAKE INTELLIGENCE SNOWFLAKE_INTELLIGENCE_OBJECT_DEFAULT ADD AGENT db.sch.a`; the `SNOWFLAKE_INTELLIGENCE.AGENTS` schema is deprecated. [CX:snowflake-cowork/deploy-agents]
- `CREATE MCP SERVER`: expose one `CORTEX_AGENT_RUN` tool; `SYSTEM_EXECUTE_SQL` only on a separate least-privilege server; OAuth over PATs. [CX:cortex-agents-mcp]
- REST inference: `/api/v2/cortex/v1/chat/completions` (OpenAI) or `/api/v2/cortex/v1/messages` (Claude); send `max_completion_tokens`. [CX:cortex-rest-api]

## Fine-tuning

- `SNOWFLAKE.CORTEX.FINETUNE('CREATE', 'db.sch.m', 'llama3.1-8b', '<SELECT … AS prompt, … AS completion>')`: sole base model, needs CREATE MODEL, no cross-region inference; infer via `AI_COMPLETE('db.sch.m', …)`. [CX:cortex-finetuning]
