---
description: "Key repeated instances with for_each over stable keys, not count = length(...)"
condition:
  - '(?m)\bcount[ \t]*=[ \t]*length\([^()\n]*\)[ \t]*$'
scope: "tool:edit(*.tf), tool:write(*.tf)"
interruptMode: never
---
`count = length(list)` addresses instances by index: inserting or removing an element shifts every later index and replaces those objects.

## Avoid

```hcl
resource "azurerm_role_assignment" "reader" {
  count                = length(var.reader_principal_ids)
  scope                = azurerm_resource_group.this.id
  role_definition_name = "Reader"
  principal_id         = var.reader_principal_ids[count.index]
}
```

## Use

```hcl
resource "azurerm_role_assignment" "reader" {
  for_each             = var.reader_principal_ids
  scope                = azurerm_resource_group.this.id
  role_definition_name = "Reader"
  principal_id         = each.value
}
```

- `var.reader_principal_ids` is a `map(string)` keyed by stable names known at plan time, never apply-time IDs.
- `count` stays for on/off toggles: `count = var.feature_enabled ? 1 : 0`.
- Existing `count` instances: one `moved` block per index → key.

Details: skill://terraform/language.md.
