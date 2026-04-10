---
description: "Use when building Vue sheets, form components, or working on sheet UI. Covers EditValue pattern, dual-axis view modes, field permissions, and component patterns."
applyTo: "src/**/*.vue"
---

# Vue Sheet Architecture & Patterns

## Sheet View Modes

Sheets have **two independent axes**:

| Axis | Controls | User Control |
|------|----------|--------------|
| **Edit/View** | Fields editable or read-only | Lock icon (header) — only visible if editable |
| **Identified/Unidentified** | Identifies or override values shown | Eye icon (header) — GMs only, identifiable items only |

### View Mode Grid

```
                  Edit Mode           View Mode (locked)
Identified        Real values         Real values (readonly)
Unidentified      Override values     Override values (readonly)
```

### Store Getters for View Mode

```typescript
// In any FormGroup or component using useDocumentSheetStore()
const store = useDocumentSheetStore();

store.isEditMode               // true = edit, false = view
store.isEditable               // true = user can edit (has perm AND edit mode)
store.editorViewMode           // 'identified' | 'unidentified'
store.isViewingAsUnidentified  // true if in unidentified view
```

## EditValue Pattern (Required in All FormGroups)

Every FormGroup computes an `editValue` that respects view mode:

```typescript
// In FormGroup component
const sourceValue = store.documentGetters.getSourceProperty<T>(props.fieldPath);
const editorViewMode = store.editorViewMode;

const editValue = computed(() => {
  if (props.editDerived || !sourceValue) return props.value;  // use effective value
  if (editorViewMode.value === 'unidentified') return props.value;  // use override
  return sourceValue.value as T;  // use real value
});
```

**Logic**:
- **Identified edit mode** → show `sourceValue` (user edits real data)
- **Unidentified edit mode** → show `props.value` (effective/override value)
- **Any view mode** → show `props.value` (effective value) but readonly

## Field Permissions & Overrides

GMs can per-field control visibility and editability via field overrides.

### Two Getter Functions

```typescript
// Merged cascade (most restrictive wins)
store.getFieldOverride(path)      // Used by FormGroup for actual behavior

// Own field only (no parent cascade)
store.getOwnFieldOverride(path)   // Used by FieldControls for icon display
```

### Resolution Priority

```
override > prop > fieldMeta > hardcoded default
```

1. Explicit override from `getFieldOverride()`
2. Component prop (`defaultVisibility`, `defaultEditability`)
3. Schema field metadata
4. Hardcoded fallback (`'everyone'` / `'normal'`)

## FormGroup Base Component

All form inputs inherit from `FormGroup.vue`:

```vue
<FormGroup 
  label="Hardness" 
  :value="hardness"
  field-path="system.hardness"
  @update="updateField"
>
  <!-- Edit slot -->
  <input v-model="editValue" type="number" />
  
  <!-- Readonly slot -->
  <template #readonly>{{ value }}</template>
  
  <!-- Controls slot (visible in edit mode) -->
  <template #controls="{ editable }">
    <button v-if="editable" @click="action">
      <i class="fas fa-icon"></i>
    </button>
  </template>
</FormGroup>
```

## Control Button Styling

All custom buttons in `#controls` slots **MUST use `.field-control-btn` class** (from `src/styles/core.scss`):

```vue
<template #controls="{ editable }">
  <button 
    v-if="editable" 
    class="field-control-btn" 
    :class="{ 'is-active': isToggled }"
    @click="toggle"
  >
    <i class="fas fa-check"></i>
  </button>
</template>
```

**Why**: Firefox scoped CSS bug with slotted elements. Base styling from global class, component-specific additions can be scoped.

## FormGroupSection

Groups related FormGroups under shared section-level controls:

```vue
<FormGroupSection label="HP" field-path="system.hp">
  <NumberFormGroup label="Current" :value="currentHp" field-path="system.hp.value" />
  <NumberFormGroup label="Max" :value="maxHp" field-path="system.hp.max" />
</FormGroupSection>
```

Auto-hides when all children are invisible (respects field permissions).

## Compound FormGroup (Dnd35eField)

When a field is `Dnd35eField(InnerType)`, the store automatically handles `.value` unwrapping:

```typescript
// In store computeProperty
getSourceProperty('system.hardness')  // If Dnd35eField(NumberField), returns { value, unidentifiedValue, ... }
getViewAwareFieldValue('system.hardness')  // Already unwrapped to just the number
```

**In FormGroup**:
- Use `props.value` (already unwrapped via `getViewAwareFieldValue`)
- Read `sourceValue.value` when in identified edit mode
- Reference `props.value` when unidentified or view mode

## Sheet Header

Header renders edit/view toggle and identified/unidentified toggle (GMs only):

```typescript
// _renderEditModeButton / _renderIdentifiedViewButton (imperative DOM)
// Only render lock button if `this.isEditable`
// Only render eye button if `isIdentifiable && game.user.isGM`
```

**Never auto-reset view mode on re-render** — GM's toggle choice persists.

## Sheet State Initialization

```typescript
// In VueDocumentSheetMixin constructor
this.sheetState = {
  editMode: true,                              // Start in edit mode
  editorViewMode: doc.system.isIdentified ? 'identified' : 'unidentified'  // Use doc's actual state
};
```
