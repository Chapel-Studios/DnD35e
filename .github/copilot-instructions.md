# dnd35e System — Copilot Instructions

## Project Overview
FoundryVTT v14 game system for D&D 3.5e. TypeScript 5.9, Vue 3.5, Vite, Pinia.

## Import Sorting
**Do NOT manually sort imports.** The project uses `eslint-plugin-simple-import-sort` which auto-fixes on file save. Its ordering is not strictly alphabetical — it groups by external packages first, then path-aliased imports (`@helpers/`, `@items/`, etc.), then relative imports (`./`), with `type`-only imports sorted separately within each group. If eslint reports a sort error, run `npx eslint --fix <file>` rather than hand-sorting.

## Type Definitions
`*SystemData.mts` files define the runtime data shape. Use current schema helpers (`requiredNumberField`, `optionalStringField`, etc.). Do not introduce new wrapper-only shapes.

## FormulaFamiliar System
The autocomplete/context system for formulas is branded **FormulaFamiliar** (not "intellisense" — that's trademarked). Key terminology:
- **FieldAspect** — a single autocomplete property node
- **AspectGroup** — tree of properties
- **FamiliarSchema** — full schema for a document type
- **FamiliarContext** — resolved context with properties + aliases
- Schema walker **includes all fields by default** (opt-out model, not opt-in)
- Opt out with `withFamiliar(field, { formulaVisible: false })` from `fieldBuilders.mts`
- Two static constructor markers control recursion behavior:
  - `isFamiliarField = true` — compound leaf; schema walker exposes `.value` access path
  - `isFamiliarLeaf = true` — opaque leaf, not recursed into (PriceField, FormulaField)
- SchemaFields without markers are recursed into; all other fields are simple leaves

## Component Architecture
- Composition chain: CoreMixin → Identifiable → PhysicalItem → EquippableItem → Weapon
- Each layer has: `*SystemModel.mts` (schema), `*SystemData.mts` (types), `*Store.mts` (Vue store), components

## Sheet View Mode Architecture
Document sheets use a unified 3-state mode model rendered via a header mode bar:

### Modes
- `edit`: editable authoring mode
- `play`: player-visible mode (masked/effective values)
- `true`: GM-only true-value mode (unmasked play view)

### Access model
- GM on identifiable docs: `edit`, `play`, `true`
- GM on non-identifiable docs: `edit`, `play`
- Non-GM users: `edit`/`play` according to permissions; `true` is hidden

### Key implementation details
- Runtime type is `ViewMode = 'edit' | 'play' | 'true'`
- `RenderModeStore` owns mode state and renders `renderViewModeBar()`
- Initial mode is role-based in `VueDocumentSheetMixin`: GM starts in `edit`, non-GM starts in `play`
- `useDocumentSheetStore.isEditable`: true only when user can edit and mode is `edit`
- `getViewAwareFieldValue()` applies mask/effective logic for `play`; true-value behavior is available only in `true`

## FormGroup Components (`src/vue/components/Fields/FormGroups/`)
All form input components share a common `editValue` pattern that must respect `ViewMode` (`edit`/`play`/`true`).

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
const viewMode = store.viewMode;
const editValue = computed(() => {
  if (props.editDerived || !sourceValue) return props.value;
  if (viewMode.value !== 'edit') return props.value;  // play/true use effective value
  return sourceValue.value as T;  // use raw source value
});
```
- **Edit mode**: shows source value (real editable data)
- **Play mode**: shows `props.value` (effective/masked value)
- **True mode**: shows `props.value` (effective true-value view for GM)
- **Readonly slot**: always shows `props.value`

### FormGroup wrapper
`FormGroup.vue` is the base wrapper. It handles:
- Edit vs readonly slot switching based on `isFieldEditable`
- Field permission controls (visibility, editability overrides)
- The `#readonly` named slot for view-mode display
- It does NOT manage `editValue` — each typed FormGroup is responsible for that.

### Field Permission Overrides (Visibility & Editability)
GMs can per-field override who sees and who edits each field. Overrides are stored in document flags (`flags.dnd35e.fieldOverrides`) for all fields, including group paths like `system.hp` and non-schema fields like `name`/`img`.

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
- All field helpers (`requiredNumberField`, `optionalStringField`, etc.) return plain Foundry DataFields
- Field masking is handled via Secret AEs + `_masks`; never store dual values in the schema shape

---

## System Planning & Architecture

Phase specifications, status tracking, and the full roadmap live in `docs/migration-plan/`. Do not duplicate status here.

### Planning Resources
- **Full Roadmap & Status**: `docs/migration-plan/roadmap.md` (single source of truth for phase status)
- **Phase Specifications**: `docs/migration-plan/<wave>/phase-NN-*.md` (detailed spec per phase)
- **Custom Planning Agent**: Use `@planning` to design new phases or refine existing ones
- **Planning Maintenance Skill**: Use `/phase-planning` to improve documentation
- **Custom Agents & Skills**: `.github/AGENTS.md` (discovery and usage)

### Planning Workflow

**To plan a new phase**:
```
@planning Design Phase 5: I want to add feat support with SRD content
```
The agent will synthesize dependencies, ask clarifying questions, and produce a comprehensive spec.

**To improve planning documentation**:
```
/phase-planning Section 4.2 repeats section 4.8, consolidate them
```
The skill will analyze, propose consolidations, and provide exact edits.

**To check system status**:
- Full roadmap: `docs/migration-plan/roadmap.md`
- Specific phase: `docs/migration-plan/<wave>/phase-NN-*.md`
- Quick reference: Each phase has completion checklist and status

---

## Knowledge Base Curation

After completing work sessions, maintain the knowledge base by updating documentation and detecting outdated patterns. The KB curator agent helps with this.

### Custom KB Curator Agent
Use `@kb-curator` to review a session and update AI files:

```
@kb-curator Review this session and update KB appropriately
```

**What it does**:
- Analyzes session work to identify patterns worth documenting
- Suggests updates to instruction files with specific examples
- Proposes new skills for workflows that emerged
- Validates documentation accuracy against current codebase
- Detects gaps in KB coverage and redundant documentation
- Checks terminology consistency and cross-reference validity
- Updates phase progress and repository memory

**When to use**:
- **End of session** (light curation): 1-2 file updates
- **After feature complete** (deep audit): Multiple files, cross-references
- **Before phase start** (validation): Check prerequisite docs are current
- **Targeted audit** (specific check): `@kb-curator Is vue-sheet-patterns complete?`

### Knowledge Base Structure

**Instruction Files** (`.github/instructions/`):
- Auto-load when you edit matching files (via `applyTo` glob)
- Deep reference material with 3+ examples, thorough coverage
- Update when: you repeat a pattern 2+ times in a session

**Skills** (`.github/skills/`):
- On-demand workflows with step-by-step checklists
- Multiple approaches with tradeoffs and decision factors
- Update when: complete workflow proves valuable and reusable

**Planning Documentation** (`docs/migration-plan/`):
- Phase specifications with goals, design, completion checklist
- Track what's implemented vs. planned, scope changes, deferred work
- Update when: significant progress made, decisions finalized

**AGENTS.md** (`.github/AGENTS.md`):
- Discovery hub showing when to use each agent/skill
- Clear problem statements and related tools
- Update when: new agents/skills created or significantly enhanced

**Repository Memory** (`/memories/repo/`):
- Codebase-specific facts, conventions, verified practices
- Persists across sessions for this workspace
- Create when: "We verified this works this way" or "Our convention is..."

### Quality Standards

**Instruction files**: 80+ lines, 3+ code examples, thorough coverage, cross-referenced

**Skills**: 50+ lines, step-by-step sections, multiple approaches with tradeoffs

**Phase docs**: Completion checklist, clear rationale, dependency notes, current status

**AGENTS.md**: Clear when to use, what problems it solves, related tools suggested

**All files**: Examples tested, links valid, terminology consistent, "Related" sections complete

### Design Approach

The KB curator combines:
- **Pattern recognition** from session analysis
- **Documentation standards** for consistency (Diataxis framework)
- **Knowledge management** best practices (atomic notes, wiki linking)
- **Code review rigor** for accuracy and completeness
- **User-centric perspective** ("would future developers find this?")

See `.github/KB-CURATOR-DESIGN.md` for detailed design rationale and inspiration sources.
