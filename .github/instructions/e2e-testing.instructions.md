---
description: Use when writing or modifying Playwright E2E specs under tests/e2e/. Covers selector strategy, helper inventory, isolation idioms, blur/commit pitfalls, overlay interception, and view-mode-aware assertions.
applyTo: "tests/e2e/**"
---

# Playwright E2E Testing — dnd35e

These tests drive a **real Foundry v14 instance** (started by `playwright.config.ts`'s `webServer`) against the built system. Tests authenticate via `/join`, drive sheets through Foundry's actual rendering pipeline, and assert against both DOM and document state.

## Helper Inventory (`tests/e2e/helpers/`)

| Helper | Purpose |
|--------|---------|
| `session.mts` | `performJoin`, `loginAs`, `gotoGame` — Foundry SPA login + game-ready gate |
| `documents.mts` | `createItem`, `createActiveEffect`, `clearWorld` — programmatic document CRUD |
| `sheets.mts` | `openDocumentSheet`, `readSheetName`, `closeAllSheets`, `rerenderSheet` |
| `ui.mts` | `dismissOverlays`, `evaluateInGame` — overlay cleanup + typed `page.evaluate` |
| `fieldOverrides.mts` | `setFieldOverride`, `clearFieldOverride` — flag-based field permission writes |
| `familiarDropdown.mts` | `openFamiliar`, `selectFamiliarOption`, `readFamiliarOptionTitles`, `dismissFamiliar` |
| `materialSheet.mts` | Material-specific sheet navigation (tab switching, changes-tab assertions) |
| `setSystemSetting.mts` | Write a `game.settings` value through Foundry's API |

**Rule**: If you find yourself writing `page.evaluate(...)` inline more than once for the same operation, lift it into a helper. The helper module owns the typing and the Foundry-side error messages.

## Selector Strategy — Stable Over Localized

**Never assert against localized display text** (`.option-path`, button labels, headings). They break when the en/fr/de bundle changes or when an alias annotation like `(Weapon)` is appended.

Prefer, in order:
1. **`data-field-path="system.x.y"`** — every `FormGroup` renders this on its root. Stable across modes and locales.
2. **`title` attribute** — `FamiliarDropdown` writes `accessPath` (leaves) or `fullPath` (root contexts) here. The display text is for humans; `title` is for tests.
3. **Schema-derived class names** — `.familiar-dropdown`, `.formula-input`, `.item-name`, `.window-content`. These are stable.
4. **Document UUIDs + `page.evaluate`** — when DOM is awkward, drop to the Foundry document via `fromUuid` and assert on `doc.name`, `doc.system.x`, etc.

```ts
// Good — stable hooks
const input = page.locator(`${sheet} [data-field-path="system.nameFormula"] .formula-input`);
const option = page.locator(`${sheet} .familiar-item[title="system.weaponDamage.damageRoll"]`);

// Bad — localized, fragile
const option = page.locator('.familiar-item:has-text("Self (Weapon)")');
```

## Isolation: World State

Tests share one Foundry world and one storageState (GM authenticated). To avoid bleed:

```ts
test.afterEach(async ({ page }) => {
  await closeAllSheets(page).catch(() => {});
  await clearWorld(page);
});
```

- `clearWorld` deletes all actors, items, and messages but **keeps scenes** (the snapshot's `Test Scene` is expected to persist).
- `closeAllSheets` iterates `foundry.applications.instances` — much faster than rebooting Foundry between tests.
- Don't call `app.close()` on system dialogs — it can trigger reloads. Use Playwright clicks against close buttons instead.

## The Three Recurring Pitfalls

### 1. Overlay Interception
Foundry's `#notifications` overlay (system-info toasts, screen-resolution warnings) sits above sheet inputs and intercepts pointer events. **Call `dismissOverlays(page)` before any `input.click()` that lives near the sheet header.**

```ts
import { dismissOverlays } from './helpers/ui.mjs';

await dismissOverlays(page);
await input.click(); // now actually reaches the input
```

`openFamiliar` already does this internally — most callers don't need to think about it.

### 2. Blur Must Be a Real Keystroke
`input.blur()` via JS does **not** fire the same focus events Vue's `@blur` handlers expect. To commit a `FormulaFormGroup` value, use:

```ts
await page.keyboard.press('Tab');
```

Then poll for the commit to settle:

```ts
await expect.poll(async () =>
  page.evaluate(async (uuid) => (await (globalThis as any).fromUuid(uuid))?.name, weaponUuid)
).toBe('1d8+1');
```

### 3. View Mode Gates the DOM Surface
Sheets render in three modes (`edit` / `play` / `true`). Several surfaces are **mode-conditional**:

- **`.item-name` heading** (`DocumentName.vue`) — only renders in `play` and `true`. In `edit`, `HeaderNameField.vue` swaps in a `FormulaFormGroup` instead. The two surfaces are mutually exclusive — assert with `toHaveCount(1)`/`toHaveCount(0)`.
- **Readonly slot content** in any `FormGroup` — only renders when `isFieldEditable` is false (covers `play`/`true` and `edit` when override locks).
- **GM-only `.field-controls` icons** — only render for GM and when the field has an explicit override.

When asserting on a value that exists only in `play`/`true`, either switch modes via the view-mode bar or **assert against `doc.name` / `doc.system.x` directly** through `page.evaluate`.

## Driving the View-Mode Bar

The bar lives in `.window-header` (not the sheet body) and is built imperatively by `RenderModeStore.renderViewModeBar` — not Vue-mounted. Buttons are identified by FontAwesome icon class:

```ts
const sheet = page.locator(sheetSelector);
const bar  = sheet.locator('.view-mode-bar');
const edit = bar.locator('.view-mode-btn').filter({ has: page.locator('i.fa-pen-to-square') });
const play = bar.locator('.view-mode-btn').filter({ has: page.locator('i.fa-dice-d20') });
const view = bar.locator('.view-mode-btn').filter({ has: page.locator('i.fa-eye') }); // "true" mode
```

### Button visibility matrix
| Role | Edit | Play | True |
|------|------|------|------|
| GM, identifiable doc + Secret AE present | ✓ | ✓ | ✓ |
| GM, no Secret AE | ✓ | ✓ | — |
| Player, OWNER permission | ✓ | ✓ | — (always; True is GM-only regardless of secrets) |
| Player, OBSERVER permission | — | ✓ | — |

Initial mode is role-based: GM starts in `edit`, non-GM in `play`.

### Active state
The currently selected button carries `.active`. Clicking another button moves `.active` to it synchronously (no re-render needed for value changes).

### Secret AE removal — reactivity contract
Two facts to remember when mutating Secret AEs in a test:

1. **The True button updates automatically.** Creating, updating, or deleting a Secret AE on an Item fires the `createActiveEffect` / `updateActiveEffect` / `deleteActiveEffect` hook chain, which calls `item.sheet.render()` via `refreshOwningItemForSecret` (`src/documents/activeEffects/registration.mts`). `_onRender` re-samples `hasSecrets` and pushes it to the store, so the bar refreshes without any explicit `rerenderSheet` call. If you ever find yourself needing a manual rerender to surface a Secret-AE change, **that's a bug in the hook, not the test**.
2. **Disabled Secret AEs still count as secrets.** The "does this doc have secrets?" check filters by `effect.type === 'secret'` only — it does not inspect `disabled`. To make the True button go away you must `.delete()` the AE (or change its type). Toggling `disabled` keeps it.

```ts
// Delete is sufficient — the hook chain triggers the sheet re-render for us.
await page.evaluate(async (id) => {
  const ae = await (globalThis as any).fromUuid(id);
  await ae.delete();
}, secretUuid);
await expect.poll(() => trueBtn.count()).toBe(0);
```

See `tests/e2e/view-mode-bar.spec.ts` for the canonical structural sweep (visibility matrix, active state, HeaderNameField swap).

## Programmatic Document Creation Pattern

Drive documents through Foundry's API, not the UI:

```ts
const weaponUuid = await createItem(page, 'weapon', {
  name: 'Test Sword',
  system: { weaponDamage: { damageRoll: '1d8+1' } },
});
const sheetSelector = await openDocumentSheet(page, weaponUuid);
```

`openDocumentSheet` polls until the sheet element is actually attached (AppV2's `render({force: true})` resolves before mount in some cases) and returns a `#sheet-id` selector. **Scope every subsequent locator to that selector** — multiple sheets can be open at once.

## Authentication

- `global-setup.ts` joins as `gm` once, saves `storageState` — all tests start as GM by default.
- For player view, spin a fresh context with `storageState: undefined` and call `loginAs(context, 'player')`.
- The snapshot world has fixed user names (`gm`, `player`) — `performJoin` filters the `/join` dropdown by name (case-insensitive).

## Settings and Field Overrides

```ts
import { setSystemSetting } from './helpers/setSystemSetting.mjs';
import { setFieldOverride } from './helpers/fieldOverrides.mjs';

await setSystemSetting(page, 'enforceSingleMaterial', true);
await setFieldOverride(page, weaponUuid, 'system.hp.value', 'visibility', 'gmOnly');
```

Field overrides write to `flags.dnd35e.fieldOverrides.{encodedPath}.{key}` — same flag the in-app override UI uses. `encodeFieldPath` from `fieldPermissions.mts` handles path escaping for keys that contain dots.

## Unit Test Companions (`tests/unit/`)

E2E specs are slow; pair them with unit tests for the extracted pieces:

- **`tests/unit/familiar/schema-walker.test.mts`** — covers the FormulaFamiliar schema walker in isolation
- **`tests/unit/effects/`** — Active Effect change normalization, secret-AE behavior
- **Pattern**: When an E2E reveals a complex pure function (e.g. `buildMaterialChanges`), extract it and add a unit test. The E2E then only has to prove integration, not algorithm correctness.

Run unit tests fast: `npx vitest run --project unit`. Run a single file: `npx vitest run tests/unit/path/to/file.test.mts`.

## When Tests Fail

1. **Read the actual rendered DOM** — `console.log` the locator's `innerHTML` or `getAttribute('title')`. Schemas evolve; what you remember may be stale.
2. **Check view mode** — is the surface you're asserting on actually rendered in the current mode?
3. **Check overlays** — did a notification appear and block your click?
4. **Check commit timing** — did you wait for the document update to round-trip, or only for the DOM to redraw?

## Related
- [vue-sheet-patterns.instructions.md](vue-sheet-patterns.instructions.md) — view modes and FormGroup behavior under test
- [dnd35e-field.instructions.md](dnd35e-field.instructions.md) — field permission cascade asserted by `field-permissions.spec.ts`
- [formula-familiar.instructions.md](formula-familiar.instructions.md) — FamiliarSchema structure asserted by `formula-familiar-weapon-name.spec.ts`
- Skill: `/e2e-testing` — step-by-step workflow for adding a new E2E spec
