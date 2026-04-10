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

## Vue Sheet Patterns

See `vue-sheet-patterns.instructions.md` for sheet-specific patterns.

## Dnd35eField Compound Wrapping

See `dnd35e-field.instructions.md` for field wrapping and usage.
