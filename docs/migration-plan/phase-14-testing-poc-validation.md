# Phase 14: Testing & POC Validation

**Status**: 📖 Rough Sketch (Unit/integration/smoke testing framework)

> **Milestone**: POC  
> **Dependencies**: Phases 9–13  
> **Goal**: Testing infrastructure that validates all POC building blocks end-to-end. Unit tests for data models and prep logic, integration tests for document lifecycle, and POC scenario tests that verify: a Fighter can make a full attack with iterative attacks, Power Attack modifies damage per-attack, Cleave triggers on kill, Trip applies Prone, and the TurnActionBudget state machine enforces action economy.

---

## 8.1 Testing Framework

- Use Vitest (already configured via `vite.config.ts`)
- Test runner integrated with the build pipeline
- Coverage reporting for data model and preparation logic

## 8.2 Unit Test Targets

Priority areas for unit testing:

| Area | What to Test |
|------|-------------|
| **Data models** | Schema validation, default values, field types |
| **prepareDerivedData()** | Ability modifiers, AC calculation, save totals, encumbrance |
| **Active Effect application** | Change application, phase ordering, target routing (actor vs item) |
| **Bonus type stacking** | Same-type highest-only, dodge/untyped always stack, penalties always apply |
| **Formula evaluation** | Roll data assembly, formula resolution, error handling |
| **Component chain** | Mixin composition, schema merging, preparation ordering |

## 8.3 Integration Test Approach

For tests that need Foundry document lifecycle:

- Mock Foundry's document classes at the minimal level needed
- Test item creation → data prep → effect application → derived values
- Test actor + embedded items → full preparation cycle

## 8.4 Test Organization

```
tests/
├── unit/
│   ├── models/        — DataModel schema tests
│   ├── preparation/   — prepareDerivedData logic
│   ├── effects/       — AE application and stacking
│   └── helpers/       — utility function tests
├── integration/
│   ├── actors/        — actor lifecycle tests
│   └── items/         — item lifecycle tests
└── setup.mts          — shared mocks and test utilities
```

## 8.5 Test Conventions

- Each new data model gets a corresponding `.test.mts` file
- Each `prepareDerivedData()` method gets preparation tests
- Each new AE type gets stacking/application tests
- Tests run in CI and as a pre-commit check

## 8.6 Files to Create/Modify

| Action | Path |
|--------|------|
| Verify | `vitest` configuration in `vite.config.ts` |
| Create | `tests/setup.mts` — shared mocks and test utilities |
| Create | `tests/unit/models/` — initial data model tests for weapon, actor |
| Create | `tests/unit/preparation/` — ability score derivation tests |
| Create | `tests/unit/effects/` — AE application tests |
| Modify | `package.json` — test scripts if not present |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 14 has not started)

### ❌ Not Started (All Tasks for Phase 14)

**Test Infrastructure Setup:**
- [ ] Verify `vitest` is installed via `npm install vitest --save-dev` (or already in package.json)
- [ ] Verify `vitest.config.ts` or `vite.config.ts` vitest entry exists with proper configuration
- [ ] Configure test environment: `environment: 'jsdom'` or `'node'` as appropriate
- [ ] Configure include patterns: `tests/**/*.test.mts` and `tests/**/*.spec.mts`
- [ ] Configure coverage: `coverage.provider: 'v8'`, thresholds: lines ≥ 80% for core modules
- [ ] Add test script to `package.json`: `"test": "vitest"`, `"test:ui": "vitest --ui"`
- [ ] Add coverage script: `"coverage": "vitest --coverage"`
- [ ] Create `.nycrc.json` or coverage config for threshold enforcement
- [ ] Test: Run `npm test` → vitest starts in watch mode
- [ ] Test: Run `npm run coverage` → coverage report generated

**Shared Test Utilities (setup.mts):**
- [ ] Create `tests/setup.mts` file
- [ ] Implement mock for Foundry's `DataModel` class: minimal shape with schema, prepareDerivedData
- [ ] Implement mock for Foundry's `Document` classes: Actor, Item, ActiveEffect
- [ ] Implement mock for Foundry's `Roll` class: returns roll object with total
- [ ] Implement mock for Foundry's `game` singleton: user, i18n, settings
- [ ] Create mock for CONFIG.DND35E: abilities, skills, sizes, bonus types
- [ ] Create mock for Phase 2's stacking engine if needed by tests
- [ ] Export test utilities: createMockActor(), createMockItem(), createMockEffect()
- [ ] Create helper: applyEffectFull() to simulate full effect application cycle
- [ ] Test: Mocks load without errors
- [ ] Test: Mock DataModel can be instantiated

**DataModel Schema Tests:**
- [ ] Create `tests/unit/models/weapon.model.test.mts`
- [ ] Test WeaponSystemModel schema exists and defines all expected fields
- [ ] Test weapon creation: default values apply correctly
- [ ] Test field validation: critical range must be 20-24, critical multiplier must be 1-4
- [ ] Test nested schema: material subtype adds fields without error
- [ ] Create `tests/unit/models/actor.model.test.mts`
- [ ] Test ActorSystemModel schema: abilities, attributes, skills all defined
- [ ] Test ability score default: 10 (average)
- [ ] Test default AC: 10
- [ ] Create `tests/unit/models/feat.model.test.mts`
- [ ] Test FeatSystemModel schema: featType, activation, uses defined
- [ ] Create `tests/unit/models/race.model.test.mts`
- [ ] Test RaceSystemModel: size, speed, abilityAdjustments fields defined
- [ ] Create `tests/unit/models/class.model.test.mts`
- [ ] Test ClassSystemModel: classType, level, bab, saves, skillPointsPerLevel defined
- [ ] All schema tests: test validation errors for invalid values
- [ ] All schema tests: test default values apply correctly

**Actor Preparation Tests:**
- [ ] Create `tests/unit/preparation/abilities.test.mts`
- [ ] Test: Actor with ability score 10 → mod 0
- [ ] Test: Ability score 8 → mod -1
- [ ] Test: Ability score 18 → mod +4
- [ ] Test: Ability score 1 → mod -5
- [ ] Test: Size modifier applied: small size -1, large size +1
- [ ] Test: prepareDerivedData() called → all modifiers calculated
- [ ] Create `tests/unit/preparation/ac.test.mts`
- [ ] Test: Base AC = 10 + DEX
- [ ] Test: DEX +3 → AC 13 normal, touch, flat-footed
- [ ] Test: Armor bonus applied (Phase 15 defer, stub = ignored)
- [ ] Test: Size modifier: small -1, large +1
- [ ] Test: Flat-footed AC: no DEX bonus
- [ ] Test: Touch AC: no armor, no shield
- [ ] Test: All three AC variants calculated independently
- [ ] Create `tests/unit/preparation/saves.test.mts`
- [ ] Test: Base save + ability mod = total
- [ ] Test: Fort + CON modifier
- [ ] Test: Ref + DEX modifier
- [ ] Test: Will + WIS modifier
- [ ] Create `tests/unit/preparation/initiative.test.mts`
- [ ] Test: Init = DEX mod + bonus
- [ ] Test: Initiative formula: "1d20 + #self.attributes.init.total"
- [ ] Create `tests/unit/preparation/skills.test.mts`
- [ ] Test: Skill total = ranks + ability mod
- [ ] Test: Class skill adds +3 if ranks > 0
- [ ] Test: Non-class skill no +3
- [ ] Test: ACP applied to armored skills (Balance, Climb, etc.)
- [ ] Create `tests/unit/preparation/bab.test.mts`
- [ ] Test: Fighter BAB +5 at level 5
- [ ] Test: Cleric BAB +3 at level 5 (med)
- [ ] Test: Rogue BAB +3 at level 5 (low)
- [ ] Test: Multi-class Fighter 5/Cleric 5 → BAB +8
- [ ] Create `tests/unit/preparation/hp.test.mts`
- [ ] Test: HP = max per class HD
- [ ] Test: CON modifier applied
- [ ] Test: Minimum 1 HP per level

**Active Effect Application Tests:**
- [ ] Create `tests/unit/effects/material-ae.test.mts`
- [ ] Test: Material AE with bonus type 'material' applies
- [ ] Test: Multiple material effects stack correctly (highest-wins rule)
- [ ] Test: Masterwork material effect applies
- [ ] Test: Broken material effect reduces defense
- [ ] Create `tests/unit/effects/stacking-engine.test.mts`
- [ ] Test: Same-type bonus: highest value wins, others ignored
- [ ] Test: Dodge bonus: all stack (no highest-only rule)
- [ ] Test: Untyped bonus: all stack
- [ ] Test: Penalty: all apply (separate from bonuses)
- [ ] Test: Mixed: dodge + untyped both apply, penalty also applies
- [ ] Test: History tracking: applied bonuses and ignored bonuses recorded
- [ ] Create `tests/unit/effects/feat-ae.test.mts`
- [ ] Test: Weapon Focus generates +1 attack bonus AE
- [ ] Test: AE applies during prep cycle
- [ ] Test: Power Attack creates modifiable change
- [ ] Test: Cleave EffectTrigger created
- [ ] Create `tests/unit/effects/condition-ae.test.mts`
- [ ] Test: Prone AE creates with correct changes
- [ ] Test: Prone-4 melee attack, +4 ranged AC, -4 melee AC
- [ ] Test: Prone removed → effects cleared

**Formula & Roll Tests:**
- [ ] Create `tests/unit/formulas/formula-evaluation.test.mts`
- [ ] Test: Attack formula "1d20 + #self.bab + #self.abilities.str.mod" with actor bab=5, str=16 (mod +3) → 1d20+8
- [ ] Test: Damage formula "1d8 + #self.abilities.str.mod" with str=16 → 1d8+3
- [ ] Test: D20roll crit detection: 19-20 range with crit range 20 → 20 detected as threat
- [ ] Test: D20 fumble detection: roll === 1 → fumble detected
- [ ] Test: DamageRoll multiplier: crit ×2 multiplies all dice
- [ ] Test: Formula error handling: invalid formula shows error message
- [ ] Test: Formula context resolution: #self.* resolved from actor, #Item.* from item, #target.* from target

**Integration Tests - Actor Lifecycle:**
- [ ] Create `tests/integration/actor-creation.test.mts`
- [ ] Test: Create actor → default values apply (AC 10, BAB 0, etc.)
- [ ] Test: Add race to actor → ability adjustments apply
- [ ] Test: Add class to actor → BAB, saves, skill points apply
- [ ] Test: Remove class → stats recalculate without class contribution
- [ ] Create `tests/integration/actor-with-items.test.mts`
- [ ] Test: Actor + weapon → weapon actions available
- [ ] Test: Actor + feat → feat bonuses apply
- [ ] Test: Add multiple feats → all bonuses stack correctly
- [ ] Test: Actor + class with granted features → features created

**Integration Tests - Combat Scenarios:**
- [ ] Create `tests/integration/full-attack-scenario.test.mts`
- [ ] Test: Fighter with longsword + short sword, BAB +11
  - Action 1: Attack with longsword (+11) → rolls d20+11 vs AC
  - Hits: rolls damage, posts chat
  - Action 2: Continue to full attack (+6) → HUD shows remaining iteratives
  - Action 3: Short sword off-hand (-4) → calculated correctly
  - Can continue full attack or end turn
  - Verify all attack bonuses calculated correctly
- [ ] Test: Rogue with Rapid Shot (ranged POW)
  - Rapid Shot adds extra iterative at -2
  - Full attack shows correct number of shots
  - All shots have -2 penalty applied
- [ ] Create `tests/integration/power-attack-scenario.test.mts`
- [ ] Test: Fighter with Power Attack
  - Open PreRollDialog before attack
  - Adjust PA slider: -2 attack, +4 damage (1H )
  - Roll attack: bonus reduced by 2
  - Roll damage: bonus increased by 4
  - Chat card shows both modifiers
- [ ] Create `tests/integration/cleave-scenario.test.mts`
- [ ] Test: Fighter with Cleave feat
  - Kill enemy with melee attack
  - Cleave triggers, "Free melee attack" action appears
  - Execute free attack, no action cost
  - If kills again, Cleave triggers again
- [ ] Create `tests/integration/trip-scenario.test.mts`
- [ ] Test: Fighter with Trip feat
  - Use Trip maneuver action
  - Opposed check vs target
  - If success: Prone AE applied, chat shows "now Prone"
  - Target's AC changes: +4 vs ranged, -4 vs melee
  - Target has "Stand Up" action available
  - Execute Stand Up: move action costs, Prone removed
- [ ] Create `tests/integration/turn-budget-scenario.test.mts`
- [ ] Test: Multi-turn combat with action economy
  - Fresh turn: standard, move, swift available
  - Standard attack: AttackTaken state
  - Option 1: Take move action → turn spent, swift still available
  - Option 2: Continue to full attack → FullAttack state, no move allowed
  - Try 5-foot step: available if no movement yet
  - After full attack ends: turn complete
  - New turn: reset to Fresh

**POC End-to-End Scenario Tests:**
- [ ] Create `tests/integration/poc-character-creation.test.mts`
- [ ] Test: Create Fighter character end-to-end:
  - Set race (Half-Orc): abilities -2INT -2CHA +2STR, darkvision
  - Set class (Fighter level 5): BAB +5, d10 HD, saves
  - Set feats: Weapon Focus (longsword), Power Attack, Cleave
  - Check derived stats: abilities modified, BAB correct, feats bonuses apply
- [ ] Create `tests/integration/poc-combat-encounter.test.mts`
- [ ] Test: Half-Orc Fighter vs Goblin (3 rounds)
  - Round 1: Fighter's turn
    - Full attack with longsword/short sword
    - Generate 3 iteratives: +5, +0, -5
    - Use Power Attack: -2 attack, +4 damage
    - Actual attacks: +3, -2, -7 (after PA penalty)
    - Roll all three attacks
  - Round 2: Goblin's turn (stub)
  - Round 3: Fighter continues attacking
  - Roll damage after hit
  - If last attack kills goblin: Cleave triggers
- [ ] Create `tests/integration/poc-condition-scenario.test.mts`
- [ ] Test: Fighter trips enemy
  - Trip action chain executes
  - Opposed check
  - Success: Prone AE applied
  - Check enemy stats: AC modified, attack penalty applied
  - Enemy has Stand Up available
  - Player uses Stand Up: move cost, Prone removed, stats back to normal

**Validation Criteria - All POC Features Prove Out **
- [ ] ✓ Weapon system works: create weapon, add material, verify bonuses
- [ ] ✓ Material AE stacking proven: two materials on same weapon stack per rules
- [ ] ✓ Actor creation works: add race, class, feats, all stats derive correctly
- [ ] ✓ Combat actions proven: attack, damage, crit confirmation work end-to-end
- [ ] ✓ Full attack works: iteratives generated, bonus applications, multiple attacks per turn
- [ ] ✓ Power Attack works: per-attack toggle, modifies attack/damage
- [ ] ✓ Cleave works: triggers on kill, grants free action
- [ ] ✓ Trip proven: maneuver action chains, applies Prone condition, AC/attack modified
- [ ] ✓ Turn action budget proven: state machine tracks standards/move/swift, validates transitions
- [ ] ✓ Token drag proven: movement tracked, action cost deducted
- [ ] ✓ Initiative proven: rolls, actors order correctly, ties break on DEX
- [ ] ✓ Feat system proven: passive bonuses apply, effect triggers work
- [ ] ✓ Race system proven: ability modifiers, speed, granted traits
- [ ] ✓ Class system proven: BAB, saves, skill points, level progression
- [ ] ✓ Multi-class proven: BAB stacking, saves stacking
- [ ] ✓ Condition system proven: Prone applies via Trip, removes via Stand Up
- [ ] ✓ Localization proven: at least basic labels localized via i18n

**Coverage Targets:**
- [ ] Data model tests: 100% coverage of schema definition (all fields, all enums)
- [ ] Preparation logic: 100% coverage of derived stat calculation (AC, BAB, saves, skills)
- [ ] AE application: 100% coverage of stacking rules (same-type, dodge, untyped, penalties)
- [ ] Formula evaluation: 90%+ coverage of formula resolution and error paths
- [ ] Integration scenarios: 95%+ coverage of documented functionality (all action types, all maneuvers)
- [ ] Overall system: 80%+ minimum coverage, 90% target for critical paths

**Pre-Release Validation Checklist:**
- [ ] All unit tests passing: `npm test` → 0 failures
- [ ] All integration tests passing: `npm test -- tests/integration/` → 0 failures
- [ ] Coverage report generated: `npm run coverage` → report shows target compliance
- [ ] No console warnings/errors in test log
- [ ] Manual smoke test: start Foundry, create character, take combat actions, no errors
- [ ] Manual full combat: 3+ combatants, multiple rounds, all features used, no crashes
- [ ] Performance validation: character creation < 1s, action economy turn < 200ms, combat round < 500ms
- [ ] Browser console clean: no unrelated warnings or errors from core module
- [ ] Module loads without dependency errors
- [ ] POC documented: README.md describes features, limitations, known issues
- [ ] Compendium content exists: at least 3 weapons, 3 races, 3 classes, 3 feats

**Documentation & User Guides:**
- [ ] Create comprehensive Testing Guide (test organization, running tests, writing new tests)
- [ ] Create POC Feature Summary (what's working, what's deferred to Beta)
- [ ] Update main README.md with POC status and known limitations
- [ ] Create GitHub wiki page: "POC Architecture Overview"
- [ ] Create GitHub wiki page: "Testing Strategy & Coverage"

**Known Limitations to Document:**
- [ ] Spells not implemented (deferred to Phase 16)
- [ ] Only 1-level characters can be multi-classed at (prestige requires Phase X)
- [ ] No armor/shield bonuses yet (Phase 15)
- [ ] No skill specialization or training checks (Phase 14+)
- [ ] No concentration or spell failure (Phase 16+)
- [ ] No full condition suite (Phase 20)
- [ ] No recovery from ability damage (Phase 20)
- [ ] No duration management for effects (Phase 20)
- [ ] No templates or NPC fast-creation (Phase 22)
- [ ] No magically enhanced items or named magic items (Phase 23+)
