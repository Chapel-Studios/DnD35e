# Phase 8: Testing Infrastructure

> **Status**: Not started  
> **Dependencies**: Phase 4  
> **Goal**: Establish a testing strategy and infrastructure that can be used to validate all subsequent phases. Covers unit tests for data models and preparation logic, and integration tests for document lifecycle.

---

## 8.1 Testing Framework

- Use Vitest (already configured via `vite.config.ts`)
- Test runner integrated with the build pipeline
- Coverage reporting for data model and preparation logic

## 8.2 Unit Test Targets

Priority areas for unit testing:

| Area | What to Test |
|------|-------------|
| **Data models** | Schema validation, default values, field types |
| **prepareDerivedData()** | Ability modifiers, AC calculation, save totals, encumbrance |
| **Active Effect application** | Change application, phase ordering, target routing (actor vs item) |
| **Bonus type stacking** | Same-type highest-only, dodge/untyped always stack, penalties always apply |
| **Formula evaluation** | Roll data assembly, formula resolution, error handling |
| **Component chain** | Mixin composition, schema merging, preparation ordering |

## 8.3 Integration Test Approach

For tests that need Foundry document lifecycle:

- Mock Foundry's document classes at the minimal level needed
- Test item creation → data prep → effect application → derived values
- Test actor + embedded items → full preparation cycle

## 8.4 Test Organization

```
tests/
├── unit/
│   ├── models/        — DataModel schema tests
│   ├── preparation/   — prepareDerivedData logic
│   ├── effects/       — AE application and stacking
│   └── helpers/       — utility function tests
├── integration/
│   ├── actors/        — actor lifecycle tests
│   └── items/         — item lifecycle tests
└── setup.mts          — shared mocks and test utilities
```

## 8.5 Test Conventions

- Each new data model gets a corresponding `.test.mts` file
- Each `prepareDerivedData()` method gets preparation tests
- Each new AE type gets stacking/application tests
- Tests run in CI and as a pre-commit check

## 8.6 Files to Create/Modify

| Action | Path |
|--------|------|
| Verify | `vitest` configuration in `vite.config.ts` |
| Create | `tests/setup.mts` — shared mocks and test utilities |
| Create | `tests/unit/models/` — initial data model tests for weapon, actor |
| Create | `tests/unit/preparation/` — ability score derivation tests |
| Create | `tests/unit/effects/` — AE application tests |
| Modify | `package.json` — test scripts if not present |
