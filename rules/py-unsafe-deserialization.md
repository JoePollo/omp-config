---
description: "Never eval, exec, unpickle, or yaml.load untrusted input"
condition:
  - '\byaml\.(?:load|load_all|unsafe_load)\((?![^)]*Safe)'
  - '\b(?:pickle|cPickle|dill|marshal|shelve)\.(?:loads?|open)\('
  - '(?m)(?:^|[^\w.])(?:eval|exec)\('
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
| avoid | use |
|---|---|
| `yaml.load(f)` | `yaml.safe_load(f)` |
| `pickle` / `marshal` / `shelve` / `dill` loads of external data | JSON or a schema'd format; pickle only for trusted, self-produced data |
| `eval(expr)` / `exec(code)` on input | explicit parsing: `json.loads`, Pydantic, `int()` |
