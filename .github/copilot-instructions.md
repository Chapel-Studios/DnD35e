# dnd35e System — Copilot Instructions

## Project Overview
FoundryVTT v14 game system for D&D 3.5e. TypeScript 5.9, Vue 3.5, Vite, Pinia.

## Import Sorting
**Do NOT manually sort imports.** The project uses `eslint-plugin-simple-import-sort` which auto-fixes on file save. Its ordering is not strictly alphabetical — it groups by external packages first, then path-aliased imports (`@helpers/`, `@items/`, etc.), then relative imports (`./`), with `type`-only imports sorted separately within each group. If eslint reports a sort error, run `npx eslint --fix <file>` rather than hand-sorting.

## Dnd35eField Compound Shape
Fields wrapped with `Dnd35eField` store data as `{ value, unidentifiedValue, overrides }` — NOT as scalars. When accessing these fields at runtime:
- Read the inner value: `document.system.hardness.value` (not `document.system.hardness`)
- Nested compounds (e.g. `hp.value` is itself a Dnd35eField): `document.system.hp.value.value`
- The `useDocumentSheetStore` utilities (`getSourceProperty`, `getDirectFieldUpdater`, `getViewAwareFieldUpdater`) auto-detect compound shapes and handle `.value` unwrapping/path adjustment

## Type Definitions
`*SystemData.mts` files define the runtime data shape. When a schema field is wrapped in `Dnd35eField`, its corresponding type must use `Dnd35eFieldData<T>` (imported from `@helpers/fields/index.mjs`), not the bare scalar type.

## FormulaFamiliar System
The autocomplete/context system for formulas is branded **FormulaFamiliar** (not "intellisense" — that's trademarked). Key terminology:
- **FieldAspect** — a single autocomplete property node
- **AspectGroup** — tree of properties
- **FamiliarSchema** — full schema for a document type
- **FamiliarContext** — resolved context with properties + aliases
- Option key on fields: `familiar` (e.g. `{ familiar: { formulaVisible: false } }` to opt out)
- Dnd35eField has `static isFamiliarField = true` — the schema walker auto-includes all Dnd35eField instances in formula autocomplete unless `familiar.formulaVisible === false`

## Component Architecture
- Composition chain: CoreMixin → Identifiable → PhysicalItem → EquippableItem → Weapon
- Each layer has: `*SystemModel.mts` (schema), `*SystemData.mts` (types), `*Store.mts` (Vue store), components
- Store computed properties that read Dnd35eField-wrapped data must access `.value`
- `prepareDerivedData()` in system models also must use `.value` on compound fields

## Sheet View Mode Architecture
Document sheets have two independent axes controlled by header buttons:

### Edit / View axis (lock icon)
- **Edit mode**: fields are editable. **View mode**: fields are read-only.
- Controlled by `sheetState.editMode` (boolean).
- The header lock button is rendered only when `this.isEditable` (user has edit permission).
- Non-editable users are locked to view mode; they never see the button.

### Identified / Unidentified axis (eye icon) — identifiable items only
- **Identified view**: shows real field values. **Unidentified view**: shows override values from flags.
- Controlled by `sheetState.editorViewMode` (`'identified' | 'unidentified'`).
- **Only GMs** can toggle this. The eye header button has `shouldShow = isIdentifiable && game.user.isGM`.
- Non-GM users are "secretly stuck" — their view is determined by the document's actual `system.isIdentified` state. If the item type isn't identifiable (`!system.isIdentifiable`), they're always in identified view.
- `editorViewMode` is initialized in the `VueDocumentSheetMixin` constructor from the document's actual `isIdentified` state, NOT hardcoded to `'identified'`.
- **Never auto-reset `editorViewMode` on re-render.** The GM's manual toggle choice must survive header button re-renders and `_onRender` cycles.

### Resulting view matrix
| User | Identifiable? | Available modes |
|------|---------------|-----------------|
| GM | Yes | edit+identified, edit+unidentified, view+identified, view+unidentified |
| GM | No | edit, view |
| Non-GM editor | Yes | edit, view (stuck on document's isIdentified state) |
| Non-GM editor | No | edit, view |
| Non-editor | Yes | view only (stuck on document's isIdentified state) |
| Non-editor | No | view only |

### Key implementation details
- `IdentifiableDocumentStore.showBoth`: `game.user.isGM` — gates the Vue `IdentifiedViewToggle` and `editorViewActions`
- `IdentifiableDocumentStore.isViewingAsUnidentified`: GM uses `editorViewMode`; non-GM uses `!isIdentified`
- `useDocumentSheetStore.isEditable`: `state.isEditable && isEditMode` — true only when user CAN edit AND is in edit mode
- `useDocumentSheetStore.isEditMode`: reads `context.sheetState.editMode` — the raw toggle state
- Header buttons are imperative DOM (`_renderEditModeButton`, `_renderIdentifiedViewButton`) in `VueDocumentSheetMixin`

## FormGroup Components (`src/vue/components/Fields/FormGroups/`)
All form input components share a common `editValue` pattern that must respect the identified/unidentified view mode.

### Complete list
| Component | Input type | Source value type |
|-----------|-----------|-------------------|
| `SelectFormGroup.vue` | `<select>` dropdown | `any` |
| `NumberFormGroup.vue` | `<input type="number">` | `number \| null` |
| `TextFormGroup.vue` | `<input type="text">` | `string` |
| `CheckBoxFormGroup.vue` | `<input type="checkbox">` | `boolean` |
| `ToggleSwitchFormGroup.vue` | Toggle switch (styled checkbox) | `boolean` |
| `ColorFormGroup.vue` | `<input type="color">` | `string \| null` |
| `MultiSelectFormGroup.vue` | Multi-checkbox list | `string[]` |

### editValue pattern
Every FormGroup reads a `sourceValue` from `store.documentGetters.getSourceProperty(fieldPath)` and computes an `editValue` for the input element. The `props.value` prop carries the **effective** value (already run through `getViewAwareFieldValue`). The `editValue` must respect view mode:
```ts
const sourceValue = store.documentGetters.getSourceProperty<T>(props.fieldPath);
const editorViewMode = store.editorViewMode;
const editValue = computed(() => {
  if (props.editDerived || !sourceValue) return props.value;
  if (editorViewMode.value === 'unidentified') return props.value;  // use effective value
  return sourceValue.value as T;  // use raw source value
});
```
- **Identified edit mode**: shows `sourceValue` (raw DB value) — so users edit the real data.
- **Unidentified edit mode**: shows `props.value` (effective/override value) — so GMs edit the unidentified override.
- **View mode** (readonly slot): always shows `props.value` (effective value).

### FormGroup wrapper
`FormGroup.vue` is the base wrapper. It handles:
- Edit vs readonly slot switching based on `isFieldEditable`
- Field permission controls (visibility, editability overrides)
- The `#readonly` named slot for view-mode display
- It does NOT manage `editValue` — each typed FormGroup is responsible for that.

### Field Permission Overrides (Visibility & Editability)
GMs can per-field override who sees and who edits each field. Overrides are stored inline in `Dnd35eField.overrides` (for schema fields) or in document flags (for group paths like `system.hp` and non-schema fields like `name`/`img`).

**Two getter functions** in `useDocumentSheetStore`:
- `getFieldOverride(path)` — merged, most-restrictive-wins cascade across the whole ancestor chain. Used by `FormGroup` and `FormGroupSection` for actual visibility/editability behavior.
- `getOwnFieldOverride(path)` — only the field's own explicit override, no parent cascade. Used by `FieldControls` for icon display and toggle actions.

**Restrictive merge rule**: when parent and child both have overrides, the more restrictive value wins for each property independently:
- Visibility: `everyone` (0) < `ownerPlus` (1) < `gmOnly` (2)
- Editability: `normal` (0) < `gmOnly` (1)

Example: parent `system.hp` has `visibility: ownerPlus`, child `system.hp.value` has `visibility: gmOnly` → merged result is `gmOnly` (more restrictive wins).

**Resolution priority** in FormGroup/FieldControls/FormGroupSection:
```
override > prop > fieldMeta > hardcoded default
```
1. Override from `getFieldOverride()` (or `getOwnFieldOverride()` for controls display)
2. Component prop (`defaultVisibility`, `defaultEditability`)
3. Schema field metadata (`fieldMeta.defaultVisibility`, `fieldMeta.defaultEditability`)
4. Hardcoded fallback (`'everyone'` / `'normal'`)

### FormGroupSection
`FormGroupSection.vue` groups child FormGroups under a shared label and section-level controls. It auto-hides when all children are invisible (e.g. all hidden by per-field overrides). Used for compound fields like HP where parent-level lock/visibility should cascade to children.

```vue
<FormGroupSection label="HP" field-path="system.hp">
  <NumberFormGroup label="Current" :value="currentHp" field-path="system.hp.value" direct-update />
  <NumberFormGroup label="Max" :value="maxHp" field-path="system.hp.max" />
</FormGroupSection>
```

### `#controls` Scoped Slot
FormGroup exposes `{ editable: boolean }` as a scoped slot prop on `#controls`. This reflects the **merged override-aware** editability — respecting parent locks, GM-only settings, and all cascaded overrides.

**All action buttons in `#controls` must gate on this prop.** Use `v-if="editable"` to hide buttons, or `:disabled="!editable"` to grey them out.

**Passthrough wrappers** (NumberFormGroup, TextFormGroup, ItemWeight, etc.) must forward the scoped prop:
```vue
<template v-if="slots.controls" #controls="{ editable }">
  <slot name="controls" :editable="editable" />
</template>
```

**Consumer example** (EquippableItemWeight):
```vue
<ItemWeight>
  <template #controls="{ editable }">
    <button v-if="editable" type="button" @click="toggle">
      <i class="fas fa-weight-hanging" />
    </button>
  </template>
</ItemWeight>
```

**Components with internal controls** (ItemPriceFormGroup, RichTextEditorFormGroup) use the same pattern directly on FormGroup:
```vue
<template #controls="{ editable }">
  <button v-if="editable && !isDisabled" type="button" class="field-control-btn" @click="action">
    <i class="fas fa-plus" />
  </button>
  <slot name="controls" />
</template>
```

### Control Button Styling (`.field-control-btn`)
**Firefox scoped CSS bug**: Firefox sometimes fails to apply `[data-v-xxx]` attribute selectors on elements that are slotted into a different component's DOM. This affects all buttons rendered inside `#controls` slots.

**Rule**: All custom buttons in `#controls` slots MUST use the global `.field-control-btn` class from `src/styles/core.scss` for base styling. Do NOT rely on scoped `<style>` for these buttons. Component-specific additions (e.g. custom width, active state colors) may use scoped styles, but the base appearance must come from `.field-control-btn`.

The `.field-control-btn` class provides: transparent background, no border, 0.5 opacity, hover effects (opacity 1, slight lift), consistent font size and padding. Use `.is-active` modifier for active/toggled state (warning color).

**Consumer example**:
```vue
<template #controls="{ editable }">
  <button v-if="editable" class="field-control-btn" :class="{ 'is-active': isToggled }" type="button" @click="toggle">
    <i class="fas fa-infinity" />
  </button>
</template>
```

## Key Conventions
- File extensions: `.mts` for TypeScript source, `.mjs` for import paths (path aliases resolve `.mts` → `.mjs`)
- All field helpers (`requiredNumberField`, `optionalStringField`, etc.) return plain fields, NOT Dnd35eField-wrapped
- `Dnd35eField` wrapping is always explicit via `new Dnd35eField(InnerFieldClass, innerOptions, wrapperOptions)`
- Active Effect changes on Dnd35eField-wrapped fields are auto-routed to the `.value` sub-field
