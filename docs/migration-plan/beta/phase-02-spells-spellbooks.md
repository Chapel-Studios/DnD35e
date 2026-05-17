# Beta Phase 2: Spells & Spellbooks (Full)

**Status**: 📖 Rough Sketch (200+ item checklist, spellbooks, spell slots)

> **Milestone**: Beta  
> **Dependencies**: Phase 7 (Roll Formulas), Phase 8 (Action System)  
> **Goal**: Spell item type, spellbook on actor, spell slots/preparation, single-target and touch attack spell chains. No AoE — that's Phase 18. No metamagic — that's Phase 17. Proves the core spell data model and cast action chain.

---

## 14.1 Spell Item Type

```
SpellSystemModel extends ItemSystemModelBase
├── level: number (0-9)
├── school: SpellSchool
├── subschool: string | null
├── components: { verbal, somatic, material, focus, divineFocus }
├── castingTime: string
├── range: string
├── area/effect/target: string | null
├── targetMode: 'creature' | 'area' | 'item-on-creature' | 'self' | null
├── itemTargetFilter: { itemTypes, equippedOnly } | null
├── duration: string
├── savingThrow: { type, harmless, dc: formula }
├── spellResistance: boolean
├── descriptors: string[]
├── damage: { formula, type } | null
├── healing: { formula } | null
├── spellbook: 'primary' | 'secondary' | 'tertiary' | 'spelllike'
├── prepared: boolean
└── source: string
```

## 14.2 Spellbook on Actor

```
SpellbookData:
├── enabled: boolean
├── castingType: 'prepared' | 'spontaneous' | 'hybrid'
├── ability: AbilityKey
├── casterLevel: number | formula
├── baseDC: formula
├── concentration: formula
├── slots: { [level: 0-9]: { max, value } }
├── class: string | null
└── spellPoints: null (reserved for Phase 24 psionics)
```

## 14.3 Casting Flow

1. Check: spell prepared / known + slot available
2. Consume spell slot
3. Roll attack if applicable
4. Roll damage/healing if applicable
5. Target saving throws
6. Post chat card
7. Apply effects to targets

*Note: Spell casting will eventually become an Action (Phase 8), but for now it's a method on the spell item.*

## 14.4 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/spell/` — class, data model, sheet |
| Expand | Actor data model — spellbook fields |
| Create | Vue spell sheet + spellbook tab on actor sheet |
| Modify | `system.json` — register spell type |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 16 has not started)

### ❌ Not Started (All Tasks for Phase 16)

**Spell Data Model & Schema:**
- [ ] Create `src/entities/items/spell/SpellSystemModel.mts` extending ItemSystemModelBase
- [ ] Define schema: level (NumberField, 0-9, represents spell circle/level)
- [ ] Define schema: school (StringField with choices: 'abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation', 'universal')
- [ ] Define schema: subschool (StringField or null, e.g., 'scrying' for divination)
- [ ] Define schema: components (SchemaField with verbal: boolean, somatic: boolean, material: boolean, focus: boolean, divineFocus: boolean)
- [ ] Define schema: castingTime (StringField, e.g., "1 standard action", "1 round", "1 minute")
- [ ] Define schema: range (StringField, e.g., "Personal", "Touch", "30 ft", "Unlimited")
- [ ] Define schema: area (StringField or null, e.g., "15-ft radius", "30-ft line")
- [ ] Define schema: effect (StringField or null, distinct from area, e.g., "one object")
- [ ] Define schema: target (StringField or null, e.g., "one creature", "up to 6 creatures")
- [ ] Define schema: targetMode (StringField with choices: 'creature', 'area', 'item-on-creature', 'self', or null — typed targeting mode that drives the execution pipeline. Distinct from the free-text SRD `target` field above.)
- [ ] Define schema: itemTargetFilter (SchemaField or null with itemTypes: ArrayField, equippedOnly: BooleanField — active when targetMode is 'item-on-creature')
- [ ] Define schema: duration (StringField, e.g., "1 minute", "1 hour", "1 round per level", "instantaneous", "permanent until dispelled")
- [ ] Define schema: savingThrow (SchemaField with type: 'fort'|'ref'|'will', harmless: boolean, dc: FormulaField)
- [ ] Define schema: spellResistance (BooleanField, true if SR applies)
- [ ] Define schema: descriptors (ArrayField of StringField, tags like 'fire', 'cold', 'light', 'darkness', 'acid', 'electricity', 'sonic', 'force', 'evil', 'good', 'chaotic', 'lawful')
- [ ] Define schema: damage (SchemaField or null with formula: FormulaField, type: DamageType)
- [ ] Define schema: healing (SchemaField or null with formula: FormulaField, note: healing doesn't have damage type)
- [ ] Define schema: spellbook (StringField with choices: 'primary', 'secondary', 'tertiary', 'spelllike' — which book is this spell in?)
- [ ] Define schema: prepared (BooleanField, true if prepared/known)
- [ ] Define schema: source (StringField, book reference)
- [ ] Add `identifiedName` and `unidentifiedName` fields (identified/unidentified spell knowledge)
- [ ] Test: SpellSystemModel instantiation
- [ ] Test: Schema validation (level 0-9, school in enum, etc.)

**Spell Item Class:**
- [ ] Create `src/entities/items/spell/ItemDnd35eSpell.mts` extending ItemDnd35e
- [ ] Implement `getDC()`: calculate spell DC = 10 + spell level + ability mod
  - Get casting ability from parent actor's spellbook
  - Calculate ability mod
  - Return 10 + spell level + ability mod
- [ ] Implement `canBeCast()`: check if spell can be cast right now
  - Check: spell is prepared (if prepared caster)
  - Check: spell slot available (not expended)
  - Check: not silenced/stunned/restrained (Phase 20)
  - Return boolean
- [ ] Implement `cast(options)`: async method to execute spell casting
  - Parameter: options = { targets: Token[], rollMode, fastForward }
  - Check canBeCast()
  - Show pre-cast dialog with DC calculation (similar to PreRollDialog from Phase 8)
  - Execute casting: trigger action chain for spell
  - Consume spell slot
  - Return result
- [ ] Generate default spell action from spell properties (Phase 8 integration planned for Phase 19)
  - For now, stub this as "casting action exists but is not full action system integration"
- [ ] Test: Spell instantiation
- [ ] Test: getDC() calculation
- [ ] Test: canBeCast() validation

**Spellbook Data Model on Actor:**
- [ ] Create `src/module/models/SpellbookData.mts` as a DataModel
- [ ] Define schema: enabled (BooleanField, true if spellcasting class)
- [ ] Define schema: castingType (StringField with choices: 'prepared', 'spontaneous', 'hybrid')
- [ ] Define schema: ability (StringField referencing ability key: 'int', 'wis', 'cha', or other)
- [ ] Define schema: casterLevel (FormulaField, e.g., "#self.class.wizard.level" or just "3" for fixed level)
- [ ] Define schema: baseDC (FormulaField, e.g., "10 + spell level + #self.abilities.int.mod")
- [ ] Define schema: concentration (FormulaField, e.g., "#self.attributes.concentration.total" or stub if Phase 20 not done)
- [ ] Define schema: slots (SchemaField with numeric keys 0-9, each containing {max, value})
- [ ] Define schema: class (StringField, which class provides spellcasting, e.g., "wizard", "cleric", "sorcerer")
- [ ] Test: SpellbookData instantiation
- [ ] Test: Spell slots structure valid

**Spellbook Integration into Actor:**
- [ ] Modify ActorSystemModel: add spellbooks field (ArrayField of EmbeddedDataField(SpellbookData))
- [ ] Allow multiple spellbooks on actor: primary, secondary, tertiary (for different classes)
- [ ] Default: one spellbook on actor creation (disabled until class set)
- [ ] Implement actor method: `getSpellbook(id)`: returns SpellbookData for spellbook
- [ ] Implement actor method: `castSpell(spellId, targets)`: routes to spell item's cast() method
- [ ] Test: Actor with spellbook instantiated
- [ ] Test: Spellbook fields accessible

**Spell Slots Management:**
- [ ] On class level change with spellcasting (Phase 16 Spells just stubs, defer detailed rules to Phase 19 Beta):
  - Fetch spellcasting table from class (stub for now, Phase 19 fills in with table)
  - Populate spellbook.slots with max values for new level
  - Mark all slots as unfilled (value = 0 if prepared, value = max if spontaneous)
- [ ] Implement spell slot consumption: when spell cast, reduce slot.value
- [ ] Implement spell slot recovery: rest resets slots
- [ ] For prepared casters: mark which spells are prepared (not automatic)
- [ ] For spontaneous casters: all spells of known level available, just limited by slot count
- [ ] Test: Add Wizard class → spellbook enabled with slots populated
- [ ] Test: Cast 1st-level spell → 1st-level slot consumed
- [ ] Test: Cast another 1st-level → second slot consumed
- [ ] Test: Try to cast with no slots → error/warning

**Spell Sheet (Vue Component):**
- [ ] Create `src/vue/components/sheets/SpellSheetDnd35e.vue` extending base item sheet
- [ ] Implement tabs: Details, Components, Effects, Description
- [ ] **Details tab**: level (dropdown 0-9), school (dropdown), subschool, castingTime, range, target/area/effect, duration
- [ ] Show DC formula with example calculation (e.g., "DC 14 = 10 + 1 (level) + 3 (INT mod)")
- [ ] Show spell resistance checkbox
- [ ] Add descriptors selector (multi-checkbox)
- [ ] **Components tab**: verbal/somatic/material/focus/divine focus checkboxes
- [ ] If material component: show description/cost (e.g., "powdered diamond, 100 gp")
- [ ] If focus: description
- [ ] **Effects tab**: Damage formula (if damaging spell), healing formula (if healing), saving throw type and DC formula
- [ ] **Description tab**: Rich text editor for spell description
- [ ] Show prepared checkbox (for prepared casters)
- [ ] Spellbook selector (if multiple spellbooks)
- [ ] Implement i18n for all labels
- [ ] Test: Spell sheet renders all tabs
- [ ] Test: Can edit spell properties
- [ ] Test: Changes persist on save

**Actor Sheet - Spellbook Tab:**
- [ ] Create new actor sheet tab: "Spellbooks" (or "Magic")
- [ ] Display each spellbook on actor
- [ ] For each spellbook: show name, casting type, ability used, caster level
- [ ] Display spell slots organized by level: 0 | 1st | 2nd | 3rd | ... | 9th
- [ ] For each slot level, show UI: [●●●●○] (filled/unfilled circles representing slots)
- [ ] Color-code: filled circle = slot available, empty circle = slot expended
- [ ] Click slot circle to toggle (recover/expend manually, or disable this for automated recovery after rest)
- [ ] List all spells organized by level under each spellbook
- [ ] For each spell: show name, checkbox "prepared" (for prepared casters), checkbox "known" (for spontaneous, always checked), cast button
- [ ] Click cast button → open spell casting dialog (pre-roll, target selection, DC calculation)
- [ ] Drag-drop support: add spell from compendium to spellbook tab
- [ ] Test: Spellbook tab renders
- [ ] Test: Spell slots display correctly
- [ ] Test: Can mark spell as prepared/known
- [ ] Test: Cast button visible

**Spell Casting Dialog:**
- [ ] Create `src/vue/components/combat/SpellCastingDialog.vue` extending VueAppBaseMixin(ApplicationV2)
- [ ] Show spell name, level, DC, casting time
- [ ] Display components: "Verbal, Somatic, Material (powdered diamond, 100 gp)"
- [ ] Show casting ability used (e.g., "Uses INT mod for DC")
- [ ] Calculate and display DC: "DC 14 (10 + level 1 + INT mod +3)"
- [ ] Target selection UI (if spell targets): "Select target" or multi-target select
- [ ] If spell has save: "Target gets WillSave DC 14 to avoid"
- [ ] If spell has SR: checkbox "Attempt to overcome SR?"
- [ ] If spell has material component cost: warning "Material cost: 100 gp"
- [ ] Roll mode selector (Public, GM, Blind, Self)
- [ ] Concentration check indicator (stub for Phase 20, show it will require concentration check)
- [ ] Fast-forward button: skip all dialogs
- [ ] Cancel / Cast buttons
- [ ] Test: Dialog opens when cast clicked
- [ ] Test: DC calculated correctly
- [ ] Test: Target selection works
- [ ] Test: Cast button executes spell

**Spell Casting Execution:**
- [ ] Implement basic spell casting pipeline:
  1. Check spell can be cast (canBeCast())
  2. Roll spell attack or save (if applicable)
  3. Roll damage or healing
  4. Resolve effects (apply damage/heal to target)
  5. Consume spell slot
  6. Post chat card with results
- [ ] For attack spells (touch, ranged touch, etc.):
  - Roll attack vs target AC/touch AC
  - If hit: roll damage
  - If miss: no damage
- [ ] For save spells:
  - Target rolls saving throw vs spell DC
  - If success & harmless: no effect (if harmful: reduced effect or negated)
  - If fail: apply full effect
- [ ] For instant effect spells (no save):
  - Apply effect directly (e.g., healing, buff)
- [ ] Post chat card with spell name, caster, targets, DC, roll results, damage dealt
- [ ] Test: Attack spell workflow (spell attack → hit/miss → damage if hit → chat card)
- [ ] Test: Save spell workflow (spell attack → target save → effect application → chat card)
- [ ] Test: Instant effect spell (apply immediately → chat card)

**Spell Slot Recovery (Rest):**
- [ ] Implement rest action on actor
- [ ] On complete rest:
  - Reset all spell slots to max
  - If prepared caster: reset prepared spells to empty (player must re-prepare)
  - If spontaneous caster: re-populate known spells (automatic)
  - Update UI
- [ ] Test: Expend spell slots → rest → slots reset
- [ ] Test: Prepared spells cleared on rest (require re-preparation)
- [ ] Test: Spontaneous spells remain known after rest

**POC Spell Content - Cantrips (Level 0):**
- [ ] Create Light spell: level 0, evocation, range "touch", duration "until dispelled", effect: "creates light in 20-ft radius"
  - No damage, no save, no SR, no cost
- [ ] Create Mage Hand spell: level 0, transmutation, range "30 ft", duration "concentration or 1 minute"
  - No damage, utility effect
- [ ] Create Create Water spell: level 0, abjuration
- [ ] Create Detect Magic spell: level 0, divination
- [ ] Create Prestidigitation spell: level 0, universal, utility
- [ ] Test: Cantrips display at level 0
- [ ] Test: Can be cast unlimited times (no slot consumption)

**POC Spell Content - 1st Level:**
- [ ] Create Magic Missile spell: level 1, evocation
  - Damage formula: "1d4 + 1 per caster level (max 5)"
  - Type: force damage
  - Target: "up to 5 creatures, one missile per creature"
  - No save, no SR
  - Stub: currently assume single target, full feature in Phase 18 AoE
- [ ] Create Mage Armor spell: level 1, conjuration
  - No effect here (Phase 20 Buffs), but spell exists
- [ ] Create Burning Hands spell: level 1, evocation, fire descriptor
  - Damage formula: "1d4 per caster level (max 5d4)"
  - Fire damage
  - Stub: assume single target, AoE in Phase 18
  - Reflex save DC [formula] for half damage
- [ ] Create Cure Light Wounds spell: level 1, conjuration, healing
  - Healing formula: "1d8 + 1 per 2 caster levels"
  - Touch range
  - Instantaneous duration
  - Harmless save (target doesn't object to being healed)
- [ ] Create Magic Weapon spell: level 1, transmutation — **item-targeting POC**
  - Target: one weapon (effect.target: 'item-on-creature', itemTargetFilter: { itemTypes: ['weapon'], equippedOnly: true })
  - Duration: "1 min/level"
  - Effect: creates a buff AE on the target weapon with +1 enhancement bonus to attack and damage
  - AE uses `bonusType: 'enhancement'`, `transfer: true` (flows to actor's attacks)
  - No save, no SR
  - Proves the full item-on-creature targeting pipeline: cast → select token → item picker (equipped weapons) → AE on weapon
  - Proves dual-stack interaction: if weapon has hidden enhancement, Magic Weapon's +1 is suppressed in real stack but visible in masked stack (see Phase 2 §2.5.2)
- [ ] Test: Add Wizard with these spells
- [ ] Test: Prepare spell → can cast
- [ ] Test: Cast Magic Missile → damage roll, hit applied
- [ ] Test: Cast Cure Light Wounds → healing applied
- [ ] Test: Cast Magic Weapon → select target token → item picker shows equipped weapons → select weapon → +1 enhancement AE applied to weapon
- [ ] Test: Magic Weapon AE transfers to actor: attack bonus includes +1 enhancement
- [ ] Test: Magic Weapon on secretly +2 weapon: real stack uses +2 (hidden wins), masked stack shows +1 (player's Magic Weapon)

**POC Spell Content - Cantrip No-Slot Rule:**
- [ ] Implement special rule: level 0 spells don't consume slots
- [ ] When casting cantrip: don't deduct from slot.value
- [ ] Test: Cast Light cantrip → no slot consumed
- [ ] Test: Cast 5times → still castable (no limit)

**System Registration & Config:**
- [ ] Register spell item type in `system.json`
- [ ] Add to CONFIG.Item.documentClasses: spell → ItemDnd35eSpell
- [ ] Add to CONFIG.DND35E.itemTypes: spell with icon
- [ ] Add spell schools to CONFIG: dnd35e.spellSchools.*
- [ ] Add spell descriptors to CONFIG: dnd35e.spellDescriptors.*
- [ ] Create compendium pack stub: `dnd35e.spells` (populated in Phase 26)
- [ ] Add i18n keys: dnd35e.spellSchools.*, dnd35e.spellDescriptors.*
- [ ] Update en.json

**Localization & i18n:**
- [ ] Add i18n keys: Spell schools (abjuration, conjuration, etc.)
- [ ] Add i18n keys: Spell descriptors (fire, cold, electricity, etc.)
- [ ] Add i18n keys: Spell names (Magic Missile, Light, etc.)
- [ ] Add i18n keys: Spellsheet labels (castingTime, spellResistance, component descriptions)
- [ ] Add i18n keys: Casting type (prepared, spontaneous, hybrid)
- [ ] Update en.json

**Comprehensive Testing:**
- [ ] Unit test: SpellSystemModel instantiation with various spells
- [ ] Unit test: Spell DC calculation (10 + level + ability mod)
- [ ] Unit test: canBeCast() validation (prepared check, slot available)
- [ ] Unit test: Spell slot consumption (expend slot, value decreases)
- [ ] Integration test: Create Wizard character with spellbook
  - Spellbook enabled with appropriate slots
  - Can prepare spells
  - Can cast prepared spells
- [ ] Integration test: Cast Magic Missile
  - Pre-roll dialog shows DC
  - Damage calculated
  - Target takes damage
  - Chat card posted
  - Slot consumed
- [ ] Integration test: Cast Burning Hands with save
  - Pre-roll dialog shows DC
  - Target rolls save
  - If fail: full damage
  - If success: half damage (or negates if allowed by spell)
  - Chat card shows save result
- [ ] Integration test: Cast cantrip Light
  - No slot consumed
  - Can cast multiple times
- [ ] Integration test: Expend spell slots, rest, slots recover
- [ ] Integration test: Prepared caster
  - Prepare specific spells
  - Only prepared spells available to cast
  - Rest clears prepared list (must re-prepare)
- [ ] Integration test: Spontaneous caster (stub, real spellcasting table in Phase 19)
  - All spells of known level available
  - Slots limited by class table
  - Rest recovers all slots
- [ ] Edge case: Try to cast spell with material component cost
  - Warning shown: "This spell requires powdered diamond (100 gp)"
  - Can proceed or cancel
- [ ] Edge case: Try to cast spell with insufficient slots
  - Error: "No 1st-level spell slots available"
  - Cannot proceed
- [ ] Edge case: Multiple saves on single spell (not current scope, but testable)
  - If Phase 18 AoE implemented: multi-target spell, each target rolls separate save
- [ ] Smoke test: Full spellcasting encounter (Wizard casts spells multiple times, takes damage, recovers)
  - No console errors
  - Spells execute correctly
  - Slots consumed and recovered correctly
- [ ] Performance test: Load 100 spells in compendium, open spellbook tab < 500ms

**Documentation & User Guides:**
- [ ] Document spell mechanics: casting, saving throws, spell resistance
- [ ] Document prepared vs spontaneous casting
- [ ] Document spell slot system and recovery
- [ ] Create journal entry: "Spellcasting Basics"
- [ ] Create journal entry: "Spell Slots & Preparation"
- [ ] Note limitations: AoE deferred to Phase 18, metamagic deferred to Phase 17
