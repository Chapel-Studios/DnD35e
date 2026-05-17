# Beta Phase 10: Full Spells

**Status**: 📖 Rough Sketch (400+ item checklist, spell resistance, concentration, counterspelling)

> **Milestone**: Beta  
> **Dependencies**: Phase 17 (Metamagic), Phase 18 (Area Effects & Auras)
> **Goal**: Complete the spell system with area-of-effect spell chains, spell resistance, concentration, counterspelling, and all remaining spell delivery mechanisms. Builds on Phase 16 (Spells POC) for the base spell/spellbook infrastructure, Phase 17 (Metamagic) for spell modification, and Phase 18 (Area Effects) for template-based targeting.

---

## 19.1 AoE Spell Action Chains

Spells that target areas use the MeasuredTemplate system from Phase 18:

```
Cast Fireball (action chain):
  1. check: Concentration check (if casting defensively)
  2. template: Place 20ft-radius burst template
  3. targeting: Auto-detect all tokens in template area
  4. save: Each target rolls Reflex save (DC = 10 + spell level + INT mod)
  5. damage: 1d6/#self.classes.wizard.level fire damage
     → half on successful save (Reflex-for-half pattern)
  6. effect: Apply fire damage to all targets
```

## 19.2 Spell Resistance

```typescript
interface SpellResistanceCheck {
  // Caster level check: 1d20 + caster level vs target SR
  formula: "1d20 + #self.casterLevel";
  target: "#target.spellResistance";
  // SR check happens BEFORE save, AFTER template placement
  // If SR blocks: spell has no effect on that target
  // "Spell Resistance: Yes/No" flag on each spell
}
```

- SR check inserted into action chain between targeting and save steps
- Per-target: some targets in an AoE may have SR, others don't
- Feats like Spell Penetration add bonuses via the Material AE pattern

## 19.3 Concentration

| Situation | DC | Phase 8 Integration |
|-----------|----|--------------------|
| Casting defensively | 15 + spell level | Check action at start of spell chain |
| Damaged while casting | 10 + damage taken + spell level | Triggered by damage during cast |
| Vigorous motion | 10 + spell level | Condition-based modifier |
| Grappled | 20 + spell level | TurnActionBudget grapple state check |

Concentration is a skill check action that gates the rest of the spell chain. On failure, the spell is lost (slot consumed, no effect).

## 19.4 Counterspelling

Ready action (Phase 9) to counter:
1. Identify spell being cast (Spellcraft check)
2. Cast same spell as counterspell (loses the slot)
3. Or use Dispel Magic (opposed caster level check)
4. Countered spell fizzles (slot consumed, no effect)

> Counterspelling implementation depends on the Ready action system. If Ready is deferred from Phase 9, counterspelling is also deferred.

## 19.5 Remaining Spell Delivery Types

| Type | Mechanism |
|------|-----------|
| **Ray** | Ranged touch attack action → single target |
| **Cone** | Template (Phase 18) → cone shape → all in area |
| **Line** | Template → line shape → all in area |
| **Burst/Spread/Emanation** | Template → sphere → spread vs emanation rules (Phase 18) |
| **Touch** | Melee touch attack (already in Phase 16 Spells POC) |
| **Personal** | Self-only, no targeting needed |
| **Close/Medium/Long range** | Range categories computed from caster level |

## 19.6 Duration & Dismissal

- Duration tracking via Active Effect duration on combat tracker (Phase 9)
- Concentration-duration spells: maintained as long as concentrating (standard action each round)
- Dismissible spells: caster can end early as a standard action
- Permanent spells: no duration tracking needed

## 19.7 Files to Create/Modify

## 19.7 Files to Create/Modify

| Action | Path |
|--------|------|
| Expand | `src/module/data/item/spell.mts` — SR flag, concentration DC, delivery type |
| Expand | `src/module/actions/spell-chains.mts` — AoE chains, SR integration, concentration |
| Create | `src/module/actions/counterspell.mts` — counterspell ready-action handler |
| Expand | Action chain engine — SR check step, concentration check step |
| Create | `packs/_source/spells/` — AoE and complex spell entries |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 19 has not started)

### ❌ Not Started (All Tasks for Phase 19)

**Spell Resistance Integration:**
- [ ] Extend SpellSystemModel from Phase 16
- [ ] Add field: spellResistance (BooleanField, true if spell subject to SR)
- [ ] For spells subject to SR: add indicator in spell sheet UI
- [ ] For spells NOT subject to SR (e.g., stuns, ability damage): mark explicitly
- [ ] Test: Spell with SR flag set
- [ ] Test: Spell without SR flag does not trigger SR check

**Spell Resistance Check Mechanics:**
- [ ] Create SpellResistanceCheck action/step in action chain
- [ ] Formula: "1d20 + #self.casterLevel" vs "#target.spellResistance"
- [ ] Implement check resolution:
  - Roll 1d20
  - Add caster level (calculated from Phase 12 class levels or from spellbook.casterLevel)
  - Compare vs target's SR value
  - If roll >= SR: SR overcome, spell continues
  - If roll < SR: SR blocks spell, spell has no effect on that target
- [ ] Per-target SR check: in AoE spells, each target rolls separately
  - Some targets may fail SR, others may succeed
- [ ] SR check integration with Spell Penetration feat (Phase 10 bonus):
  - Spell Penetration feat grants +2 to SR checks
  - Feat should apply via bonus mechanism (Material AE pattern)
- [ ] Chat output: show SR check result (succeeded/blocked)
- [ ] Test: Spell with SR, target with SR 16
  - Caster level 5: 1d20+5 vs 16
  - Roll 18: succeeds (18 > 16), spell continues
  - Roll 9: fails (9 < 16), spell blocked
- [ ] Test: Multiple targets with different SR values in one AoE
  - Some fail SR, others succeed
  - Each result shown in chat

**Concentration Checks:**
- [ ] Extend spell casting flow to include concentration check
- [ ] Implement concentration as a skill check (Concentration skill from Phase 12)
- [ ] Add field to SpellSystemModel: requiresConcentration (BooleanField, some spells require it)
- [ ] Add field: concentrationDC (FormulaField, e.g., "15 + spell level" for defensive casting)
- [ ] Implement concentration check trigger points:
  1. **Defensive casting**: DC 15 + spell level, check at START of casting (before spell resolves)
  2. **Damaged while casting**: DC 10 + spell level + damage taken, if target of attack during cast
  3. **Vigorous motion**: DC 10 + spell level + movement distance (if moved > 5 ft)
- [ ] Concentration check resolution:
  - Roll 1d20 + Concentration ranks + Concentration bonuses - concentration penalties
  - Success (roll >= DC): spell continues
  - Failure: spell is lost (slot expended, no effect)
- [ ] Concentration check timing:
  - **Defensive casting**: check at spell cast initiation, before other steps
  - **Damage during cast**: check when damage is taken (interrupt spell chain)
  - **Movement**: modifies concentration DC passively
- [ ] Store concentration success/failure in action chain result
- [ ] Chat output: show concentration check (succeeded/failed, DC shown)
- [ ] For failed concentration: announce "Spell lost! Slot expended."
- [ ] Test: Cast defensively (DC 15 + 1 = 16), Concentration +5
  - Roll 11: fails (11 < 16), spell lost
  - Roll 16: succeeds (16 >= 16), spell continues
- [ ] Test: Take damage during concentration spell cast
  - Concentration check triggered
  - DC 10 + spell level + damage = 10 + 2 + 15 = 27
  - High DC, likely failure
- [ ] Test: Move while casting concentration spell
  - Concentration DC increases (passive)

**Concentration Spell Maintenance:**
- [ ] After successful concentration check, spell applies for duration
- [ ] For concentration spells (e.g., Hold Person):
  - Duration: "Concentration, up to 1 minute"
  - Each round: maintain concentration (standard action) or lose spell
  - If caster moves > 5 ft: concentration check (DC 10 + spell level + distance/5)
  - If caster takes damage: concentration check (DC 10 + spell level + damage taken)
- [ ] Integrate with Phase 9 turn tracker:
  - Show "Concentrating on [spell]" in turn budget display
  - Each round: option to maintain or drop concentration
  - Movement/damage trigger concentration checks
- [ ] Test: Maintain concentration on Hold Person for multiple rounds
- [ ] Test: Concentration broken by damage, spell ends

**Spell Penetration Feat Integration:**
- [ ] Create or extend Spell Penetration feat (Phase 10)
- [ ] Effect: +2 bonus to caster level checks (SR checks)
- [ ] Apply via Material AE pattern to spell SR check formula
- [ ] Extended Spell Penetration (if implemented): +4 bonus
- [ ] Test: Spell with Spell Penetration, +2 added to SR check
- [ ] Test: Spell Penetration stacks correctly if multiple instances

**AoE Spell Action Chains:**
- [ ] Implement AoE spell chain template:
  1. Check: Concentration (if required)
  2. Target: Place template (from Phase 18)
  3. Target: Detect all tokens in template area
  4. Loop through each target:
     a. Check: Spell Resistance (if SR applies)
     b. Check: Saving throw (if spell allows save)
     c. Apply: Effect (damage, condition, etc.)
  5. Post: Chat card with all results
- [ ] Spell chain branching: if save+condition (e.g., Frightened), show save result branch
  - On success: no condition
  - On failure: apply condition
- [ ] Spell chain branching: if SR check blocks, skip all effects for that target
- [ ] Test: Fireball (AoE damage no save)
  - Template placed
  - All targets in template take damage
  - Damage roll shown once, results per-target
- [ ] Test: Cone of Cold (AoE damage with save)
  - Template placed
  - Each target rolls Reflex save
  - Success: half damage
  - Failure: full damage
  - Chat shows each save result
- [ ] Test: Spell with SR (e.g., Polymorph Any Object, maybe a future spell)
  - SR check performed
  - If blocked: "SR blocked spell"
  - If successful: target rolls save
  - Full chain executed

**Ray Spell Delivery:**
- [ ] Ray spells: ranged touch attack targeting a single target
- [ ] Ray template: invisible line from caster to target
- [ ] Ray attack: 1d20 + caster ranged touch attack bonus vs target AC
  - Ranged touch attack uses ranged attack bonus (Phase 1 weapon attacks)
  - Ignores armor, only applies DEX/dodge/size modifiers
- [ ] Ray spell action chain:
  1. Check: Concentration (if required)
  2. Target selection: click on single target
  3. Attack: Ranged touch attack vs target
  4. If hit: apply spell effect (damage, condition, etc.)
  5. If miss: spell misses, slot expended
- [ ] Example POC spells: Magic Missile (special, doesn't miss), Scorching Ray
- [ ] Magic Missile exception: always hits, no attack roll
- [ ] Test: Cast Scorching Ray
  - Select target
  - Roll ranged touch attack
  - Hit: damage applied
  - Miss: no effect
- [ ] Test: Magic Missile always hits
  - Always applies damage
  - No attack roll

**Cone Spell Delivery (Phase 18 integration):**
- [ ] Cone spells already defined in Phase 18 templates
- [ ] Action chain: place cone template, detect targets, apply effects
- [ ] Example POC spells: Cone of Cold, Burning Hands
- [ ] Test: Cast Cone of Cold, all targets in cone area detected and damaged
- [ ] Test: Reflex save for half damage

**Line Spell Delivery (Phase 18 integration):**
- [ ] Line spells already defined in Phase 18 templates
- [ ] Action chain: place line template, detect targets, apply effects
- [ ] Example POC spells: Lightning Bolt, Wall of Ice (line)
- [ ] Test: Cast Lightning Bolt, all targets on line detected
- [ ] Test: Reflex save for half damage, or evasion (Phase 20)

**Burst Spell Delivery (Phase 18 integration):**
- [ ] Burst spells already defined in Phase 18 templates
- [ ] Action chain: place burst template, detect targets, apply effects
- [ ] Example POC spells: Fireball, Telekinetic Sphere, Prismatic Sphere (POC: just Fireball)
- [ ] Test: Cast Fireball, all targets in radius detected
- [ ] Test: Reflex save for half damage

**Emanation Spell Delivery (Phase 18 integration):**
- [ ] Emanation spells already defined in Phase 18 templates
- [ ] Emanation: centered on caster, persists, affects new targets that enter
- [ ] Example POC spells: Faerie Fire (emanates from caster, lasts 1d3 rounds)
- [ ] Stub: Full emanation mechanics (persistent aura) in Phase 20
- [ ] Test: Cast emanation spell, affects tokens in radius

**Touch Spell Delivery (Phase 16 POC):**
- [ ] Touch spells already in Phase 16 POC
- [ ] Touch range: 5 ft reach (or extended reach with feats, Phase 20)
- [ ] Touch attack: 1d20 + melee touch attack bonus vs target AC
  - Melee touch attack ignores armor, only DEX/dodge/size
- [ ] Hold charge mechanics: if spell not delivered in same round, caster holds charge
  - "You touch [spell name]" message
  - Cleric holds charge until touching target
- [ ] If caster attacked while holding charge: concentration check or lose spell
- [ ] Example POC spells: Cure Light Wounds, Magic Missile as touch (if applicable)
- [ ] Test: Cast touch spell, select target
  - Melee touch attack vs target AC tough
 - Hit: spell applied
  - Miss: charge held
- [ ] Test: Hold charge and delay casting
  - Can walk around
  - Can try to touch another target
  - Takes concentration check if attacked

**Personal Spell Delivery:**
- [ ] Personal spells: affect caster only, no targeting needed
- [ ] Example POC spells: Mage Armor, Mirror Image, Displacement
- [ ] Action chain: cast, apply effect to caster
- [ ] Test: Cast Mage Armor (personal spell)
  - No targeting needed
  - Effect applied to caster immediately

**Close/Medium/Long Range Calculations:**
- [ ] Implement range calculation based on caster level (Phase 12)
- [ ] Range categories:
  - **Close**: 25 ft + 5 ft per 2 caster levels (max 45 ft)
  - **Medium**: 100 ft + 10 ft per caster level (max 180 ft)
  - **Long**: 400 ft + 40 ft per caster level (max 720 ft)
- [ ] Spell caster level: from spellbook.casterLevel or calculated from class
- [ ] Range check: if spell range is "Close", calculate actual distance and enforce limit
- [ ] Test: Spell with Close range at caster level 3
  - Close = 25 + (5 × 1) = 30 ft
  - Cannot target beyond 30 ft
- [ ] Test: Spell with Medium range at caster level 5
  - Medium = 100 + (10 × 5) = 150 ft
  - Cannot target beyond 150 ft

**Duration Tracking (Phase 9 integration):**
- [ ] Spell duration tracked as active effect on target
- [ ] Duration types:
  - **Rounds**: 1d4 rounds, 1 round, etc.
  - **Minutes**: 1 minute, 10 minutes, etc.
  - **Hours**: 1 hour, 8 hours, etc.
  - **Days**: 1 day, etc.
  - **Permanent**: no duration tracking, spell persists until dispelled
  - **Concentration**: maintained by caster
  - **Instantaneous**: effect applied, duration ends (no tracking needed)
- [ ] Phase 9 turn tracker shows duration countdown for active spell effects
- [ ] On duration expiry: effect removal automatic
- [ ] Test: Spell with 1 minute duration, effect expires after 10 rounds in combat
- [ ] Test: Permanent spell, no expiry tracking

**Dismissible Spells:**
- [ ] Some spells can be dismissed by caster (e.g., Magic Missile, Mage Armor)
- [ ] Add field: dismissible (BooleanField, true if caster can end early)
- [ ] Dismissal: standard action, removes spell effect
- [ ] Test: Spell with dismissible flag, can dismiss with standard action

**POC Spell Content - Fireball (AoE with Save):**
- [ ] Spell data:
  - Level: 3
  - School: evocation
  - Casting time: 1 standard action
  - Range: long
  - Area: 20-ft radius burst
  - Duration: instantaneous
  - Saving throw: Reflex half
  - Spell Resistance: Yes
  - Damage: 1d6 per caster level (max 10d6)
- [ ] Action chain:
  1. Concentration check (DC 18, not defensive)
  2. Place 20-ft radius burst template
  3. For each target in area:
     a. Reflex save vs DC (10 + 3 + INT mod)
     b. Success: half damage
     c. Failure: full damage
  4. Apply damage
  5. Post chat card with save results
- [ ] Test: Cast Fireball on 3 enemies
  - All 3 in template
  - 2 succeed save (half damage), 1 fails (full damage)
  - Chat shows all 3 results
  - Slot expended

**POC Spell Content - Cone of Cold (Cone with Save):**
- [ ] Spell data:
  - Level: 5
  - School: evocation
  - Casting time: 1 standard action
  - Range: self (60-ft cone)
  - Area: 60-ft cone
  - Duration: instantaneous
  - Saving throw: Reflex half
  - Spell Resistance: Yes
  - Damage: 1d6 per caster level (max 15d6), cold damage
- [ ] Action chain: same as Fireball but cone area
- [ ] Test: Cast Cone of Cold
  - Cone template placed
  - Targets in cone roll save
  - Results applied

**POC Spell Content - Lightning Bolt (Line with Save+Reflex):**
- [ ] Spell data:
  - Level: 3
  - School: evocation
  - Casting time: 1 standard action
  - Range: long (120 ft)
  - Area: 120-ft line
  - Duration: instantaneous
  - Saving throw: Reflex half
  - Spell Resistance: Yes
  - Damage: 1d6 per caster level (max 10d6), electrical damage
- [ ] Action chain: place line template, detect targets, save, apply damage
- [ ] Test: Cast Lightning Bolt
  - Line template placed
  - Targets on line detected
  - Reflex saves computed
  - Damage applied

**POC Spell Content - Hold Person (Emanation with Will Save):**
- [ ] Spell data:
  - Level: 3
  - School: enchantment
  - Casting time: 1 standard action
  - Range: medium
  - Target: one humanoid
  - Duration: concentration, up to 1 round per level (max 10 rounds)
  - Saving throw: Will negates
  - Spell Resistance: Yes
  - Effect: target paralyzed (cannot move or act)
- [ ] Stub: Full Hold Person (humanoid check, specific condition) deferred to Phase 20
- [ ] Simple version: target rolls Will save, on failure gets paralyzed condition (stub)
- [ ] Test: Cast Hold Person on target
  - Target rolls Will save
  - Failure: paralyzed
  - Caster maintains concentration (can be interrupted)

**POC Spell Content - Magic Missile (Ray, auto-hit):**
- [ ] Spell data:
  - Level: 1
  - School: evocation
  - Casting time: 1 standard action
  - Range: medium
  - Target: up to 5 creatures (one missile per creature, typically)
  - Duration: instantaneous
  - Saving throw: none
  - Spell Resistance: No (SR does not apply)
  - Damage: 1d4 + 1 per missile, force damage
  - Missiles: 1 + 1 per 2 caster levels (max 5)
- [ ] Action chain:
  1. Select up to 5 targets (each gets one missile)
  2. No save, no SR
  3. 1d4+1 damage per missile
  4. Chat shows damage roll + total
  5. Apply damage
- [ ] Note: Sub-target support (Phase 18 multi-target stub), implement as 1 rollper missile for simplicity
- [ ] Test: Cast Magic Missile at 1st-level wizard
  - 1 missile (1 + 1/2 × 1 = 1.5, rounded down to 1)
  - Select 1 target
  - 1d4+1 damage dealt
- [ ] Test: Cast Magic Missile at Wizard level 9
  - 5 missiles (1 + 9/2 = 5.5, rounded down to 5)
  - Select up to 5 targets
  - Each gets 1d4+1
  - All damage applied

**Counterspelling (Stub for Phase 9 Ready integration):**
- [ ] Ready action (Phase 9) enables "Ready to counterspell"
- [ ] Counterspell resolution:
  1. Identify spell being cast: Spellcraft check (opposed check vs caster's spellcraft)
  2. If succeeded: can counter with matching spell or Dispel Magic
  3. Casting: use reaction (ready action) to cast counterspell
  4. Opposed caster level check (if Dispel Magic) or matching spell slot
  5. If successful: original spell fizzled (slot consumed, no effect)
  6. If fail: original spell continues
- [ ] Stub for Phase 19: Counterspelling logic framework in place, defer to Phase 9 Ready if not yet implemented
- [ ] Note: Full counterspelling depends on Phase 9 Ready action system

**Spell Scroll & Wand Integration (Deferred but planned):**
- [ ] Stubs: spells can be stored on scrolls/wands (Phase 21 Consumables)
- [ ] Phase 19: Framework for spellbook-independent spell casting
  - Spell doesn't require spellcasting class
  - Caster level: scroll/wand provides caster level
- [ ] Test: Cast spell from scroll (Phase 21)

**Chat Card Enhancements:**
- [ ] Expand chat card from Phase 16 to show:
  - Spell name, level, caster
  - Targets affected
  - Save results (per target) if applicable
  - SR results if applicable
  - Concentration check result
  - Damage rolls (per target or grouped)
  - Final effect (damage taken, condition applied, etc.)
  - Spell slot consumed notification
- [ ] Include action buttons (deferred, Phase 8 integration).
- [ ] Test: Chat card shows all relevant info for complex spell

**Performance & Optimization:**
- [ ] AoE target detection: pre-calculate template contents, cache for 100ms
- [ ] Spell resistance checks: batch calculation (roll once, compare to all SR values)
- [ ] Multiple AoE spells in single round: no performance degradation
- [ ] Test: 10 AoE spells in single round, all resolve in < 2 seconds

**Accessibility & Clarity:**
- [ ] Template highlighting: affected tokens clearly visible
- [ ] Save indicators: show which targets succeeded/failed saves
- [ ] SR indicators: show which targets blocked by SR
- [ ] Concentration status: always visible on turn tracker
- [ ] Test: Open full AoE spell, can see all affected tokens and results in < 3 seconds

**System Configuration:**
- [ ] Register spell damage types (force, fire, cold, electrical, acid, sonic) in CONFIG
- [ ] Register saving throw types (Fortitude, Reflex, Will) in CONFIG
- [ ] Spell level ranges: 0-9 in CONFIG

**Localization & i18n:**
- [ ] Add i18n keys: Spell delivery types (ray, cone, line, burst, touch, personal)
- [ ] Add i18n keys: Saving throw types
- [ ] Add i18n keys: Spell Resistance labels
- [ ] Add i18n keys: Concentration labels + error messages
- [ ] Add i18n keys: Counterspell labels
- [ ] Add i18n keys: Duration types
- [ ] Update en.json with all keys

**Comprehensive Testing:**
- [ ] Unit test: Range calculations (Close, Medium, Long)
- [ ] Unit test: Concentration DC calculations
- [ ] Unit test: Spell Resistance check formula
- [ ] Unit test: AoE target detection (all tokens in template area)
- [ ] Integration test: Cast Fireball
  - Full AoE chain with saves
  - All targets damaged correctly
  - Chat card shows all results
- [ ] Integration test: Cast spell with SR (Polymorph Any Object or similar, Phase 25)
  - SR check performed
  - If blocked: no save, no effect
  - If successful: proceed with save
- [ ] Integration test: Cast spell with concentration check
  - Defensive casting: concentration check required
  - Pass: spell continues
  - Fail: spell lost
- [ ] Integration test: Maintain concentration over multiple rounds
  - Spell persists
  - Each round: maintain or drop concentration
  - Damage during casting: concentration check triggered
- [ ] Integration test: Ray spell (Magic Missile, Scorching Ray)
  - Target selection
  - Attack roll (if not Magic Missile)
  - Damage application
- [ ] Integration test: Cone spell (Cone of Cold)
  - Template placed at correct angle
  - All tokens in cone detected
  - Fire damage with cold descriptor (for resistances, Phase 20)
- [ ] Integration test: Line spell (Lightning Bolt)
  - Template placed in correct direction
  - All tokens on line detected
  - Reflex saves computed
- [ ] Integration test: Emanation spell (Faerie Fire)
  - Effect persists around caster
  - Stub: full level mechanics deferred
- [ ] Integration test: Touch spell (Cure Light Wounds)
  - Select target
  - Touch attack
  - Effect applied
- [ ] Integration test: Personal spell (Mage Armor)
  - No targeting, effect on caster
- [ ] Edge case: Spell with multiple save types (rare, stub)
  - Handle gracefully or note limitation
- [ ] Edge case: Spell with both SR and save (common)
  - SR checked first, if blocked: save skipped
  - If SR overcome: save performed
- [ ] Edge case: Spell in antimagic field (deferred, Phase 20)
- [ ] Edge case: Area spell with targets partially obscured (deferred, template line-of-sight)
- [ ] Smoke test: Full combat encounter with 5+ different spell types
  - No console errors
  - All damage/effects applied correctly
  - Performance acceptable
- [ ] Performance test: 20 AoE spells in one round, all resolve in < 5 seconds

**Documentation & User Guides:**
- [ ] Document each spell delivery type: ray, cone, line, burst, touch, personal
- [ ] Document spell resistance system: how SR works, SR checks
- [ ] Document concentration system: when required, failure consequences
- [ ] Document spell duration: tracking, expiry, dismissal
- [ ] Create journal entry: "Advanced Spell Casting"
- [ ] Create journal entry: "Spell Resistance"
- [ ] Create journal entry: "Concentration"
- [ ] Create journal entry: "Counterspelling" (if implemented in Phase 9)
- [ ] Note limitations: Counterspelling depends on Phase 9 Ready action
