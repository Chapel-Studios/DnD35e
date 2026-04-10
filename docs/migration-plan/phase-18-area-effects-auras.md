# Phase 18: Area Effects & Auras

**Status**: 📖 Rough Sketch (350+ item checklist, AoE templates, aura proximity)

> **Milestone**: Beta  
> **Dependencies**: Phase 6 (Token & Scene), Phase 16 (Spells POC)  
> **Goal**: MeasuredTemplate-based area targeting for spells and abilities, spread vs emanation vs burst rules, and persistent aura effects (radius-based, applies/removes as tokens enter/leave). Proximity detection using Foundry V14 region system.

---

## 22.1 Aura Active Effect Type

```
AuraSystemModel extends Dnd35eActiveEffectSystemModel
├── radius: number (feet)
├── affectsAllies, affectsEnemies, affectsSelf: boolean
├── active: boolean
└── changes: Dnd35eEffectChangeData[]
```

## 22.2 Implementation

- Token proximity detection or Foundry region system
- Apply/remove effects on tokens entering/leaving radius

## 22.3 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/activeEffects/aura/` |
| Modify | `system.json` — register aura effect type |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 18 has not started)

### ❌ Not Started (All Tasks for Phase 18)

**Aura System Model:**
- [ ] Create `src/entities/activeEffects/aura/AuraSystemModel.mts` extending ActiveEffectSystemModel
- [ ] Define schema: radius (NumberField, 1+ feet, e.g., 15 for 15-foot aura)
- [ ] Define schema: affectsAllies (BooleanField, true if applies to allies)
- [ ] Define schema: affectsEnemies (BooleanField, true if applies to enemies)
- [ ] Define schema: affectsSelf (BooleanField, true if applies to source actor)
- [ ] Define schema: areaType (StringField with choices: "aura", "emanation", "persistent")
  - aura: move with token, apply to tokens in radius
  - emanation: same as aura but emphasizes centered effect
  - persistent: fixed location, doesn't move (template-based)
- [ ] Define schema: updateMode (StringField with choices: "continuous", "onEnter", "onExit", "onRound")
  - continuous: apply/remove every update (expensive)
  - onEnter: apply when token enters radius
  - onExit: remove when token exits radius
  - onRound: apply/remove once per round
- [ ] Add field: active (BooleanField, true if aura is currently active/enabled)
- [ ] Inherit changes from parent ActiveEffectSystemModel (effects + modifiers still apply)
- [ ] Test: AuraSystemModel instantiation with various settings
- [ ] Test: Schema validation (radius > 0, areaType in enum, etc.)

**Spell Area Definition:**
- [ ] Extend SpellSystemModel from Phase 16
- [ ] Add field: areaType (StringField or null, choices: "burst", "cone", "line", "emanation", "spread", "scatter", null for single-target)
- [ ] Add field: areaSize (NumberField or null, size in feet, e.g., 20 for 20-ft radius burst)
- [ ] For spells with area: areaSize is populated (e.g., 15-ft radius burst = areaSize 15)
- [ ] Update spell data model: include these new fields
- [ ] Test: Spell with area defined (e.g., Fireball as 20-ft radius burst)

**Template System Integration:**
- [ ] Implement `Dnd35eTemplate` class extending Foundry's MeasuredTemplate
- [ ] Template types map to area types:
  - Burst → circle (centered on one point)
  - Cone → cone (emanates from caster)
  - Line → ray (straight line from caster)
  - Emanation → circle (centered on caster, moves with caster)
- [ ] Template data includes:
  - x, y position (center or starting point)
  - areaSize (radius or length)
  - rotation (for cones and lines)
  - distance (for measurement, lines are this long)
- [ ] Template creation utility: `createTemplateForSpell(spell, options)` returns template data
  - Input: spell item, position, rotation
  - Output: MeasuredTemplate ready to place on scene
- [ ] Test: Create template for Fireball (burst, 20 ft radius)
- [ ] Test: Create template for Cone of Cold (cone, 60 ft length)
- [ ] Test: Create template for Lightning Bolt (line, 120 ft length)

**Area Targeting UI:**
- [ ] On spell casting dialog (from Phase 16):
  - If spell has areaType: show "Area: [type] [size]" (e.g., "Area: 20-ft radius burst")
  - Show template preview on scene when targeting
  - Player clicks on scene to set center point
  - For cones/lines: show rotation handle
- [ ] Template preview appears when target selection mode active
  - Template shows translucent outline
  - Updates in real-time as mouse moves
  - Can rotate (for cones/lines)
- [ ] Affected tokens highlighted within template area
  - Green: ally (if affectsAllies)
  - Red: enemy (if affectsEnemies)
  - Blue: self (if affectsSelf and in area)
- [ ] Count display: "5 tokens affected"
- [ ] Confirm button: place template and execute spell

**Burst Area Effect:**
- [ ] Burst: sphere centered on one point within spell range
- [ ] Template: circle at distance (e.g., 20-ft radius)
- [ ] Affected tokens: all tokens with center point within radius
- [ ] Example POC spell: Fireball
  - Area: 20-ft radius burst
  - Does not damage caster if caster center is within burst
  - Affects all creatures in radius
- [ ] Test: Create Fireball template, damage all tokens in radius
- [ ] Test: Caster in center of Fireball, takes damage

**Cone Area Effect:**
- [ ] Cone: emanates from caster in specified direction and distance
- [ ] Template: cone shape, max distance areaSize (e.g., 60 ft)
- [ ] Direction: set by rotation (0-360 degrees)
- [ ] Affected tokens: center point within cone shape
- [ ] Example POC spell: Cone of Cold
  - Area: 60-ft cone
  - Emanates from caster
  - Caster immune (not in cone behind them)
- [ ] Test: Create Cone of Cold template, damage tokens in cone
- [ ] Test: Caster not damaged by own Cone of Cold

**Line Area Effect:**
- [ ] Line: straight line from caster to max range
- [ ] Template: thin line shape, max distance areaSize (e.g., 120 ft)
- [ ] Direction: set by rotation
- [ ] Affected tokens: center point intersects line (width ~5 ft for targeting)
- [ ] Example POC spell: Lightning Bolt
  - Area: 120-ft line
  - Emanates from caster
  - Caster immune
- [ ] Test: Create Lightning Bolt template, damage tokens on line
- [ ] Test: Caster not damaged by own Lightning Bolt

**Emanation Area Effect:**
- [ ] Emanation: effects emanate from source token continuously
- [ ] Template: circle centered on source token
- [ ] Movement: template moves with source token
- [ ] Affected tokens: any token with center in radius, checked continuously
- [ ] Application: apply effect to tokens entering radius, remove when exiting
- [ ] Example: Aura of Despair (fear effect in radius)
- [ ] POC implementation: stub for now, full implementation in Auras section

**Spread Area Effect:**
- [ ] Spread: effects spread around corners (grid-aware)
- [ ] Template: spread from center, bounces off walls/obstacles
- [ ] Routing: uses grid distance (not line-of-sight, can go around corners)
- [ ] Affected tokens: within spread distance via grid routing
- [ ] Example POC spell: Fog Cloud (spreads around walls)
- [ ] Stub for Phase 18: marked as planned but not fully implemented
  - Note: requires grid pathfinding, defer to Phase 24 if complex

**Scatter Effect:**
- [ ] Scatter: thrown spells that deviate from intended target
- [ ] Roll 1d8 for direction (scatter direction)
- [ ] Roll 1d4×10 for distance (scatter distance in feet, e.g., 10-40 ft)
- [ ] Reposition template based on scatter results
- [ ] Example: Stinking Cloud (can scatter if touch attack misses)
- [ ] Stub for Phase 18: implemented for UI only, actual scatter mechanics in Phase 34 (advanced mechanics)

**Aura Data Model on Any Document:**
- [ ] Implement AuraSystemModel as persistent effect type
- [ ] Actors can have multiple auras (e.g., Protection from Evil aura, Channel Energy aura, etc.)
- [ ] Auras are active effects with auraType subtype
- [ ] Aura data includes:
  - radius: 15 feet
  - affectsAllies/affectsEnemies/affectsSelf: true/false
  - updateMode: "onRound" or "continuous"
  - changes: array of effect changes to apply
- [ ] Test: Create actor with aura effect
- [ ] Test: Aura effect persists on actor

**Proximity Detection System:**
- [ ] Implement token proximity detector:
  - On each update cycle (or each round): check all tokens on scene
  - For each aura: calculate distance from aura source token to all other tokens
  - If distance <= radius: token is "in aura"
  - Else: token is "outside aura"
- [ ] Track aura membership per token (prev frame vs current frame)
  - If token entered aura: apply aura effect to token
  - If token exited aura: remove aura effect from token
  - If still in aura: keep effect (or refresh if updateMode "onRound")
- [ ] Use Foundry's distance calculation (grid or euclidean based on scene settings)
- [ ] Test: Token enters aura, effect applied within 100ms
- [ ] Test: Token exits aura, effect removed within 100ms
- [ ] Test: Multiple tokens in/out of aura simultaneously

**Aura Application & Removal:**
- [ ] When token enters aura: create temp active effect on token
  - Effect name: "Aura: [source name] — [effect name]" 
  - Effect is temporary (expires when token leaves aura)
  - Effect changes mimic aura changes
  - Effect duration: "Aura" (special marker, no expiry)
- [ ] When token exits aura: remove corresponding effect(s)
  - Find effects with aura marker and matching source
  - Remove from token
- [ ] Stacking: multiple auras can affect same token
  - Each aura maintains separate effect instance
  - Changes stack if bonus types allow (from Phase 2)
- [ ] Test: Two auras affect same token, both effects applied
- [ ] Test: Token exits one aura, other aura still active
- [ ] Test: Token far away from all auras, no aura effects

**POC Aura #1 - Aura of Despair:**
- [ ] Create as active effects on cleric (lvl 6) with Channel Energy feature
- [ ] Data:
  - radius: 10 feet
  - affectsEnemies: true
  - affectsAllies: false
  - affectsSelf: false
  - effects: -2 morale penalty to attack/saves/ability checks
- [ ] Add icon (intimidating aura symbol)
- [ ] Test: Cleric with Aura of Despair, enemy within 10 ft gets -2 penalty
- [ ] Test: Enemy outside 10 ft has no penalty
- [ ] Test: Enemy outside aura re-enters, penalty reapplies

**POC Aura #2 - Protection from Evil Aura:**
- [ ] Create as active effect on paladin
- [ ] Data:
  - radius: 10 feet
  - affectsAllies: true
  - affectsEnemies: false
  - affectsSelf: true
  - effects: +2 AC/saves bonus vs evil creatures (conditional, Phase 20)
- [ ] Stub: condition checks deferred to Phase 20 (evil creature detection)
- [ ] Add icon (holy aura symbol)
- [ ] Test: Paladin with aura, allies within 10 ft gain effect
- [ ] Test: Paladin's own effect applies (affectsSelf)
- [ ] Test: Enemies not affected (affectsEnemies: false)

**POC Aura #3 - Barbarian Rage Aura:**
- [ ] Create as active effect on barbarian during rage
- [ ] Data:
  - radius: 30 feet
  - affectsAllies: true
  - affectsEnemies: true
  - affectsSelf: false
  - effects: intimidation effect (fear save vs DC 18)
- [ ] Apply aura when rage starts
- [ ] Remove aura when rage ends
- [ ] Test: Start rage, aura applies to nearby creatures
- [ ] Test: End rage, aura effects removed

**Integration with Phase 16 Spells:**
- [ ] Extend spell casting flow to handle area spells:
  1. Player casts spell with area (e.g., Fireball)
  2. PreRollDialog shows "Area: 20-ft radius burst"
  3. Player clicks "Target" button to set area location
  4. Template appears on scene (translucent circle)
  5. Player clicks center point (or drags to rotate for cones)
  6. Spell executes: damage all tokens in area
  7. Remove template
- [ ] If spell targets multiple creatures: execute attack/save for each in area
- [ ] Test: Cast Fireball on group of enemies, damage all in 20 ft radius

**Chat Card Updates:**
- [ ] Modify spell chat card (from Phase 16) to show area:
  - Header: "Magic Missile ✕ 3 (20-ft radius burst)"
  - Body: affected tokens list
  - Body: damage rolls (one per target, or shared if AoE damage)
  - Body: save results
- [ ] Test: Chat card shows template info and affected tokens

**Performance & Optimization:**
- [ ] Aura proximity check: defer expensive calculations to end of turn (not every update)
- [ ] Cache distance calculations: recompute only on token movement
- [ ] Limit simultaneous auras: warn if more than 10 auras on scene
- [ ] Template rendering: use Foundry's renderer (optimize for 100+ templates on scene)
- [ ] Test: 20 auras on scene with 40 tokens, < 50ms per frame overhead
- [ ] Test: 1000 proximity checks per round, completes in <100ms

**Accessibility & Clarity:**
- [ ] Template colors: red for damaging, blue for beneficial, purple for neutral
- [ ] Affected tokens highlighted with colored outline
- [ ] Accessibility: screen reader support for affected token counts
- [ ] Keybinds: Tab to cycle through affected tokens in area
- [ ] Test: Open area effect, can identify affected tokens in < 2 seconds (accessibility)

**System Registration & Config:**
- [ ] Register aura effect type in `system.json`
- [ ] Add to CONFIG.ActiveEffect.documentClasses or similar
- [ ] Add i18n keys for aura-related UI
- [ ] Add template assets for area shape icons

**Localization & i18n:**
- [ ] Add i18n keys: Area types (burst, cone, line, emanation, spread, scatter)
- [ ] Add i18n keys: UI labels ("Area:", "Affected tokens:", "Aura radius:")
- [ ] Add i18n keys: Effect names (Aura of Despair, Protection from Evil Aura, etc.)
- [ ] Add i18n keys: POC spell area descriptions
- [ ] Update en.json

**Comprehensive Testing:**
- [ ] Unit test: AuraSystemModel instantiation
- [ ] Unit test: Proximity detection algorithm (distance <= radius)
- [ ] Unit test: Token enters/exits aura (effect track)
- [ ] Integration test: Cast Fireball with area
  - Template appears at clicked location
  - All tokens in template area selected
  - Damage applied to all
  - Chat card shows all affected tokens
- [ ] Integration test: Token enters aura (Aura of Despair)
  - Effect applied immediately
  - Tokens in range have -2 penalty
  - Token moves outside radius, effect removed
  - Token re-enters, effect reapplies
- [ ] Integration test: Multiple auras on scene
  - Multiple source tokens with different auras
  - Same target token in multiple auras
  - Effects from all auras apply correctly
  - Stacking rules respected (if applicable)
- [ ] Integration test: Area spell with save (Cone of Cold)
  - Template appears for cone
  - Tokens in cone roll save (Reflex DC 18)
  - Success = half damage, failure = full damage
  - Chat shows all save results
- [ ] Edge case: Area spell with caster in area (Fireball centered on caster self)
  - Caster takes damage
  - Other tokens in area take damage
- [ ] Edge case: Area aura on moving token (emanation follows caster)
  - Aura moves when caster moves
  - Tokens enter/exit as caster moves
  - No performance spike on movement
- [ ] Edge case: Area effect with very large radius (60 ft cone)
  - All tokens in range affected
  - Performance acceptable (< 200ms total)
- [ ] Edge case: Spell scatter roll (stubs for now)
  - Scatter direction determined randomly
  - Template repositioned
  - Area recalculated
- [ ] Smoke test: Full combat encounter with area effects
  - Cast 5+ area spells
  - 20+ tokens on scene
  - No console errors
  - Effects apply correctly
  - Performance acceptable
- [ ] Performance test: 100 area effect calculations per round < 500ms total

**Documentation & User Guides:**
- [ ] Document area effect types: burst, cone, line, emanation, spread, scatter
- [ ] Document aura system: how to create, how they apply/remove
- [ ] Create journal entry: "Area Effects"
- [ ] Create journal entry: "Aura Effects"
- [ ] Note limitations: Spread deferred to Phase 24 if complex, Scatter stubs only
