# Document Event System

> Relevant code: `src/helpers/documentEvents/`, `src/documents/document/DocumentDnd35e.mts`, `src/documents/actors/creature/events/`

This document describes the per-document lifecycle event system: how events are detected, queued, and emitted, and how the system should grow to support damage pipelines and AE-driven behaviours.

---

## 1. What exists today

### Core flow

```
updateHP(amount, type, metadata)
  ↓
logic helpers (updateHpViaDamage etc.) → build updateObject
  ↓
this.update(updateObject, { updateMetadata: HpAdjustmentMetadata })
  ↓
Foundry: _preUpdate
  → evaluateRegisteredFormulas(updateData)
  → events.checkForIncomingChangeEvents(updateData, metadata)
     → runs each registered EventChecker (before-state + delta inspection)
     → returns DocumentEvent[] for any that matched
  → appends matches to options.updateMetadata.pendingEvents
  ↓
Foundry: DB write (updateData is now committed)
  ↓
Foundry: _onUpdate
  → fires events.emit(event.event, event) for each pendingEvent
  → refreshes Vue store for open sheets
```

### Key types

| Type | Role |
|---|---|
| `EventChecker<TPayload>` | Pure function — inspects before-state (`parent`) + incoming `updateData`, returns `EventCheckResult` |
| `EventCheckResult<TPayload>` | `{ result: boolean; event: string; payload?: TPayload; ... }` |
| `DocumentEvent<TPayload>` | Queued event shape stored in `pendingEvents` |
| `DocumentUpdateMetadata` | Carried through Foundry `options`, holds `pendingEvents` and context (updateType, damageType, etc.) |

### Currently registered events on `Creature`

- `adjustHp` — any HP change (current/temp/nonlethal) in `updateData`
- `bloodied` — HP crosses the 50% threshold

### What the system does well

- Events fire regardless of call site — a macro calling `actor.update(...)` directly still triggers checkers, because they run in `_preUpdate`
- No tight coupling between who initiates the update and who reacts
- Priority ordering on checkers is in place

---

## 2. The two distinct subscriber roles

These are fundamentally different and must not be conflated.

### Role A — Damage pipeline (pre-write, deterministic)

**Examples:** Damage Reduction, immunity, vulnerability, energy resistance.

These are *calculations*, not event subscriptions. They transform the raw damage amount before `updateObject` is ever built — inside `updateHP`, before `this.update()` is called.

```
updateHP(rawAmount=10, type='fire', metadata)
  → pipeline: apply DR (fire 5/-) → reducedAmount = 5
  → pipeline: apply vulnerability (none) → finalAmount = 5
  → build updateObject: { 'system.hp.current': current - 5 }
  → this.update(updateObject, { updateMetadata })
```

DR is a pure function `(amount, damageType, actor) => modifiedAmount`. It does not subscribe to events. The event system receives the *result* of the pipeline, not the raw inputs.

**Second example — creature-type DR ("2 less damage from giants"):**

```
updateHP(rawAmount=10, type='bludgeoning', metadata={ sourceActorId: 'giant123' })
  → pipeline: look up attacker's creature type via sourceActorId → 'giant'
  → pipeline: check system.creatureTypeDR for 'giant' entry → found, amount=2
  → reducedAmount = 8
  → build updateObject: { 'system.hp.current': current - 8 }
  → this.update(updateObject)
  → _onUpdate: adjustHp event fires with amount=8 (already reduced)
```

The AE granting this uses a normal change — no `LISTENER` type:

```typescript
{
  key: 'system.creatureTypeDR',
  type: EFFECT_CHANGE_TYPE.ADD,
  value: { creatureType: 'giant', amount: 2 },
  phase: 'final',
}
```

**Key requirement surfaced:** Creature-type DR requires `metadata.sourceActorId` to be populated at the `updateHP` call site so the pipeline can look up the attacker's type. Every damage source (weapon attack, spell, trap, macro) must pass this. Sources that omit it are treated as untyped and no creature-type DR applies.

**Implementation note:** `updateHpViaDamage` is the right place to thread a `DamagePipeline` context through.

### Role B — Change reactors (post-write, async)

**Examples:** Apply Bloodied condition AE, send a damage chat message, check death threshold, grant temporary HP from a feat.

These run in `_onUpdate` after the DB write is committed. They cannot modify what was written. They CAN:

- Call `this.createEmbeddedDocuments(...)` to apply an AE condition
- Call `other.updateHP(...)` to redirect damage to another document
- Emit secondary events or show UI dialogs

The current `EventChecker` → `pendingEvents` → `_onUpdate` pipeline is correct for these.

---

## 3. The interactive interceptor pattern (knight's intercept ability)

The use case: a knight has an aura AE that grants nearby allies the ability to redirect 50% of incoming damage to the knight, upon the knight's choice.

This is a **post-write compensation** pattern. Foundry does not support pausing a DB write to await async user input. The correct flow:

```
1. Ally takes 10 damage → DB write commits (-10 HP)
2. _onUpdate: takeDamage event fires on the ally
3. A handler (registered by the knight's aura AE) presents an intercept prompt
4. Knight accepts → two compensating updates fire:
     ally.updateHP(-5, 'healing', ...)   // refund 5
     knight.updateHP(5, 'damage', ...)   // knight takes 5
5. The aura AE is removed from all allies in range
```

HP briefly shows full damage before compensating. This is unavoidable within Foundry's architecture; PF2e uses the same pattern.

**Key implication:** AEs that represent behavioural hooks need a way to subscribe to the bearer's events at AE application time and unsubscribe at removal. See §5.

---

## 3b. The automatic reactor pattern (+2 to hit vs. attacker)

A simpler variant: when a creature takes damage, it automatically gains a conditional +2 to hit against whoever attacked it — no player prompt, just apply it.

```
1. Creature takes 10 damage from Actor#abc → DB write commits
2. _onUpdate: takeDamage event fires with { sourceActorId: 'abc', ... }
3. AE listener handler runs automatically:
     bearer.createEmbeddedDocuments('ActiveEffect', [{
       name: '+2 vs attacker',
       changes: [{ key: 'system.attack', value: 2, ... }],
       flags: { dnd35e: { targetActorId: 'abc' } },
       duration: { ... },
     }]);
4. At attack time: attack system checks if roll target === flags.targetActorId → applies +2
```

This is the same reactor pattern but **automatic** — no compensation needed, just grant a new effect. Compared to the knight example:

| | Knight intercept | Retaliation +2 |
|---|---|---|
| Trigger | `takeDamage` | `takeDamage` |
| Response | Compensating HP updates + prompt | New conditional AE grant |
| Player input required? | Yes | No |
| Modifies existing write? | Yes (via compensation) | No |

This pattern also reveals that **the +2 is conditional on target**, which the AE change system does not natively support. The AE stores `targetActorId` in flags; the attack resolution system must read that flag and skip the bonus if the target doesn't match. This is an attack-time (`action.*` phase) concern, not an event system concern.

**Key requirement surfaced:** The `takeDamage` payload MUST carry `sourceActorId` reliably. The field exists in `TakeDamagePayload` but `checkForTakeDamageEvent` currently sets it from `payloadMetaData.sourceActorId` — which only works if `updateHP` was called with `metadata.attackerId` populated. Direct `actor.update()` calls will produce `sourceActorId: undefined`.

**Key implication:** AE listener handlers need richer context than just the event payload — they need the bearer document and access to the AE's own parameters. See §5.

---

## 4. Known issues to fix before expanding

### 4.1 Dead code: `outgoingEvents` in `Creature.updateHP`

All logic helpers return `events: []` which `updateHP` collects in `outgoingEvents` and never uses. Remove the `events` field from all helper return types and remove `outgoingEvents` from `updateHP`.

### 4.2 `bloodied.mts` payload is commented out

`checkForBloodiedEvent` fires with `result: true` but `result.payload` is commented out. Fix before the event is useful to any subscriber.

### 4.3 `takeDamage` checker is never registered

`checkForTakeDamageEvent` exists in `takeDamage.mts` but is not hooked up in `registerCreatureEventChecks`. `takeDamage` is distinct from `adjustHp` (damage only, not healing). Both should fire for any damage update.

### 4.4 `registerChangeEventCheck` deduplication bug

```typescript
// Always false — Set.has() uses object identity, not structural equality
if (this._registeredUpdateEventChecks.has({ event, check, priority })) { ... }
```

Not visible yet (checkers registered once per instance). Breaks as soon as AEs drive dynamic registration. Fix: switch to `Map<string, EventChecker<any>>` keyed by event name.

### 4.5 `DelayedEventManager` is abandoned

`src/helpers/DelayedEventManager.mts` is an earlier prototype using `Hooks.call`. Delete it.

### 4.6 Debug scaffolding

`debugger` statements in `DocumentDnd35e._preUpdate`/`_preCreate` and `console.log` subscriptions in `Creature` constructor. Remove before alpha.

### 4.7 `adjustmentAmount` naming mismatch

`HpAdjustmentMetadata.adjustmentAmount` is the raw pre-pipeline amount. If DR reduces 10 → 5, it still says `10`. Rename to `rawAmount`. Subscribers must derive applied damage from the HP state delta in the payload, not this field.

---

## 5. AE-driven event listeners (next major design decision)

The knight ability and similar features (Uncanny Dodge, reactive feats) are naturally expressed as AEs that hook into document events rather than applying static modifiers.

**Proposed change format:**

```typescript
// An AE change with a "listener" type
{
  key: 'onTakeDamage',           // event name to subscribe to
  type: EFFECT_CHANGE_TYPE.LISTENER,
  value: 'retaliationBonus',     // key into CONFIG.dnd35e.eventListeners
  phase: 'action',               // not applied during data-prep
}
```

**The handler needs bearer + AE context, not just the payload.**

The knight intercept handler needs to call `bearer.createEmbeddedDocuments(...)`. The retaliation +2 handler needs to read the AE's own parameters (e.g., bonus amount, which damage types trigger it). A raw event payload is not enough. The handler signature must be:

```typescript
type AEListenerHandler<TPayload> = (context: {
  bearer: DocumentDnd35e<any>;   // the document the AE is applied to
  ae: ActiveEffectDnd35e;        // the AE instance (for reading parameters)
  payload: TPayload;             // the event payload
}) => void | Promise<void>;
```

During `applyActiveEffects()`, the system wraps the registered function with this context before subscribing:

```typescript
const fn = CONFIG.dnd35e.eventListeners[change.value];
const registration = bearer.events.on(
  change.key,
  (payload) => fn({ bearer, ae, payload })
);
// store registration.token for later unsubscription
```

During AE removal (`_onDelete`): call `bearer.events.cancel(storedToken)`.

**Open questions before implementing:**

1. **Registry vs. inline.** CONFIG-key strings (`'retaliationBonus'`) are safe for world scripts and module namespacing. But inline handler functions defined in AE system data would allow more composability. The registry approach is the right starting point.
2. **AE parameters.** For "intercept 50%" or "only trigger on fire damage", where does the number live? Options: `change.value` (already a string, could be a formula), AE `system.*` fields, or a dedicated `params` SchemaField on the AE system. The `ae` reference in context gives access to all of these.
3. **Token storage.** The unsubscribe token must survive until AE deletion. Options: `ae.flags.dnd35e.listenerTokens = { [eventName]: token }`, a WeakMap keyed by AE instance, or the emitter itself keyed by AE id.
4. **`prepareData` re-application.** Foundry calls `prepareData` on every update, re-running `applyActiveEffects`. Listener-type changes must cancel the previous token before re-subscribing, or the emitter must deduplicate by AE id.
5. **`sourceActorId` reliability.** For the retaliation case the payload MUST carry `sourceActorId`. This only works if `updateHP` was called with metadata. Direct `actor.update()` calls will have `undefined`. The system should degrade gracefully (no AE granted) rather than error.

Deferred until §4 cleanup is complete.

---

## 6. Recommended next steps (ordered)

1. **Clean up dead code** — remove `events: []` from logic helpers, remove `outgoingEvents`, delete `DelayedEventManager`.
2. **Fix bloodied payload** — uncomment and complete `result.payload` in `checkForBloodiedEvent`.
3. **Register `takeDamage` checker** — hook it up in `registerCreatureEventChecks`.
4. **Build the damage pipeline** — add a `DamagePipeline` step inside `updateHP` before `handleUpdateHpViaDamage`. DR/immunity are pipeline functions, not event subscribers.
5. **Fix `registerChangeEventCheck` keying** — switch to `Map<string, EventChecker<any>>` before AE-driven registration lands.
6. **Design AE listener registration** — CONFIG registry + `LISTENER` change type, once steps 1–4 are stable.

---

## 7. What this system is NOT

- **Not a replacement for Foundry Hooks.** Hooks are global/module-facing. `document.events` is per-instance. Use Hooks for cross-document concerns; use `document.events` for per-actor reactions.
- **Not a synchronous guard.** `_preUpdate` returning `false` cancels an update. The event system cannot partially cancel or modify a committed write — only compensate after.
- **Not a data-preparation mechanism.** The AE phase system (`initial`, `final`) handles stat bonuses during `prepareData`. This system handles runtime state transitions outside the prep cycle.
