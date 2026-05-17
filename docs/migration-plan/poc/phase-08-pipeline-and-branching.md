# Phase 8: Pipeline & Branching

**Status**: 🔶 In Progress

> **Milestone**: POC
> **Dependencies**: —
> **Goal**: Lock in the branching model, PR gates, and release pipeline so every subsequent phase ships through the same flow. Independent of the rest of POC — can run any time before POC closes — but the test runner from poc.4 plugs into the PR gate when it lands.

This phase formalises work tracked in [docs/prs/pipeline-and-branching.md](../../prs/pipeline-and-branching.md), which is currently in review. Phase status moves to ✅ Complete once that PR merges and branch protection is configured on `dev` and `main`.

---

## 8.1 Branching Model

**Decided**: `feature/*` → `dev` → `main` → `release/*` → Foundry publish

| Branch | Purpose |
|--------|---------|
| `feature/*` | All development work. Branched from `dev`, merged back via PR. |
| `dev` | Integration branch. All features land here first. Acts as staging — power users who want bleeding-edge builds pull from here. Tests must pass before any PR merges. |
| `main` | Pre-release staging. When `dev` is stable, a PR from `dev` → `main` promotes it. Power users can download from here before Foundry publish. Tests must pass. |
| `release/*` | Tagged release branch cut from `main`. Published to Foundry package repository. Read-only after publish. |
| `hotfix/*` | Off `main`, bypasses `dev`, with mandatory backport to `dev`. Not yet exercised. |

**No RC branches.** Tags on `main` are the canonical release marker.

Full reference: [docs/branching-strategy.md](../../branching-strategy.md).

## 8.2 PR Gate (`test.yml`)

A new workflow `.github/workflows/test.yml` runs on every PR targeting `dev` or `main`:

- Triggers: `pull_request` to `dev`, `main`
- Steps: `npm ci` → existing `prebuild` (lint + typecheck) → `npm run test:ci`
- Branch protection: `test.yml` is a required status check; one approving review required
- **Vitest only** \u2014 E2E does not run here (see \u00a78.4)

When poc.4 lands, `npm run test:ci` will execute the real test suite. Until then it should exit 0 cleanly (poc.4 includes a checklist item to confirm this).

## 8.3 Release Pipeline (`build.yml`)

`build.yml` is tag-driven (`v*.*.*` on `main`):

- Runs `npm run test:ci` before build so release tags cannot be cut on broken code
- Builds, zips, creates a GitHub Release
- Version validated against `package.json` (single source of truth)

`dev → main` promotion is PR-gated; auto-merge on green checks is deferred until release cadence is established.

## 8.4 E2E in CI

E2E tests do **not** run on every PR — they require a live Foundry instance with a license, which is not redistributable to GitHub-hosted runners. Instead, E2E runs in three places, all on a self-hosted runner that has the Foundry installer and license file available:

| When | Workflow | Trigger | Purpose |
|------|----------|---------|---------|
| **Nightly against `dev`** | `.github/workflows/e2e-nightly.yml` | `schedule: cron` (overnight, repo timezone) | Catch drift early on the integration branch |
| **Dev → main promotion** | `.github/workflows/e2e-promotion.yml` | `pull_request` to `main` | Required check; no promotion to `main` on broken E2E |
| **Release tag** | `build.yml` (existing) | `push` of `v*.*.*` tag | Final gate before release; no bad release ships |

**Self-hosted runner requirements** (one-time admin setup, tracked separately as ops):
- Linux host (or Windows if preferred)
- Foundry v14 installed at a known root path; runner sets `FOUNDRY_ROOT_PATH` env (consumed by `scripts/setup-e2e.mjs` in lieu of `local.config.json`)
- Node 20+, Playwright browsers installed (`npx playwright install`)
- Repo `runs-on` label set to identify the runner (e.g. `[self-hosted, foundry]`)

**License provisioning** (CI runs without a Foundry license at the default path):
- Store the contents of a signed `Config/license.json` (from any activated Foundry install) as a GitHub Actions secret named `E2E_LICENSE_JSON`
- `scripts/setup-e2e.mjs` writes it verbatim to the provisioned data dir — no network call to Foundry's license server
- Signed payloads are portable across machines; the same secret works for nightly, promotion, and release workflows
- Resolution order in the script: `E2E_LICENSE_JSON` env → `E2E_LICENSE_PATH`/`foundryLicenseFile` config → `<foundryRootPath>/Config/license.json` (local dev fallback)

**Test world snapshot**: committed under `tests/e2e/fixtures/test-world/`. `world.json` is generated from `world.json.template` (sibling of the world dir) by `scripts/build-test-world-json.mjs`, wired into `pretest:e2e`. CI does not need to rebuild the snapshot — it's pristine in the repo and copied into the runner's data dir each run.

**Local dev**: `npm run test:e2e` runs against the developer's local Foundry, configured via `local.config.json` (`foundryRootPath` canonical, `foundryDataPath`/`foundryLicenseFile` optional overrides). Same Playwright config as CI.

E2E test scaffold and helpers are owned by **poc.4**. This phase only wires them into CI.

## 8.5 Coverage Monitoring

## 8.5 Coverage Monitoring

Vitest built-in thresholds, configured in `vite.config.ts` under `test.coverage.thresholds`. Numbers are filled in **after poc.4 establishes the test suite** — run `npm run coverage`, record baseline, commit thresholds slightly below those numbers. Any PR that drops a metric below floor fails the `test.yml` check.

## 8.6 Phase ↔ Milestone ↔ Label Sync

`docs/migration-plan/phases.json` is the source of truth for the roadmap and drives:

- GitHub milestones (`scripts/sync-milestones.mjs`, run by `sync-phases.yml` on push to `dev`)
- `.github/labels.yml` phase section (`scripts/generate-labels.mjs`, run in `prebuild` and on push to `dev`; `sync-labels.yml` pushes labels to GitHub)

This replaces the legacy `version.yaml` / `update-version.yml` stack.

## 8.7 Files Involved

These files are created or modified in the in-flight PR. This section is a checklist mirror — see the PR for actual diffs.

| Action | Path | Notes |
|--------|------|-------|
| Create | `.github/workflows/test.yml` | PR gate (Vitest only — fast) |
| Create | `.github/workflows/e2e-nightly.yml` | Nightly E2E against `dev` (self-hosted) |
| Create | `.github/workflows/e2e-promotion.yml` | E2E gate on `dev → main` PRs (self-hosted) |
| Modify | `.github/workflows/build.yml` | Tag-driven; adds `npm run test:ci` step (Vitest) and `npm run test:e2e` step (self-hosted) |
| Create | `.github/workflows/sync-phases.yml` | Push-to-`dev` milestone + label sync |
| Create | `.github/workflows/sync-labels.yml` | Pushes `labels.yml` to GitHub |
| Modify | `.github/labels.yml` | Wave-organized; phase section auto-generated |
| Create | `docs/migration-plan/phases.json` | Roadmap source of truth |
| Create | `scripts/sync-milestones.mjs` | Milestone sync |
| Create | `scripts/generate-labels.mjs` | Label section regeneration |
| Delete | `version.yaml`, `scripts/update-version-yaml.mjs`, `.github/workflows/update-version.yml` | Replaced by the above |
| Modify | `docs/branching-strategy.md`, `docs/architecture/ci-cd-pipeline.md` | Describes what's in the repo |

---

## Skill Routing

| Story | Routing | Notes |
|-------|---------|-------|
| 1 — PR gate workflow | Lead dev | Branch protection setup is admin-gated |
| 2 — Release pipeline | Lead dev | Tag → Release flow needs verification on a throwaway tag |
| 3 — Phases.json sync | Flexible | Pattern-following once scripts exist |
| 4 — Coverage thresholds | Lead dev or pair | Runs after poc.4 |
| 5 — E2E CI workflows | Lead dev | Self-hosted runner setup + three workflows; depends on poc.4 helpers |

---

## Completion Checklist

### 🔶 In Progress
- [ ] PR `feature/branch_and_test_planning` → `dev` reviewed and merged
- [ ] Branch protection configured on `dev`: require `test.yml` + 1 approving review
- [ ] Branch protection configured on `main`: same as `dev`

### ❌ Not Started

**Story 1 — PR Gate**
- [ ] Verify: open a draft PR to `dev` → `test.yml` status check appears and runs
- [ ] Verify: failing test blocks merge; passing test allows merge

**Story 2 — Release Pipeline Verification**
- [ ] Push a throwaway `v0.0.0-test` tag → confirm `build.yml` runs tests, builds, creates Release
- [ ] Delete the test tag/release after verification

**Story 3 — Phases.json Sync**
- [ ] Verify: editing `phases.json` and pushing to `dev` triggers `sync-phases.yml`
- [ ] Verify: GitHub milestones reflect `phases.json` state
- [ ] Verify: `.github/labels.yml` regenerated correctly; `sync-labels.yml` pushes to GitHub

**Story 4 — Coverage Baseline (after poc.4)**
- [ ] Run `npm run coverage`, record baseline numbers
- [ ] Commit `test.coverage.thresholds` in `vite.config.ts` slightly below baseline
- [ ] Verify: intentionally drop coverage below threshold → CI fails with coverage error

**Story 5 — E2E CI Workflows (after poc.4)**

Depends on poc.4 shipping `npm run test:e2e` and the test-world fixture. Self-hosted runner setup is tracked as ops work; this story wires the workflows once the runner is available.

**Runner provisioning (ops, outside checklist)**
- [ ] Self-hosted runner registered with label `[self-hosted, foundry]`
- [ ] Foundry v14 installed at a known path; `FOUNDRY_ROOT_PATH` env exported for the runner user
- [ ] Node 20+, `npx playwright install` complete
- [ ] GitHub Actions secret `E2E_LICENSE_JSON` populated with a signed `license.json` payload (see §8.4)

**Workflows**
- [ ] Create `.github/workflows/e2e-nightly.yml`: scheduled nightly run on `dev`, `runs-on: [self-hosted, foundry]`; exports `E2E_LICENSE_JSON` from secrets; runs `npm ci && npm run test:e2e`; failure opens / updates a tracking issue
- [ ] Create `.github/workflows/e2e-promotion.yml`: triggers on `pull_request` to `main`; self-hosted; same env wiring; required status check
- [ ] Update `.github/workflows/build.yml`: add `npm run test:e2e` step on the self-hosted runner (same env wiring) before zip/release
- [ ] Confirm all three workflows export `FOUNDRY_ROOT_PATH` (from runner env) and `E2E_LICENSE_JSON` (from secrets) to the test step — `scripts/setup-e2e.mjs` is the single consumer
- [ ] Configure branch protection on `main`: require `e2e-promotion.yml` status check

**Verification**
- [ ] Verify: open a `dev` → `main` PR → `e2e-promotion.yml` runs; failing E2E blocks merge
- [ ] Verify: nightly cron runs against latest `dev`; failing run produces a visible signal
- [ ] Verify: tag-triggered `build.yml` runs E2E and blocks release on failure
- [ ] Verify: license resolution works end-to-end on the runner (no leaked `E2E_LICENSE_JSON` in logs)

---

## Related

- [docs/prs/pipeline-and-branching.md](../../prs/pipeline-and-branching.md) — in-flight PR
- [docs/branching-strategy.md](../../branching-strategy.md)
- [docs/architecture/ci-cd-pipeline.md](../../architecture/ci-cd-pipeline.md)
- [poc/phase-04-testing-infrastructure.md](phase-04-testing-infrastructure.md) — provides `npm run test:ci` for the PR gate
