---
description: "Use when building form components, FormGroup variants, or sheet-level form composition. Covers organizing fields into logical groups, conditional rendering, and nesting patterns."
---

# Form Groups & Sheet Composition

## FormGroup Base Class

All form inputs inherit from `FormGroup.vue` base component. It provides:

- **View/Edit mode toggle** (sheet-level)
- **Field permissions** (visibility, editability)
- **Label & description** rendering
- **Slot system** (edit, readonly, controls)

```vue
<FormGroup 
  label="Hardness" 
  :value="hardnessValue"
  field-path="system.hardness"
  :default-visibility="'everyone'"
  :default-editability="'normal'"
  @update="updateField"
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

## Props & Emits

### Inherited by All FormGroups

```vue
<script>
export default {
  props: {
    // Core value
    value: { required: true },  // Effective (view-aware) value
    
    // Field metadata
    label: String,              // Form label
    description: String,        // Help text
    fieldPath: String,          // Document field path (e.g., "system.hardness")
    
    // Sheet integration
    editDerived: Boolean,       // Edit effective value (not source)
    defaultVisibility: String,  // Fallback permission
    defaultEditability: String,
    
    // Styling
    asInline: Boolean,          // Display inline vs stacked
    labelWidth: String,         // Custom label width
  },
  
  emits: ['update'],  // Emitted when field changes
};
</script>
```

### Example: Custom FormGroup

```vue
<script setup>
// Inherit all FormGroup props except custom ones
const props = defineProps({
  // FormGroup base props (inherited)
  value: { required: true },
  label: String,
  fieldPath: String,
  // ... other FormGroup props
  
  // Custom for this component
  step: { type: Number, default: 1 },
  max: Number,
});

const editValue = computed({
  get: () => props.value,
  set: (val) => emit('update', val),
});
</script>

<template>
  <FormGroup :value="value" :label="label" v-bind="props" @update="$emit('update', $event)">
    <input v-model.number="editValue" type="number" :step="step" :max="max" />
    <template #readonly>{{ value }}</template>
  </FormGroup>
</template>
```

## FormGroupSection

Groups related FormGroups under a section heading with section-level controls:

```vue
<FormGroupSection label="Hit Points" field-path="system.hp">
  <NumberFormGroup label="Current" :value="currentHp" field-path="system.hp.value" />
  <NumberFormGroup label="Maximum" :value="maxHp" field-path="system.hp.max" />
  <NumberFormGroup label="Temporary" :value="tempHp" field-path="system.hp.temp" />
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
<NumberFormGroup 
  label="Hardness"
  :value="hardness"
  field-path="system.hardness"
  :min="0"
  :max="20"
  :step="0.5"
/>
```

### StringFormGroup

For text input:

```vue
<StringFormGroup 
  label="Description"
  :value="description"
  field-path="system.description"
  as-inline
/>
```

### SelectFormGroup

For dropdowns/select:

```vue
<SelectFormGroup 
  label="Rarity"
  :value="rarity"
  field-path="system.rarity"
  :options="{ common: 'Common', rare: 'Rare', unique: 'Unique' }"
/>
```

### RichTextFormGroup

For HTML content:

```vue
<RichTextFormGroup 
  label="Special Rules"
  :value="rules"
  field-path="system.rules"
  :minimal="false"
/>
```

### TagsFormGroup

For arrays of tags:

```vue
<TagsFormGroup 
  label="Keywords"
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
        <StringFormGroup label="Name" />
        <StringFormGroup label="Type" />
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
      <StringFormGroup label="Name" />
    </FormGroupSection>
    
    <!-- Type-specific sections -->
    <template v-if="itemType === 'weapon'">
      <FormGroupSection label="Combat" field-path="system.combat">
        <DiceFormGroup label="Damage" />
        <NumberFormGroup label="Critical" />
      </FormGroupSection>
    </template>
    
    <template v-else-if="itemType === 'armor'">
      <FormGroupSection label="Protection" field-path="system.protection">
        <NumberFormGroup label="AC Bonus" />
        <NumberFormGroup label="Max Dex" />
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
  <StringFormGroup label="Secret" />
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
