# Beta Phase 1: Equipment, Loot & Bonus Stacking

**Status**: 📖 Rough Sketch (250+ item checklist, AC calculations, equipment slots)

> **Milestone**: Beta  
> **Dependencies**: Phase 5, Phase 7  
> **Goal**: Armor, shield, and loot item types. Armor/shields affect AC via generated AE changes. **Expands bonus type stacking** (established in Phase 2) with armor/shield/natural/deflection types. Masterwork armor and shields now work (via Material AE pattern from Phase 2). Replaces POC flat AC with equipment-derived AC.

> **Action System note**: Equipment AC feeds into `#target.attributes.ac.*` contexts used by attack action formulas. Bonus type stacking rules (dodge, armor, shield, natural, deflection, etc.) affect how AE changes from different sources interact.

---

## 10.1 Item Types in This Phase

This phase introduces **5 new item types** (Armor, Shield, Equipment, Loot, Ammo) sharing two mixins (ArmorStats, WeaponStats). See Physical PropertyMap for full field tables.

| Type | Extends | Mixins | Notes |
|------|---------|--------|-------|
| **Armor** | Equippable | ArmorStats | Body armor: padded through full plate. Light/medium/heavy weight categories. |
| **Shield** | Equippable | ArmorStats + WeaponStats | Defensive + offensive (shield bash). Light/heavy/tower. |
| **Equipment** | Equippable | — | Slotted gear: rings, cloaks, boots, etc. Base item is mundane; magic via enhancements. |
| **Loot** | Physical | — | Generic non-equippable: trade goods, gems, mundane gear, slotless trinkets. Configurable subtypes. |
| **Container** | Physical | — | Bags, quivers, pouches, chests. AE propagation to contents, type restrictions, weight overrides. |
| **Ammo** | Physical | — | Arrows, bolts, bullets. Most ammo has no effect; special ammo generates combat AEs from its own Active Effects. |

### ArmorStats Mixin
Shared by Armor and Shield: `ac`, `dexModifierCap`, `armorCheckPenalty`, `arcaneSpellFailurePenalty`, `isMasterworkArmor`.

### WeaponStats Mixin
Shared by Weapon (Phase 1) and Shield (bash): `damageRoll`, `damageType`, `critRange`, `critMultiplier`, `rangeIncrement`, `attackFormula`, `damageFormula`.

### Loot Subtypes
`lootSubtype` is a free-form string from a **configurable list** (system setting). Users can add custom subtypes. Default subtypes: "Adventuring Gear", "Trade Goods", "Valuables", "Container", etc. Inventory UI sorts/filters/groups by subtype.

### Equipment vs Loot
- **Equipment** = slotted wondrous items (Cloak of Resistance, Ring of Protection). Extends Equippable.
- **Loot** = slotless items (bedroll, rope, gems, Ioun Stones if slotless). Extends Physical only.
- Both `canAcceptEffects: true` — both can be magicked via enhancements (Phase 23).
- Both `canGrantActions: true` — activated abilities from enhancements.

### Container AE Propagation
Containers emit a special AE to each item they contain. The AE links back to the container via UUID and carries the container's properties:
- **Bag of Holding**: Container AE sets weightlessness on contained items. No manual weight calc logic.
- **Quiver**: Container AE bestows bonuses to contained ammo. When ranged weapon consumes ammo, accumulated effects (own + container-granted) flow into the attack action.
- `container.typeRestriction`: Item types/subtypes allowed (quiver: ammo only).
- Container AE is non-transferring (stays on the item, doesn't transfer to actor).
- Created when item enters container (`containerId` set), removed when item leaves.

### Ammo Integration
Ammo is a Physical item with no WeaponStats. Normal arrows have no effect — ranged damage comes from the weapon's enchantment. Special ammo (cold iron, silvered, magical) has Active Effects (from materials/enhancements) that generate combat AEs applied to the attack action at roll time. Quantity decrements after each attack.

```
EquipmentSystemModel extends EquippableItemSystemModel
├── equipmentSubtype: 'wondrous' | 'clothing' | 'other'
└── (slot assignment via Equippable.equippedSlotIds)

ArmorSystemModel extends EquippableItemSystemModel
├── rollup ArmorStats
└── armorWeight: 'light' | 'medium' | 'heavy'

ShieldSystemModel extends EquippableItemSystemModel
├── rollup ArmorStats
├── rollup WeaponStats
└── isMasterwork: boolean
```

## 10.1.1 Phase 5 Shell Replacement

Phase 5 provides flat AC shell values. This phase replaces them with equipment-derived AC:

| Field | Phase 5 Shell | Phase 15 Derivation |
|-------|---------------|--------------------|
| `ac.normal` | `10 + DEX mod` | `10 + armor bonus + shield bonus + min(DEX mod, maxDexBonus) + size mod + natural armor + deflection + dodge` |
| `ac.touch` | `10 + DEX mod` | `10 + DEX mod + size mod + deflection + dodge` (no armor/shield/natural) |
| `ac.flatFooted` | `10` | `10 + armor bonus + shield bonus + size mod + natural armor + deflection` (no DEX, no dodge) |

## 10.1.2 Equipment Slot Capacities

The `slotCapacities` field is added to `CreatureSystemModel` in this phase:

```
CreatureSystemModel (added in this phase)
└── slotCapacities: Record<EquipmentSlot, number>
    ├── head: 1
    ├── headband: 1
    ├── eyes: 1
    ├── shoulders: 1
    ├── neck: 1
    ├── chest: 1
    ├── body: 1
    ├── armor: 1
    ├── belt: 1
    ├── wrists: 1
    ├── hands: 1
    ├── ring: 2
    └── feet: 1
```

Phase 5's basic slot display uses a hardcoded single-slot assumption. This phase replaces it with the `slotCapacities` field, enabling races/classes/effects to modify capacity (e.g., a feat granting an extra ring slot).
```

## 10.2 Equipment → AC via Generated AE Changes (Material Pattern)

The equipment item's `prepareDerivedData()` generates system changes targeting the actor:
- `system.attributes.ac.armorBonus` ADD with `bonusType: 'armor'`
- `system.attributes.ac.shieldBonus` ADD with `bonusType: 'shield'`
- Max Dex cap as a special change type

## 10.3 Bonus Type Stacking (Expanded)

The stacking engine and `bonusType` field on `Dnd35eEffectChangeData` are established in Phase 2 (Material AE). This phase expands the `BonusType` enum with AC-specific types:

```typescript
// Added to existing BonusType (Phase 2 base: 'material' | 'enhancement' | 'dodge' | 'untyped' | 'penalty')
type BonusType = ... | 'armor' | 'shield' | 'natural' | 'deflection';
```

The stacking resolution logic (group by field+type, highest wins except dodge/untyped) is unchanged from Phase 2. Equipment just adds new bonus type values.

## 10.4 Loot Item Type

```
LootSystemModel extends PhysicalItemSystemModel
├── lootSubtype: string (configurable from system setting list)
└── fullResalePrice: boolean (true for gems/art objects — 100% sell price)

ContainerSystemModel extends PhysicalItemSystemModel
├── capacity: number (weight capacity, 0 = unlimited)
├── typeRestriction: string[] (item types allowed, empty = any)
├── canUseItems: boolean
└── contents: Collection (derived)
```

Ammo is a separate type, not a loot subtype:
```
AmmoSystemModel extends PhysicalItemSystemModel
└── isDefaultAmmo: boolean
```

### Named Vault Containers

A **vault** is a `ContainerSystemModel` item with `capacity: 0` (unlimited) and a `isWeightless: boolean` flag that, when true, removes the container's own weight and all contents weight from the actor's encumbrance. Examples: "Town Bank", "Hideout Stash", "Merchant Account".

The vault carries its own `currency: CurrencyField` for tracking stored coin separately from the character's on-person currency. This reuses the same `CurrencyField` the actor schema uses — no new field type.

Vault items appear in a dedicated **Vaults** section in the Inventory tab (below the main item groups) showing each vault's name and currency total. Depends on the Container infrastructure implemented in this phase.

---

## 10.5 Double-Sided Weapons (Deferred)

**Challenge**: In the current system (D35E), each side of a double weapon is created as a separate weapon item. In dnd35e, a weapon can have only one set of attack actions. Supporting double weapons would require either:
1. One weapon item with multiple attack actions (requiring significant Action System extensions), or
2. Scripted attack chaining that treats both sides as a single "full attack"

This is a unique infrastructure challenge that may be pushed to post-release depending on implementation complexity. For Release 1.0, double weapons can be represented as two separate Weapon items in inventory and manually selected per turn.

---

## 10.6 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/armor/` — Armor class, data model, sheet |
| Create | `src/entities/items/shield/` — Shield class, data model, sheet |
| Create | `src/entities/items/equipment/` — Equipment class, data model, sheet |
| Create | `src/entities/items/loot/` — Loot class, data model, sheet |
| Create | `src/entities/items/container/` — Container class, data model, sheet |
| Create | `src/entities/items/ammo/` — Ammo class, data model, sheet |
| Create | `src/entities/items/mixins/ArmorStats.mts` — shared armor stats mixin |
| Expand | WeaponStats mixin — shared by Weapon (Phase 1) and Shield (bash) |
| Expand | `Dnd35eEffectChangeData` — add `bonusType` field |
| Expand | Actor `applyActiveEffects()` — bonus type stacking logic |
| Expand | Actor `prepareDerivedData()` — AC calculation from equipped armor/shield |
| Expand | Actor `prepareDerivedData()` — replace Phase 5 flat AC shell with equipment-derived AC |
| Expand | `CreatureSystemModel` — add `slotCapacities` field (`Record<EquipmentSlot, number>`) |
| Create | `src/constants/bonusTypes.mts` |
| Create | Container AE propagation logic — emit/remove AEs on containerId changes |
| Modify | `system.json` — register armor, shield, equipment, loot, container, ammo types |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 15 has not started)

### ❌ Not Started (All Tasks for Phase 15)

**Bonus Type Expansion:**
- [ ] Create `src/constants/bonusTypes.mts` file
- [ ] Define BonusType enum: 'material' | 'enhancement' | 'dodge' | 'untyped' | 'penalty' | 'armor' | 'shield' | 'natural' | 'deflection'
- [ ] Export as CONFIG.DND35E.bonusTypes with descriptions for each type
- [ ] Document stacking rules per type: armor/shield/natural/deflection each highest-only within type, dodge/untyped always stack, penalties always apply
- [ ] Test: BonusType values accessible and documented

**Equipment Data Model & Schema:**
- [ ] Create `src/entities/items/equipment/EquipmentSystemModel.mts` extending EquippableItemSystemModel
- [ ] Define schema: equipmentType (StringField with choices: 'armor', 'shield', 'wondrous', 'clothing')
- [ ] Define schema: equipmentSubtype (StringField or dropdown based on equipmentType)
- [ ] For armor: subtypes 'light', 'medium', 'heavy'
- [ ] For shield: subtypes 'buckler', 'light', 'heavy', 'tower'
- [ ] For wondrous: subtype can be free text (bracers, belt, cloak, etc.)
- [ ] Define schema: armorBonus (NumberField, 0-10, represents AC bonus from armor)
- [ ] Define schema: shieldBonus (NumberField, 0-5, represents AC bonus from shield)
- [ ] Define schema: maxDexBonus (NumberField or null, represents cap on DEX mod to AC — null if no cap)
- [ ] Define schema: armorCheckPenalty (NumberField, 0 or negative, represents ACP penalty)
- [ ] Define schema: spellFailureChance (NumberField, 0-100 or null, arcane spell failure percentage — null if no penalty)
- [ ] Define schema: speed30 (NumberField, movement when base speed is 30 ft)
- [ ] Define schema: speed20 (NumberField, movement when base speed is 20 ft)
- [ ] Define schema: enhancement (NumberField, magic enhancement bonus — defaults to 0, applied in Phase 23)
- [ ] Add secret-aware display naming fields/patterns as needed (no wrapper fields)
- [ ] Test: EquipmentSystemModel instantiation
- [ ] Test: Schema validation (armorBonus 0-10, etc.)

**Equipment Item Class:**
- [ ] Create `src/entities/items/equipment/ItemDnd35eEquipment.mts` extending ItemDnd35e
- [ ] Override `prepareDerivedData()` to generate AC bonus AE changes (Material pattern)
- [ ] Implement `buildChanges()` method:
  - For armor: generate `{ key: 'system.attributes.ac.armorBonus', mode: ADD, value: armorBonus, bonusType: 'armor' }`
  - For shield: generate `{ key: 'system.attributes.ac.shieldBonus', mode: ADD, value: shieldBonus, bonusType: 'shield' }`
  - For masterwork armor/shield: add `+1 untyped` bonus (via Material pattern, Material item adds this)
  - For enhancement bonus from Phase 23: add via enhancement bonus type
- [ ] Implement special change for max dex bonus, if applicable
- [ ] Handle speed reduction: if equipped armor/shield, reduce actor speed
- [ ] Store ACP value for skill calculation integration
- [ ] Test: Armor with +2 bonus generates AE change
- [ ] Test: Shield with +1 bonus generates AE change
- [ ] Test: Masterwork modifier adds +1 bonus

**AC Calculation - Equipment Integration (Phase 5 Shell Replacement):**
- [ ] Modify Actor `prepareDerivedData()` AC calculation
- [ ] Change from Phase 5 shell (10 + DEX) to full equipment-aware:
  - Start: base 10
  - Add: equipped armor AE change (if any)
  - Add: equipped shield AE change (if any)
  - Add: DEX mod (capped by equipped armor max DEX bonus, if applicable)
  - Add: size modifier
  - Add: dodge bonus from AE (always stacks)
  - Apply: penalty from armor/shield if applicable
- [ ] Calculate touch AC: same as normal but no armor or shield bonus
- [ ] Calculate flat-footed AC: same but no DEX bonus, no dodge bonus
- [ ] Verify stacking rules applied: armor/shield each highest-only within type
- [ ] Test: No armor → AC 10 + DEX (unarmored)
- [ ] Test: Leather armor (+2) → AC 12 + DEX
- [ ] Test: Leather + steel shield (+1) → AC 13 + DEX
- [ ] Test: Max DEX cap: Chain mail (max DEX +2), so AC = 16 + DEX max (even if DEX +5)
- [ ] Test: Touch AC: no armor/shield → AC 10 + DEX only (no max cap)
- [ ] Test: Flat-footed AC: no DEX, no dodge → armor + shield only
- [ ] Test: Multiple armor AE changes (stacking rule) → only highest armor bonus applied

**Armor Check Penalty Integration:**
- [ ] Store equipment ACP value on actor
- [ ] Modify skill calculation to apply ACP penalty
- [ ] For skills marked as armored (Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Sleight of Hand, Swim, Tumble, Use Rope):
  - Subtract ACP from skill total
  - Show "-X (ACP)" in skill display
- [ ] If multiple armor/shields equipped (edge case): use stack highest ACP value
- [ ] Test: Leather armor (ACP 0) → no penalty to skills
- [ ] Test: Chain mail (ACP -5) → armored skills reduced by 5
- [ ] Test: Heavy plate (ACP -5) + tower shield (ACP -10) → ACP -10 applied to armored skills

**Spell Failure Integration:**
- [ ] Store equipment spell failure chance on actor
- [ ] Calculate total spell failure from all equipped armor/shields
- [ ] Stack rules for spell failure: all armor/shield spell failures add together (no highest-only rule for ASF)
- [ ] Implement spell failure check: before arcane spell casting, roll d100, if ≤ spell failure % → spell fails
- [ ] Stub for Phase 16 (Spells), but infrastructure in place
- [ ] Test: No armor → 0% spell failure
- [ ] Test: Leather armor (0% ASF) → still 0%
- [ ] Test: Chain mail (30% ASF) → 30% chance spell fails
- [ ] Test: Chain mail + shield with ASF → stacking calculated

**Speed Reduction on Equipment:**
- [ ] Implement speed modification when armor equipped
- [ ] Heavy armor reduces speed: if base speed 30 ft, heavy armor reduces to 20 ft
- [ ] Light/medium armor: no speed reduction
- [ ] Test: Base 30 ft speed, no armor → 30 ft movement budget in turn
- [ ] Test: Light armor → 30 ft movement
- [ ] Test: Medium armor → 30 ft (or 40 if large creature)
- [ ] Test: Heavy armor → 20 ft movement
- [ ] Test: Base 20 ft speed + heavy armor → 15 ft (scaled proportionally)

**Equipment Item Class - Masterwork Variant:**
- [ ] When equipment has Material item with 'masterwork' type attached:
  - Fetch automatically via parent relationships OR manual field
  - Apply +1 bonus via AE (Material pattern from Phase 2)
- [ ] Test: Plate armor + masterwork material → +1 AC from material
- [ ] Test: Field/method to check if equipment is masterwork

**Actor Model — Slot Capacities:**
- [ ] Add `slotCapacities` field to `CreatureSystemModel`: `Record<EquipmentSlot, number>` with defaults from `equipmentSlots.mts`
- [ ] Default slot capacities: head=1, headband=1, eyes=1, shoulders=1, neck=1, chest=1, body=1, armor=1, belt=1, wrists=1, hands=1, ring=2, feet=1
- [ ] Slot capacity modifiable via AE (e.g., feat grants extra ring slot)
- [ ] Update Phase 5's inventory tab slot rendering to read from `slotCapacities` instead of hardcoded single-slot assumption
- [ ] Enforce slot capacity in equip logic: cannot equip more items to a slot than its capacity
- [ ] Test: Default actor has ring capacity = 2, can equip 2 rings
- [ ] Test: AE modifies ring capacity to 3 → can equip 3 rings
- [ ] Test: Cannot exceed slot capacity → warning shown

**Equipment Sheet (Vue Component):**
- [ ] Create `src/vue/components/sheets/EquipmentSheetDnd35e.vue` extending base item sheet
- [ ] Implement tabs: Details, Stats, Description
- [ ] **Details tab**: equipmentType dropdown, equipmentSubtype based on type, enhancement field (for Phase 23)
- [ ] **Stats tab**: armorBonus, shieldBonus, maxDexBonus, ACP, spell failure %, speed modifiers
- [ ] **Description tab**: Rich text editor for equipment description/lore
- [ ] Show visual indicators: armor icon, shield icon, wondrous item icon based on type
- [ ] Implement i18n for all labels
- [ ] Add form groups for numeric inputs
- [ ] Test: Equipment sheet renders all tabs
- [ ] Test: Can edit equipment properties
- [ ] Test: Changes persist on save

**Loot Data Model & Schema:**
- [ ] Create `src/entities/items/loot/LootSystemModel.mts` extending PhysicalItemSystemModel
- [ ] Define schema: lootType (StringField with choices: 'gear', 'ammo', 'tradeGoods', 'misc', 'container')
- [ ] Define schema: quantity (NumberField, min 1)
- [ ] Define schema: containerCapacity (NumberField or null, for containers like backpack)
- [ ] Add `identifiedName` and `unidentifiedName` fields
- [ ] Test: LootSystemModel instantiation
- [ ] Test: Schema validation

**Loot Item Class:**
- [ ] Create `src/entities/items/loot/ItemDnd35eLoot.mts` extending ItemDnd35e
- [ ] No special preparation logic needed (loot is passive)
- [ ] Support quantity tracking: can split stacks, combine stacks
- [ ] Support container capacity tracking (if container: prevent overflow)
- [ ] Test: Loot item creation

**Loot Sheet (Vue Component):**
- [ ] Create `src/vue/components/sheets/LootSheetDnd35e.vue` extending base item sheet
- [ ] Implement tabs: Details, Description
- [ ] **Details tab**: lootType dropdown, quantity input, containerCapacity if applicable
- [ ] **Description tab**: Rich text editor
- [ ] Show loot icon based on type
- [ ] Implement i18n
- [ ] Test: Loot sheet renders
- [ ] Test: Can edit quantity and container capacity

**Actor Sheet - Equipment Tab Integration:**
- [ ] Modify actor inventory display to show equipment prominently
- [ ] Separate tabs: Weapons (already has), Armor, Shields, Accessories (wondrous), Gear
- [ ] For Armor tab: show current AC calculation breakdown
  - "AC 16: Base 10 + Plate (+6) + Shield (+2) + DEX (+2) + Size (-1) - no penalties"
- [ ] Show currently equipped armor/shield highlighted
- [ ] Show weight total with equipment breakdown
- [ ] Update AC display live when equipment changes
- [ ] Test: Equip plate armor → AC updates in real-time
- [ ] Test: Equip shield → additional AC bonus shown
- [ ] Test: Unequip armor → AC reverts to unarmored

**Equipment Stacking & Slot Enforcement:**
- [ ] Verify Phase 5 equipment slots work: head, face, neck, shoulders, chest, abdomen, hands, waist, legs, feet, left ring, right ring
- [ ] Add weapon slots: main hand, off-hand
- [ ] Prevent more than one armor equipped simultaneously (one item in body slot)
- [ ] Prevent more than main hand + off-hand weapons (two slots max)
- [ ] Allow left ring AND right ring (two ring slots)
- [ ] Enforce when equipping: check slot is free before allowing equip
- [ ] Test: Equip leather armor → occupies body slot
- [ ] Test: Try to equip plate armor → error or prompt to replace
- [ ] Test: Two rings allowed → left ring + right ring both equipped
- [ ] Test: Two plates armor → not allowed

**AC Display & Debugging:**
- [ ] Add debug panel to actor sheet showing AC breakdown
  - Base 10 + armor bonus + shield bonus + DEX mod - ACP - max DEX cap + dodge + etc.
- [ ] Show which AE changes applied to AC calculation
- [ ] Show source of each bonus (armor name, shield name, feat, spell, etc.)
- [ ] Expandable sections for each AC type: normal, touch, flat-footed
- [ ] Test: AC breakdown visible and accurate
- [ ] Test: Identifies armor/shield/dodge sources correctly

**POC Equipment Content - Light Armor:**
- [ ] Create Leather armor: +2 AC, max DEX unlimited, ACP 0, ASF 0%, cost 10 gp, weight 15 lb
- [ ] Create Studded leather: +3 AC, max DEX unlimited, ACP 0, ASF 0%, cost 25 gp, weight 20 lb
- [ ] Create Padded armor: +1 AC, max DEX unlimited, ACP 0, ASF 0%, cost 5 gp, weight 10 lb
- [ ] Populate compendium or create via script
- [ ] Test: Add Leather to character → +2 AC applied

**POC Equipment Content - Medium Armor:**
- [ ] Create Chain shirt: +4 AC, max DEX +3, ACP -2, ASF 15%, cost 100 gp, weight 25 lb
- [ ] Create Masterwork chain shirt variant (via Material pattern)
- [ ] Create Scale mail: +4 AC, max DEX +3, ACP -4, ASF 25%, cost 50 gp, weight 30 lb
- [ ] Test: Add Chain shirt → AC +4, max DEX +3 enforced, ACP -2 on skills

**POC Equipment Content - Heavy Armor:**
- [ ] Create Plate armor: +8 AC, max DEX +1, ACP -6, ASF 35%, cost 1500 gp, weight 50 lb
- [ ] Create speed modifier: heavy plate reduces speed 30→20
- [ ] Test: Add plate armor → AC +8, max DEX capped at +1, ACP -6, speed reduced

**POC Equipment Content - Shields:**
- [ ] Create Buckler: +1 AC, ACP 0, ASF 0%, cost 15 gp, weight 5 lb
- [ ] Create Light shield: +1 AC, ACP 0, ASF 5%, cost 20 gp, weight 6 lb
- [ ] Create Heavy shield: +2 AC, ACP -2, ASF 15%, cost 20 gp, weight 15 lb
- [ ] Create Tower shield: +4 AC (or +2 if two-handing), ACP -10, ASF 50%, cost 30 gp, weight 45 lb
- [ ] Test: Add shield to character with armor → both AC bonuses applied correctly

**POC Loot Content:**
- [ ] Create Backpack (container): capacity 40 lb
- [ ] Create Rope (50 ft coil): quantity 1
- [ ] Create Torch: quantity 5
- [ ] Create Generic gold pieces: quantity 1000
- [ ] Create Bedroll, rations, waterskin templates
- [ ] Test: Add loot to inventory → displays correctly

**System Registration & Config:**
- [ ] Register equipment item type in `system.json`
- [ ] Register loot item type in `system.json`
- [ ] Add to CONFIG.Item.documentClasses: equipment → ItemDnd35eEquipment, loot → ItemDnd35eLoot
- [ ] Add to CONFIG.DND35E.itemTypes: equipment, loot with icons and display names
- [ ] Add i18n keys: dnd35e.equipmentTypes.*, dnd35e.lootTypes.*
- [ ] Export CONFIG.DND35E.bonusTypes
- [ ] Update en.json with all equipment/loot/bonus type keys
- [ ] Test: system.json loads without error
- [ ] Test: Item creation dropdown shows equipment and loot

**Localization & i18n:**
- [ ] Add i18n keys: equipment names (Plate mail, Shield, etc.)
- [ ] Add i18n keys: equipment properties (Armor Bonus, Shield Bonus, ACP, ASF)
- [ ] Add i18n keys: bonus types (Armor, Shield, Natural, Deflection)
- [ ] Add i18n keys: loot types (Gear, Ammo, Trade Goods, Misc, Container)
- [ ] Add i18n keys: equipment sheet labels
- [ ] Update en.json

**Comprehensive Testing:**
- [ ] Unit test: Equipment AC calculation (various armor/shield combinations)
- [ ] Unit test: Max DEX bonus applied correctly (chain mail cap +2)
- [ ] Unit test: ACP applied to skills (Heavy armor -5 ACP)
- [ ] Unit test: Spell failure calculation (additive for multiple armor)
- [ ] Unit test: Speed reduction (heavy armor 30→20)
- [ ] Unit test: Bonus type stacking (two armor AE changes → only highest wins)
- [ ] Integration test: Create character with leather armor
  - Check AC: 10 + leather +2 + DEX = correct total
  - Equip plate armor
  - Check AC updated: 10 + plate +8 + DEX (capped) = correct total
- [ ] Integration test: Plate armor + heavy shield
  - AC calculation: 10 + plate +8 + shield +2 + DEX (capped +1) = 21
  - No dodge or untyped would still stack
- [ ] Integration test: Masterwork armor
  - Plate armor + masterwork material
  - AC: 10 + plate +8 + masterwork +1 = 19 (with DEX/shield/penalties)
- [ ] Integration test: ACP penalty on skills
  - Heavy armor (ACP -5)
  - Climb skill: base 1 + STR mod +3 - ACP 5 = -1
- [ ] Integration test: Spell failure
  - Plate armor (35% ASF)
  - Cast spell: roll d100, if ≤ 35 → spell fails
- [ ] Integration test: Speed reduction
  - Base speed 30 ft + heavy armor → movement budget 20 ft in turn
- [ ] Integration test: Touch AC (no armor/shield)
  - Normal AC 20 (plate + shield + DEX)
  - Touch AC 15 (base 10 + DEX + no armor/shield)
- [ ] Integration test: Flat-footed AC (no DEX, no dodge)
  - Normal AC 20 (all bonuses)
  - Flat-footed AC 18 (armor + shield only, no DEX, no dodge)
- [ ] Edge case: Multiple armor AE changes from different sources (stacking rule)
  - Armor item generates +8 armor bonus
  - Spell AE generates +2 armor bonus (not typical but testable)
  - Result: +8 applied (highest armor bonus wins, not additive)
- [ ] Edge case: Mix of armor and other types: armor +8, dodge +2, untyped +1
  - All apply (different bonus types): armor +8, dodge +2, untyped +1 = +11 total
- [ ] Edge case: Shield only (no armor)
  - AC: 10 + shield +2 + DEX = correct
- [ ] Smoke test: Full character with armor, shield, masterwork variants, multiple equipment slots
  - No console errors
  - AC calculates correctly
  - Equipment can be swapped
- [ ] Smoke test: Combat with equipped character (Phase 8 action system)
  - Attacks use correct AC values
  - Damage and defense calculations correct
- [ ] Performance test: Actor with 20+ equipment items, AC calculated < 50ms

**Documentation & User Guides:**
- [ ] Document ACcalculation formula and max DEX cap interactions
- [ ] Document armor check penalty and which skills are affected
- [ ] Document spell failure and when it applies (Phase 16)
- [ ] Create journal entry: "Armor & Equipment Guide"
- [ ] Create journal entry: "AC Defense Values & Touch/Flat-Footed"
