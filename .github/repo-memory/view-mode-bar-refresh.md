# View-mode bar — refresh semantics

**Verified**: Phase 4 Story 6 cycle H (+ post-cycle reactivity fix)
**Applies to**: Code or tests that mutate Secret AEs and expect the view-mode bar to reflect

- `hasSecrets` is sampled in `VueDocumentSheetMixin#_onRender` and pushed
  to the store via `renderModeStore.setHasSecrets(...)`. It is NOT driven
  by Vue reactivity on its own.
- **Reactivity is provided by the AE hook chain**: `createActiveEffect`,
  `updateActiveEffect`, and `deleteActiveEffect` all route through
  `refreshOwningItemForSecret` in
  `src/entities/activeEffects/registration.mts`, which calls
  `item.sheet.render()` when the open item sheet is rendered. That
  re-render fires `_onRender`, which resamples `hasSecrets`.
- **Consequence**: structural bar changes (True button appearing or
  disappearing) happen automatically when secrets are added/removed.
  E2E tests do NOT need a manual `rerenderSheet` after AE mutations.
  If the bar is not updating, the hook is broken — fix the hook, not the test.
- The bar itself is built imperatively in `RenderModeStore.renderViewModeBar`
  via direct DOM mutation inside `.window-header`, not Vue-mounted.
- View-mode VALUE changes (clicking Play/Edit/True) update the bar
  synchronously inside `setViewMode` because the buttons are bound to
  click handlers in the rebuild loop. No re-render needed for those.

**Pinned by**: `tests/e2e/view-mode-bar.spec.ts` test 2 — delete a
Secret AE and the True button disappears without any explicit refresh.

**Bug history**: Originally the hook only called
`item.parent?.sheet?.render(true)` — that refreshes the containing Actor
sheet but not the item's own open sheet, so `hasSecrets` never updated on
the open item sheet. Fixed by adding `item.sheet?.render(false)` when the
item sheet is rendered.

**Related**: `.github/repo-memory/has-secrets-disabled-counts.md`,
`.github/instructions/e2e-testing.instructions.md`

