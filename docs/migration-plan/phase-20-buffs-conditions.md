# Phase 20: Buffs & Conditions (Full)

**Status**: � Rough Sketch (500+ item checklist, 27 bonus types, all conditions)

> **Milestone**: Beta  
> **Dependencies**: Phase 13 (Conditions POC), Phase 15 (Equipment)  
> **Goal**: A `buff` Active Effect type for temporary bonuses, and full implementation of all D&D 3.5e conditions. Builds on the minimal condition infrastructure from Phase 13 (Prone) to add all 25+ conditions, ability damage/drain, fear track, and duration-based expiry.

---

## 16.1 Buff Active Effect Type

**Buff is an Active Effect, not an Item.**

```
BuffSystemModel extends Dnd35eActiveEffectSystemModel
├── buffType: 'temporary' | 'permanent' | 'item' | 'shapechange' | 'misc'
├── bonusType: BonusType (for stacking — leverages Phase 11 infrastructure)
├── active: boolean
└── changes: Dnd35eEffectChangeData[] (targeting actor or item)
```

Duration uses Foundry's built-in `ActiveEffect.duration` (rounds, seconds, turns).

## 16.2 Conditions

Pre-defined conditions (25) as built-in Active Effects with predefined changes:
- Blind: -2 AC, lose DEX to AC, 50% miss chance
- Fatigued: -2 STR, -2 DEX
- Entangled, grappled, helpless, paralyzed, etc.

## 16.3 Actor Ability Score Expansion

Now add the full ability score model:
- `abilities.str.damage` / `drain` / `penalty`
- Applied via Active Effects from conditions/buffs

## 16.4 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/activeEffects/buff/` — class, data model, sheet |
| Create | `src/constants/conditions.mts` — all 25 conditions with AE change definitions |
| Expand | Actor ability score model — damage, drain, penalty |
| Expand | Bonus type enum — add all 27 D&D 3.5 bonus types |
| Modify | `system.json` — register buff effect type |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 20 has not started)

### ❌ Not Started (All Tasks for Phase 20)

**Full Bonus Type System (Expansion of Phase 2):**
- [ ] Extend BonusType enum in Phase 2 to include all 27 D&D 3.5e types:
  - Enhancement (from Phase 2)
  - Inherent (from Phase 2)
  - Morale (from Phase 2)
  - Size (from Phase 2)
  - Material (from Phase 2)
  - Armor (from Phase 15)
  - Shield (from Phase 15)
  - Natural (from Phase 15)
  - Deflection (from Phase 15)
  - Dodge (new)
  - Profane (new)
  - Sacred (new)
  - Trait (new)
  - Circumstance (new)
  - Competence (new)
  - Insight (new)
  - Luck (new)
  - Untyped (catch-all, always stacks)
  - Alchemical (new, for potions/consumables)
  - Untyped_Stackable (new, explicitly stackable untyped)
  - Penalty (new, debuff category)
  - Racial (new)
  - Half (new, special Dnd35e rule for pre-stacking)
  - Teamwork (new, from teamwork feats)
  - Haste (new, special from Haste spell)
  - Slow (new, special from Slow spell)
- [ ] Update stacking rules: each bonus type has specific rule (highest only vs always stack)
- [ ] Test: Bonus type enumeration includes all 27 types

**Buff Active Effect System Model:**
- [ ] Create `src/entities/activeEffects/buff/BuffSystemModel.mts` extending ActiveEffectSystemModel
- [ ] Define schema: buffType (StringField with choices: 'temporary', 'permanent', 'item', 'shapechange', 'misc')
- [ ] Define schema: bonusType (StringField, references full bonus type enum from Phase 2)
- [ ] Define schema: active (BooleanField, true if buff currently active)
- [ ] Define schema: icon (StringField or null, buff icon path)
- [ ] Define schema: description (HTMLField, buff description and effects)
- [ ] Inherit from ActiveEffectSystemModel: duration, changes[], origin
- [ ] Test: BuffSystemModel instantiation with various buff types
- [ ] Test: Schema validation (buffType in enum, bonusType valid, etc.)

**Buff Active Effect Class:**
- [ ] Create `src/entities/activeEffects/buff/ActiveEffectDnd35eBuff.mts` extending ActiveEffectDnd35e
- [ ] Implement `getIcon()`: return buff icon or default
- [ ] Implement `isApplied()`: check if buff is active
- [ ] Implement `getBonusDescription()`: human-readable buff description
- [ ] Test: Buff instantiation and property access

**Buff Sheet Component (Vue):**
- [ ] Create `src/vue/components/sheets/BuffSheetDnd35e.vue` extending item sheet component
- [ ] Display buff name, type, bonus type, duration
- [ ] Display effects/changes in table format
- [ ] Allow editing buff properties (for GMs)
- [ ] Implement color coding: color reflects bonus type (green for enhancement, red for penalty, etc.)
- [ ] Test: Buff sheet renders and allows editing

**Ability Score Expansion:**
- [ ] Extend ActorSystemModel from Phase 5
- [ ] For each ability (STR, DEX, CON, INT, WIS, CHA): expand from single score to full model
- [ ] Add to each ability:
  - `base` (NumberField, actual ability score value, e.g., 16)
  - `damage` (NumberField, ability damage from Strength damage spell, stacking, cumulative)
  - `drain` (NumberField, ability drain from temporary/permanent effects, stacking, cumulative)
  - `penalty` (NumberField, temporary penalties not from damage/drain, stacking)
  - `total` (computed, base - damage - drain - penalty)
  - `modifier` (computed, Math.floor((total - 10) / 2))
- [ ] Example: Wizard with STR 14, takes 4 STR damage
  - base: 14
  - damage: 4
  - drain: 0
  - penalty: 0
  - total: 10 (14 - 4)
  - modifier: 0 (Math.floor((10 - 10) / 2))
- [ ] Update all formulas referencing ability mods to use new model (e.g., #self.abilities.str.modifier)
- [ ] Test: Create actor with ability damage
- [ ] Test: Ability modifier updated correctly

**Ability Damage vs Drain:**
- [ ] Ability damage: temporary reduction (recovers with rest or magic)
  - Duration: 24 hours (recovers 1 point per day of bed rest)
  - Item: created as temporary buff/condition
- [ ] Ability drain: permanent/longer-term reduction
  - Cannot be recovered without restoration magic
  - Item: created as permanent buff or as Drain condition
- [ ] Ability penalty: temporary modifier not from damage/drain
  - Duration: varies (typically enhancement penalty from off-hand weapon, etc.)
  - Item: temporary buff
- [ ] Test: Apply STR damage, recovery checks
- [ ] Test: Apply STR drain, no automatic recovery
- [ ] Test: Apply STR penalty, expires after duration

**Condition Constants & Configuration:**
- [ ] Create `src/constants/conditions.mts` central condition definition file
- [ ] Define all 25+ D&D 3.5e conditions:
  1. Asleep
  2. Blinded
  3. Broken
  4. Cowering
  5. Dazed
  6. Dazzled
  7. Dead
  8. Deafened
  9. Disabled
  10. Dying
  11. Energydrained
  12. Entangled
  13. Exhausted
  14. Fatigued
  15. Frightened
  16. Grappled
  17. Helpless
  18. Nauseated
  19. Panicked
  20. Paralyzed
  21. Petrified
  22. Poison (conditional, multiple stages)
  23. Prone (already from Phase 13)
  24. Sickened
  25. Slowed
  26. Unconscious
- [ ] For each condition: define standard active effect structure with all changes
- [ ] Example Blinded condition:
  ```
  {
    name: "Blinded",
    type: "condition",
    system: {
      conditionType: "blinded",
      changes: [
        { key: "attributes.ac.misc", operator: Operate.ADD, value: 2, priority: 0, bonus type: "penalty" },  // -2 to AC
        { key: "abilities.dex.penalty", operator: Operate.ADD, value: 2, priority: 0 },  // lose DEX to AC
        // Conceptual miss chance (25-50%) not represented as AE, applied in attack rolls
      ]
    }
  }
  ```
- [ ] Test: Condition definitions compile and validate

**Condition System Manager:**
- [ ] Extend ConditionManager from Phase 13 with all 25+ conditions
- [ ] Implement: `applyCondition(actor, conditionName)`
  - Look up condition definition in constants
  - Create/apply active effect for condition
  - Handle stacking (can't stack unconscious + asleep, etc.)
- [ ] Implement: `removeCondition(actor, conditionName)`
  - Find active effect for condition
  - Remove from actor
- [ ] Implement: `hasCondition(actor, conditionName)` → boolean
- [ ] Implement: `getActiveConditions(actor)` → list of active condition names
- [ ] Implement: `getSeverityLevel(actor, conditionName)` → numeric level
  - For conditions with levels (frightened: shaken/frightened/panicked, etc.)
- [ ] Test: Apply all 25 conditions to actor
- [ ] Test: Remove conditions
- [ ] Test: Query active conditions

**Condition Display UI:**
- [ ] Extend Phase 5 Actor sheet ConditionDisplay component
- [ ] Show list of active conditions with icons
- [ ] Color-code: beneficial (blue), harmful (red), neutral (gray), etc.
- [ ] Click condition icon to see details (DC to overcome, recovery mechanics, etc.)
- [ ] Right-click to remove condition (GM only)
- [ ] Test: Actor with multiple conditions displayed
- [ ] Test: Remove condition from UI

**POC Condition #1 - Blinded:**
- [ ] Define Blinded condition:
  - AC: +2 miscellaneous penalty (can't see opponents)
  - Lose DEX modifier to AC (can't see threats)
  - Attack rolls: -4 penalty (can't see target, but can still attack blindly in AOE)
  - 50% miss chance on attacks
- [ ] Effects as AE:
  - AC misc +2 (penalty AC)
  - DEX modifier to AC removed (handled in AC calculation)
  - Attack penalty -4
  - Miss chance 50% (applied in attack roll formula)
- [ ] Stub: Full miss chance implementation deferred to Phase 28 if complex
- [ ] Test: Apply Blinded to actor
  - AC increased by 2
  - Attack rolls show -4 penalty
  - Character marked as Blinded in condition list

**POC Condition #2 - Fatigued:**
- [ ] Define Fatigued condition:
  - STR: -2 modifier (not damage, penalty)
  - DEX: -2 modifier (not damage, penalty)
  - Cannot run or charge
  - Minimum 1 hour of rest to recover
- [ ] Effects as AE:
  - STR penalty +2
  - DEX penalty +2
- [ ] Integration with Phase 9 turn budget: cannot use full-round action (can use move + standard only)
- [ ] Recovery:
  - During rest: 1 hour of rest removes Fatigued
  - Apply effect with duration "1 hour", auto-removes
- [ ] Test: Apply Fatigued to actor
  - STR/DEX modifiers reduced by 2
  - Character shows Fatigued condition
  - Rest removes condition after 1 hour

**POC Condition #3 - Prone:**
- [ ] Already from Phase 13, integrate here
- [ ] Prone condition:
  - AC: +4 penalty to AC vs melee attacks, -4 AC for ranged
  - Attack rolls: -4 penalty for melee attacks from Prone position
  - Movement: must stand up (move action, triggers AoO from nearby foes)
  - Stand up action: implemented in Phase 9 turn budget
- [ ] Effects as AE:
  - Melee AC penalty +4 (bonus type deflection/conditional)
  - Ranged AC bonus -4 (penalty)
  - Melee attack penalty -4
- [ ] Stub: Conditional penalties (different for melee vs ranged) deferred to Phase 24 if complex
- [ ] Simple version: AC +4 overall, attack -4 overall
- [ ] Test: Apply Prone to actor
  - AC modified
  - Condition visible
  - Stand up action removes (from Phase 9)

**Condition Interactions & Immunity:**
- [ ] Some conditions are mutually exclusive:
  - Can't be both Asleep and Conscious (excluded)
  - Can't be both Petrified and Paralyzed (effectively, Petrified overrides)
  - Can't be both Dying and Dead
- [ ] Immunity conditions: some conditions can't be applied to certain creatures
  - Undead immune to fatigue
  - Constructs immune to most conditions
- [ ] Implement immunity checking in applyCondition():
  - Check actor type (PC, undead, construct, etc.)
  - If immune: don't apply, return message
- [ ] Test: Try to fatigue an undead, condition not applied
- [ ] Test: Try to apply conflicting conditions, first remains

**Ability Score Effects on Conditions:**
- [ ] Some conditions cause ability damage:
  - Str damage spell: reduces STR score
  - Poison: may cause ability damage
  - Ability drain spell: reduces ability permanently
- [ ] Applied as active effects with ability.damage or ability.drain changes
- [ ] Test: Spell that causes ability damage
  - STR damage: 4 points
  - Actor.abilities.str.damage = 4
  - STR modifier reduced correspondingly

**Frightened Track (Escalating Condition):**
- [ ] Frightened condition has three levels:
  - Shaken: -2 penalty on attacks/saves/ability checks
  - Frightened: -4 penalty, flees away from source if possible
  - Panicked: flees in random direction, drops held items, takes 1d4×10 minutes to calm
- [ ] Implementation:
  - Each level creates separate AE (Shaken AE, Frightened AE, Panicked AE)
  - Applying higher level removes lower level
  - Each level has different bonuses
- [ ] Test: Apply Shaken to actor
  - -2 penalty visible
- [ ] Test: Upgrade Shaken to Frightened
  - Shaken removed, Frightened applied
  - -4 penalty visible
  - Movement restriction (flee) noted
- [ ] Test: Upgrade Frightened to Panicked
  - Panicked AE applied
  - Full flee behavior described
  - Duration noted (1d4×10 minutes)

**Recovery Mechanics:**
- [ ] Design automatic recovery for conditions:
  - Fatigued: 1 hour rest removes
  - Stunned: 1 round recovery (automatic)
  - Dazed: 1 round recovery
  - Sickened: 1 minute recovery, or 1 hour rest
  - Blinded: depends on cause (magic removes with Cure Blindness, or 1 day recovery)
  - Poisoned: Fort save each round/minute, or antitoxin consumed
- [ ] Implement recovery logic:
  - For resting (Phase 21): apply recovery action, remove conditions with rest recovery
  - For round-to-round (Phase 9): each round, check recovery conditions, remove if met
- [ ] Test: Stunned condition, auto-removes after 1 round in combat

**Condition Death Integration:**
- [ ] Dying condition: at -1 to -9 HP, character is dying
  - Each round: Fort save (DC 10 + damage taken above -9)
  - Fail: lose 1 more HP (unconscious)
  - Success: stabilized (stays at current HP, conscious but helpless)
  - Natural 20: revived at 1 HP, conscious
- [ ] Dead condition: at -10 HP or below
  - Cannot be revived without magic (Raise Dead, Resurrection, etc.)
- [ ] Unconscious condition: at 0 to -9 HP
  - Cannot act
  - Cannot use reactive actions (AoO with Phase 9 extension)
  - Automatic fail on Fort saves (Dying check)
- [ ] Test: Reduce character to negative HP
  - Character goes unconscious automatically
  - If still between 0 and -9: becomes dying
  - If below -10: dead
  - Condition states visible

**Poison Condition (Complex):**
- [ ] Poison: complex condition with multiple stages
  - Initial exposure: Fort save (DC depends on poison type)
  - Fail: poisoned condition applied
  - Each round/minute: Fort save again
  - Depending on poison: STR damage, Cha damage, sleep, paralysis, etc.
- [ ] Poison types:
  - Injury (from weapon)
  - Contact (from touching)
  - Ingested (from eating/drinking)
  - Inhaled (from breathing)
- [ ] Poison effect: initial effect + secondary effect (after 1 round)
- [ ] Poison cure: antidote consumed, magic remove poison cast, or Fort save after many rounds
- [ ] Stub for Phase 20: Simple poison framework (one poison type for POC)
  - Full poison database deferred to Phase 27 (Content Migration)

**Equipment & Item Integration:**
- [ ] Conditions applied by equipment:
  - Armor and shields apply condition effects implicitly (already in Phase 15 AC)
  - Heavy Armor ⇒ Encumbered condition (reduced speed, ACP)
  - Other?
- [ ] Conditions applied by items:
  - Drinking poison ⇒ Poisoned condition (Phase 21 Consumables)
  - Reading prohibited script ⇒ Feebleminded condition (rare)
- [ ] Test: Equip heavy armor
  - Encumbered condition applied (speed reduced, ACP applied)

**Skill Checks with Conditions:**
- [ ] Conditions affect skill checks:
  - Blinded: additional penalty on certain skills (Search -4, Spot -4, Listen no penalty)
  - Deafened: Spot penalty, Listen -4
  - Fatigued: relevant skill penalties (from STR/DEX reduction)
  - Sickened: -2 on attack/ability checks
  - Nauseated: -2 on attack/ability checks, cannot take standards (similar to sickened but worse)
- [ ] Integration: skill calculation includes condition penalties
- [ ] Test: Blinded character makes Search check
  - Penalty applied automatically from Blinded AE

**Combat Integration:**
- [ ] Conditions affect combat:
  - Prone: AC/attack penalties handled above
  - Asleep: cannot act, auto-fail saves, -4 AC
  - Paralyzed: cannot act, -4 AC, enemies have +4 attack
  - Grappled: opponent has 50% attacks directed as grapple, constrained movement
  - Entangled: constrained movement, DEX penalty
  - Helpless: opposed attack rolls (any hit = critical)
  - Cowering: -2 AC, cannot attack
  - Nauseated: cannot take full-round actions (Phase 9 integration)
- [ ] Phase 9 turn budget integration:
  - Fatigued: full-round actions disabled (move + standard each turn)
  - Nauseated: full-round actions disabled
  - Paralyzed/Helpless: no actions at all
  - Exhausted: can only use move action (even worse than fatigued)
- [ ] Test: Paralyzed character in combat
  - Cannot act in turn budget
  - AC modified
  - Grappled/entangled: movement restricted

**Condition Markers on Canvas:**
- [ ] Token status icons: each condition shows visual indicator on token
  - Icon color/style reflects condition (red harmful, blue beneficial, gray neutral)
  - Icon visible in token HUD
  - Hover tooltip shows condition name
- [ ] Multiple condition markers on single token stacked
- [ ] Test: Token with 5 conditions, all visible
- [ ] Test: Hover over condition markers, tooltips show names

**System Configuration:**
- [ ] Register all 25+ conditions in CONFIG.DND35E.conditions
- [ ] Add condition icons to CONFIG.DND35E.conditionIcons
- [ ] For each condition: define if beneficial/harmful/neutral
- [ ] Define immunity rules in CONFIG (which creature types immune to which conditions)

**Localization & i18n:**
- [ ] Add i18n keys: Condition names (Blinded, Fatigued, Prone, etc.)
- [ ] Add i18n keys: Condition descriptions (what each condition does)
- [ ] Add i18n keys: Condition recovery text ("Rest 1 hour to recover", etc.)
- [ ] Add i18n keys: Buff types
- [ ] Add i18n keys: Bonus types (all 27)
- [ ] Add i18n keys: Ability damage/drain labels
- [ ] Add i18n keys: Fear track labels (Shaken, Frightened, Panicked)
- [ ] Update en.json with all keys

**Comprehensive Testing:**
- [ ] Unit test: Ability score calculation with damage/drain/penalty
- [ ] Unit test: Condition application and removal
- [ ] Unit test: Condition immunity checking
- [ ] Unit test: Condition stacking rules
- [ ] Unit test: Recovery condition checking (should remove after X time)
- [ ] Integration test: Apply Blinded condition to actor
  - AC modified correctly
  - Condition visible in actor sheet
  - Skill checks have penalties
- [ ] Integration test: Apply Fatigued condition
  - STR/DEX modifiers reduced
  - Turn budget restricted (if Phase 9 exists)
  - Rest removes condition
- [ ] Integration test: Apply multiple conditions to actor
  - All visible
  - All effects apply
  - Correct stacking rules
- [ ] Integration test: STR damage spell
  - STR ability.damage increases
  - STR modifier decreases
  - Skills affected
- [ ] Integration test: Frightened escalation
  - Apply Shaken: -2 penalty
  - Upgrade to Frightened: -4 penalty, Shaken removed
  - Upgrade to Panicked: movement restriction noted
- [ ] Integration test: Dying → Unconscious → Dead transition
  - HP at 0: Unconscious
  - HP at -5: can make Fort save to stabilize
  - HP at -10: Dead
- [ ] Integration test: Condition from item (e.g., poison from consumable, Phase 21 integration)
  - Condition applied with correct duration
- [ ] Integration test: Condition recovery
  - Fatigued: rest 1 hour, condition gone
  - Stunned: automatically removed after 1 round in combat
- [ ] Edge case: Immunity check (undead cannot be fatigued)
  - Apply Fatigued to undead: not applied, message shown
- [ ] Edge case: Multiple conditions affect same value (two +4 AC penalties)
  - Both applied, stacking rules respected
- [ ] Edge case: Condition with ability damage (Str Damage spell)
  - Ability damage applied
  - Condition and ability both tracked
- [ ] Smoke test: Full combat encounter with conditions
  - Characters and enemies have conditions
  - Conditions affect combat (AC, attacks, moves)
  - Conditions expire/recover correctly
  - No console errors
- [ ] Performance test: 20 conditions on single actor, calculations < 50ms

**Documentation & User Guides:**
- [ ] Document each condition: name, effects, how to apply, how to recover
- [ ] Document ability damage vs drain
- [ ] Document fear track escalation
- [ ] Document condition immunity (which creatures immune to what)
- [ ] Create journal entry: "Conditions"
- [ ] Create journal entry: "Ability Damage & Drain"
- [ ] Create journal entry: "Buffs & Debuffs"
- [ ] Create reference table: Condition effects on AC/attacks/movement
