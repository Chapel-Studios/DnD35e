# Foundry overlay click interception in E2E

**Verified**: Phase 4 Story 6 cycle G
**Applies to**: `tests/e2e/**` specs that click sheet inputs near the header

- Foundry's `#notifications` overlay (system-info toasts, screen-resolution
  warnings) sits above sheet inputs and intercepts pointer events.
- **Symptom**: `input.click()` returns successfully but the input is never
  actually focused; subsequent typing goes nowhere.
- **Fix**: call `dismissOverlays(page)` from `tests/e2e/helpers/ui.mts`
  before any input click that lives near the sheet header.
- `openFamiliar` in `familiarDropdown.mts` already does this internally —
  callers don't need to think about it.
- Pattern lifted from D35E's `test/e2e/helpers.js#dismissOverlays`.

**Anti-pattern**: Do NOT call `app.close()` on system dialogs — it can
trigger reloads. Click their close button instead.

**Related**: `.github/instructions/e2e-testing.instructions.md`
