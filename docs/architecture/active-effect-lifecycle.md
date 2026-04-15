# Active Effect Lifecycle

> Source phases: 2, 5, 8, 10, 13, 18, 20

Active Effects are the universal mechanism for modifying document data. Everything that changes a stat — materials, equipment, buffs, conditions, racial traits, class features — flows through the AE system. This document covers the lifecycle, phase application, and generator patterns.

> For the foundational Dnd35eEffectChangeData and Material AE concept, see [Architecture Overview](architecture-overview.md#4-materials-as-active-effects).

---

## Phase Application System

Effects apply in ordered phases during the data preparation lifecycle. Each phase serves a distinct purpose:

| Phase | When | Purpose | Example |
|---|---|---|---|
| `core` | `prepareBaseData()` | Identity-level changes (race, size) | Racial ability modifiers, size category |
| `initial` | `prepareEmbeddedDocuments()` | Direct stat bonuses | Equipment AC, shield bonus |
| `final` | `prepareDerivedData()` | Derived stat changes, reactive calculations | BAB from class levels, save bonuses |
| `action.*` | Roll time (on-demand) | Per-roll modifiers, not applied during prep | Power Attack trade-off, situational bonuses |

### Why Phases Matter

Without phases, circular dependencies arise. If a feat modifies BAB, and BAB determines iterative attacks, the order of operations matters. The phase system guarantees:

- `core` runs first → racial modifiers and size are set before anything else
- `initial` runs next → equipment bonuses applied before derived stats
- `final` runs last → derived values (BAB sum, save totals) computed from stable inputs
- `action.*` deferred → roll-time modifiers don't pollute the prepared state

### Phase Assignment

Each `Dnd35eEffectChangeData` declares its phase:

```typescript
interface Dnd35eEffectChangeData extends EffectChangeData {
  phase: 'core' | 'initial' | 'final' | string;  // string for action.* namespaces
  bonusType: BonusType;
  operator: OperationType;
  // targetField removed — Dnd35eField compound replaced by useDnd35eField() (Phase 1, 1.O–1.V)
}
```

---

## Dnd35eEffectChangeData

The system extends Foundry's base `EffectChangeData` with fields needed for D&D 3.5e:

```typescript
interface Dnd35eEffectChangeData extends EffectChangeData {
  key: string;              // target field path ("attributes.ac.value")
  value: string | number;   // change value (can be a formula)
  mode: number;             // Foundry change mode
  priority: number;         // application order within phase

  // dnd35e extensions
  bonusType: BonusType;     // for stacking engine resolution
  phase: string;            // application phase
  operator: OperationType;  // UPGRADE, DOWNGRADE, ADD, MULTIPLY, OVERRIDE, MASK
  // targetField removed — fields are no longer compound (Phase 1, 1.O–1.V)
}
```

### Operators

| Operator | Behavior |
|---|---|
| `ADD` | Add value to current field value |
| `MULTIPLY` | Multiply current field value |
| `UPGRADE` | Set to value only if higher than current |
| `DOWNGRADE` | Set to value only if lower than current |
| `OVERRIDE` | Replace field value entirely |
| `MASK` | Display-layer overlay only — does not mutate real data. Used exclusively by Secret AEs (Phase 2, §2.7). MASK changes are excluded from `applyActiveEffects()` and the stacking engine; the view layer reads them directly to build a masks dictionary. |

---

## Material Pattern (AE Generator)

The Material pattern, introduced in Phase 2, is the proof-of-concept for all AE generators. An item doesn't store static bonus values — it **generates** AE changes dynamically every prep cycle via `buildChanges()`.

```typescript
class MaterialSystemModel extends Dnd35eActiveEffectSystemModel {
  buildChanges(): Dnd35eEffectChangeData[] {
    const subtype = this.system.material.subtype;
    const config = MATERIAL_CONFIGS[subtype];

    return [
      {
        key: 'attributes.ac.misc',
        value: config.acBonus,
        bonusType: BonusType.Material,
        operator: 'UPGRADE',
        phase: 'initial'
      },
      // ... more changes based on material properties
    ];
  }
}
```

**Key property**: Source of truth stays on the effect. Changes are regenerated fresh each prep cycle, so the system never has stale cached bonuses.

This pattern is reused by:
- **Equipment** → generates Armor/Shield AC bonuses
- **Racial traits** → generates ability score adjustments
- **Class features** → generates BAB/save contributions
- **Buffs** → generates temporary stat modifications
- **Conditions** → generates penalty changes

---

## Bond Pattern

Relationships between actors (familiar, animal companion, mount, summoned creature) are encoded as AE bonds. The bond is an Active Effect on the companion actor that references the master.

```typescript
interface BondAE {
  system: {
    bondsType: 'familiar' | 'animalCompanion' | 'mount' | 'summon' | 'cohort' | 'commanded';
    bondTo: ActorUUID;            // master/owner actor
    sharedInitiative: boolean;    // acts on master's turn
    statDerivation: 'inherit' | 'own';  // familiars inherit HP/BAB from master
  }
}
```

During `prepareDerivedData()`, the master actor scans for bonded companions and populates `actor.bonds[]`. Bond effects can flow both ways — a familiar shares the master's HP, a paladin's mount grants mounted combat bonuses.

---

## AE Generator Pattern (Items → Temporary Effects)

Items can generate temporary AEs on use. A potion creates a buff AE when consumed. A spell creates a duration-tracked AE on the target.

```typescript
interface AEGeneratorConfig {
  triggeredBy: 'use' | 'equip' | 'event';
  duration: DurationData;
  changes: Dnd35eEffectChangeData[];
  filterCondition?: string;    // formula that must evaluate truthy
}
```

**Lifecycle:**
1. Item used (or equipped, or event fires)
2. Generator creates new AE from config
3. AE applied to target actor
4. Duration tracking begins (rounds, minutes, hours)
5. On expiry → AE automatically removed
6. On dispel → AE removed early

---

## Integration Points

| System | Integration |
|---|---|
| [Bonus Stacking](bonus-stacking.md) | Every AE change carries `bonusType`; stacking runs after all changes collected |
| [Data Preparation](data-preparation-pipeline.md) | Phases align with preparation lifecycle stages |
| [Action System](action-system.md) | `action.*` phase effects deferred to roll time |
| [Conditions](condition-system.md) | Conditions are predefined AE templates |
| [Area Effects](area-effects.md) | Regions apply/remove AEs on token enter/exit |
| [Progression](progression-system.md) | Class/race features generate AE changes via the Material pattern |
| [Architecture Overview](architecture-overview.md) | `useDnd35eField()` stamps familiar/permission metadata on plain fields; Secret AEs (Phase 2 §2.7) handle display masking via MASK change mode |
