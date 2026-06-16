# Condition System

> Source phases: 14, 21

Conditions in D&D 3.5e (Blinded, Prone, Fatigued, etc.) are predefined Active Effect templates stored in CONFIG constants. A `ConditionManager` handles application, removal, and interaction rules. Conditions are never custom AEs created from scratch — they are always instantiated from the predefined template set.

---

## Predefined AE Templates

Each condition is a complete AE definition stored in `CONFIG.DND35E.conditions`:

```typescript
CONFIG.DND35E.conditions = {
  blinded: {
    name: 'DND35E.ConditionBlinded',    // i18n key
    icon: 'icons/conditions/blinded.svg',
    changes: [
      { key: 'system.defense.armorClass', value: -2, bonusType: 'Penalty', operator: 'ADD' },
      { key: 'combat.attack', value: -4, bonusType: 'Penalty', operator: 'ADD' }
      // ... additional mechanical effects
    ],
    flags: { dnd35e: { conditionType: 'blinded' } }
  },

  prone: {
    name: 'DND35E.ConditionProne',
    icon: 'icons/conditions/prone.svg',
    changes: [
      { key: 'system.defense.armorClass', value: -4, bonusType: 'Penalty', operator: 'ADD' },
      { key: 'system.defense.armorClass', value: 4, bonusType: 'Circumstance', operator: 'ADD' },
      { key: 'combat.attack.melee', value: -4, bonusType: 'Penalty', operator: 'ADD' }
    ],
    flags: { dnd35e: { conditionType: 'prone' } }
  },

  fatigued: { /* ... */ },
  exhausted: { /* ... */ },
  frightened: { /* ... */ },
  shaken: { /* ... */ },
  // ... 25+ conditions total
};
```

All conditions use `Penalty` bonus type for debuffs (always applies, never stacks with identical source) or `Circumstance` for situational modifiers.

---

## ConditionManager

The manager is the single API for condition operations:

```typescript
class ConditionManager {
  static applyCondition(actor: Dnd35eActor, conditionName: string): Promise<ActiveEffect> {
    const template = CONFIG.DND35E.conditions[conditionName];
    if (!template) throw new Error(`Unknown condition: ${conditionName}`);

    // Check interaction rules before applying
    this._checkInteractions(actor, conditionName);

    return actor.createEmbeddedDocuments('ActiveEffect', [template]);
  }

  static removeCondition(actor: Dnd35eActor, conditionName: string): Promise<void> { /* ... */ }
  static hasCondition(actor: Dnd35eActor, conditionName: string): boolean { /* ... */ }
  static getActiveConditions(actor: Dnd35eActor): string[] { /* ... */ }
}
```

---

## Condition Interactions

D&D 3.5e conditions have complex interaction rules:

### Severity Chains

Some conditions are escalating versions of others. Applying the more severe version removes the lesser:

```
Shaken → Frightened → Panicked
Fatigued → Exhausted
Sickened → Nauseated
```

Applying `Frightened` to a `Shaken` actor removes `Shaken` and applies `Frightened`. Removing `Frightened` does **not** restore `Shaken` — it simply removes the condition.

### Mutual Exclusion

Some conditions cannot coexist:

- `Asleep` and `Conscious` — applying one removes the other
- `Prone` and `Mounted` — falling prone dismounts; mounting removes prone

### Type Immunities

Creature types can be immune to specific conditions:

```typescript
CONFIG.DND35E.conditionImmunities = {
  construct: ['fatigued', 'exhausted', 'asleep', 'poisoned', 'paralyzed', 'stunned'],
  undead: ['fatigued', 'exhausted', 'asleep', 'poisoned', 'paralyzed', 'stunned', 'sickened'],
  // ...
};
```

The ConditionManager checks immunities before applying and silently skips immune conditions (with a chat notification).

---

## Recovery Mechanics

Conditions can have recovery actions or automatic expiry:

- **Prone**: Recovered by spending a move action to stand (consumes TurnActionBudget)
- **Fatigued**: Recovered after 8 hours of rest
- **Blinded**: Duration-dependent (spell duration, or permanent until healed)
- **Frightened**: Duration from source effect, flee behavior while active

Recovery actions integrate with the [Action System](action-system.md) — standing from prone is a move action that consumes budget.

---

## Derived Condition Registry

During `prepareDerivedData()`, the system builds a condition registry for quick lookups:

```typescript
// Built during prep by scanning all AEs with conditionType flag
actor.derived.conditionRegistry = [
  { name: 'prone', effect: ActiveEffect, recovery: 'move action' },
  { name: 'fatigued', effect: ActiveEffect, recovery: '8 hours rest' },
];
```

This registry is used by:
- Character sheet condition display
- Combat tracker condition icons
- Action System (checking if conditions modify available actions)
- ConditionManager (checking for severity upgrades)

---

## Integration Points

| System | Integration |
|---|---|
| [Active Effects](active-effect-lifecycle.md) | Conditions are AEs with `conditionType` flag |
| [Bonus Stacking](bonus-stacking.md) | Condition penalties use `Penalty` bonus type (always applies) |
| [Action System](action-system.md) | Actions can apply conditions (trip → prone); recovery costs action budget |
| [Data Preparation](data-preparation-pipeline.md) | Condition registry built during `prepareDerivedData()` |
| [Area Effects](area-effects.md) | Regions can apply conditions via `dnd35eApplyEffect` behavior |
