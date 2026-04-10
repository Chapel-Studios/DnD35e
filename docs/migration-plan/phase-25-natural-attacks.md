# Phase 25: Natural & Special Attacks

**Status**: � Rough Sketch (350+ item checklist, iterative attacks, TWF)

> **Milestone**: Beta  
> **Dependencies**: Phase 8 (Action System)  
> **Goal**: Natural attack item type with primary/secondary classification. Mixed manufactured + natural weapon full attacks using the IterativeAttackGenerator from Phase 8 (§18.4). Extends the progressive full-attack state machine to handle natural attack sequencing.

---

## 19.1 Attack Item Type (Natural Attacks)

```
AttackSystemModel extends ItemSystemModelBase
├── attackType: 'natural' | 'racial' | 'extraordinary' | 'supernatural'
├── naturalAttackType: 'bite' | 'claw' | 'gore' | 'slam' | 'sting' | 'tentacle' | null
├── secondaryAttack: boolean (-5 penalty, half STR)
├── reach: boolean
├── actions: ActionDataModel[]  ← attack + damage actions via Action System
```

## 19.2 Full Attack — Iterative Generation

Full attack is **NOT a stored action chain**. It is the natural result of the progressive turn state machine (see Phase 8 §18.4). The `IterativeAttackGenerator` dynamically computes available attacks:

### Inputs
- **BAB**: Each +5 grants an iterative at cumulative -5
- **Equipped weapons**: Main hand + off-hand slot occupancy
- **Two-weapon fighting feats**: TWF, ITWF, GTWF modify penalties and grant extra off-hand attacks
- **Natural attacks**: Secondary naturals at -5 and half STR (when used with manufactured weapons)
- **Feat-granted extras**: Haste (+1 at highest BAB), Rapid Shot (+1 ranged at -2), Flurry of Blows

### Iterative Generation Rules
1. Main hand iteratives from BAB: +11/+6/+1
2. Off-hand attacks (if TWF): base off-hand, + ITWF iterative at -5, + GTWF iterative at -10
3. TWF penalties applied to ALL attacks: -6/-10 (base), -4/-8 (TWF feat), -2/-2 (light off-hand + TWF)
4. Natural attacks added as secondary (-5, half STR) only if manufactured weapons also used
5. Bonus attacks from effects (Haste, etc.) via EffectTrigger system

### Ordering
- Main-hand iteratives: highest BAB to lowest (required by SRD)

---

## 19.3 Open Questions

1. **Full attack with natural weapons**: A creature with manufactured weapons + natural attacks can use both in a full attack. Natural attacks are always secondary in this case (-5, half STR). How is this reflected in the iterative generation? Does the `IterativeAttackGenerator` auto-append natural attacks after manufactured weapon iteratives, or does the player manually add them?
- Main vs off-hand: can be interleaved in any order
- Natural attacks: typically after manufactured weapon attacks
- Player chooses order within constraints

## 19.3 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/attack/` — class, data model, sheet |
| Create | `src/actions/IterativeAttackGenerator.mts` — compute full attack pool |
| Modify | `system.json` — register attack type |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 25 has not started)

### ❌ Not Started (All Tasks for Phase 25)

**Natural Attack Item Type (Attack System Model):**
- [ ] Create `src/entities/items/attack/AttackSystemModel.mts` extending ItemSystemModelBase
- [ ] Define schema: attackType (StringField with choices: 'natural', 'racial', 'extraordinary', 'supernatural')
- [ ] Define schema: naturalAttackType (StringField or null, choices: 'bite', 'claw', 'gore', 'slam', 'sting', 'tentacle', 'touch', 'other')
- [ ] Define schema: damageFormula (FormulaField, damage dealt, e.g., "1d6+STR")
- [ ] Define schema: criticalRange (NumberField, critical threat range, default 20, e.g., 19-20 for keen)
- [ ] Define schema: criticalMultiplier (NumberField, × multiplier on critical hit, default 2, e.g., ×3 for katana)
- [ ] Define schema: secondaryAttack (BooleanField, true if this is a secondary natural attack)
  - Secondary attacks take -5 penalty and use half STR
  - Primary attacks (first attack) do not have this penalty
- [ ] Define schema: reach (BooleanField, true if attack has reach beyond normal 5 ft)
- [ ] Define schema: reachDistance (NumberField or null, reach distance in feet, e.g., 10 ft for long reach)
- [ ] Define schema: attackBonus (NumberField or FormulaField, additional bonus to attack, e.g., +2 from magic)
- [ ] Define schema: characteristics (ArrayField of StringField, descriptive tags like "magic", "silver", "fire", "cold", etc.)
- [ ] Test: AttackSystemModel instantiation
- [ ] Test: Schema validation

**Natural Attack Item Class:**
- [ ] Create `src/entities/items/attack/ItemDnd35eAttack.mts` extending ItemDnd35e
- [ ] Implement `getAttackBonus(actor, context)`: calculate total attack bonus
  - Base: BAB (from Phase 12 class levels)
  - Plus: STR modifier (for melee) or DEX modifier (for ranged)
  - Plus: weapon enhancement bonus (if applicable)
  - Plus: feat bonuses (e.g., Weapon Focus, Power Attack modifier)
  - Plus: circumstances bonuses
  - Result: +X value for attack roll
- [ ] Implement `getDamageBonus(actor, context)`: calculate damage bonus
  - Base: STR modifier (for melee) or DEX modifier (for ranged)
  - Times: 1.0 for primary hand attack, 0.5 for off-hand, 0.5 for secondary natural attack
  - Plus: enhancement bonus
  - Plus: feat bonuses (Power Attack, Weapon Specialization)
  - Plus: circumstance/size modifiers
  - Result: +X value for damage roll
- [ ] Implement `rollAttack(actor, options)`: roll attack for this weapon
  - Roll 1d20 + attack bonus
  - Check: on natural 20, crit threat
  - On threat: roll confirmation crit (1d20 + attack bonus vs AC)
  - Return: {roll, total, isCrit, confirmRoll}
- [ ] Implement `rollDamage(actor, options)`: roll damage
  - Roll damage formula (e.g., 2d6+3 for shortsword)
  - If critical: multiply damage by critical multiplier
  - Return: {roll, total, isCrit}
- [ ] Test: Attack instantiation and property access
- [ ] Test: Attack bonus calculation
- [ ] Test: Damage bonus calculation

**Natural Attack Sheet Component:**
- [ ] Create `src/vue/components/sheets/AttackSheetDnd35e.vue`
- [ ] Display attack properties: type, natural attack type, damage, critical, reach
- [ ] Show attack bonus calculation (BAB + STR + enhancement, etc.)
- [ ] Show damage bonus calculation breakdown
- [ ] Allow editing (for GMs or custom attacks)
- [ ] Test: Attack sheet renders

**Iterative Attack Generator:**
- [ ] Create `src/actions/IterativeAttackGenerator.mts` utility
- [ ] Input parameters:
  - actor (creature making attacks)
  - weapons (array of equipped weapons)
  - naturalAttacks (array of natural attack items)
  - modifiers (feature/feat grants, like TWF, Haste, etc.)
- [ ] Output: array of IterativeAttack objects with:
  - weapon/attack reference
  - bonus (including BAB, DEX/STR, modifiers)
  - isPrimary (true for primary hand/attack, false for secondary)
  - isNatural (true for natural attacks)
  - penalty (cumulative -5 for iteratives, -5 for secondary naturals)
  - isBonus (true for Haste/Rapid Shot bonus attacks)

**Main-Hand Iterative Generation:**
- [ ] Algorithm:
  1. Get actor BAB from Phase 12 class
  2. Generate iterative bonuses: +0/−5/−10/−15/−20 (based on BAB ÷ 5)
  3. Example: BAB 11 = 3 iteratives at +11, +6, +1
  4. For each iterative: create IterativeAttack with bonus = BAB offset + STR + modifiers
  5. All main-hand iteratives are primary attacks (use full STR)
  6. Store in return array in order (highest BAB to lowest)
- [ ] Test: Generate iteratives for BAB 11
  - 3 iteratives: +11, +6, +1
- [ ] Test: Generate iteratives for BAB 5
  - 1 iterative: +5
- [ ] Test: Generate iteratives for BAB 20
  - 4 iteratives: +20, +15, +10, +5

**Two-Weapon Fighting Integration:**
- [ ] Two-weapon fighting rules (complex, Phase 8 may have partial support):
  - Off-hand weapon takes penalties: -6/-10 (base), -4/-8 (with TWF feat), -2/-2 (light off-hand)
  - TWF feat: allows one off-hand attack instead of standard AoO
  - Improved TWF: allows second off-hand attack at -5
  - Greater TWF: allows third off-hand attack at -10
- [ ] Algorithm:
  1. Check: actor has weapon equipped in mainhand + off-hand
  2. If off-hand exists:
     a. Check: actor has TWF feat (or is monk/ranger with inherent TWF)
     b. Generate off-hand iteratives (1 base + bonuses from ITWF, GTWF)
     c. Apply TWF penalties to all main-hand AND off-hand iteratives
  3. TWF penalties:
     - Base TWF: -4 main-hand, -8 off-hand
     - With TWF feat: still applies (feat lets you do it without -20 off-hand penalty)
     - Light/small off-hand: -2 instead of -4 main, -2 instead of -8 off-hand
  4. Off-hand iteratives from each feat:
     - Base (no feat): 1 off-hand attack at -10
     - TWF: 1 off-hand attack at -4
     - ITWF: 2 off-hand attacks at -4 and -9
     - GTWF: 3 off-hand attacks at -4, -9, and -14
- [ ] Return order: interleave main and off-hand attacks as per SRD (typically main-hand first, but player can order them)
- [ ] Test: Generate attacks for TWF without feats
  - Main hand at +5, off-hand at -5
- [ ] Test: Generate attacks for TWF with feat
  - Main hand at +5, off-hand at +1 (penalties reduced)

**Natural Attack Integration in Full Attack:**
- [ ] Natural attacks as secondary attacks (-5 penalty, half STR) when mixed with manufactured weapons
- [ ] Algorithm:
  1. Check: actor has manufactured weapons equipped AND natural attacks available
  2. If both:
     a. Generate main-hand + off-hand iteratives (manufactured weapons)
     b. Collect natural attacks
     c. Mark all natural attacks as secondary (penalty -5, half STR)
     d. Append natural attacks to iterative list
  3. Return combined list
- [ ] Natural attack order:
  - Typically after manufactured weapons
  - But player can reorder if desired (for action tracking)
- [ ] Example: Fighter with +11 BAB, longsword + bite
  - Main hand: +11, +6, +1
  - Bite: -4 (-5 secondary penalty, but... actually it's still -4 below main-hand level, let me rethink)
  - Bite secondary: -4 (main BAB -5, half STR = different damage not different attack bonus)
  - Actually secondary attacks take -5 to the ATTACK BONUS
  - Bite: +11 - 5 = +6 attack bonus
- [ ] Test: Generate full attack with manufactured + natural
  - All iteratives at proper bonuses

**Feat-Based Attack Bonuses:**
- [ ] Feats that grant bonus attacks or modify iteratives:
  - **Haste** (Phase 20 buff): +1 attack at highest BAB (e.g., if BAB +11, gain +11 attack)
  - **Rapid Shot** (ranged): +1 ranged attack at -2 penalty (also -2 to all ranged that round)
  - **Flurry of Blows** (monk): bonus attack at highest BAB, additional at BAB-5 (replaces normal full-attack)
  - **Cleave** (Phase 10 feat trigger): bonus attack on kill (special, not part of normal full attack)
- [ ] Integration:
  - Check actor for applicable feats/buffs
  - Each modifier adds iterative attacks to the pool
  - Haste: append {weapon: main, bonus: BAB, isBonus: true}
  - Rapid Shot: append {weapon: ranged, bonus: BAB-2, isBonus: true, penalty: -2 to all ranged}
- [ ] Test: Generate full attack with Haste buff
  - Extra attack at highest BAB

**Action Chain for Each Iterative Attack:**
- [ ] Each iterative attack resolves as separate action chain (Phase 8):
  1. Roll attack (1d20 + bonus + modifiers)
  2. Compare to target AC (including DEX/dodge/untyped bonuses)
  3. On hit: roll damage (damage formula + modifier)
  4. On critical threat: roll confirmation
  5. On confirmed crit: apply critical damage (×2 or ×3 depending on weapon)
  6. Post result to chat
- [ ] Each iterative can be resolved in sequence during turn
  - Player clicks attack 1, rolls
  - Results shown, damage applied
  - Player clicks attack 2, rolls (if still relevant, e.g., target not dead)
  - Etc.
- [ ] Integration with Phase 9 turn budget:
  - Full attack uses single "full-round action" cost
  - All iteratives are part of that action
  - No additional cost per iterative
- [ ] Test: Resolve full attack sequence
  - Roll attack 1, see result
  - Roll attack 2, see result
  - All in single turn

**Pre-Attack Dialog Integration:**
- [ ] Before rolling, show attack summary dialog
  - List all generated iteratives (with bonuses)
  - Show target info (AC, etc.)
  - Option to apply modifiers (Power Attack, etc., if not applied globally)
  - "Roll" button to start sequence
- [ ] Dialog shows:
  - Iterative attacks (main-hand +11, +6, +1, off-hand +6, natural bite +6, etc.)
  - Target AC
  - Estimated damage per attack
- [ ] Player can:
  - Apply Power Attack to one, some, or all attacks
  - Apply other modifiers
  - Confirm and start rolling
- [ ] Test: Pre-attack dialog appears with all iteratives listed

**Power Attack with Iterative Attacks:**
- [ ] Power Attack (Phase 10 feat) modifies attack bonuses for damage boost:
  - Trade attack bonus for damage (1:1, 1:2 with 2-handed or off-hand)
  - Can apply to all attacks or subset
- [ ] Algorithm:
  1. Player declares Power Attack and amount
  2. Reduce all selected attack bonuses by -X
  3. Increase all selected damage bonuses by +X (or +2X if applicable)
  4. Roll attacks with modified bonuses
- [ ] Example: +11 BAB with longsword, apply -2 Power Attack
  - Attack: +11 - 2 = +9
  - Damage: +X + 2 = +something extra
- [ ] Test: Apply Power Attack to iterative attacks
  - Bonuses modified correctly

**Natural Attack Types & Damage:**
- [ ] Define natural attack types and standard damage:
  - Bite: 1d8 (medium creature), scaled by size
  - Claw: 1d6 (medium creature), scaled by size
  - Gore: 1d8 (medium creature), scaled by size
  - Slam: 1d6 (medium creature), scaled by size
  - Sting: 1d4 (medium creature), scaled by size
  - Tentacle: 1d4 (medium creature), scaled by size
  - Touch: variable, usually magical effect
  - Other: custom damage defined
- [ ] Size scaling (Phase 5/6 size categories affect weapon damage):
  - Tiny: 1d4 → 1d2 (damage die)
  - Small: 1d8 → 1d6
  - Large: 1d8 → 2d6 (cumulative ×1.5)
  - Huge: 1d8 → 2d8
- [ ] Test: Create attacks for various natural types
- [ ] Test: Size affects damage correctly

**POC Natural Attack #1 - Bite (Large Dragon):**
- [ ] Create attack: Bite (Large)
  - Type: natural
  - Natural attack type: bite
  - Damage: 2d8+STR (Large bite, base is 2d6 for size)
  - Critical: 20/×2 (no special)
  - Reach: false (5 ft)
  - Secondary: false (primary attack)
- [ ] Test: Large dragon with bite attack
  - Damage rolled correctly (2d8)

**POC Natural Attack #2 - Claws (Medium with Secondary):**
- [ ] Create attack: Claw
  - Type: natural
  - Natural attack type: claw
  - Damage: 1d6+STR (medium, primary)
  - Critical: 20/×2
  - Secondary: false (primary)
- [ ] Create attack: Claw (secondary)
  - Same as above but secondary: true
  - Damage formula adjusts to half STR when used
- [ ] Test: Medium creature with two claws (primary + secondary)
  - Primary uses full STR
  - Secondary uses half STR
  - Both appear in iteratives

**POC Natural Attack #3 - Goblin with Scimitar + Bite:**
- [ ] Create goblin with:
  - Weapon: scimitar (1d6+DEX damage, +3 BAB)
  - Natural attack: bite (1d4+half STR, secondary)
- [ ] Generate full attack:
  - Main hand scimitar: +3 attack
  - Bite: -2 attack (main BAB +3 - 5 secondary, but also reduced to -2 in this case, let me verify rules)
  - Actually: biteattack is at main BAB, but secondary penalty applies
  - bite at +3 - 5 = -2, but that's negative. Better explained: if using manufactured weapon, natural attacks are secondary (-5) and half STR damage.
  - Bite: -1 or -2 (depending on exact rules, stub for phase 25)
- [ ] Test: Full attack with scimitar + bite
  - Both listed in iteratives
  - Damage from both applied

**Full Attack Display & Tracking:**
- [ ] On actor turn (Phase 9):
  - Show "Full Attack" action option in turn budget
  - Select target
  - Iterative attack generation runs
  - Pre-attack dialog shows all attacks
  - Player confirms or modifies (Power Attack, etc.)
  - Roll each attack in sequence
  - After each results, option to continue or stop
- [ ] Chat card displays:
  - Turn number and actor name
  - "Full Attack vs [target]"
  - Each attack result:
    - Attack roll + bonus = total vs AC
    - Hit/miss result
    - Damage if hit (including critical if applicable)
  - Summary: total damage dealt
- [ ] Test: Full attack sequence from turn start to finish

**Edge Cases & Constraints:**
- [ ] Off-hand weapon must be smaller (light weapon), or off-hand penalty worse
- [ ] Cannot use same weapon twice (must be two different weapons for "dual wield", though two-handed grip on one weapon is allowed)
- [ ] Cannot use ranged weapon AND melee weapon in full attack (choose one or other)
  - Exception: swift-action attack (Rapid Shot, etc.) can be ranged while doing melee
  - Stub: resolve constraint if complex
- [ ] Weapon size affects damage and threat range
- [ ] Some weapons have special properties (reach, range, etc.)
- [ ] Test: Weapon constraints enforced
- [ ] Test: Invalid weapon combinations rejected

**Performance Optimization:**
- [ ] Iterative generation should be fast (<100ms for typical character with 2-4 attacks)
- [ ] Cache iterativ es if same character re-rolls without changing equipment/buffs
- [ ] Pre-calculation: store iteratives during turn setup, reuse in rolls
- [ ] Test: Generate iteratives for complex character (4 weapons, natural attacks, haste)
  - < 200ms total

**System Registration:**
- [ ] Register attack item type in `system.json`
- [ ] Add to CONFIG.Item.documentClasses: attack → ItemDnd35eAttack
- [ ] Add attack types to CONFIG.DND35E.attackTypes

**Localization & i18n:**
- [ ] Add i18n keys: Natural attack types (bite, claw, gore, slam, sting, tentacle)
- [ ] Add i18n keys: Attack type descriptors (natural, racial, extraordinary, supernatural)
- [ ] Add i18n keys: UI labels ("Full Attack", "Primary Attack", "Secondary Attack")
- [ ] Add i18n keys: Attack bonus descriptions ("Main-hand +N", "Off-hand +N", "Iterative +N")
- [ ] Update en.json

**Comprehensive Testing:**
- [ ] Unit test: AttackSystemModel instantiation
- [ ] Unit test: Attack bonus calculation (BAB + STR + modifiers)
- [ ] Unit test: Damage bonus calculation (half STR for secondary, etc.)
- [ ] Unit test: Iterative generation (main-hand only)
  - BAB 5 → one at +5
  - BAB 11 → three at +11, +6, +1
  - BAB 20 → four at +20, +15, +10, +5
- [ ] Unit test: Iterative generation (TWF)
  - Main-hand + off-hand at correct penalties
- [ ] Unit test: Iterative generation (natural attacks mixed)
  - Manufactured + natural all listed
- [ ] Unit test: Power Attack modifier
  - Attack reduced, damage increased correctly
- [ ] Unit test: Haste bonus attack
  - Extra attack at highest BAB

- [ ] Integration test: Create fighter with longsword (+11 BAB)
  - Full attack generates 3 iteratives
  - Roll each
  - Damage calculated
- [ ] Integration test: Create rogue with rapier + dagger (TWF)
  - Main-hand iteratives + off-hand iteratives
  - Penalties applied correctly
  - All attacks listed pre-dialog
- [ ] Integration test: Create monster with claws + bite (natural only, no manufactured)
  - 2-3 natural attacks per full-attack
  - All at BAB bonus
  - Correct damage for bites vs claws
- [ ] Integration test: Mixed attacks (goblin with scimitar + bite)
  - Manufactured weapon + natural attack
  - Natural marked secondary (-5 penalty noted)
  - Both appear in full-attack list
- [ ] Integration test: Power Attack applied
  - Reduce attack, boost damage
  - Applied to all or subset of iteratives
- [ ] Integration test: Haste buff + attacks
  - Bonus attack at highest BAB granted
  - Total iteratives increased
- [ ] Integration test: Full attack vs enemy
  - Roll attack 1: hit/miss shown
  - Roll attack 2: hit/miss shown
  - Damage summed
  - Chat card displays all
- [ ] Edge case: Two-weapon fighting without feat
  - Off-hand penalty harsher (-10 instead of -4)
  - Or feature flag on actor limits to one attack only
- [ ] Edge case: Ranged + melee weapons (invalid for full attack)
  - Error or warning: "Cannot mix ranged and melee in full attack"
- [ ] Edge case: Dual-wielding with same weapon (invalid)
  - Error: "Cannot wield same weapon twice"
- [ ] Edge case: Off-hand weapon too large
  - Error: "Off-hand weapon too large"
  - Or accept it with worse penalty
- [ ] Smoke test: Full combat encounter
  - Multiple characters doing full attacks
  - NPCs with natural attacks
  - All attack sequences resolve
  - No console errors
  - Damage applied correctly
- [ ] Performance test: 10 full attacks in sequence < 3 seconds
  - Iterative generation + rolling

**Documentation & User Guides:**
- [ ] Document natural attack types and standard damage
- [ ] Document how full attacks are generated and resolved
- [ ] Document two-weapon fighting rules (penalties, feats)
- [ ] Document Power Attack application to full attacks
- [ ] Document special attacks (Haste, Rapid Shot bonus attacks)
- [ ] Create journal entry: "Full Attacks"
- [ ] Create journal entry: "Natural Attacks"
- [ ] Create journal entry: "Two-Weapon Fighting"
- [ ] Reference table: iterative attacks by BAB
- [ ] Note limitations: Some advanced feat interactions deferred to Phase 26+
