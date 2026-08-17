# Alpha Phase 3: Action System

**Status**: 📋 Outlined (ActionDataModel, execution engine, chains)

> **Milestone**: POC  
> **Milestone**: POC  
> **Dependencies**: Phase 6 (Token & Scene), Phase 7 (Roll Formulas)  
> **Goal**: A comprehensive Action System where actions live on items (and actors). Includes a state-machine-driven action economy that provides a BG3-style progressive-commitment combat experience, with per-attack target selection, dynamic action availability, and composable combat maneuvers.

> **Note**: Internal section numbering uses §18.x from the original design document. File renumbered from Phase 18 → Phase 8 during POC restructuring.

---

## Table of Contents

1. [What the Action System Replaces](#181-what-the-action-system-replaces)
2. [Action Data Model](#182-action-data-model)
3. [Action Economy — Turn State Machine](#183-action-economy--turn-state-machine)
4. [Progressive Full Attack](#184-progressive-full-attack)
5. [Movement Integration](#185-movement-integration)
6. [Action Chains](#186-action-chains)
7. [Combat Maneuvers](#187-combat-maneuvers)
8. [Execution Engine](#188-execution-engine)
9. [UI & Action HUD](#189-ui--action-hud)
10. [Feat & Effect Integration](#1810-feat--effect-integration)
11. [Chat Cards](#1811-chat-cards)
12. [Attacks of Opportunity](#1812-attacks-of-opportunity)
13. [Action Economy Settings](#1813-action-economy-settings)
14. [Spell & Consumable Actions (Outline)](#1814-spell--consumable-actions-outline)
15. [Open Questions](#1815-open-questions)
16. [Files to Create/Modify](#1816-files-to-createmodify)

---

## 18.1 What the Action System Replaces

| Current Approach | Action System Equivalent |
|------------------|--------------------------|
| `weapon.rollAttack()` (Phase 7) | Weapon has a default "Attack" action |
| `spell.cast()` (Phase 16) | Spell has a default "Cast" action |
| `consumable.use()` (Phase 21) | Consumable has a default "Use" action |
| D35E `attack` item type | Attack actions on weapons/natural attacks |
| D35E `full-attack` item type | Dynamically generated from equipped weapons + BAB |
| D35E `ItemUse.useAttack()` | `ActionExecutionEngine.execute()` |
| D35E `ChatAttack` | Per-attack chat message cards |

---

## 18.2 Action Data Model

Actions are **nested `DataModel` instances** on items/actors using `EmbeddedDataField`. They are not separate Foundry Documents.

### FormulaFamiliar & Field Architecture Integration

Action formulas participate in the established FormulaFamiliar pipeline (see PR-weapon-base §3):

- **FormulaField** instances in the action schema carry `formulaContexts` declarations so the autocomplete system knows which `@` variables are available (actor stats, target defenses, item properties).
- Action display fields should use the current view-aware/mask architecture (`ViewMode` + Secret masks). Legacy compound wrappers may appear for compatibility, but new action designs should not depend on introducing wrapper-only shapes.
- **Schema registration**: Action-bearing item types register an augmented familiar schema that includes action formula paths, so `FormulaFormGroup` provides autocomplete when editing attack/damage formulas.

```typescript
// === FormulaFamiliar Context Declarations for Action Formulas ===

// Declared on each FormulaField in the action schema.
// These tell FormulaFamiliar which documents are available for @ resolution.

const actionFormulaContexts: FormulaContext[] = [
  {
    contextName: 'Actor',
    resolvePath: 'parent.parent',       // Action → Item → Actor (or Action → Actor)
    documentType: 'Actor',
    fallbackSubtypes: ['character', 'npc'],
    aliases: ['self'],
    // Exposes: #self.abilities.str.mod, #self.bab, #self.attributes.init.total, #self.size.*, etc.
  },
  {
    contextName: 'Item',
    resolvePath: 'parent',              // Action → Item
    documentType: 'Item',
    fallbackSubtypes: ['weapon'],
    aliases: ['weapon', 'spell'],
    // Exposes: #Item.enhancement, #Item.size, #Item.masterwork, etc.
  },
  {
    contextName: 'Target',
    resolvePath: 'runtime',             // Resolved at execution time from selected target token
    documentType: 'Actor',
    fallbackSubtypes: ['character', 'npc'],
    aliases: [],
    // Exposes: #target.ac, #target.touchAc, #target.saves.fort.total, etc.
  },
  {
    contextName: 'TargetItem',
    resolvePath: 'runtime',             // Resolved at execution time from item picker selection
    documentType: 'Item',
    fallbackSubtypes: ['weapon', 'equipment'],
    aliases: [],
    // Exposes: #targetItem.enhancement, #targetItem.material, etc.
    // Only available when effect.target is 'item-on-creature'
  },
];

// === Schema Registration ===

// Each item type that bears actions registers an augmented familiar schema
// that includes action formula paths for autocomplete.
registerFamiliarSchema('Item', 'weapon', (context?) =>
  gatherAspectsFromSchema(WeaponSystemModel, context)  // includes action sub-schemas
);
```

```typescript
// === Core Action Model ===

class ActionDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      id: new StringField({ required: true }),
      name: new StringField({                         // View-aware display behavior handled by sheet/store mask logic
        { label: 'Action Name' }),
      type: new StringField({                         // Determines what the action does
        choices: ['check', 'attack', 'save', 'damage', 'heal', 'effect', 'utility']
      }),
      activation: new StringField({                   // What action-economy slot it consumes
        choices: ['standard', 'move', 'swift', 'free', 'fullRound', 'immediate', 'passive', 'aoo']
      }),
      provokesAoO: new BooleanField({ initial: false }),

      // --- TYPE-SPECIFIC BLOCKS ---

      check: new SchemaField({                        // For 'check' and 'attack' types
        formula: new FormulaField(),                  // e.g. "1d20 + #self.bab + #self.abilities.str.mod"
        against: new StringField({                    // What defense the check targets
          choices: ['ac', 'touchAc', 'flatFootedAc', 'fort', 'ref', 'will', 'cmd', 'dc', 'skill']
        }),
        againstFormula: new FormulaField(),            // For fixed DCs or opposed checks
      }, { required: false }),

      damage: new SchemaField({
        formula: new FormulaField(),                  // e.g. "1d8 + #self.abilities.str.mod"
        type: new StringField(),                      // DamageType
        critRange: new NumberField({                  // AE-modifiable by feats (Improved Critical, Keen)
          initial: 20 }),
        critMultiplier: new NumberField({             // AE-modifiable
          initial: 2 }),
      }, { required: false }),

      healing: new SchemaField({
        formula: new FormulaField(),
      }, { required: false }),

      effect: new SchemaField({
        effectUuid: new StringField(),                // AE to apply (buff, debuff, condition)
        duration: new SchemaField({ /* DurationData */ }),
        target: new StringField({ choices: ['self', 'creature', 'area', 'item-on-creature'] }),
        itemTargetFilter: new SchemaField({            // Only used when target is 'item-on-creature'
          itemTypes: new ArrayField(new StringField()), // e.g. ['weapon'] for Magic Weapon
          equippedOnly: new BooleanField({ initial: true }), // Filter to equipped items
        }, { required: false }),
      }, { required: false }),

      // --- CHAIN LINKS ---
      chain: new ArrayField(new EmbeddedDataField(ActionChainLinkModel)),
    };
  }

  /**
   * Attach formulaContexts to each FormulaField after schema definition.
   * This follows the same pattern used by MaterialSystemModel for name formulas.
   */
  static _initializeFormulaContexts(schema: DataSchema): void {
    for (const formulaField of [
      schema.check?.fields?.formula,
      schema.check?.fields?.againstFormula,
      schema.damage?.fields?.formula,
      schema.healing?.fields?.formula,
    ]) {
      if (formulaField instanceof FormulaField) {
        formulaField.formulaContexts = actionFormulaContexts;
      }
    }
  }
}

// === Chain Link Model ===

class ActionChainLinkModel extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      trigger: new StringField({
        choices: ['onSuccess', 'onFailure', 'onCrit', 'onFumble', 'onKill', 'always', 'onChoice']
      }),
      actionId: new StringField(),                    // ID of next action to execute
      description: new StringField(),                 // UI label: "On hit, roll damage"
    };
  }
}
```

### Default Actions by Item Type

Items auto-populate default actions when created. Users can customize.

| Item Type | Default Actions |
|-----------|----------------|
| **Weapon** | `attack` (check vs AC) → `onSuccess` → `damage`, `onCrit` → `critConfirm` → `critDamage` |
| **Spell (attack)** | `spellAttack` (check vs AC/touch) → `onSuccess` → `spellDamage` |
| **Spell (save)** | `castSpell` → `always` → `targetSave` → `onFailure` → `applyEffect` |
| **Spell (item-buff)** | `castSpell` (item-on-creature target) → `always` → `applyItemBuff` |
| **Consumable** | `use` (utility) |
| **Natural Attack** | Same as weapon |
| **Combat Maneuver** | Composed from check + effect primitives (see §18.7) |
| **Basic Skill Check** | Actor-level action (not item): d20 + ability mod → chat card. Proves actor-owned actions. Full skill system (ranks, class skills, synergies) deferred to Skills phase after Phase 12. |

---

## 18.3 Action Economy — Turn State Machine

The combat turn tracks action expenditure as a **state machine**, not discrete counters. This enables the progressive full-attack flow where the system dynamically dims unavailable actions.

### States

```
┌─────────────────────────────────────────────────────────────┐
│                     TURN START (Fresh)                       │
│  Available: standard, move, full-round, swift, free,        │
│             5-foot step, immediate                          │
└────────────┬──────────────┬──────────────┬──────────────────┘
             │              │              │
     ┌───────▼──────┐  ┌───▼────┐  ┌──────▼───────┐
     │  Took Move   │  │  Took  │  │ Took 5-foot  │
     │  Action      │  │ Attack │  │    Step       │
     │              │  │(std)   │  │              │
     │ Remaining:   │  │        │  │ Remaining:   │
     │ standard,    │  │ Remain:│  │ standard,    │
     │ swift, free  │  │ move   │  │ move OR      │
     │ NO full-rnd  │  │ OR     │  │ full-round,  │
     │ NO 5ft step  │  │ full   │  │ swift, free  │
     │ (if moved)   │  │ attack │  │ NO movement  │
     └───────┬──────┘  │ swift, │  └──────┬───────┘
             │         │ free   │         │
             │         │ 5ft    │         │
             ▼         └───┬────┘         │
     ┌──────────────┐     │              │
     │  Took Std +  │     ▼              │
     │  Move        │  ┌──────────────┐  │
     │              │  │ Chose Move   │  │
     │ Remaining:   │  │ (after atk)  │  │
     │ swift, free  │  │              │  │
     └──────────────┘  │ Turn spent   │  │
                       │ swift, free  │  │
                       └──────────────┘  │
                                         │
                       ┌──────────────┐  │
                       │ Took 2nd     │◄─┘ (if chose to
                       │ Attack       │     continue attacking)
                       │ (full attack)│
                       │              │
                       │ Remaining:   │
                       │ more attacks,│
                       │ 5-foot step, │
                       │ swift, free  │
                       │ NO movement  │
                       └──────────────┘
```

### State Transitions Table

| Current State | Player Action | New State | Available Next |
|---------------|--------------|-----------|----------------|
| Fresh | Standard action (non-attack) | Standard Spent | Move, swift, free |
| Fresh | Move action | Move Spent | Standard (attack/cast/etc), swift, free. **No full-round.** No 5-foot step if moved distance. |
| Fresh | Attack (standard) | Attack Taken | Move **OR** continue to full attack, swift, free, 5-foot step |
| Fresh | 5-foot step | 5ft Taken | Standard, move (non-movement), full-round, swift, free. **No other movement.** |
| Fresh | Full-round action | Full-Round Spent | 5-foot step (if allowed), swift, free |
| Attack Taken | Move action | Turn Spent | Swift, free |
| Attack Taken | 2nd attack (same or different weapon) | Full Attack | Remaining iteratives, 5-foot step, swift, free. **No movement.** |
| Attack Taken | 5-foot step | Attack+5ft | Move (non-movement) OR continue to full attack, swift, free |
| Full Attack | Next iterative | Full Attack | Remaining iteratives, 5-foot step, swift, free |
| Full Attack | All iteratives spent | Turn Spent | Swift, free |
| Move Spent | Attack (standard) | Turn Spent | Swift, free |
| Fresh | Charge (full-round) | Charge Spent | Swift, free. **No 5-foot step.** -2 AC until next turn. |
| Fresh/Any | Initiate grapple (standard) | Grappled | Grapple actions only: attack, damage, pin, escape, move grapple, cast (limited), draw light weapon |
| Grappled | Grapple action (replaces attack) | Grappled | Remaining grapple iteratives at descending BAB, swift, free |
| Grappled | Escape grapple | Turn Spent (or state before grapple) | Swift, free. Move into adjacent space. |
| Any | Swift action | Same + swift spent | (No more swift this turn, immediate counts as next turn's swift) |

### Key Rules Encoded

1. **5-foot step**: Available whenever no other movement has occurred. Does NOT prevent full-round actions.
2. **Move after attack**: After a single attack, you may take a move action instead of continuing to full attack (SRD: "Deciding between an Attack or a Full Attack").
3. **Full-round lock-in**: Taking a second attack commits to full attack. Only 5-foot step movement allowed.
4. **Swift/Immediate**: One swift per turn. Using an immediate action off-turn consumes next turn's swift.
5. **Free actions**: Always available (reasonable limits enforced by GM).
6. **Charge**: Full-round action. Must move 10 ft–2× speed in a straight line, then single melee attack at +2. Takes -2 AC until next turn. No 5-foot step allowed same round.
7. **Grapple**: Enters a separate state branch. Grapple actions replace normal attacks (can use multiple per round at descending BAB). Available actions are restricted to the SRD grapple action set. Persists across rounds until broken.

### Persistence

TurnActionBudget state is **persisted to the database** via the `Combatant.system` field (not stored in-memory). See Phase 14 §8.3 and the [action-system architecture doc](../architecture/action-system.md) for full details.

**Key facts**:
- Stored as a `SchemaField` on `CombatantSystemModel` (a `TypeDataModel` registered for `Combatant.system`)
- Persisted to LevelDB (`combats.db`) — survives server restarts mid-combat
- Updated via `combatant.update({ "system.turnBudget.state": "attackTaken" })`
- Auto-initialized by schema `initial` values on combatant creation
- Players can update their own combatant's `system` data (Foundry's permission model allows this)

The `TurnActionBudget` class below is the **runtime API** that wraps `combatant.system.turnBudget` with methods. It reads from and writes to the persisted schema field.

### Implementation

```typescript
class TurnActionBudget {
  /** Current state of the turn's action economy (persisted via Combatant.system.turnBudget.state) */
  state: TurnState;

  /** Track what's been spent (persisted via Combatant.system.turnBudget.*) */
  spent: {
    standard: boolean;
    move: boolean;
    swift: boolean;
    fiveFootStep: boolean;
    immediate: boolean;                // Off-turn immediate burns next swift
    attacks: AttackRecord[];           // Track which weapon/attack actions used
    movement: number;                  // Feet moved (0 if only 5-foot step or no movement)
  };

  /** Linked mount budget — present when actor is mounted */
  mountBudget: TurnActionBudget | null;

  /** Grapple state — when grappling, available actions are restricted */
  grappleState: {
    active: boolean;
    opponents: string[];               // Actor IDs of grapple participants
    isPinning: boolean;                // Whether this actor has pinned an opponent
    isPinned: boolean;                 // Whether this actor is pinned
  } | null;

  /** Returns which activation types are currently legal */
  getAvailableActivations(): ActivationType[];

  /** Returns which specific actions from the actor's pool are available */
  getAvailableActions(actor: ActorDnd35e): ActionAvailability[];

  /** Record that an action was taken, transition state */
  spend(activation: ActivationType, actionRecord?: AttackRecord): void;

  /** GM override: force an action to be available */
  override(activation: ActivationType): void;

  /** Undo the last action spent */
  undo(): void;

  /** Reset for new turn */
  reset(): void;
}

interface ActionAvailability {
  action: ActionDataModel;
  source: ItemDnd35e | ActorDnd35e;
  available: boolean;
  reason?: string;                    // Why unavailable: "Move action already spent"
  dimmed: boolean;                    // Visual state in HUD
}

interface AttackRecord {
  weaponId: string;
  attackIndex: number;                // Which iterative (0 = first, 1 = second at BAB-5, etc.)
  hand: 'main' | 'offhand';
}
```

---

## 18.4 Progressive Full Attack

The crown jewel of the action system. No declaration required — the system tracks commitment progressively per the SRD rules.

### Flow Example: Fighter with Longsword (main) + Short Sword (off-hand), BAB +11/+6/+1

**Turn starts (Fresh state):**
Available actions shown in HUD:
- ⚔️ Longsword Attack (standard)
- 🗡️ Short Sword Attack (standard)
- 🏃 Move (30 ft)
- 🦶 5-foot Step
- 🛡️ Total Defense (standard)
- 🔮 Cast Spell (if any)
- ⚡ Swift actions (if any)

**Player clicks "Longsword Attack" → targets enemy → rolls → chat card posted.**
State transitions to `AttackTaken`.

Available actions update:
- ⚔️ Longsword Attack +6 (continue → full attack)
- 🗡️ Short Sword Attack (continue → full attack)
- 🏃 Move (30 ft) — **"End attacks, take move action"**
- 🦶 5-foot Step
- ~~🛡️ Total Defense~~ *(dimmed — standard spent)*
- ~~🔮 Cast Spell~~ *(dimmed — standard spent)*

**Player clicks "Longsword Attack +6" → committed to full attack.**
State transitions to `FullAttack`.

Available actions update:
- ⚔️ Longsword Attack +1 (iterative)
- 🗡️ Short Sword Attack (off-hand)
- 🗡️ Short Sword Attack +1 (off-hand iterative, if ITWF)
- ~~🏃 Move~~ *(dimmed — full attack)*
- 🦶 5-foot Step
- ✅ End Turn

**Player takes remaining attacks or ends turn.**

### Iterative Attack Generation

Full attack availability is **computed dynamically** from:

1. **BAB**: Each +5 of BAB grants an additional iterative at cumulative -5
   - BAB +11 → attacks at +11/+6/+1
   - BAB +6 → attacks at +6/+1
2. **Equipped weapons**: Which weapon slots are filled (main hand, off-hand)
3. **Two-weapon fighting**: Off-hand attacks at penalties modified by TWF feats
4. **Feat-granted extra attacks**: Rapid Shot, Flurry of Blows, Haste (via AE triggers)
5. **Natural attacks**: Secondary naturals added at end of full attack at -5 and half STR

```typescript
interface IterativeAttackSet {
  /** All available attacks for this turn, computed from equipment + BAB + feats */
  attacks: IterativeAttack[];
}

interface IterativeAttack {
  weaponId: string;
  weaponName: string;
  hand: 'main' | 'offhand' | 'natural';
  attackIndex: number;                // 0-based index within this weapon
  babPenalty: number;                 // 0, -5, -10, -15...
  twfPenalty: number;                 // Two-weapon fighting penalty
  otherPenalties: { value: number, label: string }[];
  totalAttackBonus: number;           // Fully resolved
  used: boolean;                      // Already spent this turn
}
```

### Ordering Rules

- Main-hand iteratives must go highest-to-lowest BAB (per SRD)
- Can strike with either weapon first (main or off-hand)
- Can interleave main and off-hand attacks
- Can target different enemies with each attack

---

## 18.5 Movement Integration

Movement leverages Foundry V14's ruler system with action-economy-aware speed limits.

### Flow

1. Player clicks a **movement action button** in the HUD or **drags their token**
2. The ruler activates, showing movement range based on remaining movement budget
3. As the ruler extends:
   - **Within standard move speed** → shown as normal movement (green)
   - **Beyond standard move → up to 2× speed** → transitions to "double move" display (yellow). This will consume both move + standard action.
   - **Beyond 2× speed → up to 4× speed** → transitions to "run" display (red). Full-round action. Straight line only.
4. On confirm, the appropriate action cost is deducted from the turn budget

### Speed Display

| Ruler Distance | Movement Type | Action Cost | Color |
|---------------|---------------|-------------|-------|
| ≤ speed | Standard move | Move action | Green |
| > speed, ≤ 2× speed | Double move | Move + Standard | Yellow |
| > 2× speed, ≤ 4× speed | Run | Full-round | Red |
| > 4× speed | Illegal | — | Gray/blocked |

### 5-Foot Step

- Separate button from movement
- Always available if no other movement taken
- Does NOT prevent full attack
- If token is dragged ≤ 5 ft and no movement has occurred, assume 5-foot step. This still counts as "having moved" — no further movement (move action or additional 5-foot step) is allowed, but full-round actions remain available.

---

## 18.6 Action Chains

Action chains handle the **automatic sequencing within a single action** — the attack→damage→crit flow. This is distinct from the turn-level action economy (§18.3).

### Chain Triggers

| Trigger | Fires When |
|---------|-----------|
| `onSuccess` | Check/attack beats target defense |
| `onFailure` | Check/attack fails |
| `onCrit` | Critical hit confirmed |
| `onFumble` | Natural 1 on attack roll |
| `onKill` | Target reduced to 0 or fewer HP |
| `always` | Unconditionally after parent action resolves |
| `onChoice` | Pauses execution, presents options to the player |

### Execution Flow

```
Player clicks "Attack" action
  │
  ▼
ExecutionEngine.execute(weapon, "attack", [target])
  │
  ├── executeStep("attack") → rolls d20 + bonuses vs AC
  │   │
  │   ├── [BREAKPOINT: before damage application if setting enabled]
  │   │
  │   ├── onSuccess → executeStep("damage") → rolls damage dice
  │   │   │
  │   │   └── onKill → check for Cleave trigger (see §18.10)
  │   │
  │   ├── onCrit → executeStep("critConfirm") → confirmation roll
  │   │   │
  │   │   └── onSuccess → executeStep("critDamage") → multiplied damage
  │   │
  │   └── onFumble → executeStep("fumbleEffect") (if defined)
  │
  ▼
Post chat message with results
```

### Step-by-Step with Fast-Forward

- **Default**: Each step resolves and posts to chat. Breakpoints pause before damage application.
- **Fast-forward** (Shift+click or setting): Entire chain auto-resolves. No pauses.
- **Breakpoints**: Configurable. Default breakpoint before damage application allows player to verify hit before rolling damage.

### Where Chains Apply vs Don't

| Use Case | Mechanism |
|----------|-----------|
| Attack → hit → damage → crit | **Action chain** (within one action click) |
| Trip → success → prone / fail → self-check | **Action chain** (single combat maneuver) |
| Full attack (multiple attacks per turn) | **Turn action economy** (multiple discrete clicks, NOT a chain) |
| Cleave (free attack on kill) | **Effect trigger** → bonus action grant (NOT a chain) |
| Spell cast → save → effect | **Action chain** |

---

## 18.7 Combat Maneuvers

Combat maneuvers are **composable from the same action primitives** as everything else. Each maneuver is a set of actions with chain links.

### Trip

```yaml
actions:
  - id: "trip"
    type: "check"
    activation: "standard"            # Can replace a melee attack in a full attack
    provokesAoO: true                 # Unless Improved Trip
    check:
      formula: "1d20 + #self.bab + #self.abilities.str.mod + #self.size.grappleMod"
      against: "skill"                # Opposed check
      againstFormula: "#target.tripDefense"  # Higher of STR or DEX + size mod
    chain:
      - trigger: "onSuccess"
        actionId: "applyTrip"
      - trigger: "onFailure"
        actionId: "selfTripCheck"

  - id: "applyTrip"
    type: "effect"
    effect:
      effectUuid: "conditions.prone"
      target: "target"

  - id: "selfTripCheck"
    type: "check"
    check:
      formula: "1d20 + #self.abilities.str.mod + #self.size.grappleMod"
      against: "dc"
      againstFormula: "#chain.tripResult"  # Previous chain step's total (runtime context)
    chain:
      - trigger: "onFailure"
        actionId: "selfProne"

  - id: "selfProne"
    type: "effect"
    effect:
      effectUuid: "conditions.prone"
      target: "self"
```

### Other Combat Maneuvers (Outlined)

| Maneuver | Check | On Success | On Failure | Notes |
|----------|-------|-----------|-----------|-------|
| **Bull Rush** | STR + BAB + size vs STR + size | Push target 5ft + 5ft/5 over | Nothing | Provokes AoO. Improved Bull Rush removes AoO. |
| **Disarm** | Attack roll vs attack roll (size/weapon mods) | Target drops weapon | Defender may disarm you | Two-handed: +4. Light: -4. |
| **Grapple** | Melee touch → grapple check (BAB + STR + size) | Grappled condition, grapple options | Nothing | Provokes AoO. Complex multi-round state. |
| **Sunder** | Attack roll vs weapon/shield AC | Damage to item | Nothing | Provokes AoO. Improved Sunder removes AoO. |
| **Overrun** | STR + size vs STR + size | Target prone, continue movement | Target may trip you | Target can choose to avoid. |

### CMB / CMD (Combat Maneuver Bonus / Defense)

This phase introduces CMB and CMD as derived fields on `CreatureSystemModel`:

```
CreatureSystemModel (added in this phase)
├── cmb: number (derived: BAB + STR mod + size mod)
└── cmd: number (derived: 10 + BAB + STR mod + DEX mod + size mod)
```

All combat maneuver check formulas above reference `#self.cmb` for the attacker and `#target.cmd` for the defender. Phase 5 does NOT stub these fields — they are introduced here alongside the maneuver actions that consume them.

### Maneuver Action Templates

These would be provided as **default action sets** that items auto-populate from. Any creature with STR and BAB has access to basic combat maneuvers — these could live as actor-level actions or be generated dynamically.

### Weapon Property flags (remaining from `WEAPON_PROPERTIES`)

poc.10 (`docs/migration-plan/poc/phase-10-basic-combat.md` §10.4) adds `WeaponSystemModel.properties` (a `SetField`) and wires up 5 of the 18 `dnd35e.WEAPON.Property.*` flags it actually needs (`finesse`, `reach`, `thrown`, `nonLethal`, `nonLethalNoPenalty`). The remaining 13 — `blocking`, `brace`, `double`, `disarm`, `fragile`, `grapple`, `improvised`, `incorporeal`, `monk`, `performance`, `returning`, `sunder`, `trip` — belong here instead: most gate one of the maneuvers above (Disarm/Sunder/Trip/Grapple already listed in the table; `double`/`brace`/`blocking` affect maneuver eligibility and full-attack mechanics for double weapons), are purely descriptive (`improvised`, `monk`, `fragile`, `performance`), or are their own small mechanic (`incorporeal` — weapon can damage incorporeal creatures despite their 50% miss chance; `returning` — a thrown weapon returns to the thrower's hand at the end of the turn with no action spent, distinct from the *enhancement-granted* Returning special ability already covered in beta.8's Special Weapon Abilities, which is the magic version of the same effect applied to a weapon that doesn't have it innately). Extend `WEAPON_PROPERTIES` (`src/constants/weapons/weaponProperties.mts`) with the remaining 13 constants and the `SetField`'s `choices` when this phase wires their actual rules effects.

---

## 18.8 Execution Engine

The execution engine resolves action formulas using the same `Dnd35eDocumentMixin` pipeline that powers material name formulas and weapon property derivation (see PR-weapon-base §5). This means action formulas benefit from the existing `_buildFormulaContexts()` infrastructure — the engine doesn't need its own formula resolver.

### Formula Resolution Flow

1. **Context assembly**: `_buildFormulaContexts()` reads each `FormulaField`'s `formulaContexts` declarations and walks from the live document to find the actor (via `parent.parent` for item actions) and item (via `parent`). The **target** context is injected at execution time from the selected token — this is the one context that doesn't exist until the player clicks "attack."
2. **Roll data merge**: The assembled contexts are merged into a single `rollData` POJO — the same format Foundry's `Roll` class expects for variable substitution. Actor provides `#self.bab`, `#self.abilities.*`, `#self.size.*`, etc. Item provides `#Item.*`. Target provides `#target.*`.
3. **Evaluation**: `FormulaField.resolvedValue` is populated by the existing `prepareDerivedData()` pipeline for display. At execution time, the engine passes `rollData` directly to `new Roll(formula, rollData).evaluate()`.

```typescript
class ActionExecutionEngine {
  /**
   * Execute a specific action from an item.
   * Handles chain resolution, breakpoints, and chat output.
   */
  async execute(
    source: ItemDnd35e | ActorDnd35e,
    actionId: string,
    targets: Token[],
    options?: ExecutionOptions
  ): Promise<ActionResult>;

  /**
   * Execute a single action step. Returns the step result
   * which determines which chain links to follow.
   */
  private async executeStep(
    action: ActionDataModel,
    context: ActionContext
  ): Promise<StepResult>;

  /**
   * Follow chain links based on step result.
   * Handles breakpoints and onChoice pauses.
   */
  private async resolveChain(
    chain: ActionChainLinkModel[],
    result: StepResult,
    context: ActionContext
  ): Promise<void>;

  /**
   * Build and post the chat message for this action's results.
   */
  private async postChatCard(results: StepResult[]): Promise<ChatMessage>;
}

interface ExecutionOptions {
  fastForward?: boolean;              // Skip all breakpoints
  skipDialog?: boolean;               // Skip pre-roll dialog (situational modifiers)
  rollMode?: string;                  // Public, GM, blind, self
  powerAttackRatio?: number;          // PA trade-off if applicable
}

interface ActionContext {
  actor: ActorDnd35e;
  item?: ItemDnd35e;
  targets: Token[];
  currentTarget?: Token;              // For per-attack targeting
  targetItem?: ItemDnd35e;            // For item-on-creature targeting (Magic Weapon, etc.)
  rollData: Record<string, any>;      // Assembled @ variables
  turnBudget: TurnActionBudget;       // Current turn state
  previousResults: StepResult[];      // Results from earlier chain steps
}

interface StepResult {
  action: ActionDataModel;
  roll?: Roll;
  total?: number;
  success?: boolean;
  isCrit?: boolean;
  isFumble?: boolean;
  isKill?: boolean;
  damage?: { total: number; type: string };
  effectApplied?: ActiveEffect;
}
```

---

## 18.9 UI & Action HUD

The action availability UI lives across multiple surfaces:

### Item Sheet — Actions Tab

Every item type that can bear actions gets a dedicated **Actions tab** on its sheet. This is the primary interface for configuring what an item *does*.

**Layout**:
- **"Add Action" button** at the top of the tab. Clicking it appends a new collapsible action section.
- Each action is a **collapsible section** with a header showing the action name, type badge, and activation type. Sections can be reordered via drag handles.
- Inside each section:
  - Name (text input)
  - Type selector (check, attack, damage, heal, effect, utility)
  - Activation cost (standard, move, swift, free, fullRound, immediate, passive, aoo)
  - Type-specific fields that appear/hide based on type selection:
    - **check/attack**: formula (FormulaFormGroup with autocomplete), defense target, DC formula
    - **damage**: formula, damage type, crit range, crit multiplier
    - **heal**: formula
    - **effect**: effect UUID picker, duration, target mode (`self`, `creature`, `area`, `item-on-creature`), item target filter (when `item-on-creature` selected)
  - **Chain links** area at the bottom: a list of chain entries, each with a trigger selector (onSuccess, onFailure, onCrit, onKill, always, onChoice) and a target action dropdown (references other actions on the same item by ID). An "Add Chain Link" button appends a new entry.
- **Delete action** button (with confirmation) on each section header.
- Weapons auto-populate with default attack/damage/crit actions on creation, but these can be edited or replaced.

**Item-on-Creature Target Mode UI**:
When an action's effect target is set to `item-on-creature`:
- An **item filter** panel appears with:
  - Item type checkboxes (weapon, equipment, etc.)
  - "Equipped only" toggle (default: on)
- At **execution time**, after the caster selects the target creature token, an **Item Picker Dialog** appears showing a filtered list of that creature's inventory. The picker shows item name, icon, equipped status, and any existing enhancement bonuses. Single-select; click confirms.

### Token HUD (Primary)

Extends Foundry's built-in Token HUD with a combat action panel:
- Shows available actions organized by type (attacks, spells, movement, special)
- Actions dim/gray out as the turn budget is spent
- Color-coded by activation type (standard = blue, move = green, swift = yellow, free = white)
- Weapon attacks show remaining iteratives with BAB bonus displayed

### Combat Tracker (Budget Display)

The combat tracker sidebar shows:
- Which action types have been spent this turn (standard ✓, move ✗, swift ✗)
- Current turn state in plain language: "Standard action available" / "Full attack — 2 attacks remaining"
- Undo button for the last action

### Actor Sheet (Combat Tab)

Full list of all actions available to the character:
- All item actions grouped by source item (read-only summary — edit via the item's own Actions tab)
- Actor-level actions (combat maneuvers, special abilities) with inline editing
- Action editing interface for actor-level action customization

### Vue Architecture Integration

All action UI follows the established Vue patterns from PR-weapon-base §6:

**Action Editor Components** (item sheet Actions tab):
- Built as Vue SFCs under `src/vue/components/actions/`
- The Actions tab is a full-tab component (`ActionTabPanel.vue`) included in every action-bearing item sheet
- Each action renders as a collapsible `ActionSection.vue` with drag handle for reordering
- "Add Action" button at tab top creates a new section with default values
- Formula inputs (attack formula, damage formula, DC formula) use **FormulaFormGroup** — the same contenteditable component with syntax highlighting and autocomplete used for material name formulas
- Numeric fields (critRange, critMultiplier) use **NumberFormGroup** with view-aware field access via `useDocumentSheetStore.getViewAwareFieldValue()`
- Chain link editing uses a list component with drag-to-reorder and trigger type selectors, nested at the bottom of each action section
- The action editor reads formula contexts from the `ActionDataModel`'s `formulaContexts` declarations to populate autocomplete with actor stats (`#self.bab`, `#self.abilities.str.mod`), item properties (`#Item.enhancement`), target defenses (`#target.ac`), and target item properties (`#targetItem.enhancement`)

**PreRollDialog** (situational modifier / Power Attack dialog):
- Extends `VueAppBaseMixin(ApplicationV2)` — follows the same mixin chain as item sheets and AE configs
- Contains a Pinia store for dialog state (PA slider value, Combat Expertise slider, situational modifier text field)
- Uses the FormGroup component hierarchy for its inputs (sliders, checkboxes, number inputs)
- Receives the `FamiliarSchema` for the action's formula contexts so the situational modifier input supports autocomplete

**ActionHUD** (Token HUD extension):
- Rendered as a Vue component mounted into Foundry's Token HUD via `VueAppBaseMixin`
- Reads available actions from `TurnActionBudget.getAvailableActions()` and renders them with dimming/color-coding
- Updates reactively as the turn budget changes (Pinia store subscription)

**TurnBudgetDisplay** (Combat Tracker widget):
- Vue component injected into the sidebar combat tracker
- Reads from the `TurnActionBudget` Pinia store
- Displays spent/available action types with the same view-aware patterns

### Future Consideration

May evolve into a dedicated floating window or app for complex characters. Token HUD real estate is limited. This decision can be deferred until implementation reveals constraints.

---

## 18.10 Feat & Effect Integration

**All feat modifications flow through the Active Effect system.** This keeps the action engine clean and lets feats compose naturally.

### Passive Bonus Feats (AE Changes)

These generate standard AE changes during `prepareDerivedData()`, following the **Material pattern** (see PR-weapon-base §4): each feat effect has a `buildChanges()` method that auto-generates `isSystem: true` changes from its properties, just as `MaterialSystemModel.buildChanges()` generates hardness/price/DR changes. This means:

- Feat effects declare `static targetContexts` to tell the **AspectPicker** which schema properties are valid change keys (e.g., `{ item: ['weapon'] }` for Weapon Focus, `{ actor: ['character'] }` for Improved Initiative)
- The AspectPicker renders the weapon or actor schema tree in the AE config, so GMs pick change targets from a structured list instead of typing raw paths
- Changes flow through the standard two-phase AE pipeline (initial phase during `prepareEmbeddedDocuments`, final during `prepareDerivedData`)

| Feat | AE Change |
|------|-----------|
| Weapon Focus (Longsword) | `system.attacks.longsword.attackBonus` +1 untyped |
| Weapon Specialization | `system.attacks.longsword.damageBonus` +2 untyped |
| Improved Initiative | `system.attributes.init.total` +4 untyped |
| Improved Critical | `system.attacks.longsword.critRange` modified (from 19-20 → 17-20) |

### Flow-Altering Feats (Effect Triggers)

Feats that change *what actions are available* or *grant bonus actions* use **effect triggers** — a new concept in the AE system.

```typescript
interface EffectTrigger {
  event: TriggerEvent;                // 'onKill' | 'onCrit' | 'onAttack' | 'onRoundStart' | etc.
  grantAction?: {                     // Grant a bonus action
    type: ActivationType;             // What slot it provides ('standard', 'free', etc.)
    restriction?: string;             // "melee attack only", "adjacent target only"
    source: string;                   // Feat UUID for tracking
  };
  modifyAction?: {                    // Modify an existing available action
    actionFilter: string;             // Which actions to modify
    changes: Record<string, any>;     // Changes to apply
  };
}
```

| Feat | Trigger | Effect |
|------|---------|--------|
| **Cleave** | `onKill` | Grant 1 free melee attack action against adjacent target |
| **Great Cleave** | `onKill` | Grant unlimited free melee attacks on kill chain |
| **Haste** (spell) | `onRoundStart` | Add 1 extra attack at highest BAB to iterative pool |
| **Rapid Shot** | `onFullAttack` | Add 1 extra ranged attack at -2 to all attacks |
| **Flurry of Blows** | `onFullAttack` | Add extra unarmed attacks, modify penalties by level |
| **Improved Trip** | `onTripSuccess` | Grant 1 free melee attack against tripped target |
| **Spring Attack** | Special | Unlock move→attack→move action pattern (not normally legal) |

### Per-Attack Toggle Feats

These are presented in a **pre-roll dialog** before each attack where the player chooses options:

| Feat | Dialog UI | Effect |
|------|-----------|--------|
| **Power Attack** | Slider: trade N attack for N×(1 or 2) damage | Per-attack choice. 1:1 one-hand, 1:2 two-hand, 1:3 two-hand with specific feats. |
| **Combat Expertise** | Slider: trade N attack for N dodge AC | Per-attack. Dodge AC bonus lasts until next turn. |
| **Fighting Defensively** | Toggle | -4 attack, +2 dodge AC for round |

---

## 18.11 Chat Cards

Each attack produces a **separate chat message**. This gives clear per-attack resolution and makes it easy to reference individual results. Chat cards use **TypeScript render functions** (NOT Vue, NOT Handlebars) that produce static HTML strings.

### Why Not Vue for Chat Cards
Chat messages are static HTML persisted in `message.content`, not reactive components. Vue components would create hundreds of mount points as messages accumulate, require hydration on reload, and fight Foundry's expectation of serialized HTML. See README §"Vue & Chat Card Strategy" for the full rationale.

### Chat Card Architecture

```typescript
// src/chat/cards/AttackCard.mts
export function renderAttackCard(data: AttackCardData): string {
  // Returns static HTML string with data-action buttons
  return `<div class="dnd35e chat-card attack-card" data-actor-id="${data.actorId}">...</div>`;
}
```

**Flow**:
1. Action executes → builds `AttackCardData` from result + stacking history
2. `renderAttackCard(data)` produces HTML string
3. `ChatMessage.create({ content: html, flags: { dnd35e: data } })`
4. On re-render: `ChatMessage.renderHTML()` reads flags, calls `renderAttackCard()` again
5. Button clicks: `renderChatMessageHTML` hook registers `data-action` listeners

**Key patterns**:
- **Render functions, not templates**: TypeScript functions returning HTML strings — type-safe, testable
- **`data-action` buttons**: Delegated action pattern (same as PF2E) — `<button data-action="apply-damage">`
- **Flags for structured data**: `message.flags.dnd35e` stores attack results, targets, stacking history
- **Re-render from flags**: Override `ChatMessage.renderHTML()` to rebuild from flags on state change (e.g., "damage applied")
- **Enrichment**: Use `TextEditor.enrichHTML()` for inline rolls within card content

### Chat Card Types

| Card | Content | Phase |
|------|---------|-------|
| `AttackCard` | Attack roll, hit/miss, damage, apply buttons | Phase 8 |
| `CriticalCard` | Threat + confirmation + multiplied damage | Phase 8 |
| `DamageCard` | Damage breakdown with type tags | Phase 8 |
| `CheckCard` | Skill/ability check result | Phase 8 |
| `SaveCard` | Saving throw result with DC | Phase 8 |
| `ManeuverCard` | Combat maneuver (trip, grapple, etc.) | Phase 8 |
| `SpellCard` | Spell cast with save/SR/effects | Phase 16 |

### Dual-Stack Resolution for Masked Items

When the wielded weapon (or any bonus source) has **unidentified effects**, the ExecutionEngine runs `resolveActiveEffectChanges()` **twice** per roll:

1. **Real stack** — all bonuses (visible + hidden). Determines the **actual die roll**.
2. **Masked stack** — only bonuses the player knows about, stacked independently. Determines the **player-visible breakdown**.

Both histories are stored in `flags.dnd35e.stackingHistory` on the chat message (`{ real: ChangeHistory[], masked: ChangeHistory[] }`). The render function checks `game.user.isGM`:

- **Player**: Sees `masked` history. Their breakdown may not add up to the die total — this is correct. The character doesn't know why the sword performs better than expected.
- **GM**: Sees `real` history with `[hidden]` markers on bonuses from unidentified sources, plus the suppression chain (e.g., "Magic Weapon +1 suppressed by hidden +2 enhancement").

See [Phase 2 §2.5.2](../poc/phase-02-active-effect-on-item.md) for the dual-stack algorithm.

### Attack Chat Card Contents

```
┌─────────────────────────────────────────┐
│ ⚔️ Longsword Attack (+11)               │
│ Fighter → Goblin                        │
│                                         │
│ Attack: [d20 roll] + 11 = 24  ✅ HIT   │
│ vs AC 15                                │
│                                         │
│ Damage: [1d8+5] = 9 slashing           │
│                                         │
│ [Apply Damage] [Half] [Double]          │
└─────────────────────────────────────────┘
```

### Critical Hit Card

```
┌─────────────────────────────────────────┐
│ ⚔️💥 Longsword CRITICAL (+11)           │
│ Fighter → Goblin                        │
│                                         │
│ Attack: [d20=19] + 11 = 30  THREAT!     │
│ Confirm: [d20] + 11 = 22  ✅ CONFIRMED │
│ vs AC 15                                │
│                                         │
│ Damage: [2d8+10] = 18 slashing (×2)    │
│                                         │
│ [Apply Damage] [Half] [Double]          │
└─────────────────────────────────────────┘
```

---

## 18.12 Attacks of Opportunity

AoO handling is **configurable per table** via a system setting.

### Modes

| Setting | Behavior |
|---------|----------|
| **Auto-detect + prompt** | System detects token movement through threatened squares, casting in melee, standing from prone. Prompts threatening player: "Take AoO against [target]?" |
| **Manual only** | Players/GM manually trigger AoO via token HUD or macro. System tracks remaining AoO count per round. |
| **Disabled** | No AoO tracking. For groups that handle it verbally. |

### AoO Budget

- Default: 1 AoO per round
- Combat Reflexes: AoO equal to DEX modifier per round (minimum 1)
- Tracked on the `TurnActionBudget` but persists across turns until round resets

### AoO as Action

AoO uses the same `ActionDataModel` with `activation: 'aoo'`. The weapon's attack action is reused with the AoO activation context.

---

## 18.13 Action Economy Settings

| Setting | Category | Default | Options |
|---------|----------|---------|---------|
| `actionEconomyEnforcement` | Combat | `warn` | `enforce`, `warn`, `off` |
| `fullAttackBreakpoint` | Combat | `beforeDamage` | `beforeDamage`, `none` |
| `aooMode` | Combat | `autoPrompt` | `autoPrompt`, `manual`, `off` |
| `fastForwardDefault` | Roll | `false` | `true`, `false` |
| `showActionBudget` | Display | `true` | `true`, `false` |

---

## 18.14 Spell & Consumable Actions (Outline)

> Detailed design deferred to Phase 16 (Spells POC) and Phase 21 (Consumables). This section outlines how they plug into the action system.

### Spells

- Default "Cast" action with `activation` matching the spell's casting time
- Attack spells: → action chain to attack roll → damage
- Save spells: → action chain to save → effect application
- **Item-buff spells**: `effect.target: 'item-on-creature'` with `itemTargetFilter` — e.g., Magic Weapon targets one equipped weapon. Flow: select target token → item picker dialog (filtered to equipped weapons) → apply buff AE to selected item.
- Spell failure check: Pre-chain step for arcane casters in armor
- Concentration checks: Triggered by AoO during casting (if auto-detect enabled)
- Touch spells: Cast action → hold charge → melee touch attack on subsequent turn(s)

### Consumables

- Default "Use" action with `activation: 'standard'`
- Potions: Drinking provokes AoO
- Scrolls: Spell completion — requires concentration, provokes AoO
- Wands: Command word — no concentration, no AoO

---

## 18.15 Resolved & Deferred Questions

### Resolved

1. **Grapple multi-round state**: Grapple needs its own path in the turn state machine. When a character is grappling, the `TurnActionBudget` enters a `Grappled` state variant that restricts available actions to the grapple-specific set (attack with unarmed/light/natural, damage opponent, pin, escape, move grapple, cast limited spells, activate magic item, draw light weapon, retrieve spell component). Each of these replaces a normal attack action per the SRD. The grappled state persists across rounds until the grapple is broken. This is a separate state branch in the state machine, not a condition layered on top of normal turn flow.

2. **Charge as full-round action**: Charge is handled through movement + attack integration. Two entry points:
   - **Move first**: If a player moves their token in a straight line and the distance is within charge range (≤ 2× speed, ≥ 10 ft), a "Charge Attack" option appears in the attack HUD alongside regular attacks. This must be visually distinct from a normal attack since charging carries special rules (+2 attack, -2 AC until next turn, straight line only, no 5-foot step, lance double damage mounted).
   - **Declare first**: If the player clicks a "Charge" action button before moving, the ruler locks to straight-line-only mode and restricts distance to 10 ft–2× speed. On ruler confirm, the charge attack dialog opens immediately.
   
   Either way, the state transitions to `FullRoundSpent` after the charge resolves. A charge consumes the full round — no additional attacks, no move action, no 5-foot step.

3. **Mounted combat**: Rider and mount share one initiative but have **separate linked action budgets**. The UI presents two action tracks that the player can interleave in any order (e.g., rider attacks → mount moves → mount attacks → rider casts swift spell).
   
   Per the SRD (d20srd.org/srd/combat/specialAttacks.htm — Mounted Combat):
   - "Your mount acts on your initiative count as you direct it."
   - "You move at its speed, but the mount uses its action to move." — Mount's action provides the movement.
   - If mount moves more than 5 feet, rider can only make a **single melee attack** (not full attack). Rider CAN full attack with ranged weapons while mount moves.
   - Rider can take move actions normally (draw weapon, retrieve item, etc.).
   - Mount (if a warhorse/trained) can independently attack.
   - On a mounted charge, rider gets charge bonuses; lance does double damage.
   - Casting while mount moves requires Concentration check (DC 10 + spell level for normal move, DC 15 + spell level for run).
   
   Implementation: `TurnActionBudget` gains a linked `mountBudget: TurnActionBudget` when the actor is mounted. The HUD shows both budgets. A constraint enforces the "mount moved > 5 ft → rider single melee attack only" rule by listening to mount movement and restricting rider attack options accordingly.

### Deferred

4. **Ready and Delay**: Deferred until the combat tracker phase is designed in detail. These change initiative order and defer actions — interaction with the per-turn state machine will be specified then.

5. **Action template versioning**: Deferred to the compendium phase. How compendium template updates propagate to items created from older versions is a compendium concern, not an action system concern.

6. **Full attack with natural weapons**: Moved to Phase 25 (Natural Attacks) where the iterative generation rules for mixed manufactured + natural weapon full attacks are specified.

7. **Custom weapon actions (`CustomWeaponAction`)**: poc.10 (`docs/migration-plan/poc/phase-10-basic-combat.md` §10.3) ships only system-managed `MeleeWeaponAttack`/`RangedWeaponAttack`/`ThrownWeaponAttack` actions per weapon, auto-synced from `weaponSubtype`/properties. Letting an author hand-add an arbitrary extra action on a weapon beyond those three (a `CustomWeaponAction` subtype + a weapon-sheet "New Action" button) is deferred here. poc.10's `TypedSchemaField` dispatch already reserves a `custom` key for it, so adding the subtype requires no poc.10 rework — only the subtype itself and its sheet UI need building. Two design decisions carried forward from the original poc.10 draft, so they aren't lost:
   - **Default formula pre-fill**: a newly-added custom action's `check.formula`/`damage.formula` should default to FormulaFamiliar references into the weapon's own live data (e.g. `damage.formula` → `#item.weaponDamage.damageRoll`, `check.formula` → `1d20 + #self.attributes.bab.total + #self.abilities.str.mod`), not blank fields or copied literals — so it starts usably pre-filled and stays live-linked to the Details tab; an author who wants a fixed value just overwrites the formula text.
   - **No live-merge participation**: unlike the three system-managed subtypes, a `CustomWeaponAction` entry is never looped into `Weapon.getContributedActorChanges()`'s merge — `system.attacks.actions.<id>` reads straight from `this.system.actions` verbatim for it, since its own formula fields already reference the weapon's live data via FormulaFamiliar directly (nothing mechanical left to merge).

8. **Precision damage eligibility system, and any GM override for it**: a poc.10 draft (`docs/migration-plan/poc/phase-10-basic-combat.md` §10.7) added a "Force Apply Precision Damage" toggle to the Roll Defense Dialog, mirroring D35E's `ACApplyPrecision`. Precision damage is the SRD term for extra damage that only applies under specific circumstances and is explicitly denied against certain creatures — Sneak Attack, Skirmish, and Sudden Strike are the canonical examples ("a rogue can't strike with deadly accuracy... against a creature that is immune to critical hits" — SRD Sneak Attack). Normal eligibility (flanking/flat-footed target, not immune) would be checked by this system once it exists; "force apply" means the GM overrides that eligibility check and lets the extra damage through anyway — e.g. a homebrew ruling, or a feat/magic item that grants sneak attack against a normally-immune creature. With no eligibility system built in poc.10, the toggle had nothing to override and was a no-op — removed from poc.10 entirely. **Spike at alpha.3 start**: does this need a dedicated override at all once the eligibility system exists, or does authoring the system correctly (e.g. a GM-editable flag directly on the effect/feat granting the damage) make a separate override unnecessary?

---

## 18.16 Files to Create/Modify

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/actions/ActionDataModel.mts` | Action nested DataModel with defineSchema() and formulaContexts declarations |
| Create | `src/actions/ActionChainLinkModel.mts` | Chain link DataModel |
| Create | `src/actions/ActionExecutionEngine.mts` | Execution engine with chain resolution, uses Dnd35eDocumentMixin formula pipeline |
| Create | `src/actions/TurnActionBudget.mts` | State machine for action economy tracking |
| Create | `src/actions/IterativeAttackGenerator.mts` | Compute available attacks from BAB + equipment + feats |
| Create | `src/actions/ActionTypes.mts` | Type definitions, enums, interfaces |
| Create | `src/actions/EffectTrigger.mts` | Trigger system for feat-granted actions (Material `buildChanges()` pattern) |
| Create | `src/actions/templates/` | Default action templates by item type |
| Create | `src/actions/maneuvers/` | Combat maneuver action definitions |
| Create | `src/vue/components/actions/ActionEditor.vue` | Action list + editing panel, uses FormulaFormGroup for formula inputs |
| Create | `src/vue/components/actions/ActionTabPanel.vue` | Full Actions tab component for item sheets (Add Action button, section list) |
| Create | `src/vue/components/actions/ActionSection.vue` | Collapsible single-action editor section with drag handle |
| Create | `src/vue/components/actions/ActionChainEditor.vue` | Chain link list with drag-to-reorder |
| Create | `src/vue/components/actions/ActionListItem.vue` | Single action display in editor/HUD |
| Create | `src/vue/components/actions/ItemPickerDialog.vue` | Filtered inventory picker for item-on-creature targeting |
| Create | `src/vue/components/combat/ActionHUD.vue` | Token HUD action panel (via VueAppBaseMixin) |
| Create | `src/vue/components/combat/TurnBudgetDisplay.vue` | Combat tracker budget widget |
| Create | `src/vue/components/combat/PreRollDialog.vue` | Situational modifier dialog (extends VueAppBaseMixin(ApplicationV2)) |
| Create | `src/vue/stores/turnBudgetStore.mts` | Pinia store for TurnActionBudget reactive state |
| Modify | Weapon data model | Add `actions` EmbeddedDataField |
| Modify | Actor data model | Add `actions` for actor-level actions |
| Modify | FormulaFamiliar registry | Register action formula contexts for weapon/spell/consumable subtypes |
| Modify | Combat tracker | Integrate TurnActionBudget per combatant, mount TurnBudgetDisplay |
| Modify | Token HUD | Extend with ActionHUD Vue component |
| Modify | Active Effect system | Add EffectTrigger support, feat effects follow Material buildChanges() pattern |
| Modify | `CreatureSystemModel` | Add `cmb` and `cmd` derived fields to actor data model |
| Create | `src/actions/templates/skillCheckDefaults.mts` | Basic skill check actor-level action template (d20 + ability mod) |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 8 has not started)

### ❌ Not Started (All Tasks for Phase 8)

**Core Data Models:**
- [ ] Create `src/actions/ActionTypes.mts` with enums: ActionType ('check', 'attack', 'save', 'damage', 'heal', 'effect', 'utility'), ActivationType ('standard', 'move', 'swift', 'free', 'fullRound', 'immediate', 'passive', 'aoo'), TriggerEvent ('onSuccess', 'onFailure', 'onCrit', 'onFumble', 'onKill', 'always', 'onChoice')
- [ ] Create interfaces: AttackRecord, ActionAvailability, ActionContext, StepResult, ExecutionOptions
- [ ] Create `src/actions/ActionDataModel.mts` extending DataModel
- [ ] Implement ActionDataModel schema: id (StringField, required), name (StringField), type (StringField with choices), activation (StringField with choices), provokesAoO (BooleanField)
- [ ] Implement ActionDataModel.check schema field: formula (FormulaField), against (StringField with choices), againstFormula (FormulaField)
- [ ] Implement ActionDataModel.damage schema field: formula (FormulaField), type (StringField for DamageType), critRange (NumberField), critMultiplier (NumberField)
- [ ] Implement ActionDataModel.healing schema field: formula (FormulaField)
- [ ] Implement ActionDataModel.effect schema field: effectUuid (StringField), duration (SchemaField with duration data), target (StringField with choices: 'self', 'creature', 'area', 'item-on-creature')
- [ ] Implement ActionDataModel.effect.itemTargetFilter schema field: itemTypes (ArrayField), equippedOnly (BooleanField, default true) — only active when target is 'item-on-creature'
- [ ] Implement ActionDataModel.chain field: ArrayField of EmbeddedDataField(ActionChainLinkModel)
- [ ] Attach formulaContexts to all FormulaField instances in ActionDataModel via static _initializeFormulaContexts()
- [ ] Define formulaContexts array for action formulas: Actor ('#self'), Item ('#Item'), Target ('#target'), TargetItem ('#targetItem')
- [ ] Test: ActionDataModel instantiation, schema validation, embedded chain links, itemTargetFilter validation
- [ ] Create `src/actions/ActionChainLinkModel.mts` extending DataModel
- [ ] Implement chain link schema: trigger (StringField with choices from TriggerEvent), actionId (StringField), description (StringField for UI label)
- [ ] Test: Chain links can be created and linked to parent action

**Formula & Context Integration:**
- [ ] Register action formula contexts in FormulaFamiliar: weapon actions, spell actions, consumable actions
- [ ] Implement actor formula context: provides #self.bab, #self.abilities.*, #self.attributes.*, #self.size.*, #self.saves.*
- [ ] Implement item formula context: provides #Item.enhancement, #Item.dc, #Item.type, size modifiers
- [ ] Implement target formula context (runtime): provides #target.ac, #target.touchAc, #target.flatFootedAc, #target.saves.*, #target.cmd, #target.size.*
- [ ] Implement targetItem formula context (runtime): provides #targetItem.enhancement, #targetItem.material, etc. — injected when effect.target is 'item-on-creature'
- [ ] Implement runtime context injection: ActionExecutionEngine injects target context at execution time from selected token, and targetItem context from item picker selection
- [ ] Test: Formula context autocomplete works in action editor

**Turn Action Budget State Machine:**
- [ ] Create `src/actions/TurnActionBudget.mts` class with state machine
- [ ] Implement TurnState enum: Fresh, StandardSpent, MoveSpent, AttackTaken, FullAttack, FullRoundSpent, Charged, Grappled, TurnEnded
- [ ] Implement state property tracking: state, spent.standard, spent.move, spent.swift, spent.fiveFootStep, spent.movement, spent.attacks[] array
- [ ] Implement grappleState tracking: active boolean, opponents[] array (Actor IDs), isPinning, isPinned
- [ ] Implement mountBudget linking: linkedMount reference if actor is mounted
- [ ] Implement getAvailableActivations(): ActivationType[] method returning legal activation types based on current state
- [ ] Implement getAvailableActions(actor): ActionAvailability[] method returning available actions with availability flags
- [ ] Implement spend(activation, actionRecord?) method with state transition logic
- [ ] Implement override(activation) for GM forcing actions
- [ ] Implement undo() to revert last action spent
- [ ] Implement reset() for new turn initialization
- [ ] Implement state validation: prevent illegal transitions (e.g., can't move after taking move action)
- [ ] Code all 16 rows of state transition table explicitly
- [ ] Implement 5-foot step validation: only available if no other movement taken
- [ ] Implement move after attack validation: after single attack, can take move OR continue to full attack (not both)
- [ ] Implement full-round lock-in: second attack commits to full attack, no movement allowed after
- [ ] Implement swift/immediate tracking: one swift per turn, immediate burns next turn's swift
- [ ] Implement charge validation: must move 10-2×speed in straight line, -2 AC next turn, no 5-foot step
- [ ] Implement grapple state branch: entering/exiting grapple context with restricted action set
- [ ] Implement action record tracking: store which weapons/attacks used this turn
- [ ] Test: Fresh state allows standard/move/swift/full-round/5ft step
- [ ] Test: Attack transition to AttackTaken, then can move OR continue to full attack
- [ ] Test: Second attack transitions to FullAttack, locks out movement
- [ ] Test: Grapple state restricts available actions to grapple-specific set
- [ ] Test: Cannot exceed 1 swift per turn (immediate burns next turn's swift)

**Iterative Attack Generation:**
- [ ] Create `src/actions/IterativeAttackGenerator.mts` class
- [ ] Implement computeIteratives(actor): IterativeAttack[] method
- [ ] Calculate BAB-based iteratives: BAB +11 → +11/+6/+1, BAB +6 → +6/+1, BAB +1 → +1
- [ ] Get main hand weapon from actor's equipped slot
- [ ] Get off-hand weapon from actor's equipped slot
- [ ] Generate main-hand iteratives: each +5 BAB increment grants -5 penalty to next iterative
- [ ] Generate off-hand iteratives: base offset depends on TWF feats (-4 off-hand, -8 if not TWF, -2 if Two-Weapon Fighting, no penalty if Ambidexterity)
- [ ] Apply weapon size modifiers: light (-2 off-hand), one-handed (normal), two-handed (can't use off-hand)
- [ ] Apply enhancement bonuses from weapon items
- [ ] Collect feat-granted extra attacks: Rapid Shot, Flurry of Blows (via effect triggers)
- [ ] Collect AE-granted extra attacks: Haste bonus attack (via AE changes)
- [ ] Calculate total attack bonus for each iterative: BAB + STR mod + enhancement + feats + AE bonuses + any penalties
- [ ] Set used: false on all iteratives
- [ ] Test: Fighter BAB +11 with longsword/short sword → correct iteratives (+11, +6, +1 main; +7, +2 off-hand with TWF)
- [ ] Test: Rogue Rapid Shot → +1 ranged iterative at -2 penalty
- [ ] Test: Haste buff AE → extra iterative at highest BAB

**Action Execution Engine:**
- [ ] Create `src/actions/ActionExecutionEngine.mts` class
- [ ] Implement async execute(source, actionId, targets, options?): Promise<ActionResult> method
- [ ] Build ActionContext from source actor, item, targets, turnBudget
- [ ] Inject runtime target context into rollData
- [ ] Fetch action from source.system.actions[actionId]
- [ ] Call executeStep(action, context) for first action in chain
- [ ] Implement async executeStep(action, context): Promise<StepResult> method
- [ ] For 'check' type: roll d20, add formula modifiers, compare vs defense target
- [ ] For 'attack' type: same as check but against AC/touch/flat-footed
- [ ] For 'damage' type: roll formula with crit multiplier if applicable
- [ ] For 'save' type: roll save check, compare vs DC
- [ ] For 'effect' type: create/apply AE from effectUuid
- [ ] For 'effect' with target 'item-on-creature': apply AE to context.targetItem (not context.currentTarget actor). AE gets `transfer: true` to flow bonuses up to the actor.
- [ ] For 'heal' type: roll formula, apply positive damage
- [ ] For 'utility' type: execute free action (open door, draw weapon, etc.)
- [ ] Populate StepResult: action, roll, total, success boolean, isCrit, isFumble, isKill, damage, effectApplied
- [ ] Implement critical hit detection: d20 roll ≥ critRange
- [ ] Implement critical confirmation roll: second d20 roll vs same defense
- [ ] Implement fumble detection: d20 roll === 1 (configurable)
- [ ] Implement onKill detection: damage dealt ≥ target current HP
- [ ] Implement async resolveChain(chain, result, context): Promise<void> method
- [ ] Filter chain links by trigger type matching result (onSuccess, onFailure, onCrit, onFumble, onKill, always, onChoice)
- [ ] For each matching trigger, fetch next action by actionId
- [ ] Check breakpoint settings: if breakpoint before damage and step is 'check' with success, pause and await user confirmation dialog
- [ ] Add to UI breakpoint queue if fast-forward is false
- [ ] Recursively executeStep for each chained action
- [ ] For onChoice trigger, show dialog with action options, await user selection before continuing
- [ ] Implement async postChatCard(results: StepResult[]): Promise<ChatMessage> method
- [ ] Build chat card HTML template with attack roll, vs defense, damage roll, total damage
- [ ] Show critical hit info if is Crit
- [ ] Show fumble notification if isFumble
- [ ] Show kill notification if isKill
- [ ] Add buttons: Apply Damage, Half Damage, Double Damage, Undo
- [ ] Include stacking history from system._stackingHistory in chat card details (collapsible)
- [ ] Post to chat, return ChatMessage
- [ ] Handle formula errors gracefully: if formula fails to evaluate, show error in chat with diagnostic hint
- [ ] Test: Execute weapon attack → rolls d20 → compares vs AC → if hit, rolls damage → posts chat
- [ ] Test: Critical hit → rolls confirm → if confirmed, rolls multiplied damage
- [ ] Test: Fumble detected → shows in chat
- [ ] Test: Kill target → isKill flag set
- [ ] Test: Breakpoint before damage → dialog shown → user confirms
- [ ] Test: Fast-forward → all steps resolve without pause
- [ ] Test: Action chain with multiple steps → all execute in sequence

**Pre-Roll Dialog (Situation Modifiers, Power Attack, Combat Expertise):**
- [ ] Create `src/vue/components/combat/PreRollDialog.vue` extending VueAppBaseMixin(ApplicationV2)
- [ ] Implement Pinia dialog state store with reactive fields: paModifier (0-limit), ceModifier (0-DEX mod), situationalText, showAdvanced
- [ ] Create HTML structure: header "Power Attack / Combat Expertise", role="form"
- [ ] Implement Power Attack slider: range 0 to actor.system.bab, labels "0" to "+BAB", tied to paModifier
- [ ] Display damage tradeoff: "Damage: +{X * (isTwoHand ? 2 : 1)}"
- [ ] Implement Combat Expertise slider: range 0 to actor.system.attributes.init.total (proxy for DEX mod), tied to ceModifier
- [ ] Display AC bonus: "+{ceModifier} dodge AC until next turn"
- [ ] Implement situational modifier text field: free text entry for "flat surface" / "higher ground" etc, with FormulaFamiliar autocomplete
- [ ] Show formula preview: "Final attack = base + {paModifier} - {ceModifier} + situational"
- [ ] Implement roll mode dropdown: Public, GM Only, Blind, Self
- [ ] Add action buttons: Cancel, Reset to Defaults, Apply
- [ ] On Apply: return dialog data to ActionExecutionEngine with paModifier, ceModifier, situationalBonus, rollMode
- [ ] Bind to action execution: show dialog before executeStep('check') with pre-roll options
- [ ] Test: Open dialog, adjust sliders, verify tradeoff display
- [ ] Test: Submit dialog, modifiers apply to action formula

**Action HUD (Token HUD Extension):**
- [ ] Create `src/vue/components/combat/ActionHUD.vue` extending VueAppBaseMixin
- [ ] Implement HUD rendering: mounted into Foundry Token HUD via Vue app mount point
- [ ] Fetch selected token's actor from canvas
- [ ] Subscribe to TurnActionBudget Pinia store for reactivity
- [ ] Call TurnActionBudget.getAvailableActions(actor) to fetch available action list
- [ ] Organize actions by type: Attacks (grouped by weapon), Spells, Movement, Swift, Free, Special
- [ ] Render each action as button with icon, name, activation type color coding (blue standard, green move, yellow swift, white free)
- [ ] For weapon attacks, show remaining iteratives: "Longsword +11/+6/+1"
- [ ] Dim/gray out unavailable actions with reason tooltip: "Move action already spent"
- [ ] Bind click handler to each action button: executeAction(action, event)
- [ ] Show target selection UI: "Select target (Ctrl for multi)" before executing targeted actions
- [ ] For item-on-creature actions: after target token selected, show ItemPickerDialog filtered by action's itemTargetFilter
- [ ] Update HUD reactively as TurnActionBudget state changes (Pinia subscription)
- [ ] Implement movement button: click triggers ruler for movement tracking
- [ ] Implement 5-foot step button: click moves token exactly 5 ft (or shows mini-ruler for precise placement)
- [ ] Test: HUD shows available actions on fresh turn
- [ ] Test: Actions dim/gray as turn budget spent
- [ ] Test: Click attack action → shows pre-roll dialog → executes → HUD updates
- [ ] Test: Full-attack workflow: standard attack → shows 2nd attack options → click 2nd attack → shows remaining iteratives

**Combat Tracker Integration:**
- [ ] Create `src/vue/components/combat/TurnBudgetDisplay.vue` component
- [ ] Subscribe to TurnActionBudget Pinia store keyed by combatant ID
- [ ] Render turn state display: "Standard action available" / "Full attack — 2 attacks remaining" / "Grappled"
- [ ] Show spent action indicators: standard ✓/✗, move ✓/✗, swift ✓/✗
- [ ] Show remaining iteratives if in full attack state
- [ ] Bind to combat tracker combatant turn change
- [ ] Add Undo button: reverts last action spent via TurnActionBudget.undo()
- [ ] Add End Turn button: resets budget to fresh OR progresses to next combatant
- [ ] Integrate TurnBudgetDisplay into Foundry's sidebar combat tracker
- [ ] Test: Combat tracker shows budget for active combatant
- [ ] Test: Budget updates as actions taken
- [ ] Test: Undo reverts last action
- [ ] Test: New turn resets budget

**Item Picker Dialog (item-on-creature targeting):**
- [ ] Create `src/vue/components/actions/ItemPickerDialog.vue` extending VueAppBaseMixin(ApplicationV2)
- [ ] Accept filter props: itemTypes (string[]), equippedOnly (boolean)
- [ ] Query target actor's items, filter by type and equipped status
- [ ] Render filtered list: item icon, name, equipped badge, existing enhancement info
- [ ] Single-select click confirms selection, resolves dialog promise with selected item
- [ ] Cancel button closes dialog and aborts action execution
- [ ] Test: Dialog opens with target actor's inventory filtered to equipped weapons
- [ ] Test: Selecting an item resolves and passes itemId to execution engine
- [ ] Test: Cancel aborts the action chain cleanly

**Action Tab Panel (Item Sheet):**
- [ ] Create `src/vue/components/actions/ActionTabPanel.vue` — full tab component
- [ ] Implement "Add Action" button at top: appends new ActionDataModel to item's actions array
- [ ] Render each action as collapsible `ActionSection.vue` with drag handle for reorder
- [ ] Create `src/vue/components/actions/ActionSection.vue` — collapsible editor for one action
- [ ] Implement action section: name input, type selector, activation selector
- [ ] Implement type-specific field panels that show/hide based on type (check, attack, damage, heal, effect, utility)
- [ ] For effect target 'item-on-creature': show itemTargetFilter sub-panel (item type checkboxes, equipped-only toggle)
- [ ] Implement chain link area at bottom of each section: trigger selector + target action dropdown + "Add Chain Link" button
- [ ] Implement delete action button with confirmation dialog
- [ ] Implement drag-to-reorder between action sections
- [ ] Add Actions tab to weapon sheet, spell sheet, and all action-bearing item sheets
- [ ] Auto-populate default actions on new weapon/spell creation
- [ ] Test: Add action → new section appears
- [ ] Test: Delete action → section removed after confirmation
- [ ] Test: Reorder actions → order persists on save
- [ ] Test: Chain link references valid action IDs from same item
- [ ] Test: item-on-creature filter panel appears only when effect target is 'item-on-creature'

**Combat Maneuver Templates:**
- [ ] Create `src/actions/maneuvers/Trip.mts` with complete action set
- [ ] Implement Trip action: type 'check', activation 'standard', provokesAoO: true (unless Improved Trip)
- [ ] Implement Trip formula: "1d20 + #self.bab + #self.abilities.str.mod + #self.size.grappleMod"
- [ ] Chain onSuccess → applyTrip (prone condition)
- [ ] Chain onFailure → selfTripCheck (attacker gets trip check vs result)
- [ ] Chain selfTripCheck onFailure → selfProne (attacker gets knocked prone)
- [ ] Create `src/actions/maneuvers/BullRush.mts`
- [ ] Implement Bull Rush action chain: force check, on success apply distance moved
- [ ] Create `src/actions/maneuvers/Disarm.mts`
- [ ] Implement Disarm action chain: opposed attack roll, on success drop weapon
- [ ] Create `src/actions/maneuvers/Sunder.mts`
- [ ] Implement Sunder action chain: attack vs item AC, on success apply damage to item
- [ ] Create `src/actions/maneuvers/Overrun.mts`
- [ ] Implement Overrun action chain: option to avoid, on success prone + continue movement, on failure opposing trip check
- [ ] Store maneuver templates in `src/actions/templates/maneuvers.json` or JavaScript
- [ ] Test: Trip maneuver full chain: check roll → if success apply prone, if failure attacker check → if fail attacker prone

**Default Action Templates:**
- [ ] Create `src/actions/templates/weaponDefaults.mts`
- [ ] Define weapon attack template: attack action vs AC → onSuccess damage → onCrit critConfirm → onSuccess critDamage
- [ ] Define damage action: roll formula with crit multiplier
- [ ] Define critConfirm action: confirmation roll vs AC
- [ ] Auto-populate weapon items with these templates on creation
- [ ] Create `src/actions/templates/spellDefaults.mts` (stub for Phase 16)
- [ ] Create `src/actions/templates/consumableDefaults.mts` (stub for Phase 21)
- [ ] Test: New weapon gets attack/damage/crit actions
- [ ] Test: Default action formulas reference #self.bab, #self.abilities.str.mod, #Item.enhancement

**Effect Triggers (Feat/Buff Integration):**
- [ ] Create `src/actions/EffectTrigger.mts` interface and system
- [ ] Implement EffectTrigger interface: event (TriggerEvent), grantAction?, modifyAction?
- [ ] Create feat effect AE examples: Cleave, Great Cleave, Haste, Rapid Shot, Flurry, Improved Trip, Spring Attack
- [ ] Implement Cleave trigger on AE: event: 'onKill', grantAction: {type: 'free', restriction: 'melee adjacent'}
- [ ] Integrate effect triggers into execution engine: listen for trigger events during action chain
- [ ] Grant bonus actions via effect trigger: add temporary action to available pool
- [ ] Restrict bonus actions: parse restriction string and validate target/weapon/range
- [ ] Test: Kill with attack → Cleave AE triggers → free attack action appears in HUD
- [ ] Test: Full attack with Rapid Shot → extra iterative appears at -2 to all attacks

**Chat Card System:**
- [ ] Implement attack chat card template: icon, attacker name → defender name, attack formula and roll result, vs defense, damage roll and total, crit status
- [ ] Implement crit hit card variant: show threat roll and confirmation roll separately
- [ ] Implement fumble card: show "Natural 1 — FUMBLE" status
- [ ] Implement kill card: show target death notification
- [ ] Add Apply Damage button: applies damage to target actor via damage application system (Phase 20)
- [ ] Add Half Damage button: applies half damage with rounding
- [ ] Add Double Damage button: applies doubled damage
- [ ] Add Undo button: reverts damage application
- [ ] Include collapsible stacking history details in card (show which bonuses applied/ignored from AEs)
- [ ] Format damage total with type: "9 slashing" / "12 fire" (color-coded by type if possible)
- [ ] Test: Attack chat card displays correctly in chat
- [ ] Test: Crit card shows threat/confirm
- [ ] Test: Damage buttons apply/undo correctly

**Attacks of Opportunity (AoO):**
- [ ] Create `src/actions/AoOManager.mts` or similar
- [ ] Implement AoO event detection via ruling hooks: onTokenMove, onCastSpell, onStandFromProne
- [ ] Implement auto-prompt mode: detect threatened token movement → list threatening actors → prompt each: "Take AoO?"
- [ ] Implement manual mode: AoO action visible in HUD when applicable
- [ ] Implement AoO budget: 1 AoO per turn default, +1 per DEX mod if Combat Reflexes
- [ ] Hook into TurnActionBudget: track AoO count per turn, reset at new turn
- [ ] Persist AoO action: off-turn AoO does NOT spend action budget, but consumes off-turn immediate slot
- [ ] Auto-detect threatened squares: for any non-Large+ creature, adjacent squares are threatened
- [ ] Implement AoO as action: reuse weapon attack action with 'aoo' activation type
- [ ] Test: Movement through threatened square → threatening player prompted
- [ ] Test: AoO action visible in HUD when valid
- [ ] Test: AoO count enforced (1 per turn + DEX mod for Combat Reflexes)

**Action Economy System Settings:**
- [ ] Add to system settings: actionEconomyEnforcement (enum: 'enforce'|'warn'|'off', default 'warn')
- [ ] Add setting: fullAttackBreakpoint (enum: 'beforeDamage'|'none', default 'beforeDamage')
- [ ] Add setting: aooMode (enum: 'autoPrompt'|'manual'|'off', default 'autoPrompt')
- [ ] Add setting: fastForwardDefault (boolean, default false)
- [ ] Add setting: showActionBudget (boolean, default true)
- [ ] Create settings menu UI in system settings (Phase 23 or defer to later)
- [ ] Enforce mode: prevent invalid action transitions (block with warning)
- [ ] Warn mode: warn but allow (yellow outline, warning message)
- [ ] Off mode: no enforcement
- [ ] Test: Settings persist and apply to turn budget validation

**Pinia Store for Reactive State:**
- [ ] Create `src/vue/stores/turnBudgetStore.mts`
- [ ] Define store state: budgetByTurn: Record<combatant-id, TurnActionBudget>
- [ ] Implement mutations: setBudget(combatantId, budget), updateBudget(combatantId, state), resetBudget(combatantId)
- [ ] Implement getters: getBudget(combatantId), isActionAvailable(combatantId, actionId)
- [ ] Subscribe to combat turn change events: on new combatant turn, reset budget
- [ ] Sync with TurnActionBudget spend() calls: update store when budget changes
- [ ] Test: Store state updates when TurnActionBudget state changes
- [ ] Test: UI components subscribed to store re-render reactively

**Actor-Level Actions (Skill Check + Combat Maneuvers):**
- [ ] Create `src/actions/templates/skillCheckDefaults.mts` — basic skill check action template
- [ ] Define basic skill check action: type 'check', activation 'standard', formula `1d20 + #self.abilities.[ability].mod`
- [ ] Skill check uses only ability mod (no ranks/class skill/synergies until Skills phase after Phase 12)
- [ ] Skill check produces chat card: "Climb Check: [d20 + 3] = 17"
- [ ] Register actor-level actions on `ActorSystemModel.actions` EmbeddedDataField array
- [ ] Auto-populate actors with basic combat maneuvers (Trip, Bull Rush, Disarm, Sunder, Overrun, Grapple) as actor-level actions
- [ ] Test: Actor has basic skill check action available in HUD
- [ ] Test: Skill check rolls d20 + ability mod, posts chat card
- [ ] Test: Actor has combat maneuver actions in HUD

**SRD Combat Rules — Aid Another, Cover, Massive Damage:**
- [ ] Implement Aid Another action template: standard action, melee touch attack vs AC 10, on success grant +2 to ally's next attack roll OR +2 to ally's AC vs next attack
- [ ] Aid Another action chain: check (touch attack AC 10) → onSuccess → effect (apply +2 circumstance bonus buff to ally, 1 round duration)
- [ ] Aid Another target selection: prompt for ally selection and bonus type (attack or AC)
- [ ] Implement Cover modifier system: partial cover (+4 AC, +2 Reflex), improved cover (+8 AC, +4 Reflex), soft cover (+4 AC)
- [ ] Cover detection: token position analysis or manual toggle on PreRollDialog
- [ ] Cover applies to AC and Reflex saves but NOT touch AC for improved cover
- [ ] Implement Massive Damage rule: when a single attack deals 50+ damage, target must make Fort save DC 15 or die instantly
- [ ] Massive Damage threshold configurable via game settings (default 50, variant: size-based)
- [ ] Massive Damage Fort save triggered automatically after damage application in action chain
- [ ] Test: Aid Another grants +2 circumstance bonus to chosen ally
- [ ] Test: Cover modifiers apply correctly to AC and Reflex saves
- [ ] Test: Massive Damage triggers Fort DC 15 on 50+ single-hit damage

**CMB / CMD Actor Fields:**
- [ ] Add `cmb` derived NumberField to `CreatureSystemModel` schema
- [ ] Add `cmd` derived NumberField to `CreatureSystemModel` schema
- [ ] Derive CMB in `prepareDerivedData()`: BAB + STR mod + size modifier
- [ ] Derive CMD in `prepareDerivedData()`: 10 + BAB + STR mod + DEX mod + size modifier
- [ ] Register CMB/CMD in FormulaFamiliar: `#self.cmb`, `#self.cmd`, `#target.cmd`
- [ ] Update combat maneuver formulas to reference `#self.cmb` and `#target.cmd`
- [ ] Display CMB/CMD on actor sheet Combat tab
- [ ] Test: Fighter BAB +5, STR +3, Medium → CMB = 8, CMD = 18 (if DEX +0)
- [ ] Test: Size modifier applies correctly (Small = -1, Large = +1)

**Integration with Existing Systems:**
- [ ] Modify weapon ItemDataModel: add `system.actions: EmbeddedDataField(ActionDataModel)[]`
- [ ] Modify actor ActorSystemModel: add `system.actions: EmbeddedDataField(ActionDataModel)[]` for actor-level actions
- [ ] Modify weapon sheet: add Actions tab using ActionTabPanel component
- [ ] Modify actor sheet: add Actions panel in Features tab for managing actor-level actions (maneuvers, special abilities) — read-only summary of item actions, inline editing for actor-level actions
- [ ] Register FormulaFamiliar contexts for action formulas on weapons
- [ ] Modify Combat Tracker UI: extend to show TurnBudgetDisplay
- [ ] Modify Token HUD: extend to mount ActionHUD Vue component
- [ ] Modify AE system: add support for EffectTrigger in AE definition (Phase 2 may need to be extended)
- [ ] Test: Weapon sheet has Actions tab
- [ ] Test: Actor sheet has Actions section
- [ ] Test: Action formulas show in-line hints from FormulaFamiliar

**Comprehensive Testing:**
- [ ] Unit test: TurnActionBudget state machine all 16 transitions
- [ ] Unit test: IterativeAttackGenerator BAB calculations
- [ ] Unit test: IterativeAttackGenerator TWF penalties
- [ ] Unit test: ActionExecutionEngine formula resolution
- [ ] Unit test: ActionExecutionEngine crit detection (d20=19 with crit 20 → threat detected)
- [ ] Unit test: ActionExecutionEngine crit confirmation
- [ ] Unit test: Action chain execution with multiple triggers
- [ ] Unit test: Chat card generation from StepResult
- [ ] Integration test: Full combat turn: Fresh → Attack → full attack → end turn
- [ ] Integration test: Multi-attack scenario: Fighter with longsword/short sword, full attack with TWF
- [ ] Integration test: Maneuver execution: Trip attempt → success chain → target prone
- [ ] Integration test: Pre-roll dialog: Power Attack slider → modifies attack formula → posts chat with adjusted total
- [ ] Integration test: Cleave trigger: Kill target → free attack appears → execute free attack
- [ ] Integration test: AoO detection: Move through threatened square → prompt → AoO executes
- [ ] Integration test: Grapple initiation: Standard action → enters Grappled state → only grapple actions available
- [ ] Integration test: Mounted combat: Rider + mount both take actions interleaved
- [ ] Integration test: Breakpoint workflow: attack hits → breakpoint dialog pauses → user confirms → damage resolves
- [ ] Edge case: BAB +11 with main hand + off-hand weapons → verify all 6+ iteratives computed correctly
- [ ] Edge case: Combat Expertise used with Power Attack → both sliders work together
- [ ] Edge case: Full-round action (charge) → cannot take move or swift after
- [ ] Edge case: 5-foot step then full attack → 5ft step doesn't prevent full attack
- [ ] Edge case: Move action already taken → cannot take 5ft step (validation)
- [ ] Edge case: Immediate action off-turn → consumes next turn's swift
- [ ] Edge case: Rapid Shot with ranged weapon → extra iterative appears with -2 penalty
- [ ] Edge case: Mounted combat with mount movement > 5ft → rider restricted to single melee OR full ranged
- [ ] Integration test: Item-on-creature targeting: cast item-buff spell → select target token → item picker shows equipped weapons → select weapon → buff AE created on weapon with transfer: true
- [ ] Integration test: Item picker filters correctly: equippedOnly=true hides unequipped items, itemTypes=['weapon'] hides non-weapons
- [ ] Integration test: Item picker cancel aborts action chain without consuming spell slot
- [ ] Integration test: Action tab on weapon sheet: add action → edit formula → add chain link → save → reload → actions persist
- [ ] Smoke test: Complete combat round with 3 combatants taking full attacks, no console errors
- [ ] Smoke test: Switch between multiple encounters, turn budgets track independently
- [ ] Performance test: 10+ iteratives computed in <100ms
- [ ] Accessibility test: HUD keyboard navigable, dialog screen-reader compatible
