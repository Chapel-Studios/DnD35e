# 📘 Active Effects PropertyMap (Work in Progress)

Active Effects are Foundry's native mechanism for modifying actor and item data. In dnd35e, they are the backbone of the stacking engine (Phase 2) and handle everything from racial ability modifiers to buff stat changes to equipment auras.

> **Status**: This is a notes/planning document. No AE schema fields have been finalized. Everything below is open for discussion.

---

## What Active Effects Replace

In D35E, stat modifications are handled by a `changes` template on items — an array of `{ formula, operator, target, modifier, priority }` entries that get aggregated during `prepareDerivedData()`. The dnd35e system replaces this with Foundry Active Effects, enhanced with the Phase 2 stacking engine.

| D35E Mechanism | dnd35e Replacement |
|----------------|-------------------|
| `changes` template on items | Active Effects on items (transfer to actor when owned) |
| `contextNotes` template | Context notes on Active Effects or separate system |
| `enhancements.items` array | Enhancement/Material AE system (Phase 23). D35E stores as raw JSON array of item snapshots in `system.enhancements.items[]` — our system TBD |
| `material.data` on physical items | Material as Active Effect on the item |
| Aura item copies on affected actors | Region-based AEs or aura-as-AE (TBD) |
| `bonusAmmo*` fields on loot | Ammo as Physical item type + AE generator for special ammo |

---

## Key Architecture Decisions (from Phase 2)

- **Stacking engine**: AEs carry `bonusType` (enhancement, deflection, morale, etc.) and the engine resolves stacking rules automatically — same types don't stack (highest wins) unless they're dodge or circumstance
- **Enriched overrides**: Each AE override includes `{ bonusType, stackResult, stackReason }` for transparency
- **Transfer behavior**: AEs on owned items transfer to the actor. AEs on unowned items stay local
- **Suppression**: Equipped/unequipped state suppresses transferred AEs (gear you're not wearing doesn't apply)

---

## AE Sources to Model

These are the things that CREATE Active Effects in the system. Each needs consideration for how it generates and manages its AEs.

### 1. Racial Modifiers
- Race item grants AEs for ability score modifiers (+2 DEX, -2 CON), skill bonuses, darkvision, etc.
- Applied when race item is added to actor
- Permanent, non-removable while race is owned

### 2. Class Features
- ClassFeature items may grant AEs (e.g. "Uncanny Dodge" might set a flag, "Favored Enemy" adds bonuses)
- Some are passive (always on), some are activatable (uses per day)

### 3. Feat Effects
- Feats may grant passive AEs (e.g. Toughness → +3 HP, Weapon Focus → +1 attack with specific weapon)
- Conditional feats may only apply in certain contexts (Power Attack — variable)

### 4. Equipment (when equipped)
- Magical equipment applies AEs when equipped (Ring of Protection +2 → +2 deflection AC)
- Suppress when unequipped
- Enhancement/material system will also generate AEs

### 5. Buffs (AE type, not item type)
- **Buff is a custom Active Effect type** — NOT an item type in dnd35e
- Implementation is **split across two phases**:
  - **alpha.9 (Buff AE Core)** — minimum schema for Paladin alpha spells: `system.active`, `system.duration.{rounds, elapsed, deleteOnExpiry}`, `description`, plus inherited `changes[]` with `bonusType`. Combat-tracker turn-start tick, activation/deactivation, non-transferring placement on the target actor.
  - **beta.3 (Buff AE Expansion & Conditions Full)** — full schema extensions (see below) and the D35E `buff` item → Buff AE data migration.
- Buff AEs extend the standard AE schema. The **alpha core fields** are listed above; **beta expansion adds**:
  - `buffType`: "temp"\|"perm"\|"item"\|"shapechange"\|"misc"
  - `timeline.formula` — formula-driven durations (replaces / augments the alpha `duration.rounds`)
  - `damagePool`: max/current absorb (e.g. Stoneskin 150 HP pool)
  - `shapechange`: polymorph/wildshape data
  - `hideFromToken`: suppress icon display
- Buff AEs are activated/deactivated (toggle on/off) — alpha.9.
- Timeline ticks down via combat tracker integration — alpha.9 (round-based); beta.3 expands to formula-driven.
- When a spell creates a buff on a target, it creates a Buff AE directly on the target actor.
- Buff AEs appear in a dedicated "Buffs" section on the character sheet — beta.3. In alpha.9 they render in the generic effects list.

### 6. Spells
- Cast spells may create buff items on targets, which in turn create AEs
- Or spells may directly create AEs with duration tracking
- Need to decide: spell → buff → AE, or spell → AE directly?

### 7. Ammo (own Physical item type — combat AE source)
- Ammo is its own item type extending Physical (no WeaponStats mixin)
- Most ammo has no effect on the attack action — ranged damage comes from the weapon
- Special ammo (magical, material-enhanced, alchemical) has its own Active Effects (from materials, enhancements, quiver propagation) that generate **combat AEs** applied to the weapon's attack action at roll time
- Quantity decrements after each attack
- Can accept effects (material AEs — cold iron arrows, silvered bolts; container AEs from quivers)
- `isDefaultAmmo` flag for auto-selection
- Full integration deferred to ranged weapons work

### 8. Materials (was item type, now AE)
- Material properties (adamantine, mithral, cold iron) apply to the parent item
- Modify: price, hardness, HP, weight, DR bypass flags, name
- In D35E these carry a `changes` template — translates directly to AEs
- **Key fields to preserve as AE data**:
  - `priceDifference`: price modifier
  - `magicEquivalent`: enhancement pricing equivalent
  - `hardness`, `hpPerInch`: material physical properties
  - `isAdamantineEquivalent`, `isAlchemicalSilverEquivalent`, `isColdIronEquivalent`: DR bypass
  - `identifiers`: multi-name lookup aliases

### 9. Aura Effects
- Aura bearer has AE source
- Targets in range receive AEs (via region system or manual application)
- AEs removed when target leaves range
- Per-round effects possible

### 10. Conditions
- Conditions (fatigued, sickened, prone, etc.) apply stat penalties via AEs
- Tracked as AE with condition flag
- Toggle on/off via condition panel

### 11. Environmental Effects
- Difficult terrain, temperature, altitude, etc.
- Applied via Foundry Region system
- Region behaviors create/remove AEs on tokens entering/leaving

### 12. Container AE Propagation (Bond Pattern)
- Containers (bags, quivers, etc.) create a **Bond AE** (`type: 'bond'`, `bondType: 'container'`) on each item placed inside
- The bond AE's Foundry-native `origin` field references the container — no custom `containerUuid` field
- **Bag of Holding**: Bond AE carries weight reduction changes on contained items
- **Quiver**: Bond AE bestows bonuses to contained ammo (enhancement bonuses). When ammo is consumed for a ranged attack, the ammo's accumulated effects (own + container-granted) flow into the attack action as `action.attack` phase changes
- **Lifecycle**: Hook-driven. Container creates bond AE when item enters; removes when item leaves
- **Reverse lookup**: Query items for bond AEs where `origin` matches the container's UUID
- Bond AE is non-transferring (stays on the item, doesn't transfer to actor)

---

## Resolved Questions

### AE Schema Extensions — RESOLVED
See [AE Architecture PropertyMap](../activeEffects/PropertyMap.md) for full `Dnd35eEffectChangeData` schema. Key fields: `target`, `isSystem`, `phase`, `bonusType`, `condition` (formula familiar → boolean, action phases only).

### Material as AE — RESOLVED
**Decision**: Material as AE on the item. Implemented in Phase 2. See Material in AE Architecture PropertyMap.

### Ammo Lifecycle — RESOLVED
Ammo combat effects are regular AE changes with `phase: 'action.attack'`. At attack time, the action system collects these changes from the ammo's AEs and runs them through the stacking engine. No "transient combat AE" concept — just action-phase changes on regular AEs.

### Buff vs Direct AE — RESOLVED
**Decision**: Buff IS the AE (BuffSystemModel). No item→AE indirection.

### Context Notes — RESOLVED
**Decision**: Context notes are **text only** — not AE changes. Descriptive strings on items/feats displayed in relevant contexts (roll cards, tooltips). Separate from the AE/change system.

### Condition System — RESOLVED
**Decision**: Conditions are a curated set of AEs with their own TypeDataModel (`ConditionSystemModel`) and special UI treatment. They are AEs with a `conditionId` field.

### Container Bond Reference — RESOLVED
**Decision**: Bond AEs use Foundry's native `origin` field for the relationship reference. No custom `bondedTo`/`containerUuid` field needed. `origin` is maintained by Foundry across document moves.

---

## Items Removed as Item Types (now AE-based)

| Former Item Type | New Location | Notes |
|-----------------|-------------|-------|
| `material` | Active Effect on physical item | DR bypass, price, hardness, name modification |
| `enhancement` | Material/Enhancement system (TBD) | May be AE, may be embedded — needs Advanced Materials phase |
| `damage-type` | Config constants + setting overrides | Hardcoded defaults with homebrew extensibility via system settings |
| `alignment` (item) | Split: actor tuple field + enhancement AE (conditional damage + DR bypass changes) + DR bypass keywords | Resolved — see Metaphysical PropertyMap |
| `attack` | Action system (Phase 8) | Actions on weapons/actors, not items |
| `full-attack` | Action system (Phase 8) | Dynamic from equipped weapons + BAB |

---

## Cross-References

- **Phase 2** (Stacking Engine): bonusType, stacking rules, enriched overrides
- **Phase 8** (Action System): replaces attack/full-attack items
- **Phase 11** (Races): racial modifier AEs
- **Phase 13** (Conditions POC): condition AEs
- **Phase 15** (Equipment): equipment AE transfer on equip/unequip
- **Phase 16** (Spells): spell → buff → AE pipeline
- **Phase 18** (Auras): region-based AE application
- **Phase 20** (Buffs/Conditions): Buff is now an AE type with timeline, damage pools, shapechange. Full condition lifecycle.
- **Phase 23** (Enhancements): enhancement + material AE system. D35E reference: `system.enhancements.items[]` JSON array pattern.

---

## DR / Energy Resistance Extensibility

The DR and energy resistance system needs to be robust, simple, user-friendly, RAW-compliant, and extensible for homebrew. This is a complex design challenge.

### Current State (D35E)
- **Physical DR types** are hardcoded: `any`, `good`, `evil`, `chaotic`, `lawful`, `slashing`, `bludgeoning`, `piercing`, `epic`, `magic`, `silver`, `adamantine`, `coldiron`, `incorporeal`
- **Energy resistance types** are dynamic from `CACHE.DamageTypes` filtered to `damageType === "energy"`
- Materials carry boolean bypass flags: `isAdamantineEquivalent`, `isAlchemicalSilverEquivalent`, `isColdIronEquivalent`
- DR evaluation supports `value`, `or` (OR-evaluation of bypass types), `lethal`, `immunity`

### Design Goals
| Goal | Challenge |
|------|-----------|
| **Robust** | Handle all RAW DR: DR 10/magic and silver, DR 15/epic, DR 10/—, DR —/cold iron |
| **Simple** | Don't require users to understand boolean logic for DR bypass |
| **User-friendly** | Clear UI for setting DR on creatures and bypass on weapons |
| **RAW** | Match 3.5e SRD DR rules precisely |
| **Extensible** | Homebrew DR types ("living wood", "crystalline") via system settings |

### Status: Implementation Details Only
Core data structures are already in place — material DR bypass types are AE changes, alignment bypass keywords are resolved, and config extensibility is confirmed. Remaining work is implementation detail within existing phases: damage pipeline resolution (Phase 8), equipment DR fields (Phase 15), and enhancement threshold rules (Phase 23). No advance design session needed.

### Related Cross-References
- **Phase 23** (Enhancements): enhancement bonus thresholds for DR bypass
- **Physical PropertyMap**: Ammo combat AEs for damage type/bonus modification
- **Config**: Damage types as config constants with setting overrides
- **Alignment brainstorm**: Resolved. Weapon alignment = enhancement AE with conditional damage + DR bypass changes. Actor alignment = tuple field. See Metaphysical PropertyMap.
