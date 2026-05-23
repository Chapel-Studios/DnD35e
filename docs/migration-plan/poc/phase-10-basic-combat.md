# POC Phase 10: Basic Combat Stub

**Status**: 📄 Stub

> **Milestone**: POC  
> **Dependencies**: poc.6, poc.7, poc.9  
> **Goal**: The combat tracker is functional. A character can take a basic move, a double move, or a main-hand attack — the minimal action economy loop proving the system before alpha.3 builds the full action system.

---

## Overview

Phase 9 is the POC-level proof that a combat exchange works end-to-end. It sits between the actor/roll foundation (poc.6/poc.7) and the full Action System (alpha.3), proving the minimal loop before committing to the full architecture.

**What Phase 6 already provides:**
- Actor HP, `DocumentEventEmitter`, `takeDamage`/`dying`/`death` event cascade
- `wellKnownEvents` registry and `registerEventType()` infrastructure
- `destroyed` cascade on item HP

**What Phase 9 adds:**
- `UseActionContext` interface and action event payload interfaces
- `preUseAction`/`postUseAction`/`dealDamage` domain events wired and emitted
- A minimal "roll to hit → apply damage" flow through the actor
- Basic chat card showing attack result

This deliberately stops short of the full action system. Alpha.3 builds the complete `ActionDataModel`, execution engine, and combat maneuvers on top of this foundation.

---

## Action Events

### Actor Events

| Event | Payload | Emitted when | Example use case |
|-------|---------|-------------|----------------|
| `preUseAction` | `UseActionContext & { cancel: () => void }` | Before action executes — `cancel()` aborts | Silence, exhaustion, curse gates |
| `postUseAction` | `UseActionContext & { result: ActionResult }` | After action completes | Resource tracking, backlash effects |
| `dealDamage` | `{ amount: number, damageType: string, target: ActorDnd35e, context?: UseActionContext }` | Actor deals damage to another | Cleave trigger, life-drain |

### UseActionContext

```typescript
interface UseActionContext {
  actor: ActorDnd35e;      // The actor executing the action
  item: ItemDnd35e;        // Item that declared the action
  action: ActionDataModel; // Resolved action data model
  itemId: string;
  actionId: string;
  params: unknown[];
}
```

### preUseAction Cancellation Pattern

`preUseAction` merges `cancel: () => void` into the context. Any subscriber calling `cancel()` aborts execution before the action budget is consumed. Multiple calls are idempotent.

```typescript
// In actor.useAction(itemId, actionId, ...params):
const item = this.items.get(itemId);
const action = item.system.actions.get(actionId);
const context: UseActionContext = { actor: this, item, action, itemId, actionId, params };

const cancelled = { value: false };
const payload = { ...context, cancel: () => { cancelled.value = true; } };
await this.events.emit('preUseAction', payload);
if (cancelled.value) return; // Action aborted — budget not consumed

// ... execute the action
const result = await action.execute(context);

await this.events.emit('postUseAction', { ...context, result });
```

---

## TODO (Stub — to flesh out at phase-start)

This phase is a stub. Full spec to be written when Phase 9 planning begins.

**Event infrastructure:**
- [ ] Define `UseActionContext` interface
- [ ] Define `PreUseActionPayload`, `PostUseActionPayload`, `DealDamagePayload` typed interfaces
- [ ] Register `preUseAction`, `postUseAction`, `dealDamage` in `wellKnownEvents` at system init

**Basic combat loop:**
- [ ] ...attack action wiring...
- [ ] ...D20Roll with FormulaFamiliar `#self.bab` + `#self.abilities.str.mod` context...
- [ ] ...hit/miss determination against target AC...
- [ ] ...damage roll → `applyDamage()` → `takeDamage` event cascade...
- [ ] ...basic chat card for attack result...

**Explore-at-phase-start:**
- [ ] How much of alpha.3's `ActionDataModel` do we need here vs. a lighter stub?
- [ ] Does poc.9 define `ActionResult` or stub it as `unknown`?
