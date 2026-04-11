# Phase 23: Enhancements

**Status**: 📖 Rough Sketch (350+ item checklist, weapon & armor enhancements)

> **Milestone**: Beta  
> **Dependencies**: Phase 15 (Equipment)  
> **Goal**: Weapon and armor enchantments as Active Effects (like Material). Enhancement bonuses to attack/damage flow through the AE pipeline into action formula contexts.

---

## 21.1 Enhancement Active Effect Type

```
EnhancementSystemModel extends Dnd35eActiveEffectSystemModel
├── enhancementType: 'weapon' | 'armor' | 'shield' | 'misc'
├── enhancementBonus: number (+1 through +5)
├── price: Price
├── specialAbilities: string[] ("flaming", "keen", "vorpal")
├── casterLevel: number
└── changes: auto-generated from enhancement data
```

## 21.2 Files to Create/Modify

## 21.2 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/activeEffects/enhancement/` |
| Modify | `system.json` — register enhancement effect type |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 23 has not started)

### ❌ Not Started (All Tasks for Phase 23)

**Enhancement Active Effect System Model:**
- [ ] Create `src/entities/activeEffects/enhancement/EnhancementSystemModel.mts` extending ActiveEffectSystemModel
- [ ] Define schema: enhancementType (StringField with choices: 'weapon', 'armor', 'shield', 'misc')
- [ ] Define schema: enhancementBonus (NumberField, 0-5, enhancement bonus value)
- [ ] Define schema: price (SchemaField with amount: NumberField, currency: "gp")
  - Enhancement price per D&D 3.5e pricing table:
    - +1: 1,000 gp base (weapon), 500 gp base (armor)
    - +2: 4,000 gp base
    - +3: 9,000 gp base
    - +4: 16,000 gp base
    - +5: 25,000 gp base
- [ ] Define schema: specialAbilities (ArrayField of StringField, list of special weapon abilities)
  - Example abilities: "flaming", "keen", "returning", "shock", "vorpal", "seeking", "smart", "dancing"
  - Armor abilities: "fortification", "ghost touch", "invulnerability", "spell resistance"
- [ ] Define schema: immediacy (StringField, "1/round" if ability has use limit, otherwise "always active")
- [ ] Define schema: casterLevel (NumberField, caster level of enhancement, min 3 × enhancement bonus)
- [ ] Define schema: identificationType (StringField, "identify", "spellcraft", "use", for identifying enchantment)
- [ ] Inherit from ActiveEffectSystemModel: duration, changes[], origin
- [ ] Test: EnhancementSystemModel instantiation

**Enhancement Active Effect Class:**
- [ ] Create `src/entities/activeEffects/enhancement/ActiveEffectDnd35eEnhancement.mts` extending ActiveEffectDnd35e
- [ ] Implement `getEnhancementDescription()`: human-readable enhancement description
  - Example: "+1 Flaming Longsword" or "+3 Full Plate of Spell Resistance"
- [ ] Implement `getPrice()`: return price of enhancement
- [ ] Implement `generateChanges()`: auto-generate AE changes from enhancement properties
  - Weapon enhancement: adds to attack/damage bonuses
  - Armor enhancement: adds to AC bonus
  - Shield enhancement: adds to shield AC bonus
  - Implement as buildChanges() Material pattern
- [ ] Test: Enhancement instantiation and properties

**Enhancement Sheet Component:**
- [ ] Create `src/vue/components/sheets/EnhancementSheetDnd35e.vue`
- [ ] Display enhancement properties: type, bonus, special abilities, price
- [ ] Show material and special ability icons
- [ ] List special abilities with descriptions
- [ ] GMs can edit special abilities
- [ ] Test: Enhancement sheet renders

**Weapon Enhancement Bonuses:**
- [ ] Weapon enhancement bonus: +1 to +5, applies to attack and damage rolls
- [ ] Attack bonus: 1d20 + BAB + DEX + weapon enhancement
- [ ] Damage bonus: damage roll + weapon enhancement (e.g., +1 to 1d8 becomes 1d8+1)
- [ ] Each enhancement requires new weapon (cost cumulative)
  - Example: +1 Longsword costs 1,000 + base weapon
  - Example: +2 Longsword costs 4,000 + base weapon
- [ ] Enhancement bonus cannot exceed +5
- [ ] Special abilities increase effective enhancement level:
  - Example: Flaming is +1 ability → +1 Flaming Longsword needs flaming added to +1 weapon
  - Effective level: +1 base + +1 flaming = +2 effective for pricing
  - Caster level: 8 min (3 × 1 + 1 = 4, round to 8)
- [ ] Formula integration:
  - Attack formula: "1d20 + #self.attackBonus + #Item.enhancement"
  - Damage formula: "#self.damageRoll + #Item.enhancement"
  - Implement as formula context variables (Phase 7)
- [ ] Test: +1 Longsword adds +1 to attack and damage
- [ ] Test: +3 weapon adds +3 to both

**Armor Enhancement Bonuses:**
- [ ] Armor enhancement bonus: +1 to +5, applies to AC
- [ ] AC bonus: 10 + armor bonus + shield bonus + enhancement bonus + DEX (capped) + dodge + size + deflection + untyped
- [ ] Each armor requires new armor (cumulative cost)
  - Example: +1 Full Plate: 500 gp enhancement + 1,500 gp base armor = 2,000 gp
  - Example: +3 Full Plate: 9,000 gp enhancement + 1,500 gp base armor = 10,500 gp
- [ ] Maximum enhancement: +5 AC bonus
- [ ] Formula integration:
  - AC formula: "10 + armor_bonus + shield_bonus + #Item.enhancement + ... "
- [ ] Test: +1 Full Plate improves AC by 1
- [ ] Test: +3 Armor improves AC by 3

**Shield Enhancement Bonuses:**
- [ ] Shield enhancement bonus: +1 to +5, applies to AC (like armor enchantment)
- [ ] Bonus applies when shield is equipped
- [ ] Formula integration: AC calculation includes shield enhancement
- [ ] Test: +1 Shield improves AC by 1 when equipped
- [ ] Test: +3 Shield improves AC by 3

**Special Weapon Abilities:**
- [ ] Define all D&D 3.5e special weapon abilities (partial list, full in Phase 27):
  1. **Flaming**: deals additional 1d6 fire damage each hit
  2. **Shock/Lightning**: deals additional 1d6 electrical damage each hit
  3. **Flaming Burst**: on critical hit, deals 2d6 fire damage instead of 1d6
  4. **Keen**: doubles the threat range (e.g., 19-20 becomes 17-20 for d20)
  5. **Returning**: thrown weapon returns to thrower without action
  6. **Frost**: deals additional 1d6 cold damage each hit
  7. **Ghost Touch**: can hit incorporeal creatures
  8. **Seeking**: ranged weapon can overcome concealment
  9. **Smart**: weapon can draw itself from sheath as free action
  10. **Dancing**: weapon can fight on its own (stub for Phase 26+)
  11. **Vorpal**: on natural 20, decapitate target (instant kill, most creatures)
  12. **Wounding**: dealt damage doesn't heal naturally
  - Full list: 27 listed in D&D 3.5e, others deferred to Phase 27
- [ ] Implement ability effects as AE changes:
  - Flaming: adds 1d6 fire damage to damage formula
  - Keen: modifier to critical threat range
  - Ghost Touch: corporeal strike conditional
  - Seeking: ignore concealment modifier
  - Vorpal: special critical effect (instant death on natural 20)
- [ ] Abilities have cost (gp) and caster level requirements
  - Flaming: +1 equivalent, CL 8
  - Keen: +1 equivalent, CL 6
  - Returning: +1 equivalent, CL 7
  - Vorpal: +5 equivalent, CL 18
- [ ] Multiple abilities can stack on same weapon
  - Cost additive: +1 Flaming Shock Longsword = +1 base + 1d6 fire + 1d6 electrical
  - Effective enhancement: +3 (for most purposes), price reflects all bonuses
- [ ] Test: Flaming ability adds fire damage
- [ ] Test: Keen doubles threat range
- [ ] Test: Vorpal instant kills on natural 20

**Special Armor Abilities:**
- [ ] Define D&D 3.5e special armor/shield abilities (partial list):
  1. **Fortification**: chance to ignore critical hits
     - Light: 25% ignore crit
     - Medium: 50% ignore crit
     - Heavy: 75% ignore crit
  2. **Ghost Touch**: can protect against incorporeal creatures (can be hit)
  3. **Invulnerability**: gain DR 10/magical (reduceslash/pierce, not critical feature, just descriptive)
  4. **Spell Resistance**: armor grants SR X (deferred to Phase 20+)
  5. **Acid Resistance**: take 50% damage from acid (damage type in Phase 20)
  6. **Fire Resistance**: take 50% damage from fire
  7. **Cold Resistance**: take 50% damage from cold
     - Lightning/Shock Resistance, Sonic Resistance also possible
  8. **Slick**: +5 escape artist checks, +2 to reflex saves vs movement impediment
  9. **Shadow**: wearer can become invisible 1/day (stub for Phase 26)
  10. **Wild**: wearer gains +2 climb/swim, can move at full speed while climbing
- [ ] Multiple armor abilities can stack
- [ ] Test: Fortification prevents critical hit damage
- [ ] Test: Ghost Touch works vs incorporeal creatures

**Special Ability Costs & Effectiveness:**
- [ ] Weapon ability costs (gp, minimum):
  - Flaming: +1,000 gp
  - Shock: +1,000 gp
  - Frost: +1,000 gp
  - Flaming Burst: +5,000 gp (more powerful)
  - Keen: +1,000 gp
  - Returning: +1,000 gp
  - Ghost Touch: +3,000 gp
  - Vorpal: +10,000 gp
  - (Full table in Phase 27)
- [ ] Armor ability costs (gp):
  - Fortification (light): +1,000 gp
  - Fortification (medium): +2,000 gp
  - Fortification (heavy): +3,000 gp
  - Ghost Touch: +3,000 gp
  - (Full table in Phase 27)
- [ ] Price calculator: total enhancement cost combines all abilities
- [ ] Test: Determine total cost of +1 Flaming Longsword
  - Base: 1,000 gp (+1 weapon)
  - Flaming: +1,000 gp
  - Total: +2,000 gp enhancement cost

**Weapon Ability Effects Integration:**
- [ ] Flaming/Shock/Frost: additional damage dice added to damage formula
  - Damage formula becomes: "1d8+1+1d6" (base + enhancement + ability)
  - Type: fire/electrical/cold (for resistances, Phase 20)
- [ ] Keen: critical threat range doubled
  - Modify critical formula: threat 20 becomes 19-20 (or 15-20 for already expanded range)
  - Damage formula unchanged, but crit on more rolls
- [ ] Returning: ranged weapon that returns is special
  - Not mechanically relevant for most purposes
  - Flavor: weapon returns to thrower each round if thrown
- [ ] Ghost Touch: can hit incorporeal creatures
  - Corporeal strike conditional: can damage incorporeal
  - Acts as "no damage reduction for incorporeality"
- [ ] Seeking: ranged weapon ignores concealment
  - Ignore 50% miss from concealment
  - Damage still dealt on hit
- [ ] Vorpal: natural 20 on attack = instant death (most creatures)
  - On natural 20 attack roll, creature fails Fort save vs death
  - Except: undead, constructs, swarms, creatures immune to critical hits
  - Instant death triggered
- [ ] Test: Attack with Flaming weapon, fire damage dealt
- [ ] Test: Attack with Keen weapon, crit on higher range
- [ ] Test: Attack with Vorpal on natural 20, creature dies (if not immune)

**Cursed Item Support (Phase 23 Extension):**
- [ ] Some items can be cursed (enchantments are malign)
- [ ] Cursed enhancement: hidden negative effect
  - Example: Cursed +1 Longsword deals extra damage but penalties to wearer
  - Example: Cursed Armor: -2 to AC (but wearer doesn't know)
- [ ] Identify cursed item: Identify spell (Phase 25) or Spellcraft check (DC 25)
- [ ] Remove cursed item:
  - Remove Curse spell needed
  - Or Dispel Magic (caster level check)
- [ ] Stub for Phase 23: Cursed item framework only
  - Full cursed item list in Phase 27

**POC Enhancement #1 - +1 Longsword:**
- [ ] Create enhancement: +1 Longsword
  - Type: weapon
  - Enhancement bonus: +1
  - Price: +1,000 gp (enhancement only, + base sword cost)
  - Caster level: 3
  - Changes: +1 attack, +1 damage
- [ ] Apply enhancement to weapon:
  - Weapon gains +1 attack/damage bonuses
  - Weapon type: longsword (from base weapon)
- [ ] Test: +1 Longsword in combat
  - Attack bonus +1
  - Damage +1

**POC Enhancement #2 - +1 Flaming Longsword:**
- [ ] Create enhancement: +1 Flaming Longsword
  - Type: weapon (composite, multiple abilities)
  - Enhancement bonus: +1 base
  - Special abilities: Flaming
  - Ability cost: +1,000 gp
  - Total cost: +2,000 gp enhancement
  - Price: +2,000 gp
  - Caster level: 8
  - Changes: +1 attack, +1 damage, +1d6 fire damage
- [ ] Test: +1 Flaming Longsword attacks
  - Base damage: 1d8+1
  - Plus fire damage: 1d6
  - Total: 1d8+1+1d6 damage

**POC Enhancement #3 - +2 Full Plate of Ghost Touch:**
- [ ] Create enhancement: +2 Full Plate of Ghost Touch
  - Type: armor
  - Enhancement bonus: +2 AC
  - Special abilities: Ghost Touch
  - Ability cost: +3,000 gp
  - Total cost: +9,000 gp (base +2 armor cost) + 3,000 gp ability = +12,000 gp
  - Price: +12,000 gp
  - Caster level: 11 (3 × 2 + 5 for ghost touch)
  - Changes: +2 AC, ghost touch (can protect vs incorporeal)
- [ ] Test: +2 Full Plate of Ghost Touch
  - AC increased by 2
  - Can protect against incorporeal creatures

**POC Enhancement #4 - +1 Keen Rapier:**
- [ ] Create enhancement: +1 Keen Rapier
  - Type: weapon
  - Enhancement bonus: +1
  - Special abilities: Keen
  - Ability cost: +1,000 gp
  - Total cost: +2,000 gp
  - Caster level: 6
  - Changes: +1 attack, +1 damage, critical threat 15-20 (doubled from 18-20)
- [ ] Test: +1 Keen Rapier
  - Threat range is 15-20 instead of normal 18-20
  - More likely to get critical hits

**Magical Weapon Interaction with Phase 1 Weapons:**
- [ ] Extension to weapon system (Phase 1):
  - Base weapons are non-magical
  - Enhancements make weapons magical
  - Magical weapons can overcome damage reduction
  - Magical weapon damage type: "magical" in addition to physical type (slash/pierce/blud)
- [ ] Formula: damage with magical modifier
  - Non-magical: "1d8+DEX"
  - Magical: "1d8+DEX" but counts as magical damage (overcomes DR/magic)
- [ ] Test: Magical weapon vs enemy with DR/magic
  - Damage applied (not reduced)
  - Non-magical weapon vs same enemy would be reduced

**Unidentified Item Support:**
- [ ] Unidentified enhanced items show generic description
  - "Magical Longsword" (unidentified)
  - "Magical Full Plate" (unidentified)
- [ ] Identify spell or Spellcraft check (DC 25 + caster level) reveals true enchantment
- [ ] Once identified: full enhancement details visible
- [ ] Test: Unidentified enhancement vs identified
  - Unidentified: generic name
  - Identified: +1 Flaming Longsword

**System Registration:**
- [ ] Register enhancement active effect type in `system.json`
- [ ] Add to CONFIG: enhancement abilities, costs, caster levels
- [ ] Add to CONFIG: weapon/armor enhancement types

**Localization & i18n:**
- [ ] Add i18n keys: Special weapon abilities (Flaming, Keen, etc.)
- [ ] Add i18n keys: Ability descriptions (what they do)
- [ ] Add i18n keys: Armor abilities
- [ ] Add i18n keys: Enhancement bonus labels
- [ ] Add i18n keys: Price labels
- [ ] Update en.json

**Comprehensive Testing:**
- [ ] Unit test: EnhancementSystemModel instantiation
- [ ] Unit test: Generate enhancement changes (Material pattern)
- [ ] Unit test: Price calculation for complex enhancement
- [ ] Integration test: Create +1 Longsword
  - Attack/damage bonuses applied
  - Weapon displays as magical
- [ ] Integration test: Create +1 Flaming Longsword
  - Base +1 applied
  - Fire damage added
  - Chat card shows both bonuses
- [ ] Integration test: Attack with Flaming weapon
  - Fire damage included in roll
  - Type noted
- [ ] Integration test: Attack with Keen weapon
  - Critical range expanded
  - More likely criticals
- [ ] Integration test: Attack with Vorpal on natural 20
  - Instant death triggered (if enemy not immune)
  - No damage roll needed
- [ ] Integration test: Armor enhancement
  - AC increased by enhancement bonus
  - Works with shield enhancement too
- [ ] Integration test: Multiple enhancements on weapon
  - All bonuses stack and apply correctly
- [ ] Integration test: Unidentified enhancement
  - Shows generic "Magical Item"
- [ ] Integration test: Identify enhancement
  - True details revealed
- [ ] Edge case: Enhancement that adds extra damage dice
  - Flaming adds 1d6 to weapon doing 1d8
  - Total damage: 1d8+enhancement+1d6, all tracked correctly
- [ ] Edge case: Ability with use limit (1/round, etc.)
  - Effect applied per round
  - Tracking limit (if complex, defer to Phase 26)
- [ ] Edge case: Weapon with multiple special abilities
  - All effects apply
  - Order of effect application doesn't matter
- [ ] Smoke test: Full combat with enhanced weapons
  - +1 weapons, +1 Flaming weapons, +2 Keen weapons
  - All damage types calculated c orrectly
  - No console errors
- [ ] Performance test: 20 enhanced items in use, < 50ms overhead per roll

**Documentation & User Guides:**
- [ ] Document enhancement bonuses: how they affect attack/AC
- [ ] Document special weapon abilities: what each does
- [ ] Document special armor abilities
- [ ] Create journal entry: "Magical Items"
- [ ] Create journal entry: "Weapon Enhancements"
- [ ] Create journal entry: "Armor Enhancements"
- [ ] Note limitations: Full ability list (27+) in Phase 27
