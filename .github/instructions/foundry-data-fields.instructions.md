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
  label: string,              // User-facing label
  hint: string,               // Help text
  validate: (value) => true   // Custom validator
}
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
