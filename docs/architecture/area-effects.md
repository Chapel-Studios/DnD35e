# Area Effects & Region System

> Source phase: 24 (Area Effects & Auras)

Area effects — auras, AoE spells, persistent zones — use Foundry V14's native Region system with custom behaviors. Regions handle shape definition, token proximity detection, and event hooks. The system adds three custom behaviors for D&D 3.5e mechanics.

---

## Why Regions

Foundry V14 Regions provide infrastructure the system would otherwise need to build:

- **Shape primitives**: Circle, cone, line, polygon (all D&D AoE shapes)
- **Token proximity**: Automatic detection of which tokens are inside a region
- **Event hooks**: `tokenEnter`, `tokenExit`, `tokenTurnStart`, `tokenTurnEnd`
- **Token attachment**: Regions can follow a token (for auras)
- **Canvas rendering**: Visual boundaries drawn on the game map

By using regions, the system avoids reimplementing spatial math, proximity tracking, and canvas rendering.

---

## Custom Region Behaviors

Three custom behavior types are registered in CONFIG:

### Dnd35eApplyEffectBehavior

Applies/removes Active Effects when tokens enter or leave the region.

```typescript
class Dnd35eApplyEffectBehaviorType extends RegionBehaviorType {
  static defineSchema() {
    return {
      effects: new SetField(new StringField()),     // AE UUIDs to apply
      targeting: new SchemaField({
        disposition: new StringField({              // 'ally' | 'enemy' | 'all'
          choices: ['ally', 'enemy', 'all']
        }),
        alignmentFilter: new StringField()          // optional alignment restriction
      }),
      save: new SchemaField({
        type: new StringField(),                    // 'fortitude' | 'reflex' | 'will'
        dc: new NumberField()
      }),
      frequency: new StringField({                  // when to apply
        choices: ['onEnter', 'onExit', 'perTurn']
      })
    };
  }
}
```

### Dnd35eDamageOnEventBehavior

Deals damage to tokens on specific events (entering a Cloudkill, standing in Wall of Fire).

```typescript
class Dnd35eDamageOnEventBehaviorType extends RegionBehaviorType {
  static defineSchema() {
    return {
      damageFormula: new StringField(),             // "1d6 + #caster.casterLevel / 2"
      damageType: new StringField(),                // "fire", "acid", "poison"
      saveDC: new NumberField(),
      saveType: new StringField(),                  // 'fortitude' | 'reflex' | 'will'
      saveHalf: new BooleanField(),                 // true = half damage on save
      frequency: new StringField({
        choices: ['onEnter', 'tokenTurnStart', 'tokenTurnEnd']
      }),
      limit: new NumberField({ initial: 1 })        // max times per turn
    };
  }
}
```

### Dnd35eDurationBehavior

Tracks and enforces region duration (spell durations, concentration).

```typescript
class Dnd35eDurationBehaviorType extends RegionBehaviorType {
  static defineSchema() {
    return {
      value: new NumberField(),                     // duration count
      units: new StringField({                      // 'rounds' | 'minutes' | 'hours'
        choices: ['rounds', 'minutes', 'hours', 'permanent', 'concentration']
      }),
      autoRemove: new BooleanField({ initial: true }),  // delete region on expiry
      startRound: new NumberField()                 // combat round when created
    };
  }
}
```

---

## Auras (Token-Attached Regions)

Auras are regions that follow a token. A Paladin's Aura of Courage is a circular region attached to, and moving with, the Paladin token.

```
Region (aura)
├── shape: { type: 'circle', radius: 10 }          // 10-foot radius
├── attachment: { token: [paladinTokenId] }         // follows this token
└── behaviors:
    └── dnd35eApplyEffect
        ├── effects: ['uuid.buff.aura-of-courage']  // +4 morale vs fear
        ├── targeting.disposition: 'ally'            // only allies
        └── frequency: 'onEnter'                    // applied when entering
```

**Lifecycle:**
1. Region moves with the token automatically (Foundry handles this)
2. When an ally token enters the region → AE applied
3. When an ally token leaves the region → AE removed
4. Source token's own aura effects handled separately (self-application)

---

## AoE Spell Regions

Spells that create persistent areas (Cloudkill, Wall of Fire, Entangle) generate regions at cast time.

```
Cloudkill Region:
├── shape: { type: 'circle', x: 500, y: 300, radius: 20 }
└── behaviors:
    ├── dnd35eDamageOnEvent
    │   ├── damageFormula: "1d4"
    │   ├── damageType: "poison"
    │   ├── saveDC: 17
    │   ├── saveType: "fortitude"
    │   ├── frequency: 'tokenTurnStart'
    │   └── limit: 1
    ├── dnd35eApplyEffect
    │   ├── effects: ['uuid.condition.nauseated']
    │   └── targeting.disposition: 'all'
    └── dnd35eDuration
        ├── value: 10
        ├── units: 'rounds'
        └── autoRemove: true
```

**AoE Template → Region flow:**
1. Caster places AoE template on canvas (Foundry's measured templates)
2. On cast confirmation, template converts to a Region
3. Region behaviors apply effects/damage per their configuration
4. Duration behavior tracks rounds and removes region on expiry

---

## Integration Points

| System | Integration |
|---|---|
| [Action System](action-system.md) | AoE spells create regions as part of action resolution |
| [Active Effects](active-effect-lifecycle.md) | Regions apply/remove AEs via the standard effect pipeline |
| [Conditions](condition-system.md) | Regions can apply condition AEs (Entangle → entangled) |
| [Bonus Stacking](bonus-stacking.md) | Aura bonuses go through stacking (Paladin aura is morale type) |
