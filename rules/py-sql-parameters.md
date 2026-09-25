---
description: "Bind SQL values as driver parameters; never format them into SQL text (PEP 249)"
condition:
  - '\.(?:execute|executemany|exec_driver_sql)\(\s*(?:[rR]?[fF]|[fF][rR])["'']'
  - '\.(?:execute|executemany)\(\s*(?:"[^"]*"|''[^'']*'')\s*(?:%|\.format\(|\+)'
  - '\bread_sql(?:_query)?\(\s*(?:[rR]?[fF]|[fF][rR])["'']'
  - '(?i)(?:^|\W)(?:r?f|fr)(?:"\s*(?:select\s[^"]*\sfrom|insert\s+into|update\s+\S+\s+set|delete\s+from|merge\s+into)\s|''\s*(?:select\s[^'']*\sfrom|insert\s+into|update\s+\S+\s+set|delete\s+from|merge\s+into)\s)'
  - '(?i)(?:^|\W)(?:r?f|fr)(?:"""|'''''')\s*(?:select\s[\s\S]*?\sfrom|insert\s+into|update\s+\S+\s+set|delete\s+from|merge\s+into|with\s+\w+\s+as\s*\()\s'
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
PEP 249: values travel as parameters; SQL text stays constant.

## Avoid

```python
cursor.execute(f"SELECT * FROM dbo.orders WHERE id = {order_id}")
```

## Use

```python
cursor.execute("SELECT * FROM dbo.orders WHERE id = ?", (order_id,))
cursor.executemany("INSERT INTO dbo.stage (id, name) VALUES (?, ?)", rows)
```

- Marker = driver `paramstyle` (pyodbc `?`; check `module.paramstyle`).
- Identifiers (table, column, sort order) can't bind: pick them from an allowlist defined in code (OWASP); only allowlisted identifiers may be interpolated.
- Your own SQL-accepting APIs: annotate the parameter `LiteralString` (PEP 675).
