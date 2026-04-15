# Action System Architecture

> Source phases: 8, 9, 10, 17, 19, 25

The Action System is the central combat resolution engine. Every mechanical interaction — attacks, spell casts, skill checks, saves — flows through the same pipeline: an **ActionDataModel** captures player intent, an **ExecutionEngine** resolves it, and a **chat card** renders the result.

---

## Core Concepts

### ActionDataModel

Actions are embedded data, not documents. They live on items as `EmbeddedDataField` instances — a weapon owns its attack action, a spell owns its cast action.

```typescript
interface ActionDataModel {
  uuid: string;
  type: 'attack' | 'spell' | 'save' | 'check' | 'heal' | 'custom';
  name: string;

  // Attack-specific
  attackBonus?: FormulaField;        // "1d20 + #self.attributes.bab + #item.enhancement"
  damageFormula?: FormulaField;      // "1d8 + #self.abilities.str.modifier"
  criticalRange?: number;            // 20, 19-20, 18-20
  criticalMultiplier?: number;       // x2, x3, x4

  // Spell-specific
  spellLevel?: number;
  spellResistance?: boolean;
  concentrationDC?: FormulaField;
  castingTime?: string;

  // Modifier tracking
  appliedModifiers: Modifier[];      // Power Attack -2, Empower +2 levels, etc.

  // Triggers & requirements
  triggers?: EffectTrigger[];        // data-driven event hooks (onKill, onCrit, etc.)
  requirements?: Requirement[];      // prerequisites checked before execution
}
```

### Action Chains

Actions can chain into sequences. A melee attack chains: **attack roll → damage roll → critical confirmation → critical damage**. Each link in the chain runs only if the previous link's condition is met.

```
Attack Action Chain:
  1. Attack Roll (1d20 + bonuses vs target AC)
     ├─ onHit → Damage Roll (weapon dice + bonuses)
     ├─ onCritThreat → Critical Confirmation (1d20 + bonuses vs target AC)
     │   └─ onConfirm → Critical Damage (multiplied)
     └─ onMiss → end

Spell Action Chain:
  1. Concentration Check (if casting defensively)
     └─ onSuccess → Spell Resolution
         ├─ Spell Resistance Check (1d20 + caster level vs SR)
         │   └─ onOvercome → Effect Application
         └─ Save (target rolls vs DC)
             ├─ onFail → Full Effect
             └─ onSave → Half Effect (or none)
```

### ExecutionEngine

The engine walks the action chain, resolving each step:

1. Build `ActionExecutionContext` from actor, item, target, and modifiers
2. Check requirements (spell slots, charges, action budget)
3. Resolve each chain link sequentially, branching on roll results
4. Apply effects (damage, conditions, resource consumption)
5. Emit chat card with complete resolution details
6. Check for triggered effects (Cleave on kill, etc.)

```typescript
interface ActionExecutionContext {
  actor: Dnd35eActor;
  item: Dnd35eItem;
  target: Dnd35eActor | null;
  roll: Roll;
  isCritical: boolean;
  appliedModifiers: Modifier[];
  stackingHistory: StackingHistory;   // from bonus-stacking engine
}
```

---

## Turn Economy (TurnActionBudget)

Combat turns use a state machine on the `Combatant` to track action consumption. D&D 3.5e's progressive full-attack commitment — where a player can take a single attack as a standard action, then decide mid-turn to commit to a full attack — requires stateful tracking.

### State Machine

```
Fresh ──[standard action]──→ StandardTaken ──[end turn]──→ Fresh
  │
  └──[first attack]──→ AttackTaken ──[second attack]──→ FullAttackCommitted
                           │                                    │
                           └──[end turn (single attack)]──→ Fresh
                           
States:
  Fresh           - Full budget available (standard + move + swift + free)
  AttackTaken     - First attack made; can still abort to single attack
  FullAttackCommitted - Committed to full attack; all iteratives available
  StandardTaken   - Standard action consumed; move + swift remain
```

### Action Costs

| Action Type | Budget Cost |
|---|---|
| Standard action | 1 standard |
| Full-round action | 1 standard + 1 move |
| Move action | 1 move |
| Swift action | 1 swift |
| Free action | 0 (unlimited) |
| 5-foot step | 1 move (only if no other movement) |
| Attack of opportunity | 0 (uses AoO budget, default 1/round) |

### Persistence (Combatant.system)

TurnActionBudget state is **persisted**, not in-memory. It lives on the `Combatant.system` field via a custom `TypeDataModel` schema, which means:

- **Server restart survival**: Foundry stores all Combat and Combatant documents in the world's LevelDB database (`Data/worlds/[world]/data/combats.db`). Every `.update()` call writes to disk immediately. If the server goes offline mid-combat, all turn state — round, turn index, initiative, and `combatant.system.turnBudget` — is fully restored on restart.
- **No in-memory-only state**: The budget is NOT stored in a transient `Map<string, TurnActionBudget>` on the Combat class. It's a persisted `SchemaField` on `Combatant.system`, validated by the DataModel pipeline.
- **Player-updateable**: Foundry's permission model allows combatant owners to update `system` data, so players can spend their own actions without GM relay.

```typescript
// Combatant system data model (defines persisted schema)
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
        aoosRemaining: new NumberField({ initial: 1, integer: true }),
      })
    };
  }
}
```

**Reset hook**: On turn change, Foundry fires `updateCombat` with a `turn` diff. The system hooks there to reset the active combatant's budget:

```typescript
combatant.update({ "system.turnBudget": {
  state: "fresh", standardUsed: false, moveUsed: false,
  swiftUsed: false, fiveFootStepUsed: false,
  movementUsed: 0, aoosRemaining: 1
}});
```

**Why `system` not `flags`**: The `system` field gives schema validation, TypeScript type safety, auto-initialization on combatant creation, and is in Foundry's allowed-update list for combatant owners. Flags would work for persistence but lack validation and type safety.

### Progressive Full Attack

The `IterativeAttackGenerator` computes the full attack sequence dynamically from BAB — it is never stored.

```typescript
class IterativeAttackGenerator {
  generate(actor, weapons, naturalAttacks, modifiers): IterativeAttack[] {
    // 1. Main-hand iteratives from BAB: +11/+6/+1
    const mainIteratives = this.generateFromBAB(actor.bab);

    // 2. Off-hand iteratives if TWF
    if (actor.hasTwoWeaponFighting) {
      const offhand = this.generateOffhand(actor.bab, actor.twfStatus);
      applyTWFPenalties(mainIteratives, offhand);
    }

    // 3. Natural attacks as secondary (-5, half STR) if also wielding manufactured
    if (hasNaturalAttacks && hasManufacturedWeapons) {
      mainIteratives.push(...this.createSecondaryNaturals(naturalAttacks));
    }

    // 4. Bonus attacks from effects (Haste, etc.)
    mainIteratives.push(...this.collectBonusAttacks(actor));

    return mainIteratives;
  }
}

interface IterativeAttack {
  weapon: Dnd35eItem;
  bonus: number;            // computed attack bonus for this iterative
  isPrimary: boolean;       // false for off-hand or natural secondary
  isNatural: boolean;
  penalty: number;          // cumulative offset (-5 per iterative, TWF penalty, etc.)
  isBonus: boolean;         // true for Haste / extra attacks
}
```

---

## PreRollDialog

Before an action executes, the PreRollDialog shows the player all available modifiers and lets them configure the roll:

- **Feat toggles**: Power Attack slider (trade attack for damage), Combat Expertise, etc.
- **Metamagic selection**: For spontaneous casters, applied at cast time
- **Formula breakdown**: Shows all bonus sources and how they combine
- **Target info**: AC, SR, save DCs when available

```typescript
interface PreRollDialogOptions {
  title: string;
  features: DialogFeature[];
}

interface DialogFeature {
  type: 'slider' | 'checkbox' | 'select';
  label: string;
  key: string;                // modifier key in execution context
  defaultValue: any;
  range?: [number, number];   // for sliders (Power Attack: 0 to BAB)
  options?: OptionSet[];      // for select dropdowns
}
```

---

## EffectTrigger Pattern

Feats and features integrate with the action system via data-driven triggers — not hardcoded hooks. An EffectTrigger declares *when* it fires and *what* it does.

```typescript
interface EffectTrigger {
  event: 'onHit' | 'onCrit' | 'onKill' | 'onMiss' | 'onSuccess' | 'onFail';
  condition?: string;          // formula that must evaluate truthy
  effect: TriggerEffect;
}

interface TriggerEffect {
  type: 'grantExtraAttack' | 'applyCondition' | 'addDamage' | 'grantAction';
  value?: string | number;
  target?: 'self' | 'target' | 'adjacent';
}
```

**Examples:**
- **Cleave**: `{ event: 'onKill', effect: { type: 'grantExtraAttack', target: 'adjacent' } }`
- **Weapon Focus**: Passive — no trigger, just an AE change to attack bonus
- **Power Attack**: Toggle — PreRollDialog slider modifies attack/damage formulas

---

## Chat Cards

Action results render as static HTML chat cards — not Vue components. Chat messages must survive across sessions and can't rely on reactive state.

Each card shows:
- Roll result with formula breakdown
- Stacking history (which bonuses applied and why)
- Hit/miss determination
- Damage with type
- Triggered effects (Cleave activated, condition applied)
- Expandable detail sections for complex rolls

---

## Integration Points

| System | Integration |
|---|---|
| [Bonus Stacking](bonus-stacking.md) | Action rolls collect all applicable bonuses and run stacking resolution |
| [Active Effects](active-effect-lifecycle.md) | `action.*` phase effects apply at roll time, not during prep |
| [Formula System](architecture-overview.md#3-formulafamiliar--schema-driven-formula-autocomplete) | Action formulas use `#context.property` syntax with FormulaFamiliar |
| [Conditions](condition-system.md) | Actions can apply/remove conditions; conditions modify action bonuses |
| [Progression](progression-system.md) | BAB from level history feeds iterative attack generation |
| [Area Effects](area-effects.md) | AoE spells create Regions that trigger damage actions per-turn |
