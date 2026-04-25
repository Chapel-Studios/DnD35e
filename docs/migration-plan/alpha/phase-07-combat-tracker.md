# Phase 14: Combat Tracker & Turn Economy

**Status**: 📋 Outlined (TurnActionBudget, action economy state machine)

> **Milestone**: POC  
> **Dependencies**: Phase 9 (Action System)  
> **Goal**: Foundry combat tracker with initiative, turns, and the TurnActionBudget state machine from Phase 8 (§18.3). Manages the progressive full-attack flow (§18.4), movement integration (§18.5), and action economy enforcement. This is where the action system meets the turn structure.

---

## 8.1 Initiative

- Initiative formula: `1d20 + @attributes.init.total` (uses `@attr` syntax for Foundry's native formula evaluation)
- Init total = DEX mod + misc bonuses (from feats/items via effects later)
- Tie-breaking: Higher DEX wins (via `Combat._sortCombatants()` override)
- Uses D20Roll from Phase 7
- **CONFIG**: `CONFIG.Combat.initiative.formula = '1d20 + @attributes.init.total'`, `CONFIG.Combat.initiative.decimals = 2`

## 8.2 Combat Document

- `CombatDnd35e` extending `Combat`
- Set `CONFIG.time.roundTime = 6` (6 seconds per combat round)
- Track round count for duration effects
- Override `_sortCombatants()` for DEX-based tiebreaking: equal initiative → higher DEX mod wins. Still equal → simultaneous (display order by combatant ID).
- Support for: delay, ready action, surprise round (deferred to Beta — see Phase 8 §18.15)

## 8.3 Combatant Document

- `CombatantDnd35e` extending `Combatant`
- Track: flat-footed until acted
- Override `_getInitiativeFormula()` for per-creature initiative variations
- **Owns** its `TurnActionBudget` via `Combatant.system` — the state machine that tracks what actions are available

### Persistence — Combatant.system (Not In-Memory)

TurnActionBudget state is **persisted to the database** via the `Combatant.system` field, NOT stored in a transient in-memory `Map` on the Combat class.

**Why this matters**: Foundry stores Combat/Combatant documents in the world's LevelDB database (`combats.db`). Every `.update()` writes to disk immediately. If the server restarts mid-combat, all turn state — round, turn index, initiative, and `combatant.system.turnBudget` — is fully restored.

**Implementation**: Define a `CombatantSystemModel` extending `TypeDataModel` with a `turnBudget` SchemaField:

```typescript
class CombatantSystemModel extends TypeDataModel {
  static defineSchema() {
    return {
      turnBudget: new SchemaField({
        state: new StringField({
          choices: ["fresh", "attackTaken", "fullAttackCommitted",
                    "standardTaken", "moveTaken", "chargeSpent", "grappled"],
          initial: "fresh"
        }),
        standardUsed: new BooleanField({ initial: false }),
        moveUsed: new BooleanField({ initial: false }),
        swiftUsed: new BooleanField({ initial: false }),
        fiveFootStepUsed: new BooleanField({ initial: false }),
        movementUsed: new NumberField({ initial: 0, integer: true }),
        movementBudget: new NumberField({ initial: 30, integer: true }),
        aoosRemaining: new NumberField({ initial: 1, integer: true }),
        flatFooted: new BooleanField({ initial: true }),
      })
    };
  }
}
```

**Access**: `combatant.system.turnBudget.state`
**Update**: `combatant.update({ "system.turnBudget.state": "attackTaken" })`
**Reset on turn change**: Hook `updateCombat` when `turn` changes → reset active combatant's `system.turnBudget` to fresh defaults.

**Why `system` not `flags`**:
- Schema validation on every update (catches invalid states)
- TypeScript type safety
- Auto-initialized on combatant creation (no manual setup)
- `system` is in Foundry's allowed-update list for combatant owners (players can spend their own actions)

**Permission model**: Foundry V14 allows combatant owners to update `system` and `flags`. The GM can update anything. This means players can spend actions on their own turn without GM relay.

## 8.3.1 CombatantGroup — Native v14 Feature

Foundry v14 provides `CombatantGroup` for grouping combatants with shared initiative and shared defeated status. Use this directly — no custom code needed:

- **Summoned creature groups**: All summons share the summoner's initiative. GM creates a group, drags summons into it.
- **Squad management**: Group of identical monsters (e.g., 4 goblins) roll initiative once for the group.
- **Mount + rider**: Linked initiative via group. The mount and rider act on the same turn.
- **Lair actions**: A group for lair actions that always act on a fixed initiative count.

```typescript
// Creating a group (API example)
const group = await CombatantGroup.create({
  name: "Goblin Squad",
  combatId: combat.id
});
// Add combatants to the group
await goblin1.update({ groupId: group.id });
await goblin2.update({ groupId: group.id });
// The group shares the highest initiative rolled by any member
```

No custom subclassing needed — `CombatantGroup` works out of the box. The combat tracker UI natively supports group display.

## 8.4 TurnActionBudget Integration

The TurnActionBudget state machine (designed in Phase 9, §18.3) lives here as the runtime turn management system. Key responsibilities:

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
2. UI shows "Continue Full Attack?" option (Phase 9, §18.4)
3. If continuing: state → `FullAttack`, move action consumed, IterativeAttackGenerator provides next attacks
4. Each subsequent attack: added to `attacks[]`, next attack available until exhausted
5. If stopping: turn proceeds normally with remaining budget

## 8.5 Movement Integration

Token drag events integrate with TurnActionBudget (Phase 9, §18.5):

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
- [ ] Set `CONFIG.Combat.initiative.formula = '1d20 + @attributes.init.total'` in `init` hook
- [ ] Set `CONFIG.Combat.initiative.decimals = 2` for tiebreaking precision
- [ ] Set `CONFIG.time.roundTime = 6` in `init` hook (6 seconds per combat round)
- [ ] Add initiative formula to actor preparation: `#self.attributes.init.total` = DEX mod + misc bonus
- [ ] Add system setting: `initBonusActor` (NumberField) for table-wide init modifier
- [ ] Implement actor initiative derivation in `prepareDerivedData()`: compute `system.attributes.init.total`
- [ ] Use D20Roll from Phase 7 for initiative rolls (already have crit/fumble detection)
- [ ] Test: Actor with DEX +2, no bonuses → init total = +2
- [ ] Test: Actor with DEX +2, +1 misc bonus → init total = +3
- [ ] Test: Recalculate init on actor update (e.g., DEX score changes)

**Combat Document Class:**
- [ ] Create `src/combat/CombatDnd35e.mts` extending Foundry's Combat document
- [ ] Register `CONFIG.Combat.documentClass = CombatDnd35e` in `init` hook
- [ ] Override `_sortCombatants()` for DEX-based tiebreaking (equal init → higher DEX mod wins)
- [ ] Override `_onUpdate()` to sync with Foundry's combat round/turn changes
- [ ] Override `nextTurn()`: advance to next combatant, reset their `system.turnBudget` to fresh defaults
- [ ] Override `reset()`: reset all combatants' `system.turnBudget` to fresh defaults
- [ ] Track round count: increment on each full round completion (for duration effects, Phase 20)
- [ ] Implement `roundStarted`: PropertyDescriptor that triggers on new round
- [ ] Implement `roundEnded`: PropertyDescriptor that triggers when round completes
- [ ] Support for surprise round combatants (stub for Phase 8.2 Beta — mark combatant as surprised)
- [ ] Test: Combat created → all combatants have `system.turnBudget` auto-initialized by schema
- [ ] Test: nextTurn() called → active combatant switches → `system.turnBudget` reset to fresh defaults
- [ ] Test: reset() called → all combatants' `system.turnBudget` reset
- [ ] Test: Server restart mid-combat → `system.turnBudget` state fully restored from LevelDB

**Combatant Document Class:**
- [ ] Create `src/combat/CombatantDnd35e.mts` extending Foundry's Combatant document
- [ ] Register `CONFIG.Combatant.documentClass = CombatantDnd35e` in `init` hook
- [ ] Define `CombatantSystemModel` extending `TypeDataModel` with `turnBudget` SchemaField (state, standardUsed, moveUsed, swiftUsed, fiveFootStepUsed, movementUsed, movementBudget, aoosRemaining, flatFooted)
- [ ] Register `CombatantSystemModel` so Foundry populates `Combatant.system` from it (persisted to LevelDB)
- [ ] Override `_getInitiativeFormula()`: return `"1d20 + @attributes.init.total"` (or per-creature variant)
- [ ] Implement `rollInitiative(formula, options)`: use D20Roll class for rolls
- [ ] Implement tie-breaking: on equal init rolls, higher DEX wins (via `_sortCombatants` on Combat)
- [ ] Implement `_onFirstAction()`: update `system.turnBudget.flatFooted` to false on first turn action
- [ ] Test: Combatant created → `system.turnBudget` auto-populated with fresh defaults via schema
- [ ] Test: Initiative formula uses actor's init total
- [ ] Test: Two combatants with same init → higher DEX wins tie-break
- [ ] Test: Combatant `system.turnBudget.flatFooted`: true on creation, false after first action

**CombatantGroup Integration (Foundry v14 native):**
- [ ] Verify CombatantGroup works out-of-box for grouping combatants (no custom subclass needed)
- [ ] Test: Create group, add 2 combatants → they share initiative
- [ ] Test: Summoned creatures added to summoner's group share initiative
- [ ] Test: Group defeated status propagates to all members
- [ ] Document CombatantGroup usage patterns for GMs (summons, squads, mount+rider)
- [ ] Add GM-facing UI hint: right-click combatant → "Create Group" / "Add to Group"

**TurnActionBudget State Machine:**
- [ ] (Note: Core TurnActionBudget was designed in Phase 9, but integrated here)
- [ ] Integrate TurnActionBudget into Combatant.system lifecycle (persisted to LevelDB via CombatantSystemModel)
- [ ] Bind `system.turnBudget` changes to Pinia store updates (from Phase 8)
- [ ] Implement turn reset: on combatant becomes active, update `system.turnBudget` to fresh defaults via `combatant.update()`
- [ ] Implement turn cleanup: on combatant becomes inactive, state is already persisted in `system.turnBudget` — no extra storage needed
- [ ] Verify all 16 state transitions work in live combat (not just unit tests)
- [ ] Test: Full combat round with 3+ combatants, `system.turnBudget` tracks independently per combatant
- [ ] Test: Multiple rounds, `system.turnBudget` resets correctly each turn
- [ ] Test: Server restart mid-combat → `system.turnBudget` state restored from LevelDB for all combatants

**Movement Integration with Token Drag:**
- [ ] Create token drag event listener: canvas.on('tokenDragMove', handler)
- [ ] Implement drag handler: calculate distance from token's starting position
- [ ] For drag distance ≤ 5ft: treat as 5-foot step → call budget.spend('fiveFootStep')
- [ ] For drag distance > 5ft: calculate combat distance → deduct from `system.turnBudget.movementBudget`
- [ ] Show ruler visual feedback: green (within speed), yellow (doubled speed), red (run/full-round)
- [ ] Enforce movement limits: if drag exceeds budget, warn (or block per setting)
- [ ] On drag complete: commit movement to `system.turnBudget` via `combatant.update()`
- [ ] Update token position only if movement was legal (or warn + revert)
- [ ] Implement movement speed tiers: 1x = walk, 2x = double move (consumes standard), 4x = run (full-round, -2 AC)
- [ ] Support armor check penalty reducing speed (stub for Phase 11)
- [ ] Test: Drag token 20ft → movement tracked, state updates
- [ ] Test: Drag token 5ft → treated as 5-foot step
- [ ] Test: Drag beyond budget → warning shown, movement blocked or truncated
- [ ] Test: Speed modifications apply correctly (e.g., burdened speed reduced)

**Turn Flow Hooks:**
- [ ] Implement `startOfTurn(combatant)` hook
- [ ] Reset `system.turnBudget` to fresh state via `combatant.update()` (persisted to DB)
- [ ] Set `system.turnBudget.movementBudget` from actor speed: `combatant.actor.system.attributes.speed.land`
- [ ] Process start-of-turn effects: duration countdowns, buff expirations (stub for Phase 20)
- [ ] Set `system.turnBudget.flatFooted`: true if first turn
- [ ] Emit 'phaseStartOfTurn' event for listeners (conditions, auras, etc.)
- [ ] Implement `duringTurn(action)` hook for each action spent
- [ ] Update `system.turnBudget` state based on action type via `combatant.update()`
- [ ] Validate action legality per enforcement setting
- [ ] Update Pinia turn budget store
- [ ] Emit 'phaseActionSpent' event
- [ ] Implement `endOfTurn(combatant)` hook
- [ ] Process end-of-turn effects: duration decrements, state cleanup (stub for Phase 20)
- [ ] Mark turn complete in `system.turnBudget`
- [ ] Emit 'phaseEndOfTurn' event
- [ ] Test: Start turn → `system.turnBudget` resets to Fresh
- [ ] Test: Take action → duringTurn hook fires, `system.turnBudget` updates
- [ ] Test: End turn → endOfTurn hook fires, cleanup occurs
- [ ] Test: Next combatant → their turn starts, their `system.turnBudget` resets

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
- [ ] Initialize all combatants as flat-footed via `system.turnBudget.flatFooted: true` on combat start (auto-initialized by schema)
- [ ] On first action taken (or surprise round completion), update `system.turnBudget.flatFooted: false`
- [ ] Reapply flat-footed condition if stunned/prone/disabled (stub for Phase 20)
- [ ] Use `system.turnBudget.flatFooted` in AC calculation (subtract DEX bonus if flat-footed)
- [ ] Test: New combatant → `system.turnBudget.flatFooted`: true (from schema initial)
- [ ] Test: After first action → `system.turnBudget.flatFooted`: false
- [ ] Test: AC calculation accounts for flat-footed (DEX not applied)

**Document Registration:**
- [ ] Verify `CONFIG.Combat.documentClass = CombatDnd35e` registered in init hook (done above)
- [ ] Verify `CONFIG.Combatant.documentClass = CombatantDnd35e` registered in init hook (done above)
- [ ] Verify `CONFIG.Combat.initiative.formula` set correctly
- [ ] Verify `CONFIG.Combat.initiative.decimals` set correctly
- [ ] Verify `CONFIG.time.roundTime = 6` set correctly
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
