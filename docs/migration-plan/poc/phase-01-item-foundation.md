# Phase 1: Item Foundation (Weapon PoC)

**Status**: **COMPLETE** (April 16, 2026)

> **Milestone**: POC  
> **Dependencies**: None  
> **Goal**: A single weapon item type that can be created, opened, edited, and saved. Establishes the data model, Vue sheet, and component composition patterns.

---

## Summary

**Items Completed (9)**: 1.A, 1.B, 1.C, 1.G, 1.H, 1.I, 1.L, 1.M, 1.N  
**Items Deferred (8)**: 1.E (→ Phase 10), 1.F (→ Future), 1.K (→ Phase 4), 1.O–1.W (→ Phase 2.§2.7 Secret AE Redesign)  
**Items Already Complete (pre-session)**: Data model chain, document chain, infrastructure, identifiable system

**Key Achievements**:
- Weapon item type fully functional (create, edit, save, delete)
- Schema updated with `isBaseWeaponType`, `noAmmoRequired` for Phase 8+ compatibility
- Damage types expanded with energy types, proper localization structure
- Header status badges for physical/equippable items
- Removed technical debt (`derivedName` field)

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
- [x] Vue sheet components: `IdentifiableDocumentSheet`, `IsIdentifiedToggle`

### 🔶 Remaining Work Items

> **Execution Note**: Items are grouped into execution cycles for build feasibility. Order: 1.A+B+C → 1.M → 1.G → 1.H+I → 1.L → 1.N → 1.O–W. This note will be updated as cycles are completed.

#### Data Model Gaps

- [x] **1.A — `isBaseWeaponType` + Dynamic Base Type Registry**: ✅ Complete. Added `isBaseWeaponType` boolean field to `WeaponSystemModel`.
- [x] **1.B — `noAmmoRequired` Flag**: ✅ Complete. Added `noAmmoRequired` boolean field to `WeaponSystemModel`.
- [x] **1.C — Weapon Subtypes Match SRD Table**: ✅ Verified. Subtypes already correct (`unarmed | light | oneHanded | twoHanded | ranged`).
- [ ] ~~**1.D — `splash` Weapon Type**~~: **REMOVED.** Splash items (alchemist's fire, holy water, acid, tanglefoot bags) are not weapons in the SRD — they appear under "Special Substances and Items" and use the Throw Splash Weapon special attack rules. They will be modeled as consumable items with their own action (separate item type, future phase). D35E used `misc → splash` as a workaround; we don't replicate that.

#### Vue Sheet Gaps

- [x] ~~**1.E — `WeaponCombatFields.vue` Component**~~: **DEFERRED to Phase 10 (Action System).** Combat-oriented fields (damage, crit, formulas, attack/damage notes) belong in the action system, not the item sheet. Will be implemented when actions land.
- [x] ~~**1.F — `WeaponBaseTypeInfo.vue` Component**~~: **DEFERRED.** Requires the base type data config (special properties, stat blocks) which is a future phase feature. When the base type config exists, this component will show read-only property tags (e.g., "Reach, Trip, Disarm +2"). For Phase 1, the base type is just a string field rendered in 1.E.
- [x] **1.G — Header Status Components**: ✅ Complete. Created `PhysicalItemHeaderStatus.vue` (carried badge) and `EquippableHeaderStatus.vue` (equipped/carried badge). Components placed in their respective component layer folders.
- [x] **1.H — Effects Tab Audit**: ✅ Verified. Item-level AEs work correctly, Effects tab displays/creates/edits/deletes AEs.
- [x] **1.I — `WeaponStore` Completeness**: ✅ Verified. All schema fields reactive, nested `weaponDamage` sub-fields properly reactive via dot-path mutations.

#### `prepareDerivedData()` Logic

- [ ] ~~**1.J — Derived Weapon Data**~~: **REMOVED.** No weapon-specific derived data needed in Phase 1.
    - **`effectiveSize`**: Not needed — `size` is the physical object size, `designedForSize` is the creature size for chart lookups. AEs modify these directly; no wrapper field required.
    - **`effectiveDamageRoll`**: Ephemeral — calculated by the combat system at roll time using `designedForSize` against the size-damage chart. Not a stored derived property. → Phase 8.
    - **`isProficient`**: Determined by the combat engine at runtime based on class/feat proficiency grants. Display value deferred until proficiency feats exist. → Phase 8.
    - **`isDouble`**: Double weapons require two damage entries, two crit profiles, and special TWF rules. → Deferred to late Beta or post-release bonus content.
    - **`threatRange`**: Redundant — `critRange` IS the threat range. The SRD uses "critical threat range" and "threat range" interchangeably. A weapon with `critRange: 19` threatens on 19–20. Nothing to derive.

#### Test Designs (for Phase 4 Framework)

- [ ] ~~**1.K — Test Case Designs**~~: **DEFERRED to Phase 4 (Testing Framework).** Test case designs will be specified once the testing framework is in place and we understand the test structure.

#### Cleanup

- [x] **1.L — Clean Up Commented-Out Code**: ✅ Complete. Updated comments in `Weapon.mts` to reference 1.G implementation.
- [x] **1.M — Damage Type Constants**: ✅ Complete. Expanded `damageTypes.mts` with energy types (Fire, Cold, Electricity, Acid, Sonic, Force, Positive, Negative). Updated localization to use `dnd35e.DAMAGE_TYPES.*` prefix structure.
- [x] **1.N — Remove `derivedName` (redundant with `nameFormula.resolvedValue`)**: ✅ Complete. Removed field from schema, types, prepareDerivedData, formula registrations, and localization. Updated fallbacks to use `parent.name` / `document.name`.

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

> **DEFERRED to Phase 2** (§2.7 Secret AE Redesign): Items 1.O–1.W form a massive refactor replacing the `Dnd35eField` compound wrapper with `useDnd35eField()` helper. This work is deferred because:
> - Phase 2 introduces the **Secret AE** system, which replaces the identifiable dual-value pattern
> - `Dnd35eField`'s `{ value, unidentifiedValue }` compound shape will be superseded by the MASK change mode
> - The `useDnd35eField()` migration should happen as part of that refactor, not independently
> 
> Current `Dnd35eField` pattern remains functional. When Phase 2 lands, these 15 sub-tasks will execute as a coordinated refactor across the entire codebase.

- [ ] ~~**1.O — Extend Foundry field typings with `Dnd35eFieldOptions`**~~: **DEFERRED to Phase 2.§2.7**
- [ ] ~~**1.P — Create `useDnd35eField()` helper**~~: **DEFERRED to Phase 2.§2.7**
- [ ] ~~**1.Q — Root-level field familiar registries**~~: **DEFERRED to Phase 2.§2.7**
- [ ] ~~**1.R — Update schema walker**~~: **DEFERRED to Phase 2.§2.7**
- [ ] ~~**1.S — Migrate all `new Dnd35eField(...)` calls**~~: **DEFERRED to Phase 2.§2.7**
- [ ] ~~**1.T — Remove `Dnd35eSectionField`**~~: **DEFERRED to Phase 2.§2.7**
- [ ] ~~**1.U — Update consumers**~~: **DEFERRED to Phase 2.§2.7**
- [ ] ~~**1.V — Remove `Dnd35eField` class**~~: **DEFERRED to Phase 2.§2.7**

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
