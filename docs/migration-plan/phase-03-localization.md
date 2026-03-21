# Phase 3: Localization Pattern

> **Status**: 🔜 Next  
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
