# Custom Dnd35e Fields + Schema-Driven FormulaFamiliar

## Progress

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | Base Infrastructure (types, fieldOverridesSchema, schemaWalker) | **Done** |
| **Phase 2** | `Dnd35eField` — Generic Wrapper | **Done** |
| **Phase 3** | `FormulaField` + `FormulaData` | **Done** |
| **Phase 4** | Schema Decoration + Intellisense Migration | **Done** |
| **Phase 5** | Pipeline Integration | **Done** |
| **Phase 6** | UI Integration | **Done** |
| **Phase 7** | Data Migration | **Skipped** (no pre-existing data) |
| **Phase 8** | Cleanup | **Done** |
| **Phase 9** | FormulaFamiliar Rebrand (rename intellisense → familiar/aspect) | Done |

## Overview

Replace plain Foundry DataFields with a generic `Dnd35eField` wrapper and a specialized `FormulaField`, both carrying per-field metadata and per-instance data. Each wrapped field stores:

- **The value itself** — delegated to an inner Foundry field (NumberField, StringField, BooleanField, HTMLField, etc.)
- **Unidentified alternative** — same inner field type, nullable — replaces `flags.dnd35e.unidentifiedOverrides`
- **Field permission overrides** (`overrides: { visibility, editability }`) — replaces `flags.dnd35e.fieldOverrides`
- **Static metadata** (intellisense config) — in constructor options

### Architecture Summary

| Class | Base | DataModel? | Purpose |
|---|---|---|---|
| `Dnd35eField` | `SchemaField` | No | Generic wrapper for ANY Foundry field type. Adds `unidentifiedValue` + `overrides` + intellisense options. |
| `FormulaField` | `EmbeddedDataField` | Yes (`FormulaData`) | Formula-specific. Needs live instance methods: `resolve()`, `buildIntellisenseSchema()`, `getEffective()`. |
| `PriceField` *(extend)* | `EmbeddedDataField` | Yes (`PriceData`) | Already exists. Extend with `unidentifiedValue` + `overrides`. |

### What Changes

| Before | After |
|---|---|
| `system.hardness = 5` | `system.hardness = { value: 5, unidentifiedValue: null, overrides: null }` |
| `system.size = 'medium'` | `system.size = { value: 'medium', unidentifiedValue: null, overrides: null }` |
| `system.isCarried = true` | `system.isCarried = { value: true, unidentifiedValue: null, overrides: null }` |
| `system.description.value = '<p>...'` | `system.description = { value: '<p>...', unidentifiedValue: null, overrides: null }` |
| `system.nameFormula = { formula, contexts }` | `system.nameFormula = { formula, resolvedValue, unidentifiedFormula, unidentifiedResolvedValue, expectedType, contextBindings, overrides }` |
| `flags.dnd35e.unidentifiedOverrides.system__hardness = 3` | *(deleted — lives in `system.hardness.unidentifiedValue`)* |
| `flags.dnd35e.fieldOverrides.system__hardness = {...}` | *(deleted — lives in `system.hardness.overrides`)* |
| 8 separate intellisense builder files | Schema walker reads `intellisense` option from field declarations |
| `unidentifiedNameFormula` separate schema field | Absorbed into `nameFormula.unidentifiedFormula` |

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Field wrapper** | One generic `Dnd35eField` wrapping any inner field | Avoids N field subclasses. One class covers NumberField, StringField, BooleanField, HTMLField, etc. |
| **FormulaField** | Separate, uses DataModel | Needs live instance methods (`resolve()`, `buildIntellisenseSchema()`). Too complex for plain SchemaField. |
| **Field storage** | Compound shape (Path A) | Accept migration cost. One source of truth per field, no flags indirection. |
| **AE routing** | Delegate to inner field | `Dnd35eField._applyChangeXxx` delegates to inner field's logic, wraps result back into compound shape. |
| **`getViewAwareFieldValue`** | Static on `Dnd35eField` | `Dnd35eField.getEffective(data, viewMode)` — trivial logic, no DataModel instance needed. |
| **Flag → field migration** | Bulk migration | Move `unidentifiedOverrides` and `fieldOverrides` flag data into compound field shapes. |
| **`identifiable` flag** | Per-field opt-in | Not all fields need identified/unidentified variants. `identifiable: false` omits `unidentifiedValue` from `Dnd35eField` schema; on `FormulaField` it stores metadata so UI skips unidentified formula editing. Default `true`. |
| **Field-level defaults** | `defaultVisibility` + `defaultEditability` in options | Fields declare their own permission defaults (e.g. description defaults to `gmOnly` editability). Stored in `this.options`, read by FieldControls. Eliminates prop drilling. |
| **Schema-aware FieldControls** | Resolve field from schema at runtime | FieldControls uses `fieldPath` to look up the schema field definition, checks `instanceof Dnd35eField` / presence of `overrides` sub-field, reads `identifiable` and defaults from `this.options`. Plain fields get no buttons. |
| **FormulaFamiliar rebrand** | Rename all "intellisense" references to "FormulaFamiliar" / "FieldAspect" | "Intellisense" is a copyrighted term. Public-facing brand: **FormulaFamiliar**. The data types gathered from fields are **FieldAspect** (importable type) / `aspect` (local contexts like `getAspect()`). The overall autocomplete schema is a **FamiliarSchema**. |

---

## Foundry Core Field Reference

### DataField — Base Class (`fields.mjs`)

**Constructor**: `new DataField(options={}, {name, parent}={})`. Options bag is stored as `this.options`. For each key in `static get _defaults()`, the constructor does `this[k] = k in options ? options[k] : defaults[k]`. **Unknown options are NOT promoted to properties** but ARE preserved in `this.options`.

**Default options** (all field types inherit):
```
required: false, nullable: false, initial: undefined, readonly: false,
persisted: true, gmOnly: false, label: "", hint: "", placeholder: "",
validationError: "is not a valid value"
```

- `label` — Localization key. Our intellisense display name can use this.
- `persisted` — If false, field is initialized + receives AE changes but NOT written to DB.

**Field-specific additions:**
- **StringField**: `blank, trim, choices, textSearch`
- **NumberField**: `nullable: true, min, max, step, integer, positive, choices`
- **BooleanField**: `required: true, nullable: false, initial: false`
- **HTMLField**: extends StringField
- **SchemaField**: `constructor(fields, options, context)` — `fields` is `Record<string, DataField>`. Walks children for clean/validate/initialize.

### EmbeddedDataField — For DataModel Embedding

`EmbeddedDataField → DataModelSchemaField → SchemaField → DataField`

- `initialize(value, model)` → creates `new this.model(value, {parent: model, schema: this})`
- `toObject(value)` → calls `value.toObject(false)`

### Active Effect Change Integration

`applyChange(value, model, change, {replacementData})`:
1. `_castChangeDelta(change.value, replacementData)` — resolves `@field.path` references
2. Switch on `change.type` → `_applyChangeXxx(value, delta, model, change)`
3. Clean + validate; fallback on failure

---

## Phase 1: Base Infrastructure

### Step 1.1: Define shared types in `src/helpers/formulae/types.mts`

```ts
// Intellisense metadata — carried in field constructor options
interface FormulaFieldMeta {
  display?: string;            // Localized label override (falls back to field.label)
  formulaVisible?: boolean;    // Default false. True = included in intellisense.
  intellisenseType?: 'string' | 'number';  // Override (inferred from inner field class if omitted)
  intellisenseKey?: string;    // Override key in IntellisenseObject (defaults to field.name)
}

// Context binding spec — stored in DB per FormulaField
interface FormulaContextBinding {
  resolvePath: string;               // e.g. 'parent', 'parent.parent'
  documentType: string;              // e.g. 'Actor', 'Item'
  expectedSubtypes: string[];        // e.g. ['character', 'npc']
  aliases?: string[];                // e.g. ['item', 'weapon']
}

// Field permission overrides — per-instance, nullable (null = defaults)
interface Dnd35eFieldOverrides {
  visibility: 'everyone' | 'ownerPlus' | 'gmOnly';
  editability: 'normal' | 'gmOnly';
}
```

### Step 1.2: Create shared `fieldOverridesSchema()` in `src/helpers/fields/fieldOverridesSchema.mts`

```ts
const fieldOverridesSchema = () => new SchemaField({
  visibility: new StringField({ choices: ['everyone', 'ownerPlus', 'gmOnly'], initial: 'everyone' }),
  editability: new StringField({ choices: ['normal', 'gmOnly'], initial: 'normal' }),
}, { nullable: true, initial: null });
```

When `null`, field uses default permissions. Most fields won't have overrides set.

### Step 1.3: Create `buildIntellisenseFromSchema()` in `src/helpers/formulae/schemaWalker.mts`

- Walks a TypeDataModel's `defineSchema()` recursively
- For `Dnd35eField`: reads `options.intellisense`, uses `.value` sub-path for actual data
- For `FormulaField`: skips (formulas aren't intellisense targets themselves)
- For nested SchemaField: creates nested IntellisenseObject branches
- Merges "above-system" fields:

```ts
const DOCUMENT_LEVEL_INTELLISENSE: Record<string, IntellisenseProperty> = {
  name: { display: 'Name', type: 'string', accessPath: 'name' },
};
```

---

## Phase 2: `Dnd35eField` — Generic Wrapper

### Step 2.1: Create `Dnd35eField.mts` in `src/helpers/fields/`

```ts
class Dnd35eField extends SchemaField {
  constructor(
    InnerFieldClass: typeof DataField,
    innerOptions: Record<string, unknown> = {},
    wrapperOptions: {
      intellisense?: FormulaFieldMeta;
      identifiable?: boolean;        // Default true. When false, omits unidentifiedValue sub-field.
      defaultVisibility?: FieldVisibility;   // Default 'everyone'. FieldControls reads this.
      defaultEditability?: FieldEditability; // Default 'normal'. FieldControls reads this.
      label?: string;
      hint?: string;
    } = {}
  ) {
    const { intellisense, identifiable = true, defaultVisibility, defaultEditability, ...schemaOptions } = wrapperOptions;

    const fields = {
      value: new InnerFieldClass(innerOptions),
      overrides: fieldOverridesSchema(),
    };

    if (identifiable) {
      fields.unidentifiedValue = new InnerFieldClass({
        ...innerOptions, nullable: true, initial: null, required: false,
      });
    }

    super(fields, schemaOptions);

    // Foundry preserves unknown keys in this.options
    const opts = this.options;
    opts.identifiable = identifiable;
    if (defaultVisibility) opts.defaultVisibility = defaultVisibility;
    if (defaultEditability) opts.defaultEditability = defaultEditability;
    if (intellisense) opts.intellisense = intellisense;
  }

  /** Get the effective value for a given view mode */
  static getEffective<T>(
    data: { value: T; unidentifiedValue?: T | null },
    viewMode: 'identified' | 'unidentified'
  ): T {
    if (viewMode === 'unidentified' && data.unidentifiedValue != null) {
      return data.unidentifiedValue;
    }
    return data.value;
  }

  /** Get the field overrides for this instance, or null for defaults */
  static getOverrides(
    data: { overrides?: Dnd35eFieldOverrides | null }
  ): Dnd35eFieldOverrides | null {
    return data.overrides ?? null;
  }

  // --- AE Change Routing ---
  // All AE changes target .value, delegating to the inner field's logic

  _castChangeDelta(raw, replacementData) {
    // Delegate to the inner value field's cast logic
    return this.fields.value._castChangeDelta(raw, replacementData);
  }

  _applyChangeAdd(current, delta, model, change) {
    const newValue = this.fields.value._applyChangeAdd(current.value, delta, model, change);
    return { ...current, value: newValue };
  }

  _applyChangeMultiply(current, delta, model, change) {
    const newValue = this.fields.value._applyChangeMultiply(current.value, delta, model, change);
    return { ...current, value: newValue };
  }

  _applyChangeOverride(current, delta, model, change) {
    return { ...current, value: delta };
  }

  _applyChangeUpgrade(current, delta, model, change) {
    const newValue = this.fields.value._applyChangeUpgrade(current.value, delta, model, change);
    return { ...current, value: newValue };
  }

  _applyChangeDowngrade(current, delta, model, change) {
    const newValue = this.fields.value._applyChangeDowngrade(current.value, delta, model, change);
    return { ...current, value: newValue };
  }
}
```

### Step 2.2: Usage examples in schemas

```ts
// Numbers — identifiable (default)
schema.hardness = new Dnd35eField(NumberField,
  { initial: 0, min: 0 },
  { intellisense: { formulaVisible: true, display: 'Hardness' } }
);

// Numbers — NOT identifiable (no unidentifiedValue sub-field)
schema.weight = new Dnd35eField(NumberField,
  { initial: 0, min: 0 },
  { identifiable: false }
);

// Strings with choices
schema.size = new Dnd35eField(StringField,
  { initial: 'medium', choices: SIZES },
  { intellisense: { formulaVisible: true, display: 'Size' } }
);

// Booleans
schema.isCarried = new Dnd35eField(BooleanField, { initial: true });

// HTML (description) — GM-only editability by default
schema.description = new Dnd35eField(HTMLField, { initial: '' }, {
  defaultEditability: 'gmOnly',
});

// Image path (FilePathField)
// schema.img = new Dnd35eField(FilePathField, { categories: ['IMAGE'] });
```

### Step 2.3: Update `fieldBuilders.mts`

Replace existing helpers to return `Dnd35eField` instances:

```ts
const requiredNumberField = (
  initial: number,
  options?: { min?: number; max?: number; step?: number; integer?: boolean; positive?: boolean },
  wrapperOptions?: { intellisense?: FormulaFieldMeta }
) => new Dnd35eField(NumberField, { required: true, nullable: false, initial, ...options }, wrapperOptions);

const requiredStringField = (
  initial: string,
  options?: { choices?: string[]; blank?: boolean },
  wrapperOptions?: { intellisense?: FormulaFieldMeta }
) => new Dnd35eField(StringField, { required: true, nullable: false, initial, ...options }, wrapperOptions);

const optionalStringField = (
  initial: string = '',
  options?: { choices?: string[]; blank?: boolean },
  wrapperOptions?: { intellisense?: FormulaFieldMeta }
) => new Dnd35eField(StringField, { initial, ...options }, wrapperOptions);

const requiredBooleanField = (
  initial: boolean = false,
  wrapperOptions?: { intellisense?: FormulaFieldMeta }
) => new Dnd35eField(BooleanField, { initial }, wrapperOptions);
```

---

## Phase 3: `FormulaField` + `FormulaData`

### Step 3.1: Create `FormulaData.mts` in `src/helpers/formulae/`

```ts
class FormulaData extends foundry.abstract.DataModel {
  static override defineSchema() {
    return {
      // Identified formula
      formula: new StringField({ blank: true, initial: '' }),
      resolvedValue: new StringField({ nullable: true, initial: null }),

      // Unidentified formula (absorbs unidentifiedNameFormula)
      unidentifiedFormula: new StringField({ nullable: true, initial: null }),
      unidentifiedResolvedValue: new StringField({ nullable: true, initial: null }),

      // Resolution config
      expectedType: new StringField({ choices: ['string', 'number'], initial: 'string' }),
      contextBindings: new ObjectField({ initial: {} }),

      // Field permissions (same pattern as Dnd35eField)
      overrides: fieldOverridesSchema(),
    };
  }

  /** Get effective formula based on view mode */
  getEffectiveFormula(viewMode: 'identified' | 'unidentified'): string {
    if (viewMode === 'unidentified' && this.unidentifiedFormula != null) {
      return this.unidentifiedFormula;
    }
    return this.formula;
  }

  /** Get effective resolved value based on view mode */
  getEffective(viewMode: 'identified' | 'unidentified'): string | number | null {
    if (viewMode === 'unidentified' && this.unidentifiedResolvedValue != null) {
      return this.unidentifiedResolvedValue;
    }
    return this.resolvedValue;
  }

  /** Resolve identified formula — builds context from bindings, evaluates */
  resolve(selfDoc: Document): string | number | null { /* ... */ }

  /** Resolve unidentified formula */
  resolveUnidentified(selfDoc: Document): string | number | null { /* ... */ }

  /** Build full IntellisenseSchema for UI autocomplete */
  buildIntellisenseSchema(selfDoc: Document): IntellisenseSchema { /* ... */ }

  /** Helper for constructing source data */
  static toSource(formula: string, opts?: Partial<FormulaSource>): FormulaSource { /* ... */ }
}
```

### Step 3.2: Create `FormulaField.mts` in `src/helpers/formulae/`

```ts
class FormulaField extends EmbeddedDataField {
  constructor(options: FormulaFieldOptions = {}) {
    const { expectedType, identifiable = true, defaultVisibility, defaultEditability, intellisense, ...fieldOptions } = options;
    super(FormulaData, fieldOptions);

    const opts = this.options;
    opts.identifiable = identifiable;
    opts.expectedType = expectedType ?? 'string';
    if (defaultVisibility) opts.defaultVisibility = defaultVisibility;
    if (defaultEditability) opts.defaultEditability = defaultEditability;
    if (intellisense) opts.intellisense = intellisense;
  }

  /** AE: override replaces formula text, clears cache */
  _castChangeDelta(raw: string): string { return String(raw); }

  _applyChangeOverride(current: object, delta: string): object {
    return { ...current, formula: delta, resolvedValue: null };
  }
}
```

### Step 3.3: Update schema declarations

**`Dnd35eDocumentSystemModel.mts`**:
```ts
// Replaces both nameFormula AND derivedName
schema.nameFormula = new FormulaField({ expectedType: 'string' });
schema.derivedName = new StringField({ persisted: false });
```

**`IdentifiableSchemaMixin`** — REMOVE:
- `unidentifiedNameFormula` — absorbed into `nameFormula.unidentifiedFormula`
- `derivedUnidentifiedName` — becomes `nameFormula.unidentifiedResolvedValue`

**Context inheritance** via static getter:
```ts
// WeaponSystemModel:
static override get formulaContexts() {
  return {
    nameFormula: {
      owner: { resolvePath: 'parent', documentType: 'Actor', expectedSubtypes: ['character', 'npc'] }
    }
  };
}
```

### Step 3.4: Update `fieldBuilders.mts`

```ts
const formulaField = (options?: FormulaFieldOptions) =>
  new FormulaField({ expectedType: options?.expectedType ?? 'string', ...options });
```

---

## Phase 4: Schema Decoration + Intellisense Migration

### Step 4.1: Decorate existing schema fields

All fields that currently appear in intellisense builders get the `intellisense` option via their `Dnd35eField` wrapper:

| File | Fields |
|---|---|
| `PhysicalItemSystemModel.mts` | hp.value, hp.max, hardness, quantity, weight, size, price |
| `EquippableItemSystemModel.mts` | designedForSize |
| `WeaponSystemModel.mts` | weaponType, weaponSubtype, weaponBaseType, weaponDamage.{damageRoll, damageType, critRange, critMultiplier, rangeIncrement} |
| `MaterialSystemModel.mts` | price, magicEquivalency, hardness, bonusHp |

These are already `Dnd35eField` instances (from Phase 2), so decoration is just adding the `intellisense` option in the wrapper constructor.

### Step 4.2: Delete old builder files

- `coreMixinIntellisense.mts`
- `baseItemIntellisense.mts`
- `identifiableIntellisense.mts`
- `physicalIntellisense.mts`
- `equippableIntellisense.mts`
- `weaponIntellisense.mts`
- `actorIntellisense.mts` (both copies)

### Step 4.3: Update registration

```ts
// items/registration.mts:
registerIntellisenseSchema('Item', weaponItemType, (ctx?) => buildIntellisenseFromSchema(WeaponSystemModel, ctx))
```

Keep `actors/registration.mts` basic builder until actor TypeDataModels exist.

---

## Phase 5: Pipeline Integration

### Step 5.1: Formula resolution in `prepareDerivedData`

```ts
prepareDerivedData() {
  super.prepareDerivedData();
  if (this.nameFormula?.formula) {
    this.nameFormula.resolvedValue = this.nameFormula.resolve(this.parent);
    this.derivedName = this.nameFormula.resolvedValue ?? this.derivedName;
  }
  if (this.nameFormula?.unidentifiedFormula) {
    this.nameFormula.unidentifiedResolvedValue = this.nameFormula.resolveUnidentified(this.parent);
  }
}
```

Keep `update()` formula evaluation so preUpdate hooks see resolved name.

### Step 5.2: Eliminate `nameContextBuilder`

Remove from `Dnd35eDocument` and all concrete classes. FormulaField's context spec + `formulaContexts` static getter handles this.

### Step 5.3: Simplify `update()` pipeline

```ts
for (const registration of this.registeredFormulas) {
  const formulaData = evaluationContext.system[registration.formulaField];
  if (formulaData?.formula) {
    updateData[registration.impactedField] = formulaData.resolve(evaluationContext);
  }
}
```

---

## Phase 6: UI Integration

### Step 6.1: Refactor `getViewAwareFieldValue`

For `Dnd35eField`-wrapped fields, the field data is self-describing:

```ts
// Before (store-level, checks flags):
getViewAwareFieldValue('system.hardness', document.system.hardness)

// After (field-level):
Dnd35eField.getEffective(document.system.hardness, viewMode)
// Returns: viewMode === 'unidentified' && data.unidentifiedValue != null
//   ? data.unidentifiedValue : data.value
```

The store still provides `viewMode`. The identifiable store override simplifies: it only needs to handle fields NOT wrapped in `Dnd35eField` (if any remain). Eventually it can be removed entirely.

### Step 6.2: Refactor `getViewAwareFieldUpdater`

```ts
// For Dnd35eField-wrapped fields:
// Identified view → write to system.hardness.value
// Unidentified view → write to system.hardness.unidentifiedValue
```

### Step 6.3: Refactor `setFieldOverride`

```ts
// Before: writes to flags.dnd35e.fieldOverrides
// After: writes to system.hardness.overrides
```

### Step 6.4: Make `FieldControls.vue` schema-aware

FieldControls currently shows visibility + editability buttons unconditionally for every field (when GM + edit mode). After this change, it resolves the field definition from the document schema and conditionally renders buttons.

**Resolution logic** (composable or inline):

```ts
// Resolve field metadata from fieldPath (e.g. 'system.hardness')
function resolveFieldMeta(document: Document, fieldPath: string) {
  // Strip 'system.' prefix → look up in document.system.schema
  const schemaPath = fieldPath.replace(/^system\./, '');
  const field = document.system?.schema?.getField(schemaPath);
  if (!field) return null;

  const opts = field.options as Record<string, unknown>;
  return {
    hasOverrides: 'overrides' in (field.fields ?? {}),     // Dnd35eField / FormulaField
    identifiable: opts.identifiable as boolean ?? false,
    defaultVisibility: opts.defaultVisibility as FieldVisibility ?? 'everyone',
    defaultEditability: opts.defaultEditability as FieldEditability ?? 'normal',
  };
}
```

**Conditional rendering** in FieldControls:

| Field type | `hasOverrides` | `identifiable` | Visibility button | Editability button |
|---|---|---|---|---|
| Plain `StringField` etc. | `false` | `false` | Hidden | Hidden |
| `Dnd35eField({ identifiable: false })` | `true` | `false` | Hidden | Shown |
| `Dnd35eField()` (default) | `true` | `true` | Shown | Shown |
| `FormulaField({ identifiable: false })` | `true` | `false` | Hidden | Shown |
| `FormulaField()` (default) | `true` | `true` | Shown | Shown |

**Default values**: When the `overrides` field is `null` (no GM override saved), FieldControls uses `defaultVisibility` and `defaultEditability` from the field's options. This replaces the current `defaultVisibility` / `defaultEditability` props on FieldControls — the schema is the single source of truth.

**Backwards compat**: During migration, some fields will still use the flags-based system. FieldControls checks `hasOverrides` first; if false and `fieldPath` is provided, falls back to the existing flags lookup. Both systems coexist until Phase 8 cleanup.

### Step 6.5: Update FormulaFormGroup

Accept FormulaData instance + live document + view mode:
```vue
<FormulaFormGroup
  :formula-data="nameFormula"
  :document="document"
  :field-path="'system.nameFormula'"
  :view-mode="viewMode"
  :onUpdate="onUpdate"
/>
```

`viewMode` determines whether it edits `formula` or `unidentifiedFormula`.

### Step 6.6: Update HeaderNameField.vue

- Remove `encodedContexts` computed
- Remove dependency on `nameFormulaIntellisenseSchema`
- Pass FormulaData instance + view mode to FormulaFormGroup

### Step 6.7: Simplify store intellisense

Remove from `useDocumentSheetStore.mts`:
- `buildIntellisenseContext`, `getSelf`, `getParent`, `nameFormulaIntellisenseSchema`

---

## Phase 7: Data Migration

### Step 7.1: Generic `Dnd35eField` migration

For every field now wrapped in `Dnd35eField`:

**Old format**: `system.hardness = 5` (scalar)
**New format**: `system.hardness = { value: 5, unidentifiedValue: null, overrides: null }`

Migration per field:
1. Read old scalar value
2. Check `flags.dnd35e.unidentifiedOverrides` for encoded path → move to `unidentifiedValue`
3. Check `flags.dnd35e.fieldOverrides` for encoded path → move to `overrides`
4. Write compound shape
5. Remove matched entries from both flags

### Step 7.2: Formula field migration

**Old format**: `{ formula, contexts }` + separate `unidentifiedNameFormula`
**New format**: `FormulaData` source shape

1. Copy `formula` as-is
2. Set `resolvedValue` to `null`
3. Copy `unidentifiedNameFormula.formula` → `unidentifiedFormula`
4. Set `expectedType` to `'string'`
5. Default `contextBindings` to `{}`
6. Delete `unidentifiedNameFormula` and `derivedUnidentifiedName` from source

### Step 7.3: PriceField migration

Extend PriceData with `unidentifiedValue` + `overrides`. Migrate from flags.

### Step 7.4: Belt-and-suspenders `_initializeSource`

**`Dnd35eField`**: If the stored value is a scalar (not an object with `value` key), auto-wrap:
```ts
_initializeSource(value) {
  if (value !== null && typeof value !== 'object') {
    return { value, unidentifiedValue: null, overrides: null };
  }
  return value;
}
```

**`FormulaData`**: If source has `contexts` key but no `contextBindings`, auto-migrate.

### Step 7.5: Clean up empty flags

After migration, delete `unidentifiedOverrides` and `fieldOverrides` flags if empty.

---

## Phase 8: Cleanup

### Step 8.1: Remove deprecated code

- Delete `registry.mts` functions: `registerIntellisenseSchema`, `getIntellisenseBuilder`, `hasIntellisenseSchema`, `encodeContextType`, `decodeContextType`, `buildContextFromFormula`
- Delete all old intellisense builder files (8 files)
- Remove `FormulaContextBuilder` type export
- Remove `FormulaRegistration.evaluate`
- Remove `UNIDENTIFIED_OVERRIDES_FLAG` and `FIELD_OVERRIDES_FLAG` constants
- Remove `encodeFieldPath` / `decodeFieldPath` utilities
- Simplify `IdentifiableDocumentStore` — remove store-level `getViewAwareFieldValue` override
- Remove `unidentifiedNameFormula` and `derivedUnidentifiedName` from `applyIdentifiableSchema`

### Step 8.2: Update exports/imports

- Update `@helpers/formulae/index.mts` barrel file
- Create `@helpers/fields/index.mts` barrel for Dnd35eField + fieldOverridesSchema
- Update all import sites

---

## Phase 9: FormulaFamiliar Rebrand

> "Intellisense" is a copyrighted term (Microsoft). We rebrand the autocomplete system as **FormulaFamiliar** — the "familiar" that whispers formula completions to you.

### Naming Conventions

| Context | Old Term | New Term |
|---|---|---|
| **Brand / feature name** | Intellisense | FormulaFamiliar |
| **Importable type** (a single property node) | `IntellisenseProperty` | `FieldAspect` |
| **Importable type** (tree of properties) | `IntellisenseObject` | `FieldAspectGroup` |
| **Importable type** (full schema for a doc type) | `IntellisenseSchema` | `FamiliarSchema` |
| **Importable type** (resolved context) | `IntellisenseContext` | `FamiliarContext` |
| **Type guard** | `isIntellisenseProperty` | `isFieldAspect` |
| **Schema builder** | `buildIntellisenseFromSchema` | `buildAspectsFromSchema` |
| **Document-level constant** | `DOCUMENT_LEVEL_INTELLISENSE` | `DOCUMENT_LEVEL_ASPECTS` |
| **Registry function** | `registerIntellisenseSchema` | `registerFamiliarSchema` |
| **Registry function** | `getIntellisenseBuilder` | `getFamiliarBuilder` |
| **Registry function** | `hasIntellisenseSchema` | `hasFamiliarSchema` |
| **Registry map** | `intellisenseSchemaRegistry` | `familiarSchemaRegistry` |
| **Store method** | `buildIntellisenseContext` | `buildFamiliarContext` |
| **Store naming** | `nameFormulaIntellisenseSchema` | `nameFormulaFamiliarSchema` |
| **Field meta key** | `FormulaFieldMeta.intellisenseType` | `FormulaFieldMeta.aspectType` |
| **Field meta key** | `FormulaFieldMeta.intellisenseKey` | `FormulaFieldMeta.aspectKey` |
| **Option key on fields** | `intellisense` | `familiar` |
| **Local variable** | `intellisenseProp` | `fieldAspect` / `aspect` |

### Step 9.1: Rename types + interfaces

**File: `src/helpers/formulae/types.mts`**
- `IntellisenseProperty` → `FieldAspect`
- `IntellisenseObject` → `AspectGroup`
- `IntellisenseContext` → `FamiliarContext`
- `IntellisenseSchema` → `FamiliarSchema`
- `isIntellisenseProperty()` → `isFieldAspect()`
- `FormulaFieldMeta.intellisenseType` → `aspectType`
- `FormulaFieldMeta.intellisenseKey` → `aspectKey`
- Update all JSDoc comments referencing "intellisense"

### Step 9.2: Rename functions + constants

**File: `src/helpers/formulae/schemaWalker.mts`**
- `buildIntellisenseFromSchema()` → `gatherAspectsFromSchema()`
- `DOCUMENT_LEVEL_INTELLISENSE` → `DOCUMENT_LEVEL_ASPECTS`
- Local vars: `intellisenseProp` → `aspect`, etc.
- Update all comments

**File: `src/helpers/formulae/registry.mts`**
- `registerIntellisenseSchema()` → `registerFamiliarSchema()`
- `getIntellisenseBuilder()` → `getFamiliarBuilder()`
- `hasIntellisenseSchema()` → `hasFamiliarSchema()`
- `intellisenseSchemaRegistry` → `familiarSchemaRegistry`
- Update all comments

**File: `src/helpers/formulae/utils.mts`**
- Rename any intellisense-referencing functions/variables
- Update comments

### Step 9.3: Rename option keys on fields

**File: `src/helpers/fields/Dnd35eField.mts`**
- `Dnd35eFieldOptions.intellisense` → `Dnd35eFieldOptions.familiar`
- All internal references to `options.intellisense` → `options.familiar`

**File: `src/helpers/formulae/FormulaField.mts`**
- `intellisense` option → `familiar`

**File: `src/helpers/formulae/FormulaData.mts`**
- `buildIntellisenseSchema()` → `buildFamiliarSchema()`

### Step 9.4: Update comments + JSDoc

- Full scour of all `.mts` and `.vue` files for the word "intellisense" (case-insensitive)
- Replace with "FormulaFamiliar", "familiar", or "aspect" as context dictates
- Files known to contain comments: `types.mts`, `schemaWalker.mts`, `registry.mts`, `utils.mts`, `FormulaData.mts`, `FormulaField.mts`, `Dnd35eField.mts`, store files

### Step 9.5: Update .md documentation

- `docs/featurePlanning/FormulaDataField.md` — this file (already updated title)
- `docs/featurePlanning/FormulaFormGroup.md`
- `README.md` if applicable
- Replace all occurrences of "intellisense" with "FormulaFamiliar" / "familiar" / "aspect"

### Step 9.6: Update barrel exports + imports

**File: `src/helpers/formulae/index.mts`**
- Update all re-exported names to match new names
- Ensure no old names leak

**All consuming files:**
- Update imports throughout codebase to use new names

### Affected Files (300+ occurrences across 18 source files + 2 md docs)

| File | Approx. Changes |
|---|---|
| `src/helpers/formulae/types.mts` | ~40 (types, JSDoc, type guard) |
| `src/helpers/formulae/schemaWalker.mts` | ~30 (function, constant, locals, comments) |
| `src/helpers/formulae/registry.mts` | ~25 (functions, map, comments) |
| `src/helpers/formulae/utils.mts` | ~20 (functions, comments) |
| `src/helpers/formulae/FormulaData.mts` | ~10 (method, comments) |
| `src/helpers/formulae/FormulaField.mts` | ~10 (option key, comments) |
| `src/helpers/fields/Dnd35eField.mts` | ~5 (option key, comments) |
| `src/helpers/formulae/index.mts` | ~15 (barrel exports) |
| Builder files (8 files, if not yet deleted) | ~80 total |
| Store files | ~15 |
| Vue components | ~10 |
| `.md` docs (2 files) | ~30 |

---

## File Manifest

### New Files

| File | Purpose |
|---|---|
| `src/helpers/fields/Dnd35eField.mts` | Generic SchemaField wrapper: `{ value, unidentifiedValue, overrides }` for any inner field type |
| `src/helpers/fields/fieldOverridesSchema.mts` | Shared `overrides` sub-schema factory |
| `src/helpers/fields/index.mts` | Barrel export |
| `src/helpers/formulae/FormulaData.mts` | DataModel: formula + cache + unidentified formula + contexts + overrides |
| `src/helpers/formulae/FormulaField.mts` | EmbeddedDataField with context spec + AE override |
| `src/helpers/formulae/schemaWalker.mts` | `buildAspectsFromSchema()` utility (formerly `buildIntellisenseFromSchema`) |

### Modified Files — Schema

| File | Changes |
|---|---|
| `src/helpers/fieldBuilders.mts` | All helpers return `Dnd35eField` instances; `formulaField` returns `FormulaField` |
| `src/helpers/formulae/types.mts` | Add FormulaContextBinding, FormulaFieldMeta, Dnd35eFieldOverrides |
| `PhysicalItemSystemModel.mts` | All fields → `Dnd35eField` with intellisense decoration |
| `EquippableItemSystemModel.mts` | Same |
| `WeaponSystemModel.mts` | Same + `formulaContexts` static |
| `MaterialSystemModel.mts` | Same + `formulaContexts` static |
| `Dnd35eDocumentSystemModel.mts` | `nameFormula` → `FormulaField` |
| `applyIdentifiableSchema.mts` | Remove `unidentifiedNameFormula`, `derivedUnidentifiedName` |

### Modified Files — Pipeline

| File | Changes |
|---|---|
| `Dnd35eDocument.mts` | Simplify `update()`, remove `nameContextBuilder` |
| `IdentifiableItem.mts` | Simplify formula registrations |
| `Material.mts` | Remove context builders |
| Concrete item classes | Remove `nameContextBuilder` |

### Modified Files — UI

| File | Changes |
|---|---|
| `FormulaFormGroup.vue` | Accept FormulaData + document + viewMode |
| `HeaderNameField.vue` | Remove encodedContexts, use FormulaData |
| `useDocumentSheetStore.mts` | Remove intellisense building, update getViewAwareFieldValue |
| `IdentifiableDocumentStore.mts` | Simplify — Dnd35eField handles unidentified values |
| `fieldPermissions.mts` | Deprecate for Dnd35eField-wrapped fields |
| `unidentifiedOverrides.mts` | Deprecate for Dnd35eField-wrapped fields |
| `FormGroup.vue` / `FieldControls.vue` | Schema-aware: resolve field via `fieldPath`, check `hasOverrides` + `identifiable` + `defaultVisibility` / `defaultEditability` from field options. Hide buttons for plain fields. Fall back to flags for non-wrapped fields during migration. |
| All components reading scalar fields | Update to `.value` access pattern |

### Modified Files — Registration

| File | Changes |
|---|---|
| `items/registration.mts` | Switch to schema walker |
| `actors/registration.mts` | Keep basic builder (no actor TypeDataModels yet) |

### Modified Files — Settings

| File | Changes |
|---|---|
| `PriceField.mts` / `PriceData.mts` | Extend with `unidentifiedValue` + `overrides` |

### Deleted Files

- `coreMixinIntellisense.mts`
- `baseItemIntellisense.mts`
- `identifiableIntellisense.mts`
- `physicalIntellisense.mts`
- `equippableIntellisense.mts`
- `weaponIntellisense.mts`
- `actorIntellisense.mts` (both copies)

---

## Dependency Order

```
Phase 1 (Base infrastructure):
  1.1 Define shared types                  ─┐
  1.2 Create fieldOverridesSchema          ─┤ parallel
  1.3 Create schemaWalker.mts              ─┘

Phase 2 (Dnd35eField):                     ─── (depends on Phase 1)
  2.1 Create Dnd35eField.mts              ─┐
  2.2 Usage examples / validation          ─┤ sequential
  2.3 Update fieldBuilders.mts             ─┘

Phase 3 (FormulaField):                    ─── (depends on Phase 1)
  3.1 FormulaData.mts                      ─┐
  3.2 FormulaField.mts                     ─┤ sequential
  3.3 Update schema declarations           ─┤
  3.4 Update fieldBuilders.mts             ─┘

Phase 4 (Schema decoration):               ─── (depends on Phase 2 + 3)
  4.1 Decorate fields with intellisense    ─┐
  4.2 Delete old builder files             ─┤ sequential
  4.3 Update registration                  ─┘

Phase 5 (Pipeline integration):            ─── (depends on Phase 3 + 4)
  5.1 prepareDerivedData resolution        ─┐
  5.2 Remove nameContextBuilder            ─┤ sequential
  5.3 Simplify update() pipeline           ─┘

Phase 6 (UI integration):                  ─── (depends on Phase 2 + 3)
  6.1 Refactor getViewAwareFieldValue      ─┐
  6.2 Refactor getViewAwareFieldUpdater    ─┤ sequential
  6.3 Refactor setFieldOverride            ─┤
  6.4 Make FieldControls schema-aware      ─┤
  6.5 Update FormulaFormGroup              ─┤
  6.6 Update HeaderNameField               ─┤
  6.7 Simplify store intellisense          ─┘

Phase 7 (Migration):                       ─── (depends on Phase 2 + 3)
  7.1 Dnd35eField migration (scalars)      ─┐
  7.2 Formula field migration              ─┤ parallel
  7.3 PriceField migration                 ─┤
  7.4 _initializeSource compat             ─┤
  7.5 Clean up empty flags                 ─┘

Phase 8 (Cleanup):                         ─── (depends on all above)
  8.1 Remove deprecated code               ─┐
  8.2 Update exports/imports               ─┘

Phase 9 (FormulaFamiliar rebrand):          ─── (can start after Phase 1; best after Phase 8)
  9.1 Rename types + interfaces            ─┐
  9.2 Rename functions + constants          ─┤ sequential
  9.3 Rename option keys on fields          ─┤
  9.4 Update comments + JSDoc              ─┤
  9.5 Update .md documentation             ─┤
  9.6 Update barrel exports + imports      ─┘
```

---

## Verification

### Unit Tests

1. `Dnd35eField.getEffective({ value: 5, unidentifiedValue: 3 }, 'identified')` → 5
2. `Dnd35eField.getEffective({ value: 5, unidentifiedValue: 3 }, 'unidentified')` → 3
3. `Dnd35eField.getEffective({ value: 5, unidentifiedValue: null }, 'unidentified')` → 5
4. `Dnd35eField` AE add on NumberField inner: `{ value: 5 }` + 3 = `{ value: 8 }`
5. `Dnd35eField` AE override: `{ value: 5 }` override 10 = `{ value: 10 }`
6. `Dnd35eField` with BooleanField inner: compound shape works
7. `Dnd35eField` with HTMLField inner: compound shape works
8. Schema walker builds IntellisenseObject from decorated WeaponSystemModel
9. `FormulaData.resolve()` resolves `#self.hardness.value` with live doc
10. `FormulaData.resolve()` with no owner builds union from expectedSubtypes
11. `FormulaData.resolve()` with live owner narrows to specific type
12. `FormulaData.getEffective('unidentified')` returns unidentified resolved value
13. FormulaField AE override replaces formula text, clears resolvedValue
14. Migration converts old scalar + flags → compound shape
15. `_initializeSource` auto-wraps scalar values

### FieldControls Tests

16. Plain StringField → FieldControls renders no visibility/editability buttons
17. `Dnd35eField({ identifiable: false })` → FieldControls renders editability button only (no visibility)
18. `Dnd35eField()` (default) → FieldControls renders both visibility + editability buttons
19. `FormulaField({ identifiable: false })` → same as Dnd35eField non-identifiable
20. `Dnd35eField({ defaultEditability: 'gmOnly' })` → editability button shows locked by default (no DB override needed)
21. GM cycles visibility on identifiable field → writes to `system.field.overrides.visibility`
22. Non-GM user → FieldControls hidden regardless of field type

### Manual Tests

23. Open weapon sheet → `system.hardness.value` displays correctly
24. Toggle to unidentified view → shows `system.hardness.unidentifiedValue`
25. Set field to GM-only → `system.hardness.overrides.visibility === 'gmOnly'`
26. Type `#self.` in formula → see weapon properties from schema walker
27. Open weapon in compendium → `#owner.` shows union of actor types
28. Save formula → DB shows FormulaData source shape
29. Load world → weapon.name reflects resolved formula
30. Typecheck: `npx vue-tsc --noEmit` passes

---

## Further Considerations

1. **Actor TypeDataModels don't exist yet** — Keep lightweight manual intellisense builder. When created, use `Dnd35eField` wrappers.

2. **`formulaContexts` inheritance** — Static getter with `{ ...super.formulaContexts, ...ownContexts }`.

3. **Number formula resolution** — String formulas replace variables inline. Number formulas need expression evaluator. Defer.

4. **Access pattern migration** — Every `system.hardness` reference becomes `system.hardness.value`. This is the largest migration surface. Use find-and-replace per field path. TypeScript compiler will catch misses.

5. **Gradual rollout** — Can migrate fields one at a time. The store override chain handles both: Dnd35eField-wrapped fields self-serve, plain fields check flags. Both systems coexist during migration.

6. **PriceField** — Already an EmbeddedDataField with compound shape. Extend PriceData schema with `unidentifiedValue` + `overrides`. The unidentified price is a second `{ stacks, srdEquivalent }` shape (nullable).

7. **Nested SchemaFields** — For fields like `hp: { value, max }` where the outer SchemaField itself needs overrides: wrap the inner fields individually (`hp.value` = Dnd35eField, `hp.max` = Dnd35eField) rather than wrapping the outer SchemaField. This gives per-sub-field overrides.

---

## Guide: Adding `Dnd35eField` to a New Field

### 1. Update `defineSchema()`

```ts
// Before:
schema.myField = new NumberField({ initial: 0 });

// After:
schema.myField = new Dnd35eField(NumberField,
  { initial: 0 },
  { intellisense: { formulaVisible: true, display: 'My Field' } }  // optional
);
```

### 2. Update all access sites

```ts
// Before:
const val = document.system.myField;

// After:
const val = document.system.myField.value;

// View-aware:
const effective = Dnd35eField.getEffective(document.system.myField, viewMode);
```

### 3. Update UI components

- Display: use `Dnd35eField.getEffective(data, viewMode)` instead of `getViewAwareFieldValue(path, value)`
- Updates: write to `system.myField.value` or `system.myField.unidentifiedValue` based on view mode
- Field controls: read `system.myField.overrides` instead of flag lookup

### 4. Write migration

```ts
// In migration file:
if (typeof source.system.myField !== 'object' || source.system.myField === null) {
  const oldValue = source.system.myField;
  const unidOverrides = source.flags?.dnd35e?.unidentifiedOverrides ?? {};
  const fieldOverrides = source.flags?.dnd35e?.fieldOverrides ?? {};
  const encodedPath = 'system__myField';

  source.system.myField = {
    value: oldValue,
    unidentifiedValue: unidOverrides[encodedPath] ?? null,
    overrides: fieldOverrides[encodedPath] ?? null,
  };

  delete unidOverrides[encodedPath];
  delete fieldOverrides[encodedPath];
}
```

### 5. Add `_initializeSource` compat

In the DataModel's `_initializeSource`, check if the field value is a scalar and auto-wrap.

### Checklist

- [ ] Schema declaration updated to `Dnd35eField`
- [ ] All `.myField` access sites updated to `.myField.value`
- [ ] Intellisense option added if field should appear in formula autocomplete
- [ ] UI components updated (getEffective, view-aware updates, overrides)
- [ ] Migration script written
- [ ] `_initializeSource` compat added
- [ ] Flag entries cleaned up in migration
- [ ] Tests added
