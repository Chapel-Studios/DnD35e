# DocumentName header rendering by view mode

**Verified**: Phase 4 Story 6 cycles G & H
**Applies to**: E2E specs and any code reading the sheet header name surface

- `.item-name` (rendered by `DocumentName.vue` inside `CoreMixin`) ONLY
  appears in `play` and `true` modes.
- In `edit` mode, `HeaderNameField.vue` swaps the heading for a
  `FormulaFormGroup` bound to `system.nameFormula`. The two surfaces are
  mutually exclusive in the DOM.
- **E2E rule (option A)**: assert on `doc.name` via
  `page.evaluate(uuid => fromUuid(uuid).name)` — works in any mode.
- **E2E rule (option B)**: switch modes via the view-mode bar buttons,
  then assert on the mode-appropriate surface (`.formula-input` in edit,
  `.item-name` in play/true).

**Pinned by**: `tests/e2e/view-mode-bar.spec.ts` test 6 (HeaderNameField
swap) and `tests/e2e/formula-familiar-weapon-name.spec.ts` (commits
formula in edit mode, asserts on `doc.name`).

**Related**: `.github/instructions/e2e-testing.instructions.md`,
`.github/repo-memory/view-mode-bar-refresh.md`
