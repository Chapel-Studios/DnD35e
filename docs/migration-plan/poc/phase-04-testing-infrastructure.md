# Phase 4: Testing Infrastructure


**Status**: 🔶 In Progress

> **Milestone**: POC
> **Dependencies**: poc.1, poc.2, poc.3 (backfill targets — Story 1 infrastructure setup can start as soon as poc.1 is complete; Stories 2–6 gate on the relevant backfill phase being far enough along that its surface is stable)
> **Goal**: Stand up the test runner, shared mocks, and coverage tooling, then back-fill tests for poc.1–poc.3 deliverables. Every subsequent phase owns its own tests — Phase 4 establishes the patterns and proves them out. CI/CD pipeline integration lives in **poc.8 (Pipeline & Branching)**; Phase 4's only obligation to the pipeline is that `npm run test` and `npm run test:ci` exit 0 cleanly so poc.8 can hook them into `test.yml` and `build.yml`.

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
| **Bonus-type stacking engine** | `tests/unit/effects/stacking-engine.test.mts` | Highest-wins, untyped stacks, penalties, dual-stack exclusion, per-field independence, untyped + named coexistence, empty input, numeric edge cases, MASK changes not stacked |
| **Identifiable derivation** | `tests/unit/effects/identifiable-state.test.mts` | `deriveIdentifiableState(effects)` pure helper (extracted from `IdentifiableItem._deriveIdentifiableState`) — `isIdentifiable` / `isIdentified` from secret AE state |
| **Secret AE value resolution** | `tests/unit/effects/secret-ae.test.mts` | `resolveActiveEffectChangeValue` numeric / boolean / string coercion; `getEffectContexts` item-vs-actor target selection |
| **WeaponSystemModel schema** | `tests/unit/models/weapon.model.test.mts` | Field presence, declared defaults, validator presence, sub-schema wiring — via the `createSchemaTester(Model)` factory in `tests/helpers/schemaTester.mts` (see §4.3) |
| **Schema-tester factory** | `tests/unit/helpers/schemaTester.test.mts` | Factory itself — walks a synthetic schema; covers `fieldKeys`, `field`, `assertField`, `assertFieldType`, `assertDefault` |
| **Field-override cascade** | `tests/unit/sheets/field-override-cascade.test.mts` | Most-restrictive-wins merge across the ancestor chain; visibility and editability merge independently per property |
| **FormGroup smoke** | `tests/unit/components/FormGroup.test.mts` | `gmOnly` override → non-GM sees nothing; GM sees field. Wiring-only — cascade logic is covered separately. |
| **NumberFormGroup passthrough** | `tests/unit/components/NumberFormGroup.test.mts` | `#controls` slot renders; `editable` slot prop correctly reflects FormGroup result. Smoke test only. |

**Material AE integration tests** (material bonus applies to weapon, masterwork flag, broken penalty) are deferred to **poc.5** — they depend on compendium-sourced content and require more Foundry infrastructure than Phase 4 establishes.

> Tests for actors, feats, races, classes, formulas, combat, and conditions live in their owning phases (see §4.7).

## 4.3 DataModel Schema Inspection — Reusable Test Factory

**Decided**: Schema inspection only. WeaponSystemModel tests call `WeaponSystemModel.defineSchema()` and inspect field definitions directly without instantiating. No `foundry.abstract.DataModel` instance is constructed.

Rationale: defining schema fields is pure logic that doesn't need a runtime DataModel. Runtime validation (defaults applied on construction, validators rejecting bad input) is verified by Playwright E2E tests against a real Foundry instance. Keeping the unit suite focused on schema shape avoids a fragile mock surface that would need to grow every time Foundry's DataModel changes.

### Reusable schema-tester factory

Many document types (Actor, Race, Class, Feat, Spell, Condition, …) will need the same kind of schema unit tests. Phase 4 builds a **factory** so each test is self-contained, parallel-safe, and consistent.

**Location**: `tests/helpers/schemaTester.mts`

**Shape** (illustrative — finalised during implementation):

```ts
interface SchemaTester<T extends typeof foundry.abstract.DataModel> {
  /** All top-level field keys. */
  fieldKeys (): string[];
  /** Returns the field at a dotted path, or undefined. */
  field (path: string): foundry.data.fields.DataField | undefined;
  /** Asserts a field exists. */
  assertField (path: string): foundry.data.fields.DataField;
  /** Asserts a field is an instance of a given Foundry field class. */
  assertFieldType (path: string, expected: new (...args: any[]) => foundry.data.fields.DataField): void;
  /** Asserts the declared `initial` value (or option-derived default) for a field. */
  assertDefault (path: string, expected: unknown): void;
  /** Asserts the field has a validator function attached. */
  assertHasValidator (path: string): void;
  /** Asserts the field allows the listed choices (for fields with `choices`). */
  assertChoices (path: string, expected: readonly unknown[]): void;
}

function createSchemaTester<T extends typeof foundry.abstract.DataModel> (Model: T): SchemaTester<T>;
```

**Why a factory and not a class with shared state**: each test file calls `createSchemaTester(Model)` to get its own walker over `Model.defineSchema()`. No module-level state, no cross-test pollution — safe to run all schema tests in parallel via Vitest's default worker pool.

**Reuse**: poc.6 (Actor), alpha.1 (Race), alpha.2 (Class), alpha.4 (Feat), alpha.10 (Spell), beta.4 (Consumables), etc. all import this helper. Each phase contributes its model-specific test file using `createSchemaTester(MyModel)`. No phase needs to re-derive how to inspect a Foundry schema.

**Open at-implementation**: confirm on Foundry v14 whether `field.options.initial` and validator presence are introspectable as currently assumed. If not, the factory's `assertDefault` / `assertHasValidator` either fall back to inspecting the export (when validator functions are exported and unit-testable directly) or are documented as E2E-only on a per-field basis. The factory shape stays the same; only the implementation behind those two methods may shift.

This is the template all future phases use for their DataModel unit tests.

## 4.4 E2E Approach

Phase 4 establishes the Playwright scaffold and lands the first two E2E specs. All subsequent E2E tests are owned by the phase that builds the feature, but they reuse the helpers and conventions defined here.

### Interaction pattern: programmatic setup, UI assertion

**Decided**. Tests use `page.evaluate(() => { /* call game.X.create(…) */ })` to set up state programmatically, and exercise the **UI** for assertions — visible text, rendered values, button enable/disable, mode-bar state. This matches D35E's pattern and keeps tests fast.

Exceptions: when a feature **is** the UI (creation dialog flow, drag-drop, sheet interactions), exercise it through the UI. Don't fake what you're testing.

### Test world: pristine snapshot per run

**Decided**. A known-good world lives at `tests/e2e/fixtures/test-world/` (committed to source). Before each Playwright run, the fixture is copied into a temp directory used as Foundry's data dir; after the run it's discarded. Hermetic, parallel-safe, easy to reset by deleting and rebuilding the fixture.

The fixture contains the bare minimum: a GM user, a player user, an empty scene. Per-test setup builds whatever else the test needs via `page.evaluate`.

### User session model: multi-context

Tests that need both GM and player perspectives (e.g. Secret AE) use Playwright's standard multi-context pattern: one `BrowserContext` per user, independent cookies, independent Foundry sessions. The `loginAs(context, role)` helper handles login flow.

### Reusable E2E helpers

Same factory contract as the unit helpers: parallel-safe, no module-level state. Located in `tests/e2e/helpers/`.

| Helper | Purpose |
|--------|---------|
| `loginAs(context, role)` | Logs the given browser context in as `'gm'` or `'player'`. Returns the authenticated `Page`. |
| `withTestWorld()` | Playwright fixture providing a clean world for the test (copies snapshot, sets up Foundry data dir, tears down after). |
| `createItem(page, type, data)` | Programmatic item creation via `page.evaluate(() => game.items.create(…))`. Returns the created item's UUID. |
| `createActiveEffect(page, parentUuid, data)` | Programmatic AE creation on a target document. |
| `evaluateInGame<T>(page, fn)` | Typed wrapper around `page.evaluate` that gives access to `game`, `CONFIG`, `foundry` with proper TypeScript types. |

New phases should add helpers here when they introduce a new pattern (e.g. `placeToken`, `rollAttack`) rather than duplicating it inline.

### Phase 4 E2E specs

**Two specs ship in Phase 4** to keep infrastructure failures distinguishable from feature failures:

1. `tests/e2e/smoke.spec.ts` — GM context logs in, sees the world UI; player context logs in, sees the player view. Pure infrastructure check: if this fails, no other E2E result is meaningful.
2. `tests/e2e/secret-ae.spec.ts` — the actual masking round-trip. Depends on smoke passing.

### CI integration (decided in poc.8)

E2E does **not** run on every PR — too slow, requires Foundry license on the runner. Instead:

- **Nightly scheduled run against `dev`** on a self-hosted runner with Foundry license. Catches drift early without blocking developer flow.
- **Dev → main promotion PR** runs the full E2E suite as a required check. No promotion to `main` on broken E2E.
- **Release tag (`build.yml`)** runs E2E before cutting the GitHub Release. No bad release ships.

Local devs run `npm run test:e2e` on demand. Detailed workflow files live in [poc.8](phase-08-pipeline-and-branching.md).

## 4.5 Test Organization

```
tests/
├── helpers/           — reusable unit test factories (parallel-safe, no shared state)
│   └── schemaTester.mts — createSchemaTester(Model) for any DataModel
├── unit/
│   ├── helpers/        — tests for the test helpers themselves
│   ├── models/         — DataModel schema tests (weapon for now)
│   ├── effects/        — stacking engine, identifiable derivation, secret-AE value resolution
│   ├── sheets/         — sheet-level pure logic (field-override cascade)
│   └── components/     — Vue component tests (happy-dom environment)
│       └── setup.ts    — mock store factories
├── e2e/               — Playwright tests (run against live Foundry)
│   ├── helpers/        — loginAs, withTestWorld, createItem, createActiveEffect, evaluateInGame
│   ├── fixtures/
│   │   └── test-world/ — committed pristine world snapshot (GM user, player user, empty scene)
│   ├── smoke.spec.ts
│   ├── secret-ae.spec.ts
│   ├── formula-familiar-weapon-name.spec.ts
│   ├── material-details-changes-tab.spec.ts
│   ├── material-aspect-picker.spec.ts
│   ├── material-single-per-type.spec.ts
│   └── field-permissions.spec.ts
└── setup.mts          — shared Foundry global stubs (game, foundry.utils, CONFIG)
```

Reusable factories follow the same contract on both sides: `createXTester(input)` for unit, `withX(…)` / `xHelper(…)` for E2E — self-contained, no module-level state, parallel-safe.

## 4.6 Test Conventions

- **Each phase owns its tests.** When a phase adds a data model, prep method, or AE type, it adds the corresponding `.test.mts` file.
- Unit test naming: `<subject>.test.mts` (e.g. `stacking-engine.test.mts`). E2E naming: `<subject>.spec.ts`.
- Shared Foundry stubs live in `tests/setup.mts`. Shared Vue component mock factories live in `tests/unit/components/setup.ts`. Phase-specific fixtures go next to the test file.
- Vue component test files declare `// @vitest-environment happy-dom` at the top. All other test files use the default `node` environment.
- Tests run via `npm test` (watch) and `npm run test:ci` (single-run + coverage). E2E runs via `npm run test:e2e` (which calls `npx playwright test`).
- `npm run test:ui` opens the Vitest browser UI (analogous to VS Test Explorer).
- Target coverage for **complex logic and decision-making code** — stacking rules, masking, derivation formulas, permission cascades. No blanket percentage thresholds.
- When skipping a test because it's expected to change or isn't a concern yet, add a `// TODO(test):` comment explaining what should be tested once the design stabilises.

## 4.7 Files to Create/Modify

| Action | Path | Notes |
|--------|------|-------|
| Modify | `package.json` | Add `test`, `test:ci`, `test:ui`, `test:e2e`, `coverage` scripts; add `vitest`, `@vitest/coverage-v8`, `@vitest/ui`, `@vue/test-utils`, `happy-dom`, `@playwright/test` devDependencies |
| Modify | `vite.config.ts` | Add `test` block: `environment: 'node'`, `include: ['tests/**/*.test.mts']`, `setupFiles: ['tests/setup.mts']` |
| Create | `playwright.config.ts` | Playwright config: `tests/e2e/**`, multi-context support, `webServer` (or fixture) launching Foundry against the snapshot world |
| Create | `tests/e2e/fixtures/test-world/` | Committed pristine world snapshot (GM user, player user, empty scene). README documents how to rebuild. |
| Create | `tests/e2e/helpers/loginAs.mts` | `loginAs(context, role: 'gm' \| 'player')` |
| Create | `tests/e2e/helpers/withTestWorld.mts` | Playwright fixture: copy snapshot → launch Foundry → teardown |
| Create | `tests/e2e/helpers/createItem.mts` | Programmatic item creation via `page.evaluate` |
| Create | `tests/e2e/helpers/createActiveEffect.mts` | Programmatic AE creation via `page.evaluate` |
| Create | `tests/e2e/helpers/evaluateInGame.mts` | Typed `page.evaluate` wrapper exposing `game`, `CONFIG`, `foundry` |
| Create | `tests/e2e/smoke.spec.ts` | Smoke: GM context logs in, player context logs in, both reach the world |
| Create | `tests/e2e/secret-ae.spec.ts` | Secret AE masking round-trip (multi-context) |
| Create | `tests/e2e/formula-familiar-weapon-name.spec.ts` | FormulaFamiliar in weapon name field: dropdown opens, suggested contexts are correct, evaluated name reflects in sheet title (Story 6) |
| Create | `tests/e2e/material-details-changes-tab.spec.ts` | Material AE: properties added in Details tab appear correctly in Changes tab (Story 6) |
| Create | `tests/e2e/material-aspect-picker.spec.ts` | Material aspect picker behaviour with a parent material and without (Story 6) |
| Create | `tests/e2e/material-single-per-type.spec.ts` | `ENFORCE_SINGLE_MATERIAL` setting blocks duplicate STANDARD materials on a weapon (Story 6 — see scope note) |
| Create | `tests/e2e/field-permissions.spec.ts` | Single end-to-end example of field visibility / editability override applied by GM and observed by player; depth covered in Story 5 unit tests (Story 6) |
| Create | `tests/setup.mts` | Foundry global stubs: `game` (`user.isGM`, `i18n.localize()` passthrough), `foundry.utils` (`getProperty`, `mergeObject`), `Roll.safeEval`, constructor-only stubs for `foundry.data.fields.*` (`NumberField`, `BooleanField`, `StringField`, `HTMLField`, `EmbeddedDataField`, `SchemaField`, `ArrayField`, `ObjectField`), `foundry.abstract.{DataModel,TypeDataModel}`, `foundry.documents.Item`, and `foundry.applications.{api,sheets}` constructors. Constructor-only — schema tests still use inspection (see §4.3); the abstract/applications stubs only prevent module-load failures from transitive imports. |
| Create | `tests/helpers/schemaTester.mts` | `createSchemaTester(Model)` factory — reusable across all DataModel schema tests |
| Create | `tests/unit/helpers/schemaTester.test.mts` | Tests for the factory itself (synthetic schema) |
| Create | `tests/unit/effects/stacking-engine.test.mts` | Stacking-rule coverage (extended cases — see Story 2 checklist) |
| Create | `tests/unit/effects/identifiable-state.test.mts` | `deriveIdentifiableState(effects)` pure helper |
| Create | `tests/unit/effects/secret-ae.test.mts` | `resolveActiveEffectChangeValue` + `getEffectContexts` units |
| Create | `tests/unit/models/weapon.model.test.mts` | Weapon schema via `createSchemaTester(WeaponSystemModel)` |
| Create | `tests/unit/sheets/field-override-cascade.test.mts` | Most-restrictive-wins merge function |
| Create | `tests/unit/components/setup.ts` | `createMockDocumentStore()` + `createMockRenderModeStore()` factories |
| Create | `tests/unit/components/FormGroup.test.mts` | Permission cascade smoke test (`// @vitest-environment happy-dom`) |
| Create | `tests/unit/components/NumberFormGroup.test.mts` | Passthrough smoke test (`// @vitest-environment happy-dom`) |
| Modify | `src/entities/components/Identifiable/IdentifiableItem.mts` | Extract `deriveIdentifiableState(effects)` pure helper; `_deriveIdentifiableState()` becomes a one-liner that calls it (Story 3 prep refactor) |

> CI workflow files (`test.yml`, `build.yml` updates, nightly E2E, promotion E2E) and branch protection are owned by **poc.8 (Pipeline & Branching)**. Phase 4's contribution is making `npm run test`, `npm run test:ci`, and `npm run test:e2e` exit 0 cleanly so poc.8 can wire them in.

---

## 4.8 Tests Relocated to Owning Phases

The following test areas were originally drafted here but belong to the phase that builds the feature. Each phase should include a **Tests** section in its checklist.

| Test area | Destination phase |
|-----------|------------------|
| `material-ae.test.mts` — bonus applies to weapon, masterwork flag, broken penalty | **poc.5** (Compendium Foundation) — depends on compendium-sourced content |
| `actor.model.test.mts` — schema, defaults, AC=10 | **poc.6** (Actor Foundation) |
| `abilities.test.mts` — ability mods, size modifiers | **poc.6** |
| `ac.test.mts` — base AC, touch, flat-footed | **poc.6** |
| `saves.test.mts` — Fort/Ref/Will + ability mods | **poc.6** |
| `skills.test.mts` — ranks, class skill +3, ACP | **poc.6** |
| `bab.test.mts` — BAB by class/level, multi-class | **poc.6** |
| `hp.test.mts` — HD, CON mod, min 1 | **poc.6** |
| `actor-creation.test.mts` — actor lifecycle integration | **poc.6** |
| `actor-with-items.test.mts` — actor + embedded items | **poc.6** |
| `formula-evaluation.test.mts` — attack/damage formulas, context resolution | **poc.7** (Roll Formulas) |
| `race.model.test.mts` — size, speed, ability adjustments | **alpha.1** (Races & Progression) |
| `class.model.test.mts` — classType, level, BAB, saves | **alpha.2** (Classes & Level History) |
| `feat-ae.test.mts` — Weapon Focus, Power Attack, Cleave trigger | **alpha.4** (Feats) |
| `initiative.test.mts` — initiative formula, sort order | **alpha.7** (Combat Tracker) |
| `condition-ae.test.mts` — Prone creation, stat changes, removal | **alpha.8** (Conditions) |
| Full-attack / Power Attack / Cleave / Trip / Turn-budget scenarios | **alpha.3+** (Action System / Combat) |
| Expanded E2E scenarios (character creation, combat encounter) | Phase that builds the feature — E2E scaffold is in place from Phase 4 |

---

## Skill Routing

| Story | Routing | Notes |
|-------|---------|-------|
| 1 — Test infrastructure setup | Lead dev | First-time tooling setup; sets patterns reused everywhere |
| 2 — Stacking engine tests | Lead dev | Stacking rules are tricky; lead dev wrote them |
| 3 — Secret AE & Identifiable | Lead dev | Includes a small refactor (extract `deriveIdentifiableState`); masking semantics are non-obvious; first Playwright E2E |
| 4 — Schema-tester factory + Weapon schema | Lead dev (factory) + Flexible (Weapon tests) | Factory is reusable across all future doc-type phases; pair the factory build with one consumer to validate ergonomics |
| 5 — Field-override cascade + Vue smoke tests | Pair (Lead + Flexible) | Cascade merge is logic-heavy; component smoke tests are wiring-only |
| 6 — E2E backfill for poc.1 & poc.2 features | Pair (Lead + Flexible) per spec | Each spec exercises a real feature surface (FormulaFamiliar, Material AE, field permissions). Lead pairs on the first spec to lock the pattern; remaining specs are flexible. Depends on Story 1 (E2E infra) + Story 3 Layer C helpers being in place. |

Stories 2–5 are independent after Story 1 completes — a small team can run them in parallel. Story 6 picks up once Story 3 Layer C has wired the real E2E helpers.

---

## Completion Checklist

### ✅ Complete

**Story 1 — Test Infrastructure Setup** (committed `0524f110`)
- [x] Install devDependencies: `vitest`, `@vitest/coverage-v8`, `@vitest/ui`, `@vue/test-utils`, `happy-dom`, `@playwright/test`, `@pinia/testing`, `pinia`
- [x] Add `vitest.config.ts` (separate from `vite.config.ts`): `environment: 'node'`, `include: ['tests/unit/**/*.test.mts']`, `setupFiles: ['tests/setup.mts']`, v8 coverage provider
- [x] Add scripts to `package.json`: `test`, `test:ci`, `test:ui`, `test:e2e`, `coverage`
- [x] Create `tests/setup.mts` with Foundry global stubs (game, foundry.utils, foundry.data.fields.* constructors, Roll.safeEval)
- [x] Create `playwright.config.ts` reading license/paths from `local.config.json` (default port 31000 to avoid Foundry's default 30000); create `tests/e2e/`, `tests/e2e/helpers/`, `tests/e2e/fixtures/` directories; run `npx playwright install chromium`
- [x] `tests/e2e/fixtures/test-world/` placeholder + rebuild README (snapshot creation deferred to Story 3 Layer C)
- [x] E2E helper skeletons: `loginAs`, `withTestWorld`, `createItem`, `createActiveEffect`, `evaluateInGame` — throw a clear "owned by Story X" error until wired up
- [x] Verify: `npm run test:ci` exits 0 (2/2 sanity tests pass); `npm run test:e2e` exits 0 (1/1 runner sanity passes); `npm run build` clean
- [x] Update `local.config.json.example` with optional `foundryLicenseKey`, `foundryAppPath`, `foundryE2EDataDir`, `foundryE2EPort`

### ❌ Not Started

**Story 2 — Stacking Engine Tests (`tests/unit/effects/stacking-engine.test.mts`)**

Target: pure function `resolveActiveEffectChanges(changes, excludeEffectIds?)` in [src/helpers/stacking.mts](../../../src/helpers/stacking.mts). No Foundry globals required.

- [x] Same-type bonus: highest value wins; lower value recorded in history as ignored with reason
- [x] Untyped bonus: all instances stack (sum)
- [x] Penalty: all penalties apply regardless of bonus type on same field
- [x] Mixed scenario: multiple bonus types + penalty on same field → correct final totals
- [x] History tracking: every change has an entry with `applied: true/false` and rejection reason when ignored
- [x] `excludeEffectIds` dual-stack: same field resolves differently when an effect is excluded
- [x] **Per-field independence**: two changes to *different* fields with the same `bonusType` do not interfere
- [x] **Untyped + named on same field coexist**: untyped sums separately, named picks highest, both apply
- [x] **Empty input**: `resolveActiveEffectChanges([])` → empty `winners`, empty `history`
- [x] **`parseNumericChangeValue` edge cases** (covered via public function): string numbers (`"5"`, `" 3 "`) parse correctly; empty string and formula-like strings (`"1d6"`) are rejected from numeric stacking and surface in history with a rejection reason
- [x] **MASK changes are not stacked as bonuses** (was previously listed under Story 3): MASK-mode changes passed through the engine are not treated as bonuses on the field

> Skipped for now: `dodge` bonus type stacking is added in alpha.4 (Feats). `// TODO(test):` placeholder in the test file.

**Story 3 — Secret AE & Identifiable Tests**

The original "Secret AE" surface splits into three layers, each tested at the lowest tractable level. Document round-trip behaviour stays in the Playwright E2E.

*Pre-work — small refactor for testability*: extract the body of `IdentifiableItem._deriveIdentifiableState()` into a pure helper `deriveIdentifiableState(effects)` returning `{ isIdentifiable, isIdentified }`. The mixin method becomes a one-liner that calls the helper and assigns. Mirrors the pattern already used in `resolveChangeValue.mts`. Same approach should be used for any future "derive X from Y" mixin logic.

*Layer A — pure helpers (unit, no Foundry mounting)* ✅

- [x] Refactor: extract `deriveIdentifiableState(effects)` helper from [IdentifiableItem.mts](../../../src/entities/components/Identifiable/IdentifiableItem.mts) `_deriveIdentifiableState()`
- [x] Unit (`tests/unit/effects/identifiable-state.test.mts`): no secrets → `{ isIdentifiable: false, isIdentified: true }`
- [x] Unit: one disabled Secret AE → `{ isIdentifiable: true, isIdentified: true }`
- [x] Unit: one active Secret AE → `{ isIdentifiable: true, isIdentified: false }`
- [x] Unit: mixed (active + disabled) → `{ isIdentifiable: true, isIdentified: false }`
- [x] Unit: non-secret effects only → `{ isIdentifiable: false, isIdentified: true }`

*Layer B — narrow value-resolution units* ✅

Target: pure helpers in [resolveChangeValue.mts](../../../src/entities/activeEffects/BaseActiveEffect/resolveChangeValue.mts). Stubs for `Roll.safeEval`, `foundry.utils.getProperty`, `foundry.data.fields.{NumberField, BooleanField, StringField, EmbeddedDataField}` constructors live in `tests/setup.mts`. `@helpers/formulae` is mocked per-test so resolver coercion is exercised in isolation from formula evaluation correctness.

- [x] Unit (`tests/unit/effects/secret-ae.test.mts`): `resolveActiveEffectChangeValue` returns numeric values when target field is `NumberField` (numeric string, formula via `Roll.safeEval`, un-evaluable fallback)
- [x] Unit: returns booleans when target field is `BooleanField` and value is `'true'` / `'false'` (non-boolean string passthrough also covered)
- [x] Unit: returns string passthrough when target field is `StringField` / non-coercing branch
- [x] Unit: non-string `change.value` and orphan-effect (no contextMap) paths return raw value untouched
- [x] Unit: `getEffectContexts` selects `item` target when `change.target === ITEM`, `actor` target otherwise (bare item, item-on-actor, both target combinations)
- [x] Unit: `getEffectContexts` resolves `schemaField` via `system.constructor.schema._getField` when key starts with `system.`, undefined otherwise

*Layer B2 — masked value resolution units* ✅

Follow-up to Layer B covering [`resolveMaskedActiveEffectChangeValue`](../../../src/entities/activeEffects/BaseActiveEffect/resolveChangeValue.mts) — the mask-merge layer atop the basic AE value resolver. Uses per-test `EmbeddedDataField` subclasses with `vi.fn`-wired `_castChangeDelta` / `_applyChangeOverride` hooks; no new stubs in `tests/setup.mts`.

- [x] Unit (`tests/unit/effects/masked-ae.test.mts`): fallthrough — null targetDocument, undefined schemaField, non-EmbeddedDataField, EmbeddedDataField missing either AE hook → returns plain resolved value
- [x] Unit: happy path — full pipeline calls `_castChangeDelta(value, rollData)` then `_applyChangeOverride(current, delta, model, change)` and returns its output
- [x] Unit: `targetDocument` without `getRollData` → `replacementData` defaults to `{}`
- [x] Unit: current value read via `foundry.utils.getProperty` from nested system path
- [x] Unit: hooks throwing → catch swallows and falls back to plain resolved value

*Layer C — Playwright smoke + E2E (round-trip masking)*

The full mask round-trip across user contexts (GM identified view vs player masked view) is verified end-to-end against the committed test-world snapshot.

- [x] Smoke (`tests/e2e/smoke.spec.ts`): GM context logs in via `loginAs(gmContext, 'gm')` → sees world UI; player context logs in via `loginAs(playerContext, 'player')` → sees player view. (Pure infra check; isolates failures.)
- [x] E2E (`tests/e2e/secret-ae.spec.ts`): GM creates weapon via `createItem` → attaches Secret AE masking name via `createActiveEffect` → player context shows masked name; GM disables Secret → player context shows real name; GM view-mode toggle (`play` ↔ `true`) works correctly
- [x] E2E: multiple Secret AEs on the same field → highest-priority mask wins for the player view

> Setup support: populate `tests/setup.mts` with minimal `game` stub (`user.isGM`, `i18n.localize()` passthrough), `foundry.utils` stub (`getProperty`, `mergeObject`), and constructor-only stubs for the field classes the helpers test against (`NumberField`, `BooleanField`, `EmbeddedDataField`).

**Story 4 — WeaponSystemModel Schema Tests (`tests/unit/models/weapon.model.test.mts`)**

Uses the **reusable `createSchemaTester(Model)` factory** from `tests/helpers/schemaTester.mts` (see §4.3). Story 4 both proves out the factory and lands Weapon's schema tests; future phases reuse the factory unchanged.

- [x] Create `tests/helpers/schemaTester.mts` exporting `createSchemaTester(Model)` per the shape in §4.3
- [x] Unit (`tests/unit/helpers/schemaTester.test.mts`): tester correctly walks a small synthetic schema (use `new SchemaField({ a: new NumberField({ initial: 1 }), … })`) — covers `fieldKeys`, `field`, `assertField`, `assertFieldType`, `assertDefault`
- [x] Weapon schema declares all expected top-level fields (via `assertField`)
- [x] Weapon schema declared defaults match expected values (via `assertDefault`)
- [x] Weapon `criticalRange` and `criticalMultiplier` have validators attached (via `assertHasValidator`); if validator inspection isn't viable on Foundry v14 (see open question in §4.3), fall back to importing and unit-testing the validator function directly
- [x] Weapon `weaponDamage` sub-schema is wired in correctly (via `assertFieldType` against `EmbeddedDataField` or `SchemaField` as appropriate)

> **Note**: Per user direction, combat-related Weapon fields (damage formulas, crit semantics, attack resolution, range, ammo) are deferred to the combat phase. Eight `it.todo` placeholders remain in `weapon.model.test.mts` flagging the validator/semantic tests that combat phase will flesh out.

> **Source-file narrowing (incidental to Story 4)**: To run schema tests in the `node` environment, the `WeaponSystemModel` import chain had to stop pulling Vue/sheet UI. Three production imports were narrowed to data-only subpaths (no behaviour change; net win for tree-shaking too):
>
> - [`PhysicalItemSystemModel.mts`](../../../src/entities/items/components/Physical/data/PhysicalItemSystemModel.mts) — `ItemSystemModelBase` from `@items/baseItem/data/index.mjs` (not `@items/baseItem/index.mjs`); `IdentifiableSchemaMixin` from `@ec/Identifiable/data/index.mjs`; `PriceField` from `@settings/currency/PriceField.mjs`
> - [`WeaponSystemModel.mts`](../../../src/entities/items/weapon/data/WeaponSystemModel.mts) — `EquippableItemSystemModel` from `@items/components/Equippable/data/index.mjs`; weapon-type constants from sibling `./constants.mjs` (not the top-level barrel)
> - [`MaterialSystemModel.mts`](../../../src/entities/activeEffects/material/data/MaterialSystemModel.mts) — `PriceField` from `@settings/currency/PriceField.mjs`
>
> Future data-model files should follow the same rule: **import schema/data dependencies from `.../data/index.mjs` subpaths, never from a component's top-level barrel** (which re-exports Vue stores and sheet UI).

**Story 5 — Field Override Cascade & Vue Component Smoke Tests**

The field-override cascade (most-restrictive-wins merge across the ancestor chain) is the highest-value piece to unit test in this story. The component tests stay deliberately small.

- [x] Identify the cascade merge function in `useDocumentSheetStore` (or wherever `getFieldOverride` resolves) and, if needed, extract it into a pure helper `mergeFieldOverrides(overrides)` for testability — same refactor pattern as Story 3 Layer A
- [x] Unit (`tests/unit/sheets/field-override-cascade.test.mts`): no overrides → default `{ visibility: 'everyone', editability: 'normal' }`
- [x] Unit: parent `ownerPlus` + child `gmOnly` → `gmOnly` (more restrictive wins per property)
- [x] Unit: parent `gmOnly` editability + child `normal` editability → `gmOnly` (parent restriction propagates)
- [x] Unit: visibility and editability merge independently per property
- [x] Unit: deep ancestor chain (3+ levels) — most-restrictive across the whole chain wins
- [x] Create `tests/unit/components/setup.ts` with `createMockDocumentStore()` and `createMockRenderModeStore()` factories (only properties the tested components actually touch; factory shape parallels the schema-tester factory — self-contained, no shared state)
- [x] Smoke (`tests/unit/components/FormGroup.test.mts`, `// @vitest-environment happy-dom`): given `getFieldOverride` returns `gmOnly` visibility, non-GM user sees nothing; GM sees the field
- [x] Smoke (`tests/unit/components/NumberFormGroup.test.mts`, `// @vitest-environment happy-dom`): `#controls` slot content renders; `editable` scoped slot prop reflects the FormGroup override result

> **Refactor note (Story 5 cycle 1)**: The cascade was extracted into a new file [`cascadeFieldOverride.mts`](../../../src/entities/components/CoreMixin/sheet/stores/cascadeFieldOverride.mts) co-located with `FieldOverridesStore`. The store's `getFieldOverride` is now a one-liner calling `cascadeFieldOverride(path, key, resolveAtPath)`. The extracted helper takes a `ResolveAtPath` callback, so unit tests pass a synthetic table-driven resolver — no document, schema, or Vue reactivity needed. Same pattern as Story 3 Layer A's `deriveIdentifiableState` extraction.

> **Component test isolation (Story 5 cycle 2)**: Mounting any FormGroup variant transitively imports `@ec/CoreMixin/index.mjs` — a heavy barrel that pulls in document mixins, sheet stores, and Vue app classes that won't initialise cleanly under unit env stubs. Component tests `vi.mock` the CoreMixin barrel to expose only the two injection symbols (`DocumentSheetStoreSymbol`, `RenderModeStoreSymbol`) using `Symbol.for(...)` (the global registry). The `tests/unit/components/setup.ts` mock-store factories use the **same** registry keys so injected stores reach the components. `FieldControls` is replaced with a slot-rendering stub so `#controls` content survives. This isolation pattern is reusable for every future FormGroup variant test.

**Story 6 — E2E Backfill for poc.1 & poc.2 Features**

Beyond the Story 3 Layer C secret-AE round-trip, these specs cover real feature surfaces from poc.1 (FormulaFamiliar in document fields, field permissions) and poc.2 (Material AE Details/Changes tabs, aspect picker, single-material enforcement). Depends on Story 1 (E2E infra) and the helpers landed in Story 3.

> **Scope note — material single-per-type**: the spec corresponds to the **current** behaviour of `validateSingleMaterial`, which only blocks duplicate **STANDARD-subtype** materials when the `ENFORCE_SINGLE_MATERIAL` setting is enabled. It does **not** enforce "one of each material type". A broader "one per type" rule is out of scope for Phase 4 — if that becomes the desired behaviour, raise it as a feature change in the relevant content phase and update the spec.

- [ ] `tests/e2e/formula-familiar-weapon-name.spec.ts`: GM opens a weapon sheet → focuses the name field → triggers FormulaFamiliar dropdown → verify the suggested context list contains the expected item-scoped properties (e.g. `system.weaponDamage.*`) and excludes opt-out fields → select a context → verify the resolved name updates in the field, persists to the document, and shows in the sheet header / window title
- [ ] `tests/e2e/material-details-changes-tab.spec.ts`: GM creates a Material AE → on the Details tab, adds a property (e.g. damage bonus) via `createActiveEffect`-equivalent UI flow → switches to the Changes tab → verify the corresponding `change` row exists with the right key/value/mode and is in sync with the Details entry
- [ ] `tests/e2e/material-aspect-picker.spec.ts`: with no parent material → aspect picker shows the full base set; with a parent material assigned → aspect picker filters/derives from the parent. Verify both branches produce the expected available-aspect list and that selection persists.
- [ ] `tests/e2e/material-single-per-type.spec.ts`: with `ENFORCE_SINGLE_MATERIAL` setting **off**, two STANDARD materials can be added to a weapon; with the setting **on**, the second add is rejected and the first remains. Non-STANDARD subtypes are unaffected by the setting (positive control).
- [ ] `tests/e2e/field-permissions.spec.ts`: GM applies a `gmOnly` visibility override to one field on a weapon → player context sees the field hidden; GM applies a `gmOnly` editability override → player context sees the field but cannot edit it; GM removes the override → player context returns to default visibility/editability. One field is enough — Story 5 covers the merge logic exhaustively.

---

## Related

- [poc/phase-08-pipeline-and-branching.md](phase-08-pipeline-and-branching.md) — owns PR gate, branch protection, release pipeline, coverage thresholds
- [docs/branching-strategy.md](../../branching-strategy.md)

