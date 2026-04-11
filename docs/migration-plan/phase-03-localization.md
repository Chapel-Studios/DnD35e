# Phase 3: Localization Pattern

**Status**: 🔶 In Progress (75% — infrastructure complete, FormGroup auto-labels working, schema-driven localization active)

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

- [ ] **Pre-Localization of CONFIG Objects**:
  - [ ] Create pre-localization utility (follows dnd5e pattern)
  - [ ] Register hook: `Hooks.once('i18nInit', () => _preLocalizeConfig(CONFIG.DND35E))`
  - [ ] Pre-localize CONFIG.DND35E.abilities, skills, sizes, damageTypes, weaponTypes, armorTypes, materialTypes, damageReductionTypes

- [ ] **Remaining Hardcoded String Audit**:
  - [ ] Audit all Vue components for remaining hardcoded English strings not covered by FormGroup auto-labels
  - [ ] Audit section headings, button labels, notification messages, chat messages
  - [ ] Replace with `game.i18n.localize('dnd35e.COMMON.*')` or domain-specific keys

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
