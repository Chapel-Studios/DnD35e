# Phase 4: Testing Infrastructure


**Status**: 📋 Planned

> **Milestone**: POC  
> **Dependencies**: Phase 1  
> **Goal**: Stand up the test runner, shared mocks, and coverage tooling, then back-fill tests for Phase 1–3 deliverables. Every subsequent phase owns its own tests — Phase 4 establishes the patterns and proves them out. Phase 4 also wires tests into the PR and release pipeline: PRs must pass tests, coverage must not regress, and the overall release flow is simplified.

---

## 4.1 Testing Framework

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Unit runner** | **Vitest** | Native Vite integration, first-class TypeScript + ESM, fast watch mode. D35E uses Jest — we follow the same runner choice but Vitest is the modern equivalent and fits our Vite build better. |
| **Test UI** | **`@vitest/ui`** | Browser-based test explorer (analogous to VS Test Explorer). One extra dev dep, zero config change. |
| **Vue component tests** | **`@vue/test-utils`** + **`happy-dom`** | Mount Vue components in tests without a browser. `happy-dom` is lighter than jsdom and sufficient for our component tests. Per-file opt-in via `// @vitest-environment happy-dom`. |
| **E2E runner** | **Playwright** (scaffolded in Phase 4, first test here) | Same choice as D35E (~90+ E2E files). Installed and configured now so it's not a cold start later. First real test covers Secret AE masking — tricky behaviour worth nailing down early. |
| **Coverage provider** | `v8` via Vitest | Zero-config for V8 coverage; no `.nycrc` needed. |
| **Mock strategy** | Stub Foundry globals in `tests/setup.mts`; `vi.fn()` mocks for specific call sites | Only stub what the test actually touches. Add more stubs as needed — don't pre-populate the whole Foundry surface. |

> **D35E reference**: D35E has only **4** unit-test files. Everything touching Foundry APIs goes straight to Playwright E2E. We follow the same pragmatic philosophy: **unit-test pure logic; stub/mock Foundry globals where unavoidable; prove real integration in E2E.**

> **POC/Alpha testing philosophy**: During POC and Alpha the system changes fast. Add tests for tricky, non-obvious behaviour — stacking rules, masking logic, permission cascades. Skip tests for obvious plumbing expected to grow. When skipping, add a `// TODO(test):` comment so gaps stay visible. This keeps overhead low without losing sight of what's untested.

## 4.2 Unit Test Targets (Phase 1–3 Backfill)

| Area | File | What to Test |
|------|------|--------------|
| **Bonus-type stacking engine** | `tests/unit/effects/stacking-engine.test.mts` | Same-type highest-wins, untyped always stacks, penalties always apply, mixed scenario, history tracking, dual-stack exclusion |
| **Secret AE masking** | `tests/unit/effects/secret-ae.test.mts` | MASK produces masked value, disable restores real value, priority ordering, `isIdentified` derivation, MASK excluded from stacking |
| **WeaponSystemModel schema** | `tests/unit/models/weapon.model.test.mts` | Field presence, defaults, crit range/multiplier validation. DataModel stub strategy decided explore-at-start (see §4.3). |
| **FormGroup permission cascade** | `tests/unit/components/FormGroup.test.mts` | `gmOnly` override → non-GM sees nothing; GM sees field. Owns the cascade — other FormGroup variants trust this. |
| **NumberFormGroup passthrough** | `tests/unit/components/NumberFormGroup.test.mts` | `#controls` slot renders; `editable` slot prop correctly reflects FormGroup result. Smoke test only — verifies wiring, not logic. |

**Material AE integration tests** (material bonus applies to weapon, masterwork flag, broken penalty) are deferred to **Phase 5** — they depend on compendium-sourced content and require more Foundry infrastructure than Phase 4 establishes.

> Tests for actors, feats, races, classes, formulas, combat, and conditions live in their owning phases (see §4.7).

## 4.3 DataModel Stub Strategy (Explore-at-Start)

WeaponSystemModel extends Foundry's `DataModel`. Two approaches:

| Option | Approach | When to use |
|--------|----------|-------------|
| **A — Full stub** | Mock `foundry.abstract.DataModel` with a minimal class that runs `defineSchema()` and populates fields. Lets validation and default tests work. | Default — attempt this first. |
| **B — Schema inspection** | Call `WeaponSystemModel.defineSchema()` and inspect field definitions directly, without instantiating. | Fallback if Option A proves too brittle. Document clearly; add `// TODO(test):` note that runtime validation is covered by E2E. |

The stub pattern established here becomes the template all future phases use for their own DataModel tests.

## 4.4 Integration and E2E Approach

Phase 4 establishes both Vitest integration patterns and the Playwright scaffold. The **first real E2E test** is written here — Secret AE masking — because it's tricky behaviour with a non-obvious failure mode that unit tests alone cannot fully prove.

All subsequent E2E tests are owned by the phase that builds the feature.

## 4.5 Test Organization

```
tests/
├── unit/
│   ├── models/        — DataModel schema tests (weapon for now)
│   ├── effects/       — stacking engine, Secret AE masking
│   └── components/    — Vue component tests (happy-dom environment)
│       └── setup.ts   — shared mock store factories
├── e2e/               — Playwright tests (run against live Foundry)
│   └── secret-ae.spec.ts
└── setup.mts          — shared Foundry global stubs (game, foundry.utils, CONFIG)
```

Other directories (`tests/unit/preparation/`, etc.) are created by the phases that need them.

## 4.6 Test Conventions

- **Each phase owns its tests.** When a phase adds a data model, prep method, or AE type, it adds the corresponding `.test.mts` file.
- Unit test naming: `<subject>.test.mts` (e.g. `stacking-engine.test.mts`). E2E naming: `<subject>.spec.ts`.
- Shared Foundry stubs live in `tests/setup.mts`. Shared Vue component mock factories live in `tests/unit/components/setup.ts`. Phase-specific fixtures go next to the test file.
- Vue component test files declare `// @vitest-environment happy-dom` at the top. All other test files use the default `node` environment.
- Tests run via `npm test` (watch) and `npm run test:ci` (single-run + coverage). E2E runs via `npx playwright test`.
- `npm run test:ui` opens the Vitest browser UI (analogous to VS Test Explorer).
- Target coverage for **complex logic and decision-making code** — stacking rules, masking, derivation formulas, permission cascades. No blanket percentage thresholds.
- When skipping a test because it's expected to change or isn't a concern yet, add a `// TODO(test):` comment explaining what should be tested once the design stabilises.

## 4.7 Files to Create/Modify

| Action | Path | Notes |
|--------|------|-------|
| Modify | `package.json` | Add `test`, `test:ci`, `test:ui`, `coverage` scripts; add `vitest`, `@vitest/coverage-v8`, `@vitest/ui`, `@vue/test-utils`, `happy-dom`, `@playwright/test` devDependencies |
| Modify | `vite.config.ts` | Add `test` block: `environment: 'node'`, `include: ['tests/**/*.test.mts']`, `setupFiles: ['tests/setup.mts']` |
| Create | `playwright.config.ts` | Basic Playwright config pointing at live Foundry instance |
| Create | `tests/setup.mts` | Foundry global stubs: `game`, `foundry.utils`, `foundry.abstract.DataModel` (minimal), `CONFIG` |
| Create | `tests/unit/effects/stacking-engine.test.mts` | Full stacking-rule coverage (7 cases) |
| Create | `tests/unit/effects/secret-ae.test.mts` | Secret AE unit cases (5 cases) |
| Create | `tests/unit/models/weapon.model.test.mts` | Schema, defaults, validation |
| Create | `tests/unit/components/setup.ts` | `createMockDocumentStore()` + `createMockRenderModeStore()` factories |
| Create | `tests/unit/components/FormGroup.test.mts` | Permission cascade test (`// @vitest-environment happy-dom`) |
| Create | `tests/unit/components/NumberFormGroup.test.mts` | Passthrough smoke test (`// @vitest-environment happy-dom`) |
| Create | `tests/e2e/secret-ae.spec.ts` | First Playwright E2E: Secret AE masking round-trip |
| Create | `.github/workflows/test.yml` | PR gate: runs `npm run test:ci` on every PR to `dev`+ |
| Modify | `.github/workflows/build.yml` | Add `npm run test:ci` step before build so tags cannot be cut on broken code |

---

## Completion Checklist

### ✅ Complete
_(None — Phase 4 has not started)_

### ❌ Not Started

**Story 1 — Test Infrastructure Setup**
- [ ] Install devDependencies: `vitest`, `@vitest/coverage-v8`, `@vitest/ui`, `@vue/test-utils`, `happy-dom`, `@playwright/test`
- [ ] Add `test` block to `vite.config.ts`: `environment: 'node'`, `include: ['tests/**/*.test.mts']`, `setupFiles: ['tests/setup.mts']`
- [ ] Add scripts to `package.json`: `"test": "vitest"`, `"test:ci": "vitest run"`, `"test:ui": "vitest --ui"`, `"coverage": "vitest run --coverage"`
- [ ] Create `tests/setup.mts` with placeholder; trivial `describe/it` block passes
- [ ] Create `playwright.config.ts`; create `tests/e2e/` directory; run `npx playwright install`
- [ ] Verify: `npm test` starts Vitest watch; `npm run test:ui` opens browser UI; `npx playwright test` runs (0 tests, exits 0)

**Story 2 — Stacking Engine Tests (`tests/unit/effects/stacking-engine.test.mts`)**
- [ ] Same-type bonus: highest value wins; lower value recorded in history as ignored with reason
- [ ] Untyped bonus: all instances stack (sum)
- [ ] Penalty: all penalties apply regardless of bonus type on same field
- [ ] Mixed scenario: multiple bonus types + penalty on same field → correct final totals
- [ ] History tracking: every change has an entry with `applied: true/false` and rejection reason when ignored
- [ ] `excludeEffectIds` dual-stack: same field resolves differently when an effect is excluded

**Story 3 — Secret AE Tests**

*Explore-at-start*: Before writing tests, identify the testable unit — is masking logic in a pure helper or entangled with `Document`? This informs which stubs are needed.

- [ ] Populate `tests/setup.mts` with minimal `game` stub (`user.isGM`, `i18n.localize()` passthrough) and `foundry.utils` stub (`getProperty`, `mergeObject`)
- [ ] Unit (`tests/unit/effects/secret-ae.test.mts`): MASK change on field → masked value returned; underlying data unchanged
- [ ] Unit: Disable Secret AE → real value returned
- [ ] Unit: Multiple Secrets with different priorities → highest-priority mask wins per field
- [ ] Unit: `isIdentified` derivation — no active Secrets → `true`; active Secret present → `false`
- [ ] Unit: MASK changes excluded from stacking engine (not treated as bonuses, not resolved by `resolveActiveEffectChanges`)
- [ ] E2E (`tests/e2e/secret-ae.spec.ts`): GM creates weapon with Secret AE masking name → player sees masked name; GM disables Secret → player sees real name; GM view toggle works correctly

**Story 4 — WeaponSystemModel Schema Tests (`tests/unit/models/weapon.model.test.mts`)**

*Explore-at-start*: Attempt Option A (full `DataModel` stub). If too brittle, fall back to Option B (schema inspection via `defineSchema()` without instantiation). Document chosen approach with inline comments.

- [ ] Populate `tests/setup.mts` with DataModel stub (or document fallback approach)
- [ ] Schema defines all expected top-level fields
- [ ] Default values apply correctly on construction (or via `defineSchema()` inspection)
- [ ] Critical range validation: accepts 20, rejects 25
- [ ] Critical multiplier validation: accepts 2, rejects 0
- [ ] Material sub-schema (`weaponDamage`) attaches without error

**Story 5 — Vue Component Tests**
- [ ] Create `tests/unit/components/setup.ts` with `createMockDocumentStore()` and `createMockRenderModeStore()` factories (only properties the tested components actually touch)
- [ ] `FormGroup` permission cascade (`tests/unit/components/FormGroup.test.mts`, `// @vitest-environment happy-dom`): given `getFieldOverride` returns `gmOnly` visibility, non-GM user does not see the field; GM does
- [ ] `NumberFormGroup` passthrough smoke test (`tests/unit/components/NumberFormGroup.test.mts`, `// @vitest-environment happy-dom`): `#controls` slot content renders; `editable` scoped slot prop reflects the FormGroup override result

**Story 6 — CI/CD Pipeline & PR Gates**

- [ ] Create `.github/workflows/test.yml`: triggers on `pull_request` to `dev` and `main`; runs `npm ci` → `npm run test:ci`
- [ ] Configure branch protection on `dev`: require `test.yml` status check to pass before merge; require at least 1 approving review
- [ ] Configure branch protection on `main`: same requirements as `dev`
- [ ] Update `build.yml`: confirm tag-triggered build still works correctly; add `npm run test:ci` step before build so release tags cannot be cut on broken code
- [ ] After all Phase 4 tests pass: run `npm run coverage`, record baseline numbers, set `test.coverage.thresholds` in `vite.config.ts` slightly below baseline, commit
- [ ] Verify: open a draft PR to `dev` → `test.yml` status check appears and runs; failing test blocks merge; passing test allows merge
- [ ] Verify: intentionally drop coverage below threshold → CI fails with coverage error
- [ ] Verify: push a `v*.*.*` tag → `build.yml` runs tests, then builds and creates GitHub Release

---

## 4.9 CI/CD Integration

### PR Gate

Every PR targeting `dev` (or any protected branch) must pass the full unit test suite before merge. This is a GitHub Actions status check — not advisory.

**New workflow**: `.github/workflows/test.yml`
- Triggers on: `pull_request` (to `dev` and above)
- Steps: install → lint + typecheck (existing `prebuild`) → `npm run test:ci`
- Branch protection rule: require this status check to pass before merging

### Release Pipeline & Branching Strategy

**Decided branching model**: `feature/*` → `dev` → `main` → `release/*` → Foundry publish

| Branch | Purpose |
|--------|---------|
| `feature/*` | All development work. Branched from `dev`, merged back via PR. |
| `dev` | Integration branch. All features land here first. Acts as staging — power users who want bleeding-edge builds pull from here. Tests must pass before any PR merges. |
| `main` | Pre-release staging. When `dev` is stable, a PR from `dev` → `main` promotes it. Power users can download from here before Foundry publish. Tests must pass. |
| `release/*` | Tagged release branch cut from `main`. Published to Foundry package repository. Read-only after publish. |

**No RC branches.**

**Hotfix branches: not yet exercised.** When `dev` contains unreleased work and a critical bug must ship immediately, a `hotfix/*` branch off `main` (bypassing `dev`) is the right tool — with a mandatory backport PR to `dev` afterward. The scenario table and PR targets are defined in `docs/branching-strategy.md` §5. This path has not been used yet because we have not cut a real release.

**Dev → main promotion**: PR-gated; tests must pass. Can be auto-merged by CI if all checks are green — decision deferred until we have enough release cadence to know whether manual review adds value at this step.

**Release tagging**: A tag on `main` triggers `build.yml`, which builds, zips, and creates a GitHub Release. The tag is the canonical version marker — no separate read-only RC branches needed.

> Full branching strategy reference: `docs/branching-strategy.md`

### Coverage Monitoring

**Decision**: Vitest built-in thresholds — fail CI if coverage drops below the floor.

**Threshold-setting approach**: Thresholds are not set until after Phase 4 tests are written. After the test suite is complete, run `npm run coverage`, record the output, and commit thresholds set slightly below those numbers as the baseline. This prevents the thresholds from failing on day one while still catching future regressions.

**Config location**: `vite.config.ts` under `test.coverage.thresholds`. Example shape (numbers filled in after Phase 4 baseline run):

```ts
coverage: {
  provider: 'v8',
  thresholds: {
    lines: 0,      // fill in after baseline run
    functions: 0,
    branches: 0,
  }
}
```

Once set, any PR that drops a metric below its floor will fail the `test.yml` CI check.

---

## 4.8 Tests Relocated to Owning Phases

The following test areas were originally drafted here but belong to the phase that builds the feature. Each phase should include a **Tests** section in its checklist.

| Test area | Destination phase |
|-----------|------------------|
| `material-ae.test.mts` — bonus applies to weapon, masterwork flag, broken penalty | **Phase 5** (Compendium Foundation) — depends on compendium-sourced content |
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
| Expanded E2E scenarios (character creation, combat encounter) | Phase that builds the feature — E2E scaffold is in place from Phase 4 |
