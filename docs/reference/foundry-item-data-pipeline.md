# 🧩 Foundry Item System Data Pipeline (Cheat Sheet)

This document explains the four core types involved in a Foundry VTT item’s system data lifecycle:

- `ItemSystemSchema`
- `ItemSystemSource`
- `ItemSystemModel`
- `ItemSystemData`

It also clarifies how `SourceFromSchema` and `ModelPropsFromSchema` work under the hood.

---

## 1. **ItemSystemSchema**  
### *The blueprint (static definition)*

This is a **type literal** describing your system data fields using `DataField` classes.  
You implement it in `static defineSchema()`.

```ts
type ItemSystemSchema = {
  name: fields.StringField<string, string, true, false, true>;
  weight: fields.NumberField<number, number, true, false, true>;
};
```

**Purpose:**  
Defines the structure of your system data.  
Drives both `SourceFromSchema` and `ModelPropsFromSchema`.

---

## 2. **ItemSystemSource**  
### *The raw JSON stored in the database*

Derived from the schema via:

```ts
type ItemSystemSource = SourceFromSchema<ItemSystemSchema>;
```

This is the shape of:

- `item.toObject().system`
- data stored in compendiums
- incoming update data (`item.update({ system: … })`)

**Key idea:**  
**Source = “what exists in JSON”.**

---

## 3. **ItemSystemModel**  
### *The actual runtime class*

This is the **class** instantiated for `item.system`.  
It extends Foundry’s `TypeDataModel` and may add runtime-only fields.

```ts
abstract class ItemSystemModel<
  TParent extends ItemDnd35e = ItemDnd35e,
  TSchema extends ItemSystemSchema = ItemSystemSchema,
> extends foundry.abstract.TypeDataModel<TParent, TSchema> {
  notInSourceJSON!: string;

  override prepareDerivedData() {
    super.prepareDerivedData();
    this.notInSourceJSON = "newly added property";
  }
}
```

**What lives on the instance (`item.system`):**

- All schema-backed fields (`ModelPropsFromSchema<ItemSystemSchema>`)
- **Plus any derived/runtime-only fields you assign in `prepareDerivedData()`**

**Key idea:**  
**Model = the class + runtime behavior + derived fields.**

---

## 4. **ItemSystemData**  
### *The full runtime shape of `item.system`*

If you want `ItemSystemData` to represent the **actual** shape of `item.system`, including derived fields, define it as:

```ts
type ItemSystemData = ItemSystemSource & {
  notInSourceJSON: string;
};
```

This reflects reality:

- `ItemSystemSource` = schema-backed fields  
- Derived fields added in `prepareDerivedData()` extend the model instance

**Key idea:**  
**Data = Source + Derived.**

---

# 🔍 What do `SourceFromSchema` and `ModelPropsFromSchema` actually do?

Both are **type-level projections** that walk your `ItemSystemSchema` and extract types from each `DataField`.

### `SourceFromSchema<S>`
Produces the **raw JSON shape**:

- Unwraps each `DataField` into its **source type**
- Applies `required`, `nullable`, and `initial` flags

Example:

```
StringField<string, …> → string
NumberField<number, …> → number
```

### `ModelPropsFromSchema<S>`
Produces the **runtime model property types**:

- Unwraps each `DataField` into its **model type**
- Often similar to source, but may be normalized or stricter

---

# 🧠 Final Summary Diagram

```
ItemSystemSchema
  - Blueprint of DataFields
  - Implemented in defineSchema()

↓ SourceFromSchema

ItemSystemSource
  - Raw JSON shape
  - Stored in DB/compendiums

↓ Instantiated as ItemSystemModel class
↓ prepareDerivedData() adds runtime-only fields

ItemSystemData = ItemSystemSource & DerivedFields
  - Full runtime shape of item.system
  - Includes both schema-backed and derived fields
```
