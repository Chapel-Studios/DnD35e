# Phase 3 — Button & Message Text Audit (Task 3.3)

**Status**: Audit complete. Implementation (Tasks 3.4, 3.5) not started.

---

## FINDINGS

### Hardcoded English in button/control attributes

| File | Line | Issue | Action |
|------|------|-------|--------|
| `src/entities/items/components/Physical/sheet/components/ItemQuantity.vue` | 16 | `:title="'Is Infinite'"` — raw string, not i18n key | Replace with `game.i18n.localize('dnd35e.PHYSICAL_ITEM.FIELDS.quantity.IsInfinite')` (new key) |
| `src/vue/components/Fields/FormGroups/RichTextEditorFormGroup.vue` | 18 | `` :aria-label="`Edit ${label \|\| 'content'}`" `` — interpolated raw English | Replace with localized template e.g. `game.i18n.format('dnd35e.UI.EditField', { field: label \|\| game.i18n.localize('dnd35e.UI.Content') })` |

### Deprecated components — skip
| File | Issue | Decision |
|------|-------|---------|
| `src/vue/components/LandingPad.vue` | `"Drop materials here"` (line 13), `✕` button text (line 30) | Component is `@deprecated` and unused — defer/ignore |
| `src/entities/activeEffects/material/sheet/MaterialsLandingPad.vue` | Consumes deprecated LandingPad | Also `@deprecated` — skip |

### Already clean — no action needed
- All `ui.notifications.*` calls: ✓ all use `game.i18n.localize()` with proper keys
- All `DialogV2.confirm()` calls: ✓ all use `game.i18n.localize()` with proper keys
- Math operator symbols (`+`, `×`, `=`, `↑`, `↓`) in `HasActiveEffectsNotification.vue`: ✓ these are universal symbols, not localizable text
- All settings buttons (Save/Reset/Add/Delete): ✓ all use `localize()` with `dnd35e.SETTINGS.*` or `dnd35e.COMMON.*` keys
- All effects list buttons (Create, Edit, Delete, Toggle): ✓ all use `createLocalizedComputed()` or `game.i18n.localize()`

---

## New lang keys required

| Key | Text | File needed in |
|-----|------|----------------|
| `dnd35e.PHYSICAL_ITEM.FIELDS.quantity.IsInfinite` | "Is Infinite" | `src/lang/en/items.json` |
| `dnd35e.UI.EditField` | "Edit {field}" (format string) | `src/lang/en/common.json` |
| `dnd35e.UI.Content` | "content" (fallback for RichText aria-label) | `src/lang/en/common.json` |

---

## Summary — all three audits complete

### Total items requiring implementation across all audits:

**Magic Strings (2.2/2.3)**:
- Group A: 14 files with raw `'dnd35e'` → `SYSTEM_ID`
- Group B: new `cssClasses.mts` constants (3 constants, 9 files)
- Group C: 3 occurrences in `IdentifiableItem.mts` → `secretEffectType`
- Group D: 2 occurrences in `ColorFormGroup.vue` → local `DEFAULT_COLOR`

**Sheet UI Text (3.4/3.5)**:
- Category 1: 8 raw English `label` props → remove (auto-derive from schema)
- Category 2: 3 hardcoded computed/inline strings → `game.i18n.localize()`
- 1 non-standard key format in `DesignedForSize.vue` to investigate

**Button/Message Text (3.4/3.5 continued)**:
- 1 raw `:title` in `ItemQuantity.vue`
- 1 raw `aria-label` in `RichTextEditorFormGroup.vue`

**New lang keys needed** (check what already exists before adding):
- `dnd35e.EQUIPPABLE.FIELDS.isCarried.label`
- `dnd35e.EQUIPPABLE.FIELDS.isEquipped.label`
- `dnd35e.EQUIPPABLE.FIELDS.isWeightlessWhenEquipped.label`
- `dnd35e.PHYSICAL_ITEM.FIELDS.hp.label`
- `dnd35e.PHYSICAL_ITEM.FIELDS.quantity.IsInfinite`
- `dnd35e.UI.EditField`
- `dnd35e.UI.Content`
