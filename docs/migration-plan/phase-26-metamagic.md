# Phase 26: Metamagic

**Status**: 📖 Rough Sketch (200+ item checklist, metamagic feats, PreRollDialog)

> **Milestone**: Beta  
> **Dependencies**: Phase 10 (Features & Feats), Phase 16 (Spells POC)  
> **Goal**: Metamagic feats that modify spells at cast time. Metamagic feats follow the feat item type from Phase 10 and use the Material AE pattern + EffectTrigger system from Phase 8 to modify spell action chains. Prepared casters apply metamagic at preparation time (increasing slot level); spontaneous casters apply at cast time (increasing casting time).

---

## 17.1 Metamagic as Feat + EffectTrigger

Metamagic feats are `feat` items (Phase 10) with a `metamagic` subtype. They use the existing EffectTrigger mechanism (Phase 8, §18.10) to modify spell actions:

```typescript
// Empower Spell feat
{
  type: "feat",
  system: {
    featType: "metamagic",
    metamagic: {
      levelAdjustment: 2,  // +2 spell levels
      trigger: {
        event: "onSpellCast",
        filter: { hasVariableDamage: true },
        modify: {
          // Multiply variable numeric effects by 1.5
          "action.damage.multiplier": 1.5,
        },
      },
    },
  },
}
```

## 17.2 Application Timing

| Caster Type | When Applied | Effect |
|-------------|-------------|--------|
| **Prepared** (Wizard, Cleric) | Spell preparation | Occupies higher-level slot. No cast-time change. |
| **Spontaneous** (Sorcerer, Bard) | Cast time | Uses higher-level slot AND increases casting time to full-round action. |

## 17.3 PreRollDialog Integration

When casting a spell, the PreRollDialog (Phase 8, §18.8) offers available metamagic feats as toggles:

- Each metamagic feat appears as a checkbox/toggle
- Shows the spell level adjustment cost
- Shows available slots at the adjusted level
- Multiple metamagic feats can stack (levels add)

## 17.4 Core Metamagic Feats

| Feat | Level Adj | Effect |
|------|-----------|--------|
| Empower Spell | +2 | All variable numeric effects increased by 50% |
| Maximize Spell | +3 | All variable numeric effects maximized |
| Extend Spell | +1 | Duration doubled |
| Enlarge Spell | +1 | Range doubled (for ranged spells) |
| Heighten Spell | varies | Spell treated as higher level for DCs and effects |
| Silent Spell | +1 | No verbal component |
| Still Spell | +1 | No somatic component |
| Quicken Spell | +4 | Cast as swift action |

## 17.5 Files to Create/Modify

| Action | Path |
|--------|------|
| Expand | `src/module/data/item/feat.mts` — add `metamagic` subtype with `levelAdjustment`, trigger config |
| Expand | `src/module/actions/execution-engine.mts` — metamagic modifier application during spell chains |
| Create | `packs/_source/feats/metamagic/` — SRD metamagic feat entries |
| Expand | PreRollDialog — metamagic toggle UI for spell casts |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 17 has not started)

### ❌ Not Started (All Tasks for Phase 17)

**Metamagic Feat Type Definition:**
- [ ] Extend FeatSystemModel in `src/entities/items/feat/FeatSystemModel.mts`
- [ ] Add field: `featType` should accept value "metamagic" (enum check: "class", "race", "metamagic", "other")
- [ ] Add field under metamagic subtype: `levelAdjustment` (NumberField, 0+, default 0, represents spell level increase)
- [ ] Add field: `target` (StringField, "self" or "spell", indicates what the metamagic applies to)
- [ ] Add field: `prerequisite` (StringField or null, e.g., "Spellcraft 5 ranks" — informational only in Phase 17)
- [ ] Test: FeatSystemModel accepts featType "metamagic"
- [ ] Test: metamagic.levelAdjustment field present and validates numeric

**PreRollDialog Metamagic Integration:**
- [ ] Locate PreRollDialog in Phase 8 (`src/vue/components/combat/PreRollDialog.vue`)
- [ ] Add new section: "Metamagic" beneath Power Attack/Combat Expertise section
- [ ] Identify available metamagic feats on caster:
  - Query actor items with type "feat" and system.featType "metamagic"
  - Filter: only include if caster has sufficient spell slots at adjusted level
  - For prepared casters: always available (preparation time applies them)
  - For spontaneous casters: filter by available slots
- [ ] UI for each metamagic feat:
  - Checkbox toggle (unchecked by default)
  - Feat name + icon
  - Show: "+N spell levels" (levelAdjustment)
  - Show: "Available slots" at adjusted level (e.g., "2nd-level: 3 available")
  - If no slots at adjusted level: disable checkbox with tooltip "Insufficient slots"
- [ ] Support multi-select: allow stacking multiple metamagic feats
  - Display running total of level adjustment (e.g., "+2 Empower +1 Extend = +3 total")
  - Recalculate available slots for adjusted level on each toggle
  - Warn if total adjustment exceeds 10 (arbitrary D&D 3.5e soft limit)
- [ ] When casting, pass selected metamagic feats to spell execution engine
- [ ] Test: Open PreRollDialog for spell cast
- [ ] Test: Available metamagic feats displayed
- [ ] Test: Can select/deselect metamagic
- [ ] Test: Level adjustment total displayed correctly
- [ ] Test: Disabled state for insufficient slots

**Spell Action Chain Metamagic Application:**
- [ ] Locate ActionExecutionEngine in `src/module/actions/ActionExecutionEngine.mts`
- [ ] Modify spell casting flow:
  1. Before action chain execution: check if metamagic feats selected
  2. For each selected metamagic: apply modifiers to action chain
  3. Execute modified action chain
- [ ] Implement metamagic modifier application:
  - **Empower Spell**: damage formula modifier (×1.5)
    - Before rolling damage: multiply damage die (1d6 → 1d6×1.5, truncate)
    - Doesn't affect fixed damage (flat bonuses not affected)
  - **Maximize Spell**: variable dice maximized
    - Replace 1dN with max roll value (e.g., 1d6 becomes 6, 2d6 becomes 12)
    - Apply before roll evaluation
  - **Extend Spell**: duration× 2
    - Modify action's duration field (e.g., "1 hour" becomes "2 hours", "1d4 minutes" becomes "2d4 minutes")
    - If duration is "instantaneous": no change
  - **Enlarge Spell**: range ×2 (ranged spells only)
    - Check spell's range field
    - If range is distance (e.g., "30 ft"): double it ("60 ft")
    - If range is "Close/Medium/Long": leave unchanged
  - **Silent Spell**: remove verbal component requirement
    - Set `spell.system.components.verbal = false` (for display only)
    - Note: functional silencing in Phase 20
  - **Still Spell**: remove somatic component requirement
    - Set `spell.system.components.somatic = false` (for display only)
  - **Quicken Spell**: reduce casting time
    - Change casting time to "swift action" (even if spell normally full-round)
    - Used in Phase 9 turn budget for action economy
  - **Heighten Spell**: spell treated as higher level
    - Increase spell.system.level by chosen amount (1, 2, 3, etc.)
    - Affects DC, slot consumption, and SRD rules
- [ ] Store selected metamagic on action data (for chat card reference)
- [ ] Test: Apply Empower to damage spell, verify ×1.5 damage
- [ ] Test: Apply Maximize to 2d6 damage, verify 12 rolled
- [ ] Test: Apply Extend to 1 hour duration, verify shows 2 hours
- [ ] Test: Apply Enlarge to 30 ft range, verify 60 ft
- [ ] Test: Apply Heighten to base 1st-level spell, verify treated as 2nd-level

**Spell Slot Adjustment for Metamagic:**
- [ ] Implement slot consumption logic:
  - **Prepared casters**: metamagic applied at preparation time
    - When preparing spell with metamagic: consume slot at adjusted level (e.g., Fireball with Empower uses 4th-level slot)
    - Display: "Fireball (Empowered) preps as 4th-level"
  - **Spontaneous casters**: metamagic applied at cast time
    - When casting: consume slot at adjusted level
    - Automatically uses higher-level slot (no preparation needed)
- [ ] Check available slots before allowing cast:
  - Sum selected metamagic levelAdjustments
  - Calculate target level = spell base level + total adjustment
  - If target level > 9: error "Adjusted spell level exceeds 9"
  - If no slots at target level: error "No slot available at adjusted level"
- [ ] Consume correct slot in actor.spellbook.slots[targetLevel]
- [ ] Test: Spontaneous caster with Empower Spell, cast 1st-level with Empower
  - Costs 2nd-level slot (base 1 + adjustment 1)
- [ ] Test: Prepared caster with Empower Spell, prepare 1st-level with Empower
  - Preparation occupies 2nd-level slot
  - Spell marked as prepared with Empower notation
- [ ] Test: Try to use metamagic beyond available slots
  - Error prevents casting

**Metamagic Feat POC - Empower Spell:**
- [ ] Create feat item: Empower Spell
  - Type: feat, featType: "metamagic"
  - levelAdjustment: 2
  - Description: "Increase all variable, numeric effects by 50%"
  - Prerequisite: "Spellcraft 5 ranks" (informational)
  - Icon: fire/orange color
- [ ] Add to feat compendium pack
- [ ] Test: Empower Spell feat exists on actor
- [ ] Test: When casting damaging spell, Empower applies ×1.5 multiplier

**Metamagic Feat POC - Maximize Spell:**
- [ ] Create feat item: Maximize Spell
  - Type: feat, featType: "metamagic"
  - levelAdjustment: 3
  - Description: "All variable numeric effects are maximized"
  - Icon: star/max color
- [ ] Test: Maximize Spell feat on actor
- [ ] Test: When casting damage spell, variable dice become max (1d6 → 6)

**Metamagic Feat POC - Extend Spell:**
- [ ] Create feat item: Extend Spell
  - Type: feat, featType: "metamagic"
  - levelAdjustment: 1
  - Description: "Double the duration of spell effects"
  - Icon: hourglass color
- [ ] Test: Extend Spell feat on actor
- [ ] Test: When casting duration spell, duration doubled in chat card

**Metamagic Feat POC - Quicken Spell:**
- [ ] Create feat item: Quicken Spell
  - Type: feat, featType: "metamagic"
  - levelAdjustment: 4
  - Description: "Cast spell as swift action"
  - Icon: lightning/speed color
  - Note: Phase 9 turn budget integration (swift action budget)
- [ ] Test: Quicken Spell feat on actor
- [ ] Test: When casting, spell casting time becomes "swift action"
- [ ] Test: Phase 9 turn budget respects swift action economy (if Phase 9 has metamagic integration)

**Chat Card Integration:**
- [ ] Modify spell chat card (from Phase 16) to display applied metamagic
  - Show "Magic Missile (Empowered, Maximized)" in card header
  - List metamagic effects in card body (e.g., "Empower: +50% damage")
  - Show adjusted spell level used for slot consumption
  - Display final damage roll (after metamagic application)
- [ ] Test: Cast spell with multiple metamagic, chat card shows all
- [ ] Test: Damage values in card reflect metamagic modifiers

**Prepared vs Spontaneous Timing:**
- [ ] **Prepared Caster Integration (Phase 12 compatibility)**:
  - On profession tab: when preparing spells, show metamagic toggles
  - Select metamagic at prep time
  - Spell marked as "Prepared with Empower" or similar
  - Slot cost adjusted at prep, not cast
  - At cast time: no metamagic dialog (already prepared)
- [ ] **Spontaneous Caster Integration (Phase 12 compatibility)**:
  - On spellbook tab: metamagic toggles appear in PreRollDialog only
  - Applied at cast time, not prep
  - Slot cost adjusted at cast time
  - Multiple casts of same spell can use different metamagic
- [ ] Test: Wizard (prepared) prepares Fireball with Empower, consumes 4th-level slot
  - Spell shows as "prepared with Empower"
- [ ] Test: Sorcerer (spontaneous) casts Fireball with Empower, consumes 2nd-level slot at cast
- [ ] Test: Sorcerer casts same Fireball again WITHOUT Empower, consumes 1st-level slot

**Stacking Rules:**
- [ ] Support multiple metamagic on single spell
  - Level adjustments stack additively
  - Each modifier applied in order (Empower then Maximize, etc.)
  - Order of application matters for some (Maximize then Empower = max then +50% is redundant)
- [ ] For Empower + Maximize on damage: apply Maximize first (get max dice), then Empower multiplies it
  - Example: 1d6 damage
    - Maximize: 6
    - Empower: 6 × 1.5 = 9
- [ ] Cumulative level adjustment displayed (e.g., "+2 Empower +1 Extend = +3")
- [ ] Test: Apply Empower + Extend to spell, shows "+3 total levels"
- [ ] Test: Apply Empower + Maximize to damage spell, Maximize runs first, then Empower
- [ ] Test: Multiple metamagic on same spell slots correctly

**Spell Slot Exhaustion Edge Cases:**
- [ ] If actor has only one 4th-level slot and casts 1st-level spell with Heighten +3:
  - Metamagic requires 4th-level slot
  - Costs that single 4th-level slot
  - Slot now expended
- [ ] If actor tries to apply Heighten +10 (beyond 9th level):
  - Error: "Heightened spell level exceeds maximum (9)"
  - Cannot proceed
- [ ] Prepared caster tries to prepare spell with metamagic at non-existent slot level:
  - Error during preparation prep dialog
  - Warning: "No slots available at adjusted level"
- [ ] Test: Edge case — apply excessive metamagic
- [ ] Test: Edge case — run out of slots during metamagic cast

**System Configuration:**
- [ ] Register metamagic feat instances in CONFIG.DND35E.metamagicFeats (optional, for quick reference)
- [ ] Add metamagic feat icons to CONFIG.DND35E.metamagicIcons (for UI)
- [ ] Add i18n keys for each metamagic feat name and description

**Localization & i18n:**
- [ ] Add i18n keys: Metamagic feat names (Empower Spell, Maximize Spell, etc.)
- [ ] Add i18n keys: Metamagic descriptions
- [ ] Add i18n keys: UI labels ("Metamagic Feats", "+N spell levels", "Available slots")
- [ ] Add i18n keys: Error messages ("Insufficient slots", "Spell level exceeds 9")
- [ ] Update en.json with all keys

**Comprehensive Testing:**
- [ ] Unit test: FeatSystemModel supports metamagic type
- [ ] Unit test: levelAdjustment field validation
- [ ] Unit test: Metamagic modifier application (Empower ×1.5, Maximize to max, etc.)
- [ ] Integration test: Create character with Empower Spell feat
- [ ] Integration test: Cast 1st-level spell with Empower
  - PreRollDialog shows Empower toggle
  - Can select Empower
  - Costs 2nd-level slot
  - Damage is ×1.5 original
  - Chat card shows "Empowered"
- [ ] Integration test: Cast 1st-level with Empower + Maximize
  - Level cost: 1 + 2 + 3 = 6 (exceeds 9, should error or auto-select lower combo)
  - Actually: Empower +2, Maximize +3 = +5 total, so 1+5=6th-level spell
  - Costs 6th-level slot
  - Damage is maximized, then ×1.5
- [ ] Integration test: Prepared caster prepares Fireball with Empower
  - Preparation UI shows metamagic toggles
  - Selecting metamagic during prep locks slot level
  - Prepared spell marked "with Empower"
  - At cast time: no metamagic dialog, uses prepared modifiers
- [ ] Integration test: Spontaneous caster casts two instances of Fireball, one with Empower, one without
  - First cast: PreRollDialog shows Empower, costs 2nd-level slot
  - Second cast: PreRollDialog shows Empower, but spontaneous can cast both with different metamagic
  - If sorcerer has multiple 2nd-level slots: both can use Empower
- [ ] Edge case: Try to apply Heighten +10 to cantrip
  - Error: "Adjusted level 10 exceeds maximum 9"
- [ ] Edge case: Apply metamagic with no slots at adjusted level
  - Error: "No spell slots available at [adjusted-level] level"
- [ ] Edge case: Apply Extend Spell to instantaneous-duration spell
  - No effect (duration already instantaneous)
  - Spell can still be cast with Extend, just doesn't change duration
- [ ] Edge case: Apply Enlarge to self-target spell
  - No effect (range doesn't change)
- [ ] Smoke test: Full spellcasting encounter with metamagic
  - Sorcerer casts spells with various metamagic combinations
  - No console errors
  - Slots consumed correctly
  - Damage/effect values calculated correctly
- [ ] Performance test: Load 50 metamagic feats, open PreRollDialog < 300ms

**Documentation & User Guides:**
- [ ] Document metamagic system: how to apply, slot costs, timing (prepared vs spontaneous)
- [ ] Document each POC metamagic feat: effect, level adjustment, prerequisite
- [ ] Create journal entry: "Metamagic Feats"
- [ ] Note limitations: Full metamagic feat list (17 feats total) deferred to Phase 19
