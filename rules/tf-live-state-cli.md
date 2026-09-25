---
description: "Terraform against live state or cloud APIs only on explicit request; local checks stay static"
condition:
  - '"command"\s*:\s*"(?:[^"\\]|\\.)*?\bterraform(?:\.exe)?\s+(?:-chdir=\S+\s+)?(?:apply|destroy|import|plan|refresh|query|taint|untaint|force-unlock|output|show|console|state|workspace\s+(?:new|delete|select|list))\b'
  - '"command"\s*:\s*"(?:[^"\\]|\\.)*?\bterraform(?:\.exe)?\s+(?:-chdir=\S+\s+)?init\b(?:(?!-backend=false)(?:[^"\\]|\\.))*"'
  - '"command"\s*:\s*"(?:[^"\\]|\\.)*?\baz\s+storage\s+blob\s+lease\s+break\b'
scope: "tool:bash"
interruptMode: tool-only
---
Backends, state, and cloud APIs are external services: read-only unless the user explicitly asked for this command in this conversation.

| need | static route |
|---|---|
| syntax, types, references | `terraform init -backend=false -input=false`, then `terraform validate` |
| formatting | `terraform fmt -check -recursive` |
| logic | `terraform test` with `command = plan` and `mock_provider` |
| adopt, rename, detach | `import`, `moved`, `removed` blocks, planned by the pipeline |
| plan, apply, drift | the repo's Azure DevOps pipeline: plan → approval → apply of the saved plan |

- Never break a state lease or `force-unlock` a lock another run may hold; report the lock ID instead.
- Explicitly requested: name the root, environment, and state key it touches, then run it once.

Details: skill://terraform/state.md.
