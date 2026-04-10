# Phase 22: Advanced Actor Types

**Status**: � Rough Sketch (300+ item checklist, NPC/Trap/Object types)

> **Milestone**: Beta  
> **Dependencies**: Phase 5  
> **Goal**: NPC, Trap, and Object actor types. NPCs use simplified stat blocks with challenge rating. Traps and objects have limited action sets via the Action System.

---

## 20.1 NPC Actor

- Same base data as character + CR, XP value, treasure type
- Simplified sheet variants: full, lite, monster, loot

## 20.2 Trap Actor

- AC, HP, hardness, trigger, attack/save DCs, reset, Disable Device DC

## 20.3 Object Actor

- AC, HP, hardness, break DC, size, minimal sheet

## 20.4 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/actors/npc/` |
| Create | `src/entities/actors/trap/` |
| Create | `src/entities/actors/object/` |
| Modify | `system.json` — register new actor types |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 22 has not started)

### ❌ Not Started (All Tasks for Phase 22)

**NPC Actor Type:**
- [ ] Create `src/entities/actors/npc/NPCSystemModel.mts` extending ActorSystemModel
- [ ] Inherit all character attributes (abilities, AC, skills, etc. from Phase 5/12)
- [ ] Add field: challengeRating (NumberField, CR value from monster manual, e.g., 3, 5, 8)
- [ ] Add field: xpValue (NumberField, computed from CR, e.g., CR 5 = 1600 XP)
- [ ] Add field: monsterRole (StringField or null, "Brute", "Lurker", "Minion", "Skirmisher", "Striker", "Controller", "Leader" for D&D 4e-inspired categorization, stub for Phase 22)
- [ ] Add field: treasureType (StringField or null, references treasure table letter, e.g., "G", "H", "I" for automated treasure generation via Phase 27)
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
- [ ] Create `src/entities/actors/trap/TrapSystemModel.mts` extending ActorSystemModel
- [ ] Add field: ac (NumberField, trap AC for attack/disarm)
- [ ] Add field: hp (NumberField, trap HP before destroying it)
- [ ] Add field: hardness (NumberField, damage reduction for trap, e.g., stone trap has hardness 8)
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
- [ ] Create `src/entities/actors/object/ObjectSystemModel.mts` extending ActorSystemModel
- [ ] Add field: ac (NumberField, object AC for attacks)
- [ ] Add field: hp (NumberField, object hit points before destroyed)
- [ ] Add field: hardness (NumberField, damage reduction, e.g., steel door hardness 10)
- [ ] Add field: breakDC (NumberField, DC to break object with strength check or attack)
- [ ] Add field: size (StringField, object size category for AC/damage)
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
- [ ] Add actor type icons to CONFIG

**NPC Stat Block Import (Stub for Phase 27):**
- [ ] Framework for importing D&D 3.5e NPCs from SRD
- [ ] Stub: JSON import format defined, actual SRD data in Phase 27
- [ ] Allows importing pre-made NPC stat blocks (MM1, MM2, etc.)

**Localization & i18n:**
- [ ] Add i18n keys: Actor types (NPC, Trap, Object)
- [ ] Add i18n keys: NPC-specific labels (CR, XP, treasure type)
- [ ] Add i18n keys: Trap-specific labels (trigger, searchDC, disableDeviceDC)
- [ ] Add i18n keys: Object-specific labels (breakDC, hardness, texture)
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
- [ ] Edge case: NPC with class levels and creature adjustments
  - Multi-class NPC (e.g., fighter/wizard)
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
- [ ] Document NPC creation: CR, classes, equipment
- [ ] Document trap mechanics: trigger, disable, reset
- [ ] Document object creation: material, hardness, breakDC
- [ ] Document sheet variants and when to use each
- [ ] Create journal entry: "NPCs"
- [ ] Create journal entry: "Traps"
- [ ] Create journal entry: "Objects & Hazards"
- [ ] Note limitations: Trap templates deferred to Phase 27, object templates later if needed
