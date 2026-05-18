# E2E selector stability

**Verified**: Phase 4 Story 6 (cycles G & H)
**Applies to**: `tests/e2e/**`

- `data-field-path="system.x.y"` is rendered on every FormGroup root and is the
  primary stable hook for E2E selectors.
- `FamiliarDropdown` items carry a `title` attribute set to `accessPath`
  (leaves) or `fullPath` (root contexts). Use `title`, not `.option-path`
  text — the display text is localized and may include `(aliases)`.
- View-mode bar buttons render in `.window-header` (not the sheet body),
  identified by FontAwesome icon class: `i.fa-pen-to-square` (edit),
  `i.fa-dice-d20` (play), `i.fa-eye` (true). Filter
  `.view-mode-bar .view-mode-btn` by `has: page.locator('i.fa-xxx')`.
- Schema-derived classes (`.familiar-dropdown`, `.formula-input`,
  `.item-name`, `.window-content`, `.view-mode-bar`, `.view-mode-btn`)
  are stable.
- Localized text and `:has-text(...)` selectors must NOT be used for
  assertion targets — they break on locale swap and on alias annotation
  changes.

**Discovery**: While writing `formula-familiar-weapon-name.spec.ts`, an
initial attempt used `.option-path` text and broke on `"Self (Weapon)"`
vs `"Self"`. Rewriting against `title` made the spec robust.

**Related**: `.github/instructions/e2e-testing.instructions.md`
