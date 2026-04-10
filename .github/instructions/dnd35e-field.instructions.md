---
description: "Use when working with Dnd35eField compound fields, unidentified values, or field overrides. Covers structure, view-aware getters, and permissions."
---

# Dnd35eField & Compound Field Patterns

## Dnd35eField Structure

`Dnd35eField(InnerType)` is a **compound field that wraps a value with metadata**:

```typescript
// Definition
const hardnessField = new Dnd35eField(new NumberField({
  min: 0,
  initial: 10,
}));

// Storage
{
  value: 10,
  unidentifiedValue: 5,      // Override when unidentified
  visibility: 'everyone',     // Who can see real value
  editability: 'normal',      // Who can edit
}
```

## Why Dnd35eField?

Enables **per-field unidentified view overrides** and **granular permissions**:

| Field | Shows | Real Value | Unidentified Override |
|-------|-------|------------|----------------------|
| Hardness | Identified | 10 (hardness) | 5 (default) |
| Hardness | Unidentified (view) | 5 override | 5 override |
| Special | Missing override | 999 | 999 (fallback to real) |

## Accessing Dnd35eField Values

### Two Contexts

**1. FormGroup (Sheet UI)**:
- Use store getters to get view-aware values
- Never directly access `.value` or `.unidentifiedValue`

**2. Business Logic (Systems/Modules)**:
- Use `system.getViewAwareFieldValue(path)` when showing data to any user
- Use `system.getSourceProperty(path).value` only when you own the data

### Store Getters (In FormGroup/Sheet Components)

```typescript
// In FormGroup component
const store = useDocumentSheetStore();

// Gets unwrapped value based on view mode
const effectiveValue = computed(() => store.documentGetters.getViewAwareFieldValue('system.hardness'));

// Gets raw Dnd35eField for edit mode
const sourceValue = computed(() => store.documentGetters.getSourceProperty('system.hardness'));

// In EditValue pattern (see vue-sheet-patterns.md)
const editValue = computed(() => {
  if (props.editDerived || !sourceValue) return effectiveValue;  // Already unwrapped
  if (editorViewMode === 'unidentified') return effectiveValue;  // Use override
  return sourceValue.value;  // Real value in identified edit mode
});
```

### System Getters (In Business Logic)

```typescript
class MyItem extends ItemDataModel {
  // ✅ Correct: Gets view-aware value for display
  getDisplayHardness(forViewer = game.user) {
    // Respects unidentified view mode
    return this.getViewAwareFieldValue('system.hardness');
  }
  
  // ✅ Correct: Gets real data in identified edit context
  getRealHardness() {
    // Direct access to .value, skipping unidentified override
    return this.system.getSourceProperty('system.hardness').value;
  }
  
  // ❌ WRONG: Ignores unidentified view mode
  getBadHardness() {
    return this.system.hardness;  // No context aware logic
  }
}
```

## Dnd35eField Metadata

### visibility

Controls **who can see the real value** (not the override):

```typescript
// In field override
{
  visibility: 'everyone',      // All users see real value
  visibility: 'gm',            // Only GMs see real value, others see fake
  visibility: 'private',       // Only owner sees real value
  visibility: 'observer',      // Observers see real value (default for characters)
}
```

**Interaction with unidentified**:
- If `visibility: 'gm'` and item is unidentified:
  - **GMs** see real value
  - **Players** see override value
- If `visibility: 'everyone'`:
  - **All users** see real value (override unused)

### editability

Controls **who can edit the field**:

```typescript
{
  editability: 'normal',       // Sheet owner (players their own, GMs all)
  editability: 'gm',           // Only GMs can edit
  editability: 'locked',       // No one can edit (read-only)
}
```

## Field Override Cascade

Permissions are set in **sheets** via override system. Priority:

1. **Explicit override** (`store.getFieldOverride('path')`)
2. **Component prop** (`defaultVisibility`, `defaultEditability`)
3. **Schema metadata** (field definition)
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

## Using getViewAwareFieldValue

This is the **primary entry point** for displaying data:

```typescript
/**
 * Get field value respecting unidentified view mode and permissions.
 * @param path - Field path (e.g., "system.hardness")
 * @returns Unwrapped value
 */
getViewAwareFieldValue(path) {
  const sourceProperty = this.getSourceProperty(path);
  
  // Not a Dnd35eField, return as-is
  if (sourceProperty?.value === undefined) return sourceProperty;
  
  // Dnd35eField: check view mode
  const editorViewMode = this.sheet?.sheetState?.editorViewMode ?? 'identified';
  
  if (editorViewMode === 'identified') {
    return sourceProperty.value;  // Real value
  } else {
    // Unidentified: prefer override, fallback to real
    return sourceProperty.unidentifiedValue !== undefined 
      ? sourceProperty.unidentifiedValue 
      : sourceProperty.value;
  }
}
```

## Setting Dnd35eField Values

### From Documents
```typescript
// Setting via document property
item.system.hardness = 10;  // Auto-wraps in Dnd35eField

// Via updateSource
item.updateSource({ 'system.hardness': 10 });

// Via structured update
item.update({
  'system.hardness': 10,
  'system.-=oldField': null,  // Delete old field
});
```

### Unidentified Overrides
```typescript
// Set override value (shown when unidentified)
item.updateSource({
  'system.hardness.unidentifiedValue': 5,
});

// Set permissions
item.updateSource({
  'system.hardness.visibility': 'gm',
  'system.hardness.editability': 'locked',
});
```

## FormGroup Integration

Always use the **EditValue pattern** with Dnd35eField:

```vue
<FormGroup 
  label="Hardness" 
  :value="viewAwareValue"
  field-path="system.hardness"
  @update="updateField"
>
  <!-- Edit: show source.value in identified, effective in unidentified -->
  <input v-model="editValue" type="number" />
  
  <!-- Readonly: show effective value -->
  <template #readonly>{{ value }}</template>
  
  <!-- Controls: only in edit mode -->
  <template #controls="{ editable }">
    <button v-if="editable && sourceValue" @click="setOverride">
      <i class="fas fa-icon"></i>
    </button>
  </template>
</FormGroup>
```

Where:
- `value` = unwrapped from Dnd35eField via store getter
- `editValue` = respects view mode (identified → real, unidentified → override)
- `sourceValue` = raw Dnd35eField metadata object

## Patterns

### Pattern: Unidentified Armor Class

```typescript
class Armor extends ItemDataModel {
  // AC doesn't need override; always show real value
  // Set visibility: 'everyone' to skip unidentified logic
}

// In FormGroup
const armor = item.system;
const ac = armor.getViewAwareFieldValue('system.ac');  // Always real value
```

### Pattern: Cursed Item Detection

```typescript
class CursedItem extends ItemDataModel {
  // Curse status hidden from non-GMs until identified
  get curse() {
    return this.getSourceProperty('system.curse').value;  // Real data
  }
  
  getDisplayCurse() {
    // Only GMs see curse when unidentified (visibility: 'gm')
    return this.getViewAwareFieldValue('system.curse');
  }
}
```

### Pattern: Price & Rarity (Different Rules)

```typescript
// Price always shown (universal rule)
priceFormula: new Dnd35eField(new FormulaFamiliar({ visibility: 'everyone' }));

// Rarity hidden from players until identified
rarityField: new Dnd35eField(new StringField({ visibility: 'gm' }));
```

## Related Patterns

See also:
- [Vue Sheet Patterns](./vue-sheet-patterns.instructions.md) — EditValue pattern, view modes
- [FormulaFamiliar](./formula-familiar.instructions.md) — Formulas wrapped in Dnd35eField
- [Foundry Data Fields](./foundry-data-fields.instructions.md) — DataField types and hierarchy
