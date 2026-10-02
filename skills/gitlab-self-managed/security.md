# Security and compliance

Tags → skill://gitlab-self-managed/sources.md.

## Product and host hardening

- Use the GitLab security index for authentication, account access, tokens, rate limits, webhook filtering, audit/logging, and incident-response guidance. [SEC]
- Apply hardening recommendations by category—application, CI/CD, configuration, and OS—and stage changes because controls can affect required features. [HARD, CFG]
- Hardening guidance was tested mainly on a single Linux-package instance; verify applicability to the actual installation method and scale instead of copying it directly to Helm or HA. [HARD]

## Runner threat model

- Treat self-managed CI runners as execution infrastructure for user-controlled code: jobs can compromise runner hosts or networks and expose secrets available to the job. [RUNNER]
- Do not share persistent runners across projects with different trust levels; use the shell executor only for trusted builds. [RUNNER]
- Avoid privileged Docker jobs; when required, use dedicated runners on isolated ephemeral machines and protected branches, and segment runner networks. [RUNNER]

## Compliance and benchmarks

- GitLab's NIST 800-53 mapping is a configuration reference, not proof of system-wide compliance; assess the full stack and applicable controls. [NIST]
- CIS lists GitLab 1.0.1 under Software Supply Chain Security; do not describe that listing as a standalone Self-Managed server-hardening benchmark or infer controls not stated by the benchmark. [CIS]
