# Phase 9: Combat Tracker & Turn Economy

**Status**: 📋 Outlined (TurnActionBudget, action economy state machine)

> **Milestone**: POC  
> **Dependencies**: Phase 8 (Action System)  
> **Goal**: Foundry combat tracker with initiative, turns, and the TurnActionBudget state machine from Phase 8 (§18.3). Manages the progressive full-attack flow (§18.4), movement integration (§18.5), and action economy enforcement. This is where the action system meets the turn structure.

---

## 8.1 Initiative

- Initiative formula: `1d20 + #self.attributes.init.total`
- Init total = DEX mod + misc bonuses (from feats/items via effects later)
- Tie-breaking: Higher DEX wins (Foundry supports custom tie-breaking)
- Uses D20Roll from Phase 7

## 8.2 Combat Document

- `CombatDnd35e` extending `Combat`
- Track round count for duration effects
- **Owns** all `TurnActionBudget` instances (one per combatant per round)
- Support for: delay, ready action, surprise round (deferred to Beta — see Phase 8 §18.15)

## 8.3 Combatant Document

- `CombatantDnd35e` extending `Combatant`
- Track: flat-footed until acted
- **Owns** its `TurnActionBudget` — the state machine that tracks what actions are available

## 8.4 TurnActionBudget Integration

The TurnActionBudget state machine (designed in Phase 8, §18.3) lives here as the runtime turn management system. Key responsibilities:

### State Machine
```
Fresh ──→ AttackTaken (after first standard-action attack)
  │              │
  │              └──→ FullAttack (player continues, commits to full-round)
  │
  └──→ MoveTaken (after move action consumed)
  │
  └──→ ChargeSpent (move + attack as one full-round)
  │
  └──→ Grappled (grapple state branch, see §18.15)
```

### Budget Tracking
```typescript
interface TurnActionBudget {
  state: "Fresh" | "AttackTaken" | "FullAttack" | "MoveTaken" | "ChargeSpent" | "Grappled";
  standard: boolean;    // standard action available
  move: boolean;        // move action available
  swift: boolean;       // swift action available (one per round)
  freeActions: number;  // free actions taken this round
  fiveFootStep: boolean;  // 5-foot step available (not if moved)
  movementUsed: number;   // feet of movement consumed
  movementBudget: number; // total movement available (from speed)
  attacks: AttackRecord[];  // attacks made this turn (for progressive full attack)
  mountBudget?: TurnActionBudget; // linked budget for mounted combat
  grappleState?: GrappleState;    // grapple tracking
}
```

### Reset Flow
- On turn start: `TurnActionBudget` resets to Fresh state
- `movementBudget` set from `#self.attributes.speed.land` (or current speed)
- All action slots reset to available
- Process start-of-turn effects (duration countdown stubs for Phase 20)

### Progressive Full Attack Flow
When the combatant takes their first attack:
1. State → `AttackTaken`, standard action consumed
2. UI shows "Continue Full Attack?" option (Phase 8, §18.4)
3. If continuing: state → `FullAttack`, move action consumed, IterativeAttackGenerator provides next attacks
4. Each subsequent attack: added to `attacks[]`, next attack available until exhausted
5. If stopping: turn proceeds normally with remaining budget

## 8.5 Movement Integration

Token drag events integrate with TurnActionBudget (Phase 8, §18.5):

- **Short drag (≤ 5ft)**: Auto-assumed as 5-foot step. Sets `fiveFootStep: false`. Does NOT consume move action. Does NOT prevent full-round actions.
- **Long drag (> 5ft)**: Consumes move action. Deducts distance from `movementBudget`. Sets `fiveFootStep: false`. Prevents full-round actions (unless Charge).
- **Movement warnings**: If `movementUsed > movementBudget`, warn (or block per setting)
- **Speed tiers**: Walk (1x), Hustle (2x, move action), Run (4x, full-round, lose DEX to AC)

## 8.6 Turn Flow

- Start of turn: Reset TurnActionBudget, process start-of-turn effects
- During turn: Player spends actions (attacks, moves, swift), budget tracks state
- End of turn: Process end-of-turn effects, record turn data
- Next combatant: advance turn

## 8.7 Action Economy Settings

Per Phase 8 (§18.13), the combat tracker respects these settings:

| Setting | Options |
|---------|---------|
| `actionEconomy.enforcement` | `"warn"` (show warning, allow) or `"enforce"` (block illegal actions) |
| `actionEconomy.gmOverride` | `true` — GM can always bypass enforcement |
| `movement.trackOnDrag` | `true` — integrate token drag with budget |

## 8.8 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/combat/CombatDnd35e.mts` — combat document with budget management |
| Create | `src/combat/CombatantDnd35e.mts` — combatant with TurnActionBudget |
| Create | `src/combat/TurnActionBudget.mts` — state machine implementation |
| Create | `src/vue/components/combat/TurnBudgetDisplay.vue` — action economy display |
| Modify | Registration — register combat/combatant document classes |
| Expand | Actor — initiative derivation in `prepareDerivedData()` |
| Expand | Token — movement drag → budget integration hooks |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 9 has not started)

### ❌ Not Started (All Tasks for Phase 9)

**Initiative & Derived Data:**
- [ ] Add initiative formula to actor preparation: `#self.attributes.init.total` = DEX mod + misc bonus
- [ ] Add system setting: `initBonusActor` (NumberField) for table-wide init modifier
- [ ] Implement actor initiative derivation in `prepareDerivedData()`: copy formula to `system.attributes.init.total`
- [ ] Use D20Roll from Phase 7 for initiative rolls (already have crit/fumble detection)
- [ ] Test: Actor with DEX +2, no bonuses → init total = +2
- [ ] Test: Actor with DEX +2, +1 misc bonus → init total = +3
- [ ] Test: Recalculate init on actor update (e.g., DEX score changes)

**Combat Document Class:**
- [ ] Create `src/combat/CombatDnd35e.mts` extending Foundry's Combat document
- [ ] Override `_onCreate()` hook: initialize turn action budgets for all combatants
- [ ] Implement `getTurnActionBudget(combatantId)`: TurnActionBudget getter
- [ ] Implement `createTurnActionBudget(combatantId)`: instantiate new TurnActionBudget for combatant
- [ ] Store budgets as map keyed by combatantId: `this._turnBudgets: Map<string, TurnActionBudget>`
- [ ] Override `_onUpdate()` to sync with Foundry's combat round/turn changes
- [ ] Override `nextTurn()`: advance to next combatant, reset their TurnActionBudget
- [ ] Override `reset()`: clear all turn budgets, start fresh combat
- [ ] Track round count: increment on each full round completion (for duration effects, Phase 20)
- [ ] Implement `roundStarted`: PropertyDescriptor that triggers on new round
- [ ] Implement `roundEnded`: PropertyDescriptor that triggers when round completes
- [ ] Support for surprise round combatants (stub for Phase 8.2 Beta — mark combatant as surprised)
- [ ] Test: Combat created → budgets initialized for all combatants
- [ ] Test: nextTurn() called → active combatant switches → budget resets
- [ ] Test: reset() called → all budgets cleared

**Combatant Document Class:**
- [ ] Create `src/combat/CombatantDnd35e.mts` extending Foundry's Combatant document
- [ ] Add property: `flat_footed: boolean` (true until after first turn action)
- [ ] Implement `getTurnActionBudget()`: fetch from parent combat document
- [ ] Override `_getInitiativeFormula()`: return `"1d20 + #self.attributes.init.total"`
- [ ] Implement `rollInitiative(formula, options)`: use D20Roll class for rolls
- [ ] Implement tie-breaking: on equal init rolls, higher DEX wins (via actor comparison)
- [ ] Implement `_onFirstAction()`: set `flat_footed: false` on first turn action
- [ ] Test: Combatant created → can fetch TurnActionBudget from parent
- [ ] Test: Initiative formula uses actor's init total
- [ ] Test: Two combatants with same init → higher DEX wins tie-break
- [ ] Test: Combatant flat_footed: true on creation, false after first action

**TurnActionBudget State Machine:**
- [ ] (Note: Core TurnActionBudget was designed in Phase 8, but integrated here)
- [ ] Integrate TurnActionBudget into Combatant document lifecycle
- [ ] Bind TurnActionBudget state changes to Pinia store updates (from Phase 8)
- [ ] Implement turn reset: on combatant becomes active, call budget.reset()
- [ ] Implement turn cleanup: on combatant becomes inactive, store state for next round
- [ ] Verify all 16 state transitions work in live combat (not just unit tests)
- [ ] Test: Full combat round with 3+ combatants, budgets track independently
- [ ] Test: Multiple rounds, budgets reset correctly each turn

**Movement Integration with Token Drag:**
- [ ] Create token drag event listener: canvas.on('tokenDragMove', handler)
- [ ] Implement drag handler: calculate distance from token's starting position
- [ ] For drag distance ≤ 5ft: treat as 5-foot step → call budget.spend('fiveFootStep')
- [ ] For drag distance > 5ft: calculate combat distance → deduct from budget.movementBudget
- [ ] Show ruler visual feedback: green (within speed), yellow (doubled speed), red (run/full-round)
- [ ] Enforce movement limits: if drag exceeds budget, warn (or block per setting)
- [ ] On drag complete: commit movement to TurnActionBudget
- [ ] Update token position only if movement was legal (or warn + revert)
- [ ] Implement movement speed tiers: 1x = walk, 2x = double move (consumes standard), 4x = run (full-round, -2 AC)
- [ ] Support armor check penalty reducing speed (stub for Phase 11)
- [ ] Test: Drag token 20ft → movement tracked, state updates
- [ ] Test: Drag token 5ft → treated as 5-foot step
- [ ] Test: Drag beyond budget → warning shown, movement blocked or truncated
- [ ] Test: Speed modifications apply correctly (e.g., burdened speed reduced)

**Turn Flow Hooks:**
- [ ] Implement `startOfTurn(combatant)` hook
- [ ] Call TurnActionBudget.reset() to set Fresh state
- [ ] Set movementBudget from actor speed: `combatant.actor.system.attributes.speed.land`
- [ ] Process start-of-turn effects: duration countdowns, buff expirations (stub for Phase 20)
- [ ] Set flat_footed: true if first turn
- [ ] Emit 'phaseStartOfTurn' event for listeners (conditions, auras, etc.)
- [ ] Implement `duringTurn(action)` hook for each action spent
- [ ] Update TurnActionBudget state based on action type
- [ ] Validate action legality per enforcement setting
- [ ] Update Pinia turn budget store
- [ ] Emit 'phaseActionSpent' event
- [ ] Implement `endOfTurn(combatant)` hook
- [ ] Process end-of-turn effects: duration decrements, state cleanup (stub for Phase 20)
- [ ] Mark turn complete in TurnActionBudget
- [ ] Emit 'phaseEndOfTurn' event
- [ ] Test: Start turn → budget resets to Fresh
- [ ] Test: Take action → duringTurn hook fires, budget updates
- [ ] Test: End turn → endOfTurn hook fires, cleanup occurs
- [ ] Test: Next combatant → their turn starts, their budget resets

**Action Economy Enforcement:**
- [ ] Fetch enforcement setting: `CONFIG.DND35E.actionEconomyEnforcement`
- [ ] Implement "warn" mode: validate action legality, show warning in chat if illegal, allow anyway
- [ ] Implement "enforce" mode: block illegal actions entirely with error message + reason
- [ ] Implement "off" mode: no validation, all actions allowed
- [ ] Implement GM override: if game.user.isGM, always skip enforcement (just warn in off-mode)
- [ ] Validate each action against current TurnActionBudget state before spending
- [ ] For invalid action, generate reason string: "Standard action already spent" / "Move action already spent" etc
- [ ] Show validation UI: warning yellow bar with reason OR error popup
- [ ] Test: Enforce mode, try invalid action → blocked with reason
- [ ] Test: Warn mode, try invalid action → allowed with warning in chat
- [ ] Test: Off mode → no validation
- [ ] Test: GM bypass → enforcement skipped for GM

**Turn Budget Display:**
- [ ] Create `src/vue/components/combat/TurnBudgetDisplay.vue` Vue component (already stubbed in Phase 8)
- [ ] Mount display in combat tracker sidebar (just above combatant list)
- [ ] Subscribe to Pinia turnBudgetStore for reactive updates
- [ ] Render current combatant's TurnActionBudget state
- [ ] Display state in plain language: "Fresh" → "Standard action available" / "AttackTaken" → "Full attack — 2 attacks remaining" / "FullAttack" → "Full attack — 1 attack remaining"
- [ ] Show spent action indicators: standard ✓/✗, move ✓/✗, swift ✓/✗, 5-foot step ✓/✗
- [ ] Show remaining movement: "20 ft / 30 ft"
- [ ] Show iterative attacks remaining: "Attacks: +11/+6/+1 (3/3)"
- [ ] Color-code state: green (actions available), yellow (limited actions), red (turn spent)
- [ ] Add Undo button: reverts last action via TurnActionBudget.undo()
- [ ] Add End Turn button: manually ends turn → nextTurn() in combat
- [ ] Mobile-responsive: compact layout for small screens
- [ ] Test: Display updates when state changes
- [ ] Test: Undo button reverts action
- [ ] Test: End Turn button advances to next combatant

**Movement Warnings & Validation:**
- [ ] Validate movement doesn't exceed budget
- [ ] Validate 5-foot step only used if no other movement
- [ ] Validate move action not taken twice
- [ ] Validate full-round actions prevent movement
- [ ] Validate charge has straight-line movement
- [ ] Validate movement in terrain restrictions (stub for Phase 15 environment)
- [ ] Show visual feedback in ruler: green ≤ speed, yellow ≤ 2×, red ≤ 4×
- [ ] Block movement beyond 4× speed (cannot run faster)
- [ ] Warn if difficult terrain encountered (stub, implement in Phase 15)
- [ ] Test: Ruler shows colors correctly based on distance
- [ ] Test: Movement beyond budget is blocked/warned
- [ ] Test: 5-foot step validates correctly

**Flat-Footed Tracking:**
- [ ] Initialize all combatants as flat-footed on combat start
- [ ] On first action taken (or surprise round completion), set flat-footed: false
- [ ] Reapply flat-footed condition if stunned/prone/disabled (stub for Phase 20)
- [ ] Use flat-footed status in AC calculation (subtract DEX bonus if flat-footed)
- [ ] Test: New combatant → flat-footed: true
- [ ] Test: After first action → flat-footed: false
- [ ] Test: AC calculation accounts for flat-footed (DEX not applied)

**Document Registration:**
- [ ] Register CombatDnd35e in CONFIG.Combat.documentClass
- [ ] Register CombatantDnd35e in CONFIG.Combatant.documentClass
- [ ] Ensure ACL created combats use Dnd35e subclasses
- [ ] Verify existing combats migrate (defer schema migration, stub for Phase 27)
- [ ] Test: Create new combat → CombatDnd35e instance
- [ ] Test: New combatant → CombatantDnd35e instance

**Localization & i18n:**
- [ ] Add i18n keys: turn states (Fresh, AttackTaken, FullAttack, etc.)
- [ ] Add i18n keys: action types (standard, move, swift, free, 5-foot step)
- [ ] Add i18n keys: turn budget display labels
- [ ] Add i18n keys: turn flow notifications (start-of-turn, end-of-turn)
- [ ] Add i18n keys: validation error reasons
- [ ] Add i18n keys: warning messages
- [ ] Update en.json with all new keys
- [ ] Test: Turn display shows localized text

**Comprehensive Testing:**
- [ ] Unit test: Initiative calculation (DEX +2 → +2)
- [ ] Unit test: Initiative tie-breaking (equal rolls → higher DEX wins)
- [ ] Unit test: TurnActionBudget state transitions per table
- [ ] Integration test: Create combat with 3 combatants → initiative rolled → correct order
- [ ] Integration test: Start encounter → first combatant's turn, budget Fresh
- [ ] Integration test: Take attack action → AttackTaken state
- [ ] Integration test: Take 2nd attack → FullAttack state
- [ ] Integration test: End turn → next combatant active, budget reset
- [ ] Integration test: Multiple rounds → budgets reset each turn
- [ ] Integration test: Token drag 20ft → movement deducted, state updates
- [ ] Integration test: Token drag 5ft → 5-foot step recorded
- [ ] Integration test: Movement validation → warn or block per setting
- [ ] Integration test: Action economy enforcement modes (warn/enforce/off)
- [ ] Integration test: GM bypass → enforcement skipped
- [ ] Integration test: End-of-turn cleanup → next turn starts fresh
- [ ] Edge case: Only 1 combatant → nextTurn() wraps to start of next round
- [ ] Edge case: Combatant with flat-footed condition → AC calculation adjusted
- [ ] Edge case: Burdened actor (reduced speed) → movement budget reduced
- [ ] Edge case: Surprised combatant (stub) → doesn't act first round
- [ ] Edge case: Grappling combatant → budget restricted to grapple actions
- [ ] Edge case: Mounted combatant → master + mount budgets linked
- [ ] Smoke test: Full 3-round combat with attacks, moves, spells → no console errors
- [ ] Smoke test: Switch between multiple combats → turn budgets track independently
- [ ] Performance test: 20 combatants in combat, turn start < 500ms
- [ ] Accessibility test: Turn display keyboard navigable, screen-reader compatible
