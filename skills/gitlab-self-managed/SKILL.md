---
name: gitlab-self-managed
description: GitLab Self-Managed knowledge base (architecture, operations, security, runners, backups, upgrades, and disaster recovery). Routed by rule://domain-router.
hide: true
kb:
  files: ['**/gitlab.rb', '**/gitlab-secrets.json']
  commands: ['^(?:sudo\s+)?(?:gitlab-ctl|gitlab-rake|gitlab-backup|gitlab-runner)\b']
  topics:
    - file: operations.md
      files: ['**/gitlab.rb']
      commands: ['^(?:sudo\s+)?(?:gitlab-ctl|gitlab-rake|gitlab-backup)\b']
    - file: security.md
      files: ['**/gitlab-secrets.json']
      commands: ['^(?:sudo\s+)?(?:gitlab-ctl|gitlab-runner)\b']
---

# GitLab Self-Managed KB

Defaults only: explicit instructions, AGENTS.md, repo config/conventions win. Read every topic whose trigger matches. Tags → skill://gitlab-self-managed/sources.md.

## Topics

| trigger | read |
|---|---|
| Self-Managed architecture, requirements, sizing, availability, Geo, backups, restores, upgrades, maintenance, and monitoring | skill://gitlab-self-managed/operations.md |
| Self-Managed security settings, hardening, runner isolation, NIST mapping, and CIS benchmark scope | skill://gitlab-self-managed/security.md |

## Core

- Use GitLab Docs as the product-specific operational source; treat blogs as supplementary case studies, not deployment standards. [RA, SEC]
- Match guidance to the installed GitLab version and installation method; Linux package hardening steps do not automatically apply to Helm or other deployment types. [REQ, HARD]
