# Data Preparation Pipeline

> Source phases: 5, 7, and referenced throughout all phases

Every actor and item in the system goes through a multi-stage preparation pipeline on every update. This pipeline transforms raw stored data into fully-derived combat-ready values. The core philosophy is **shell-now, derive-later**: store minimal data, compute everything else.

---

## Shell-Now, Derive-Later

The system stores only source-of-truth values. Everything else is computed during preparation:

- **Stored**: Base ability scores, class choices, equipment owned, AEs applied
- **Derived**: Ability modifiers, BAB, save totals, AC, attack bonuses, spell DCs

This means:
- No stale data — values are always recomputed from current state
- No sync bugs — removing an item automatically drops its contributions
- No migration burden — adding a new derived field just adds a computation step

---

## Preparation Stages

Foundry's DataModel lifecycle provides three hooks. The system uses each for a specific purpose:

### Stage 1: `prepareBaseData()`

**Purpose**: Set raw field defaults. No calculations.

```typescript
prepareBaseData() {
  // Set default ability scores if missing
  this.system.abilities.str.base ??= 10;
  
  // Set initial shell values that will be replaced
  this.system.attributes.bab = 0;
  this.system.defense.armorClass = 10;
}
```

- Runs first, before any embedded documents
- No access to items, effects, or other documents
- Sets the "shell" that later stages fill in

### Stage 2: `prepareEmbeddedDocuments()`

**Purpose**: Apply `core` and `initial` phase effects. Equipment bonuses, racial modifiers.

```typescript
prepareEmbeddedDocuments() {
  super.prepareEmbeddedDocuments();
  
  // After this call, all 'core' and 'initial' phase AEs have applied
  // Racial ability adjustments are set
  // Equipment AC bonuses are applied
  // Size category is established
}
```

- Embedded items and effects are available
- `core` phase effects run (racial mods, size)
- `initial` phase effects run (equipment bonuses)
- After this stage, identity-level and direct stat bonuses are established

### Stage 3: `prepareDerivedData()`

**Purpose**: Main calculation phase. Everything that depends on other values.

```typescript
prepareDerivedData() {
  // 1. Compute ability modifiers from (base + bonuses)
  this._deriveAbilityModifiers();
  
  // 2. Compute BAB from level history
  this._deriveBab();
  
  // 3. Compute saves from level history + ability mods
  this._deriveSaves();
  
  // 4. Apply 'final' phase effects (derived stat modifications)
  this._applyFinalPhaseEffects();
  
  // 5. Run stacking engine on all collected bonuses
  this._resolveStacking();
  
  // 6. Compute AC from all sources
  this._deriveAc();
  
  // 7. Build derived arrays (attacks, bonds, conditions, warnings)
  this._buildDerivedCollections();
  
  // 8. Cache computed values
  this._cacheResults();
}
```

- All items, effects, and embedded documents are fully available
- Level history is read to compute BAB, saves, HP
- `final` phase effects apply (buffs modifying derived stats)
- Bonus stacking engine runs
- Derived collections built (available attacks, active conditions, warnings)
- Caches populated for sheet rendering

---

## Immutability During Preparation

During `prepareDerivedData()`:
- **DO** compute and store derived values on `system`
- **DO** create derived arrays (`actor.attacks[]`, `actor.bonds[]`)
- **DO** populate caches (`actor._stackingHistoryCache`)
- **DO NOT** call `update()` or persist changes to the database
- **DO NOT** mutate raw source-of-truth fields
- **DO NOT** trigger re-renders or side effects

The preparation pipeline is strictly read-only with respect to persisted data.

---

## Formula Resolution Timing

Formulas that use `#context.property` or `@attr` syntax resolve at different times depending on context:

| Context | Resolution Time | Example |
|---|---|---|
| Static field formulas | `prepareDerivedData()` | Spell DC = 10 + spell level + ability mod |
| Attack/damage formulas | Roll time | 1d20 + BAB + STR mod + enhancement |
| Conditional formulas | Roll time | Extra 1d6 only if target is flanked |
| Display formulas | Sheet render | Show computed AC breakdown |

Formulas in `action.*` phase effects are never resolved during prep — they are deferred to the Action System's ExecutionEngine at roll time.

---

## Caching Strategy

Some computations are expensive (scanning all effects, building stacking history). Results are cached and invalidated on change:

| Cache | Contents | Invalidated By |
|---|---|---|
| `_stackingHistoryCache` | Bonus stacking decisions per field | Any AE change, item update |
| `_featsCache` | Active feat effects list | Item add/remove/update |
| `_spellsCache` | Available spells by level | Spell item changes, slot updates |
| `_attacksCache` | Computed iterative attack sequence | BAB change, weapon change, feat toggle |

Caches are populated during `prepareDerivedData()` and read during sheet rendering. Sheets use lazy refresh — they only re-render on focus or explicit save, not on every prep cycle.

---

## Soft Validation & Warnings

The preparation pipeline generates non-blocking warnings for invalid states:

```typescript
actor.derived.warnings = [];

// Missing prerequisite
if (feat.prerequisites.some(p => !p.isMet)) {
  warnings.push({
    severity: 'warning',
    code: 'PREREQUISITES_UNMET',
    item: feat.name,
    unmet: feat.prerequisites.filter(p => !p.isMet)
  });
}

// Deleted progression reference
if (!await fromUuid(levelRecord.progressionId)) {
  warnings.push({
    severity: 'warning',
    code: 'PROGRESSION_NOT_FOUND',
    message: `Level ${record.level} references deleted progression`
  });
}
```

Warnings are displayed on the character sheet as an expandable panel. They never block gameplay — a feat with unmet prerequisites still functions, it just shows a warning.

---

## Integration Points

| System | Integration |
|---|---|
| [Active Effects](active-effect-lifecycle.md) | Phase application system aligns with preparation stages |
| [Actor Data Pipeline](actor-data-pipeline.md) | Verified real call sites (Item vs. Actor asymmetry), open ordering risks, and empirical findings that supplement this conceptual doc |
| [Bonus Stacking](bonus-stacking.md) | Stacking engine runs during `prepareDerivedData()` |
| [Progression](progression-system.md) | Level history feeds BAB/save/HP derivation |
| [Action System](action-system.md) | `action.*` effects deferred to roll time, not resolved during prep |
| [Architecture Overview](architecture-overview.md) | Plain-field architecture and Secret AE masks drive display targeting |
