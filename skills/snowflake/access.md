# Access control and authentication

Tags → skill://snowflake/sources.md. Data policies and sharing: skill://snowflake/governance.md.

## Roles

- System roles: ACCOUNTADMIN inherits SECURITYADMIN (global MANAGE GRANTS; inherits USERADMIN, which creates users and roles) and SYSADMIN (warehouses, databases); PUBLIC = everyone; prefer GLOBALORGADMIN, ORGADMIN is being phased out. [UG:security-access-control-overview]
- ACCOUNTADMIN: at least two but few users, all with MFA; never a DEFAULT_ROLE, never for creating objects or automation. [UG:security-access-control-considerations]
- Grant object privileges to access roles, access roles to functional roles, top functional roles to SYSADMIN; objects of roles outside that tree are manageable only via MANAGE GRANTS. [UG:security-access-control-considerations]
- Database roles scope privileges to one database and can't be activated; grant them to account roles. [UG:security-access-control-considerations]
- Only the primary role authorizes and owns CREATE; DEFAULT_SECONDARY_ROLES defaults to ('ALL'), so set `()` or `USE SECONDARY ROLES NONE` for single-role sessions. [UG:security-access-control-overview, SQL:sql/use-secondary-roles, REL:bcr-bundles/2024_08/bcr-1692]

## Grants

- Grant to roles; `GRANT ... TO USER` (UBAC) is for person-to-person dev sharing: needs secondary roles ALL, no future grants, no CREATE or OWNERSHIP. [SQL:sql/grant-privilege-user]
- Use `CREATE SCHEMA ... WITH MANAGED ACCESS` so only the schema owner or MANAGE GRANTS holders grant. [UG:security-access-control-considerations]
- `ON ALL` covers existing objects only; add `ON FUTURE` (needs MANAGE GRANTS unless managed-schema owner); schema-level future grants void database-level ones for that type. [SQL:sql/grant-privilege]
- Inherited grants (GA 2026-09-10; opt-in `FEATURE_RBAC_INHERITED_GRANTS = 'ENABLED'`): `GRANT INHERITED <priv> ON ALL <plural> IN {ACCOUNT|DATABASE|SCHEMA}` replaces ALL+FUTURE pairs for uniform access. [UG:inherited-grants-intro]

## Users

- TYPE: PERSON (default), SERVICE, SERVICE_AGENT (AI agents), LEGACY_SERVICE (deprecated); SERVICE and SERVICE_AGENT can't use passwords, SAML, or MFA. [SQL:sql/create-user, UG:admin-user-management]
- Password deprecation: Phase 2 (rolling May-Jul 2026) makes LEGACY_SERVICE invalid in CREATE/ALTER USER; Phase 3 (rolling Aug-Oct 2026) blocks non-human passwords, converts LEGACY_SERVICE to SERVICE, and requires MFA on every human password login. [UG:security-mfa-rollout]
- Managing service-user credentials needs OWNERSHIP or MODIFY PROGRAMMATIC AUTHENTICATION METHODS on the user; grant the latter to the owning role. [UG:key-pair-auth, UG:programmatic-access-tokens]

## Humans

- SSO: SAML2 (Entra ID native) with `authenticator='externalbrowser'`; OIDC (Preview) needs `OAUTH_AUTHORIZATION_CODE`. [UG:admin-security-fed-auth-overview, REL:2026/other/2026-07-17-oidc-federated-authentication-preview]
- Local tools: `authenticator='OAUTH_AUTHORIZATION_CODE'` via `SNOWFLAKE$LOCAL_APPLICATION` (Python connector >= 3.16.0, Snowflake CLI >= 3.8.1). [UG:oauth-local-applications]
- MFA: passkeys recommended (Duo isn't replicated); `MFA_ENROLLMENT = 'REQUIRED'` or `'REQUIRED_PASSWORD_ONLY'` ('OPTIONAL' is backward-compat only); SSO MFA via `ENFORCE_MFA_ON_EXTERNAL_AUTHENTICATION = 'ALL'`. [UG:security-mfa, SQL:sql/create-authentication-policy]

## Services

- WIF (preferred for services) follows the runtime identity provider: AWS IAM uses `CREATE USER u WORKLOAD_IDENTITY = (TYPE = AWS ARN = '<iam_role_arn>') TYPE = SERVICE`; connect with `authenticator='WORKLOAD_IDENTITY'`, `workload_identity_provider='AWS'` (Python connector >= 3.17.0). [SF:guides-overview-secure, UG:workload-identity-federation]
- Azure WIF applies when the runtime uses an Azure managed identity: tenant admin consents to the Snowflake EntraID app; user-assigned identities need `MANAGED_IDENTITY_CLIENT_ID`; no impersonation; pin tenants with `WORKLOAD_IDENTITY_POLICY = (ALLOWED_AZURE_ISSUERS = (...))`. [UG:workload-identity-federation, SQL:sql/create-authentication-policy]
- Key pair otherwise: RSA >= 2048-bit, encrypted PKCS#8, Python `authenticator='SNOWFLAKE_JWT'`; `ALTER USER u ADD KEY PAIR k PUBLIC_KEY = '...' ROLE_RESTRICTION = 'r' DAYS_TO_EXPIRY = 90` (max 10); `ROTATE KEY PAIR` keeps the old key 24 h; RSA_PUBLIC_KEY_2 swap is legacy. [UG:key-pair-auth, SQL:sql/alter-user-add-key-pair, DEV:python-connector/python-connector-connect]
- External OAuth: `EXTERNAL_OAUTH_TYPE = AZURE`; ACCOUNTADMIN, SECURITYADMIN, ORGADMIN, GLOBALORGADMIN blocked by default; tokens need a role scope; drivers pass `authenticator='oauth'` + `token`. [UG:oauth-ext-overview, UG:oauth-azure]
- PAT: user must be under a network policy (SERVICE: to generate and use; PERSON: to use); service tokens need ROLE_RESTRICTION by default and ignore secondary roles; expiry default 15, max 365 days. [UG:programmatic-access-tokens]

## Policies

- Order: network -> authentication -> password (local auth) -> session; user-level overrides account-level. [UG:authentication-policies]
- Authentication policy AUTHENTICATION_METHODS: SAML, OIDC, PASSWORD, OAUTH, KEYPAIR, PROGRAMMATIC_ACCESS_TOKEN, WORKLOAD_IDENTITY; `ALTER ACCOUNT SET AUTHENTICATION POLICY p FOR ALL SERVICE USERS`; keep a permissive break-glass admin policy. [UG:authentication-policies, SQL:sql/create-authentication-policy]
- Session policy: SESSION_IDLE_TIMEOUT_MINS (default 240) and SESSION_UI_IDLE_TIMEOUT_MINS (default 1080), 5 min-24 h; avoid CLIENT_SESSION_KEEP_ALIVE. [UG:session-policies]
- Password policy defaults: min length 14, max age 90 days, 5 retries, 15-min lockout, history 5. [SQL:sql/create-password-policy]

## Network

- For AWS-hosted accounts, network policies use schema-level network rules (`MODE = INGRESS`, `TYPE = IPV4 | AWSVPCEID`); AWS internal-stage restrictions require `MODE = INTERNAL_STAGE` with `AWSVPCEID` and `ENFORCE_NETWORK_RULES_FOR_INTERNAL_STAGES = TRUE`. [UG:network-policies, UG:network-rules, SQL:parameters]
- Allowed lists block other identifiers of their type; blocked wins on overlap; precedence integration > user > account; one policy per account or user; account activation fails unless your IP is allowed. [UG:network-policies]
- AWS PrivateLink (Business Critical+): authorize with `SYSTEM$AUTHORIZE_PRIVATELINK`, configure the VPC endpoint and DNS using `SYSTEM$GET_PRIVATELINK_CONFIG`, then enforce private-only access with `SYSTEM$ENFORCE_PRIVATELINK_ACCESS_ONLY`. [UG:admin-security-privatelink, UG:security-disable-public-access-privatelink]

## External access

- EGRESS network rule (`TYPE = HOST_PORT`) + SECRET + EXTERNAL ACCESS INTEGRATION (ALLOWED_NETWORK_RULES, ALLOWED_AUTHENTICATION_SECRETS); function creators need USAGE on it and READ on each secret. [DEV:external-network-access/creating-using-external-network-access]
- SECRET types: PASSWORD, GENERIC_STRING, OAUTH2, CLOUD_PROVIDER_TOKEN, SYMMETRIC_KEY, WORKLOAD_IDENTITY_FEDERATION. [SQL:sql/create-secret]

## Monitoring

- Trust Center: Security Essentials is always on; enable CIS Benchmarks and Threat Intelligence (serverless cost); access via SNOWFLAKE.TRUST_CENTER_VIEWER or TRUST_CENTER_ADMIN. [UG:trust-center/overview]

## Environment

- Role, user, integration, and policy names come from per-environment config (dev, tst, prd); diagnostics stay read-only. [U]
- Azure DevOps CI uses the OIDC setup in `devops.md`; Airflow uses WIF for the runtime identity provider (AWS IAM or Azure managed identity), else named key pairs with `ROLE_RESTRICTION` and `DAYS_TO_EXPIRY`. [U, UG:workload-identity-federation]
