# Phase 1: Item Foundation (Weapon PoC)

**Status**: ✅ Approved

> **Milestone**: POC  
> **Dependencies**: None  
> **Goal**: A single weapon item type that can be created, opened, edited, and saved. Establishes the data model, Vue sheet, and component composition patterns.

---

## Completion Checklist

### ✅ Complete — Data Model Chain

- [x] `Dnd35eDocumentSystemModel` — `version`, `slug`, `derivedName`, `nameFormula`, `description`
- [x] `ItemSystemModelBase` — `origin` (originId/originVersion/originPack), `isPsionic`, `isEpic`
- [x] `IdentifiableSchemaMixin` — `isIdentifiable`, `isIdentified`
- [x] `PhysicalItemSystemModel` — `hp`, `hardness`, `quantity`, `weight`, `isCarried`, `size`, `price`, `resalePrice`, `brokenResalePrice`, `isBroken`, `containerId`
- [x] `EquippableItemSystemModel` — `isEquipped`, `equippedSlotIds`, `isMelded`, `designedForSize`, `isWeightlessWhenEquipped`
- [x] `WeaponSystemModel` — `isMasterwork`, `weaponType`, `weaponSubtype`, `weaponBaseType`, `weaponDamage` (damageRoll, damageType, critRange, critMultiplier, rangeIncrement, attackFormula, damageFormula), `attackNotes`, `damageNotes`

### ✅ Complete — Document Chain

- [x] `ItemDnd35e` — custom AE pipeline (`applyActiveEffects(phase)`), `prepareBaseData()`, sealed `prepareDerivedData()`, `_prepareDerivedItemData()` hook
- [x] `Dnd35eDocumentMixin` — formula registration, `_preCreate()`, `update()` name formula resolution
- [x] `IdentifiableDocumentMixin` — unidentified name formula, identified/unidentified name switching
- [x] `Weapon` document class registered as concrete type

### ✅ Complete — Infrastructure

- [x] `CONFIG.Item.dataModels.weapon = WeaponSystemModel`
- [x] `CONFIG.Item.documentClass = ItemProxyDnd35e`
- [x] `registerFamiliarSchema('Item', 'weapon', ...)` for formula resolution
- [x] Sheet registered: `WeaponSheet` as default for type `weapon`
- [x] Hooks: `preCreateItem`, `updateItem` for name formula + store refresh
- [x] Pure Vue rendering (AppV2 + `VueDocumentSheetMixin`) — no Handlebars

### ✅ Complete — Identifiable System

- [x] Schema mixin (`isIdentifiable`, `isIdentified`)
- [x] Document mixin (name formula switching for identified/unidentified)
- [x] Vue sheet components: `IdentifiableDocumentSheet`, `IsIdentifiedToggle`, `IdentifiableConfig`

### 🔶 Remaining Work Items

#### Data Model Gaps

- [ ] **1.A — `isBaseWeaponType` + Dynamic Base Type Registry**: Add `isBaseWeaponType` boolean to `WeaponSystemModel` (default `false`). When `true`, this weapon declares itself as a base weapon type and becomes available in the system-wide base type list. Any weapon can either *be* its own base type (`isBaseWeaponType: true`) or *select* an existing base type from the dynamic list (via `weaponBaseType` string field).
    - **The base type list is self-assembling** — built at runtime by querying all weapon items (world + compendiums) where `isBaseWeaponType === true`. No hardcoded array to maintain or replicate across feats.
    - **Feat/ability targeting** — when selecting a target for Weapon Focus, Improved Critical, etc., the picker shows all weapons with `isBaseWeaponType: true`. A weapon can only be targeted by these feats if it has a matching `weaponBaseType` selected, or is itself a base type.
    - **`weaponBaseType` stays a free string for Phase 1** — user enters a UUID manually (advanced users during alpha/beta can copy it from the base weapon's sheet). The `{ name, uuid }` pair is the natural `SelectOption<string>` format for the future compendium-backed picker. When that picker ships, `weaponBaseType` migrates from a free string to a `{ name: string, uuid: string }` SchemaField.
    - **No `properties` SchemaField** — weapon special properties (reach, trip, disarm, double, brace, nonlethal, monk, finesse) are inherent to the base type definition and will be part of the base type data structure in a future phase. Not stored per-item as boolean flags. The D35E approach (`fin`, `rch`, `trp`, etc.) mixed Pathfinder additions, magic enhancements, and SRD properties into one bag — we don't replicate that.
    - **Pathfinder-only flags removed**: `blocking`, `performance`, `fragile`, `grapple` are not 3.5e SRD.
    - **`returning`, `incorporeal`**: Magic weapon enhancements → Phase 15 (Item Enhancements).
- [ ] **1.B — `noAmmoRequired` Flag**: Add `noAmmoRequired` boolean to `WeaponSystemModel` (default `false`). Used for returning weapons and other per-item magical overrides that prevent ammo consumption. Relevant only for ranged/thrown types but should exist on all weapons for AE targeting.
- [ ] **1.C — Weapon Subtypes Match SRD Table**: The existing `WEAPON_SUBTYPES` (`unarmed | light | oneHanded | twoHanded | ranged`) already match the SRD weapon table row headers exactly. No changes needed to the subtype enum.
    - The `ranged` subtype covers both thrown weapons (dart, javelin) and projectile weapons (bows, crossbows, sling). The mechanical distinction (STR to damage, max range increments, ammo consumption) is derived from other fields — not from the subtype.
    - Melee weapons that *can be thrown* (dagger, spear, club, etc.) remain `light`/`oneHanded`/`twoHanded` — their throwability is derived from a non-null `rangeIncrement`.
    - Projectile ranged weapons are effectively "ammo launchers" — all are handled by the ammo system, which is a separate item type.
- [ ] ~~**1.D — `splash` Weapon Type**~~: **REMOVED.** Splash items (alchemist's fire, holy water, acid, tanglefoot bags) are not weapons in the SRD — they appear under "Special Substances and Items" and use the Throw Splash Weapon special attack rules. They will be modeled as consumable items with their own action (separate item type, future phase). D35E used `misc → splash` as a workaround; we don't replicate that.

#### Vue Sheet Gaps

- [ ] **1.E — `WeaponCombatFields.vue` Component**: Create a new component to render the weapon-specific fields that currently have NO Vue representation. Must display: `isBaseWeaponType` (checkbox — 1.A), `isMasterwork` (checkbox), `weaponBaseType` (text input — free string for now, user enters UUID manually during alpha/beta; advanced picker in future phase), `weaponDamage.damageRoll` (text input), `weaponDamage.damageType` (select from `damageTypes.mts`), `weaponDamage.critRange` (number, default 20), `weaponDamage.critMultiplier` (select: ×2/×3/×4), `weaponDamage.rangeIncrement` (number, nullable), `weaponDamage.attackFormula` (text), `weaponDamage.damageFormula` (text), `attackNotes` (textarea), `damageNotes` (textarea). Place in Details tab below the existing physical item fields.
- [ ] ~~**1.F — `WeaponBaseTypeInfo.vue` Component**~~: **DEFERRED.** Requires the base type data config (special properties, stat blocks) which is a future phase feature. When the base type config exists, this component will show read-only property tags (e.g., "Reach, Trip, Disarm +2"). For Phase 1, the base type is just a string field rendered in 1.E.
- [ ] **1.G — Header Status Components**: The header status slot (`#header-status`) in `WeaponSheet` is currently empty. Two components needed:
    1. **`PhysicalItemHeaderStatus.vue`** — lives in the Physical item component layer. Checks `isCarried` and displays a "Carried" badge when true. Reusable for all physical items (potions, scrolls, etc.).
    2. **`EquippableHeaderStatus.vue`** — extends/overrides the Physical component for equippable items. Also checks `isEquipped`, with equipped status taking display priority over carried. Reusable for all equippable items (weapons, armor, shields).
- [ ] **1.H — Effects Tab Audit**: The Effects tab exists but needs verification that it correctly lists Active Effects on the weapon, supports create/edit/delete, and renders effect changes. Currently uses `DocumentEffects.vue` — confirm it works for item-level AEs, not just actor-level.
- [ ] **1.I — `WeaponStore` Completeness**: Verify `WeaponStore` (Pinia) exposes all schema fields as reactive state. Currently it extends `EquippableItemStore` — confirm `weaponDamage` sub-fields are individually reactive (not just the top-level object). Test that changing `weaponDamage.critRange` in the sheet triggers a proper `update()` call with the correct dot-path.

#### `prepareDerivedData()` Logic

- [ ] ~~**1.J — Derived Weapon Data**~~: **REMOVED.** No weapon-specific derived data needed in Phase 1.
    - **`effectiveSize`**: Not needed — `size` is the physical object size, `designedForSize` is the creature size for chart lookups. AEs modify these directly; no wrapper field required.
    - **`effectiveDamageRoll`**: Ephemeral — calculated by the combat system at roll time using `designedForSize` against the size-damage chart. Not a stored derived property. → Phase 8.
    - **`isProficient`**: Determined by the combat engine at runtime based on class/feat proficiency grants. Display value deferred until proficiency feats exist. → Phase 8.
    - **`isDouble`**: Double weapons require two damage entries, two crit profiles, and special TWF rules. → Deferred to late Beta or post-release bonus content.
    - **`threatRange`**: Redundant — `critRange` IS the threat range. The SRD uses "critical threat range" and "threat range" interchangeably. A weapon with `critRange: 19` threatens on 19–20. Nothing to derive.

#### Test Designs (for Phase 4 Framework)

- [ ] **1.K — Test Case Designs**: Document the following test cases. Actual implementation waits for Phase 4 (Testing PoC), but the test designs should be specified now:
  1. `WeaponSystemModel.defineSchema()` returns all expected fields with correct types/defaults
  2. Creating a weapon Item sets `system.weaponType` default to `simple`
  3. `weaponDamage.critRange` clamps to 1–20 range
  4. `weaponDamage.critMultiplier` accepts only 2, 3, or 4
  5. `isBaseWeaponType` defaults to `false`
  6. Weapon Vue sheet renders without console errors
  7. Form inputs two-way bind to document system fields

#### Cleanup

- [ ] **1.L — Clean Up Commented-Out Code**: The original 7 TODOs no longer exist in the codebase. Three commented-out blocks remain and should be updated to reference their work items:
  1. **`Weapon.mts` line 18** — commented-out `equippedStatusLabel` getter with note "This needs to go to equippable". Update comment to reference work item 1.G (`EquippableHeaderStatus.vue`).
  2. **`WeaponStore.mts` line 48** — commented-out `...equippableStore.documentActions` spread with note "no specific actions in equippable yet, but they will come". Leave as-is until equippable actions are implemented.
  3. **`WeaponSheet.vue` line 7** — HTML comment placeholder for `EquipableHeaderStatus`. Update to describe the two-component design: `PhysicalItemHeaderStatus.vue` (carried badge) overridden by `EquippableHeaderStatus.vue` (equipped takes priority). Reference work item 1.G.
- [ ] **1.M — Damage Type Constants**: `damageTypes.mts` currently defines only 3 physical types (`bludgeoning`, `piercing`, `slashing`). Add energy types needed for weapon damage: `fire`, `cold`, `electricity`, `acid`, `sonic`, `force`, `positive`, `negative`. These are needed even in Phase 1 because magical weapons can deal energy damage via AEs, and the `damageType` select needs the full list.
- [ ] **1.N — Remove `derivedName` (redundant with `nameFormula.resolvedValue`)**: Investigation complete — `derivedName` is always identical to `nameFormula.value.resolvedValue` after `prepareDerivedData()`. Remove it entirely. Replacement mapping:

  **Schema & types** (task 1):
  - `Dnd35eDocumentSystemModel.mts` — delete `derivedName: requiredStringField()` from `defineSchema()`
  - `BaseDnd35eSystemData.mts` — remove `derivedName: string` from Source & Data types
  - `EvaluationDocument` in `types.mts` — remove `derivedName: string`

  **prepareDerivedData** (task 2):
  - `Dnd35eDocumentSystemModel.mts` — delete the `this.derivedName = ...` write; change the `resolve()` fallback from `this.derivedName` to `this.parent.name`

  **Formula registrations — base** (task 3):
  - `Dnd35eDocument.mts` `defaultDerivedNameRegistration`: change `impactedField` from `'system.derivedName'` to `'system.nameFormula.value.resolvedValue'`; change evaluate fallback from `document.system.derivedName` to `document.name`
  - `Dnd35eDocument.mts` `defaultNameRegistration`: read `document.system.nameFormula?.value?.resolvedValue || document.name` instead of `document.system.derivedName`

  **Formula registrations — identifiable** (task 4):
  - `IdentifiableItem.mts` `identifiableNameRegistration`: identified path returns `nameFormula?.value?.resolvedValue || document.name`; unidentified path returns `nameFormula?.unidentifiedValue?.resolvedValue || nameFormula?.value?.resolvedValue || document.name`

  **Cleanup** (task 5):
  - `ensureNameFormula.mts` — remove commented-out `derivedName` line
  - `IdentifiableDocumentStore.mts` — remove commented-out `derivedName` computed
  - `common.json` — remove derivedName label/hint

  **No DB migration needed** — Foundry drops unknown source fields automatically; `resolvedValue` is already populated.

#### Dnd35eField Replacement → `useDnd35eField()`

- [ ] **1.O — Extend Foundry field typings with `Dnd35eFieldOptions`**: Create a type extension (not in `src/types/` — those are vanilla Foundry typings). Instead, declare an extended `DataFieldOptions` interface that adds the optional `Dnd35eFieldOptions` shape. This lives alongside `useDnd35eField()` (e.g., `src/helpers/fields/Dnd35eFieldOptions.mts` or co-located in `useDnd35eField.mts`). The extension augments Foundry's `DataField` so that `field.options.familiar` etc. are type-safe across the codebase. **Must land before 1.P** so the helper function has correct types.

- [ ] **1.P — Create `useDnd35eField()` helper**: Create `src/helpers/fields/useDnd35eField.mts`. This is a function that takes any Foundry `DataField` instance and stamps `Dnd35eFieldOptions` onto its `options` bag, returning the same instance with augmented typing. Replaces the `Dnd35eField` compound wrapper class.

  ```typescript
  // src/helpers/fields/useDnd35eField.mts
  function useDnd35eField<T extends DataField>(
    field: T,
    dnd35eOptions: Dnd35eFieldOptions
  ): T & { options: T['options'] & Dnd35eFieldOptions } {
    Object.assign(field.options, dnd35eOptions);
    return field as T & { options: T['options'] & Dnd35eFieldOptions };
  }
  ```

  `Dnd35eFieldOptions` carries all the metadata that was previously on Dnd35eField:
  ```typescript
  interface Dnd35eFieldOptions {
    familiar?: FormulaFieldMeta;     // schema walker autocomplete config
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    canVisibilityBeChanged?: boolean;
    canEditabilityBeChanged?: boolean;
  }
  ```

  **Usage in defineSchema():**
  ```typescript
  schema.hardness = useDnd35eField(new NumberField({ initial: 0, label: 'Hardness' }), {
    familiar: { formulaVisible: true, display: 'Hardness', type: 'number' },
    defaultVisibility: 'everyone',
  });
  ```

- [ ] **1.Q — Root-level field familiar registries (inheritance chain)**: Document-root fields (`name`, `img`, etc.) are not defined in `defineSchema()` — they come from Foundry's base document. Create a base registry in the CoreMixin folder, then extend per entity type:

  ```typescript
  // src/entities/components/CoreMixin/rootFamiliarFields.mts
  const BASE_ROOT_FIELDS: Record<string, FormulaFieldMeta> = {
    name: { formulaVisible: true, display: 'Name', type: 'string' },
    img: { formulaVisible: false },
  };

  // src/entities/items/baseItem/rootFamiliarFields.mts
  const ITEM_ROOT_FIELDS: Record<string, FormulaFieldMeta> = {
    ...BASE_ROOT_FIELDS,
    // No item-specific root fields for now
  };

  // src/entities/actors/baseActor/rootFamiliarFields.mts
  const ACTOR_ROOT_FIELDS: Record<string, FormulaFieldMeta> = {
    ...BASE_ROOT_FIELDS,
    // No actor-specific root fields for now
  };

  // src/entities/activeEffects/BaseActiveEffect/rootFamiliarFields.mts
  const ACTIVE_EFFECT_ROOT_FIELDS: Record<string, FormulaFieldMeta> = {
    ...BASE_ROOT_FIELDS,
    disabled: { formulaVisible: true, display: 'Disabled', type: 'boolean' },
    'duration.value': { formulaVisible: true, display: 'Duration Value', type: 'number' },
    'duration.units': { formulaVisible: true, display: 'Duration Units', type: 'string' },
    description: { formulaVisible: true, display: 'Description', type: 'string' },
  };
  ```

  ActiveEffects are the only entity type with additional formula-relevant root fields (`disabled`, `duration.*`, `description`). Items and Actors extend the base with nothing extra for now but have their own files so they can diverge independently. Schema walker reads from the correct entity's root config.

- [ ] **1.R — Update schema walker**: Modify `schemaWalker.mts` to detect formula-eligible fields via `field.options.familiar` instead of `field.constructor.isFamiliarField`. Remove the `.value` unwrapping logic (fields are no longer compound — field path IS the access path). Accept the entity-type root field registry as a parameter.

- [ ] **1.S — Migrate all `new Dnd35eField(...)` calls to `useDnd35eField()`**: Convert ~22 field instances across 5 model files:
  - `Dnd35eDocumentSystemModel.mts` — `nameFormula`, `description`
  - `PhysicalItemSystemModel.mts` — `hp.current`, `hp.max`, `hardness`, `quantity`, `weight`, `size`, `price`
  - `EquippableItemSystemModel.mts` — `designedForSize`
  - `WeaponSystemModel.mts` — `weaponType`, `weaponSubtype`, `weaponBaseType`, `damage.*` (6 fields)
  - `MaterialSystemModel.mts` — `price`, `magicEquivalency`, `hardness`, `bonusHp`

  Each `new Dnd35eField(InnerFieldClass, innerOpts, wrapperOpts)` becomes:
  ```typescript
  useDnd35eField(new InnerFieldClass({ ...innerOpts, label, hint }), { familiar, defaultVisibility, ... })
  ```

  No data migration needed — all items are disposable at this stage of development.

- [ ] **1.T — Remove `Dnd35eSectionField`**: `Dnd35eSectionField` exists only to carry permission metadata on a grouping `SchemaField`. With `useDnd35eField()`, permission defaults live on each child field's options bag. The section-level defaults are no longer needed — `useDnd35eField()` on each child replaces them. Delete `src/helpers/fields/Dnd35eSectionField.mts` and update `PhysicalItemSystemModel.mts` `hp` group to use a plain `SchemaField` with `useDnd35eField()` on its children.

  > **Note**: D35E's group-targeting pattern (e.g. `"skills"` → expand to all skill field paths, `"strSkills"` → filter by ability) is a separate system from `Dnd35eSectionField`. D35E uses a `getChangeFlat()` expansion function with a `buffTargets` config registry — it iterates live actor data at apply-time, not field metadata. That pattern will be designed as its own target expansion registry when skills/saves land (Phase 6/7). `Dnd35eSectionField` is not the right tool for it.

- [ ] **1.U — Update consumers**:
  - `DocumentSheetStore.mts` — remove `isDnd35eFieldShape()` detection, `Dnd35eField.getEffective()` calls, view-aware path rewriting (no `.value` indirection)
  - `FieldOverridesStore.mts` — read permission metadata from `field.options` (already does, but remove `identifiable` option check)
  - `FormulaFormGroup.vue` — remove compound unwrapping to reach inner FormulaField
  - `Dnd35eDocument.mts` — remove compound unwrapping for formula context resolution
  - `IdentifiableDocumentStore.mts` — remove/update compound path normalization stubs

- [ ] **1.V — Remove `Dnd35eField` class**: Delete `src/helpers/fields/Dnd35eField.mts`. Remove all imports. Verify no remaining references.

#### License Review

- [ ] **1.W — Review and update project license** *(non-blocking)*: The current CC BY-NC-ND 4.0 license is too restrictive — the ND (No Derivatives) clause prevents third-party module authors from creating add-on modules that hook into this system, which is counter to the FoundryVTT ecosystem's culture of interoperable modules. Goals:
  - Allow third-party modules to extend/integrate with this system
  - Prevent wholesale forks that rebrand the system without meaningful contribution
  - Evaluate alternatives: GPL family (copyleft forces forks to stay open), LGPL (allows proprietary modules linking to it), custom clause on a permissive base, or a more permissive CC variant (CC BY-NC-SA allows derivatives if shared alike)
  - Update LICENSE, README attribution section, and NOTICE file
  - Ensure the new license is compatible with any dependencies (Vue MIT, Foundry API terms)

  > **Not a dev blocker.** Current license does not impede development. This is a community/ecosystem concern to resolve before public release. **Must be resolved before 1.X** — the license outcome may determine whether the `types/` folder needs a full rewrite or can be retained under compatible terms.

#### Foundry Type Definitions Rebuild

- [ ] **1.X — Rebuild `types/` folder from scratch** *(May workload, pending 1.W outcome)*: The current `types/foundry/` directory is branched from a different project under a potentially incompatible license. Whether a full rewrite is needed depends on the license chosen in 1.W — if the new license is compatible with the upstream types' license, a rewrite may be unnecessary. If incompatible, the entire folder must be replaced with freshly authored type declarations. Scope (if rewrite needed):
  - Delete all existing files in `types/foundry/`
  - Author new Foundry VTT v14 type declarations from scratch, covering only the API surface this system actually uses
  - Use `verbatimModuleSyntax`-compliant imports from the start
  - Ensure `@common/`, `@client/` path aliases resolve correctly
  - Prioritize types for: `Document`, `DataModel`, `DataField` hierarchy, `ApplicationV2`, `HandlebarsApplicationMixin`, `ChatMessage`, `Actor`, `Item`, `ActiveEffect`, `TokenDocument`, `Canvas`, `Game`, `Hooks`, `Collection`
  - Secondary: `Roll`, `Dialog`, `ContextMenu`, `DragDrop`, `Settings`, `Compendium`
  - Stub or `any`-type the rest until needed
  - Document the authoring approach so future Foundry version bumps have a clear update path

  > **Not a dev blocker.** The existing types work at build time. All other Phase 1 work items proceed independently and the phase will still complete on schedule.

---

### ⏳ Deferred to Future Phases

| Item | Target Phase | Rationale |
|------|-------------|-----------|
| Enhancement bonus (`enh`) | Phase 8 (Combat) | Requires attack/damage roll integration |
| Alignment property (`alignment`) | Phase 8 (Combat) | DR bypass rules need combat system |
| `contextNotes` array | Phase 8 (Combat) | Conditional bonuses need roll pipeline |
| `enhancements` sub-items | Phase 15 (Item Enhancements) | Full enhancement/special ability sub-item system |
| `light` properties | Phase 12 (Conditions & Effects) | Light emission tied to lighting system |
| `linkedItems` | Phase 15 (Item Enhancements) | Cross-item references for upgrade paths |
| Identifiable redesign → Secret AE | Phase 2 (§2.7) | Secret AE type replaces compound pattern; `isIdentified` becomes derived; `Dnd35eField` class replaced by `useDnd35eField()` in Phase 1 (1.O–1.W) |
| Attack rolls | Phase 8 (Combat) | Full attack/damage roll pipeline |
| Inventory display | Phase 5 (Inventory) | Requires actor inventory system |
| Drag-and-drop to inventory | Phase 5 (Inventory) | Requires actor inventory management |
| Drag-and-drop to equipment slots | Phase 5 (Inventory) | Requires equipment slot system |
| Drag-and-drop to action bar | Phase 8 (Combat) | Requires action bar system |
| Proficiency (real) | Phase 8 (Combat) | Requires class/feat proficiency grants |
| Double weapons | Late Beta / Post-Release | Two damage entries, two crit profiles, special TWF rules — deep combat territory |
| Base type data config (auto-fill, properties) | Future Phase (TBD) | Requires advanced compendium picker UI; `isBaseWeaponType` bool + free string is sufficient for Phase 1 |
| `WeaponBaseTypeInfo.vue` (1.F) | Future Phase (TBD) | Requires base type data config to display property tags |

---

## 1.1 Data Model

```
WeaponSystemModel extends EquippableItemSystemModel
├── isBaseWeaponType: boolean (false)                            ← NEW (1.A)
├── isMasterwork: boolean (false)
├── weaponType: 'simple' | 'martial' | 'exotic' | 'misc'
├── weaponSubtype: 'unarmed' | 'light' | 'oneHanded' | 'twoHanded' | 'ranged'  ← unchanged (1.C)
├── weaponBaseType: string (free text, UUID for alpha/beta)      ← 1.A
├── weaponDamage: SchemaField
│   ├── damageRoll: string ('1d4')
│   ├── damageType: string ('bludgeoning')           ← expand damageTypes (1.M)
│   ├── critRange: number (20)
│   ├── critMultiplier: number (2)
│   ├── rangeIncrement: number | null
│   ├── attackFormula: string ('')
│   └── damageFormula: string ('')
├── attackNotes: string ('')
├── damageNotes: string ('')
└── noAmmoRequired: boolean (false)                   ← NEW (1.B)

No derived weapon data in Phase 1 — see 1.J (removed).
Future: weaponBaseType migrates from string → { name: string, uuid: string } with compendium picker.
```

## 1.2 Document & Component Chain

```
Document Chain                          Data Model Chain
──────────────                          ────────────────
ItemDnd35e                              Dnd35eDocumentSystemModel
  └── Dnd35eDocumentMixin                 └── ItemSystemModelBase
        └── IdentifiableDocumentMixin         └── IdentifiableSchemaMixin
              └── PhysicalItem                      └── PhysicalItemSystemModel
                    └── EquippableItem                    └── EquippableItemSystemModel
                          └── Weapon                            └── WeaponSystemModel
```

## 1.3 Vue Sheet

```
WeaponSheet (AppV2 + VueDocumentSheetMixin)
├── Header
│   ├── Name + portrait/icon
│   ├── WeaponSummary.vue (weaponType, weaponSubtype selects)
│   └── EquippableHeaderStatus.vue ← NEW (1.G): carried/equipped badges
├── Tabs: Details | Effects | Description
├── Details Tab
│   ├── PhysicalItemFields.vue (weight, price, hp, hardness — EXISTS)
│   ├── EquippableFields.vue (equip slots, size — EXISTS)
│   ├── WeaponCombatFields.vue ← NEW (1.E): damage, crit, range, notes
│   └── (WeaponBaseTypeInfo.vue — DEFERRED, see 1.F)
├── Effects Tab
│   └── DocumentEffects.vue (verify item-level AEs — 1.H)
└── Description Tab
    └── ProseMirror editor (EXISTS)
```

## 1.4 Files

| Action | Path | Work Item |
|--------|------|-----------|
| Edit | `src/entities/items/weapon/data/WeaponSystemModel.mts` | 1.A (`isBaseWeaponType`), 1.B (`noAmmoRequired`) |
| Create | `src/vue/apps/item/weapon/WeaponCombatFields.vue` | 1.E |
| Create | `src/vue/components/PhysicalItemHeaderStatus.vue` | 1.G (carried badge) |
| Create | `src/vue/components/EquippableHeaderStatus.vue` | 1.G (equipped badge, overrides physical) |
| Edit | `src/entities/items/weapon/sheet/tabs/WeaponDetails.vue` | 1.E (import new component) |
| Edit | `src/entities/items/weapon/sheet/WeaponSheet.vue` | 1.G (slot placeholder), 1.L (update comment) |
| Edit | `src/entities/items/weapon/Weapon.mts` | 1.L (update comment to reference 1.G) |
| Edit | `src/constants/attacks/damageTypes.mts` | 1.M |
| Verify | `src/entities/items/weapon/sheet/WeaponStore.mts` | 1.I |
| Verify | `src/entities/items/weapon/sheet/WeaponSheet.mts` | 1.H |
