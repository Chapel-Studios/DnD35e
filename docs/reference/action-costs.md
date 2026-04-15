# Action Costs Reference

Quick-reference for the D&D 3.5e turn economy as implemented in the TurnActionBudget state machine.

> For architecture details, see [Action System Architecture](../architecture/action-system.md).

---

## Turn Budget

Each combatant's turn consists of:

| Slot | Quantity | Notes |
|---|---|---|
| Standard action | 1 | Can be traded for a move action |
| Move action | 1 | Can be traded for a 5-foot step (no other movement) |
| Swift action | 1 | |
| Free actions | Unlimited | GM discretion on "reasonable" count |
| Full-round action | 1 standard + 1 move | Consumes both |
| Immediate action | 1 per round | Uses next turn's swift (if used off-turn) |

---

## Action Cost Table

### Standard Actions

| Action | Cost | Notes |
|---|---|---|
| Single melee attack | Standard | Can escalate to full attack |
| Single ranged attack | Standard | |
| Cast a spell (1 standard) | Standard | Most spells |
| Activate magic item | Standard | Use-activated, command word |
| Total defense | Standard | +4 dodge AC, no attacks |
| Use special ability | Standard | Breath weapon, gaze, etc. |
| Aid Another | Standard | +2 to ally's next check |
| Bull Rush | Standard | Opposed STR check |
| Disarm | Standard | Opposed attack roll |
| Feint | Standard | Bluff vs Sense Motive |
| Grapple | Standard | Touch attack + opposed check |
| Overrun | Standard | During movement |
| Sunder | Standard | Attack an object |
| Trip | Standard | Melee touch + opposed check |
| Use a skill (1 action) | Standard | Diplomacy, Heal, etc. |

### Move Actions

| Action | Cost | Notes |
|---|---|---|
| Move up to speed | Move | Provokes AoO if leaving threatened |
| Draw/sheathe weapon | Move | Free with BAB +1 |
| Stand from prone | Move | Provokes AoO |
| Pick up an item | Move | Provokes AoO |
| Open a door | Move | |
| Load crossbow (light) | Move | Heavy crossbow = full-round |
| Mount/dismount | Move | Free with Ride DC 20 |

### Full-Round Actions

| Action | Cost | Notes |
|---|---|---|
| Full attack | Full-round | All iteratives from BAB |
| Cast spell (1 round) | Full-round | Begins casting, completes next turn |
| Charge | Full-round | Move + single attack at +2, -2 AC |
| Run (x4 speed) | Full-round | Loses DEX to AC |
| Withdraw | Full-round | Move without AoO from first square |
| Coup de grâce | Full-round | Auto-crit vs helpless |
| Load crossbow (heavy) | Full-round | |

### Swift Actions

| Action | Cost | Notes |
|---|---|---|
| Cast quickened spell | Swift | Metamagic: Quicken Spell |
| Activate swift ability | Swift | Certain class features |

### Free Actions

| Action | Cost | Notes |
|---|---|---|
| Drop an item | Free | |
| Drop prone | Free | |
| Speak | Free | Brief utterance |
| Cease concentration | Free | |
| 5-foot step | Free | Only if no other movement this turn |

### Attacks of Opportunity

| Triggers | Budget | Notes |
|---|---|---|
| Default | 1/round | Does not consume turn actions |
| Combat Reflexes feat | DEX mod/round | Additional AoOs |

---

## Progressive Full Attack State Machine

```
Fresh
  │
  ├──[standard action]──→ StandardTaken (move remains)
  │
  └──[first attack]──→ AttackTaken
                          │
                          ├──[second attack]──→ FullAttackCommitted (all iteratives)
                          │
                          └──[end turn]──→ Fresh (was single attack)
```

The player does **not** declare "full attack" upfront. They take their first attack, and the system tracks whether they continue attacking (committing to full attack) or take a move action instead (retroactively making it a standard action attack).
