---
description: "Use when understanding dnd35e architecture, component composition chains, DataModel patterns, or system conventions."
---

# D&D 3.5e System Architecture Patterns

## Component Composition Chain

dnd35e uses **mixin composition** rather than deep inheritance. Each layer adds schema, derivedData, and methods.

```
CoreMixin
  └── Identifiable (tracked state + secret-aware display behavior)
        └── PhysicalItem (weight, price, hardness, HP)
              └── EquippableItem (equipment slots, equipped state)
                    └── Weapon
                    └── Armor
                    └── etc.
```

**Key principle**: Each class extends the previous layer's `defineSchema()` and `prepareDerivedData()`.

```typescript
// PhysicalItem extends Identifiable
class PhysicalItemSystemModel extends Identifiable {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.weight = new fields.NumberField({ initial: 0 });
    schema.price = new fields.SchemaField({ ... });
    return schema;
  }
}

// EquippableItem extends PhysicalItem
class EquippableItemSystemModel extends PhysicalItemSystemModel {
  static defineSchema() {
    const schema = super.defineSchema();  // Gets everything from PhysicalItem
    schema.equipped = new fields.BooleanField({ initial: false });
    return schema;
  }
}
```

## Data Model Organization

| Layer | File Pattern | Responsibility |
|-------|--------------|-----------------|
| **Schema** | `*SystemModel.mts` | Define schema in `defineSchema()` |
| **Types** | `*SystemData.mts` | TypeScript types for runtime data |
| **Store** | `*Store.mts` | Pinia store with computed properties |
| **Document** | `*.mts` (Item/Actor class) | Document lifecycle hooks |

**Legacy fields may still be compound-shaped** — see `dnd35e-field.instructions.md` for compatibility rules.

## Sheet Store Composition Chain

Sheet stores mirror the DataModel composition chain layer-for-layer. Every layer follows a single, unified shape so inheritance composes cleanly and refactors stay local.

### The Pattern

Each layer in the chain:

1. Takes `(context, options?)` where `options = { defaultTabs?: SheetTab[]; defaultActiveTab?: string }`.
2. Calls **its direct parent layer** internally — never skips levels, never re-implements parent logic.
3. Adds its own `documentGetters` / `documentActions` and spreads them on top of the parent store.
4. Returns the **fully composed store** (parent spread + own additions) so the next layer up can keep composing.

```typescript
// Intermediate layer — unified signature
export function useEquippableItemStore<T extends EquippableItemLike>(
  context: SheetContext,
  options?: UseEquippableItemStoreOptions,
): EquippableDocumentStore<T> {
  const physicalStore = usePhysicalItemStore<T>(context, options);  // call direct parent

  const documentGetters = {
    ...physicalStore.documentGetters,
    isEquipped,
    isMasterwork,
    // …
  };

  const documentActions = {
    ...physicalStore.documentActions,
    toggleMasterwork,
  };

  return { ...physicalStore, documentGetters, documentActions };
  // ⚠️ Intermediate layers do NOT register in game.dnd35e.stores.
}
```

### Leaves vs. Intermediates

Only **runtime leaves** register themselves in `game.dnd35e.stores`. Today the runtime leaves are:

- `useCharacterStore` — leaf of the actor chain
- `useWeaponStore` — leaf of the item chain

Intermediate layers (`useActorSheetStore`, `useCreatureStore`, `useItemSheetStore`, `usePhysicalItemStore`, `useEquippableItemStore`) are **leaves only in type** — they exist so that future document subtypes can inherit a middle layer ready-to-go (e.g. a future `Armor` will compose from `useEquippableItemStore`). They must not register, and the matching intermediate `*.vue` sheet shells must call the store with the single-arg signature and `provide()` it without registering either.

```typescript
// Runtime leaf (e.g. WeaponStore.mts)
const store: WeaponStore = {
  ...equippableStore,
  documentGetters: { ...equippableStore.documentGetters, weaponType, weaponSubtype },
};

// Only leaves do this:
game.dnd35e.stores[document.value.documentName][context.document.id] = store;
return store;
```

### Why This Shape

- **Tabs flow top-down**: only the leaf knows the final tab set; it passes `defaultTabs` / `defaultActiveTab` through `options`, and intermediate layers may still mutate tabs (`replaceTabs(...)`) for shared structure (e.g. `PhysicalItemStore` injects `physicalItemEffectsTab`).
- **Single registration point** prevents duplicate writes to `game.dnd35e.stores` and avoids `any`-indexed type errors in intermediate `.vue` shells.
- **Destructure-safe**: leaf code constantly destructures `documentGetters` / `documentActions`; the spread-from-parent shape keeps the destructured references reactive across the whole composition.
- **`IdentifiableDocumentStore` is a parallel mixin**, not a chain layer — `usePhysicalItemStore` calls `useIdentifiableStore(context, baseStore)` alongside the chain.

### Type Shape

Each layer's store type extends the parent layer's store type and intersects added getters/actions:

```typescript
type PhysicalDocumentStore<T> = ItemSheetStore<T> & {
  documentGetters: ItemDocumentGetters & PhysicalItemGetters;
  documentActions: ItemDocumentActions<T> & PhysicalItemActions;
};

type EquippableDocumentStore<T> = PhysicalDocumentStore<T> & {
  documentGetters: PhysicalDocumentStore<T>['documentGetters'] & EquippableItemGetters;
  documentActions: PhysicalDocumentStore<T>['documentActions'] & EquippableItemActions;
};
```

Leaf type aliases keep their historical bare names (`WeaponStore`, `CharacterStore`) to avoid churning consumer imports.

## Formula Resolution

FormulaFamiliar enables `#context.property` syntax in formulas. Schema walker **includes all fields by default** (opt-out via `familiar: { formulaVisible: false }`).

```typescript
// In schema definition
schema.nameFormula = new fields.EmbeddedDataField(FormulaData, {
  initial: { formula: "#self.name" }
});
```

Reference at runtime:
```typescript
// Formula stored as: "Silver (+#self.hardness AC)"
// Automatically resolves to: "Silver (+5 AC)"
await item.system.nameFormula.resolveFormula({ self: item });
```

## Active Effects Pipeline

Two-phase application:

1. **Initial phase** (`prepareEmbeddedDocuments()`) — AEs created, unrelated to document state
2. **Final phase** (`prepareDerivedData()`) — AEs applied to item/actor, document state used

## Identifiable + ViewMode Model

The `Identifiable` mixin provides tracked/identified state, while sheet presentation is controlled by `ViewMode` (`edit` / `play` / `true`).

```typescript
interface Identifiable {
  system.isIdentified: boolean;
  system.slug: string;  // Stable ID used by formulas
  system.nameFormula: FormulaData;  // Formula-driven display name source
}
```

In practice:
- `play` mode is player-visible and applies mask/effective logic
- `true` mode is GM-only unmasked play view
- `edit` mode is authoring mode (raw editable source semantics)

## Bonus Type Stacking (Material Pattern)

Materials are ActiveEffects that modify items. They use `bonusType` field to control stacking:

```typescript
// Only one "material" bonus type per item (highest wins)
schema.bonusType = new fields.StringField({
  choices: ['material', 'broken', 'enhancment', ...]
});
```

Resolution: when multiple AEs apply same field, only highest value in each `bonusType` slot applies.

## Component Placement Strategy

**Principle**: Component homes follow domain boundaries, not generality. This prevents friction during refactoring and makes intent clear.

### Entity-Domain Components
Sheet components belong in their entity-type folder:

```
src/documents/items/
  physical/
    physicalItem/
      sheet/components/
        PhysicalItemHeaderStatus.vue       ← Physical item badges
        ...                                ← Other physical-item-only sheet components
    equippableItem/
      sheet/components/
        EquippableHeaderStatus.vue         ← Equippable-specific (equipped/carried state)
        ...                                ← Other equippable-item-only sheet components
    weapon/
      sheet/components/
        WeaponDamage.vue                   ← Weapon damage form group
```

**Why**: When Physical and Equippable item sheets need different behavior (e.g. badges show different state), having separate component homes makes changes safer. Updates to one entity type don't accidentally affect unrelated types. Search for "PhysicalItemHeaderStatus" finds exactly what you need, not 5 false positives in generic folders.

### Generic Reusable Components
Generic components stay in `src/vue/components/` **only when** they are truly cross-domain:

```
src/vue/components/
  fields/
    formGroups/
      FormGroup.vue                     ← Used by all entity types, all sheets
      NumberFormGroup.vue               ← Generic number input
      SelectFormGroup.vue               ← Generic select dropdown
  Layout/
    TabView.vue                         ← Generic tab container
```

Test: "Is this used by Physical items AND Weapons AND Actors AND Effects?" If yes, generic folder. If "just items," put it in `src/documents/items/<bucket>/<type>/components/`.

### Anti-Pattern: Catch-All Folders
Don't create folders like `HeaderComponents/`, `StatusBadges/`, `EditControls/`. These catch-alls:
- Hide domain intent (why is *this* status badge different from that one?)
- Make refactoring painful ("update all status badges" requires hunting across folders)
- Violate single-responsibility (folder should have a *reason* to exist)

**Learned**: Phase 1 initially placed HeaderStatus in generic `src/vue/components/HeaderStatus/`, then moved to entity domains when two different types needed two different components. Established domain-first placement avoids rework.

## Naming Conventions

Codified in `docs/migration-plan/poc/refactor-naming-conventions.md`. Key rules:

- **Top-level layout**: documents live under `src/documents/` (`actors/`, `items/`, `activeEffects/`, `scene/`, `document/`). Item subtypes nest under buckets: `items/physical/` and `items/metaphysical/`.
- **Suffix over prefix for system-named classes**: when a class name would collide with a Foundry type, use the `*Dnd35e` suffix form (e.g. `ItemDnd35e`, `ActorDnd35e`, `ActiveEffectDnd35e`, `RegionDocumentDnd35e`, `EffectChangeDataDnd35e`). Internal helper types that don't collide use bare names (e.g. `ParentDoc`, `OverrideOptions`, `SchemaFieldMeta`, `BaseFlags`, `ChangeType`).
- **Drop `Base` markers** on system-data classes: `*SystemModel` and `*SystemData`, not `Base*SystemData` or `*SystemModelBase`.
- **File casing**: `camelCase` directory names; `PascalCase` filenames for class-containing modules (e.g. `Buff.mts`, `ItemDnd35e.mts`). Single-component packaging folders may stay PascalCase (R.2.9).
- **`types.mts` convention** (R.2.10): per-folder type-aggregation files use the bare `types.mts` name (not `_types.mts`).
- **Grouped-helpers exception**: when a file aggregates many small helpers, the filename describes the group (e.g. `fieldBuilders.mts`) rather than any one symbol. Single-symbol files match the symbol's PascalCase name.
- **Path aliases**: `@documents/*`, `@items/*`, `@actors/*`, `@effects/*`, `@scene/*`, `@fields/*`, `@vc/*` (vue components), `@vueApps/*`, `@vueStores/*`, `@canvas/*`, `@helpers/*`, `@constants/*`, `@settings/*`, plus Foundry `@client/*`, `@common/*`, `@source/*`.

## Vue Sheet Patterns

See `vue-sheet-patterns.instructions.md` for sheet-specific patterns.

## Localization Architecture

All field labels/hints are auto-localized via Foundry's `LOCALIZATION_PREFIXES` system. See `foundry-data-fields.instructions.md` for details.

**Key conventions:**
- Every DataModel declares `static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.MODEL_NAME']`
- Language files use nested `dnd35e.MODEL_NAME.FIELDS.fieldName.label/.hint` structure
- Split source files (`src/lang/en/*.json`) are deep-merged at build time into one `dist/lang/en.json`
- `field.options.label` is **pre-localized text** after startup (not a key)
- FormGroup auto-derives labels from schema — no explicit `label` prop needed
- Explicit `label`/`hint` props are treated as localization keys (passed through `game.i18n.localize()`)
- Non-field strings (enum values, headings, buttons) use `game.i18n.localize('dnd35e.DOMAIN.Key')`
- All keys use `dnd35e.*` namespace (not `DND35E.*` or `D35E.*`)

### CONFIG Enum Pre-Localization

CONFIG-registered enums (sizes, weapon types, DR types, etc.) use a two-step pre-localization pattern so they stay current across language switches without DB migration.

**Step 1 — Register at module scope** (in the config file that defines the enum):
```typescript
// src/constants/config/system.mts
registerConfigPreLocalization('item.enums.sizes', { key: 'label' });
registerConfigPreLocalization('gameRules.damageReductionTypes', { key: 'label' });
```

**Step 2 — Wire once in main.mts** (already done — do not add a duplicate):
```typescript
Hooks.once('i18nInit', () => {
  preLocalizeConfig(CONFIG.dnd35e as unknown as Record<string, unknown>);
});
```

At `i18nInit`, `preLocalizeConfig` walks all registered paths and replaces i18n keys with localized text in-place. Utility lives in `src/helpers/localization/preLocalizeConfig.mts`.

**i18n key naming** — enum default entries use `dnd35e.DOMAIN_UPPER.EntryName` (e.g. `dnd35e.DAMAGE_REDUCTION_TYPES.Acid`, `dnd35e.SIZES.Medium`).

### Live-Merge Pattern

When a setting stores user-customizable entries that overlap with CONFIG defaults (e.g. damage reduction types), **merge at read-time** rather than duplicating labels in the DB. This makes language switching transparent:

```typescript
const systemDefaults = CONFIG.dnd35e.gameRules.damageReductionTypes as Record<string, { label: string }>;
return Object.entries(config).map(([key, entry]) => ({
  value: key,
  label: systemDefaults[key]?.label ?? entry.label,  // CONFIG label for system entries
}));
```

System entries use the CONFIG pre-localized label; custom entries fall back to their stored label.

### CONFIG Registration Spread Merge

When populating CONFIG from entity registration files, **always spread-merge** — bare assignment wipes anything registered earlier:

```typescript
// ✅ Correct — preserves pre-registered enums
CONFIG.dnd35e.item = { ...CONFIG.dnd35e.item, ...ItemConfig };

// ❌ Wrong — wipes enums registered before this file runs
CONFIG.dnd35e.item = ItemConfig;
```

Registration order is not guaranteed. Multiple files populate the same CONFIG object.

## DocumentEventEmitter — Per-Instance Lifecycle Event Bus

Every system document carries a `readonly events: DocumentEventEmitter` instance. It is an **instance-scoped** pub/sub bus — each document has its own subscriber list, contrasting with global `Hooks.*` which fan out to all listeners for that event type.

### API

```ts
// Subscribe — returns an unsubscribe function
const off = item.events.on(PhysicalItem.LifeCycle.broken, ({ item, hp }) => {
  console.log(`${item.name} became broken (hp: ${hp.current}/${hp.max})`);
});
off(); // unsubscribe

// Subscribe once — auto-unsubscribes after first firing
item.events.once(PhysicalItem.LifeCycle.repaired, (payload) => { ... });

// Emit (from within the document class)
void this.events.emit(PhysicalItem.LifeCycle.broken, { item: this, hp: { current, max } });
```

### LifeCycle Static Constants — Spread Inheritance

Each class in the composition chain declares a `static readonly LifeCycle` object, extending parents via spread:

```ts
// Base (DocumentDnd35e):
const DocumentLifeCycle = { created: 'created', destroyed: 'destroyed' } as const;

// PhysicalItem extends base:
static readonly LifeCycle = {
  ...DocumentLifeCycle,
  broken: 'broken',
  repaired: 'repaired',
} as const;

// Weapon extends PhysicalItem:
static override readonly LifeCycle = {
  ...PhysicalItem.LifeCycle,
  beforeAction: 'beforeAction',
  afterAction: 'afterAction',
  onHit: 'onHit',
  onCrit: 'onCrit',
} as const;
```

**Always use the constant** (`PhysicalItem.LifeCycle.broken`) not the raw string (`'broken'`) — TypeScript narrows the type and refactoring stays safe.

### Timing Contracts

| Event | When emitted | Why |
|-------|-------------|-----|
| `created` | Via `queueMicrotask` after `_onCreate` | Defers until the full `_onCreate` call stack (all super calls) has unwound — subscribers see a fully initialized document |
| `destroyed` | **Before** `super._onDelete` | Subscribers can still access the document's collections while it's in-memory |

After `destroyed` emits, `events.clear()` is called immediately — async handlers running from the snapshot still complete, but no new subscriptions can receive the event.

### Memory Leak Prevention

`events.clear()` is called automatically in `_onDelete`. If your subscriber holds a reference to the emitting document (common), you must either:
1. Rely on `_onDelete` clearing (sufficient for most cases)
2. Call `off()` explicitly in component teardown (for Vue stores / UI subscribers)

### Scope: When to use `events` vs. global `Hooks`

| Scenario | Use |
|----------|-----|
| "Any weapon became broken" | `Hooks.on('updateItem', ...)` |
| "**This specific** weapon became broken" | `weapon.events.on(Weapon.LifeCycle.broken, ...)` |
| Cross-document side effects (actor ← item) | `item.events.on(...)` subscribed by the owning actor |
| System-wide tracking / analytics | `Hooks` |

See `src/helpers/DocumentEventEmitter.mts` and `src/documents/document/DocumentDnd35e.mts`.

---

## System-Managed AE Flag + Toggle Semantics

AEs created programmatically by system code are marked with `flags.dnd35e.systemManaged: true`. This flag governs **toggle-off behavior** — user-authored custom AEs must never be silently deleted.

### The Convention

```ts
// Marking an AE as system-managed (at creation time):
await item.createEmbeddedDocuments('ActiveEffect', [{
  name: 'Masterwork Weapon Enhancement',
  type: materialEffectType,
  flags: { dnd35e: { materialSubtype: 'masterwork', systemManaged: true } },
}]);

// Detecting system-managed vs. custom:
const isSystemManaged = effect.getFlag('dnd35e', 'systemManaged') === true;
```

### Toggle-Off Semantic: Delete System / Disable Custom

When a toggle (e.g. `isMasterwork = false`) turns off a category of AEs:

| AE type | Toggle OFF action | Rationale |
|---------|------------------|-----------|
| System-managed | **Delete** | System owns it; it will be re-created from compendium on next toggle-on |
| Custom (user-created) | **Disable** | User data must not be destroyed; disabling stops the effect while preserving edits |

```ts
const systemManaged = masterworkAes.filter((ae) => isSystemManagedMasterworkAe(ae));
const custom        = masterworkAes.filter((ae) => !isSystemManagedMasterworkAe(ae));

// Delete system-managed
if (systemManaged.length) {
  await item.deleteEmbeddedDocuments('ActiveEffect', systemManaged.map((ae) => ae.id!));
}
// Disable custom
const toDisable = custom.filter((ae) => !ae.disabled).map((ae) => ({ _id: ae.id, disabled: true }));
if (toDisable.length) {
  await item.updateEmbeddedDocuments('ActiveEffect', toDisable);
}
```

### Toggle-On Semantic: Re-enable Existing / Create from Compendium

```ts
if (masterworkAes.length > 0) {
  // Re-enable any disabled ones (system-managed or custom)
  const toEnable = masterworkAes.filter((ae) => ae.disabled).map((ae) => ({ _id: ae.id, disabled: false }));
  if (toEnable.length) await item.updateEmbeddedDocuments('ActiveEffect', toEnable);
} else {
  // No AEs of this type exist yet — create from compendium
  await attachDefaultMasterworkAe(item, { enabled: true });
}
```

This pattern applies to every system-managed AE category: Masterwork, Broken, and any future system AEs.

---

## Field Permissions & Overrides

See `dnd35e-field.instructions.md` for field override cascade, view-aware getters, and permission defaults.
