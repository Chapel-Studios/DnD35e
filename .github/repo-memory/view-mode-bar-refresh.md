# View-mode bar — refresh semantics

**Verified**: Phase 4 Story 6 cycle H
**Applies to**: Code or tests that mutate Secret AEs and expect the view-mode bar to reflect

- `hasSecrets` is sampled in `VueDocumentSheetMixin#_onRender` and pushed
  to the store via `renderModeStore.setHasSecrets(...)`. It is NOT driven
  by Vue reactivity.
- **Consequence**: structural mode-bar changes (True button appearing or
  disappearing when secrets are added/removed) only happen on full sheet
  re-render. E2E tests that mutate Secret AEs must call `rerenderSheet`
  to surface the change.
- The bar itself is built imperatively in `RenderModeStore.renderViewModeBar`
  via direct DOM mutation inside `.window-header`, not Vue-mounted.
- View-mode VALUE changes (clicking Play/Edit/True) update the bar
  synchronously inside `setViewMode` because the buttons are bound to
  click handlers in the rebuild loop. No re-render needed for those.

**Pinned by**: `tests/e2e/view-mode-bar.spec.ts` test 2 — delete a
Secret AE then `rerenderSheet` to observe the True button disappearing.

**Related**: `.github/repo-memory/has-secrets-disabled-counts.md`,
`.github/instructions/e2e-testing.instructions.md`
