---
description: "Use when working with field permission overrides, masks/effective values, or view-aware getters. Covers visibility/editability, store helpers, and FormGroup integration."
---

# Field Permissions, Overrides & View-Aware Getters

Schema fields are plain Foundry `DataField` instances. Masking (showing different values per mode) is done via Secret AEs + `_masks`. Per-field permission overrides (who can see/edit) live at runtime in `flags.dnd35e.fieldOverrides` and are accessed through `useDocumentSheetStore`.

## View-Aware Field Access

### Two Contexts

**1. FormGroup (Sheet UI)**:
- Use store getters to get view-aware values
- Never reach into raw document properties for display

**2. Business Logic (DataModels)**:
- Use `getViewAwareFieldValue(path)` when showing data to any user
- Use `getSourceProperty(path)` only when you own the raw data (e.g., preparing derived data)

### Store Getters (In FormGroup/Sheet Components)

```typescript
// In FormGroup component
const store = useDocumentSheetStore();

// Gets value respecting current mode (masks applied in play mode)
const effectiveValue = computed(() => store.documentGetters.getViewAwareFieldValue('system.hardness'));

// Gets raw source value (unmasked, from DB)
const sourceValue = computed(() => store.documentGetters.getSourceProperty('system.hardness'));

// EditValue pattern — respects 3-state view mode
const editValue = computed(() => {
  if (props.editDerived || !sourceValue) return props.value;
  if (store.viewMode.value !== 'edit') return props.value;  // play/true use effective value
  return sourceValue.value as T;
});
```

### Business Logic Getters

```typescript
class MyItem extends ItemDataModel {
  // ✅ Display: respects play/true masking
  getDisplayHardness() {
    return this.getViewAwareFieldValue('system.hardness');
  }
  
  // ✅ Internal: raw source value, bypasses masking
  getRealHardness() {
    return this.getSourceProperty('system.hardness');
  }
  
  // ❌ Wrong: no view-mode awareness
  getBadHardness() {
    return this.system.hardness;
  }
}
```

## Field Permission Overrides

### visibility

Controls **who can see the field** (merged through override cascade):

```typescript
// Values
'everyone'   // All users can see
'ownerPlus'  // Owner + GM
'gmOnly'     // GM only
```

**Interaction with modes**:
- `play` mode applies mask/effective logic after permission checks
- `true` mode is GM-only unmasked view
- `edit` mode shows editable source values (when allowed)

### editability

Controls **who can edit the field**:

```typescript
'normal'   // Sheet owner (players their own sheets, GMs all sheets)
'gmOnly'   // Only GMs can edit
```

## Field Override Cascade

Overrides are resolved with **most-restrictive-wins** semantics across the ancestor chain. Priority within each node:

1. **Explicit override** (`store.getFieldOverride('path')`)
2. **Component prop** (`defaultVisibility`, `defaultEditability`)
3. **Schema metadata** (`useDnd35eField()` defaults)
4. **Global default** (`'everyone'` / `'normal'`)

```typescript
// In FormGroup
const override = store.getFieldOverride('system.hardness');
const visibility = override?.visibility 
  ?? this.props.defaultVisibility 
  ?? 'everyone';
const editability = override?.editability 
  ?? this.props.defaultEditability 
  ?? 'normal';
```

**Parent cascades to children**: a section locked to `gmOnly` locks all child fields regardless of their own settings.

Two store getters for different purposes:
- `getFieldOverride(path)` — full cascade, most-restrictive-wins (used by FormGroup/FormGroupSection)
- `getOwnFieldOverride(path)` — only this field's own override (used by FieldControls icons)

## getViewAwareFieldValue

Primary entry point for mode-aware display:

```typescript
// In DocumentSheetStore
getViewAwareFieldValue(path: string) {
  // play mode: check _masks first, then effective value
  // true mode: skip masks, return effective value
  // edit mode: return source value
  const masks = (document.value as unknown as { _masks?: Record<string, unknown> })._masks;
  if (viewMode === PLAY && masks && path in masks) {
    return masks[path];
  }
  return getSourceProperty(path);
}
```

## FormGroup Integration

FormGroups auto-derive labels from localization schema — no explicit label needed:

```vue
<!-- Label comes from dnd35e.PHYSICAL_ITEM.FIELDS.hardness.label -->
<FormGroup 
  :value="viewAwareValue"
  field-path="system.hardness"
>
  <input v-model="editValue" type="number" />

  <template #readonly>{{ value }}</template>

  <template #controls="{ editable }">
    <button v-if="editable" class="field-control-btn" @click="setOverride">
      <i class="fas fa-lock"></i>
    </button>
  </template>
</FormGroup>
```

## Patterns

### Pattern: Play-Mode Masking

```typescript
// In sheet component — always use store getters for display
const ac = store.documentGetters.getViewAwareFieldValue('system.defense.armorClass');
// → masked value in play mode, real value in edit/true mode
```

### Pattern: Setting Field Permissions at Schema Definition

```typescript
// In defineSchema()
schema.hardness = useDnd35eField(requiredNumberField(0), {
  defaultVisibility: 'ownerPlus',
  defaultEditability: 'gmOnly',
});
```

### Pattern: GM-Only Field

```typescript
// Schema: field hidden from players by default
schema.curseStrength = useDnd35eField(requiredNumberField(0), {
  defaultVisibility: 'gmOnly',
});

// Sheet: FormGroup picks up the default automatically
// No explicit defaultVisibility prop needed unless overriding
```

## Related

- [Vue Sheet Patterns](./vue-sheet-patterns.instructions.md) — EditValue pattern, 3-state view modes
- [Form Groups](./form-groups.instructions.md) — FormGroup, FormGroupSection, FieldControls
- [Foundry Data Fields](./foundry-data-fields.instructions.md) — DataField types and `withFamiliar()`
- [FormulaFamiliar](./formula-familiar.instructions.md) — Schema walker and `isFamiliarField` marker
