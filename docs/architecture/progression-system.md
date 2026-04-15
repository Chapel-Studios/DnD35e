# Progression & Level System

> Source phases: 10, 11, 12, 22

The progression system handles everything related to character advancement: class and racial progressions, level history, feature grants, BAB/save computation, and multiclass stacking. D&D 3.5e has notably complex leveling rules — monster class progressions, favored classes, multiclass XP penalties — so the system uses an immutable ledger pattern to keep history auditable.

---

## Shared Progression Component

Races and classes share the same underlying progression data model. Both define:
- Hit dice progression (die size per level)
- BAB rate (full, 3/4, 1/2)
- Save progressions (good/poor for Fort, Ref, Will)
- Skill points per level
- Grant schedules (features granted at specific levels)

```typescript
interface ProgressionComponent {
  hitDie: number;                    // d4, d6, d8, d10, d12
  babRate: 'full' | 'three-quarter' | 'half';
  saves: {
    fort: 'good' | 'poor';
    ref: 'good' | 'poor';
    will: 'good' | 'poor';
  };
  skillPointsPerLevel: number;       // base (before INT mod)
  classSkills: string[];             // skill IDs that are class skills
  grantSchedule: GrantSchedule[];    // features at each level
}
```

This component is embedded in both `RaceSystemModel` and `ClassSystemModel`. Dragon racial progression uses the same structure as Fighter class progression — enabling monster class progressions (locked racial levels before taking regular class levels).

---

## Level History (Immutable Ledger)

Every level taken is recorded as an immutable `LevelRecord` appended to the actor's level history. The system never modifies past records — it only appends new ones or removes from the end.

```typescript
interface LevelRecord {
  progressionId: string;            // UUID of class/race item providing this level
  progressionType: 'class' | 'race';
  level: number;                    // level within this progression (1, 2, 3...)
  totalHD: number;                  // total hit dice at this point

  hp: {
    dieSize: number;                // hit die size (null if HD overridden)
    roll: number | null;            // rolled value (null until rolled)
    conMod: number;                 // CON modifier at time of level (permanent snapshot)
  };

  skillPoints: {
    base: number;                   // from class
    intMod: number;                 // INT mod at time of level (permanent snapshot)
    allocated: Record<string, number>;  // { acrobatics: 2, climb: 1, ... }
  };

  abilityIncrease: string | null;   // "str" at total HD 4/8/12/16/20
  grants: string[];                 // UUIDs of items granted at this level
  choices: GrantChoice[];           // player choices made during level-up
}

interface GrantChoice {
  choiceGrantId: string;            // which grant schedule entry
  selectedUUID: string;             // what the player chose
}
```

### Why Permanent Snapshots?

CON and INT modifiers are captured at the time of leveling because D&D 3.5e rules make HP and skill points dependent on the modifier *at the time the level is gained*. Later CON changes don't retroactively alter past HP rolls (though some tables house-rule this). The snapshot enables both interpretations — retroactive recalculation is a setting toggle, not an architecture decision.

---

## Derived Values from Level History

During `prepareDerivedData()`, all combat stats are recomputed from scratch using the level history:

```
BAB = sum of each progression's BAB contribution at each level
     (Fighter 5 at full rate = +5, Wizard 3 at half rate = +1, total = +6)

Saves = sum of each progression's save contribution
     Fort: Fighter good (2 + level/2) + Wizard poor (level/3)

HP = sum of each record's (dieSize roll + conMod at time)
     + any bonus HP from feats (Toughness), AEs

Skill ranks = sum of each record's allocated skill points
     Cross-class skills cost 2 points per rank
```

Nothing is stored as a running total. This means reordering or removing a class correctly cascades through all dependent stats.

---

## Grant System

Progressions define a schedule of features granted at each level. Grants can be automatic, player-choice, or filtered-choice.

```typescript
interface GrantSchedule {
  at: number | number[];              // level(s) when grant applies
  type: 'auto' | 'choice' | 'choice-from-filter';

  // For 'auto': automatically grants this item
  uuid?: string;

  // For 'choice': player picks from a fixed list
  from?: string[];

  // For 'choice-from-filter': player picks from filtered compendium
  filter?: {
    type?: string;                    // "feat"
    featType?: string;                // "bonus-feat"
    source?: string;                  // "srd" or module ID
  };
}
```

### Grant Provenance

Every granted item carries metadata tracking where it came from:

```typescript
{
  grantedBy: {
    sourceId: string;    // UUID of the class/race that granted it
    level: number;       // the level at which it was granted
  }
}
```

This enables **cascading removal**: if a class is removed, all items granted by that class are also removed. If a level is removed, grants from that level are cleaned up.

### Level-Up Workflow

```
1. Player clicks "Add Level" → selects progression (Fighter, Wizard, Dragon, etc.)
2. System checks grant schedule for this level
3. For each grant:
   - 'auto' → item created on actor automatically
   - 'choice' → dialog shows options, player picks
   - 'choice-from-filter' → compendium browser opens with filters
4. HP roll captured (or max at level 1, per setting)
5. Skill point allocation UI opens
6. Ability increase prompt at total HD 4/8/12/16/20
7. LevelRecord appended to level history
8. prepareDerivedData() recalculates everything
```

### Level-Down (Cascading Removal)

```
If a class item is deleted or a level is removed:
  1. Find all LevelRecords with matching progressionId
  2. For each record: delete all items where grantedBy.sourceId matches
  3. Remove the LevelRecord(s)
  4. Rebuild BAB/saves/HP from remaining history
  5. Generate warnings for orphaned dependencies
```

---

## Monster Class Progression (HD Override)

Monstrous races (Dragon, Beholder, etc.) use a "monster class" — a locked racial progression that must be completed before taking regular class levels.

```
Dragon Racial Progression:
  Level 1: +1d12 HP, natural armor +2, claw/bite attacks
  Level 2: +1d12 HP, natural armor +4, breath weapon
  Level 3: +1d12 HP, natural armor +6, wing attacks, flight

  After completing 3 racial levels → can take Fighter, Wizard, etc.
```

The system treats monster class levels identically to regular class levels in the level history. The only difference: the progression item is flagged as `isRacialProgression: true`, and the UI prevents taking other classes until racial levels are complete.

HD Override: Some monster progressions override the hit die with a fixed value rather than rolling. The `LevelRecord.hp.dieSize` can be `null` in this case, with `hp.roll` set to the fixed value.

---

## Integration Points

| System | Integration |
|---|---|
| [Action System](action-system.md) | BAB from level history drives iterative attack generation |
| [Bonus Stacking](bonus-stacking.md) | Class features generate AE changes that go through stacking |
| [Active Effects](active-effect-lifecycle.md) | Racial/class features use the Material pattern (AE generators) |
| [Data Preparation](data-preparation-pipeline.md) | All stats recomputed from history during `prepareDerivedData()` |
| [Content Pipeline](content-pipeline.md) | Class/race compendium items contain grant schedules with UUIDs |
