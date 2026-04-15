# PR: Core Architecture Overhaul

**Branch:** `feature/weapon_base` → `dev`

> This branch began as a base weapon‑item pass — establishing the weapon as a minimal shell of an item type, ready to house combat actions, and using it to clarify how existing Material Items were meant to interact with Weapon Items. Material already existed in the system as an item type, and the plan was to apply it to weapons. But once the interaction between material and weapon wiring was examined, the flaw in the concept became evident. Material doesn’t exist independently — it only modifies something else. It belongs on the Active Effect layer.
> That pivot is what blew the scope open. Moving Material to an ActiveEffect meant we needed a proper AE framework. Wiring AEs to items meant we had to settle how items and effects interact at the data layer. Settling the data layer exposed a separate problem: the old approach of storing unidentified values in flags completely falls apart for complex types like prices — you can't put a validated `PriceData` model in a flag. That forced a retrofit: `Dnd35eField`, a compound wrapper that stores both `value` and `unidentifiedValue` inline in the schema where Foundry's full data pipeline can reach them. As a bonus, the compound wrapper gave us a clean marker (`isFamiliarField`) that the FormulaFamiliar schema walker could use to auto-discover formula-eligible fields. 
> With scope already blown open, this became the moment to tackle a long-deferred priority: replacing Handlebars with Vue and building a proper dual-axis view mode system (play/edit and identified/unidentified operating independently). HBS is imperative — every HTML mutation and reactive response has to be spelled out by hand, which makes ambitious UI a grind. Vue removes that friction; it's what made something like FormulaFamiliar's live syntax highlighting and autocomplete worth attempting in the first place. `Dnd35eField` then slotted naturally into the new sheet framework, giving it something concrete to route both view axes through and and various metadata settings like visibility and editibility override defaults.
> So this branch is really three things at once:
> • Weapon as the first base item
> • Material as the first base ActiveEffect
> • The foundational architecture that lets them communicate correctly
> Everything here — compound fields, formula resolution, dual‑view sheets, the AE change pipeline — is groundwork that every document type will build on from this point forward.
> Each of these documents is an incomplete prototype meant to showcase unique behaviors and how we can pattern them. Many fields may still be missing in the data layer, the Vue sheet layer, or elsewhere. There are probably still switches that need to be added to settings, and some UI clutter will need to be addressed (possibly via a context menu).

---

## Table of Contents

1. [Dnd35eField — The Compound Data Field](#1-dnd35efield--the-compound-data-field)
2. [Identifiable System — Dual-View Documents](#2-identifiable-system--dual-view-documents)
3. [FormulaFamiliar — Schema-Driven Formula Autocomplete](#3-formulafamiliar--schema-driven-formula-autocomplete)
4. [Materials as Active Effects](#4-materials-as-active-effects)
5. [Dnd35eDocument Mixin — Document-Level Formula Resolution](#5-dnd35edocument-mixin--document-level-formula-resolution)
6. [Vue Sheet Architecture](#6-vue-sheet-architecture)
7. [Settings System](#7-settings-system)
8. [Tooling & Infrastructure](#8-tooling--infrastructure)

---

## 1. Dnd35eField — The Compound Data Field

`Dnd35eField` is a generic wrapper that extends Foundry's `SchemaField`. It wraps **any** inner Foundry `DataField` into a compound shape that natively supports identified/unidentified duality and field-level permission overrides.

> **⚠️ Transitional**: The `Dnd35eField` class is being **removed** in Phase 1 (work items 1.O–1.W). The compound `{ value, unidentifiedValue }` pattern is replaced by the **Secret AE** system (Phase 2, §2.7) where a MASK change mode overlays display values without mutating real data. The non-identifiable capabilities (FormulaFamiliar integration, field permission defaults) are preserved via `useDnd35eField()` — a helper function that stamps metadata onto any plain Foundry `DataField`'s options bag. Root-level fields (`name`, `img`) use a small static registry. See Phase 1 checklist items 1.O–1.W for the full migration plan.

> For how Dnd35eField interacts with Active Effects and the `targetField` routing, see [Active Effect Lifecycle](active-effect-lifecycle.md). For how `.value` preparation works in the broader pipeline, see [Data Preparation Pipeline](data-preparation-pipeline.md).

### Compound Shape

```ts
{
  value: T,                    // The real/identified value — primary storage
  unidentifiedValue: T | null, // Override value shown when viewing as unidentified
}
```

This replaces the old approach of storing unidentified data in document flags. Flags didn't work well for complex data types like `PriceData` (coin stacks) because they bypass Foundry's DataModel validation and preparation pipeline entirely. By making unidentified storage a first-class part of the schema, both values go through the same validation, initialization, and Active Effect pipeline.

### How to Define

```ts
schema.hardness = new Dnd35eField(NumberField,
  { required: true, nullable: false, initial: 0 },  // inner field options
  { label: 'Hardness', hint: 'Material hardness' }  // wrapper options
);
```

The first argument is the inner field **class** (not an instance), the second is options passed to the inner field constructor, and the third is wrapper-level options (label, hint, familiar config, permission defaults).

### How to Access at Runtime

Because the stored shape is `{ value, unidentifiedValue }`, runtime access always goes through `.value`:

```ts
// Reading
const hardness = document.system.hardness.value;       // number
const unidHardness = document.system.hardness.unidentifiedValue; // number | null

// Nested compounds (hp.value is itself a Dnd35eField)
const currentHp = document.system.hp.value.value;
```

### Active Effect Integration

Dnd35eField automatically routes Active Effect changes to the correct sub-field based on the change's `targetField` property:

- `targetField: 'value'` → applies change to the identified value
- `targetField: 'unidentifiedValue'` → applies change to the unidentified override

The wrapper delegates to the inner field's own change methods (`_applyChangeAdd`, `_applyChangeMultiply`, etc.), so complex inner types like `PriceField` can define their own AE behaviors.

### FormulaFamiliar Integration

`Dnd35eField` has a static `isFamiliarField = true` marker. The schema walker auto-includes all Dnd35eField instances in formula autocomplete. Fields can opt out:

```ts
new Dnd35eField(HTMLField, {}, {
  familiar: { formulaVisible: false }  // exclude from autocomplete
});
```

### Field Permission Defaults

Schema authors can set permission defaults at definition time:

```ts
new Dnd35eField(NumberField, { initial: 0 }, {
  defaultVisibility: 'ownerPlus',    // 'everyone' | 'ownerPlus' | 'gmOnly'
  defaultEditability: 'gmOnly',       // 'normal' | 'gmOnly'
  canVisibilityBeChanged: true,       // GM can override at runtime
  canEditabilityBeChanged: true,
});
```

Runtime GM overrides are stored in `flags.dnd35e.fieldOverrides` on the document, not in the schema.

---

## 2. Identifiable System — Dual-View Documents

> **⚠️ Transitional**: This system is being replaced by the **Secret AE** architecture (Phase 2, §2.7). Under the new design, `isIdentified` is derived from whether any active Secret AEs exist on the item, and the dual-view is powered by a masks dictionary built from Secret AE change rows rather than `Dnd35eField.unidentifiedValue` sub-fields. The `IdentifiableSchemaMixin` (`isIdentifiable`/`isIdentified` booleans), `IdentifiableDocumentMixin` (name formula registrations), and `RenderModeStore` (view mode axis) will be redesigned.

The identifiable system enables items and effects to present two different faces: one for identified viewing (real values) and one for unidentified viewing (GM-controlled overrides). This is core to D&D 3.5e where players may not know what a magic weapon actually does.

### Architecture

The system is built as two composable mixins that stack independently:

**Schema Mixin** (`IdentifiableSchemaMixin`) adds two boolean fields to the data model:
- `isIdentifiable` — whether this document type supports dual-view at all
- `isIdentified` — current identification state

**Document Mixin** (`IdentifiableDocumentMixin`) extends `Dnd35eDocumentMixin` with:
- Additional formula registrations that evaluate both identified and unidentified name formulas
- A name resolution registration that picks between derived names based on `isIdentified` state

### Storage: No More Flags

Previously, unidentified data lived in document flags — a flat key-value store outside the schema. This caused problems with structured data types, Foundry's data preparation pipeline, and Active Effect routing.

Now, every `Dnd35eField`-wrapped field stores its unidentified override inline in the `.unidentifiedValue` sub-field. Both values pass through the same DataModel lifecycle (validation, `_initializeSource`, `prepareDerivedData`).

### Sheet View Modes

Document sheets have two independent toggle axes, controlled by header buttons:

| Axis | Button | Who Can Toggle |
|------|--------|-------|
| Edit / View | Lock icon | Any user with edit permission |
| Identified / Unidentified | Eye icon | GM only |

Non-GM users are "secretly stuck" — their view follows the document's actual `isIdentified` state. They never see the eye button.

The `useDocumentSheetStore` provides view-aware getters (`getViewAwareFieldValue`, `getViewAwareFieldUpdater`) that automatically read from or write to the correct sub-field based on the current view mode.

---

## 3. FormulaFamiliar — Schema-Driven Formula Autocomplete

FormulaFamiliar is the system's approach to user-authored formulas with real-time autocomplete, validation, and resolution. The name is a deliberate pun — it's the formula system's "familiar" (as in a wizard's familiar) that knows the schema and helps users write correct references.

### The Problem It Solves

Documents frequently need computed names, descriptions, or values that reference other document properties. For example, a material effect named `Silver #Item.size` should resolve to "Silver Medium" when applied to a medium weapon. Users need to discover available properties without memorizing internal data paths.

### Core Concepts

**FieldAspect** — a leaf node representing one resolvable property:
```ts
{
  display: 'Hardness',           // User-facing label
  type: 'number',                // Expected value type
  accessPath: 'system.hardness', // Real document path for resolution
  aliases: ['dr']                // Alternative names users can type
}
```

**AspectGroup** — a recursive tree of FieldAspects, mirroring the schema structure.

**FamiliarContext** — a named context (e.g., `self`, `Item`) with its property tree and aliases.

**FamiliarSchema** — the complete map of available contexts, passed to UI components.

### Schema Walker

The schema walker (`schemaWalker.mts`) introspects any DataModel's `defineSchema()` output to auto-build the property tree:

- Fields with `isFamiliarField === true` (all Dnd35eField instances) are auto-included
- Fields can explicitly opt in via `familiar: { formulaVisible: true }`
- SchemaFields without markers are treated as branches — the walker recurses into children
- Document-level fields (`name`) are merged into every context

### Formula Syntax

```
Silver (+#self.hardness AC)     → "Silver (+5 AC)"
#Item.size #self.name Weapon    → "Medium Silver Weapon"
#Item.'system.hp.value'         → raw path access with quotes
\#not-a-reference               → escaped literal #
```

### FormulaField & FormulaData

`FormulaField` is an `EmbeddedDataField<FormulaData>` that stores:
- `formula` — the user-authored template string
- `resolvedValue` — cached resolution result
- `expectedType` — `'string'` or `'number'`

It also carries **context declarations** — metadata telling the system which additional documents are available for this formula:

```ts
(schema.nameFormula.fields.value as FormulaField).formulaContexts = [
  {
    contextName: 'Item',
    resolvePath: 'parent',         // traverse doc.parent to find the Item
    documentType: 'Item',
    fallbackSubtypes: ['weapon'],  // union these schemas when no live parent
    aliases: ['Parent']
  }
];
```

### Resolution Pipeline

1. `prepareDerivedData()` resolves formulas using the system model's `_buildFormulaDataMap` — walks context declarations, resolves live parent documents, passes POJOs to `resolveFormula()`
2. `Dnd35eDocument.update()` re-evaluates all registered formulas before persisting so the resolved name is always current
3. `Dnd35eDocument._preCreate()` resolves formulas on embedded document creation so compendium effects persist resolved names immediately

### UI Components

All three components share the FormulaFamiliar infrastructure through a `useFamiliar()` composable that owns reactive autocomplete state, keyboard navigation, and dropdown positioning. Each consumer decides *when* to invoke the Familiar — FormulaFormGroup triggers on `#`, AspectPicker triggers on every keystroke.

- **FormulaFormGroup** — contenteditable input with dual-layer syntax highlighting (text layer + highlight layer), real-time validation, and a dropdown autocomplete menu. See [FormulaFormGroup API](formula-system.md) for component props and usage.
- **FamiliarDropdown** — the Familiar's visual form. Reusable dropdown that renders filtered autocomplete suggestions with keyboard navigation. Extracted from FormulaFormGroup to be shared across consumers.
- **AspectPicker** — property path picker used in the Active Effect change editor to select `change.key` values from the target schema. Displays paths in familiar syntax (`#item.hp.max`) but stores raw document paths (`system.hp.max.value`). The `findAspectByAccessPath()` reverse-lookup translates stored raw paths back to familiar display on load. Each effect system model declares which item/actor subtypes compose its context via `static targetContexts`; when a live parent document is available, the picker narrows to that specific subtype rather than showing the merged union.

### Registry

Familiar schemas are registered per document type and subtype:

```ts
registerFamiliarSchema('Item', 'weapon', (context?) => gatherAspectsFromSchema(WeaponSystemModel, context));
registerFamiliarSchema('ActiveEffect', 'material', (context?) => gatherAspectsFromSchema(MaterialSystemModel, context));
```

The `buildMergedFamiliarContext()` function unions multiple subtype schemas for cases where the exact target type is unknown (e.g., "any Item").

---

## 4. Materials as Active Effects

Materials were completely reimagined — from being a standalone Item type to being an ActiveEffect subtype. This is both architecturally cleaner and more powerful.

> The Material pattern is the proof-of-concept for all AE generators. For the broader AE lifecycle, phase application system, Bond pattern, and generator pattern, see [Active Effect Lifecycle](active-effect-lifecycle.md). For how material bonus types interact with stacking, see [Bonus Type Stacking Engine](bonus-stacking.md).

### Why the Change

In D&D 3.5e, a material (like Adamantine or Cold Iron) modifies the properties of the weapon it's applied to — hardness, HP, price, damage reduction types, and the weapon's name. This is fundamentally what Active Effects do: modify a parent document's properties. Making materials into effects means:

- Modifications are handled by Foundry's AE pipeline instead of custom code
- Materials compose naturally — a weapon can have multiple material effects
- The same material effect can declare different modifications for identified vs unidentified views
- Materials benefit from the existing AE UI (enable/disable, priority, phases)

### Class Composition

```
DnD35eActiveEffect
  → Dnd35eDocumentMixin    (formula resolution, registeredFormulas)
  → IdentifiableDocumentMixin  (dual-view name formulas)
  = Material
```

### Automatic Change Generation

`MaterialSystemModel.buildChanges()` runs in `prepareDerivedData()` and auto-generates AE changes from the material's properties:

- Non-zero `hardness.value` → generates a hardness bonus change
- Non-empty `price.value` → generates a price modifier change
- Each `damageReductionTypes` entry → generates a DR type change
- Changes are marked `isSystem: true` so they don't appear in the user-editable changes list

For identifiable materials, separate changes are emitted for `.unidentifiedValue` fields with `targetField: 'unidentifiedValue'`, so the Dnd35eField wrapper routes them correctly.

### Name Formulas with Context

Materials declare an `Item` context on their inherited `nameFormula` field:

```ts
formulaContexts = [{
  contextName: 'Item',
  resolvePath: 'parent',
  documentType: 'Item',
  fallbackSubtypes: ['weapon'],
  aliases: ['Parent']
}];
```

This means a material with formula `Silver #Item.size` resolves to "Silver Medium" when embedded in a medium weapon. The parent weapon's full schema is available for autocomplete.

### Target Contexts

Materials declare `static targetContexts: TargetContexts = { item: ['weapon'] }` — this tells the AspectPicker that material effect changes should offer weapon-schema properties for their change keys.

---

## 5. Dnd35eDocument Mixin — Document-Level Formula Resolution

`Dnd35eDocumentMixin` is applied to all document classes (Items, ActiveEffects) and adds the formula resolution lifecycle.

### Registered Formulas

Each document maintains a `Set<FormulaRegistration>`:

```ts
interface FormulaRegistration {
  impactedField: string;   // path to write result (e.g., 'system.derivedName')
  formulaField: string;    // path to the FormulaField in the schema
  evaluate: (doc, contexts) => value;
}
```

The base mixin registers two: `defaultDerivedNameRegistration` (resolves the name formula) and `defaultNameRegistration` (copies derivedName to the document name). `IdentifiableDocumentMixin` replaces these with versions that also handle unidentified name formulas.

### Resolution Triggers

1. **`update()`** — before every document update, all registered formulas are re-evaluated against a merged POJO of current + pending data. Results are injected into the update payload.
2. **`_preCreate()`** — when an embedded document is created (e.g., dropping a material effect onto a weapon), formulas are resolved immediately using `_buildFormulaContexts()` so the document name is correct on first render.
3. **`prepareDerivedData()`** — the system model resolves formulas during data preparation for display purposes (cached in `resolvedValue`).

### Context Building

`_buildFormulaContexts()` reads the FormulaField's `formulaContexts` declarations and walks from the live document to find related documents. For a material effect with `resolvePath: 'parent'`, it traverses `this.parent` to find the weapon, converts it to a POJO, and provides it as the `Item` context.

---

## 6. Vue Sheet Architecture

The sheet framework was rebuilt around a mixin chain and composable stores.

### Mixin Chain

```
Foundry DocumentSheetV2
  → VueAppBaseMixin        (Vue app lifecycle, render cycle, component mounting)
  → VueDocumentSheetMixin  (document context, header buttons, view mode state)
  → VueItemSheet           (item-specific: effects tab, physical item concerns)
  → VueActiveEffectConfig  (effect-specific: change editor, duration)
```

Each layer adds its own header buttons, context data, and store initialization. The old monolithic `VueApplication` class and all Handlebars templates were removed.

### FormGroup Components

All form inputs inherit from `FormGroup.vue`, which handles:
- **Edit vs readonly** slot switching based on field editability
- **Field permission** controls (visibility, editability overrides)
- **View-mode awareness** via the `editValue` pattern

Each typed FormGroup (Number, Text, Select, Checkbox, Toggle, Color, MultiSelect, RichTextEditor, ItemPrice) computes an `editValue` that respects the identified/unidentified view mode:

- **Identified edit mode**: shows `sourceValue` (raw DB value) — user edits the real data
- **Unidentified edit mode**: shows `props.value` (effective value) — GM edits the override
- **View mode** (readonly): always shows effective value

### FieldControls

`FieldControls.vue` renders GM-only permission icons on each form field:
- Eye icon cycles visibility: `everyone → ownerPlus → gmOnly`
- Lock icon toggles editability: `normal ↔ gmOnly`

Overrides cascade parent-to-child with most-restrictive-wins semantics. A section locked to `gmOnly` locks all its children regardless of their own settings.

### Document Sheet Store

`useDocumentSheetStore` is the central composable providing:
- `getViewAwareFieldValue(path)` — returns the right value for the current view mode
- `getDirectFieldUpdater(path)` / `getViewAwareFieldUpdater(path)` — update functions that auto-route to `.value` or `.unidentifiedValue`
- `getSourceProperty(path)` — raw DB value with automatic Dnd35eField `.value` unwrapping
- `getFieldOverride(path)` — merged permission cascade for a field path
- `viewModeAwareUpdateDocument(data)` — bulk update respecting current view mode

### Sub-Stores

The document sheet decomposes into focused stores:
- **RenderModeStore** — edit mode toggle, identified view toggle, header button rendering
- **FieldOverridesStore** — GM field permission overrides, cascade resolution
- **TabStore** — tab state management, active tab tracking

---

## 7. Settings System

All game settings were reorganized into domain modules under `src/settings/`. Each domain follows the same pattern:

```
src/settings/{domain}/
  ├── _types.mts        — domain type definitions
  ├── constants.mts     — setting keys and defaults
  ├── registration.mts  — Foundry setting registration
  ├── index.mts         — barrel exports
  └── sheet/
      ├── {Domain}SettingsConfig.mts  — Foundry ApplicationV2 wrapper
      ├── {Domain}SettingsApp.vue     — Vue settings form
      └── index.mts
```

### Active Settings Domains

| Domain | Status | Notable Settings |
|--------|--------|-----------------|
| **Currency** | Active | Full coinage configuration with custom denominations |
| **Combat** | Active | 11 combat-related settings (autosize weapons, flanking, ammo, etc.) |
| **Display** | Active | ~15 display settings (token vision, party HUD, colorblind mode, etc.) |
| **Core** | Active | System migration version, settings menu registration |
| **Game Rules** | Active | DR types, diagonal movement, XP rate |
| **Health** | Scaffolded | HP calculation rules (registration commented out) |
| **Roll** | Scaffolded | Roll behavior settings (registration commented out) |
| **Skills** | Scaffolded | Skill configuration (registration commented out) |

Most settings are ported from the legacy system. Health, Roll, and Skills are scaffolded with types, constants, and UI but their registrations are commented out pending wiring to actual game mechanics.

### Currency & PriceField — The Deep Dive

The currency system is the most architecturally significant settings domain because it introduces `PriceField` and `PriceData` — a new composite data type that flows through the entire AE pipeline.

**PriceData** is a DataModel representing a price as a collection of coin stacks:

```ts
{
  stacks: [
    { coinId: 'srd_gp', count: 50 },
    { coinId: 'srd_sp', count: 30 }
  ],
  srdEquivalent: 53    // auto-computed GP equivalent snapshot
}
```

`srdEquivalent` is recomputed from stacks on every `_initializeSource` using the world's current currency settings. If stacks reference coins that have been disabled in settings, the system reconsolidates using the stored `srdEquivalent` and the currently-enabled denominations. This means worlds can change their currency configuration without losing price data.

**PriceField** extends `EmbeddedDataField<PriceData>` and adds full Active Effect change support:

| AE Mode | Behavior |
|---------|----------|
| **add** | Merge coin counts (add matching coins, append new) |
| **subtract** | Reduce counts (remove stacks at zero) |
| **multiply** | Multiply all counts by scalar |
| **override** | Replace entire price |
| **upgrade** | Per-coin, take the higher count |
| **downgrade** | Per-coin, take the lower count |

Delta casting accepts multiple formats: JSON arrays, `PriceData` instances, shorthand strings (`"5 srd_gp, 3 srd_sp"`), or raw numbers (treated as GP).

**Why this matters**: Material effects generate price modifier changes. A Mithral material might add `[{ coinId: 'srd_gp', count: 1000 }]` to a weapon's price. Because `PriceField` handles its own AE change modes, this works through the standard Foundry AE pipeline — no special-case code needed.

The **ItemPriceFormGroup** Vue component renders a multi-denomination coin editor in item sheets, reading from the world's currency settings to know which coins to display. It respects the identified/unidentified view mode, so GMs can set a different price for the unidentified view.

### Settings UI

Settings use a `GenericSettingsApp` Vue component base with a composable `useSettingsStore` for reactive setting access. Individual domains extend this with `SettingsTable` for tabular configuration (like the currency coinage table with add/remove rows).

---

## 8. Tooling & Infrastructure

### Linting Overhaul
- Migrated from `standardx` to `eslint-plugin-vue` + `vue-eslint-parser` for Vue SFC support
- Added `eslint-plugin-simple-import-sort` for automatic import ordering
- Added parallel `lint:watch` + `dev:watch` via `npm-run-all` for development
- Removed old `.eslintrc.json` and `.eslintignore` (config now in `package.json` or flat config)

### Vite Configuration
- Added path aliases: `@vc` (now points to `src/vue/components`), `@vueApps`, `@settings`, `@effects`, `@ec` (entity components)
- Disabled HBS template copying (no more Handlebars)
- Disabled minification during development

### Foundry V14 Types
Updated `types/foundry/` to align with Foundry VTT V14.359 API surface. This is a bulk type definition update — no behavioral changes.

### TypeScript
- Updated to TypeScript 5.9
- Added `copilot-instructions.md` for AI-assisted development guidance
- All pre-existing TypeScript errors resolved — `tsc --noEmit` exits with code 0

### Documentation
- Added feature planning docs for FormulaDataField, FormulaFormGroup, and AspectPicker
- Added Foundry cheatsheets (data fields, hooks, theme variables)
- Moved old i18n files to `_old_lang/` (new structured i18n under `src/lang/en/`)

---

## Related Architecture Documents

This overview covers the foundational architecture established in the initial PR. The following documents detail cross-cutting systems that build on this foundation:

| Document | Covers |
|---|---|
| [Action System](action-system.md) | ActionDataModel, chains, ExecutionEngine, TurnActionBudget, IterativeAttackGenerator, PreRollDialog, EffectTrigger |
| [Active Effect Lifecycle](active-effect-lifecycle.md) | Phase application (core/initial/final/action.*), Dnd35eEffectChangeData, Material pattern, Bond pattern, AE generators |
| [Bonus Type Stacking Engine](bonus-stacking.md) | 27 bonus types, stacking rules, resolution algorithm, stacking history |
| [Condition System](condition-system.md) | Predefined AE templates, ConditionManager, severity chains, type immunities |
| [Content Pipeline](content-pipeline.md) | JSON→compendium build, origin tracking, compendium browser, migration runner |
| [Data Preparation Pipeline](data-preparation-pipeline.md) | Shell-now-derive-later, 3-stage prep lifecycle, formula resolution timing, caching |
| [FormulaFormGroup API](formula-system.md) | Vue component props, utility functions, integration examples |
| [Area Effects & Regions](area-effects.md) | Foundry V14 Regions, custom behaviors, auras, AoE spells |
| [Progression & Level System](progression-system.md) | ProgressionComponent, Grant System, Level History ledger, multiclass, monster class |
| [Property Maps](property-maps/) | Per-domain field inventories (Actors, Items, Effects, Cards) |

### Reference Files

| Document | Contents |
|---|---|
| [Bonus Types](../reference/bonus-types.md) | Complete enum with stacking rules and worked examples |
| [Conditions](../reference/conditions.md) | All conditions with mechanical effects and severity chains |
| [Action Costs](../reference/action-costs.md) | Turn budget, action cost table, progressive full attack state machine |
