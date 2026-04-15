# Bonus Type Stacking Engine

> Source phases: 2, 5, 10, 15, 20, 28

D&D 3.5e has strict rules about which bonuses stack. The stacking engine is a centralized resolution system that enforces these rules during data preparation, records every decision, and exposes that history for transparency.

---

## Design Principles

1. **Deterministic** — Given the same inputs, stacking always produces the same result
2. **Transparent** — Every stacking decision is recorded in history with a reason
3. **Automatic** — Bonus types are assigned by the system based on effect source, not by users
4. **Auditable** — Players and GMs can inspect why a bonus was or wasn't applied

---

## Bonus Types

The system defines 27+ bonus types. Each type has a stacking rule:

| Bonus Type | Stacking Rule | Typical Source |
|---|---|---|
| Enhancement | Highest wins | Magic weapons/armor (+1, +2, etc.) |
| Armor | Highest wins | Armor slot equipment |
| Shield | Highest wins | Shield slot equipment |
| Natural | Highest wins | Natural armor, Barkskin |
| Deflection | Highest wins | Ring of Protection, Shield of Faith |
| Dodge | **Always stacks** | Dodge feat, Fighting Defensively |
| Size | Highest wins | Size category modifiers |
| Morale | Highest wins | Bless, Heroism, Rage |
| Sacred | Highest wins | Holy bonuses |
| Profane | Highest wins | Unholy bonuses |
| Luck | Highest wins | Divine Fortune, Lucky items |
| Insight | Highest wins | True Strike, foresight effects |
| Competence | Highest wins | Skill-boosting effects |
| Circumstance | Highest wins | Situational modifiers |
| Racial | Highest wins | Racial trait bonuses |
| Inherent | Highest wins | Wish, Tome of +stat |
| Trait | Highest wins | Character trait bonuses |
| Material | Highest wins | Material subtype bonuses |
| Alchemical | Highest wins | Potion/consumable bonuses |
| Haste | Highest wins | Haste spell (unique category) |
| Slow | Always applies | Slow spell penalty |
| Teamwork | Highest wins | Teamwork feat bonuses |
| Half | Highest wins | Pre-stacking rule (D35E-specific) |
| Untyped | **Always stacks** | Catch-all, no type specified |
| Untyped_Stackable | **Always stacks** | Explicitly stackable untyped |
| Penalty | **Always applies** | All penalties always apply |

> See [Bonus Types Reference](../reference/bonus-types.md) for the complete enum with examples.

---

## Resolution Algorithm

During `prepareDerivedData()`, the stacking engine processes all active effect changes:

```
1. Collect all AE changes targeting the same field
2. Group by (field, bonusType)
3. For each group:
   IF bonusType ∈ {Dodge, Untyped, Untyped_Stackable, Penalty}:
     → Apply ALL values (they stack)
   ELSE:
     → Apply only the HIGHEST value
     → Record lower values as "ignored: highest-wins"
4. Store complete history in enriched `overrides` (no separate `_stackingHistory` — see Phase 2 §2.5.1)
```

### Data Structures

```typescript
// Extended AE change data with bonus type
interface Dnd35eEffectChangeData extends EffectChangeData {
  bonusType: BonusType;
  operator: OperationType;        // UPGRADE, DOWNGRADE, ADD, MULTIPLY, etc.
  priority?: number;
}

// Resolution tracking
interface StackingHistory {
  field: string;                   // "attributes.ac.value"
  applied: StackingEntry[];        // bonuses that were applied
  ignored: StackingEntry[];        // bonuses that were not applied (with reason)
}

interface StackingEntry {
  source: string;                  // effect name / item name
  value: number;
  bonusType: BonusType;
  reason?: string;                 // "highest-wins, lower value" or "always applies"
}
```

### Example Resolution

A level 5 Fighter with Mithral Full Plate, Ring of Protection +1, and Shield of Faith (+2 deflection):

```
Field: attributes.ac.value

Bonuses collected:
  +9 armor (Mithral Full Plate)     → bonusType: Armor
  +1 deflection (Ring of Protection) → bonusType: Deflection
  +2 deflection (Shield of Faith)    → bonusType: Deflection
  +1 dodge (Fighting Defensively)    → bonusType: Dodge
  -1 size (Medium, no modifier)      → bonusType: Size (value 0)

Resolution:
  Armor group:     +9 applied (only one)
  Deflection group: +2 applied (highest), +1 ignored (highest-wins)
  Dodge group:     +1 applied (always stacks)
  Size group:      +0 applied (only one)

Final: 10 (base) + 9 + 2 + 1 + 0 = 22 AC

Stacking history records:
  applied: [{source: "Mithral Full Plate", value: 9, bonusType: "Armor"}, ...]
  ignored: [{source: "Ring of Protection", value: 1, bonusType: "Deflection",
             reason: "highest-wins, lower than Shield of Faith (+2)"}]
```

---

## Automatic Bonus Type Assignment

Bonus types are **not user-assignable**. The system determines them from the effect source:

- Material AE → `Material` bonus type (each material subtype is distinct)
- Armor equipment → `Armor` bonus type
- Shield equipment → `Shield` bonus type
- Enhancement on weapon/armor → `Enhancement` bonus type
- Feat granting dodge → `Dodge` bonus type

This prevents user error (accidentally making bonuses stack when they shouldn't) and keeps the system SRD-accurate.

---

## Player Trust & Transparency

The stacking history is the system's proof of correctness. It answers "Why didn't my +1 apply?" with a concrete record: which bonus won, from which source, by which rule.

Chat cards show stacking history inline (expandable). Character sheets can display active bonuses and ignored bonuses per field. This transparency is a core design goal — the system should never feel like a black box.

---

## Integration Points

| System | Integration |
|---|---|
| [Action System](action-system.md) | Attack/damage rolls collect bonuses and run stacking before rolling |
| [Active Effects](active-effect-lifecycle.md) | Every AE change carries a `bonusType` field |
| [Data Preparation](data-preparation-pipeline.md) | Stacking runs during `prepareDerivedData()` |
| [Conditions](condition-system.md) | Condition AEs use `Penalty` bonus type (always applies) |
| [Architecture Overview](architecture-overview.md) | Dnd35eEffectChangeData extends the base AE change |
