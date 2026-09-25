---
description: "Give every HTTP call an explicit timeout"
condition:
  - '\brequests\.(?:get|post|put|patch|delete|head|options|request)\((?![^\n]*\btimeout\s*=)'
  - '\burlopen\((?![^\n]*\btimeout\s*=)'
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
`requests` and `urlopen` wait forever without `timeout`.

## Use

```python
response = requests.get(url, timeout=(3.05, 30))
with urllib.request.urlopen(req, timeout=30) as resp:
    body = resp.read()
client = httpx.Client(timeout=httpx.Timeout(30.0, connect=5.0))
```

- Retry only connection errors and 408/409/429/5xx on replay-safe requests; exponential backoff + jitter + cap.
- One retry layer: the SDK's or yours (`max_retries=0` on the SDK), never both.
