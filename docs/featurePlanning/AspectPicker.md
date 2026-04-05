# Plan: AspectPicker + Shared Autocomplete Extraction

Build `AspectPicker` — an autocomplete input for picking effect change target paths (`change.key`). First, extract the FormulaFamiliar's core dropdown and state management out of FormulaFormGroup into reusable pieces — the Familiar is the shared entity, and components like FormulaFormGroup and AspectPicker are consumers that summon it for different tasks. Uses FormulaFamiliar's `AspectGroup` tree for suggestions. Displays paths in familiar syntax (`#item.hp.max`) but stores raw document paths (`system.hp.max.value`). Each effect system model declares which item/actor subtypes compose `#item`/`#actor` via `static targetContexts`. Subtypes are merged into a single unified context (union of all declared subtypes' properties).

---

## Phase 0: Extract Familiar Core from FormulaFormGroup

### Problem
FormulaFormGroup.vue has ~150 lines of Familiar interaction logic (state, dropdown, keyboard nav, positioning) that AspectPicker would duplicate. The Familiar is the shared entity — FormulaFormGroup and AspectPicker are just different consumers that summon it.

### Steps
1. **Create `useFamiliar()` composable** → `src/helpers/formulae/useFamiliar.mts` (NEW)
   - Reactive state: `familiarOptions`, `showFamiliar`, `familiarIndex`, `familiarPosition`
   - `updateOptions(text, position, context, formatOptions?)` — calls `getAutocompleteOptions()`, sets state
   - `handleKeyDown(event)` — ArrowUp/Down/Enter/Tab/Escape; returns `{ handled, selectedOption? }`
   - `scrollSelectedIntoView(menuRef)`, `dismiss()`
   - Trigger-agnostic: caller decides *when* to invoke

2. **Create `FamiliarDropdown.vue`** → `src/vue/components/FamiliarDropdown.vue` (NEW)
   - Props: `show`, `options: AutocompleteOption[]`, `selectedIndex`, `position: { top, left }`
   - Emits: `select(option)`
   - Template + styles extracted from FormulaFormGroup's `.autocomplete-menu` block
   - This IS the Familiar's visual presence — consumers just position and feed it data

3. **Extract `measureTextOffset()`** to the composable — pure DOM helper, used by both consumers for cursor positioning

4. **Make `getAutocompleteOptions()` format-agnostic** in `src/helpers/formulae/utils.mts`:
   - Add optional `formatFullPath?: (contextName: string, pathPrefix: string, key: string) => string` parameter
   - Default: `(ctx, prefix, key) => \`#${ctx}.${prefix}${key}\`` (current behavior)
   - AspectPicker passes its own formatter

5. **Refactor FormulaFormGroup.vue** to use composable + component:
   - Replace inline state with `useFamiliar()` composable
   - Replace inline autocomplete dropdown template with `<FamiliarDropdown>`
   - Keep formula-specific: `#` trigger detection in `onInput()`, `lastHashIndex` extraction, dual-layer highlighting, validation, FormulaData integration
   - No behavioral changes — pure refactor

### Files
- `src/helpers/formulae/useFamiliar.mts` — NEW composable
- `src/vue/components/FamiliarDropdown.vue` — NEW component (the Familiar's visual form)
- `src/helpers/formulae/utils.mts` — make `getAutocompleteOptions()` format-agnostic
- `src/helpers/formulae/FormulaFormGroup.vue` — refactor to use extracted pieces

### Verification
- FormulaFormGroup works identically after refactor (no behavioral changes)
- Autocomplete menu renders, keyboard nav works, selection inserts text
- `npx tsc --noEmit` passes

---

## Phase 1: Property-Level Aliases in FormulaFamiliar

*(parallel with Phase 2)*

### Steps
1. **Extend `FieldAspect`** in `types.mts` — add `aliases?: string[]`
2. **Extend `FormulaFieldMeta`** in `types.mts` — add `aliases?: string[]` for schema-time declaration
3. **Update `walkFields()` in `schemaWalker.mts`** — pass `meta.aliases` through to built `FieldAspect` nodes
4. **Update `getAutocompleteOptions()` in `utils.mts`** — match partial input against both property keys AND aliases; show alias hint in display
5. **Add `findAspectByAccessPath(group, accessPath)` reverse-lookup** in `utils.mts` — given a raw path, find the tree path and FieldAspect (needed for AspectPicker display conversion)
6. **Update `validateFormula()` alias fallback** — when path segment isn't found, check children's aliases
7. **Declare aliases on key weapon fields** — meaningful shorthands

### Files
- `src/helpers/formulae/types.mts`
- `src/helpers/formulae/schemaWalker.mts`
- `src/helpers/formulae/utils.mts`

---

## Phase 2: Merged Context Infrastructure

*(parallel with Phase 1)*

### Steps
1. **Add `mergeAspectGroups(...groups)` utility** — deep-merges multiple AspectGroups; nested groups merge recursively, leaf conflicts keep first
2. **Add `buildMergedFamiliarContext(docType, subtypes[])` utility** in `registry.mts` — calls `getFamiliarBuilder()` per subtype, merges results
3. **Define `TargetContexts` type**: `{ item?: ContextDocumentType[]; actor?: ContextDocumentType[] }`
4. **Add `static targetContexts: TargetContexts`** to `ActiveEffectSystemModelBase` — default empty `{}`
5. **Override on `MaterialSystemModel`**: `{ item: ['weapon'] }` — add more subtypes as they get registered

### Files
- `src/helpers/formulae/utils.mts` — `mergeAspectGroups()`
- `src/helpers/formulae/registry.mts` — `buildMergedFamiliarContext()`
- `src/entities/activeEffects/BaseActiveEffect/data/ActiveEffectSystemModelBase.mts` — `static targetContexts`
- `src/entities/activeEffects/material/data/MaterialSystemModel.mts` — override

---

## Phase 3: AspectPicker Component

*(depends on Phases 0, 1, 2)*

### Steps
1. **Create `AspectPicker.vue`** in `src/vue/components/Fields/FormGroups/` (NEW):
   - Uses `useFamiliar()` composable for state/keyboard/positioning
   - Uses `<FamiliarDropdown>` for dropdown rendering
   - Simple text input (NOT dual-layer — no syntax highlighting needed)
   - **Single aspect only**: strips spaces, commas, and other delimiters on input — one path per field, no multi-select
   - **Display**: `#item.familiarPath` (familiar syntax with context prefix)
   - **Storage**: raw `accessPath` (`system.field.value`)
   - **Translation happens inside the component**: on save, translates familiar display back to raw `accessPath` before writing; on load, translates stored raw path to familiar syntax for display. The `name` attribute input always holds the raw path. No hidden input tricks needed — the component is the translator.
   - On mount: reverse-lookup stored path via `findAspectByAccessPath()` → display familiar syntax; if unresolvable, show raw path
   - On input: call `useFamiliar().updateOptions()` on every keystroke (no trigger char needed)
   - On select option: translate to raw `accessPath` for storage, display familiar syntax
   - On blur: try resolve typed text, accept unresolvable as-is
   - Keyboard nav delegated to composable
   - **No-context fallback**: if `familiarContext` is null (e.g., missing builder registration), degrade to plain text input showing raw path. Log via `console.error()` and show Foundry UI notification toast (`ui.notifications.error()`) so the developer/user knows the context is missing.
   - **Schema wrapping**: `getAutocompleteOptions()` expects `FamiliarSchema` (map of context names → contexts). AspectPicker wraps its single `familiarContext` + `contextName` into `{ [contextName]: familiarContext }` before calling.

2. **Props**:
   - `modelValue: string` — stored raw path
   - `disabled: boolean`
   - `familiarContext: FamiliarContext | null` — merged context
   - `contextName: string` — e.g., `'item'` or `'actor'`
   - `placeholder?: string`
   - `name?: string` — form field name

3. **`flattenAspectGroup(group, prefix?)`** — flattens AspectGroup tree to flat list for filtering. Lives in `src/helpers/formulae/utils.mts` alongside other tree-traversal functions (`getFieldAspect`, `getPropertyValue`).

### Files
- `src/vue/components/Fields/FormGroups/AspectPicker.vue` — NEW
- `src/helpers/formulae/utils.mts` — `flattenAspectGroup()`

---

## Phase 4: Store Integration & Wiring

*(depends on Phase 3)*

### Steps
1. **Add `getTargetFamiliarContext(target)` method** to `ActiveEffectConfigStore`:
   - Reads `document.system.constructor.targetContexts` for the declared subtypes
   - **Live document available** (effect has a parent item/actor): use ONLY the specific subtype of the parent. e.g., material on a weapon → show only weapon props. Material on armor → show only armor props. Ignores the union.
   - **No live document** (orphaned effect, compendium, etc.): fall back to merged union of all declared subtypes from `targetContexts`
   - Returns `{ context: FamiliarContext | null, contextName: string }`
2. **Replace `<input type="text">` in EffectChanges.vue** (lines 22-28) with `<AspectPicker>` for ALL changes — system changes get `disabled` prop so users see `#item.maxHp` display but can't edit
3. **Per-row reactivity**: each change row has its own `change.target` value. The context passed to AspectPicker must reactively recompute when the user switches the target dropdown (item ↔ actor). Use a function call or per-row computed in the template, not a single precomputed value.

### Files
- `src/entities/activeEffects/BaseActiveEffect/sheet/ActiveEffectConfigStore.mts`
- `src/entities/activeEffects/BaseActiveEffect/sheet/tabs/EffectChanges.vue`

---

## Phase 5: Verification

1. `npx tsc --noEmit` — no new errors
2. FormulaFormGroup identical behavior after Phase 0 refactor
3. AspectPicker shows merged weapon properties for material effects
4. Changing `change.target` to actor → context switches to actor properties
5. System changes show disabled AspectPicker with familiar display (e.g., `#item.maxHp`)
6. Typing filters options; aliases match; raw paths accepted
7. `.value`/`.unidentifiedValue` not in autocomplete suggestions
8. Selecting option stores raw `accessPath`, displays familiar syntax

---

## Decisions
- **Shared infra**: `useFamiliar()` composable + `FamiliarDropdown.vue` — the Familiar is the shared entity; FormulaFormGroup and AspectPicker are consumers that summon it for different tasks
- **Context merging**: `static targetContexts` on effect system model declares which subtypes compose each context (not auto-merge-all). Material declares `{ item: ['weapon'] }`; won't pull in class/feat/spell props
- **Merge strategy**: union/additive — all declared subtypes' properties appear, leaf conflicts keep first
- **Display**: `#item.path` / `#actor.path` familiar syntax
- **Storage**: raw `accessPath` (e.g., `system.hp.max.value`) — zero migration
- **No validation enforcement**: helps find paths, doesn't block manual entry
- **Single aspect**: no spaces, commas, or delimiters allowed — one path per picker, stripped on input
- **System changes**: disabled AspectPicker — still displays familiar syntax, just not editable
- **Aliases**: property-level in `FormulaFieldMeta`, used in autocomplete matching + display hints
- **Reverse lookup**: `findAspectByAccessPath()` for stored path → familiar display conversion
- **`getAutocompleteOptions()` decoupled**: optional `formatFullPath` callback makes it syntax-agnostic
- **Translation in-component**: AspectPicker handles raw↔familiar translation internally; `name` input always holds raw path
- **Live doc narrows context**: if parent document exists, use its specific subtype only (not union). Union is fallback for no-document scenarios
- **Per-row reactivity**: context recomputes when user changes a row's target dropdown
- **Missing context toasts**: null `familiarContext` logs `console.error()` + `ui.notifications.error()` and degrades to plain text input

---

## Implementation Log

*(Track completed work here during implementation)*

### Completed
- **targetField schema + types + constants** — `EFFECT_CHANGE_TARGET_FIELD` added to constants, `targetField` added to `Dnd35eEffectChangeData`, StringField added to changes schema
- **Dnd35eField change routing** — `_resolveTargetField()` and `_delegateToTargetField()` route all `_applyChange*` methods based on `change.targetField`
- **MaterialSystemModel dual emission** — `buildChanges()` emits both identified and unidentified changes; all `build*Change()` methods accept `targetField` parameter
- **Sheet display filtering** — `visibleChanges` computed in ActiveEffectConfigStore filters by `identifiedViewMode`; EffectChanges.vue uses `visibleChanges` instead of `changes`
- **Context-aware createChange()** — auto-sets `targetField` based on current view mode (identified/unidentified)
- **Localization** — Added `D35E.EffectChangeTargetField.*` keys to `en/effects.json`
- **Type-check passes** — `npx tsc --noEmit` confirms no new errors from all above changes

### In Progress
(none)

### Completed
- Phase 0: Extract Familiar core from FormulaFormGroup
  - `useFamiliar.mts` — composable managing autocomplete state, keyboard nav, positioning
  - `FamiliarDropdown.vue` — extracted dropdown component with template + styles (renamed `autocomplete-*` → `familiar-*`)
  - `getAutocompleteOptions()` — made format-agnostic with optional `formatFullPath` config callback
  - `index.mts` — updated with all new imports/exports
  - `FormulaFormGroup.vue` — fully refactored to consume `useFamiliar()` and `<FamiliarDropdown>`, removed inline measureTextOffset, autocomplete CSS, and all direct state management
  - Type-check passes — no new errors
- Phase 1: Property-level aliases
  - `FieldAspect` — added `aliases?: string[]`
  - `FormulaFieldMeta` — added `aliases?: string[]` for schema-time declaration
  - `walkFields()` — passes `meta.aliases` through to built FieldAspect nodes
  - `getAutocompleteOptions()` — matches partial input against both property keys AND aliases; shows alias hint in display
  - `validateVariable()` — alias fallback when path segment not found by key
  - `getFieldAspect()` + `hasPartialAspectMatch()` — alias fallback in path traversal
  - `findAspectByAccessPath()` — new reverse-lookup: raw document path → FieldAspect + tree path
  - `AspectLookupResult` — new interface for reverse-lookup results
  - Weapon field aliases: `weaponType` → `type`, `weaponSubtype` → `subtype`, `damageRoll` → `roll`/`dice`, `damageType` → `type`, `critRange` → `range`/`threat`, `critMultiplier` → `multiplier`/`mult`
  - Type-check passes — no new errors
- Phase 2: Merged context infrastructure
  - `mergeAspectGroups(...groups)` — deep-merges multiple AspectGroups; nested groups merge recursively, leaf conflicts keep first
  - `buildMergedFamiliarContext(docType, subtypes[])` — builds union FamiliarContext from multiple subtype schema builders
  - `TargetContexts` interface — `{ item?: ContextDocumentType[]; actor?: ContextDocumentType[] }`
  - `ActiveEffectSystemModelBase` — added `static targetContexts: TargetContexts = {}` (default empty)
  - `MaterialSystemModel` — overrides with `static override targetContexts = { item: ['weapon'] }`
  - Barrel exports updated in `index.mts`
  - Type-check passes — no new errors
- Phase 3: AspectPicker component
  - `AspectPicker.vue` — new component in `src/vue/components/Fields/FormGroups/`
  - Props: `modelValue` (raw path), `disabled`, `familiarContext`, `contextName`, `placeholder`, `name`
  - Emits `update:modelValue` with raw `accessPath`
  - `rawToFamiliar()` / `familiarToRaw()` — bidirectional translation using `findAspectByAccessPath`
  - Autocomplete on every keystroke (no trigger char), wraps single context into `FamiliarSchema`
  - Uses `useFamiliar()` composable + `<FamiliarDropdown>`
  - Branch selection shows next level, leaf selection commits raw path
  - Strips spaces/commas/semicolons (single aspect only)
  - Null context degrades to plain text input with `.no-context` styling
  - `flattenAspectGroup()` skipped — not needed (`findAspectByAccessPath` + `getAutocompleteOptions` cover all use cases)
  - Type-check passes — no new errors

### Not Started
(none)

### Completed
- Phase 0: Extract Familiar core from FormulaFormGroup
  - `useFamiliar.mts` — composable managing autocomplete state, keyboard nav, positioning
  - `FamiliarDropdown.vue` — extracted dropdown component with template + styles (renamed `autocomplete-*` → `familiar-*`)
  - `getAutocompleteOptions()` — made format-agnostic with optional `formatFullPath` config callback
  - `index.mts` — updated with all new imports/exports
  - `FormulaFormGroup.vue` — fully refactored to consume `useFamiliar()` and `<FamiliarDropdown>`, removed inline measureTextOffset, autocomplete CSS, and all direct state management
  - Type-check passes — no new errors
- Phase 1: Property-level aliases
  - `FieldAspect` — added `aliases?: string[]`
  - `FormulaFieldMeta` — added `aliases?: string[]` for schema-time declaration
  - `walkFields()` — passes `meta.aliases` through to built FieldAspect nodes
  - `getAutocompleteOptions()` — matches partial input against both property keys AND aliases; shows alias hint in display
  - `validateVariable()` — alias fallback when path segment not found by key
  - `getFieldAspect()` + `hasPartialAspectMatch()` — alias fallback in path traversal
  - `findAspectByAccessPath()` — new reverse-lookup: raw document path → FieldAspect + tree path
  - `AspectLookupResult` — new interface for reverse-lookup results
  - Weapon field aliases: `weaponType` → `type`, `weaponSubtype` → `subtype`, `damageRoll` → `roll`/`dice`, `damageType` → `type`, `critRange` → `range`/`threat`, `critMultiplier` → `multiplier`/`mult`
  - Type-check passes — no new errors
- Phase 2: Merged context infrastructure
  - `mergeAspectGroups(...groups)` — deep-merges multiple AspectGroups; nested groups merge recursively, leaf conflicts keep first
  - `buildMergedFamiliarContext(docType, subtypes[])` — builds union FamiliarContext from multiple subtype schema builders
  - `TargetContexts` interface — `{ item?: ContextDocumentType[]; actor?: ContextDocumentType[] }`
  - `ActiveEffectSystemModelBase` — added `static targetContexts: TargetContexts = {}` (default empty)
  - `MaterialSystemModel` — overrides with `static override targetContexts = { item: ['weapon'] }`
  - Barrel exports updated in `index.mts`
  - Type-check passes — no new errors
- Phase 3: AspectPicker component
  - `AspectPicker.vue` — new component in `src/vue/components/Fields/FormGroups/`
  - Props: `modelValue` (raw path), `disabled`, `familiarContext`, `contextName`, `placeholder`, `name`
  - Emits `update:modelValue` with raw `accessPath`
  - `rawToFamiliar()` / `familiarToRaw()` — bidirectional translation using `findAspectByAccessPath`
  - Autocomplete on every keystroke (no trigger char), wraps single context into `FamiliarSchema`
  - Uses `useFamiliar()` composable + `<FamiliarDropdown>`
  - Branch selection shows next level, leaf selection commits raw path
  - Strips spaces/commas/semicolons (single aspect only)
  - Null context degrades to plain text input with `.no-context` styling
  - `flattenAspectGroup()` skipped — not needed (`findAspectByAccessPath` + `getAutocompleteOptions` cover all use cases)
  - Type-check passes — no new errors
- Phase 4: Store integration & wiring
  - `ActiveEffectConfigStore.mts` — added `getTargetFamiliarContext(target)` on `documentGetters`
  - Resolves live parent (item or actor from parent chain) for single-subtype context
  - Falls back to `buildMergedFamiliarContext()` from `static targetContexts` when no parent
  - Memoized via `computed()` — `itemFamiliarContext` and `actorFamiliarContext` recompute only on document change
  - Added `updateChangeField(index, field, value)` action for programmatic change updates
  - `getFamiliarBuilder` exported from `registry.mts` and `index.mts`
  - `EffectChanges.vue` — replaced `<input type="text">` for `change.key` with `<AspectPicker>`
  - Per-row reactivity: each row's `familiarContext` driven by `change.target` via `getTargetFamiliarContext`
  - System changes get `disabled` prop; `name` prop omitted to avoid Foundry form serialization of familiar syntax
  - Type-check passes — no new errors
- Phase 5: Verification
  - `npx tsc --noEmit` — no new errors (all errors pre-existing)
  - Code review: no critical issues. Memoization WARNING addressed (computed caching added)
  - `.value`/`.unidentifiedValue` confirmed excluded from autocomplete (schemaWalker treats Dnd35eField as single leaf)
  - `name` prop correctly omitted from AspectPicker in EffectChanges (no Foundry form serialization of familiar syntax)
  - Null context degrades gracefully to plain text throughout the chain
  - Runtime verification items (3-8) require manual testing in Foundry
