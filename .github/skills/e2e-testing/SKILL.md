---
description: Step-by-step workflow for adding a new Playwright E2E spec. Use when proving a user-visible behavior end-to-end against real Foundry.
---

# E2E Testing — Adding a New Spec

A repeatable recipe for adding Playwright E2E coverage. Pair with [`e2e-testing.instructions.md`](../../instructions/e2e-testing.instructions.md) for selector/idiom reference.

## When to Reach for E2E (vs Unit)

| Question | Test type |
|----------|-----------|
| Is this a pure function or data transform? | **Unit** (`tests/unit/`) |
| Does the bug only repro when Foundry round-trips updates? | **E2E** |
| Does the behavior involve view mode, permissions, or sheet rendering? | **E2E** |
| Is this about how DataField initializes / validates? | **Unit** (`tests/unit/models/`) |
| Does it cross document boundaries (drag-drop, parent-child)? | **E2E** |

**Rule of thumb**: write the unit test for the pure piece, write the E2E for the integration. Don't use E2E as an excuse to skip unit coverage of complex pure functions — they get extracted (see `buildMaterialChanges` pattern).

## Workflow

### 1. Pick a Surface and Read Its DOM

Before writing the spec, open the sheet in a dev Foundry instance and inspect the relevant elements. Confirm:

- Root selector (`[data-field-path="..."]`, `.familiar-dropdown`, etc.)
- Whether the surface is mode-conditional (only renders in `play`/`true`?)
- Whether there's already a helper for this surface — check `tests/e2e/helpers/`

If the helper doesn't exist, **decide whether to add one**. Heuristic: if more than one spec will touch this surface, it deserves a helper module.

### 2. Sketch the Test as Assertions First

Write the assertions you want before the setup. This forces clarity:

```ts
// Goal:
// - Open a weapon sheet
// - Type "#" in the name formula field
// - Drill into Self → WeaponDamage → damageRoll
// - Confirm the resolved name is "1d8+1"
```

Then fill in the setup (document creation, sheet opening) and the interaction (typing, clicking, blurring).

### 3. Use Existing Helpers Aggressively

Don't inline `page.evaluate` for document CRUD or sheet rendering. The helpers in `tests/e2e/helpers/` are typed, tested, and known to handle Foundry's timing quirks:

```ts
import { gotoGame } from './helpers/session.mjs';
import { createItem, clearWorld } from './helpers/documents.mjs';
import { openDocumentSheet, closeAllSheets } from './helpers/sheets.mjs';

test.afterEach(async ({ page }) => {
  await closeAllSheets(page).catch(() => {});
  await clearWorld(page);
});

test('...', async ({ page }) => {
  await gotoGame(page);
  const uuid = await createItem(page, 'weapon', { name: 'Test', system: { ... } });
  const sheet = await openDocumentSheet(page, uuid);
  // ... interactions scoped to `sheet` ...
});
```

### 4. Write Stable Selectors

Use the priority order from the instruction file:
1. `data-field-path`
2. `title` attribute
3. Schema-derived class names
4. Direct document access via `page.evaluate(uuid => ...)`

Avoid `:has-text()` and content-based selectors for anything that goes through the localization bundle.

### 5. Handle the Three Pitfalls Up Front

```ts
import { dismissOverlays } from './helpers/ui.mjs';

await dismissOverlays(page);                       // overlay interception
await input.click();
await input.fill('');
await page.keyboard.type('#');
// ... interaction ...
await page.keyboard.press('Tab');                  // commit via real blur
await expect.poll(async () =>                      // wait for round-trip
  page.evaluate(async (id) => (await (globalThis as any).fromUuid(id))?.name, uuid)
).toBe('expected');
```

### 6. Run Locally Before Committing

```powershell
# Single spec
npx playwright test tests/e2e/your-spec.spec.ts

# With trace (when debugging)
npx playwright test tests/e2e/your-spec.spec.ts --trace on

# Headed (watch it run)
npx playwright test tests/e2e/your-spec.spec.ts --headed
```

If Foundry isn't running, Playwright's `webServer` block boots it. If it's already running on port 31000, Playwright reuses it.

### 7. Decompose if It Got Hard

If the spec required complex logic to drive a single surface, **extract a helper before merging**. Helpers are easier to evolve than inlined spec code.

If the spec exposed a complex pure function inside a class, **extract the function and add a unit test** (see `buildMaterialChanges` extraction in cycle C2). The E2E then only needs to prove integration.

## Naming Conventions

- Spec filename: `{surface-or-feature}.spec.ts` — kebab-case
- Helper filename: `{surface}.mts` — camelCase if multi-word (e.g. `familiarDropdown.mts`)
- Test description: start with the user role, then the action, then the outcome
  - Good: `'GM opens weapon sheet, drills into Self.weaponDamage, and the resolved name reflects in the header'`
  - Bad: `'name formula test'`

## Common Specs to Reference

| Spec | Pattern it demonstrates |
|------|-------------------------|
| `formula-familiar-weapon-name.spec.ts` | Stable-selector drill, Tab-commit, poll-for-round-trip |
| `field-permissions.spec.ts` | Flag-based override writes, GM-vs-player session swapping |
| `material-single-per-type.spec.ts` | System setting toggling, validation surfaces |
| `material-details-changes-tab.spec.ts` | Tab navigation, AE-changes assertions |
| `secret-ae.spec.ts` | Active Effect lifecycle on items |

## When You Get Stuck

- **DOM doesn't match expectation**: `console.log(await locator.innerHTML())` — schemas evolve.
- **Click doesn't register**: `dismissOverlays(page)`.
- **Value doesn't commit**: switch `input.blur()` → `page.keyboard.press('Tab')`.
- **Locator not found**: check view mode. Is the surface only rendered in `play`/`true`?
- **Test flakes locally but passes in CI**: probably a race — add `expect.poll` instead of `waitForTimeout`.

## Related
- [`e2e-testing.instructions.md`](../../instructions/e2e-testing.instructions.md) — selector/idiom reference
- [`vue-sheet-patterns.instructions.md`](../../instructions/vue-sheet-patterns.instructions.md) — view-mode behavior
- [`formula-familiar.instructions.md`](../../instructions/formula-familiar.instructions.md) — FamiliarSchema reference
