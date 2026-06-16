# PR: Core Architecture Overhaul

**Branch:** `feature/weapon_base` → `dev`

> This branch began as a base weapon‑item pass — establishing the weapon as a minimal shell of an item type, ready to house combat actions, and using it to clarify how existing Material Items were meant to interact with Weapon Items. Material already existed in the system as an item type, and the plan was to apply it to weapons. But once the interaction between material and weapon wiring was examined, the flaw in the concept became evident. Material doesn’t exist independently — it only modifies something else. It belongs on the Active Effect layer.
> That pivot is what blew the scope open. Moving Material to an ActiveEffect meant we needed a proper AE framework. Wiring AEs to items meant we had to settle how items and effects interact at the data layer. Settling the data layer exposed a separate problem: the old approach of storing unidentified values in flags completely falls apart for complex types like prices — you can't put a validated `PriceData` model in a flag. The current architecture solves masking through Secret AEs + `_masks` dictionary, keeping schema fields plain while mask logic lives entirely in the effect layer.
> With scope already blown open, this became the moment to tackle a long-deferred priority: replacing Handlebars with Vue and building a proper unified ViewMode system (`edit` / `play` / `true`). HBS is imperative — every HTML mutation and reactive response has to be spelled out by hand, which makes ambitious UI a grind. Vue removes that friction; it's what made something like FormulaFamiliar's live syntax highlighting and autocomplete worth attempting in the first place. Field permission metadata (visibility, editability) slots into the new sheet framework via `useDnd35eField()` defaults and the `FieldOverridesStore` at runtime.
> So this branch is really three things at once:
> • Weapon as the first base item
> • Material as the first base ActiveEffect
> • The foundational architecture that lets them communicate correctly
> Everything here — field permission defaults, formula resolution, mode-aware sheets, and the AE change pipeline — is groundwork that every document type builds on.
> Each of these documents is an incomplete prototype meant to showcase unique behaviors and how we can pattern them. Many fields may still be missing in the data layer, the Vue sheet layer, or elsewhere. There are probably still switches that need to be added to settings, and some UI clutter will need to be addressed (possibly via a context menu).

---

## Table of Contents

1. [Field Architecture — Plain Fields + Masks](#1-field-architecture--plain-fields--masks)
2. [Identifiable System — Secret-Aware Display](#2-identifiable-system--secret-aware-display)
3. [FormulaFamiliar — Schema-Driven Formula Autocomplete](#3-formulafamiliar--schema-driven-formula-autocomplete)
4. [Materials as Active Effects](#4-materials-as-active-effects)
5. [Dnd35eDocument Mixin — Document-Level Formula Resolution](#5-dnd35edocument-mixin--document-level-formula-resolution)
6. [Vue Sheet Architecture](#6-vue-sheet-architecture)
7. [Settings System](#7-settings-system)
8. [Tooling & Infrastructure](#8-tooling--infrastructure)

---

## 1. Field Architecture — Plain Fields + Masks

Schema fields are **plain Foundry DataFields** — `NumberField`, `StringField`, `SchemaField`, etc. — defined via `fieldBuilders.mts` helpers (`requiredNumberField`, `optionalStringField`, etc.). No compound wrappers are used.

Masking (showing players different values than stored) is handled entirely by the Secret AE + `_masks` layer, not by field shape.

### Defining Fields

```ts
// Plain field — always the pattern
schema.hardness = requiredNumberField(0);
schema.price = new CurrencyField();       // special composite type
schema.nameFormula = new FormulaField();  // formula-specific type
```

### Field Permission Defaults

Schema authors attach permission defaults via `useDnd35eField()` and FormulaFamiliar metadata via `withFamiliar()`:

```ts
schema.hardness = useDnd35eField(requiredNumberField(0), {
  defaultVisibility: 'ownerPlus',    // 'everyone' | 'ownerPlus' | 'gmOnly'
  defaultEditability: 'gmOnly',       // 'normal' | 'gmOnly'
});

// Opt a field out of formula autocomplete
schema.description = withFamiliar(htmlField(), { formulaVisible: false });
```

Runtime GM overrides are stored in `flags.dnd35e.fieldOverrides` on the document.

### FormulaFamiliar Integration

The schema walker uses static markers on field constructors to control recursion:

- `isFamiliarField = true` — compound leaf; schema walker exposes `.value` access path
- `isFamiliarLeaf = true` — opaque leaf; no recursion (used by `CurrencyField`, `FormulaField`)
- No marker on a `SchemaField` → walker recurses into children
- No marker on other field types → simple scalar leaf

Opt out individual fields via `withFamiliar(field, { formulaVisible: false })`.

> For how Active Effect `targetField` routing works, see [Active Effect Lifecycle](active-effect-lifecycle.md). For value preparation in the broader pipeline, see [Data Preparation Pipeline](data-preparation-pipeline.md).

---

## 2. Identifiable System — Secret-Aware Display

The identifiable system is now secret-aware: `isIdentified` is derived from active Secret AEs, and display masking is driven by `_masks` plus `ViewMode`.

In practice:
- `play` shows player-visible values (masked when Secrets are active)
- `true` shows unmasked effective values (GM-only)
- `edit` is authoring mode for editable source values

### Architecture

The system is built as two composable mixins that stack independently:

**Schema Mixin** (`IdentifiableSchemaMixin`) adds two boolean fields to the data model:
- `isIdentifiable` — whether this document type supports secret-aware display behavior
- `isIdentified` — current identification state

**Document Mixin** (`IdentifiableDocumentMixin`) extends `Dnd35eDocumentMixin` with:
- Name/formula behaviors that cooperate with derived `isIdentified`
- Display resolution behavior aligned with mask-aware view modes

### Storage: No More Flags

Previously, unidentified data lived in document flags — a flat key-value store outside the schema. This caused problems with structured data types, Foundry's data preparation pipeline, and Active Effect routing.

Current masking is generated from Secret AEs into `_masks` at prep time. Legacy `.unidentifiedValue` fields may still exist for compatibility, but view-aware getters are the canonical read path.

### Sheet View Modes

Document sheets use a unified 3-state mode model:

| Mode | Who Can Use | Behavior |
|------|-------------|----------|
| `edit` | User with edit permission | Editable source values |
| `play` | Everyone with sheet access | Player-visible values (mask/effective aware) |
| `true` | GM only | Unmasked effective values |

`useDocumentSheetStore` view-aware getters (`getViewAwareFieldValue`, `getViewAwareFieldUpdater`) route reads/writes according to mode + masking rules.

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

- Fields with `isFamiliarField === true` are auto-included as compound leaves
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
- Material display behavior integrates with play/true modes through Secret mask infrastructure
- Materials benefit from the existing AE UI (enable/disable, priority, phases)

### Class Composition

```
DnD35eActiveEffect
  → Dnd35eDocumentMixin    (formula resolution, registeredFormulas)
  → IdentifiableDocumentMixin  (secret-aware name/display behavior)
  = Material
```

### Automatic Change Generation

`MaterialSystemModel.buildChanges()` runs in `prepareDerivedData()` and auto-generates AE changes from the material's properties:

- Non-zero `hardness.value` → generates a hardness bonus change
- Non-empty `price.value` → generates a price modifier change
- Each `damageReductionTypes` entry → generates a DR type change
- Changes are marked `isSystem: true` so they don't appear in the user-editable changes list

Material display/masking behavior is handled by Secret AEs + ViewMode. Material changes contribute effective values, while player-facing masked presentation is resolved in play mode.

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

The base mixin registers two: `defaultDerivedNameRegistration` (resolves the name formula) and `defaultNameRegistration` (copies derivedName to the document name). `IdentifiableDocumentMixin` extends this behavior for secret-aware display/name resolution.

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

Each typed FormGroup (Number, Text, Select, Checkbox, Toggle, Color, MultiSelect, RichTextEditor, ItemPrice) computes an `editValue` that respects the 3-state ViewMode:

- **Edit mode**: shows `sourceValue` (raw DB value) — user edits the real data
- **Play mode**: shows `props.value` (effective/masked value)
- **True mode**: shows `props.value` (effective unmasked value for GM)
- **Readonly mode**: always shows effective value

### FieldControls

`FieldControls.vue` renders GM-only permission icons on each form field:
- Eye icon cycles visibility: `everyone → ownerPlus → gmOnly`
- Lock icon toggles editability: `normal ↔ gmOnly`

Overrides cascade parent-to-child with most-restrictive-wins semantics. A section locked to `gmOnly` locks all its children regardless of their own settings.

### Document Sheet Store

`useDocumentSheetStore` is the central composable providing:
- `getViewAwareFieldValue(path)` — returns the right value for the current view mode
- `getDirectFieldUpdater(path)` / `getViewAwareFieldUpdater(path)` — mode-aware update functions (including mask-aware routing)
- `getSourceProperty(path)` — raw DB value at the given path
- `getFieldOverride(path)` — merged permission cascade for a field path
- `viewModeAwareUpdateDocument(data)` — bulk update respecting current view mode

### Sub-Stores

The document sheet decomposes into focused stores:
- **RenderModeStore** — unified `edit`/`play`/`true` mode state, header mode bar rendering
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

### Currency & CurrencyField — The Deep Dive

The currency system is the most architecturally significant settings domain because it introduces `CurrencyField` and `CurrencyData` — a new composite data type that flows through the entire AE pipeline.

**CurrencyData** is a DataModel representing a currency value as a collection of coin stacks:

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

**CurrencyField** extends `EmbeddedDataField<CurrencyData>` and adds full Active Effect change support:

| AE Mode | Behavior |
|---------|----------|
| **add** | Merge coin counts (add matching coins, append new) |
| **subtract** | Reduce counts (remove stacks at zero) |
| **multiply** | Multiply all counts by scalar |
| **override** | Replace entire value |
| **upgrade** | Per-coin, take the higher count |
| **downgrade** | Per-coin, take the lower count |

Delta casting accepts multiple formats: JSON arrays, `CurrencyData` instances, shorthand strings (`"5 srd_gp, 3 srd_sp"`), or raw numbers (treated as GP).

**Why this matters**: Material effects generate price modifier changes. A Mithral material might add `[{ coinId: 'srd_gp', count: 1000 }]` to a weapon's price. Because `CurrencyField` handles its own AE change modes, this works through the standard Foundry AE pipeline — no special-case code needed.

The **CoinageFormGroup** Vue component renders a multi-denomination coin editor in item sheets, reading from the world's currency settings to know which coins to display. It respects ViewMode semantics so play mode can display masked/effective values while true mode shows unmasked values for GMs.

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
