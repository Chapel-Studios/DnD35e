---
description: "Use when building Vue sheets, form components, or working on sheet UI. Covers EditValue pattern, 3-state view modes, field permissions, and component patterns."
applyTo: "src/**/*.vue"
---

# Vue Sheet Architecture & Patterns

## Sheet View Modes

Sheets use a **single 3-state mode model**:

| Mode | Meaning | Access |
|------|---------|--------|
| `edit` | Authoring mode (editable fields) | Owners + GMs |
| `play` | Player-visible mode (masks/effective values) | Everyone with sheet access |
| `true` | GM-only true-value play view (unmasked) | GMs only |

`play` carries the "unidentified/masked" behavior. `true` is the explicit GM-only unmasked mode.

### Store Getters for View Mode

```typescript
// In any FormGroup or component using useDocumentSheetStore()
const store = useDocumentSheetStore();

store.viewMode                 // 'edit' | 'play' | 'true'
store.isEditMode               // true only in edit mode
store.isPlayMode               // true only in player-visible mode
store.isTrueMode               // true only in GM true-value mode
store.isEditable               // true = user can edit (has perm AND edit mode)
```

## EditValue Pattern (Required in All FormGroups)

Every FormGroup computes an `editValue` that respects view mode:

```typescript
// In FormGroup component
const sourceValue = store.documentGetters.getSourceProperty<T>(props.fieldPath);
const viewMode = store.viewMode;

const editValue = computed(() => {
  if (props.editDerived || !sourceValue) return props.value;  // use effective value
  if (viewMode.value !== 'edit') return props.value;  // play/true use effective value
  return sourceValue.value as T;  // use real value
});
```

**Logic**:
- **Edit mode** → show `sourceValue` (user edits real data)
- **Play mode** → show `props.value` (effective/masked value)
- **True mode** → show `props.value` (effective unmasked value for GM)
- **Readonly slots** → always display `props.value`

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

All form inputs inherit from `FormGroup.vue`. Labels and hints are **auto-derived from schema** via `LOCALIZATION_PREFIXES` — no explicit label prop needed:

```vue
<!-- Label auto-derived from dnd35e.PHYSICAL_ITEM.FIELDS.hardness.label -->
<FormGroup 
  :value="hardness"
  field-path="system.hardness"
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

Explicit `label` prop is only needed to override the schema label (value is a localization key).

See `form-groups.instructions.md` for full auto-derivation details.

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
<!-- Child labels auto-derived from schema -->
<FormGroupSection label="HP" field-path="system.hp">
  <NumberFormGroup :value="currentHp" field-path="system.hp.value" />
  <NumberFormGroup :value="maxHp" field-path="system.hp.max" />
</FormGroupSection>
```

Auto-hides when all children are invisible (respects field permissions).

## Compound Field Compatibility

Some legacy fields may still be compound-shaped. The store handles unwrapping:

```typescript
// In store computeProperty
getSourceProperty('system.hardness')  // For compound values, returns object with `value`
getViewAwareFieldValue('system.hardness')  // Already unwrapped to just the number
```

**In FormGroup**:
- Use `props.value` (already unwrapped via `getViewAwareFieldValue`)
- Read `sourceValue.value` in edit mode when source is compound
- Reference `props.value` in play/true modes

## Sheet Header

Header renders a unified mode bar:

```typescript
// renderViewModeBar() (imperative DOM)
// GM: edit + play + true (identifiable), edit + play (non-identifiable)
// Non-GM: edit + play
```

**Never auto-reset view mode on re-render** — GM's toggle choice persists.

## Sheet State Initialization

```typescript
// In VueDocumentSheetMixin constructor
const initialMode = game.user.isGM ? EDIT : PLAY;
this.renderModeStore = useRenderModeStore(
  this.#document.testUserPermission(game.user, 'OWNER'),
  hasSecrets,
  initialMode
);
```

## Sheet Store Composition

Sheet stores follow a unified composition chain (`useDocumentSheetStore` → `useActorSheetStore`/`useItemSheetStore` → … → leaf). Each layer takes `(context, options?)`, calls its direct parent internally, and returns the fully composed store. **Only the runtime leaf** (e.g. `useCharacterStore`, `useWeaponStore`) writes to `game.dnd35e.stores`. Intermediate `.vue` sheet shells call the store with a single arg and `provide()` it without registering.

See `dnd35e-patterns.instructions.md` → "Sheet Store Composition Chain" for the full pattern, type shape, and rationale.

## Test Coverage & Phase Boundaries

Not all sheet features can be tested in the phase they're implemented. Some require downstream phases to provide supporting systems.

### Phase Boundaries

| Feature | Implemented | Fully Testable | Why |
|---------|-------------|----------------|-----|
| Weapon schema + sheet | Phase 1 | Phase 6+ | Needs actors/inventory to test isCarried/isEquipped |
| Item effects tab | Phase 2 | Phase 2 | AE system self-contained |
| Actor sheet + attributes | Phase 6 | Phase 6 | Can test attribute derivation without full rules |
| Skill rolls + bonuses | Phase 9+ | Phase 10+ | Needs action system for full roll mechanics |
| Spell casting | Phase 17 | Phase 20+ | Needs spellbooks (Phase 20) for full casting workflow |

### Documentation Strategy

When a phase implements untestable features:

1. **Mark in phase spec**: Add "Phase X: Bootstrap Only" vs "Phase X: Full Test" to checklist items
2. **Document the gap**: Why can't this be tested? Which phase provides the missing system?
3. **Accept the boundary**: Phase 1 code is still good code; testing is just deferred
4. **Plan Phase X test**: Add a testing task to the downstream phase that *will* have full context

**Example** (Phase 1):
```markdown
### 1.G — Physical item header status badges (Equipped/Carried)
- ✅ COMPLETE: Badges render when store properties exist
- ⚠️ PHASE 1 BOOTSTRAP ONLY: isCarried and isEquipped cannot be tested without actors/inventory system
- 🔄 FULL TESTING: Phase 6 (when actors exist) + Phase 6.X (test badge states with actor inventory)
```

This tells future developers: "This code works now but we're intentionally deferring full verification."

### Common Bootstrap Scenarios

**Item-only features** (testable in Phase 1):
- Schema fields and their defaults
- Play-mode masking and true-mode value presentation
- AE application to field values

**Item-actor bridge features** (deferred to Phase 6+):
- isCarried state (needs inventory)
- isEquipped state (needs equipment slots)
- Bonus stacking (needs actor bonus tracking)
- Skill modifications (needs actor skill list)

**Game-system features** (deferred to Phase 10+):
- Roll mechanics (needs action system)
- Combat resolution (needs combat tracker)
- Spell casting (needs full spell framework)
