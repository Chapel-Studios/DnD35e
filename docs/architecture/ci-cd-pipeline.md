# CI/CD Pipeline Architecture

How automation is wired up in this repo: what runs, when it runs, and why it's shaped this way.

**Related docs**
- [branching-strategy.md](../branching-strategy.md) — the human-side process: branches, PRs, releases, hotfixes
- [github-repo-setup.md](../github-repo-setup.md) — one-time GitHub UI configuration (rulesets, secrets, etc.)

---

## 1. Overview

```
┌─────────────────┐                ┌──────────────────┐
│ docs/migration- │ ─── source ──► │ phases.json      │
│  plan/          │                └────────┬─────────┘
└─────────────────┘                         │
                                            ▼
                              ┌─────────────────────────┐
                              │ generate-labels.mjs     │── prebuild ──► .github/labels.yml
                              │ sync-milestones.mjs     │
                              └─────────────────────────┘                        │
                                                                                 ▼
                                                              ┌────────── GitHub ──────────┐
                                                              │  Labels   Milestones        │
                                                              └─────────────────────────────┘

┌─── feature/* ─── PR ──► ci.yml ──► dev ─── PR ──► ci.yml ──► main ──► auto-tag.yml ──► tag ──► build.yml ──► Release
```

Three independent automation tracks:

1. **Quality gate** — `ci.yml` runs on every PR.
2. **Release pipeline** — `auto-tag.yml` watches `main`, fires `build.yml` on tag.
3. **Roadmap sync** — `phases.json` drives both labels and milestones via `sync-phases.yml` + `sync-labels.yml`.

---

## 2. Workflow inventory

All workflows live under [.github/workflows/](../../.github/workflows/). Each uses the built-in `GITHUB_TOKEN` — no PATs configured.

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| [`ci.yml`](../../.github/workflows/ci.yml) | PR → `dev` or `main` | `npm ci` → `npm run build` (lint + typecheck + Vite + system.json) → `npm test` (stub until poc.4) |
| [`validate-merge-path.yml`](../../.github/workflows/validate-merge-path.yml) | PR → `dev` or `main` | Reject PRs whose source branch isn't a legal predecessor (e.g. `feature/*` → `main`) |
| [`auto-tag.yml`](../../.github/workflows/auto-tag.yml) | Push to `main` touching `package.json` | If `version` field changed and the tag doesn't exist, validate format and push `v<version>` |
| [`build.yml`](../../.github/workflows/build.yml) | Push tag `v*.*.*` | Validate tag matches `package.json`, full build, zip `dist/`, upload zip + `system.json` as Release assets, prerelease=true if version has any `-` suffix |
| [`sync-labels.yml`](../../.github/workflows/sync-labels.yml) | Push to `dev` touching `.github/labels.yml`, or manual | Push label state to GitHub via `crazy-max/ghaction-github-labeler` |
| [`sync-phases.yml`](../../.github/workflows/sync-phases.yml) | Push to `dev` touching `phases.json`, or manual | Regenerate `labels.yml` (commit back if drifted), then sync GitHub milestones via `sync-milestones.mjs` |

### Supporting scripts

| Script | Purpose |
|--------|---------|
| [`scripts/generate-labels.mjs`](../../scripts/generate-labels.mjs) | Regenerate the section between `BEGIN/END GENERATED PHASE LABELS` sentinels in `labels.yml` from `phases.json`. Idempotent. Wired into `prebuild`. |
| [`scripts/sync-milestones.mjs`](../../scripts/sync-milestones.mjs) | Reconcile GitHub milestones with `phases.json`. Status `complete`/`hardened` → closed. Others → open. |
| [`scripts/build-system-json.mjs`](../../scripts/build-system-json.mjs) | Generate `system.json` from `system.json.template`, substituting `{{VERSION}}` from `package.json`. Used by `vite.config.ts`'s `copyStaticFiles` plugin and for Foundry-dir local writes. |

---

## 3. Trigger map

```
PR opened/updated → dev or main          ci.yml
                                         validate-merge-path.yml

Push to main (package.json version changed)
                                         auto-tag.yml
                                           → diff package.json against HEAD~1
                                           → validate version format
                                           → if changed and tag doesn't exist:
                                             create + push v<version>

Push tag v*.*.*                          build.yml
                                           → validate tag === package.json version
                                           → npm run build (lint + typecheck + Vite)
                                           → zip dist contents (no dist/ wrapper)
                                           → upload zip + system.json as Release assets
                                           → prerelease=true if version has any `-` suffix

Push to dev (.github/labels.yml changed) sync-labels.yml

Push to dev (phases.json changed)        sync-phases.yml
                                           → regenerate labels.yml (commit if drifted)
                                           → sync milestones to GitHub

Manual dispatch                          sync-labels.yml, sync-phases.yml
```

---

## 4. Source-of-truth map

| Concept | Source | Consumed by |
|---------|--------|-------------|
| Version | [`package.json`](../../package.json) `version` | `auto-tag.yml`, `build.yml`, `build-system-json.mjs` |
| Roadmap (phases, milestones, labels) | [`docs/migration-plan/phases.json`](../migration-plan/phases.json) | `sync-milestones.mjs`, `generate-labels.mjs`, README roadmap tables |
| Foundry manifest fields | [`system.json.template`](../../system.json.template) | `build-system-json.mjs` (writes `dist/system.json`) |
| Release assets | The git tag `v*.*.*` | `build.yml` (extracts version, bundles release) |

Anything not in this table is generated. Don't hand-edit `system.json`, the phase section of `labels.yml`, or GitHub milestones directly.

---

## 5. Allowed version formats

Validated by `auto-tag.yml` before any tag is pushed:

```
MAJOR.MINOR.PATCH                          # stable          14.0.0
MAJOR.MINOR.PATCH-<channel>.N              # prerelease      14.0.0-poc.1
MAJOR.MINOR.PATCH-<channel>.N.N(.N…)       # prerelease iter 14.0.0-poc.3.1
```

`<channel>` ∈ `{poc, alpha, beta, rc}`. Anything else fails the workflow with an error and no tag is created.

`build.yml`'s prerelease detection is independent: any `-` suffix → `prerelease: true`.

---

## 6. Design decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Version source of truth | `package.json` | One canonical place; `system.json` is generated |
| Roadmap source of truth | `phases.json` | One file drives milestones + labels + README tables |
| Phase numbering | Wave-local (`poc.1`, `alpha.1`, …) | Adding a phase to one wave never renumbers another wave |
| Sync direction | Repo → GitHub | Avoids ghost commits the old `update-version.yml` cron caused |
| Release trigger | Auto-tag from `package.json` change | Devs can't push directly to `main` or to protected tags |
| `manifest` URL | `releases/latest/download/system.json` | Static URL; only updates on actual releases |
| Tag/version match check | Required (fail build if mismatched) | Prevents publishing a mismatched artifact (pattern from dnd5e) |
| Test gate | Stubbed `npm test` now | Workflow integration point lands once; poc.4 fills in real Vitest |
| Dependabot | Actions-only, monthly | npm scope deferred until the codebase stabilizes (post.1) |
| Prerelease detection | Any `-` suffix | Simpler than enumerating channels; matches semver |

---

## 7. Outstanding work

| Item | Notes |
|------|-------|
| Branch protection rules | GitHub UI — see [github-repo-setup.md §6](../github-repo-setup.md). Apply after this PR merges so the `ci.yml` and `validate-merge-path.yml` check names exist |
| Real test runner | poc.4 (Testing Infrastructure) replaces the `npm test` stub with Vitest |

---

## 8. After Phase 4 (Testing Infrastructure)

`npm test` is currently a stub. When poc.4 lands:

1. Replace the `test` script in `package.json` with the real Vitest invocation (e.g. `vitest run`).
2. Optionally add `- run: npm test` to `build.yml` so a release fails on test failure.

No workflow files need to change — the stub is the integration point.
