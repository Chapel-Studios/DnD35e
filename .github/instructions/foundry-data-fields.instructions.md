---
description: "Use when working with Foundry DataField types, schema definitions, field validation, or data initialization. Quick reference for field options and usage patterns."
---

# Foundry Data Fields Reference

Quick lookup for Foundry's data field system (`foundry.data.fields.*`).

## Field Hierarchy

```
DataField (abstract base)
├── Basic Fields
│   ├── BooleanField
│   ├── NumberField
│   ├── StringField
│   └── ObjectField
├── Compound Fields
│   ├── SchemaField
│   ├── ArrayField
│   ├── SetField
│   ├── TypedObjectField
│   └── TypedSchemaField
├── Embedded Model Fields
│   ├── EmbeddedDataField
│   ├── EmbeddedDocumentField
│   └── EmbeddedCollectionField
└── Reference Fields
    ├── DocumentIdField
    ├── DocumentUUIDField
    └── ForeignDocumentField
```

## Common Options (All Fields)

```typescript
{
  required: boolean,          // Field must be present
  nullable: boolean,          // Field can be null
  initial: T | () => T,       // Default value or initializer
  blank: boolean,             // Allow empty string (StringField)
  min: number,                // Minimum value (NumberField)
  max: number,                // Maximum value (NumberField)
  step: number,               // Increment step (NumberField)
  choices: string[],          // Allowed values
  trim: boolean,              // Auto-trim whitespace (StringField)
  label: string,              // User-facing label (auto-set by LOCALIZATION_PREFIXES)
  hint: string,               // Help text (auto-set by LOCALIZATION_PREFIXES)
  validate: (value) => true   // Custom validator
}
```

## LOCALIZATION_PREFIXES & Field Auto-Localization

Foundry v14 auto-localizes DataModel field labels/hints at startup via `Localization.localizeDataModel()`. **Do not hardcode labels in field definitions.**

### How It Works

1. DataModel declares `static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.MODEL_NAME']`
2. Language file has `dnd35e.MODEL_NAME.FIELDS.fieldName.label` / `.hint` entries
3. At startup, Foundry walks the schema and **mutates** `field.options.label` / `field.options.hint` in place
4. After startup, `field.options.label` contains **pre-localized text** (e.g., `"Hardness"` not `"dnd35e.PHYSICAL_ITEM.FIELDS.hardness.label"`)

### Prefix Inheritance

Each DataModel adds its own prefix; prefixes cascade left-to-right (later wins for same field):

```typescript
class PhysicalItemSystemModel extends IdentifiableItemSystemModel {
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.PHYSICAL_ITEM'];
}
// Final chain: ['dnd35e.DOCUMENT', 'dnd35e.ITEM', 'dnd35e.IDENTIFIABLE', 'dnd35e.PHYSICAL_ITEM']
```

### Language File Structure

```json
{
  "dnd35e": {
    "PHYSICAL_ITEM": {
      "FIELDS": {
        "hardness": {
          "label": "Hardness",
          "hint": "How resistant this item is to damage."
        },
        "weight": {
          "label": "Weight",
          "hint": "The weight of a single unit, in pounds."
        }
      }
    }
  }
}
```

### Field Definition (No Labels in Code)

```typescript
// ✅ Correct: label/hint from LOCALIZATION_PREFIXES
schema.hardness = new Dnd35eField(NumberField, { required: true, initial: 0, min: 0 });

// ❌ Wrong: hardcoded label
schema.hardness = new Dnd35eField(NumberField, { required: true, initial: 0, label: 'Hardness' });
```

## Basic Fields

### `NumberField`
```typescript
schema.hardness = new fields.NumberField({
  required: true,
  nullable: false,
  initial: 0,
  min: 0,
  max: 20
});
```

### `StringField`
```typescript
schema.name = new fields.StringField({
  required: true,
  nullable: false,
  initial: "Longsword",
  trim: true
});
```

### `BooleanField`
```typescript
schema.equipped = new fields.BooleanField({
  initial: false
});
```

### `ObjectField`
```typescript
schema.metadata = new fields.ObjectField({
  initial: {}
});
```

## Compound Fields

### `SchemaField` (Object with typed properties)
```typescript
schema.damage = new fields.SchemaField({
  dice: new fields.StringField(),
  type: new fields.StringField({ choices: ['slashing', 'piercing', 'bludgeoning'] })
});
```

### `ArrayField` (List of items)
```typescript
schema.materials = new fields.ArrayField(
  new fields.SchemaField({
    name: new fields.StringField(),
    modifier: new fields.NumberField()
  })
);
```

## When to Use `nullable` vs `initial`

- **`initial: value`** — Field always has a value; new documents get the default
- **`nullable: true`** — Field can be `null` (use when absence has meaning)
- **`required: true`** — Field must be present in the schema; combined with `initial` for required-with-default

**Example:**
```typescript
schema.price = new fields.SchemaField({
  gold: new fields.NumberField({ initial: 0 }),        // Required, defaults to 0
  silver: new fields.NumberField({ nullable: true }),  // Optional, can be null
});
```

## Testing Fields

Use `.clean()` to validate and prepare:
```typescript
const field = new fields.NumberField({ min: 0, max: 10 });
field.clean(15);  // Throws if validation fails
```

## Constants Pattern: Type-Safe Enums

**Problem**: Magic strings scattered at use sites (localization keys, choices arrays, etc.) are hard to refactor and prone to typos.

**Solution**: Export individual `const` values + a combined array, ensuring single point of change and type safety.

### Pattern Structure

```typescript
// src/constants/attacks/damageTypes.mts
// Individual constants with literal types
const DAMAGE_TYPE_PIERCING = 'dnd35e.DAMAGE_TYPES.Piercing' as const;
const DAMAGE_TYPE_SLASHING = 'dnd35e.DAMAGE_TYPES.Slashing' as const;
const DAMAGE_TYPE_FIRE = 'dnd35e.DAMAGE_TYPES.Fire' as const;
// ... more constants

// Array built from constants (not repeated strings)
const DAMAGE_TYPES = [
  DAMAGE_TYPE_PIERCING,
  DAMAGE_TYPE_SLASHING,
  DAMAGE_TYPE_FIRE,
  // ...
];

// Type derived from array
type DamageType = (typeof DAMAGE_TYPES)[number];

// Export all
export {
  DAMAGE_TYPE_PIERCING,
  DAMAGE_TYPE_SLASHING,
  DAMAGE_TYPE_FIRE,
  DAMAGE_TYPES,
  type DamageType,
};
```

### Usage in Schema

```typescript
// In WeaponSystemModel
schema.damageType = new Dnd35eField(StringField, {
  choices: DAMAGE_TYPES,  // Array used here
  initial: DAMAGE_TYPE_SLASHING,  // Individual const used here
  required: true
});
```

### Benefits

- **Zero magic strings**: All values sourced from exports
- **Single point of change**: Update `DAMAGE_TYPE_PIERCING` once, impacts everywhere
- **Type safety**: `DamageType` is `'dnd35e.DAMAGE_TYPES.Piercing' | 'dnd35e.DAMAGE_TYPES.Slashing' | ...`
- **Validation at compile time**: TypeScript catches typos; schema validation catches invalid choices
- **Refactoring safe**: Rename constant → IDE finds all usages

### When to Use

- Localization keys (damage types, skills, bonus types, effect types, etc.)
- Enum-like choices (subtypes, modes, categories)
- Any value that appears in multiple schema definitions

### When NOT to Use

- Transient values (temporary UI state, calculated values)
- Single-use strings (component IDs, labels that appear once)
- Developer-facing constants that users never see
