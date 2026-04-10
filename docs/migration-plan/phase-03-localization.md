# Phase 3: Localization Pattern

**Status**: 🔶 In Progress (50% - i18n framework, CONFIG pre-localization)

> **Milestone**: POC  
> **Dependencies**: None  
> **Goal**: Establish the i18n pattern before building real UI. All subsequent phases use localized strings exclusively. Pre-localize CONFIG objects at init time.

---

## 3.1 What to Set Up

- Verify the Vite lang merge plugin works correctly (merges `src/lang/en/*.json` → `dist/lang/en.json`)
- Establish key naming conventions: `DND35E.{Category}.{Subcategory}.{Key}`
- Create foundational lang files:
  - `common.json` — shared terms (save, cancel, edit, etc.)
  - `abilities.json` — STR, DEX, CON, INT, WIS, CHA and their full names
  - `actors.json` — actor type labels, sheet labels
  - `ui.json` — sheet chrome (tabs, buttons, headers)
- Ensure Vue components use `game.i18n.localize()` or `game.i18n.format()` — no hardcoded strings
- Audit existing weapon/material/effect sheets for hardcoded strings and replace with i18n keys

## 3.2 Pre-localization of CONFIG

Pre-localize CONFIG objects at system init time so Vue templates can use them directly without repeated `game.i18n.localize()` calls:

```typescript
// In system init hook
Hooks.once('i18nInit', () => {
  _preLocalizeConfig(CONFIG.DND35E);
});

function _preLocalizeConfig(config: Record<string, any>) {
  // Walk CONFIG.DND35E and replace i18n keys with localized strings
  // e.g., CONFIG.DND35E.abilities.str.label = game.i18n.localize("DND35E.Ability.Str.Label")
}
```

This follows the dnd5e pattern. CONFIG objects like `abilities`, `skills`, `sizes`, `damageTypes`, `weaponTypes`, etc. are all pre-localized once, then referenced directly in Vue components and select dropdowns.

## 3.3 Conventions

```
DND35E.Ability.Str.Label        = "Strength"
DND35E.Ability.Str.Abbr         = "STR"
DND35E.Item.Weapon.Label        = "Weapon"
DND35E.Item.Weapon.Fields.Damage = "Damage"
DND35E.Sheet.Tab.Details        = "Details"
DND35E.Sheet.Tab.Effects        = "Effects"
DND35E.Sheet.Action.Edit        = "Edit"
DND35E.Sheet.Action.Delete      = "Delete"
```

## 3.4 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/lang/en/abilities.json` |
| Create | `src/lang/en/actors.json` |
| Create | `src/lang/en/ui.json` |
| Create | Pre-localization utility function |
| Audit | All existing Vue components — replace hardcoded strings |
| Verify | Vite lang merge plugin output |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 3 has not started)

### ❌ Not Started (All Tasks for Phase 3)
- [ ] **Core Language Files**:
  - [ ] Create `src/lang/en/abilities.json` with ability names/abbreviations (Strength, STR; Dexterity, DEX; etc.)
  - [ ] Create `src/lang/en/actors.json` with actor type labels (Character, NPC, Monster), sheet chrome labels
  - [ ] Create `src/lang/en/common.json` with shared UI strings (Save, Cancel, Edit, Delete, Confirm, etc.)
  - [ ] Create `src/lang/en/ui.json` with sheet tabs and common UI labels (Details, Effects, Description, etc.)
  
- [ ] **Phase 1-2 Component Audit & Replacement**:
  - [ ] Audit weapon sheet Vue components for hardcoded strings
  - [ ] Replace all hardcoded labels with i18n keys (e.g., "Weapon Type" → `DND35E.Item.Weapon.Fields.Type`)
  - [ ] Audit Material AE sheet for hardcoded strings
  - [ ] Replace all hardcoded labels with i18n keys in effect sheet
  - [ ] Verify no hardcoded strings remain in Phase 1-2 files
  
- [ ] **Pre-Localization CONFIG Setup**:
  - [ ] Create pre-localization utility function in `src/helpers/preLocalize.mts`
  - [ ] Function walks CONFIG object recursively and replaces i18n keys with localized strings
  - [ ] Register hook: `Hooks.once('i18nInit', () => _preLocalizeConfig(CONFIG.DND35E))`
  - [ ] Pre-localize CONFIG.DND35E.abilities (with abbreviations)
  - [ ] Pre-localize CONFIG.DND35E.skills
  - [ ] Pre-localize CONFIG.DND35E.sizes (Fine, Diminutive, Tiny, Small, Medium, Large, Huge, Gargantuan)
  - [ ] Pre-localize CONFIG.DND35E.damageTypes (Bludgeoning, Piercing, Slashing, etc.)
  - [ ] Pre-localize CONFIG.DND35E.damageReductionTypes
  - [ ] Pre-localize CONFIG.DND35E.weaponTypes (Simple, Martial, Exotic, Natural, Firearm)
  - [ ] Pre-localize CONFIG.DND35E.armorTypes
  - [ ] Pre-localize CONFIG.DND35E.materialTypes (Steel, Mithral, Adamantite, etc.)
  
- [ ] **Vite Plugin Verification**:
  - [ ] Verify Vite lang merge plugin is configured correctly
  - [ ] Test build pipeline: `src/lang/en/*.json` → `dist/lang/en.json`
  - [ ] Verify merged lang file includes all language keys
  - [ ] Test system loads language file correctly after build
  - [ ] Test fallback to English if language file missing
  
- [ ] **Naming Convention Documentation**:
  - [ ] Document i18n key naming pattern: `DND35E.{Category}.{Subcategory}.{Key}`
  - [ ] Examples: `DND35E.Ability.Str.Label`, `DND35E.Item.Weapon.Label`, `DND35E.Sheet.Action.Edit`
  - [ ] Add style guide to docs for future translators
  - [ ] Ensure all keys follow PascalCase convention
  
- [ ] **Testing & Validation**:
  - [ ] Unit test: Pre-localization function correctly replaces keys
  - [ ] Unit test: CONFIG.DND35E.abilities[0].label is localized string, not i18n key
  - [ ] Integration test: Weapon sheet displays all labels from i18n
  - [ ] Integration test: Material AE sheet displays all labels from i18n
  - [ ] Smoke test: Load system in Foundry, verify no missing translation warnings
  - [ ] Test: Change system language in Foundry settings, verify UI updates
  
- [ ] **Future-Proofing**:
  - [ ] Document how translators should structure new language files
  - [ ] Create template: `src/lang/en/` structure for community translators
  - [ ] Leave TODO comment about German/French/Spanish translations (future post-release work)
  - [ ] Create `TRANSLATION.md` guide for contributors

---

**This Phase Completes Before**: Phase 4 and all subsequent phases, which will use localized strings throughout

**This Phase Enables**: 
- All Vue components in later phases can use i18n immediately
- Compendium content (Phase 4) can be localized
- Multi-language support foundation is in place
