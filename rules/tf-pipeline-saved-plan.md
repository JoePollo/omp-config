---
description: "Pipelines apply the reviewed saved plan; no auto-approve, no lock breaking"
condition:
  - '(?<![\w-])-auto-approve\b'
  - '\blease[ \t]+break\b'
  - '\bforce-unlock\b'
scope: "tool:edit(*.{yml,yaml}), tool:write(*.{yml,yaml})"
interruptMode: never
---
Apply exactly the plan a human approved; a held state lease means another run is active.

## Avoid

```yaml
- script: terraform apply -refresh-only -auto-approve -var-file="$(variableFile)"
```

## Use

```yaml
- script: terraform plan -input=false -refresh-only -out="$(Build.ArtifactStagingDirectory)/tfplan" -var-file="$(variableFile)"
```

Then `PublishPipelineArtifact@1` → approval → `DownloadPipelineArtifact@2`:

```yaml
- script: terraform apply -input=false "$(Pipeline.Workspace)/tfplan/tfplan"
```

- Destroys also go through a reviewed `terraform plan -destroy -out=…`.
- Never `az storage blob lease break` or `terraform force-unlock` in a pipeline; fail with the lock details.

Details: skill://terraform/pipelines.md.
