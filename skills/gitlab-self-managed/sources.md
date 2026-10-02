# GitLab Self-Managed KB sources

Verified 2026-10-02 against GitLab Docs pages showing version 19.5 and the CIS Software Supply Chain Security benchmark listing. Re-verify on GitLab version upgrades or when the CIS listing changes.

| tag | source |
|---|---|
| `RA` | GitLab reference architectures: <https://docs.gitlab.com/administration/reference_architectures/> |
| `REQ` | GitLab installation requirements: <https://docs.gitlab.com/install/requirements/> |
| `SIZE` | GitLab sizing guide: <https://docs.gitlab.com/install/sizing/> |
| `SEC` | Secure GitLab: <https://docs.gitlab.com/security/> |
| `HARD` | GitLab hardening recommendations: <https://docs.gitlab.com/security/hardening/> |
| `CFG` | GitLab configuration hardening recommendations: <https://docs.gitlab.com/security/hardening_configuration_recommendations/> |
| `RUNNER` | Security for self-managed runners: <https://docs.gitlab.com/runner/security/> |
| `BACKUP` | Backup and restore index: <https://docs.gitlab.com/administration/backup_restore/>; backup guide: <https://docs.gitlab.com/administration/backup_restore/backup_gitlab/> |
| `RESTORE` | Restore GitLab: <https://docs.gitlab.com/administration/backup_restore/restore_gitlab/> |
| `UPGRADE` | Upgrade index: <https://docs.gitlab.com/update/>; pre-upgrade planning: <https://docs.gitlab.com/update/plan_your_upgrade/> |
| `MAINT` | GitLab release and maintenance policy: <https://docs.gitlab.com/policy/maintenance/> |
| `MON` | Monitoring index: <https://docs.gitlab.com/administration/monitoring/>; Prometheus: <https://docs.gitlab.com/administration/monitoring/prometheus/> |
| `GEO` | GitLab Geo: <https://docs.gitlab.com/administration/geo/> |
| `NIST` | NIST 800-53 mapping: <https://docs.gitlab.com/security/hardening_nist_800_53/> |
| `CIS` | CIS Software Supply Chain Security benchmark listing, which lists GitLab 1.0.1: <https://www.cisecurity.org/benchmark/software-supply-chain-security> |
| `BLOG` | GitLab repository backup performance engineering write-up: <https://about.gitlab.com/blog/how-we-decreased-gitlab-repo-backup-times-from-48-hours-to-41-minutes/> |

## Snapshot

- GitLab Docs pages read during this research displayed documentation version 19.5; the target instance version is unknown.
- The CIS listing identifies GitLab 1.0.1 under Software Supply Chain Security. [CIS]

## Conflicts resolved

- Prefer GitLab Docs for Self-Managed deployment and operations; treat blogs as secondary case studies, not deployment standards. [RA, SEC]
- The backup-time blog describes GitLab's own Rails repository engineering work; it is not general Self-Managed administrator guidance. [BLOG, BACKUP]
- The CIS listing is not a standalone Self-Managed server-hardening benchmark; do not infer controls from its title or placement. [CIS]

## Open

- Deployment-specific sizing, HA/Geo, and recovery advice requires the installed version and method, observed workload, availability target, and RTO/RPO. [RA, SIZE, GEO, BACKUP]
