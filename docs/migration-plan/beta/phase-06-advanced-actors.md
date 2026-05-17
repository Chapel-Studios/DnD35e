# Beta Phase 6: Advanced Actor Types

**Status**: 📖 Rough Sketch (300+ item checklist, NPC/Trap/Object types + Companion mixin)

> **Milestone**: Beta  
> **Dependencies**: Phase 5, Phase 11 (Races), Phase 12 (Classes)  
> **Goal**: NPC, Trap, and Object actor types, plus the Companion mixin. NPCs cover all non-player creatures (goblins, dragons, NPCs with class levels) with simplified stat block sheets. The Companion mixin wraps any actor (Character, NPC, or even Object) with a `bond` to a controller — a familiar is still an NPC, it just also has a bond. Objects and traps share an inheritance chain with hardness-based HP.

---

## Phase 5 Planning Decisions (from Actor PropertyMap)

> The actor PropertyMap (`docs/architecture/property-maps/PropertyMap-Actors.md`) established the following architecture:

- **NPC covers monsters**: `npc` is a single type for ALL non-player creatures (goblins, dragons, NPCs with class levels). The "monster stat block" vs "NPC character sheet" is a presentation concern (different sheet layouts), not a type distinction.
- **Inheritance tree**: `ActorSystemModelBase → CreatureSystemModel → NpcSystemModel`. NPC extends Creature with cr, creatureType/subtype, environment, treasure, advancement.
- **Companion is a mixin, not a type**: A companion is any actor that has a `bond` to a controller. The bond fields live on `ActorSystemModelBase` as an optional `bond` SchemaField (null when unbonded). A familiar wolf is still an NPC with `type: 'npc'` — it just also has `bond: { actorId, bondType: 'familiar', ... }`. An animated object is still an Object actor with a bond. This avoids type duplication and eliminates the need for type conversion workflows.
- **Bond reverse lookups**: The bonded-to actor exposes a derived `bonds` array. Bond chains are possible and need clear sheet display.
- **Summoning workflow**: Caster chooses summon spell → presented compendium list → click map location → bestiary NPC actor created with bond applied.
- **Familiar vs animal companion**: Different bondTypes with different stat derivation rules, not different actor types.
- **Object → Trap inheritance**: `TrapSystemModel` extends `ObjectSystemModel`. Both share HP/hardness; traps add init, findDC, disarmDC, cr, saves.
- **Identifiable**: NPC, Object, Trap are identifiable. Character is not. Bonded actors inherit identifiability from their base type. Requires Secret AE phase to be completed first.
- **Vehicle type** (post-release): Extends Object. Wagons, ships, siege engines. Evaluate community modules before building.
- **Intelligent Item type** (post-release): Special case with mental abilities only (INT/WIS/CHA). Abilities stay simple on Creature for now.

## 20.1 NPC Actor

- Extends CreatureSystemModel (abilities, HP, AC, saves, combat stats, equipment)
- Adds: CR, creature type/subtype, environment, treasure, advancement
- Simplified sheet variants: full, lite, monster/stat-block, loot
- Racial HD treated as pseudo-class (coordinated with Phase 11/12)

## 20.2 Trap Actor

- Extends ObjectSystemModel (HP, hardness)
- Adds: initiative, findDC, disarmDC, CR, saves (magic traps)
- Speed universal (default 0 for traps but field exists from ActorBase)

## 20.3 Object Actor

- Extends ActorSystemModelBase
- HP model differs from creatures: no temp HP, no nonlethal. Hardness subtracted from damage before HP loss.
- breakDC for Strength checks
- Speed universal (default 0 but field exists)

## 20.4 Companion Mixin (on CreatureSystemModel)

Companion is NOT a separate actor type — it is an optional bond applied to **any actor**. The bond fields live on `ActorSystemModelBase` (null by default, populated when wrapping an actor in its companion shell):

```
ActorSystemModelBase (optional companion fields)
├── bond: SchemaField | null (null when unbonded)
│   ├── actorId: StringField (UUID of bonded-to actor)
│   ├── bondType: StringField ('familiar' | 'animalCompanion' | 'mount' | 'summon' | 'cohort' | 'commanded')
│   └── sharedInitiative: BooleanField (default true — shares init with controller)
└── bonds: ActorDnd35e[] (derived — reverse lookup of all actors bonded to this one)
```

- A familiar wolf = NPC actor with `bond: { actorId: wizardUUID, bondType: 'familiar' }`
- A player's cohort = Character actor with `bond: { actorId: leaderUUID, bondType: 'cohort' }`
- Stat derivation varies by bondType (familiars derive HP/BAB/saves from controller in `prepareDerivedData()`)
- Sheet displays bond info in header when `bond !== null` — no separate companion sheet needed
- "Import as Companion" in compendium = import NPC + apply bond
- Animated Object = Object actor with `bond: { actorId: casterUUID, bondType: 'commanded' }`

## 20.5 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/actors/npc/` — NpcSystemModel, NPC document class, sheet variants |
| Create | `src/entities/actors/object/` — ObjectSystemModel, Object document class, sheet |
| Create | `src/entities/actors/trap/` — TrapSystemModel (extends Object), Trap document class, sheet |
| Create | `src/entities/actors/bond/BondManager.mts` — Bond creation/removal, reverse lookups, stat derivation per bondType |
| Expand | `CreatureSystemModel` — add optional `bond` SchemaField and derived `bonds` array |
| Expand | `actorTypes.mts` — register npc, trap, object types |
| Modify | `system.json` — register new actor types |
| Modify | `CONFIG.Actor.documentClasses` — add all three type mappings |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 22 has not started)

### ❌ Not Started (All Tasks for Phase 22)

**Per-Player Knowledge — "Advanced Secrets" (from Phase 2 §2.12):**
- [ ] Allow different players to see different Secret AE mask states (player-scoped AE visibility)
- [ ] Phase 23 NPC/Object identifiability depends on Secret AE infrastructure from Phase 2

**NPC Actor Type:**
- [ ] Create `src/entities/actors/npc/NPCSystemModel.mts` extending **CreatureSystemModel** (NOT ActorSystemModel — NPC inherits all creature fields: abilities, HP, AC, saves, combat stats, equipment)
- [ ] Inherit all character fields from CreatureSystemModel (abilities, HP, AC, saves, BAB, speed, size, etc.)
- [ ] Add field: challengeRating (NumberField, CR value from monster manual, e.g., 3, 5, 8)
- [ ] Add field: xpValue (NumberField, computed from CR, e.g., CR 5 = 1600 XP)
- [ ] Add field: creatureType (StringField with choices: 'aberration', 'animal', 'construct', 'dragon', 'elemental', 'fey', 'giant', 'humanoid', 'magical beast', 'monstrous humanoid', 'ooze', 'outsider', 'plant', 'undead', 'vermin')
- [ ] Add field: creatureSubtype (ArrayField of StringField, e.g., ['aquatic', 'fire', 'goblinoid'])
- [ ] Add field: environment (StringField, e.g., 'temperate forests', 'underground')
- [ ] Add field: treasure (StringField, e.g., 'standard', 'double standard', 'none')
- [ ] Add field: advancement (StringField or SchemaField, HD advancement range, e.g., '5-8 HD (Medium), 9-12 HD (Large)')
- [ ] Add field: monsterRole (StringField or null, stub for categorization)
- [ ] Add field: senses (SchemaField with darkvision: NumberField, lowLightVision: BooleanField, blindsight: NumberField, blindsense: NumberField, tremorsense: NumberField, scent: BooleanField)
- [ ] Scent sense: detect creatures within 30ft by smell, pinpoint within 5ft, track by Survival check (+8 racial bonus)
- [ ] NPCs can have class levels (multiclass via Phase 12), same as characters
- [ ] NPCs can have racial HD via `classType: 'racial'` (coordinated with Phase 11/12)
- [ ] Implement `getXPReward()`: compute XP value for party defeating NPC
- [ ] Implement `getXPReward()`: compute XP value for party defeating NPC
  - Formula: xpValue × party size factor
  - If CR >= party average level: full xpValue per character
  - If CR < party average: scaled down
- [ ] NPCs can have multi-class levels (from Phase 12), same as characters
- [ ] Test: NPC actor created with CR
- [ ] Test: XP value calculated from CR

**NPC Actor Sheet Variants:**
- [ ] Full sheet: all attributes visible (same as character)
- [ ] Lite sheet: condensed, just key stats (AC, HP, initiative)
  - Used for quick reference in combat
  - Show: name, AC, HP, initiative, senses, special abilities (reduced detail)
- [ ] Monster sheet: formatted like D&D 3.5e monster manual stat block
  - Header: name, size/type, CR, XP
  - Header: AC, HP, initiative
  - Body: abilities (STR-CHA scores/modifiers)
  - Body: Saves (Fort/Ref/Will)
  - Body: Skills
  - Body: Special abilities (in compact list format)
  - Body: Actions (standard/move/free actions)
  - Body: Combat tactics (if filled in)
  - Footer: Treasure, Environment notes
- [ ] Loot sheet: reduced NPC sheet for defeated enemies
  - Show: NPC name/CR
  - Show: Inventory (treasures, equipment, items)
  - Hide: character details unnecessarily
  - Focus on loot division
- [ ] Selector: toggle between sheet variants (full, lite, monster, loot)
- [ ] Implement as separate Vue components or conditional rendering
- [ ] Test: NPC sheet renders in all four variants
- [ ] Test: Monster sheet matches expected format

**Trap Actor Type:**
- [ ] Create `src/entities/actors/trap/TrapSystemModel.mts` extending **ObjectSystemModel** (NOT ActorSystemModel — traps inherit HP/hardness/breakDC from objects)
- [ ] Inherit from ObjectSystemModel: hp, hardness, breakDC, size, material, immunities
- [ ] Add field: initiative (NumberField, trap initiative modifier for combat)
- [ ] Add field: findDC (NumberField, DC for Search/Perception check to notice trap)
- [ ] Add field: disableDeviceDC (NumberField, DC for Disable Device check)
- [ ] Add field: cr (NumberField, trap challenge rating)
- [ ] Add field: saves (SchemaField with fort/ref/will — for magic traps only, null for mechanical)
- [ ] Add field: trigger (HTMLField, description of trap trigger, e.g., "Pressure plate under 20+ lb")
- [ ] Add field: triggerDistance (NumberField or null, distance at which trap triggers, e.g., 10 ft)
- [ ] Add field: resetTime (StringField or null, time for trap to reset, e.g., "1 minute", "never", "instant")
- [ ] Add field: disableDeviceDC (NumberField, DC for Disable Device check)
- [ ] Add field: perception/searchDC (NumberField, DC for Perception check to notice trap)
- [ ] Add field: attackDC (NumberField or null, attack roll DC if trap makes attack, e.g., ranged trap attack bonus)
- [ ] Add field: damageFormula (FormulaField or null, damage dealt by trap, e.g., "2d6" piercing)
- [ ] Add field: saveDC (NumberField or null, DC for save to avoid trap effect, e.g., Reflex save vs arrow trap)
- [ ] Add field: passiveEffect (HTMLField or null, passive effect of trap, e.g., "Room fills with poison gas each round")
- [ ] Add field: type (StringField with choices: "mechanical", "magical", "natural")
- [ ] Add field: active (BooleanField, true if trap is set/ready)
- [ ] Test: Trap actor created with trigger and DCs

**Trap Mechanics:**
- [ ] Trap trigger detection:
  - Passive detection: creature rolls Perception check vs trap searchDC
  - If result >= searchDC: trap noticed (spotted before triggering)
  - If result < searchDC: creature enters trigger area
- [ ] Trap activation:
  - If triggered: trap makes attack(s) or applies save DC
  - Example arrow trap: ranged attack roll 1d20 + attack bonus vs actor AC
    - Hit: damage taken
    - Miss: no damage
  - Example poison gas trap: Fortitude save vs trap saveDC
    - Success: no effect
    - Failure: poison condition applied (Phase 20)
- [ ] Trap disabling:
  - Disable Device check vs disableDeviceDC
  - Success: trap disabled (active: false, cannot trigger)
  - Failure: trigger may occur (based on trap type)
  - Failure by 5+: accidentally trigger trap
- [ ] Trap reset:
  - After trigger: trap resets after resetTime
  - "instant" = immediately available again
  - "1 minute" = 1 minute cooldown
  - "never" = one-time use, cannot reset
- [ ] Test: Trap triggered, damage applied
- [ ] Test: Disable Device check disables trap
- [ ] Test: Trap resets after time

**Trap Sheet Component:**
- [ ] Create `src/vue/components/sheets/TrapSheetDnd35e.vue`
- [ ] Display trap properties: AC, HP, hardness, searchDC, disableDeviceDC, attackDC, saveDC
- [ ] Display trigger description
- [ ] Display damage/effect
- [ ] Show trap activation button (GM only): manually trigger for testing
- [ ] Show disable button (GM only): disable trap without check
- [ ] Show reset button (GM only): reset trap manually
- [ ] Show status: "Active/Disarmed/Triggered" indicator
- [ ] Test: Trap sheet renders
- [ ] Test: Can trigger/disable trap from sheet

**Object Actor Type:**
- [ ] Create `src/entities/actors/object/ObjectSystemModel.mts` extending **ActorSystemModelBase** (NOT CreatureSystemModel — objects are not creatures)
- [ ] Object HP model differs from creatures: no temp HP, no nonlethal. Hardness subtracted from damage before HP loss.
- [ ] Add field: hp (SchemaField with value/max — no tempHP, no nonlethal sub-fields)
- [ ] Add field: hardness (NumberField, damage reduction, e.g., steel door hardness 10)
- [ ] Add field: breakDC (NumberField, DC to break object with strength check or attack)
- [ ] Add field: size (StringField, object size category for AC/damage)
- [ ] Add field: speed (NumberField, default 0 — speed is universal from ActorBase but objects default to 0)
- [ ] Add field: texture (StringField, material description, "wood", "stone", "metal", "glass", etc.)
- [ ] Add field: texture defines hardness/breakDC automatically:
  - Wood: hardness 5, break DC 15
  - Stone: hardness 8, break DC 20
  - Metal/Steel: hardness 10, break DC 25
  - Glass: hardness 1, break DC 10
  - Brick: hardness 8, break DC 20
- [ ] Add field: immunities (ArrayField of StringField, e.g., ["poison", "disease"] for inanimate objects)
- [ ] Add field: features (ArrayField of features, e.g., locked, reinforced, magical)
- [ ] Test: Object actor created with materials and hardness

**Object Mechanics:**
- [ ] Objects have AC and HP (from Phase 5 base actor attributes)
- [ ] Objects take damage from attacks:
  - Damage reduced by hardness (damage - hardness = effective damage)
  - If effective damage >= remaining HP: object destroyed/broken
- [ ] Objects can be destroyed:
  - Via damage accumulation
  - Via Strength check (vs breakDC) to break object
- [ ] Object destruction effects:
  - Destroyed object: becomes broken (unusable)
  - Loot possible: items inside
  - Story effects: door broken → access granted, chest destroyed → contents spilled
- [ ] Example object sizes and ACs:
  - Tiny object (ring): AC 20, hardness variable
  - Small object (dagger): AC 18
  - Medium object (table): AC 15
  - Large object (door): AC 12
  - Huge object (stone wall): AC 10
- [ ] Size derived from object type:
  - Door: Large, AC 12, hardness 8 (wood) or 10 (metal)
  - Chest: Medium, AC 15, hardness 5
  - Table: Medium, AC 15, hardness 5
  - Wall: Huge, AC 10, hardness 8+
- [ ] Test: Attack object
  - Damage dealt and reduced by hardness
  - HP reduced correctly
  - Object destroyed if HP <= 0

**Object Sheet Component:**
- [ ] Create `src/vue/components/sheets/ObjectSheetDnd35e.vue`
- [ ] Display object properties: AC, HP, hardness, breakDC, size, material
- [ ] Display immunities
- [ ] Show status: "Intact/Damaged/Destroyed"
- [ ] Show take damage button (GM only): apply damage to object
- [ ] Show destroy button (GM only): immediately destroy
- [ ] Show repair button (GM only): restore HP
- [ ] Test: Object sheet renders
- [ ] Test: Can damage/destroy object from sheet

**Companion Actor Type:**
- [ ] Create `src/entities/actors/companion/CompanionSystemModel.mts` extending **CreatureSystemModel**
- [ ] Inherit all creature fields (abilities, HP, AC, saves, BAB, speed, size, etc.)
- [ ] Add field: bond (SchemaField)
  - actorId (StringField, UUID of bonded-to actor \u2014 the controller/master)
  - bondType (StringField with choices: 'familiar', 'animalCompanion', 'mount', 'summon', 'cohort', 'commanded')
  - sharedInitiative (BooleanField, default true \u2014 shares initiative with controller in combat)
- [ ] Add field: specialAbilities (ArrayField of SchemaField for familiar-specific abilities: Alertness, Improved Evasion, Share Spells, etc.)
- [ ] Add derived field: controller (ActorDnd35e | null, resolved from bond.actorId)
- [ ] Implement familiar stat derivation: if bondType === 'familiar', derive HP from controller's HD, BAB from controller, saves from controller (use better of own or controller)
- [ ] Implement animal companion stat derivation: uses own HD/BAB/saves but gains bonus HD/natural armor/STR/DEX from druid level
- [ ] Test: Create companion with bond to character actor
- [ ] Test: Familiar derives HP/BAB/saves from controller
- [ ] Test: Animal companion uses own stats with level-based bonuses

**Bond System (BondManager):**
- [ ] Create `src/entities/actors/companion/BondManager.mts`
- [ ] Implement `createBond(companion, controller, bondType)`: sets bond field, adds reverse lookup to controller
- [ ] Implement `removeBond(companion)`: clears bond field, removes reverse lookup from controller
- [ ] Implement `getBondedCompanions(actor)`: returns all companions bonded to this actor (reverse lookup)
- [ ] Add derived `bonds` array to CreatureSystemModel: populated during prepareDerivedData() by scanning all actors for bond.actorId matching this actor
- [ ] Handle bond chains (companion bonded to companion): prevent circular bonds, display chain in sheet
- [ ] Test: Create bond \u2192 controller's `bonds` array includes companion
- [ ] Test: Remove bond \u2192 controller's `bonds` array updated
- [ ] Test: Circular bond prevention

**Companion Sheet:**
- [ ] Create `src/vue/components/sheets/CompanionSheetDnd35e.vue`
- [ ] Display bond info in header: controller name (linked), bond type, shared initiative toggle
- [ ] Display familiar-specific tabs if bondType === 'familiar': special abilities, share spells
- [ ] Display animal companion tabs if bondType === 'animalCompanion': tricks, bonus HD progression
- [ ] Display stat derivation source: "HP from controller (45)" vs "HP from own HD (22)"
- [ ] Test: Companion sheet renders with bond info
- [ ] Test: Familiar sheet shows controller-derived stats
- [ ] Test: Animal companion sheet shows own stats + bonuses

**NPC \u2194 Companion Transformation Workflows:**
- [ ] Implement NPC \u2192 Companion conversion: workflow to convert an NPC to a companion without recreating the actor
  - Copy existing NPC data to new CompanionSystemModel
  - Prompt for bond target (which actor is the controller)
  - Prompt for bond type
  - Change actor type from 'npc' to 'companion'
- [ ] Implement Companion \u2192 NPC conversion: reverse workflow (e.g., dismissed familiar becomes independent NPC)
- [ ] Handle special case: Object/Trap \u2192 Companion for animated objects (e.g., Animate Objects spell)
- [ ] Summoning workflow: caster chooses summon spell \u2192 presented compendium list filtered by spell level \u2192 click map location \u2192 bestiary actor created as companion at target
- [ ] "Import as Companion" option in compendium browser: imports NPC and auto-converts to companion
- [ ] Test: Convert Goblin NPC to companion \u2192 retains stats, gains bond
- [ ] Test: Summon workflow creates companion at map location
- [ ] Test: "Import as Companion" from compendium works

**POC NPC #1 - Goblin Warrior:**
- [ ] Create NPC: Goblin Warrior
  - Type: NPC, CR: 1, XP: 400
  - Abilities: STR 11, DEX 13, CON 11, INT 10, WIS 10, CHA 8
  - AC: 15 (leather armor + shield)
  - HP: 7 (1d8+1)
  - Skills: Hide +5, Move Silently +3
  - Feats: Weapon Focus (shortsword)
  - Equipment: leather armor, short sword, shield
- [ ] Test: Create Goblin Warrior NPC
- [ ] Test: NPC can be placed on scene
- [ ] Test: Monster sheet displays correctly

**POC NPC #2 - Cleric (Mid-level):**
- [ ] Create NPC: Cleric level 5
  - Class: Cleric 5
  - CR: 5, XP: 1600
  - Abilities: STR 14, DEX 12, CON 14, INT 10, WIS 16, CHA 13
  - AC: 17 (half-plate + shield)
  - HP: 33 (5d8+5)
  - Spells: all standard cleric spells
  - Feats: Power Attack, Toughness
  - Equipment: half-plate, shield, mace
- [ ] Test: Cleric NPC created
- [ ] Test: Spellcasting available

**POC Trap #1 - Arrow Trap:**
- [ ] Create Trap: Arrow Trap
  - AC: 18, HP: 30, hardness 5
  - Trigger: pressure plate (10 ft aura)
  - SearchDC: 22, DisableDeviceDC: 20
  - Attack: +8 ranged (1d8+2 piercing)
  - SaveDC: 15 Reflex for half
  - ResetTime: 1 minute
- [ ] Test: Trigger trap, arrows fire at creatures
- [ ] Test: Disable trap with Disable Device check

**POC Trap #2 - Pit Trap:**
- [ ] Create Trap: Pit Trap
  - AC: 18, HP: 40 (large)
  - Trigger: step on (5 ft square)
  - SearchDC: 20, DisableDeviceDC: 18
  - Effect: fall 20 ft, 2d6 damage
  - SaveDC: 15 Reflex to catch self (Ref check to grab ledge)
  - ResetTime: never (one-time use)
- [ ] Test: Trigger pit, character falls and takes damage

**POC Object #1 - Wooden Door:**
- [ ] Create Object: Wooden Door
  - AC: 15, HP: 15
  - Hardness: 5
  - BreakDC: 18
  - Size: Large
  - Material: wood
  - Features: locked (DC 20 Open Lock check), reinforced
- [ ] Test: Bash door (Strength check vs DC 18)
  - Failure: door damaged but not broken
  - Success: door destroyed, opens
- [ ] Test: Attack door
  - Damage reduced by hardness (5)
  - HP reduced
  - At 0 HP: destroyed

**POC Object #2 - Iron Chest:**
- [ ] Create Object: Iron Chest
  - AC: 17, HP: 20
  - Hardness: 10
  - BreakDC: 25
  - Size: Small
  - Material: metal
  - Features: locked (DC 25), reinforced
- [ ] Test: Open locked chest
  - Thieves' Tools + roll vs DC 25
  - Failure: still locked
  - Success: unlocked, can open
- [ ] Test: Bash chest (Strength check vs DC 25)
  - Very difficult, likely failure
  - Even with success, would reduce HP only

**POC Object #3 - Glass Window:**
- [ ] Create Object: Glass Window
  - AC: 13, HP: 5
  - Hardness: 1
  - BreakDC: 10
  - Size: Medium
  - Material: glass
- [ ] Test: Attack window
  - Easy to break (low HP)
  - Every damage point reduces HP (low hardness)
  - Breaks easily

**Integration with Phase 9 Combat:**
- [ ] NPCs participate in combat normally (same as characters)
- [ ] Bonded actors with `sharedInitiative: true` share initiative with controller
  - Both appear on same initiative count in combat tracker
  - Both action budgets available from controller's turn
- [ ] Traps can be placed on scene as actors
  - During combat: traps can be triggered, triggering attacks on characters
  - During exploration: traps can be disabled before triggering
- [ ] Objects can be destroyed during combat:
  - Characters may attack objects to reach enemies behind (e.g., breaking door)
  - Objects take damage and break
- [ ] Test: Combat with NPC enemy
- [ ] Test: Combat with trap on scene
- [ ] Test: Destroy object during combat

**Actor Type Registration:**
- [ ] Modify `system.json` to register three new actor types:
  - npc: NPC class
  - trap: Trap class
  - object: Object class
- [ ] Register document classes in CONFIG.Actor.documentClasses
- [ ] Update `actorTypes.mts` with all three registrations
- [ ] Add actor type icons to CONFIG
- [ ] Identifiable mixin applied to NPC, Object, Trap (NOT Character)
  - Note: Secret AE phase must be completed first
- [ ] Bond fields available on all creature types (Character + NPC) via CreatureSystemModel — no type registration needed for companion functionality

**NPC Stat Block Import (Stub for Phase 27):**
- [ ] Framework for importing D&D 3.5e NPCs from SRD
- [ ] Stub: JSON import format defined, actual SRD data in Phase 27
- [ ] Allows importing pre-made NPC stat blocks (MM1, MM2, etc.)

**Localization & i18n:**
- [ ] Add i18n keys: Actor types (NPC, Trap, Object)
- [ ] Add i18n keys: Bond-related labels (bond type, shared initiative, controller, bonded companions)
- [ ] Add i18n keys: NPC-specific labels (CR, XP, creature type, subtype, environment, treasure, advancement)
- [ ] Add i18n keys: Trap-specific labels (trigger, searchDC, disableDeviceDC, initiative, findDC)
- [ ] Add i18n keys: Object-specific labels (breakDC, hardness, material)
- [ ] Add i18n keys: Sheet variant names (Full, Lite, Monster, Loot)
- [ ] Update en.json with all keys

**Comprehensive Testing:**
- [ ] Unit test: NPC actor creation and constraints
- [ ] Unit test: Trap trigger detection
- [ ] Unit test: Trap disable check
- [ ] Unit test: Object damage calculation (hardness reduction)
- [ ] Unit test: Object destruction
- [ ] Integration test: Create NPC Goblin Warrior
  - All attributes calculated
  - Skills visible
  - Equipment shows
- [ ] Integration test: Create NPC Cleric, cast spell
  - Spellcasting available
  - Spell effects apply
- [ ] Integration test: Place arrow trap on scene
  - Trigger trap
  - Attack rolls made
  - Damage applied to nearby creatures
- [ ] Integration test: Disable trap
  - Disable Device check vs DC
  - Success: trap disabled
  - Failure: trap might trigger
- [ ] Integration test: Place wooden door on scene
  - Bash door (Strength check)
  - Success: door destroyed, can pass
  - Failure: door still standing
- [ ] Integration test: Attack glass window
  - Easy to break
  - Window destroyed after few hits
- [ ] Integration test: Combat with NPC + trap + object
  - All three actor types participate
  - Trap triggers during fight
  - Door destroys when bashed
  - NPC fights normally
  - No conflicts between actor types
- [ ] Integration test: Create NPC with bond to character (companion)
  - Bond created correctly
  - Controller shows bonded NPC in bonds array
  - Familiar NPC derives stats from controller
- [ ] Integration test: Apply bond to existing NPC
  - No type change needed — just set bond field
  - Sheet updates to show bond info in header
- [ ] Integration test: Summoning workflow
  - Select summon spell → compendium list → place on map → NPC created with bond applied
- [ ] Integration test: Bonded NPC in combat with shared initiative
  - Bonded NPC acts on controller's turn
  - Both action budgets available
- [ ] Edge case: NPC with class levels and creature adjustments
  - Multi-class NPC (e.g., fighter/wizard)
  - NPC with racial HD + class levels
  - NPC feats and abilities
- [ ] Edge case: Disabled trap cannot trigger
  - After disabling, no damage dealt if creatures enter area
- [ ] Edge case: Magical trap vs mundane
  - Magical immunity rules (if Phase 20/23)
- [ ] Smoke test: Full dungeon encounter
  - Trapped corridors
  - Locked doors
  - NPC enemies
  - Objects to break
  - All work together smoothly
- [ ] Performance test: 50 trap/object actors on scene, no lag
- [ ] UI test: Switch between sheet variants
  - All four variants load quickly
  - All data displays correctly

**Documentation & User Guides:**
- [ ] Document NPC creation: CR, creature type, classes, equipment
- [ ] Document companion/bond system: bond types, stat derivation per type, applying/removing bonds
- [ ] Document summoning workflow
- [ ] Document trap mechanics: trigger, disable, reset
- [ ] Document object creation: material, hardness, breakDC
- [ ] Document sheet variants and when to use each
- [ ] Create journal entry: "NPCs & Monsters"
- [ ] Create journal entry: "Companions, Familiars & Animal Companions"
- [ ] Create journal entry: "Traps"
- [ ] Create journal entry: "Objects & Hazards"
- [ ] Note post-release types: Vehicle (extends Object), Intelligent Item (special mental-abilities-only creature)
- [ ] Note limitations: Trap templates deferred to Phase 27, object templates later if needed

## 20.6 Portrait Bar (Party HUD)

Persistent UI bar displaying party member portraits with at-a-glance HP bars, active conditions, and quick-action buttons. Equivalent to D35E's TopPortraitBar.

- Position: top bar (like D35E) or configurable
- Shows HP, active conditions, and quick actions (rest, skill checks, saves)
- GM view may include selected NPC/companion tokens
- Depends on actor, class, and condition infrastructure being in place
