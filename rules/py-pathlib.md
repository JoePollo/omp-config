---
description: "Use pathlib for filesystem paths (PEP 428)"
condition:
  - '\bos\.path\.(?:join|exists|isfile|isdir|basename|dirname|splitext|abspath|expanduser|getsize|realpath|relpath)\('
  - '\bos\.(?:makedirs|listdir|remove|unlink|rename|rmdir|getcwd|mkdir)\('
  - '\bglob\.glob\('
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
| os / glob | pathlib |
|---|---|
| `os.path.join(a, b)` | `Path(a) / b` |
| `os.path.exists/isfile/isdir(p)` | `p.exists()` / `p.is_file()` / `p.is_dir()` |
| `os.path.basename/dirname/splitext(p)` | `p.name` / `p.parent` / `p.stem`, `p.suffix` |
| `os.path.abspath/expanduser(p)` | `p.resolve()` / `p.expanduser()` |
| `os.makedirs(d, exist_ok=True)` | `d.mkdir(parents=True, exist_ok=True)` |
| `os.listdir(d)` / `glob.glob("*.csv")` | `d.iterdir()` / `d.glob("*.csv")` |
| `os.remove(p)` / `os.rename(a, b)` | `p.unlink()` / `a.rename(b)` |
| `os.getcwd()` | `Path.cwd()` |

Accept `str | os.PathLike[str]`, convert with `Path(x)`; str-only APIs get `os.fspath(p)` (PEP 519).
