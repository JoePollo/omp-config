# Architecture, operations, and recovery

Tags → skill://gitlab-self-managed/sources.md.

## Architecture and sizing

- Use GitLab's reference architectures as production starting points; size from measured or expected workload and adjust from monitoring rather than user count alone. [RA, SIZE, MON]
- Check installation requirements for supported platforms, component versions, storage, and infrastructure before deployment or architecture changes. [REQ]
- Treat HA as an availability requirement with cost and maintenance complexity; use GitLab Geo when cross-region replication or failover is required and follow its dedicated architecture guide. [RA, GEO]

## Backup and restore

- Plan coverage beyond `gitlab-backup`: object storage and configuration files/secrets require separate protection; verify exclusions for the actual installation method. [BACKUP]
- Exercise a full restore in a test environment; restore requires the same GitLab version and edition as the backup. [RESTORE]

## Upgrades and monitoring

- Follow the documented upgrade path, including required stops; use pre-upgrade checks, a production clone, and a tested backup/restore rollback plan. [UPGRADE, MAINT, BACKUP, RESTORE]
- Keep GitLab and its host OS patched according to their maintenance policies. [SEC, MAINT]
- Use GitLab monitoring guidance; Prometheus and exporters do not authenticate by default, so keep their endpoints private or restricted. [MON]
