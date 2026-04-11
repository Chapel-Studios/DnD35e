---
description: "Use when building form components, FormGroup variants, or sheet-level form composition. Covers organizing fields into logical groups, conditional rendering, and nesting patterns."
---

# Form Groups & Sheet Composition

## FormGroup Base Class

All form inputs inherit from `FormGroup.vue` base component. It provides:

- **Auto-derived labels & hints** from schema fields (via `LOCALIZATION_PREFIXES`)
- **View/Edit mode toggle** (sheet-level)
- **Field permissions** (visibility, editability)
- **Slot system** (edit, readonly, controls)

```vue
<!-- Label auto-derived from schema — no explicit label needed -->
<FormGroup 
  :value="hardnessValue"
  field-path="system.hardness"
  :default-visibility="'everyone'"
  :default-editability="'normal'"
>
  <!-- Slot: edit mode input -->
  <input v-model="editValue" type="number" />
  
  <!-- Slot: readonly display -->
  <template #readonly>{{ value }}</template>
  
  <!-- Slot: field-level buttons (visible in edit mode) -->
  <template #controls="{ editable }">
    <button v-if="editable" @click="action">Icon</button>
  </template>
</FormGroup>
```

## Label & Hint Auto-Derivation

FormGroup **auto-derives labels and hints from the schema** using Foundry's `LOCALIZATION_PREFIXES`. No explicit `label` prop is needed in most cases.

### How It Works

1. Each DataModel declares `static LOCALIZATION_PREFIXES` (e.g., `['dnd35e.WEAPON']`)
2. Language files have `dnd35e.WEAPON.FIELDS.fieldName.label` / `.hint` entries
3. At startup, Foundry's `localizeDataModel()` sets `field.options.label` and `field.options.hint` as **pre-localized text**
4. `FormGroup` reads `schemaField.options.label` directly — no `localize()` call needed

### Resolution Logic

```typescript
// resolvedLabel computed:
if (props.label)  → game.i18n.localize(props.label)   // explicit = localization key
else              → schemaField?.options?.label ?? ''   // auto = pre-localized text

// resolvedHint computed:
if (props.hint)   → game.i18n.localize(props.hint)    // explicit = localization key  
else              → schemaField?.options?.hint ?? ''    // auto = pre-localized text
```

### Schema Field Lookup

`getSchemaField(fieldPath)` from `FieldOverridesStore` traverses `document.system.schema._getField()`. This correctly resolves inherited fields — e.g., `system.weight` on a Weapon sheet resolves to `PhysicalItemSystemModel`'s weight field, reading `dnd35e.PHYSICAL_ITEM.FIELDS.weight.label`.

### When to Use Explicit Labels

Only pass a `label` prop when the field **doesn't have a schema entry** or you need to **override** the schema label:

```vue
<!-- ✅ Auto-derived (preferred) -->
<NumberFormGroup :value="hardness" field-path="system.hardness" />

<!-- ✅ Explicit override (localization key) -->
<NumberFormGroup label="dnd35e.COMMON.CustomLabel" :value="val" field-path="system.field" />

<!-- ❌ WRONG: Hardcoded English -->
<NumberFormGroup label="Hardness" :value="hardness" field-path="system.hardness" />
```

## Props

### FormGroup Base Props

```typescript
{
  label?: string;              // Localization key (optional — auto-derives from schema)
  hint?: string;               // Localization key (optional — auto-derives from schema)
  localizeHint?: boolean;      // Default: true. Set false if hint is already localized text.
  value?: string | number | null;  // Effective (view-aware) value
  fieldPath: string;           // Document field path (e.g., "system.hardness")
  defaultVisibility?: FieldVisibility;   // Fallback visibility permission
  defaultEditability?: FieldEditability; // Fallback editability permission
  readOnly?: boolean;          // Force readonly display
}
```

## FormGroupSection

Groups related FormGroups under a section heading with section-level controls:

```vue
<!-- Labels auto-derived from schema FIELDS entries -->
<FormGroupSection label="Hit Points" field-path="system.hp">
  <NumberFormGroup :value="currentHp" field-path="system.hp.value" />
  <NumberFormGroup :value="maxHp" field-path="system.hp.max" />
  <NumberFormGroup :value="tempHp" field-path="system.hp.temp" />
</FormGroupSection>
```

### Behaviors

- **Auto-hides** when all children are invisible (field permissions)
- **Renders heading** only when section is visible
- **Groups styling** via `.form-section` wrapper

### Usage Patterns

#### Pattern 1: Stat Block (Simple Fields)

```vue
<FormGroupSection label="Abilities" field-path="system.abilities">
  <AbilityFormGroup 
    v-for="attr of ['str', 'dex', 'con', 'int', 'wis', 'cha']"
    :key="attr"
    :attribute="attr"
    :value="abilities[attr]"
    :field-path="`system.abilities.${attr}`"
  />
</FormGroupSection>
```

#### Pattern 2: Conditional Section

```vue
<FormGroupSection 
  v-if="showAdvanced"
  label="Advanced Options"
  field-path="system.advanced"
>
  <!-- Advanced fields -->
</FormGroupSection>
```

#### Pattern 3: Nested FormGroups

```vue
<FormGroupSection label="Armor" field-path="system.armor">
  <FormGroupSection label="Physical AC" field-path="system.armor.physical">
    <NumberFormGroup label="Base" :value="baseAc" />
    <NumberFormGroup label="Dex" :value="dexAc" />
  </FormGroupSection>
</FormGroupSection>
```

## Specialized FormGroups

### NumberFormGroup

For numeric input fields:

```vue
<!-- Label auto-derived from schema -->
<NumberFormGroup 
  :value="hardness"
  field-path="system.hardness"
/>
```

### TextFormGroup

For text input:

```vue
<TextFormGroup 
  :value="description"
  field-path="system.description"
/>
```

### SelectFormGroup

For dropdowns/select:

```vue
<SelectFormGroup 
  :value="rarity"
  field-path="system.rarity"
  :options="{ common: 'Common', rare: 'Rare', unique: 'Unique' }"
/>
```

### RichTextFormGroup

For HTML content:

```vue
<RichTextFormGroup 
  :value="rules"
  field-path="system.rules"
  :minimal="false"
/>
```

### TagsFormGroup

For arrays of tags:

```vue
<TagsFormGroup 
  :value="keywords"
  field-path="system.keywords"
  :allowed="['fire', 'cold', 'electricity', 'sonic']"
/>
```

## Sheet-Level Composition

### Basic Pattern

```vue
<template>
  <div class="sheet-body">
    <nav class="tabs">
      <a href="#basics" class="item">Basics</a>
      <a href="#advanced" class="item">Advanced</a>
    </nav>
    
    <div class="tab" :class="{ active: activeTab === 'basics' }">
      <FormGroupSection label="Identity" field-path="system.identity">
        <TextFormGroup :value="name" field-path="system.name" />
        <SelectFormGroup :value="type" field-path="system.type" />
      </FormGroupSection>
    </div>
    
    <div class="tab" :class="{ active: activeTab === 'advanced' }">
      <FormGroupSection label="Properties" field-path="system.properties">
        <!-- Advanced fields -->
      </FormGroupSection>
    </div>
  </div>
</template>
```

### Two-Column Layout

```vue
<template>
  <div class="sheet-body grid-2">
    <div class="column-1">
      <FormGroupSection label="Primary">
        <!-- Left side fields -->
      </FormGroupSection>
    </div>
    
    <div class="column-2">
      <FormGroupSection label="Secondary">
        <!-- Right side fields -->
      </FormGroupSection>
    </div>
  </div>
</template>
```

### Conditional Sections (Based on Item Type)

```vue
<template>
  <div class="sheet-body">
    <!-- Always shown -->
    <FormGroupSection label="Basic Info" field-path="system.basic">
      <TextFormGroup :value="name" field-path="system.name" />
    </FormGroupSection>
    
    <!-- Type-specific sections -->
    <template v-if="itemType === 'weapon'">
      <FormGroupSection label="Combat" field-path="system.combat">
        <TextFormGroup :value="damage" field-path="system.weaponDamage.damageRoll" />
        <NumberFormGroup :value="critical" field-path="system.weaponDamage.critMultiplier" />
      </FormGroupSection>
    </template>
    
    <template v-else-if="itemType === 'armor'">
      <FormGroupSection label="Protection" field-path="system.protection">
        <NumberFormGroup :value="acBonus" field-path="system.acBonus" />
        <NumberFormGroup :value="maxDex" field-path="system.maxDex" />
      </FormGroupSection>
    </template>
  </div>
</template>
```

## Permission-Aware Rendering

FormGroups **auto-hide** when field is invisible to current user (respects `visibility` override).

```vue
<!-- FormGroupSection checks field permissions -->
<FormGroupSection 
  label="Secret Info"
  field-path="system.secret"
  :default-visibility="'gm'"  <!-- Fallback: GMs only -->
>
  <!-- Auto-hides for non-GMs -->
  <TextFormGroup :value="secret" field-path="system.secret.value" />
</FormGroupSection>
```

Store getter handles logic:

```typescript
// In FormGroupSection component
const isVisible = computed(() => {
  const fieldOverride = store.getFieldOverride(props.fieldPath);
  const visibility = fieldOverride?.visibility ?? props.defaultVisibility ?? 'everyone';
  
  // Check if current user can see this field
  return visibility === 'everyone' || (visibility === 'gm' && game.user.isGM);
});
```

## Control Slot Pattern

Buttons in `#controls` slot appear inline with label, only in edit mode:

```vue
<template #controls="{ editable }">
  <!-- Only render if editable -->
  <button v-if="editable" class="field-control-btn" @click="rollDice">
    <i class="fas fa-dice-d20"></i>
  </button>
</template>
```

**Important**: Use `.field-control-btn` class for consistent styling (see [Vue Sheet Patterns](./vue-sheet-patterns.instructions.md#control-button-styling)).

## EditValue Pattern in FormGroups

All FormGroups implement the **EditValue pattern** (see [Vue Sheet Patterns](./vue-sheet-patterns.instructions.md#editvalue-pattern-required-in-all-formgroups)):

```typescript
const editValue = computed({
  get() {
    // If viewing unidentified, use override value
    if (store.editorViewMode === 'unidentified' && !props.editDerived) {
      return props.value;  // Already unwrapped by store
    }
    
    // If editing derived value, use effective value
    if (props.editDerived) {
      return props.value;
    }
    
    // Identified edit mode: use source value if available
    if (sourceValue.value) {
      return sourceValue.value;
    }
    
    return props.value;
  },
  set(newVal) {
    emit('update', newVal);
  },
});
```

## Related Patterns

See also:
- [Vue Sheet Patterns](./vue-sheet-patterns.instructions.md) — Sheet view modes, EditValue pattern
- [Dnd35eField Pattern](./dnd35e-field.instructions.md) — Compound fields with overrides
