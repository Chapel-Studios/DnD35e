# `hasSecrets` counts disabled Secret AEs

**Verified**: Phase 4 Story 6 cycle H
**Applies to**: Anything reading "does this document have secrets?" state

- The check filters by `effect.type === 'secret'` ONLY. It does NOT
  inspect `disabled`.
- **Disabled Secret AEs still count as secrets.** The True button stays
  available so a GM can re-enable the mask without losing access to the
  surface.
- To remove the True button (i.e. transition `hasSecrets` to false), the
  Secret AE must be **deleted** (or its type changed), not just disabled.

**Locations**:
- `VueDocumentSheetMixin#_onRender` — recomputes `hasSecrets` on render
- The `secretEffectType` import in `src/documents/activeEffects/` drives the type check

**Pinned by**: `tests/e2e/view-mode-bar.spec.ts` test 2. The initial test
draft used `disabled: true` and failed correctly — the bar did not hide
True. Test was rewritten to use `.delete()`.

**Related**: `.github/repo-memory/view-mode-bar-refresh.md`,
`.github/repo-memory/masks-system-architecture.md`
