# POC Phase 3: Localization Pattern

**Status**: ✅ Complete

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

All FormGroup wrapper components (`NumberFormGroup`, `SelectFormGroup`, `TextFormGroup`, `CheckBoxFormGroup`, `ToggleSwitchFormGroup`, `ColorFormGroup`, `MultiSelectFormGroup`, `RichTextEditorFormGroup`, `CoinageFormGroup`, `FormulaFormGroup`) delegate to `FormGroup.vue`, which handles auto-derivation.

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
| **1.1: Create pre-localization utility** | Lead dev | 1.2 | ✅ Complete. `src/helpers/localization/preLocalizeConfig.mts` created with `registerConfigPreLocalization()` and `preLocalizeConfig()`. |
| **1.2: Register i18nInit hook + add CONFIG keys to lang files** | Lead dev | 1.3 | ✅ Complete. `Hooks.once('i18nInit', ...)` in `main.mts`; `SIZES_CONFIG`, `WEAPON_TYPES_CONFIG`, `DAMAGE_REDUCTION_TYPES_CONFIG` added to CONFIG; lang keys added to `attacks.json`. |
| **1.3: Verify pre-localization at runtime** | Lead dev | None | ✅ Complete. Live-merge pattern verified in MaterialStore, PhysicalItemStore, DamageReductionTable. |

---

## Deliverable 2: Magic Strings → Constants

**Goal**: Replace hardcoded strings (2+ occurrences or enum-like values) with named constants for maintainability and consistency.

**Scope**: Two types of hardcoded strings:
1. **Magic strings**: Color hex codes, status/state strings (`'edit'`, `'play'`, `'true'`, `'active'`, `'disabled'`), enum values, DOM class names, log levels
2. **No scope for user-visible text** — that's Deliverable 3

| Task | Routing | Blocking | Details |
|------|---------|----------|---------|
| **2.1: Audit codebase for magic strings** | Jr dev or flexible | 2.2 | ✅ Complete. Groups A–D documented. |
| **2.2: Extract magic strings to constants** | Jr dev | 2.3 | ✅ Complete. Created `src/constants/cssClasses.mts` (VUE_APP_CLASS, ITEM_SHEET_CLASS, SETTINGS_CONFIG_CLASS). Exported from `src/constants/index.mts`. |
| **2.3: Update code to import & use constants** | Jr dev or flexible | None | ✅ Complete. All 4 groups replaced: SYSTEM_ID (14 locations), CSS classes (9 files), secretEffectType (3 locations), DEFAULT_COLOR (ColorFormGroup.vue). |

---

## Deliverable 3: User-Visible Text Audit & Localization

**Goal**: Exhaustive localization of all user-facing text (section headers, buttons, messages, dropdown labels, etc.). Two categories:
1. **Formula Familiar dropdown**: Replace raw prop names with localized labels (PRIORITY)
2. **Sheet UI & action text**: Section headers, tabs, button labels, notification messages

| Task | Routing | Blocking | Details |
|------|---------|----------|---------|
| **3.1: Formula Familiar dropdown — prop names → localized labels** | Lead dev | 3.4 | ✅ Complete. Full locale-transparent formula system implemented: (1) `gatherAspectsFromSchema` uses `ModelClass.schema.fields` (cached, localized via `LOCALIZATION_PREFIXES`) — `field.label` carries pre-localized text. `AspectGroup` keys remain canonical schema field names; `FieldAspect.display` carries the localized label. (2) `normalizeLabel()` converts display labels to PascalCase identifiers for use in `localizeFormula`/`canonicalizeFormula` — never used for tree keys. (3) `VARIABLE_REGEX` updated to `[\p{L}\p{N}_]+` (Unicode-aware) so Polish/Czech/etc names are recognized in stored formulas. (4) `localizeFormula(stored, schema)` translates `#self.hardness` → `#Self.Hardness` (en) / `#Siebie.Twardość` (pl) for display. (5) `canonicalizeFormula(display, schema)` reverses this: `#Siebie.Twardość` → `#self.hardness` for storage. (6) `FormulaFormGroup` and `AspectPicker` wired: display uses `localizeFormula`, save uses `canonicalizeFormula`. Autocomplete matches and inserts localized names; `fullPath` is the localized insertion text. (7) `buildDocumentFamiliar` derives localized context display names (`dnd35e.Formula.Context.Self`) and stores them in `FamiliarContext.display`. Result: stored formula is always canonical (`#self.hardness`); user sees and types localized form (`#Self.Hardness` / `#Siebie.Twardość`). |
| **3.2: Sheet UI text audit — section headers, tabs, group labels** | Jr dev (lead review) | 3.4 | ✅ Complete. 8 raw label props + 3 inline strings identified and documented. |
| **3.3: Button labels & action messages audit** | Jr dev | 3.4 | ✅ Complete. 2 raw button/aria strings found; deprecated LandingPad deferred. |
| **3.4: Add localization keys to lang files** | Jr dev or flexible | 3.5 | ✅ Complete. Added `equippedSlotIds` to EQUIPPABLE.FIELDS, `IsInfinite` to quantity, `dnd35e.UI.EditField` and `dnd35e.UI.Content` to common.json. |
| **3.5: Wire localization into components** | Jr dev (lead reviews) | 3.6 | ✅ Complete. Removed 8 raw label props (auto-derive from schema), fixed 3 inline strings, fixed 2 button/aria strings. Build clean. |
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
- **Contributor Documentation** (`TRANSLATION.md`, translator guide) — deferred to Community Hardening (`release/phase-07-community-hardening.md`)
- **Localization Team Workflow for Item Content** — deferred to Community Hardening (Phase 31) as a separate workflow where localization contributors can localize item content; explicitly out of Phase 3 implementation scope.

---

**This Phase Completes Before**: Phase 4 and all subsequent phases, which will use localized strings throughout

**This Phase Enables**: 
- All Vue components in later phases get field labels/hints automatically from schema
- New DataModels just need `LOCALIZATION_PREFIXES` + lang file entries — no component-level label wiring
- Multi-language support foundation is in place
- Compendium content (Phase 4) can be localized
