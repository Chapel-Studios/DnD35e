# Foundry VTT Data Fields Cheat Sheet

> Source: `App/resources/app/common/data/fields.mjs`
> Foundry defines data schemas via `DataField` subclasses. Every field handles cleaning, validation, initialization, serialization, form rendering, and Active Effect change application.

---

## Table of Contents

- [Common Options (All Fields)](#common-options-all-fields)
- [Field Hierarchy](#field-hierarchy)
- [Basic Fields](#basic-fields)
  - [BooleanField](#booleanfield)
  - [NumberField](#numberfield)
  - [StringField](#stringfield)
  - [ObjectField](#objectfield)
- [Compound Fields](#compound-fields)
  - [SchemaField](#schemafield)
  - [ArrayField](#arrayfield)
  - [SetField](#setfield)
  - [TypedObjectField](#typedobjectfield)
  - [TypedSchemaField](#typedschemafield)
- [Embedded Model Fields](#embedded-model-fields)
  - [EmbeddedDataField](#embeddeddatafield)
  - [EmbeddedDocumentField](#embeddeddocumentfield)
  - [EmbeddedCollectionField](#embeddedcollectionfield)
  - [EmbeddedCollectionDeltaField](#embeddedcollectiondeltafield)
- [Document Reference Fields](#document-reference-fields)
  - [DocumentIdField](#documentidfield)
  - [DocumentUUIDField](#documentuuidfield)
  - [ForeignDocumentField](#foreigndocumentfield)
- [Specialized String Fields](#specialized-string-fields)
  - [ColorField](#colorfield)
  - [FilePathField](#filepathfield)
  - [HTMLField](#htmlfield)
  - [JSONField](#jsonfield)
  - [JavaScriptField](#javascriptfield)
  - [DocumentTypeField](#documenttypefield)
- [Specialized Number Fields](#specialized-number-fields)
  - [AngleField](#anglefield)
  - [AlphaField](#alphafield)
  - [HueField](#huefield)
  - [IntegerSortField](#integersortfield)
- [Internal / Niche Fields](#internal--niche-fields)
  - [AnyField](#anyfield)
  - [TypeDataField](#typedatafield)
  - [DocumentFlagsField](#documentflagsfield)
  - [DocumentOwnershipField](#documentownershipfield)
  - [DocumentStatsField](#documentstatsfield)
  - [DocumentAuthorField](#documentauthorfield)
- [Active Effect Change Application](#active-effect-change-application)
  - [How `applyChange` Works](#how-applychange-works)
  - [Change Modes by Field Type](#change-modes-by-field-type)
  - [Extending a Field for Custom `applyChange`](#extending-a-field-for-custom-applychange)
  - [Example: CurrencyField for Currency Values](#example-currencyfield-for-currency-values)
- [When to Extend a Field](#when-to-extend-a-field)

---

## Common Options (All Fields)

Every `DataField` accepts these options:

| Option             | Default     | Description |
| ------------------ | ----------- | ----------- |
| `required`         | `false`     | Must this field be populated? |
| `nullable`         | `false`     | Can this field be `null`? |
| `initial`          | `undefined` | Default value, or a `(source) => value` function. |
| `readonly`         | `false`     | Make the prepared property non-writable (source can still change via `updateSource`). |
| `persisted`        | `true`      | If `false`, the value is not written to source/DB — useful for derived/AE-only fields. |
| `gmOnly`           | `false`     | Only GM/Assistant GM can modify this field. |
| `label`            | `""`        | Localizable label for form rendering. |
| `hint`             | `""`        | Localizable hint text for form rendering. |
| `placeholder`      | `""`        | Localizable placeholder for form inputs. |
| `validate`         | `undefined` | Custom validator: `(value, options) => boolean \| void \| throw Error`. |
| `validationError`  | generic     | Custom error message when validation fails. |

---

## Field Hierarchy

```
DataField
├── BooleanField
├── NumberField
│   ├── AngleField
│   ├── AlphaField
│   ├── HueField
│   └── IntegerSortField
├── StringField
│   ├── DocumentIdField
│   │   └── ForeignDocumentField
│   │       └── DocumentAuthorField
│   ├── DocumentUUIDField
│   ├── DocumentTypeField
│   ├── ColorField
│   ├── FilePathField
│   ├── HTMLField
│   ├── JSONField
│   └── JavaScriptField
├── ObjectField
│   ├── TypedObjectField
│   │   └── DocumentFlagsField
│   ├── TypeDataField
│   └── DocumentOwnershipField
├── SchemaField
│   ├── DataModelSchemaField
│   │   └── EmbeddedDataField
│   │       └── EmbeddedDocumentField
│   └── DocumentStatsField
├── ArrayField
│   ├── SetField
│   ├── EmbeddedCollectionField
│   │   └── EmbeddedCollectionDeltaField
│   └── ShapesField
├── TypedSchemaField
└── AnyField
```

---

## Basic Fields

### BooleanField

**Use when:** You need a true/false toggle.

```js
new BooleanField({ initial: false })
```

| Default Override | Value |
| --- | --- |
| `required` | `true` |
| `nullable` | `false` |
| `initial` | `false` |

**Notes:**
- Casts strings (`"true"` → `true`), objects → `false`, everything else via `Boolean()`.
- Has full AE change support (add = OR, multiply = AND, subtract = XOR with NOT).

---

### NumberField

**Use when:** Numeric values — HP, weight, currency counts, etc.

```js
new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 })
```

| Extra Option   | Default     | Description |
| -------------- | ----------- | ----------- |
| `min`          | `undefined` | Minimum allowed value. |
| `max`          | `undefined` | Maximum allowed value. |
| `step`         | `undefined` | Permitted step size. |
| `integer`      | `false`     | Must be an integer? Auto-rounds during cleaning. |
| `positive`     | `false`     | Must be > 0? Sets `min` to 1 when combined with `integer`. |
| `choices`      | `undefined` | Restrict to specific values (array, object, or function). |

| Default Override | Value |
| --- | --- |
| `nullable` | `true` |

**Notes:**
- Cleaning auto-clamps to `[min, max]` and snaps to `step`.
- `_castChangeDelta` evaluates dice expressions: a change value of `"2d6"` is rolled and resolved to a number.
- Full AE support: add, subtract, multiply, upgrade (max), downgrade (min).

---

### StringField

**Use when:** General text, names, descriptions, enum-style choices.

```js
new StringField({ required: true, blank: false, choices: ["melee", "ranged"] })
```

| Extra Option  | Default  | Description |
| ------------- | -------- | ----------- |
| `blank`       | `true`   | Allow empty string `""`? |
| `trim`        | `true`   | Auto-trim whitespace? |
| `choices`     | `undefined` | Restrict to specific values (array, object, or function). |
| `textSearch`  | `false`  | Is this a text search target? |

**Notes:**
- When `choices` is set, `nullable` and `blank` default to `false`.
- AE subtract does string replacement: `value.replace(delta, "")`.
- AE add concatenates strings.
- AE override replaces value entirely.

---

### ObjectField

**Use when:** Arbitrary key/value data with no enforced inner schema. Use when a schema is too rigid or the shape is truly freeform.

```js
new ObjectField({ initial: () => ({}) })
```

| Default Override | Value |
| --- | --- |
| `required` | `true` |
| `nullable` | `false` |

**Notes:**
- Updates are **merged** (deep diff), not replaced wholesale.
- `initialize()` returns a `deepClone`, so mutations don't leak to source.
- Prefer `SchemaField`, `EmbeddedDataField`, or `TypedObjectField` when structure is known.

---

## Compound Fields

### SchemaField

**Use when:** You need a sub-object with known, typed properties. This is the workhorse for structured data.

```js
new SchemaField({
  value: new NumberField({ integer: true, initial: 10 }),
  max: new NumberField({ integer: true, initial: 10 }),
  temp: new NumberField({ integer: true, initial: 0 })
})
```

| Default Override | Value |
| --- | --- |
| `required` | `true` |
| `nullable` | `false` |

**Key methods:**
- `getField("path.to.field")` — traverse nested schema by dot path.
- `extendFields({...})` — add fields at runtime.
- `removeFields([...])` — remove fields at runtime.
- Cleans, validates, and updates **recursively** through child fields.
- Expands dot-delimited keys (e.g., `{"a.b": 1}` → `{a: {b: 1}}`).

---

### ArrayField

**Use when:** Ordered lists of typed elements.

```js
new ArrayField(new SchemaField({
  coinId: new StringField({ required: true, blank: false }),
  count: new NumberField({ required: true, integer: true, initial: 0 })
}))
```

| Extra Option | Default    | Description |
| ------------ | ---------- | ----------- |
| `min`        | `0`        | Minimum number of elements. |
| `max`        | `Infinity` | Maximum number of elements. |
| `empty`      | `true`     | Allow empty arrays? |

**Notes:**
- Arrays are **fully replaced** on update — no partial element patching.
- `_castChangeDelta` parses JSON strings to arrays, then casts each element via the inner field.
- **AE add** pushes elements. **AE subtract** splices matching elements.
- The `element` can be any `DataField` — `NumberField`, `SchemaField`, etc.

---

### SetField

**Use when:** An unordered collection of unique elements (tags, proficiency sets, etc.).

```js
new SetField(new StringField({ blank: false }))
```

**Extends:** `ArrayField`

**Notes:**
- `initialize()` returns a `Set` (stored as array in source).
- Invalid elements are **dropped** during validation rather than failing the whole field.
- AE add/subtract use `Set.add()`/`Set.delete()`.
- AE upgrade/downgrade compare via `isSupersetOf`/`isSubsetOf`.
- Built-in form support for `DocumentUUIDField` elements, multi-select, and string tags.

---

### TypedObjectField

**Use when:** A mapping of arbitrary string keys to a uniform typed value (e.g., `Record<string, NumberField>`).

```js
new TypedObjectField(new NumberField({ integer: true }), { validateKey: k => /^[a-z]+$/.test(k) })
```

| Extra Option    | Default     | Description |
| --------------- | ----------- | ----------- |
| `validateKey`   | `undefined` | Predicate to filter invalid keys: `(key) => boolean`. |
| `expandKeys`    | `true`      | Expand dot-delimited keys? |

**Extends:** `ObjectField`

**Notes:**
- Validates and cleans each value against the `element` field definition.
- Updates are **merged** like `ObjectField`, but each value goes through the element's `_updateDiff`.
- Supports `ForcedDeletion` to remove individual keys.

---

### TypedSchemaField

**Use when:** A discriminated union — an object whose schema depends on a `type` property.

```js
new TypedSchemaField({
  weapon: { damage: new StringField(), range: new NumberField() },
  spell:  { level: new NumberField(), school: new StringField() }
})
```

**Notes:**
- Each type key maps to a `SchemaField` (or a `DataModel` that gets wrapped in `EmbeddedDataField`).
- A `type` string field is auto-inserted if not present in the type schema.
- Type changes require `ForcedReplacement` — cannot change type via normal updates.
- Good for polymorphic sub-objects where the shape varies by type.

---

## Embedded Model Fields

### EmbeddedDataField

**Use when:** You want a nested `DataModel` instance as a field value.

```js
new EmbeddedDataField(MyDataModel)
```

**Extends:** `DataModelSchemaField` → `SchemaField`

**Notes:**
- `initialize()` constructs a new `DataModel` instance with `parent` set.
- Supports joint validation via `_validateModel`.
- On update, creates a temporary model, calls `updateSource`, and diffs.

---

### EmbeddedDocumentField

**Use when:** A single embedded Document (rare — e.g., `TokenDocument` inside a `Token`).

```js
new EmbeddedDocumentField(SomeDocument)
```

| Default Override | Value |
| --- | --- |
| `nullable` | `true` |

---

### EmbeddedCollectionField

**Use when:** A collection of embedded Documents (e.g., Items on an Actor, Effects on an Item).

**Notes:**
- Invalid elements are **dropped** from the collection rather than failing the parent.
- Manages an `EmbeddedCollection` instance.
- Generally only used by Foundry's internal document definitions — systems rarely create these directly.

---

### EmbeddedCollectionDeltaField

**Use when:** Delta collections (Actor deltas in unlinked tokens). Internal use only.

---

## Document Reference Fields

### DocumentIdField

**Use when:** The `_id` field of a document. You almost never need this manually — it's auto-included.

| Default Override | Value |
| --- | --- |
| `required` | `true` |
| `blank` | `false` |
| `nullable` | `true` |
| `readonly` | `true` |

---

### DocumentUUIDField

**Use when:** Referencing another Document by UUID (cross-collection, cross-compendium references).

```js
new DocumentUUIDField({ type: "Item" })
```

| Extra Option  | Default     | Description |
| ------------- | ----------- | ----------- |
| `type`        | `undefined` | Restrict to a specific Document type (e.g., `"Item"`, `"Actor"`). |
| `embedded`    | `undefined` | `true` = embedded only, `false` = primary only, `undefined` = both. |
| `relative`    | `false`     | Store relative UUIDs (e.g., `.Items.abc123`)? |

---

### ForeignDocumentField

**Use when:** Referencing a document from a world collection by its ID (e.g., linking a User, a Scene, etc.).

```js
new ForeignDocumentField(foundry.documents.BaseUser, { idOnly: true })
```

| Extra Option | Default | Description |
| --- | --- | --- |
| `idOnly` | `false` | If `true`, `initialize()` returns the raw ID string instead of resolving to a Document. |

**Notes:**
- `initialize()` returns a getter function `() => Collection.get(id)` by default.
- Built-in form support renders a select dropdown of visible documents.

---

## Specialized String Fields

### ColorField

**Use when:** CSS color values (`#ff0000`).

- Stores as CSS string, initializes as a `Color` instance.
- Renders a color picker in forms.

### FilePathField

**Use when:** File paths to images, audio, video, etc.

```js
new FilePathField({ categories: ["IMAGE"], nullable: true })
```

| Extra Option   | Default | Description |
| -------------- | ------- | ----------- |
| `categories`   | `[]`    | Required. Keys from `CONST.FILE_CATEGORIES`. |
| `base64`       | `false` | Allow inline base64 data? |
| `wildcard`     | `false` | Allow wildcard (`*`) paths? |
| `virtual`      | `false` | Allow virtual paths starting with `#`? |

**Important:** Declare `FilePathField`s in your `system.json` manifest under `serverSanitizationFields` for proper server-side validation.

### HTMLField

**Use when:** Rich text content (descriptions, biography, notes).

- Must also be declared in `system.json` manifest for server-side sanitization.
- Default form input is ProseMirror editor.

### JSONField

**Use when:** Storing arbitrary serialized JSON as a string.

- Stores as a JSON string, `initialize()` returns `JSON.parse(value)`.
- `toObject()` returns `JSON.stringify(value)`.
- Form input is a CodeMirror JSON editor.

### JavaScriptField

**Use when:** User-editable JavaScript code (macros, custom formulas).

| Extra Option | Default | Description |
| --- | --- | --- |
| `async` | `false` | Validate as async function body? |

### DocumentTypeField

**Use when:** The `type` discriminator on typed Documents. Internal — auto-managed by Foundry.

---

## Specialized Number Fields

### AngleField

Constrained to `[0, 360]`. Normalizes by default (e.g., `-90` → `270`).

### AlphaField

Constrained to `[0, 1]`. Default initial: `1`.

### HueField

Constrained to `[0, 1)`. Normalizes via modulo (wraps around).

### IntegerSortField

An integer for sorting. Default: `required: true, integer: true, initial: 0`.

---

## Internal / Niche Fields

### AnyField

Accepts any value. Use sparingly — opt for typed fields whenever possible.

| Extra Option    | Default | Description |
| --------------- | ------- | ----------- |
| `serializable`  | `false` | If `true`, validates that value survives JSON round-trip. |

### TypeDataField

The `system` field on typed Documents. Delegates cleaning/validation to the registered `CONFIG[docName].dataModels[type]`. Internal — configured automatically.

### DocumentFlagsField

A `TypedObjectField` of `ObjectField` elements with key validation against package IDs. Auto-managed for `flags`.

### DocumentOwnershipField

Maps User IDs to permission levels. Auto-managed for `ownership`.

### DocumentStatsField

The `_stats` schema with `coreVersion`, `systemId`, `createdTime`, etc. Auto-managed.

### DocumentAuthorField

The `author` field on Documents. A `ForeignDocumentField` pointing to `BaseUser`.

---

## Active Effect Change Application

### How `applyChange` Works

The `DataField.applyChange(value, model, change, {replacementData})` method is the entry point. It:

1. **Casts the delta** via `_castChangeDelta(change.value, replacementData)`:
   - Resolves `@property` references using `replacementData`.
   - Calls `_cast()` to coerce to the field's type.
   - `NumberField` evaluates dice/math expressions via `Roll.evaluateSync()`.
2. **Dispatches** based on `change.type`:
   - `"add"` → `_applyChangeAdd(value, delta, model, change)`
   - `"subtract"` → `_applyChangeSubtract(value, delta, model, change)`
   - `"multiply"` → `_applyChangeMultiply(value, delta, model, change)`
   - `"override"` → `_applyChangeOverride(value, delta, model, change)`
   - `"upgrade"` → `_applyChangeUpgrade(value, delta, model, change)`
   - `"downgrade"` → `_applyChangeDowngrade(value, delta, model, change)`
   - anything else → `_applyChangeCustom(value, delta, model, change)` (fires `Hooks.call("applyActiveEffect", ...)`)
3. **Validates** the result: cleans and re-validates the updated value. If invalid, reverts to original.

### Change Modes by Field Type

| Field | add | subtract | multiply | override | upgrade | downgrade | custom |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **DataField** (base) | `value + delta` | no-op | no-op | `delta` | no-op | no-op | Hook |
| **BooleanField** | OR | XOR-NOT | AND | `delta` | `max()` | `min()` | Hook |
| **NumberField** | `value + delta` | `value - delta` | `value * delta` | `delta` | `max(value, delta)` | `min(value, delta)` | Hook |
| **StringField** | concatenate | `value.replace(delta, "")` | no-op | `delta` | no-op | no-op | Hook |
| **ArrayField** | `push(...delta)` | `splice` matching | no-op | `delta` | no-op | no-op | Hook |
| **SetField** | `add()` | `delete()` | no-op | `delta` | `isSupersetOf` | `isSubsetOf` | Hook |

> **"no-op"** means the base `DataField` implementation returns `value` unchanged.

### Extending a Field for Custom `applyChange`

You should extend a field when:

1. **The built-in change operations don't make sense for your data type** — e.g., adding to a `Price` (array of `CoinStack`) shouldn't just push a new element, it should merge coin stacks by `coinId`.
2. **You need custom delta casting** — e.g., parsing `"5 gp, 3 sp"` into `CoinStack[]`.
3. **You want custom validation during change application** — e.g., ensuring no duplicate `coinId` entries.

**The key methods to override:**

| Method | Purpose |
| --- | --- |
| `_castChangeDelta(raw, replacementData)` | Parse the AE change value string into your domain type |
| `_applyChangeAdd(value, delta, model, change)` | Define what "add" means for your type |
| `_applyChangeSubtract(value, delta, model, change)` | Define what "subtract" means for your type |
| `_applyChangeMultiply(value, delta, model, change)` | Define what "multiply" means (or leave as no-op) |
| `_applyChangeOverride(value, delta, model, change)` | Define what "override" means |
| `_applyChangeUpgrade(value, delta, model, change)` | Define what "upgrade" (take-higher) means |
| `_applyChangeDowngrade(value, delta, model, change)` | Define what "downgrade" (take-lower) means |

You can also override `applyChange` itself for complete control, but usually the individual methods are sufficient.

### Example: CurrencyField for Currency Values

A `Price` is `CoinStack[]` where each `CoinStack` is `{ coinId: string, count: number }`. The natural base is `ArrayField` with a `SchemaField` element, but extending `ArrayField` gives us currency-aware AE behavior:

```ts
// src/fields/CurrencyField.mts

import type { CoinStack, Price } from "../../settings/currency/_types.mts";

/**
 * A specialized ArrayField for currency (CoinStack[]) values.
 *
 * Provides Active Effect change modes that operate on coin stacks by coinId:
 * - add: merge coin counts by coinId (adds counts for matching coins, appends new ones)
 * - subtract: reduce coin counts by coinId (removes stacks that reach 0)
 * - multiply: multiply all coin counts by a scalar
 * - override: replace entire currency value
 * - upgrade: per-coinId max of counts
 * - downgrade: per-coinId min of counts
 */
class CurrencyField extends foundry.data.fields.ArrayField {
  constructor(options = {}, context = {}) {
    super(
      new foundry.data.fields.SchemaField({
        coinId: new foundry.data.fields.StringField({ required: true, blank: false }),
        count:  new foundry.data.fields.NumberField({ required: true, integer: true, initial: 0 }),
      }),
      {
        required: true,
        nullable: false,
        initial: [],
        ...options,
      },
      context,
    );
  }

  /* ---- Delta Casting ---- */

  /**
   * Parse an AE change value into a Price array.
   * Accepts JSON (e.g., '[{"coinId":"gp","count":5}]') or a shorthand
   * string like "5 gp, 3 sp".
   */
  override _castChangeDelta(raw: string, replacementData: Record<string, unknown> = {}): Price {
    if (typeof raw === "string") {
      raw = this._replaceDataRefs(raw, replacementData);
    }
    // Try JSON first
    try {
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((e: any) => ({ coinId: String(e.coinId), count: Number(e.count) }));
    } catch {
      // Fall through to shorthand parsing
    }
    // Shorthand: "5 gp, 3 sp"
    return this.#parseShorthand(String(raw));
  }

  #parseShorthand(raw: string): Price {
    return raw.split(",").reduce<Price>((acc, part) => {
      const match = part.trim().match(/^([+-]?\d+)\s+(\S+)$/);
      if (match) acc.push({ coinId: match[2], count: Number(match[1]) });
      return acc;
    }, []);
  }

  /* ---- Helpers ---- */

  /** Convert Price array to a Map<coinId, count> for easy manipulation. */
  static #toMap(price: Price): Map<string, number> {
    return new Map(price.map(s => [s.coinId, s.count]));
  }

  /** Convert Map back to Price array, filtering out zero/negative counts. */
  static #fromMap(map: Map<string, number>, keepZero = false): Price {
    const result: Price = [];
    for (const [coinId, count] of map) {
      if (keepZero || count > 0) result.push({ coinId, count });
    }
    return result;
  }

  /* ---- Change Modes ---- */

  /** Add: merge coin stacks by coinId. */
  override _applyChangeAdd(value: Price, delta: Price, _model: any, _change: any): Price {
    const map = CurrencyField.#toMap(value);
    for (const stack of delta) {
      map.set(stack.coinId, (map.get(stack.coinId) ?? 0) + stack.count);
    }
    return CurrencyField.#fromMap(map);
  }

  /** Subtract: reduce coin counts by coinId. Removes stacks at 0 or below. */
  override _applyChangeSubtract(value: Price, delta: Price, _model: any, _change: any): Price {
    const map = CurrencyField.#toMap(value);
    for (const stack of delta) {
      const current = map.get(stack.coinId) ?? 0;
      const result = current - stack.count;
      if (result <= 0) map.delete(stack.coinId);
      else map.set(stack.coinId, result);
    }
    return CurrencyField.#fromMap(map);
  }

  /** Multiply: scale all coin counts by a numeric factor. */
  override _applyChangeMultiply(value: Price, delta: Price, _model: any, _change: any): Price {
    // For multiply, the delta should be a single numeric factor.
    // If the delta is a Price, use the first stack's count as the factor.
    const factor = delta.length === 1 ? delta[0].count : 1;
    return value.map(s => ({ coinId: s.coinId, count: Math.round(s.count * factor) }))
      .filter(s => s.count > 0);
  }

  /** Override: replace entirely. */
  override _applyChangeOverride(value: Price, delta: Price, _model: any, _change: any): Price {
    return delta;
  }

  /** Upgrade: per-coinId, take the higher count. */
  override _applyChangeUpgrade(value: Price, delta: Price, _model: any, _change: any): Price {
    const map = CurrencyField.#toMap(value);
    for (const stack of delta) {
      map.set(stack.coinId, Math.max(map.get(stack.coinId) ?? 0, stack.count));
    }
    return CurrencyField.#fromMap(map);
  }

  /** Downgrade: per-coinId, take the lower count. Only affects existing coins. */
  override _applyChangeDowngrade(value: Price, delta: Price, _model: any, _change: any): Price {
    const map = CurrencyField.#toMap(value);
    for (const stack of delta) {
      if (map.has(stack.coinId)) {
        map.set(stack.coinId, Math.min(map.get(stack.coinId)!, stack.count));
      }
    }
    return CurrencyField.#fromMap(map);
  }
}
```

**Usage in a data model schema:**

```ts
static override defineSchema() {
  return {
    ...super.defineSchema(),
    price: new CurrencyField(),
  };
}
```

**Active Effect examples with this field:**

| Mode | Change Value | Effect |
| --- | --- | --- |
| Add | `"5 gp, 10 sp"` | Adds 5 to the gp stack, 10 to sp stack |
| Add | `[{"coinId":"gp","count":5}]` | Same, using JSON |
| Subtract | `"3 gp"` | Removes 3 gp from the item price |
| Multiply | `"2 x"` (factor) | Doubles all coin counts |
| Override | `"10 gp"` | Replaces entire price |
| Upgrade | `"5 gp"` | Sets gp to at least 5 |
| Downgrade | `"5 gp"` | Caps gp at 5 |

---

## When to Extend a Field

| Reason | Example |
| --- | --- |
| **Custom AE change semantics** | `CurrencyField` — domain-aware add/subtract on coin stacks. |
| **Custom delta casting** | Parsing shorthand strings (`"5 gp"`) into structured data. |
| **Custom cleaning/coercion** | Normalizing or sorting values during `_cleanType`. |
| **Custom validation** | Business rules beyond simple type/range checks. |
| **Custom initialization** | Wrapping raw source in a domain object (like `ColorField` → `Color`). |
| **Custom form rendering** | Providing a specialized `_toInput` widget. |
| **Custom serialization** | Different stored vs. runtime representations (like `JSONField`). |

**When NOT to extend:**
- If the built-in `validate` option on the field constructor is sufficient — use it instead.
- If you only need to adjust defaults — just pass different options.
- If the data shape is standard (string, number, object) — use the appropriate built-in field.

**General extension pattern:**

```js
class MyCustomField extends foundry.data.fields.ArrayField {
  constructor(options = {}, context = {}) {
    super(new foundry.data.fields.SchemaField({ /* inner schema */ }), options, context);
  }

  // Override only the methods you need
  _castChangeDelta(raw, replacementData) { /* ... */ }
  _applyChangeAdd(value, delta, model, change) { /* ... */ }
  _applyChangeSubtract(value, delta, model, change) { /* ... */ }
  // etc.
}
```
