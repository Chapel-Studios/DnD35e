# Phase 3 — Magic Strings Audit (Task 2.1)

**Status**: Audit complete. Implementation (Tasks 2.2, 2.3) not started.

---

## GROUP A: 'dnd35e' literal → use `SYSTEM_ID`

`SYSTEM_ID` already exists: `src/settings/shared.mts` line 8.

Files that use raw `'dnd35e'` where `SYSTEM_ID` should be used:

| File | Line(s) | Usage |
|------|---------|-------|
| `src/entities/items/registration.mts` | 17 | `registerSheet('dnd35e', ...)` |
| `src/entities/activeEffects/registration.mts` | 53 | `registerSheet(..., 'dnd35e', ...)` |
| `src/entities/components/CoreMixin/sheet/DocumentSheetStore.mts` | 159, 245 | `setFlag/getFlag('dnd35e', ...)` |
| `src/entities/components/CoreMixin/sheet/stores/FieldOverridesStore.mts` | 146 | `getFlag('dnd35e', ...)` |
| `src/vue/apps/VueItemSheet.mts` | 12 | `classes: ['dnd35e', 'vueApp']` |
| `src/vue/apps/VueActiveEffectConfig.mts` | 12 | `classes: ['dnd35e', 'vueApp']` |
| `src/entities/items/baseItem/sheet/BaseItemSheet.mts` | 20 | `classes: ['dnd35e', 'item-sheet']` |
| `src/settings/skills/sheet/SkillSettingsConfig.mts` | 30 | `classes: ['dnd35e', 'vueApp', 'settings-config']` |
| `src/settings/roll/sheet/RollSettingsConfig.mts` | 30 | `classes: ['dnd35e', 'vueApp', 'settings-config']` |
| `src/settings/health/sheet/HealthSettingsConfig.mts` | 31 | `classes: ['dnd35e', 'vueApp', 'settings-config']` |
| `src/settings/gameRules/sheet/GameRulesSettingsConfig.mts` | 31 | `classes: ['dnd35e', 'vueApp', 'settings-config']` |
| `src/settings/display/sheet/DisplaySettingsConfig.mts` | 31 | `classes: ['dnd35e', 'vueApp', 'settings-config']` |
| `src/settings/currency/sheet/CurrencySettingsConfig.mts` | 27 | `classes: ['dnd35e', 'vueApp', 'settings-config']` |
| `src/settings/combat/sheet/CombatSettingsConfig.mts` | 30 | `classes: ['dnd35e', 'vueApp', 'settings-config']` |

Import path for all: `import { SYSTEM_ID } from '@settings/shared.mjs'` (or relative `../../shared.mjs` for settings files that already use relative imports).

---

## GROUP B: CSS class literals → new constants

Create `src/constants/cssClasses.mts`:
```ts
export const VUE_APP_CLASS = 'vueApp';
export const ITEM_SHEET_CLASS = 'item-sheet';
export const SETTINGS_CONFIG_CLASS = 'settings-config';
```

Export all three from `src/constants/index.mts`.

Usage locations:
| Constant | Files that need it |
|---|---|
| `VUE_APP_CLASS` | VueItemSheet.mts, VueActiveEffectConfig.mts, all 6 settings configs |
| `ITEM_SHEET_CLASS` | BaseItemSheet.mts |
| `SETTINGS_CONFIG_CLASS` | all 6 settings configs |

---

## GROUP C: `'secret'` literal → `secretEffectType`

`secretEffectType` constant exists: `src/entities/activeEffects/secret/secretEffectType.mts` (value: `'secret'`)

File that uses raw `'secret'` literal instead of the constant:
| File | Lines | Note |
|------|-------|------|
| `src/entities/components/Identifiable/IdentifiableItem.mts` | 116, 135, 140 | Should import `secretEffectType` from `@effects/secret/secretEffectType.mjs` |

---

## GROUP D: Default color `'#ffffff'` → local constant

File: `src/vue/components/Fields/FormGroups/ColorFormGroup.vue`
Lines: 12, 19 (both in template: `?? '#ffffff'`)

Fix: extract as local script constant `const DEFAULT_COLOR = '#ffffff'` — not worth a shared constants file (one component only).

---

## OUT OF SCOPE (already handled)

- `EDIT`/`PLAY`/`TRUE` view mode constants — defined in `src/helpers/formulae/types.mts` ✓
- `materialEffectType` / `secretEffectType` / `GENERAL_EFFECT_TYPE` — constants exist ✓
- `LogLevel` — constants exist in `src/constants/logging.mts` ✓
- Bonus type constants (`BONUS_TYPE_MATERIAL`, etc.) — constants exist ✓
- All hex colors in CSS/SCSS blocks — these are styling values in `<style>` blocks, not application logic; excluded from scope

---

## Implementation Plan (Tasks 2.2 + 2.3)

### Step 1: Create `src/constants/cssClasses.mts`
### Step 2: Export from `src/constants/index.mts`
### Step 3: Replace all Group A instances with `SYSTEM_ID`
### Step 4: Replace all Group B instances with CSS class constants
### Step 5: Fix Group C (`IdentifiableItem.mts`)
### Step 6: Fix Group D (`ColorFormGroup.vue` local constant)
### Step 7: `npm run build` — must be clean
