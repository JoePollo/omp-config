---
description: "Legacy SNOWFLAKE.CORTEX LLM functions are deprecated by end of 2026; use AI_* functions"
condition:
  - '(?i)\bSNOWFLAKE\.CORTEX\.(?:COMPLETE|TRY_COMPLETE|SUMMARIZE_AGG|TRANSLATE|SENTIMENT|ENTITY_SENTIMENT|EXTRACT_ANSWER|CLASSIFY_TEXT|EMBED_TEXT_(?:768|1024)|COUNT_TOKENS|PARSE_DOCUMENT)\s*\('
  - '\bfrom\s+snowflake\.cortex\s+import\b'
scope: "tool:edit(*.{sql,py,ipynb}), tool:write(*.{sql,py,ipynb})"
interruptMode: tool-only
---

New code calls the `AI_*` functions; the `SNOWFLAKE.CORTEX.*` LLM functions remain for backward compatibility only.

| avoid | use |
|---|---|
| `SNOWFLAKE.CORTEX.COMPLETE`, `TRY_COMPLETE` | `AI_COMPLETE(model, prompt [, model_parameters, response_format, show_details])` |
| `CLASSIFY_TEXT`, `EXTRACT_ANSWER` | `AI_CLASSIFY`, `AI_EXTRACT` |
| `SENTIMENT`, `ENTITY_SENTIMENT` | `AI_SENTIMENT` |
| `EMBED_TEXT_768`, `EMBED_TEXT_1024` | `AI_EMBED` |
| `TRANSLATE`, `SUMMARIZE_AGG`, `COUNT_TOKENS`, `PARSE_DOCUMENT` | `AI_TRANSLATE`, `AI_SUMMARIZE_AGG`, `AI_COUNT_TOKENS`, `AI_PARSE_DOCUMENT` |
| Python `from snowflake.cortex import complete` | `snowflake.snowpark.functions.ai_complete` |

Model names come from config; access, cost guards, and structured output: skill://snowflake/cortex.md.
Exception: current `SNOWFLAKE.CORTEX` utilities (`SPLIT_TEXT_RECURSIVE_CHARACTER`, `SEARCH_PREVIEW`, `FINETUNE`) are not covered.
