# DevBox E2E Locator Contract

This document defines the stable element locator contract for DevBox E2E tests.
The goal is to make tests describe product behavior instead of DOM structure or
styling details.

## Locator Priority

Use locators in this order:

1. User-facing semantic locators:
   - buttons by role and accessible name
   - inputs by label, placeholder, or accessible name
   - tabs, menus, dialogs, and table rows by role and name
2. `data-testid` for product-critical anchors that are hard to identify
   semantically.
3. DOM selectors only inside a bounded component scope when neither semantic
   locators nor `data-testid` are available.

Do not use `className` as a test locator. CSS classes are styling details and
can change during visual refactors, Tailwind formatting, or component-library
updates.

Use `id` for real DOM semantics such as form labels or anchors. Do not use `id`
as the default E2E test contract.

## `data-testid` Naming

Use lowercase dot-separated names:

```text
<page-or-feature>.<area>.<object>.<action-or-field>
```

Examples:

- `devbox-list.search-input`
- `devbox-list.create-button`
- `devbox-list.item.name`
- `devbox-detail.ssh.private-key-button`
- `devbox-create.network.port-input`
- `devbox-release.submit-button`
- `devbox-delete.confirm-button`

Prefer stable business semantics over layout language. Avoid names such as
`left-button`, `blue-card`, `row-1`, or `top-right-menu`.

For repeated items, put the stable `data-testid` on the repeated element and use
visible business data to scope the row in the test. Do not encode dynamic names
or indexes into `data-testid`.

Good:

```text
row with text "db-e2e-01" -> devbox-list.item.status
```

Avoid:

```text
devbox-list.item.db-e2e-01.status
devbox-list.item.0.status
```

## When `data-testid` Is Required

Add `data-testid` when any of these are true:

- The visible text is duplicated, such as repeated delete, deploy, save, or
  retry buttons.
- The element is an icon-only button.
- The assertion target is a state indicator, error banner, loading state, empty
  state, or retry entry.
- The element sits inside a repeated list, table row, card, or menu.
- The visible text is localized and the test must remain locale-neutral.
- The element represents a business contract that should survive layout changes.

## DevBox Locator Surface

The following names are the stable contract for the current P0/P1 E2E scope.

### List

- `devbox-list.search-input`
- `devbox-list.docs-link`
- `devbox-list.template-button`
- `devbox-list.create-button`
- `devbox-list.create-menu`
- `devbox-list.create-from-template`
- `devbox-list.import-from-git`
- `devbox-list.import-from-local`
- `devbox-list.item`
- `devbox-list.item.name`
- `devbox-list.item.remark`
- `devbox-list.item.remark-edit`
- `devbox-list.item.status`
- `devbox-list.item.create-time`
- `devbox-list.item.detail-button`
- `devbox-list.item.actions-button`
- `devbox-list.item.release-action`
- `devbox-list.item.update-action`
- `devbox-list.item.start-action`
- `devbox-list.item.restart-action`
- `devbox-list.item.pause-action`
- `devbox-list.item.delete-action`
- `devbox-list.empty`
- `devbox-list.search-empty`
- `devbox-list.pagination`

### Create And Update

- `devbox-create.form-tab`
- `devbox-create.yaml-tab`
- `devbox-create.submit-button`
- `devbox-create.runtime-section`
- `devbox-create.name-input`
- `devbox-create.usage-section`
- `devbox-create.cpu-slider`
- `devbox-create.memory-slider`
- `devbox-create.gpu-select`
- `devbox-create.gpu-amount-option`
- `devbox-create.storage-section`
- `devbox-create.storage.add-button`
- `devbox-create.storage.item`
- `devbox-create.storage.edit-button`
- `devbox-create.storage.delete-button`
- `devbox-create.network-section`
- `devbox-create.network.add-port-button`
- `devbox-create.network.port-item`
- `devbox-create.network.port-input`
- `devbox-create.network.public-switch`
- `devbox-create.network.protocol-select`
- `devbox-create.network.public-domain`
- `devbox-create.network.custom-domain-button`
- `devbox-create.network.delete-port-button`
- `devbox-create.advanced-section`
- `devbox-create.shared-memory-section`
- `devbox-create.shared-memory.switch`
- `devbox-create.shared-memory.decrease-button`
- `devbox-create.shared-memory.size-value`
- `devbox-create.shared-memory.increase-button`

### Templates

- `template-page.tabs`
- `template-page.tab.public`
- `template-page.tab.private`
- `template-page.search-input`
- `template-page.back-button`
- `template-page.public-content`
- `template-page.private-content`
- `template-page.category.official`
- `template-page.category.language`
- `template-page.category.framework`
- `template-page.category.os`
- `template-page.category.mcp`
- `template-page.category.unofficial`
- `template-page.category-filter`
- `template-page.pagination`
- `template-page.empty`
- `template-card`
- `template-card.name`
- `template-card.version-select`
- `template-card.select-button`
- `template-card.actions-button`
- `template-card.delete-action`

### Detail

- `devbox-detail.back-button`
- `devbox-detail.title`
- `devbox-detail.status`
- `devbox-detail.delete-button`
- `devbox-detail.terminal-button`
- `devbox-detail.start-button`
- `devbox-detail.pause-button`
- `devbox-detail.update-button`
- `devbox-detail.restart-button`
- `devbox-detail.tab.overview`
- `devbox-detail.tab.monitor`
- `devbox-detail.tab.advanced-config`
- `devbox-detail.basic-section`
- `devbox-detail.basic.item`
- `devbox-detail.basic.item-label`
- `devbox-detail.basic.item-value`
- `devbox-detail.ssh.command`
- `devbox-detail.ssh.copy-command`
- `devbox-detail.ssh.private-key-button`
- `devbox-detail.ssh.one-click-config-button`
- `devbox-detail.last-event`
- `devbox-detail.network-section`
- `devbox-detail.network.manage-button`
- `devbox-detail.network.item`
- `devbox-detail.network.external-address`

### IDE

- `devbox-ide.open-button`
- `devbox-ide.menu-button`
- `devbox-ide.menu`
- `devbox-ide.option`

### Release

- `devbox-release.section`
- `devbox-release.dialog`
- `devbox-release.open-button`
- `devbox-release.empty`
- `devbox-release.item`
- `devbox-release.item.tag`
- `devbox-release.item.status`
- `devbox-release.item.description`
- `devbox-release.item.description-edit`
- `devbox-release.item.deploy-button`
- `devbox-release.item.actions-button`
- `devbox-release.item.convert-template`
- `devbox-release.item.delete-action`
- `devbox-release.image-input`
- `devbox-release.tag-input`
- `devbox-release.description-input`
- `devbox-release.auto-start-checkbox`
- `devbox-release.cancel-button`
- `devbox-release.submit-button`

### Delete And Remark

- `devbox-delete.dialog`
- `devbox-delete.warning`
- `devbox-delete.name-input`
- `devbox-delete.cancel-button`
- `devbox-delete.confirm-button`
- `devbox-remark.dialog`
- `devbox-remark.input`
- `devbox-remark.cancel-button`
- `devbox-remark.submit-button`

## Review Checklist

When adding or changing E2E-covered UI:

- Prefer role/name locators first.
- Add `data-testid` for repeated, icon-only, localized, or state/assertion
  targets.
- Keep `data-testid` values stable across visual refactors.
- Do not use CSS class selectors in tests.
- Do not encode row indexes, generated IDs, resource names, or localized labels
  into `data-testid`.
