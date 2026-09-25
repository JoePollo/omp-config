---
description: "Run subprocesses with argument lists, not shell=True or os.system"
condition:
  - '\bshell\s*=\s*True\b'
  - '\bos\.(?:system|popen)\('
scope: "tool:edit(*.py), tool:write(*.py)"
interruptMode: never
---
subprocess security: pass arguments as a sequence; data never reaches a shell.

## Avoid

```python
subprocess.run(f"git log {branch}", shell=True)
os.system("rm -rf " + path)
```

## Use

```python
subprocess.run(["git", "log", branch], check=True, capture_output=True, text=True, timeout=60)
```

- Resolve executables with `shutil.which()`.
- Pipes/globs: do them in Python (`Path.glob`, chained `Popen`).
- Exception: trusted constant command strings that truly need shell syntax.
