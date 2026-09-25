# Terraform validation & tests
Tags → skill://terraform/sources.md.

## Static checks
- Per changed root or module: `terraform fmt -check -recursive` (`terraform fmt` to fix), `terraform init -backend=false -input=false`, `terraform validate`. [DAR:README.md, HC:language/style]
- Linters and scanners (tflint, trivy, checkov, terraform-docs, pre-commit) only where the repo already configures them (`.tflint.hcl`, `.pre-commit-config.yaml`); none does today. [U, TFLINT]

## terraform test (≥ 1.6)
- `*.tftest.hcl` in the module root or `tests/`; run `terraform test` from the module directory. [HC:language/tests]
- `run` blocks default to `command = apply`, which creates real infrastructure: set `command = plan` unless the user asked for integration tests in a sandbox. [HC:language/tests]
- Offline: `mock_provider "azurerm" {}`, `override_resource`, `override_data` (≥ 1.7); mocked computed values are fake, so assert logic, not provider formats. [HC:language/tests/mocking]
- Test what breaks: `validation` rejections (`expect_failures = [var.env]`), `for_each` key sets, conditional counts, output shapes, precondition failures. [HC:language/tests, U]
- The house repos have no tests; add them when asked or when a module gains non-trivial logic. [U]

## Plan-time assertions
- Encode invariants in configuration (validation, pre/postconditions, fail-closed `terraform_data` guards) so every pipeline plan enforces them. [HC:language/validate, DIAC:registry.tf]
- Policy or compliance checks run in the pipeline against the saved plan's JSON (`terraform show -json`), never locally. [MSTF:best-practices-compliance-testing, HC:language/style]
