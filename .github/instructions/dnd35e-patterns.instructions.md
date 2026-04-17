---
description: "Use when understanding dnd35e architecture, component composition chains, DataModel patterns, or system conventions."
---

# D&D 3.5e System Architecture Patterns

## Component Composition Chain

dnd35e uses **mixin composition** rather than deep inheritance. Each layer adds schema, derivedData, and methods.

```
CoreMixin
  └── Identifiable (tracked/identified dual-view)
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

**All use Dnd35eField for wrapped data** — see `dnd35e-field.instructions.md`.

## Formula Resolution

FormulaFamiliar enables `#context.property` syntax in formulas. Schema walker auto-discovers formula-eligible fields.

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

**In Dnd35eField context**: Changes on a wrapped field are auto-routed to `.value` sub-field.

```typescript
// If schema.hardness is Dnd35eField(NumberField)
// An AE adding 5 to "system.hardness" actually modifies system.hardness.value
```

## Identified/Unidentified Duality

The `Identifiable` mixin enables tracked/identified states with formula-driven names and dual view modes (Edit/View, Identified/Unidentified).

```typescript
interface Identifiable {
  system.isIdentified: boolean;
  system.slug: string;  // Stable ID used by formulas
  system.name: FormulaData;  // Formula-driven display name
  system.nameUnidentified: FormulaData | null;  // Override when unidentified
}
```

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
    physical/
      sheet/components/
        PhysicalItemHeaderStatus.vue        ← Physical item badges
        ...                                ← Other physical-item-only sheet components
    equippable/
      sheet/components/
        EquippableHeaderStatus.vue         ← Equippable-specific (equipped/carried state)
        ...                               ← Other equippable-item-only sheet components
    weapon/
      sheet/components/
        WeaponDamage.vue                   ← Weapon damage form group
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

## Dnd35eField Compound Wrapping

See `dnd35e-field.instructions.md` for field wrapping and usage.
