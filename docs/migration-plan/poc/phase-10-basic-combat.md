# POC Phase 10: Basic Combat

**Status**: 📝 Planned

> **Milestone**: POC  
> **Dependencies**: poc.6, poc.7, poc.9  
> **Goal**: The combat tracker is functional. A character can take a basic move, a double move, or a main-hand attack — the minimal action economy loop proving the system before alpha.3 builds the full action system.

---

## Table of Contents

1. [Overview & Scope](#overview--scope)
2. [CombatantDnd35e & Action Economy](#combatantdnd35e--action-economy)
3. [Initiative & Combat Tracker](#initiative--combat-tracker)
4. [ActionDataModel — First Cut](#actiondatamodel--first-cut)
5. [Default Weapon Actions](#default-weapon-actions)
6. [SIZE_REACH & Target Validation](#size_reach--target-validation)
7. [Movement Budget Hook](#movement-budget-hook)
8. [Action Execution Engine](#action-execution-engine)
9. [Chat Card](#chat-card)
10. [Sheet & Canvas Triggers](#sheet--canvas-triggers)
11. [Open Decisions](#open-decisions)
12. [Stories & Completion Checklist](#stories--completion-checklist)

---

## Overview & Scope

Phase 10 is the POC-level proof that a combat exchange works end-to-end. It sits between the actor/roll foundation (poc.6/poc.7) and the full Action System (alpha.3), proving the minimal loop before committing to the full architecture.

### What Phase 6 already provides
- Actor HP, `DocumentEventEmitter`, `takeDamage`/`dying`/`death` event cascade
- `wellKnownEvents` registry and `registerEventType()` infrastructure
- `destroyed` cascade on item HP

### What Phase 7 already provides
- `D20Roll` and `DamageRoll` custom roll classes
- `ActorRollData` / `ItemRollData` shapes
- `FormulaFamiliar` resolve pipeline (`#self.*`, `@attr` bridge)
- `getRollData()` derived from schema metadata

### What Phase 9 already provides
- `TokenDocumentDnd35e` real class with `_preCreate()` size defaults
- `SIZE_TOKEN_DIMENSIONS` constant
- 5-mode movement speed fields on the actor sheet (`walk`, `fly`, `swim`, `burrow`, `climb`)
- `_getAnimationMovementSpeed()` override on `TokenDnd35e`

### What Phase 10 adds
- `CombatantDnd35e` with `system.actions` tracking (standard, move)
- Initiative formula wired to `system.attributes.init.total`
- Combat tracker rows show action icon pips (S/M); pips reset on turn start
- `ActionDataModel` first cut: attack + damage + chain (scoped to single melee attack)
- Default weapon actions seeded on weapon `_onCreate()`
- `SIZE_REACH` constant: size → reach in feet
- Movement budget hook (`preUpdateToken`): token drag → distance → action consumed
- `UseActionContext`, `preUseAction` / `postUseAction` / `dealDamage` domain events
- `useAction()` execution engine on `ActorDnd35e`
- D20Roll vs target AC → hit/miss → chain → DamageRoll → `takeDamage()`
- Chat card: attack result with roll details
- Two attack triggers: weapon row button on character sheet + canvas right-click menu

### Scope boundaries — deliberately excluded
| Feature | Deferred to |
|---------|-------------|
| Iterative attacks / full attack action | alpha.3 |
| Ranged attacks | alpha.3 |
| Two-weapon fighting | alpha.3 |
| Swift/free/immediate actions | alpha.3 |
| Attacks of Opportunity | alpha.3 |
| Progressive full-attack BG3 flow | alpha.3 |
| Token HUD action palette | alpha.3 |
| Combat maneuvers (trip, grapple, bull rush) | alpha.3 |
| Spell attacks | alpha.11 |

---

## §10.1 CombatantDnd35e & Action Economy

### CombatantSystemModel schema

```typescript
// src/documents/combat/combatant/CombatantSystemModel.mts
class CombatantSystemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      actions: new foundry.data.fields.SchemaField({
        standard: new foundry.data.fields.BooleanField({ initial: true,
          label: 'DND35E.COMBAT.ACTIONS.standard' }),
        move: new foundry.data.fields.BooleanField({ initial: true,
          label: 'DND35E.COMBAT.ACTIONS.move' }),
        // swift deferred to alpha.3
      }),
    };
  }
}
```

### CombatantDnd35e class

```typescript
// src/documents/combat/combatant/CombatantDnd35e.mts
class CombatantDnd35e extends foundry.documents.BaseCombatant {
  declare system: CombatantSystemModel;

  /** Reset action slots at the start of this combatant's turn. */
  async resetActions(): Promise<void> {
    await this.update({ 'system.actions.standard': true, 'system.actions.move': true });
  }
}
```

Register: `CONFIG.Combatant.documentClass = CombatantDnd35e`

### Turn-start reset hook

```typescript
// src/hooks/onUpdateCombat.mts
Hooks.on('updateCombat', async (combat: CombatDnd35e, diff: object) => {
  if (!('turn' in diff)) return;
  const combatant = combat.combatant;
  if (!combatant) return;
  await combatant.resetActions();
});
```

### Action consumption

When the execution engine or movement hook consumes an action, it updates the combatant directly:

```typescript
// Consume standard action
await combat.combatant?.update({ 'system.actions.standard': false });
// Consume move action
await combat.combatant?.update({ 'system.actions.move': false });
```

---

## §10.2 Initiative & Combat Tracker

### Initiative formula

```typescript
// src/constants/combat.mts (or CONFIG setup in main.mts)
CONFIG.Combat.initiative = {
  formula: '1d20 + @attributes.init.total',
  decimals: 2,
};
```

`@attributes.init.total` resolves via `actor.getRollData()` from the actor's initiative total (computed in poc.6).

### Combat tracker action pips

The default `CombatTracker` template is extended to show action state for each combatant row. Two icon pips appear to the right of the initiative value:

- **S** (swords icon) — standard action remaining; greyed when `system.actions.standard === false`
- **M** (boot icon) — move action remaining; greyed when `system.actions.move === false`

Implementation: Subclass `CombatTracker` (or use a template override) to inject pip HTML. Register: `CONFIG.ui.combat = CombatTrackerDnd35e`.

The exact Foundry v14 template extension API (subclass vs template partial vs `renderCombatTracker` hook) should be evaluated at phase start. **Fallback**: use the `renderCombatTracker` Foundry hook to inject the pips via DOM manipulation if subclassing proves unwieldy.

---

## §10.3 ActionDataModel — First Cut

Actions are **embedded DataModel instances** within an item's system data — not separate Foundry Documents.

### ActionDataModel schema

```typescript
// src/documents/items/action/ActionDataModel.mts
class ActionDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      id: new foundry.data.fields.StringField({ required: true, blank: false }),
      name: new foundry.data.fields.StringField({ required: true, blank: false }),
      type: new foundry.data.fields.StringField({
        // poc.10: attack only. Alpha.3 adds: check, save, damage, heal, effect, utility
        choices: ['attack'],
        initial: 'attack',
      }),
      activation: new foundry.data.fields.StringField({
        // poc.10: standard/move. Alpha.3 adds: swift, free, fullRound, immediate, passive, aoo
        choices: ['standard', 'move'],
        initial: 'standard',
      }),

      // Attack check (used when type === 'attack')
      check: new foundry.data.fields.SchemaField({
        formula: new FormulaField({
          label: 'DND35E.ACTION.checkFormula',
          // Default: "1d20 + #self.attributes.bab.total + #self.abilities.str.mod"
        }),
        against: new foundry.data.fields.StringField({
          choices: ['armorClass', 'touchAc', 'flatFootedAc'],
          initial: 'armorClass',
        }),
      }, { required: false, nullable: true, initial: null }),

      // Damage roll (triggered on hit via chain)
      damage: new foundry.data.fields.SchemaField({
        formula: new FormulaField({
          label: 'DND35E.ACTION.damageFormula',
          // Default filled from weapon's damage die + #self.abilities.str.mod
        }),
        type: new foundry.data.fields.StringField({
          label: 'DND35E.ACTION.damageType',
        }),
        critRange: new foundry.data.fields.NumberField({ initial: 20, integer: true }),
        critMultiplier: new foundry.data.fields.NumberField({ initial: 2, integer: true }),
      }, { required: false, nullable: true, initial: null }),

      // Execution chain: what to trigger after this action resolves
      chain: new foundry.data.fields.ArrayField(
        new foundry.data.fields.EmbeddedDataField(ActionChainLinkModel)
      ),
    };
  }
}

class ActionChainLinkModel extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      trigger: new foundry.data.fields.StringField({
        choices: ['onSuccess', 'onFailure', 'onCrit', 'onFumble', 'always'],
      }),
      actionId: new foundry.data.fields.StringField(),
      description: new foundry.data.fields.StringField(),
    };
  }
}
```

> **Alpha.3 extension note**: Alpha.3 adds `save`, `heal`, `effect`, `utility` action types; `swift`/`free`/`immediate`/`aoo` activations; `effect` block; `provokesAoO`; healing block; `onKill`/`onChoice` chain triggers; full execution state machine; progressive full-attack flow.

### FormulaFamiliar contexts

The `check.formula` and `damage.formula` fields declare the following FormulaFamiliar contexts:

```typescript
const actionFormulaContexts: FormulaContext[] = [
  {
    contextName: 'Actor',
    resolvePath: 'parent.parent',   // ActionDataModel → Item → Actor
    documentType: 'Actor',
    aliases: ['self'],
    // Exposes: #self.abilities.str.mod, #self.attributes.bab.total, etc.
  },
  {
    contextName: 'Item',
    resolvePath: 'parent',
    documentType: 'Item',
    aliases: ['item', 'weapon'],
    // Exposes: #item.enhancement, #item.damage, etc.
  },
  {
    contextName: 'Target',
    resolvePath: 'runtime',         // Resolved at execution time
    documentType: 'Actor',
    aliases: [],
    // Exposes: #target.defense.armorClass, #target.defense.touchAC, etc.
  },
];
```

### Embedding actions in WeaponSystemModel

```typescript
// In WeaponSystemModel.defineSchema()
actions: new foundry.data.fields.ArrayField(
  new foundry.data.fields.EmbeddedDataField(ActionDataModel),
  { label: 'DND35E.ITEM.actions' }
),
```

---

## §10.4 Default Weapon Actions

When a weapon item is created, `_onCreate()` seeds a default attack action:

```typescript
// In WeaponDnd35e._onCreate()
protected override async _onCreate(data: object, options: object, userId: string): Promise<void> {
  await super._onCreate(data, options, userId);
  if (game.userId !== userId) return;

  const defaultActions: Partial<ActionDataModel>[] = [{
    id: foundry.utils.randomID(),
    name: game.i18n.localize('DND35E.ACTION.defaultAttackName'),  // "Attack"
    type: 'attack',
    activation: 'standard',
    check: {
      formula: '1d20 + #self.attributes.bab.total + #self.abilities.str.mod',
      against: 'armorClass',
    },
    damage: {
      formula: this.system.damage.formula ?? '1d4',  // use weapon's damage formula
      type: this.system.damage.type ?? 'bludgeoning',
      critRange: 20,
      critMultiplier: 2,
    },
    chain: [
      { trigger: 'onSuccess', actionId: 'damage', description: 'On hit, roll damage' },
    ],
  }];

  await this.update({ 'system.actions': defaultActions });
}
```

> **Note**: The `damage` chain reference (`actionId: 'damage'`) is resolved by the execution engine via the action's own `damage` block rather than a separate action lookup. Clarify and finalize during implementation.

---

## §10.5 SIZE_REACH & Target Validation

### Constant

```typescript
// src/constants/sizes.mts — alongside SIZE_TOKEN_DIMENSIONS
export const SIZE_REACH: Record<Size, number> = {
  fine:       0,   // no reach, can't threaten
  diminutive: 0,
  tiny:       0,
  small:      5,
  medium:     5,
  large:      10,
  huge:       15,
  gargantuan: 15,
  colossal:   20,
};
```

Values are in feet (5ft grid). Based on D&D 3.5e SRD Table 8-4.

### Target validation

Before executing an attack action, the execution engine validates that the target is within reach:

```typescript
function isWithinReach(attacker: TokenDnd35e, target: TokenDnd35e, reach: number): boolean {
  const distance = canvas.grid.measurePath([attacker.center, target.center]).distance;
  return distance <= reach;
}
```

---

## §10.6 Movement Budget Hook

Token drag → distance check → action consumption. This is new territory; the exact Foundry v14 hook API should be verified at phase start.

### Expected design

```typescript
// src/hooks/onPreUpdateToken.mts
Hooks.on('preUpdateToken', (tokenDoc: TokenDocumentDnd35e, diff: object, options: object) => {
  if (!('x' in diff || 'y' in diff)) return;
  if (!canvas.scene?.active) return;
  const combat = game.combat;
  if (!combat?.started) return;  // only enforce during active combat

  const combatant = combat.getCombatantByToken(tokenDoc.id);
  if (!combatant) return;

  const currentPos = { x: tokenDoc.x, y: tokenDoc.y };
  const newPos = { x: diff.x ?? tokenDoc.x, y: diff.y ?? tokenDoc.y };
  const distance = canvas.grid.measurePath([currentPos, newPos]).distance;  // feet
  const speed = combatant.actor?.system.movement.walk ?? 30;
  const actions = combatant.system.actions;

  if (distance <= speed) {
    if (!actions.move) { ui.notifications.warn('No move action remaining.'); return false; }
  } else if (distance <= speed * 2) {
    if (!actions.move || !actions.standard) {
      ui.notifications.warn('Insufficient actions for double move.'); return false;
    }
  } else {
    ui.notifications.warn('Cannot move that far this turn.'); return false;
  }
});
```

Action consumption fires on `updateToken` after the position change is committed.

> **Open decision at phase start**: Does Foundry v14's `preUpdateToken` allow returning `false` to cancel? Verify `TokenDocument._preUpdate()` signature. Fallback: allow the move, flag overage warning on combatant.

---

## §10.7 Action Execution Engine

### UseActionContext & events

These were deferred from poc.6 §5.9. They are registered here.

```typescript
// Register at system init
registerEventType('preUseAction');
registerEventType('postUseAction');
registerEventType('dealDamage');
```

Event payloads:

| Event | Payload | Emitted when | Example use case |
|-------|---------|-------------|----------------|
| `preUseAction` | `UseActionContext & { cancel: () => void }` | Before action executes | Silence, exhaustion, curse gates |
| `postUseAction` | `UseActionContext & { result: ActionResult }` | After action completes | Resource tracking, backlash effects |
| `dealDamage` | `{ amount: number; damageType: string; target: ActorDnd35e; context?: UseActionContext }` | Actor deals damage to another | Cleave trigger, life-drain |

```typescript
interface UseActionContext {
  actor: ActorDnd35e;
  item: ItemDnd35e;
  action: ActionDataModel;
  itemId: string;
  actionId: string;
  params: unknown[];
}

interface ActionResult {
  hit: boolean;
  criticalHit: boolean;
  attackTotal?: number;
  targetAc?: number;
  damageDealt?: number;
  cancelled: boolean;
}
```

### preUseAction Cancellation Pattern

`preUseAction` merges `cancel: () => void` into the context. Any subscriber calling `cancel()` aborts execution before the action budget is consumed. Multiple calls are idempotent.

```typescript
const cancelled = { value: false };
await this.events.emit('preUseAction', { ...context, cancel: () => { cancelled.value = true; } });
if (cancelled.value) return { hit: false, criticalHit: false, cancelled: true };
```

### useAction() on ActorDnd35e

```typescript
async useAction(itemId: string, actionId: string, targetId?: string): Promise<ActionResult | null> {
  const item = this.items.get(itemId);
  const action = item.system.actions?.find((a: ActionDataModel) => a.id === actionId);
  const context: UseActionContext = { actor: this, item, action, itemId, actionId, params: [targetId] };

  // preUseAction — allow cancellation
  let cancelled = false;
  await this.events.emit('preUseAction', { ...context, cancel: () => { cancelled = true; } });
  if (cancelled) return { hit: false, criticalHit: false, cancelled: true };

  // Validate action economy (during active combat only)
  const combat = game.combat;
  const combatant = combat?.getCombatantByActor(this.id);
  if (combat?.started && combatant) {
    const actions = combatant.system.actions;
    if (action.activation === 'standard' && !actions.standard) {
      ui.notifications.warn(game.i18n.localize('DND35E.COMBAT.noStandardAction'));
      return null;
    }
  }

  const result = await this._executeAttackAction(context, targetId);

  // Consume action slot
  if (combat?.started && combatant && !result.cancelled) {
    await combatant.update({ 'system.actions.standard': false });
  }

  await this.events.emit('postUseAction', { ...context, result });
  return result;
}
```

### _executeAttackAction()

```typescript
private async _executeAttackAction(context: UseActionContext, targetId?: string): Promise<ActionResult> {
  const { actor, item, action } = context;
  const target = targetId ? (game.actors?.get(targetId) ?? null) : null;
  const targetToken = canvas.tokens?.placeables.find(t => t.actor?.id === targetId) ?? null;
  const attackerToken = canvas.tokens?.placeables.find(t => t.actor?.id === actor.id) ?? null;

  // Reach validation
  if (attackerToken && targetToken) {
    const reach = SIZE_REACH[actor.system.details.size as Size] ?? 5;
    if (!isWithinReach(attackerToken, targetToken, reach)) {
      ui.notifications.warn(game.i18n.localize('DND35E.COMBAT.targetOutOfReach'));
      return { hit: false, criticalHit: false, cancelled: false };
    }
  }

  // Attack roll
  const rollData = { ...actor.getRollData(), target: target?.getRollData() ?? {} };
  const attackRoll = await new D20Roll(action.check?.formula ?? '1d20', rollData).evaluate();
  const targetAc = target?.system.defense[action.check?.against ?? 'armorClass'] ?? 10;
  const hit = attackRoll.total >= targetAc;
  const criticalHit = attackRoll.isCrit && hit;

  // Deal damage on hit
  let damageDealt = 0;
  if (hit && action.damage && target) {
    const damageRoll = await new DamageRoll(
      action.damage.formula,
      rollData,
      { critical: criticalHit, critMultiplier: action.damage.critMultiplier }
    ).evaluate();
    damageDealt = damageRoll.total;

    await this.events.emit('dealDamage', { amount: damageDealt, damageType: action.damage.type, target, context });
    await target.takeDamage(damageDealt, { damageType: action.damage.type, source: actor });
  }

  const result: ActionResult = { hit, criticalHit, attackTotal: attackRoll.total, targetAc, damageDealt, cancelled: false };
  await createAttackChatCard(context, attackRoll, result, target);
  return result;
}
```

---

## §10.8 Chat Card

A chat card is created for each attack, hit or miss.

**Card content:**
- Attacker name + weapon name
- Attack roll: formula + dice result + total
- Hit/miss indicator (vs target AC)
- Damage roll + total (if hit)
- Crit indicator (if critical hit)

```typescript
// src/documents/actors/baseActor/attack/createAttackChatCard.mts
export async function createAttackChatCard(
  context: UseActionContext,
  attackRoll: D20Roll,
  result: ActionResult,
  target: ActorDnd35e | null
): Promise<void> {
  const html = await renderTemplate('systems/dnd35e/templates/chat/attack-card.hbs', {
    actorName: context.actor.name,
    weaponName: context.item.name,
    attackRoll,
    result,
    targetName: target?.name ?? null,
  });

  await ChatMessage.create({
    content: html,
    rolls: [attackRoll],
    speaker: ChatMessage.getSpeaker({ actor: context.actor }),
  });
}
```

Template: `src/templates/chat/attack-card.hbs`

---

## §10.9 Sheet & Canvas Triggers

### Sheet trigger

Each weapon row on the character sheet shows an attack button:

```vue
<button type="button" class="field-control-btn" @click="onAttack(weapon.id)">
  <i class="fas fa-sword" />
</button>
```

```typescript
async function onAttack(itemId: string): Promise<void> {
  const targetToken = game.user?.targets?.first() ?? null;
  if (!targetToken && game.combat?.started) {
    ui.notifications.warn(game.i18n.localize('DND35E.COMBAT.selectTargetFirst'));
    return;
  }
  const defaultAction = store.actor.items.get(itemId)?.system.actions?.[0];
  if (!defaultAction) return;
  await store.actor.useAction(itemId, defaultAction.id, targetToken?.actor?.id);
}
```

### Canvas right-click trigger

When a player right-clicks their own controlled token, an "Attack with..." submenu lists equipped weapons with attack actions. Selecting one triggers `actor.useAction()` with the currently targeted token.

> **Open decision at phase start**: Exact Foundry v14 API for canvas token context menu. Candidates: (a) override `Token._getContextMenuOptions()`, (b) `getTokenContextOptions` hook, (c) extend `TokenHUD`. Verify which is available and idiomatic in v14.

---

## §10.10 Open Decisions

| # | Decision | Fallback |
|---|----------|----------|
| 1 | Canvas right-click API (`Token._getContextMenuOptions()` vs `getTokenContextOptions` hook vs `TokenHUD`) | Sheet-only attack until resolved; canvas trigger deferred to Story 5 |
| 2 | `preUpdateToken` cancellation: does `return false` prevent the move in v14? | Allow move, emit warning, flag overage on combatant |
| 3 | Combat tracker extension: subclass `CombatTracker` vs `renderCombatTracker` hook | Use hook + DOM injection |
| 4 | Chain resolution: does `actionId: 'damage'` look up a separate action or is it resolved from `action.damage` directly? | Infer from `action.damage` block directly in poc.10; full chain lookup in alpha.3 |

---

## §10.11 Files to Create / Modify

### New files
| File | Description |
|------|-------------|
| `src/documents/combat/combatant/CombatantDnd35e.mts` | Custom Combatant class |
| `src/documents/combat/combatant/CombatantSystemModel.mts` | `system.actions` DataModel |
| `src/documents/items/action/ActionDataModel.mts` | ActionDataModel + ActionChainLinkModel |
| `src/hooks/onUpdateCombat.mts` | Turn-start action reset hook |
| `src/hooks/onPreUpdateToken.mts` | Movement budget validation hook |
| `src/hooks/onUpdateToken.mts` | Movement action consumption hook |
| `src/documents/actors/baseActor/attack/createAttackChatCard.mts` | Chat card factory |
| `src/templates/chat/attack-card.hbs` | Attack result Handlebars template |

### Modified files
| File | Change |
|------|--------|
| `src/constants/sizes.mts` | Add `SIZE_REACH` constant |
| `src/documents/actors/baseActor/ActorDnd35e.mts` | Add `useAction()` + `_executeAttackAction()` |
| `src/documents/items/weapon/WeaponSystemModel.mts` | Add `actions` field |
| `src/documents/items/weapon/WeaponDnd35e.mts` | Add `_onCreate()` to seed default attack action |
| `src/vue/sheets/actor/character/CharacterSheet.vue` | Add attack button to weapon row |
| `src/canvas/token/TokenDnd35e.mts` | Register canvas right-click attack submenu |
| `src/main.mts` (or init) | Register `CombatantDnd35e`, initiative formula, event types, tracker |

---

## §10.12 Stories & Completion Checklist

### Story 1 — Combat tracker with initiative
**User**: GM / Player  
**Delivers**: "Start combat → see token order by initiative; action pips show S/M remaining; pips reset on turn start"  
**Routing**: Lead dev (CombatantDnd35e) + Jr dev (initiative formula, hook, pip template)

- [ ] Create `CombatantSystemModel` with `actions.standard` + `actions.move` boolean fields
- [ ] Create `CombatantDnd35e` extending `Combatant`; add `resetActions()` method
- [ ] Register `CONFIG.Combatant.documentClass = CombatantDnd35e` in system init
- [ ] Wire initiative formula: `'1d20 + @attributes.init.total'`
- [ ] `updateCombat` hook: call `combatant.resetActions()` on turn advance
- [ ] Extend combat tracker rendering: S/M pips per row, greyed when action unavailable

**Flat-Footed as First Condition AE (Proof of Concept):**
- [ ] Create `src/constants/conditions.mts` with flat-footed AE template:
  ```typescript
  export const CONDITIONS = {
    flatFooted: {
      id: 'flatFooted',
      label: 'dnd35e.conditions.flatFooted',
      icon: 'icons/svg/dazed.svg',  // placeholder, no token display yet
      changes: [],  // Flat-footed doesn't use AE changes; instead, AC calc checks for the AE
      flags: { dnd35e: { conditionType: 'flatFooted', isCondition: true } }
    }
  };
  ```
- [ ] Create `ConditionManager` static utility class in `src/documents/actors/creature/ConditionManager.mts`:
  - `static applyCondition(actor, conditionId)`: creates AE with condition template
  - `static removeCondition(actor, conditionId)`: finds and deletes condition AE by `flags.dnd35e.conditionType`
  - `static hasCondition(actor, conditionId)`: checks for active condition AE
- [ ] In `onUpdateCombat` hook: when combat starts, apply flat-footed AE to all combatants
- [ ] In AC calculation (`CreatureSystemModel.prepareDerivedData()`): check if actor has flat-footed condition AE, if so exclude DEX from flatFooted AC calculation
- [ ] Test: Start combat → all combatants have flat-footed AE. After first turn, flat-footed AE is removed (or persists based on design choice). AC calculation respects flat-footed status.

**Verify**: Roll initiative → combatants ordered. Advance turn → pips reset. Use attack → S greys. Flat-footed AE applied/removed correctly per turn. AC calculated without DEX when flat-footed.

---

**AC Calculation Implementation Notes**:
- `defense.armorClass` = 10 + armor bonus + shield bonus + min(DEX mod, max DEX) + size mod + dodge
- `defense.touchAC` = 10 + DEX mod + size mod + dodge (no armor/shield)
- `defense.flatFootedAC` = 10 + armor bonus + shield bonus + size mod (no DEX, no dodge)
- When flat-footed AE is active: lose DEX bonus in `defense.armorClass` and `defense.touchAC` calculations (Phase 15 will expand this; Phase 10 stubs to basic logic)
- Flat-footed status is NOT stored on actor data; it is ONLY represented by the presence of the condition AE (no condition flags on schema)

---

### Story 2 — ActionDataModel first cut
**User**: Developer / GM authoring weapons  
**Delivers**: "Weapon has a default Attack action with formula; formula autocomplete resolves `#self.attributes.bab.total`"  
**Routing**: Lead dev (schema, contexts) + Jr dev (weapon `_onCreate`, action display)

- [ ] Create `ActionChainLinkModel` schema
- [ ] Create `ActionDataModel` schema (attack type: `check`, `damage`, `chain`, `activation`)
- [ ] Add `actions` field (array) to `WeaponSystemModel`
- [ ] Attach FormulaFamiliar contexts to `check.formula` and `damage.formula`
- [ ] Implement `WeaponDnd35e._onCreate()` to seed default attack action
- [ ] Display action list on weapon sheet (read-only for poc.10)

**Verify**: Create weapon → `system.actions[0]` is an attack action with correct formulas. FormulaFamiliar autocomplete includes `#self.abilities.str.mod`.

---

### Story 3 — Move action on canvas
**User**: Player (during combat)  
**Delivers**: "Drag token ≤ speed → [M] consumed; drag > speed ≤ 2× speed → [S][M] consumed; drag beyond → blocked"  
**Routing**: Lead dev (movement hook) + Jr dev (SIZE_REACH constant, tracker update)

- [ ] Add `SIZE_REACH` constant to `src/constants/sizes.mts`
- [ ] Implement `preUpdateToken` hook: distance calc, validate against speed budget, cancel if over-budget
- [ ] Double-move logic: spend standard as extra move action
- [ ] `updateToken` hook: consume appropriate action slots on combatant after move commits
- [ ] Tracker row reflects consumed pips after token moves

**Verify**: Move token ≤ speed → [M] consumed. Move > speed ≤ 2× → [S][M] consumed. Move > 2× → blocked with warning.

---

### Story 4 — Melee attack + chat card
**User**: Player (during combat, from character sheet)  
**Delivers**: "Click attack on weapon row → target selected → d20 rolled → hit/miss + damage in chat → [S] consumed"  
**Routing**: Lead dev (execution engine, events) + Jr dev (chat template, sheet button)

- [ ] Register `preUseAction`, `postUseAction`, `dealDamage` in `wellKnownEvents`
- [ ] Define `UseActionContext` and `ActionResult` interfaces
- [ ] Implement `actor.useAction()` with `preUseAction` cancellation pattern
- [ ] Implement `_executeAttackAction()`: reach check, D20Roll vs target AC, hit/miss
- [ ] Damage roll on hit → `dealDamage` event → `target.takeDamage()`
- [ ] `postUseAction` emitted with result; standard action slot consumed
- [ ] Create `createAttackChatCard()` factory + `attack-card.hbs` template
- [ ] Add attack button to weapon row on character sheet
- [ ] Wire sheet button to `actor.useAction()` with targeted actor ID

**Verify**: In combat, target a token, click attack on weapon row → chat card appears with roll result and hit/miss/damage → [S] pip greys in tracker.

---

### Story 5 — Canvas right-click attack trigger
**User**: Player (on canvas)  
**Delivers**: "Right-click own token → 'Attack with...' submenu lists equipped weapons → triggers same attack flow"  
**Routing**: Lead dev (context menu API exploration + wiring)

- [ ] Explore at phase start: identify Foundry v14 API for canvas token context menu entries
- [ ] Register "Attack with..." submenu entries listing equipped weapons
- [ ] Wire to `actor.useAction(itemId, defaultActionId, targetId)` — same path as Story 4

**Verify**: Right-click controlled token in combat → submenu shows equipped weapons → selecting one triggers attack identically to sheet trigger.

---

### Parallelization

```
Story 1 (Combat tracker)     ──────────────────────►  Story 3 (Move action)
                                                              │
Story 2 (ActionDataModel)    ──────────────────────►         ▼
                                                       Story 4 (Melee attack)
                                                              │
                                                              ▼
                                                       Story 5 (Canvas trigger)
```

Stories 1 and 2 can begin simultaneously. Story 3 depends on Story 1 (needs `CombatantDnd35e` action tracking). Story 4 depends on all three prior stories. Story 5 depends on Story 4.
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
