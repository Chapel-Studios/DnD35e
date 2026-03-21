# Phase 18: Action System

> **Status**: Not started  
> **Dependencies**: Phase 6, Phase 9  
> **Goal**: A comprehensive Action System where actions live on items. Actions can be checks, attacks, saves, damage, or effect applications. Actions can be **chained** into sequences.

---

## 18.1 What the Action System Replaces

| Current Approach | Action System Equivalent |
|------------------|--------------------------|
| `weapon.rollAttack()` (Phase 6) | Weapon has an "Attack" action |
| `spell.cast()` (Phase 14) | Spell has a "Cast" action |
| `consumable.use()` (Phase 17) | Consumable has a "Use" action |
| D35E `attack` item type | Attack actions on weapons/natural attacks |
| D35E `full-attack` item type | Action Chain on actor |

## 18.2 Action Model

Actions are **embedded data on items** (not separate documents, not items). They live in the item's system data:

```typescript
interface ActionData {
  id: string;                        // Unique within this item
  name: string;                      // Display name (i18n key or formula)
  type: ActionType;                  // 'check' | 'attack' | 'save' | 'damage' | 'heal' | 'effect' | 'utility'
  activation: ActivationType;        // 'standard' | 'move' | 'swift' | 'free' | 'fullRound' | 'immediate' | 'passive'
  
  // WHAT the action does (depends on type):
  check?: {
    formula: string;                 // e.g., "1d20 + @abilities.str.mod + @bab"
    against: DefenseType;            // 'ac' | 'touchAc' | 'flatFootedAc' | 'fort' | 'ref' | 'will' | 'skill' | 'dc'
    againstFormula?: string;         // For fixed DCs or skill contests
  };
  damage?: {
    formula: string;                 // "1d8 + @abilities.str.mod"
    type: DamageType;
    critMultiplier?: number;
  };
  healing?: { formula: string };
  effect?: {
    effectUuid?: string;             // AE to apply (buff, debuff, condition)
    duration?: DurationData;
    target: 'self' | 'target' | 'area';
  };
  
  // CHAIN: what can happen next
  chain?: ActionChainLink[];
}
```

## 18.3 Action Chains

The core innovation. An action chain is a conditional sequence:

```typescript
interface ActionChainLink {
  trigger: ChainTrigger;            // 'onSuccess' | 'onFailure' | 'onCrit' | 'always' | 'onChoice'
  actionId: string;                 // Next action to execute
  description?: string;             // "On hit, roll damage"
}
```

**Examples:**

**Simple Weapon Attack:**
```yaml
actions:
  - id: "attack"
    type: "attack"
    check: { formula: "1d20 + @bab + @str.mod", against: "ac" }
    chain:
      - trigger: "onSuccess"
        actionId: "damage"
      - trigger: "onCrit"
        actionId: "critDamage"
  - id: "damage"
    type: "damage"
    damage: { formula: "1d8 + @str.mod", type: "slashing" }
  - id: "critDamage"
    type: "damage"
    damage: { formula: "1d8 + @str.mod", type: "slashing", critMultiplier: 2 }
```

**Full Attack Chain (on actor, referencing equipped weapon):**
```yaml
actions:
  - id: "fullAttack"
    type: "utility"
    activation: "fullRound"
    chain:
      - trigger: "always"
        actionId: "weapon.attack"      # First attack at full BAB
      - trigger: "always"
        actionId: "weapon.attack-2"    # Second at BAB-5
      - trigger: "always"
        actionId: "weapon.attack-3"    # Third at BAB-10
```

**Trip Attack (Combat Maneuver):**
```yaml
actions:
  - id: "trip"
    type: "check"
    check: { formula: "1d20 + @bab + @str.mod + @size.grappleMod", against: "skill", againstFormula: "@target.skills.balance.total" }
    chain:
      - trigger: "onSuccess"
        actionId: "applyProne"
      - trigger: "onFailure"
        actionId: "selfTrip"
  - id: "applyProne"
    type: "effect"
    effect: { effectUuid: "conditions.prone", target: "target" }
  - id: "selfTrip"
    type: "check"
    check: { formula: "1d20 + @bab + @str.mod", against: "dc", againstFormula: "@target.trip.dc" }
    chain:
      - trigger: "onFailure"
        actionId: "selfProne"
  - id: "selfProne"
    type: "effect"
    effect: { effectUuid: "conditions.prone", target: "self" }
```

## 18.4 Execution Engine

```typescript
class ActionExecutionEngine {
  async execute(item: ItemDnd35e, actionId: string, targets: Token[]): Promise<ActionResult>;
  private async executeStep(action: ActionData, context: ActionContext): Promise<StepResult>;
  private async resolveChain(chain: ActionChainLink[], result: StepResult, context: ActionContext): Promise<void>;
  private buildChatCard(results: StepResult[]): ChatMessageData;
}
```

## 18.5 Open Design Questions (for when we reach this phase)

- Should actions be stored as a nested `DataModel` array in the item's system data, or as pseudo-documents?
- How should cross-item action references work? (e.g., full-attack referencing weapon's attack action)
- Should the chat card accumulate all chain results into one message or post separate messages?
- How do bonus effects from feats interact with action chains? (e.g., Cleave: "on kill, get another attack")
- How does the UI for editing action chains work? (Visual chain editor? YAML-like text? Form fields?)

## 18.6 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/actions/ActionData.mts` — action data model |
| Create | `src/actions/ActionChain.mts` — chain data model |
| Create | `src/actions/ActionExecutionEngine.mts` — execution engine |
| Create | `src/actions/ActionTypes.mts` — type definitions |
| Create | `src/vue/components/actions/` — action editor, chain editor |
| Refactor | Weapon — replace `rollAttack()` with default attack action |
| Refactor | Spell — replace `cast()` with default cast action |
| Modify | Chat card templates — unified action result cards |
