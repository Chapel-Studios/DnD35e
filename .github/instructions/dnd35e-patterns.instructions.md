---
description: "Use when understanding dnd35e architecture, component composition chains, DataModel patterns, or system conventions."
---

# D&D 3.5e System Architecture Patterns

## Component Composition Chain

dnd35e uses **mixin composition** rather than deep inheritance. Each layer adds schema, derivedData, and methods.

```
CoreMixin
  └── Identifiable (tracked state + secret-aware display behavior)
        └── PhysicalItem (weight, price, hardness, HP)
              └── EquippableItem (equipment slots, equipped state)
                    └── Weapon
                    └── Armor
                    └── etc.
```

**Key principle**: Each class extends the previous layer's `defineSchema()` and `prepareDerivedData()`.

```typescript
// PhysicalItem extends Identifiable
class PhysicalItemSystemModel extends Identifiable {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.weight = new fields.NumberField({ initial: 0 });
    schema.price = new fields.SchemaField({ ... });
    return schema;
  }
}

// EquippableItem extends PhysicalItem
class EquippableItemSystemModel extends PhysicalItemSystemModel {
  static defineSchema() {
    const schema = super.defineSchema();  // Gets everything from PhysicalItem
    schema.equipped = new fields.BooleanField({ initial: false });
    return schema;
  }
}
```

## Data Model Organization

| Layer | File Pattern | Responsibility |
|-------|--------------|-----------------|
| **Schema** | `*SystemModel.mts` | Define schema in `defineSchema()` |
| **Types** | `*SystemData.mts` | TypeScript types for runtime data |
| **Store** | `*Store.mts` | Pinia store with computed properties |
| **Document** | `*.mts` (Item/Actor class) | Document lifecycle hooks |

**Legacy fields may still be compound-shaped** — see `dnd35e-field.instructions.md` for compatibility rules.

## Formula Resolution

FormulaFamiliar enables `#context.property` syntax in formulas. Schema walker **includes all fields by default** (opt-out via `familiar: { formulaVisible: false }`).

```typescript
// In schema definition
schema.nameFormula = new fields.EmbeddedDataField(FormulaData, {
  initial: { formula: "#self.name" }
});
```

Reference at runtime:
```typescript
// Formula stored as: "Silver (+#self.hardness AC)"
// Automatically resolves to: "Silver (+5 AC)"
await item.system.nameFormula.resolveFormula({ self: item });
```

## Active Effects Pipeline

Two-phase application:

1. **Initial phase** (`prepareEmbeddedDocuments()`) — AEs created, unrelated to document state
2. **Final phase** (`prepareDerivedData()`) — AEs applied to item/actor, document state used

## Identifiable + ViewMode Model

The `Identifiable` mixin provides tracked/identified state, while sheet presentation is controlled by `ViewMode` (`edit` / `play` / `true`).

```typescript
interface Identifiable {
  system.isIdentified: boolean;
  system.slug: string;  // Stable ID used by formulas
  system.nameFormula: FormulaData;  // Formula-driven display name source
}
```

In practice:
- `play` mode is player-visible and applies mask/effective logic
- `true` mode is GM-only unmasked play view
- `edit` mode is authoring mode (raw editable source semantics)

## Bonus Type Stacking (Material Pattern)

Materials are ActiveEffects that modify items. They use `bonusType` field to control stacking:

```typescript
// Only one "material" bonus type per item (highest wins)
schema.bonusType = new fields.StringField({
  choices: ['material', 'broken', 'masterwork', ...]
});
```

Resolution: when multiple AEs apply same field, only highest value in each `bonusType` slot applies.

## Component Placement Strategy

**Principle**: Component homes follow domain boundaries, not generality. This prevents friction during refactoring and makes intent clear.

### Entity-Domain Components
Sheet components belong in their entity-type folder:

```
src/entities/items/
  components/
    Physical/
      sheet/components/
        PhysicalItemHeaderStatus.vue       ← Physical item badges
        ...                                ← Other physical-item-only sheet components
    Equippable/
      sheet/components/
        EquippableHeaderStatus.vue         ← Equippable-specific (equipped/carried state)
        ...                                ← Other equippable-item-only sheet components
  Weapon/
    sheet/components/
      WeaponDamage.vue                     ← Weapon damage form group
```

**Why**: When Physical and Equippable item sheets need different behavior (e.g. badges show different state), having separate component homes makes changes safer. Updates to one entity type don't accidentally affect unrelated types. Search for "PhysicalItemHeaderStatus" finds exactly what you need, not 5 false positives in generic folders.

### Generic Reusable Components
Generic components stay in `src/vue/components/` **only when** they are truly cross-domain:

```
src/vue/components/
  Fields/
    FormGroups/
      FormGroup.vue                     ← Used by all entity types, all sheets
      NumberFormGroup.vue               ← Generic number input
      SelectFormGroup.vue               ← Generic select dropdown
  Layout/
    TabView.vue                         ← Generic tab container
```

Test: "Is this used by Physical items AND Weapons AND Actors AND Effects?" If yes, generic folder. If "just items," put it in `src/entities/items/components/`.

### Anti-Pattern: Catch-All Folders
Don't create folders like `HeaderComponents/`, `StatusBadges/`, `EditControls/`. These catch-alls:
- Hide domain intent (why is *this* status badge different from that one?)
- Make refactoring painful ("update all status badges" requires hunting across folders)
- Violate single-responsibility (folder should have a *reason* to exist)

**Learned**: Phase 1 initially placed HeaderStatus in generic `src/vue/components/HeaderStatus/`, then moved to entity domains when two different types needed two different components. Established domain-first placement avoids rework.

## Vue Sheet Patterns

See `vue-sheet-patterns.instructions.md` for sheet-specific patterns.

## Localization Architecture

All field labels/hints are auto-localized via Foundry's `LOCALIZATION_PREFIXES` system. See `foundry-data-fields.instructions.md` for details.

**Key conventions:**
- Every DataModel declares `static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.MODEL_NAME']`
- Language files use nested `dnd35e.MODEL_NAME.FIELDS.fieldName.label/.hint` structure
- Split source files (`src/lang/en/*.json`) are deep-merged at build time into one `dist/lang/en.json`
- `field.options.label` is **pre-localized text** after startup (not a key)
- FormGroup auto-derives labels from schema — no explicit `label` prop needed
- Explicit `label`/`hint` props are treated as localization keys (passed through `game.i18n.localize()`)
- Non-field strings (enum values, headings, buttons) use `game.i18n.localize('dnd35e.DOMAIN.Key')`
- All keys use `dnd35e.*` namespace (not `DND35E.*` or `D35E.*`)

### CONFIG Enum Pre-Localization

CONFIG-registered enums (sizes, weapon types, DR types, etc.) use a two-step pre-localization pattern so they stay current across language switches without DB migration.

**Step 1 — Register at module scope** (in the config file that defines the enum):
```typescript
// src/constants/config/system.mts
registerConfigPreLocalization('item.enums.sizes', { key: 'label' });
registerConfigPreLocalization('gameRules.damageReductionTypes', { key: 'label' });
```

**Step 2 — Wire once in main.mts** (already done — do not add a duplicate):
```typescript
Hooks.once('i18nInit', () => {
  preLocalizeConfig(CONFIG.dnd35e as unknown as Record<string, unknown>);
});
```

At `i18nInit`, `preLocalizeConfig` walks all registered paths and replaces i18n keys with localized text in-place. Utility lives in `src/helpers/localization/preLocalizeConfig.mts`.

**i18n key naming** — enum default entries use `dnd35e.DOMAIN_UPPER.EntryName` (e.g. `dnd35e.DAMAGE_REDUCTION_TYPES.Acid`, `dnd35e.SIZES.Medium`).

### Live-Merge Pattern

When a setting stores user-customizable entries that overlap with CONFIG defaults (e.g. damage reduction types), **merge at read-time** rather than duplicating labels in the DB. This makes language switching transparent:

```typescript
const systemDefaults = CONFIG.dnd35e.gameRules.damageReductionTypes as Record<string, { label: string }>;
return Object.entries(config).map(([key, entry]) => ({
  value: key,
  label: systemDefaults[key]?.label ?? entry.label,  // CONFIG label for system entries
}));
```

System entries use the CONFIG pre-localized label; custom entries fall back to their stored label.

### CONFIG Registration Spread Merge

When populating CONFIG from entity registration files, **always spread-merge** — bare assignment wipes anything registered earlier:

```typescript
// ✅ Correct — preserves pre-registered enums
CONFIG.dnd35e.item = { ...CONFIG.dnd35e.item, ...ItemConfig };

// ❌ Wrong — wipes enums registered before this file runs
CONFIG.dnd35e.item = ItemConfig;
```

Registration order is not guaranteed. Multiple files populate the same CONFIG object.

## Field Permissions & Overrides

See `dnd35e-field.instructions.md` for field override cascade, view-aware getters, and permission defaults.
