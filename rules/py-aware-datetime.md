---
description: "Use timezone-aware datetimes; utcnow/utcfromtimestamp are deprecated (3.12)"
condition:
  - '\butcnow\(\)'
  - '\butcfromtimestamp\('
  - '\bdatetime\.(?:now|today)\(\s*\)'
  - '\bdatetime\.fromtimestamp\(\s*[^,()]+\)'
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
Naive datetimes drop the zone; `utcnow()`/`utcfromtimestamp()` are deprecated since 3.12.

| avoid | use |
|---|---|
| `datetime.utcnow()` / `datetime.now()` | `datetime.now(UTC)` (`from datetime import UTC`, 3.11; else `timezone.utc`) |
| `datetime.utcfromtimestamp(ts)` / `datetime.fromtimestamp(ts)` | `datetime.fromtimestamp(ts, tz=UTC)` |
| `datetime.today()` | `datetime.now(UTC)`; display: `.astimezone(ZoneInfo("America/Chicago"))` |

Store and compare in UTC; convert to civil time only for display.
Exception: CLI output intentionally showing local wall-clock time.
