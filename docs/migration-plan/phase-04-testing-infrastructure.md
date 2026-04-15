# Phase 4: Testing Infrastructure


**Status**: � Planned

> **Milestone**: POC  
> **Dependencies**: Phase 1  
> **Goal**: Stand up the test runner, shared mocks, and coverage tooling, then back-fill tests for Phase 1–3 deliverables. Every subsequent phase owns its own tests — Phase 4 establishes the patterns and proves them out.

---

## 4.1 Testing Framework

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Unit / Integration runner** | **Vitest** (already in `vite.config.ts`) | Native Vite integration, first-class TypeScript + ESM, fast HMR-aware watch mode. D35E uses Jest, but switching would add friction for no benefit. |
| **E2E runner** | **Playwright** (deferred — install when Phase 14+ needs it) | Same choice as D35E; tests run against a live Foundry instance. Not needed until combat tracker work. |
| **Coverage provider** | `v8` via Vitest | Zero-config for V8 coverage; no `.nycrc` needed. |
| **Mock strategy** | Hand-rolled Foundry stubs in `tests/setup.mts` | Mirrors D35E pattern (`global.Roll`, `global.game`, `global.CONFIG`, `global.foundry.utils`). Only mock what the test actually touches — keep stubs minimal. |

> **D35E reference**: D35E has only **4** unit-test files. Everything touching Foundry APIs goes straight to Playwright E2E (~90+ files). We follow the same pragmatic philosophy: **unit-test pure logic; defer Foundry-dependent behaviour to E2E.**

## 4.2 Unit Test Targets (Phase 1–3 Only)

| Area | Owning Phase | What to Test |
|------|-------------|--------------|
| **WeaponSystemModel schema** | Phase 1 | Field definitions, defaults, validation (crit range 20–24, multiplier 1–4), material sub-schema |
| **Material AE application** | Phase 1 | Material bonus applies, masterwork flag, broken penalty |
| **Bonus-type stacking engine** | Phase 2 | Same-type highest-only, dodge/untyped always stack, penalties always apply, history tracking |
| **Secret AE masking** | Phase 2 | MASK changes produce masked values, disable/enable, priority resolution, `isIdentified` derivation, GM vs player view modes |

> Tests for actors, feats, races, classes, formulas, combat, and conditions live in their owning phases (see §4.7).

## 4.3 Integration Test Approach

Phase 4 does **not** include integration tests. The mocks established here make integration-level testing possible; each subsequent phase adds integration tests as part of its deliverables.

## 4.4 Test Organization

```
tests/
├── unit/
│   ├── models/        — DataModel schema tests (weapon for now)
│   ├── effects/       — AE application, stacking, Secret masking
│   └── helpers/       — utility function tests (if any)
└── setup.mts          — shared mocks and test utilities
```

Directories like `tests/unit/preparation/`, `tests/integration/`, and `tests/e2e/` will be created by the phases that need them.

## 4.5 Test Conventions

- **Each phase owns its tests.** When a phase adds a data model, prep method, or AE type, it adds the corresponding `.test.mts` file.
- Test file naming: `<subject>.test.mts` (e.g. `stacking-engine.test.mts`).
- Shared mocks live in `tests/setup.mts`. Phase-specific fixtures go next to the test file.
- Tests run via `npm test` (watch) and `npm run test:ci` (single-run + coverage).
- Target coverage only for **complex logic and decision-making code** — stacking rules, masking, derivation formulas. No blanket percentage thresholds.

## 4.6 Files to Create/Modify

| Action | Path | Notes |
|--------|------|-------|
| Verify | `vite.config.ts` — vitest config block | Confirm `test.include`, `test.environment` |
| Modify | `package.json` | Add `test`, `test:ci`, `coverage` scripts |
| Create | `tests/setup.mts` | Foundry mocks: `DataModel`, `Document`, `Roll`, `game`, `CONFIG.DND35E`, `foundry.utils` |
| Create | `tests/unit/models/weapon.model.test.mts` | Schema, defaults, validation |
| Create | `tests/unit/effects/material-ae.test.mts` | Material bonus application |
| Create | `tests/unit/effects/stacking-engine.test.mts` | Full stacking-rule coverage |
| Create | `tests/unit/effects/secret-ae.test.mts` | Secret AE masking (8 cases from §2.7) |

---

## Completion Checklist

### ✅ Complete
_(None — Phase 4 has not started)_

### ❌ Not Started

**Test Infrastructure Setup**
- [ ] Verify `vitest` dependency exists in `package.json` (install if missing)
- [ ] Verify `vite.config.ts` has a `test` block with `include: ['tests/**/*.test.mts']`
- [ ] Set test environment to `'node'` (no DOM needed for unit tests)
- [ ] Add scripts to `package.json`: `"test": "vitest"`, `"test:ci": "vitest run"`, `"coverage": "vitest run --coverage"`
- [ ] Verify: `npm test` starts Vitest in watch mode
- [ ] Verify: `npm run coverage` produces a V8 coverage report

**Shared Test Utilities (`tests/setup.mts`)**
- [ ] Mock `foundry.abstract.DataModel` — minimal shape: static `schema`, `prepareDerivedData()` hook
- [ ] Mock `foundry.abstract.Document` — minimal Actor, Item, ActiveEffect shapes
- [ ] Mock `Roll` class — constructor accepts formula, `.evaluate()` returns `{ total }`, `.terms` iterable
- [ ] Mock `game` singleton — `user` (isGM flag), `i18n.localize()` passthrough, `settings.get()`
- [ ] Mock `CONFIG.DND35E` — bonus types enum, ability keys, size categories
- [ ] Mock `foundry.utils` — `getProperty`, `setProperty`, `mergeObject`, `deepClone`
- [ ] Export helpers: `createMockActor()`, `createMockItem()`, `createMockEffect()`
- [ ] Verify: mocks import without error; a trivial `describe` block passes

**Weapon Schema Tests (`tests/unit/models/weapon.model.test.mts`)**
- [ ] Schema defines all expected fields
- [ ] Default values apply correctly on construction
- [ ] Critical range validation: accepts 20, rejects 25
- [ ] Critical multiplier validation: accepts 2, rejects 0
- [ ] Material sub-schema attaches without error

**Material AE Tests (`tests/unit/effects/material-ae.test.mts`)**
- [ ] Material bonus type applies to weapon
- [ ] Multiple material AEs → highest wins (stacking rule)
- [ ] Masterwork material applies masterwork flag
- [ ] Broken material reduces defense value

**Stacking Engine Tests (`tests/unit/effects/stacking-engine.test.mts`)**
- [ ] Same-type bonus: highest value wins, others recorded as ignored
- [ ] Dodge bonus: all instances stack
- [ ] Untyped bonus: all instances stack
- [ ] Penalty: all penalties apply (separate from bonuses)
- [ ] Mixed scenario: dodge + untyped + same-type + penalty → correct totals
- [ ] History object tracks applied and ignored entries

**Secret AE Tests (`tests/unit/effects/secret-ae.test.mts`)**
- [ ] MASK change on a field → store returns masked value; underlying data unchanged
- [ ] Disable Secret → store returns real value
- [ ] Multiple Secrets with priority → highest-priority mask wins per field
- [ ] `isIdentified` derived state: no active Secrets → `true`; active Secret → `false`
- [ ] MASK changes excluded from stacking engine (not treated as bonuses)
- [ ] Compendium item with embedded Secret transfers correctly
- [ ] GM view toggle: switches between real and masked values in store
- [ ] Player view: always sees masked values regardless of toggle

---

## 4.7 Tests Relocated to Owning Phases

The following test areas were originally drafted here but belong to the phase that builds the feature. Each phase should include a **Tests** section in its checklist.

| Test area | Destination phase |
|-----------|------------------|
| `actor.model.test.mts` — schema, defaults, AC=10 | **Phase 6** (Actor Foundation) |
| `abilities.test.mts` — ability mods, size modifiers | **Phase 6** |
| `ac.test.mts` — base AC, touch, flat-footed | **Phase 6** |
| `saves.test.mts` — Fort/Ref/Will + ability mods | **Phase 6** |
| `skills.test.mts` — ranks, class skill +3, ACP | **Phase 6** |
| `bab.test.mts` — BAB by class/level, multi-class | **Phase 6** |
| `hp.test.mts` — HD, CON mod, min 1 | **Phase 6** |
| `actor-creation.test.mts` — actor lifecycle integration | **Phase 6** |
| `actor-with-items.test.mts` — actor + embedded items | **Phase 6** |
| `formula-evaluation.test.mts` — attack/damage formulas, context resolution | **Phase 7** (Roll Formulas) |
| `race.model.test.mts` — size, speed, ability adjustments | **Phase 8** (Races) |
| `class.model.test.mts` — classType, level, BAB, saves | **Phase 9** (Classes) |
| `feat-ae.test.mts` — Weapon Focus, Power Attack, Cleave trigger | **Phase 11** (Feats Alpha) |
| `initiative.test.mts` — initiative formula, sort order | **Phase 14** (Combat Tracker) |
| `condition-ae.test.mts` — Prone creation, stat changes, removal | **Phase 15** (Conditions Alpha) |
| Full-attack / Power Attack / Cleave / Trip / Turn-budget scenarios | **Phase 10+** (Action System / Combat) |
| POC E2E scenarios (character creation, combat encounter) | **Phase 14+** (Combat Tracker / E2E) |
