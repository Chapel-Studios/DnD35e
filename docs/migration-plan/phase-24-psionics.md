# Phase 24: Psionics

**Status**: 📖 Rough Sketch (250+ item checklist, power points, augmentation)

> **Milestone**: Beta  
> **Dependencies**: Phase 16 (Spells)  
> **Goal**: Psionic powers as a variant of the spell system, with power points, augmentation, and psionic schools. Manifesting a power is an action chain via the Action System.

---

## 15.1 Power Item Type (or Spell Subtype)

D35E treated them the same item with an `isPsionic` flag. Keep the `isPsionic` flag approach on the item system model base and extend the spell system:

```
When isPsionic = true on a spell:
├── Uses power points instead of spell slots
├── school → psionic discipline (Clairsentience, Metacreativity, Psychokinesis, Psychometabolism, Psychoportation, Telepathy)
├── Augmentation: spend extra PP for scaling effects
├── Display: visual, auditory, mental, olfactory (instead of V/S/M)
```

## 15.2 Spellbook Extension

```
SpellbookData.spellPoints: { max: number, value: number } | null
  ← Enabled for psionic spellbooks
  ← Max PP derived from manifester level + ability mod
```

## 15.3 Files to Create/Modify

| Action | Path |
|--------|------|
| Expand | Spell data model — psionic variant fields |
| Expand | Spellbook data — power point tracking |
| Create | `src/constants/psionics.mts` — disciplines, display types |
| Expand | Actor sheet — psionic power list on spellbook tab |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 24 has not started)

### ❌ Not Started (All Tasks for Phase 24)

**Psionic Power Item Type (Extension of Spell):**
- [ ] Extend SpellSystemModel to support psionic variant
- [ ] Add field: isPsionic (BooleanField, true if power is psionic)
- [ ] Add field: discipline (StringField or null, psionic discipline when isPsionic)
  - Choices: Clairsentience, Metacreativity, Psychokinesis, Psychometabolism, Psychoportation, Telepathy, Universal
- [ ] Add field: displayTypes (ArrayField of StringField)
  - Display types: Visual, Auditory, Mental, Olfactory (instead of V/S/M components)
  - Example Power: "Mental" (manifested mentally), "Auditory + Visual" (combined displays)
- [ ] Add field: augmentation (SchemaField or null):
  - augmentation.costPerLevel (NumberField, extra PP per augmentation level)
  - augmentation.effects (ArrayField, description of each augmentation level)
  - Example: "For every 2 additional PP spent, range increases by 10 ft" or "For every 1 additional PP, damage increases by 1d6"
- [ ] Add field: manifestTime (StringField, "1 standard action", "1 round", "10 minutes", etc.)
- [ ] Spells and powers share same item type but differ by isPsionic flag
- [ ] Test: Power item type created with isPsionic flag
- [ ] Test: Discipline field validated

**Power Point System on Spellbook:**
- [ ] Extend SpellbookData from Phase 16
- [ ] Add field: powerPoints (SchemaField or null, enabled for psionic spellbooks)
  - Structure: { value: NumberField, max: NumberField }
  - value: current power points available
  - max: maximum power points per day
- [ ] Implement power point calculation:
  - Formula: max PP = manifester level + ability modifier
  - Example: Psion level 5 with INT 16 = 5 + 3 = 8 PP max per manifestation limit
  - Slight tweak: also depends on psionic discipline table (8 classes × levels = different caps)
  - Stub: simple formula for Phase 24 POC, full psionic class tables in Phase 27
- [ ] Power points per manifestation:
  - Power level 0: 1 PP
  - Power level 1: 1 PP
  - Power level 2: 3 PP
  - Power level 3: 5 PP
  - Power level 4: 7 PP
  - Power level 5: 9 PP
  - (Powers go to level 9, but usually capped at manifester level + 5)
- [ ] Augmentation cost: additional PP to enhance power effect
  - Applied at manifest time (similar to metamagic)
- [ ] Test: Psionic spellbook created with power points
- [ ] Test: Power points tracked and consumable

**Psionic Disciplines:**
- [ ] Define 7 psionic disciplines in `src/constants/psionics.mts`:
  1. **Clairsentience**: powers that sense/perceive (Clairvoyance, Clairaudience)
  2. **Metacreativity**: powers that create things (Astral Construct, Ectoplasm)
  3. **Psychokinesis**: powers that move/affect matter (Telekinesis, Force Shield)
  4. **Psychometabolism**: powers that affect bodies (Biofeedback, Regeneration)
  5. **Psychoportation**: powers that move things (Teleport, Blink)
  6. **Telepathy**: powers that communicate mentally (Telepathy, Mind Shield)
  7. **Universal**: powers accessible to all psions (Psionic Healing)
- [ ] For each discipline: list defining powers (stub, full list in Phase 27)
- [ ] Store discipline definitions in CONFIG
- [ ] Test: All disciplines defined

**Power Display Types:**
- [ ] Define display types: Visual, Auditory, Mental, Olfactory
- [ ] Powers manifest with display type, not components (V/S/M):
  - Mental display: power manifested mentally, no noise or visible effect
  - Visual display: power has visible effect (colored aura, light, etc.)
  - Auditory display: power makes sound (psychic vibration)
  - Olfactory display: power makes smell (psionic scent)
- [ ] Integration with Silent/Still spell equivalent:
  - Mental display only powers aren't affected by Silenced conditions
  - Visual display: visible to observers
- [ ] Test: Powers with various display types created

**Manifestation vs Casting (Terminology):**
- [ ] Powers are "manifested" (not cast)
- [ ] Manifester level (not caster level)
- [ ] Power point reserve (not spell slots)
- [ ] Augmentation (not metamagic)
- [ ] Update terminology throughout Phase 24
- [ ] Update UI labels: "Manifest" button instead of "Cast"
- [ ] Test: UI uses correct terminology

**Psionic Power Casting Flow (Similar to Spells Phase 16/19):**
- [ ] Action chain for manifesting power:
  1. Check: Manifester can manifest (power points available, etc.)
  2. Dialog: Show pre-manifestation options (augmentation, etc.)
  3. Target: Select targets (if applicable)
  4. Manifest: Resolve power effects
  5. Consume: Spend power points + augmentation cost
  6. Post: Chat card with results
- [ ] Manifestation time: standard action, full-round, swift action (depends on power)
- [ ] Power resistance check: similar to spell resistance (Phase 19)
  - Formula: 1d20 + manifester level vs target PR (psionic resistance)
- [ ] Required check (Concentration, etc.) before manifestation
- [ ] Power failure on failed concentration check
- [ ] Test: Manifest power from power list
- [ ] Test: Augmentation applied before manifestation
- [ ] Test: Power points consumed correctly

**POC Psionic Powers - Discipline Set:**
- [ ] For Phase 24 POC, implement 2-3 sample powers across disciplines
- [ ] Discipline distribution: 1 Telepathy, 1 Psychokinesis, 1 Clairsentience

**POC Power #1 - Mind Shield (Telepathy):**
- [ ] Create power: Mind Shield
  - Discipline: Telepathy
  - Level: 1
  - Manifestation Time: 1 standard action
  - Range: Personal
  - Target: Self
  - Duration: 1 round per manifester level
  - Display Type: Mental
  - Power Points: 1 PP
  - Augmentation: "For 2 additional PP, duration increases by 1 minute" (alternative phrasing)
  - Effect: Gain +2 bonus to saves vs telepathy and mindaffecting effects
- [ ] Effect: Create buff (Phase 20) with +2 bonus to Will saves (mindaffecting category)
- [ ] Test: Manifest Mind Shield
  - Buff applied to manifester
  - Duration tracked
  - Bonus to saves visible

**POC Power #2 - Telekinetic Thrust (Psychokinesis):**
- [ ] Create power: Telekinetic Thrust
  - Discipline: Psychokinesis
  - Level: 1
  - Manifestation Time: 1 standard action
  - Range: Medium (100 ft + 10 ft/manifester level)
  - Target: One creature
  - Duration: Instantaneous
  - Display Type: Visual (visible telekinetic force)
  - Power Points: 1 PP
  - Augmentation: "For 2 additional PP, damage increases by 1d6"
  - Effect: 1d6 force damage, target Fort save DC (11 + WIS mod) for half
- [ ] Attack: telekinetic ranged touch attack vs target
  - If hit: rolling damage (1d6 + augmentation)
  - Save allowed (Fort negates?)
- [ ] Test: Manifest Telekinetic Thrust
  - Target selection
  - Damage rolled
  - Save offered
  - Power points consumed

**POC Power #3 - Clairvoyance (Clairsentience):**
- [ ] Create power: Clairvoyance
  - Discipline: Clairsentience
  - Level: 3
  - Manifestation Time: 10 minutes
  - Range: One mile per manifester level
  - Duration: Concentration, up to 10 minutes
  - Display Type: Mental
  - Power Points: 5 PP
  - Effect: Sense area 35+ miles away, view activity
- [ ] Stub: Complex sensory effect, focus on activation and duration tracking
- [ ] Concentration check required each round to maintain
- [ ] Test: Manifest Clairvoyance
  - Concentration check made
  - Duration tracked
  - Can be dismissed

**Augmentation System:**
- [ ] Augmentation: optional additional power point expenditure when manifesting
- [ ] Types of augmentation:
  - Damage increase (spend 2 PP → +1d6 damage)
  - Range extension (spend 2 PP → range ×2)
  - Duration extension (spend 2 PP → duration ×2)
  - Area increase (spend 3 PP → radius +5 ft)
  - Special effects (discipline-specific enhancements)
- [ ] Augmentation UI in pre-manifestation dialog:
  - List available augmentations for the power
  - Show cost (in PP)
  - Checkbox/toggle to apply
  - Recalculate total PP cost on selection
  - Must have sufficient PP to pay (base + augmentation cost)
- [ ] Augmentation limit: total PP spent cannot exceed manifester level + 4 (generally)
  - Exception: some powers allow exceeding this
- [ ] Test: Pre-manifestation dialog shows augmentation options
- [ ] Test: Select augmentation, apply to power
- [ ] Test: Power points consumed correctly

**Psionic Spellbook Tab on Actor Sheet:**
- [ ] Extend Phase 16 actor sheet spellbook tab
- [ ] If spellbook is psionic (isPsionic == true on abilities/powers):
  - Show separate "Powers" list (instead of "Spells")
  - Display power points: [●●●●●○○○] (filled/unfilled circles)
  - Show power levels: 0, 1, 2, 3, 4, 5 (usually), 6, 7, 8, 9
  - Below each level: list powers of that level
- [ ] Psionic powers available to manifester:
  - All powers of manifester's discipline + universal powers
  - Known powers list (if prepared manifester) or automatic (if spontaneous)
  - Stub: assume all known, preparation deferred to Phase 27
- [ ] Power point display:
  - Show max PP
  - Show current PP
  - Update on manifestation
- [ ] Manifest button per power:
  - Click to open pre-manifestation dialog
  - Same as spell casting but manife station terminology
- [ ] Power point recovery:
  - On rest: PP restored to max
- [ ] Test: Psionic spellbook tab renders
- [ ] Test: Power list displays correctly
- [ ] Test: Power points tracked

**Integration with Phase 9 Combat:**
- [ ] Manifestation uses action economy (standard action, typically)
- [ ] Phase 9 turn budget tracking manifestation as standard action
- [ ] Concentration check during combat (if applicable)
- [ ] Power failure on failed concentration
- [ ] Test: Manifest power in combat
  - Standard action consumed
  - Power resolves
  - Turn budget updated

**Psionic Resistance Integration:**
- [ ] Psionic Resistance (PR): similar to Spell Resistance (SR)
- [ ] Powers can overcome PR with check:
  - Formula: 1d20 + manifester level vs target PR
  - Success: power continues
  - Failure: manifester wasted PP (power doesn't manifest)
- [ ] Some powers affect mindaffecting saves differently:
  - Telepathy powers go against Will save + psychic resistance
  - Telepathy immunity: no telepathy works
- [ ] Test: Power vs enemy with PR
  - PR check made
  - If fail: power doesn't manifest, PP wasted

**Power Augmentation Stacking:**
- [ ] Multiple augmentations can stack (similar to metamagic in Phase 17)
- [ ] Example: Telekinetic Thrust with damage augmentation +2 levels
  - Base: 1 PP
  - Augment 1 (+1d6): +2 PP
  - Augment 2 (+1d6): +2 PP
  - Total: 5 PP cost
  - Damage: 1d6+1d6+1d6 = 3d6 total
- [ ] Augmentation limit per power: cannot exceed manifester level + 4 total PP
- [ ] Test: Stack multiple augmentations
- [ ] Test: Augmentation limit enforced

**Psionic Feat Integration (If Phase 10 Extended):**
- [ ] Stub: Psionic feats (Psionic Talent, Psionic Defense, etc.) deferred
- [ ] Framework: feats can grant abilities and power selections
- [ ] Phase 24 POC: ignore feat grants for psionics, basic power access only

**Chat Card for Powers:**
- [ ] Chat card template for power manifestation:
  - Power name + discipline
  - Manifester name + manifester level
  - Power points spent (base + augmentation)
  - Effect description
  - Damage/save results (if applicable)
  - Duration
- [ ] Similar structure to spell chat cards (Phase 19)
- [ ] Test: Manifest power, chat card displayed

**System Registration:**
- [ ] Register powers in CONFIG.DND35E.psionicDisciplines
- [ ] Add display types to CONFIG
- [ ] Add augmentation types to CONFIG

**Localization & i18n:**
- [ ] Add i18n keys: Psionic disciplines (Telepathy, Psychokinesis, etc.)
- [ ] Add i18n keys: Display types (Mental, Visual, Auditory, Olfactory)
- [ ] Add i18n keys: Power names + descriptions
- [ ] Add i18n keys: Augmentation descriptions
- [ ] Add i18n keys: UI labels ("Manifest", "Power Points", "Augment")
- [ ] Add i18n keys: Manifestation time descriptions
- [ ] Update en.json

**Comprehensive Testing:**
- [ ] Unit test: Power item type instantiation
- [ ] Unit test: Power point calculation (manifester level + ability mod)
- [ ] Unit test: Augmentation cost calculation
- [ ] Unit test: Power point consumption
- [ ] Integration test: Create psionic manifester (e.g., Psion)
  - Psionic spellbook enabled
  - Power points calculated
  - Powers available in list
- [ ] Integration test: Manifest Mind Shield
  - Buff applied to manifester
  - Power points consumed
  - Duration tracked
- [ ] Integration test: Manifest Telekinetic Thrust
  - Target selection
  - Damage rolled
  - Power points consumed
  - Chat card shown
- [ ] Integration test: Augment power
  - Augmentation applied
  - Cost added to total
  - Effect modified (damage increased, range extended, etc.)
  - Power points consumed correctly
- [ ] Integration test: Manifest power with Psionic Resistance check
  - PR check made
  - If success: power manifests
  - If failure: power fails, PP wasted
- [ ] Integration test: Psionic spellbook tab displays
  - Power list shows
  - Power points display
  - Manifest button functional
- [ ] Integration test: Manifest in combat
  - Standard action consumed
  - Power resolves
  - Turn budget updated
- [ ] Integration test: Rest recovers power points
  - After sleep: PP restored to max
- [ ] Edge case: Manifest power with insufficient PP
  - Error: "Insufficient power points"
  - Cannot manifest
- [ ] Edge case: Augment beyond limit
  - Error: "Augmentation would exceed safe limit"
  - Cannot apply augmentation
- [ ] Edge case: Concentration check failure during manifestation
  - Power lost, PP wasted (for concentration powers)
- [ ] Smoke test: Full encounter with psionic manifester
  - Manifests powers multiple times
  - Augments powers
  - Concentration maintained
  - Power points tracked correctly
  - No console errors
- [ ] Performance test: 30 powers in list, open psionic tab < 500ms

**Documentation & User Guides:**
- [ ] Document psionic system vs spell system: similarities and differences
- [ ] Document power disciplines: what each discipline represents
- [ ] Document power points: how calculated, how spent, recovery
- [ ] Document augmentation: how to apply, what it does
- [ ] Document psionic manifestation: casting/manifesting terminology
- [ ] Create journal entry: "Psionics"
- [ ] Create journal entry: "Power Points"
- [ ] Create journal entry: "Augmentation"
- [ ] Note limitations: Full power list in Phase 27, psionic class tables in Phase 27
