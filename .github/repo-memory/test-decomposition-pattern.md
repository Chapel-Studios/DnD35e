# Three-Layer Test Decomposition

**Verified**: April 2026 — designed for Secret AE testing in `poc.4` (Story 3) where the value-resolution path mixes pure logic, lightly-coupled helpers, and Foundry-internal masking machinery.

**Pattern**: When a feature surface is too entangled with framework internals to mock cleanly, split tests across three layers and pick the lowest tractable level for each behaviour.

| Layer | Scope | Coupling | Test type |
|-------|-------|----------|-----------|
| **A — pure helpers** | Logic that takes plain inputs and returns plain outputs | None — no Foundry, no DOM | Unit (Vitest, `node` env) |
| **B — narrow units** | Helpers that touch a small, mockable Foundry surface (a couple of field constructors, `Roll.safeEval`, `foundry.utils.getProperty`) | Small, stub in `tests/setup.mts` | Unit (Vitest, `node` env) |
| **C — round-trip** | Behaviour that depends on framework-internal machinery (e.g. `EmbeddedDataField._castChangeDelta`) | Full — would require reimplementing Foundry to mock | E2E (Playwright, real Foundry) |

**Pre-work — extract pure helper first**: if the logic is currently inside a mixin/class method (e.g. `IdentifiableItem._deriveIdentifiableState()`), extract a pure helper (`deriveIdentifiableState(effects)`) and make the method a one-line wrapper. This makes Layer A possible without mounting the document.

**When to use**:
- Active Effect change resolution
- Sheet view-mode masking
- Anything that walks Foundry's DataField hierarchy

**When NOT to use** (Layer C only is fine):
- Pure UI flows (drag-drop, dialog wizards) — just E2E them
- Schema definition — use schema inspection (see `createSchemaTester` factory in `tests/helpers/`), no instantiation needed

**Reference**: [docs/migration-plan/poc/phase-04-testing-infrastructure.md](../../docs/migration-plan/poc/phase-04-testing-infrastructure.md) §4.4 + Story 3 checklist.
