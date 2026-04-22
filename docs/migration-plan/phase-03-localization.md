# Phase 3: Localization Pattern

**Status**: ✅ Approved

> **Milestone**: POC  
> **Dependencies**: None  
> **Goal**: Establish the i18n pattern before building real UI. All subsequent phases use localized strings exclusively. Leverage Foundry's `LOCALIZATION_PREFIXES` for automatic field label/hint localization.

---

## Architecture (Implemented)

### Foundry `LOCALIZATION_PREFIXES` + `FIELDS` Pattern

At startup, Foundry's `Localization.localizeDataModel()` walks every DataModel's schema and **mutates** each field's `.label`, `.hint`, and `.placeholder` from the language file. This is the canonical Foundry v14 mechanism — no manual `game.i18n.localize()` calls needed for DataModel field labels.

**How it works:**
1. Each DataModel declares `static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "dnd35e.MODEL_NAME"]`
2. The language file has a `dnd35e.MODEL_NAME.FIELDS` section with nested objects matching field paths
3. Foundry walks the schema, matches field paths to FIELDS entries, and sets `field.options.label` / `field.options.hint` as **pre-localized text**
4. FormGroup components read the pre-localized text directly — no `localize()` call needed

### Namespace Convention

All keys use the `dnd35e` namespace prefix with nested hierarchical structure:
```
dnd35e.MODEL_NAME.FIELDS.fieldName.label   — auto-localized field labels
dnd35e.MODEL_NAME.FIELDS.fieldName.hint    — auto-localized field hints
dnd35e.MODEL_NAME.EnumName.value           — enum display values (manual localize)
dnd35e.COMMON.*                            — shared UI strings (manual localize)
dnd35e.SETTINGS.*                          — system settings (Foundry auto-localizes)
```

### FormGroup Auto-Label Derivation

`FormGroup.vue` auto-derives labels and hints from the schema:

- **`resolvedLabel`**: If explicit `label` prop → `game.i18n.localize(label)`. Otherwise → `schemaField.options.label` (pre-localized text).
- **`resolvedHint`**: If explicit `hint` prop → `game.i18n.localize(hint)`. Otherwise → `schemaField.options.hint` (pre-localized text).
- Schema field lookup via `getSchemaField(fieldPath)` from `FieldOverridesStore`, which traverses `document.system.schema._getField()` — correctly resolves inherited fields through the model hierarchy.

This means most FormGroup consumers need **no explicit label or hint** — just a `fieldPath` is sufficient.

### Deep Merge Vite Plugin

The Vite build plugin uses `deepmerge` to combine split `src/lang/en/*.json` files into a single `dist/lang/en.json`. Nested FIELDS objects from different files merge correctly.

---

## 3.1 LOCALIZATION_PREFIXES Hierarchy (Implemented)

All DataModels have `LOCALIZATION_PREFIXES` with additive cascade:

| Model | Prefix | Fields Localized |
|-------|--------|-----------------|
| `Dnd35eDocumentSystemModel` | `dnd35e.DOCUMENT` | version, slug, derivedName, nameFormula, description |
| `ItemSystemModelBase` | `dnd35e.ITEM` | origin, isPsionic, isEpic |
| `IdentifiableItemSystemModel` | `dnd35e.IDENTIFIABLE` | isIdentifiable, isIdentified |
| `PhysicalItemSystemModel` | `dnd35e.PHYSICAL_ITEM` | hp, hardness, quantity, weight, price, size, etc. |
| `EquippableItemSystemModel` | `dnd35e.EQUIPPABLE` | isEquipped, isMelded, designedForSize, etc. |
| `WeaponSystemModel` | `dnd35e.WEAPON` | isMasterwork, weaponType, weaponSubtype, weaponDamage, etc. |
| `ActiveEffectSystemModelBase` | `dnd35e.EFFECT` | (effect fields) |
| `MaterialSystemModel` | `dnd35e.MATERIAL` | bonusHp, magicEquivalency, etc. |

Prefix resolution is left-to-right; later prefixes override earlier ones for the same field path.

## 3.2 Language Files (Implemented)

Current split files under `src/lang/en/`:

| File | Namespace | Content |
|------|-----------|---------|
| `common.json` | `dnd35e.COMMON` | Shared UI strings |
| `items.json` | `TYPES.Item.*`, `dnd35e.ITEM`, `dnd35e.PHYSICAL_ITEM`, `dnd35e.EQUIPPABLE` | Item type labels + field labels/hints |
| `weapons.json` | `dnd35e.WEAPON` | Weapon field labels/hints + enum values (Type, Subtype, Property) |
| `attacks.json` | `dnd35e.ATTACK` | Damage types, DR types |
| `effects.json` | `dnd35e.EFFECT`, `dnd35e.MATERIAL` | Effect + material field labels/hints |
| `settings.json` | `dnd35e.SETTINGS` | System settings names/hints |

## 3.3 FormGroup Consumers (Current Status)

All FormGroup wrapper components (`NumberFormGroup`, `SelectFormGroup`, `TextFormGroup`, `CheckBoxFormGroup`, `ToggleSwitchFormGroup`, `ColorFormGroup`, `MultiSelectFormGroup`, `RichTextEditorFormGroup`, `ItemPriceFormGroup`, `FormulaFormGroup`) delegate to `FormGroup.vue`, which handles auto-derivation.

**All current consumers rely on auto-derived labels** — explicit `label` props have been removed from:
- `MaterialDetails.vue` — bonusHp
- `MagicEquivalency.vue` — magicEquivalency  
- `ItemHardness.vue` — hardness
- `ItemWeight.vue` — weight
- `ItemQuantity.vue` — quantity
- `WeaponSummary.vue` — weaponType, weaponSubtype
- `EffectDuration.vue` — duration fields
- `HealthSettingsApp.vue` — health setting fields
- `UniqueId.vue` — slug
- `ItemSize.vue` — size
- `ItemPrice.vue` — price
- `DisableEffect.vue` — disabled toggle
- `Tint.vue` — tint color

---

## Completion Checklist

### ✅ Complete

- [x] **Foundry LOCALIZATION_PREFIXES Infrastructure**:
  - [x] All 8 DataModels have `static LOCALIZATION_PREFIXES` with additive cascade
  - [x] Labels/hints removed from field constructor calls — Foundry auto-localizes from lang files
  - [x] Prefix hierarchy verified: fields resolve correctly through inheritance chain

- [x] **Nested Language Files (Deep Merge)**:
  - [x] Vite lang merge plugin upgraded to deep merge (uses `deepmerge` library)
  - [x] All lang files converted from flat keys to nested `dnd35e.*` hierarchy
  - [x] `common.json` — `dnd35e.COMMON.*`
  - [x] `items.json` — `TYPES.Item.*`, `dnd35e.ITEM.FIELDS.*`, `dnd35e.PHYSICAL_ITEM.FIELDS.*`, `dnd35e.EQUIPPABLE.FIELDS.*`
  - [x] `weapons.json` — `dnd35e.WEAPON.FIELDS.*`, `dnd35e.WEAPON.Type.*`, `dnd35e.WEAPON.Property.*`
  - [x] `attacks.json` — `dnd35e.ATTACK.*`
  - [x] `effects.json` — `dnd35e.EFFECT.FIELDS.*`, `dnd35e.MATERIAL.FIELDS.*`
  - [x] `settings.json` — `dnd35e.SETTINGS.*`
  - [x] UTF-8 BOM removed from all lang JSON files

- [x] **FormGroup Auto-Label Derivation**:
  - [x] `FormGroup.vue` auto-derives label from `schemaField.options.label` (pre-localized)
  - [x] `FormGroup.vue` auto-derives hint from `schemaField.options.hint` (pre-localized)
  - [x] Explicit `label`/`hint` props still supported as overrides (treated as localization keys)
  - [x] `getSchemaField()` exposed from `FieldOverridesStore` as public utility
  - [x] Schema traversal correctly resolves inherited fields (e.g., `weight` on weapon resolves to `PHYSICAL_ITEM`)

- [x] **Dead Code / Cleanup**:
  - [x] Deleted `unidentifiedOverrides.mts` (dead code — all references commented out)
  - [x] Removed `decodeFieldPath` export from `fieldPermissions.mts` (only consumer was deleted file)

- [x] **Naming Convention**:
  - [x] Standardized on `dnd35e.*` namespace (not `DND35E.*` or `D35E.*`)
  - [x] `LOCALIZATION_PLAN.md` documents full key hierarchy and conventions

### ❌ Remaining Tasks

Phase 3 Completion decomposed into three parallel tracks:

---

## Deliverable 1: CONFIG Pre-Localization

**Goal**: All CONFIG.DND35E enums are pre-localized at `i18nInit` hook, enabling downstream code to reference pre-localized display names.

| Task | Routing | Blocking | Details |
|------|---------|----------|---------|
| **1.1: Create pre-localization utility** | Lead dev | 1.2 | Create `src/helpers/localization/preLocalizeConfig.mts` following dnd5e pattern. Recursively pre-localizes nested CONFIG objects, handles arrays, sets `.label` property on enum entries. Success: Function exists with JSDoc, handles nested structures. |
| **1.2: Register i18nInit hook + add CONFIG keys to lang files** | Lead dev | 1.3 | Add `Hooks.once('i18nInit', () => preLocalizeConfig(CONFIG.DND35E))` to `main.mts`. Add localization keys to `src/lang/en/common.json` for: `dnd35e.CONFIG.Abilities.*`, `dnd35e.CONFIG.Skills.*`, `dnd35e.CONFIG.Sizes.*`, `dnd35e.CONFIG.DamageTypes.*`, `dnd35e.CONFIG.WeaponTypes.*`, `dnd35e.CONFIG.ArmorTypes.*`, `dnd35e.CONFIG.MaterialTypes.*`, `dnd35e.CONFIG.DamageReductionTypes.*`. Success: Hook registered, keys added, build succeeds. |
| **1.3: Verify pre-localization at runtime** | Lead dev | None | Test in dev mode that CONFIG.DND35E enums have `.label` properties after i18nInit. Can log `CONFIG.DND35E.abilities.str.label` and see localized text. Success: Pre-localized values visible and correct. |

---

## Deliverable 2: Magic Strings → Constants

**Goal**: Replace hardcoded strings (2+ occurrences or enum-like values) with named constants for maintainability and consistency.

**Scope**: Two types of hardcoded strings:
1. **Magic strings**: Color hex codes, status/state strings (`'edit'`, `'play'`, `'true'`, `'active'`, `'disabled'`), enum values, DOM class names, log levels
2. **No scope for user-visible text** — that's Deliverable 3

| Task | Routing | Blocking | Details |
|------|---------|----------|---------|
| **2.1: Audit codebase for magic strings** | Jr dev or flexible | 2.2 | Grep for hardcoded patterns that appear 2+ times or represent an enum/type. Document 10+ magic strings grouped by category. Success: Comprehensive list of candidates with locations. |
| **2.2: Extract magic strings to constants** | Jr dev | 2.3 | Create constants files as needed (`src/constants/colors.mts`, `src/constants/viewModes.mts`, `src/constants/states.mts`). Move strings into named constants. Update exports in `src/constants/index.mts`. Success: All magic strings have a home, no duplication. |
| **2.3: Update code to import & use constants** | Jr dev or flexible | None | Replace hardcoded strings with imported constants across codebase. Verify no regressions in build/tests. Success: All magic strings replaced exhaustively. |

---

## Deliverable 3: User-Visible Text Audit & Localization

**Goal**: Exhaustive localization of all user-facing text (section headers, buttons, messages, dropdown labels, etc.). Two categories:
1. **Formula Familiar dropdown**: Replace raw prop names with localized labels (PRIORITY)
2. **Sheet UI & action text**: Section headers, tabs, button labels, notification messages

| Task | Routing | Blocking | Details |
|------|---------|----------|---------|
| **3.1: Formula Familiar dropdown — prop names → localized labels** | Lead dev | 3.4 | Locate formula familiar dropdown component displaying property names. Add mapping from prop names to localization keys. Update lang files with `dnd35e.FORMULA_FAMILIAR.PROPERTIES.*` entries. Update component to use `game.i18n.localize(key)` for display. Success: Dropdown shows human-readable localized labels, not raw prop names. |
| **3.2: Sheet UI text audit — section headers, tabs, group labels** | Jr dev (lead review) | 3.4 | Search all `src/vue/**/*.vue` components for hardcoded text in section headings (`<h3>`, `<h4>`, `<legend>`), tab labels, group labels, form section titles. Document each location (file + line) and current text. Identify which should use auto-derived labels vs. new keys. Success: Comprehensive list of 20+ hardcoded UI strings. |
| **3.3: Button labels & action messages audit** | Jr dev | 3.4 | Search for hardcoded text in: `<button>` labels/titles, `.textContent`/`.innerText` in templates, notification messages (toasts, dialogs), chat messages. Document locations and current text. Success: List of button/message strings (10+). |
| **3.4: Add localization keys to lang files** | Jr dev or flexible | 3.5 | Create/update lang file sections for all strings identified in 3.2 + 3.3. Organize by domain: `dnd35e.UI.*`, `dnd35e.MESSAGES.*`, `dnd35e.BUTTONS.*`, `dnd35e.FORMULA_FAMILIAR.*`. Ensure keys are descriptive and reusable. Success: All keys from 3.2 + 3.3 have entries. |
| **3.5: Wire localization into components** | Jr dev (lead reviews) | 3.6 | Update all components with hardcoded text to use `game.i18n.localize()`. Replace direct text with computed/rendered localized values. Handle dynamic text (interpolation) if needed. Success: No hardcoded English strings visible to user, all replaced with localization calls. |
| **3.6: Verify user-visible localization exhaustively** | Lead dev | None | Run dev build. Manually test all sheets (items, weapons, effects, materials). Check: section headers, tabs, buttons, dropdowns, tooltips all show localized text. Switch language in settings (test with another language if available). Success: Zero hardcoded English text visible in UI. |

---

## Parallelization Strategy

- **CONFIG (Deliverable 1)** → Start now, independent track
- **Magic Strings (Deliverable 2)** → Start now in parallel with CONFIG
- **User-Visible Text (Deliverable 3)** →
  - 3.1 (Formula Familiar) is priority, should start after CONFIG available (Task 1.3)
  - 3.2 + 3.3 can run in parallel with CONFIG + Magic Strings
  - 3.4 + 3.5 sequence after audits complete
  - 3.6 is final verification gate

## Execution Sequence

1. **Wave 1** (start now in parallel):
   - Task 1.1 (CONFIG utility)
   - Task 2.1 (Magic strings audit)
   - Task 3.2 (Sheet UI audit)

2. **Wave 2** (after Wave 1):
   - Task 1.2 (Register hook + lang keys)
   - Task 2.2 (Extract constants)
   - Task 3.3 (Button/message audit)

3. **Wave 3** (after specific 1.2 complete):
   - Task 1.3 (Verify CONFIG)
   - Task 3.1 (Formula Familiar — needs CONFIG available)

4. **Wave 4** (after all audits):
   - Task 2.3 (Use constants)
   - Task 3.4 (Add lang keys)

5. **Wave 5** (final):
   - Task 3.5 (Wire localization)

6. **Final Gate**:
   - Task 3.6 (Exhaustive verification)

### Deferred to Other Phases

- **Additional Language Files** (`abilities.json`, `actors.json`, `ui.json`, etc.) — created as cross-cuts when each domain phase needs them (e.g., abilities.json when Phase 5 actor foundation is built)
- **Testing & Validation** — deferred until testing infrastructure is in place (Phase 14)
- **Contributor Documentation** (`TRANSLATION.md`, translator guide) — deferred to community hardening phase (Phase 28)

---

**This Phase Completes Before**: Phase 4 and all subsequent phases, which will use localized strings throughout

**This Phase Enables**: 
- All Vue components in later phases get field labels/hints automatically from schema
- New DataModels just need `LOCALIZATION_PREFIXES` + lang file entries — no component-level label wiring
- Multi-language support foundation is in place
- Compendium content (Phase 4) can be localized
