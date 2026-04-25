# GitHub Repository Setup Workflow

> Step-by-step setup for a **brand new** `dnd35e` GitHub repository. Assumes the code is pushed but **no** GitHub-side settings have been configured yet. Follow top to bottom — later steps depend on earlier ones (e.g. branch protection requires `ci.yml` to have run at least once so its check name is registered).

**Related docs**
- [branching-strategy.md](branching-strategy.md) — branch roles, naming, release flow
- [architecture/ci-cd-pipeline.md](architecture/ci-cd-pipeline.md) — workflow specifications
- [prs/pipeline-and-branching.md](prs/pipeline-and-branching.md) — what this setup enables

---

## Prerequisites

- [ ] Repository exists at `https://github.com/<owner>/dnd35e`
- [ ] Default branch is `main`, with `dev` also pushed
- [ ] You have **Admin** permission on the repo
- [ ] Local clone has `feature/branch_and_test_planning` merged or ready to merge

---

## Phase 1 — Branches

### 1.1 Create the long-lived branches

In the GitHub UI: **Code tab → branch dropdown → View all branches**.

Required branches:
- [ ] `main` (default)
- [ ] `dev`

If `dev` doesn't exist:
```
git checkout main
git pull
git checkout -b dev
git push -u origin dev
```

### 1.2 Set the default branch

**Settings → General → Default branch → switch to `main`** (it should already be there; confirm).

> Why `main`, not `dev`? Releases are cut from `main`. The default branch is the one users land on when visiting the repo and the one Foundry's release URLs point at. Day-to-day development happens against `dev` via PRs.

### 1.3 Add the dev branch as a "release/integration" reference

No GitHub setting required — `dev` is just another branch. The branching rules below give it the right protections.

---

## Phase 2 — Repository settings

**Settings → General**:

- [ ] **Features** → uncheck **Wikis** (docs live in-repo under `docs/`)
- [ ] **Features** → keep **Issues** enabled
- [ ] **Features** → keep **Discussions** enabled (community Q&A)
- [ ] **Pull Requests** → enable **Allow squash merging** ✅
- [ ] **Pull Requests** → enable **Allow merge commits** ✅ (release PRs use these)
- [ ] **Pull Requests** → disable **Allow rebase merging** (keeps history strategy consistent)
- [ ] **Pull Requests** → enable **Always suggest updating pull request branches**
- [ ] **Pull Requests** → enable **Automatically delete head branches** (keeps the branch list clean after merges)
- [ ] **Archives** → enable **Include Git LFS objects in archives** (if/when LFS is used)

---

## Phase 3 — Secrets & variables

The workflows in this repo use the built-in `GITHUB_TOKEN`, which is always available — **no PATs are required**.

**Settings → Secrets and variables → Actions**:

- [ ] Confirm **no manual secrets are required** for current workflows (`build.yml`, `auto-tag.yml`, `ci.yml`, `sync-labels.yml`, `sync-phases.yml` all use `GITHUB_TOKEN`)

Optional, only if you later add the Foundry package release automation:
- [ ] `FOUNDRY_RELEASE_TOKEN` — API token from foundryvtt.com for auto-publishing the manifest

---

## Phase 4 — Workflow permissions

**Settings → Actions → General**:

- [ ] **Actions permissions** → **Allow all actions and reusable workflows** (or "selected" if you want to lock down 3rd-party actions)
- [ ] **Workflow permissions** → **Read and write permissions** ✅
- [ ] **Workflow permissions** → check **Allow GitHub Actions to create and approve pull requests** (needed if you later add a release-PR bot; harmless to leave on)
- [ ] Save

> Why read/write? `sync-phases.yml` needs `issues: write` to manage milestones, `sync-labels.yml` needs `issues: write` to push labels, and `build.yml` needs `contents: write` to create releases. Each workflow file already declares its `permissions:` block, but the org-level toggle must allow it.

---

## Phase 5 — First workflow runs (bootstrap order matters)

The workflows must run in a specific order so that labels and milestones exist **before** anyone tries to use them.

### 5.1 Push `phases.json` and `labels.yml` to `dev`

This should already be on `dev` after the planning PR merges. If not:
```
git checkout dev
git pull
# verify these files exist:
#   .github/labels.yml
#   .github/workflows/sync-labels.yml
#   .github/workflows/sync-phases.yml
#   docs/migration-plan/phases.json
```

### 5.2 Trigger the label sync

**Actions tab → Sync Labels → Run workflow → Branch: `dev` → Run**.

- [ ] Workflow succeeds
- [ ] **Issues tab → Labels** shows ~50 labels: `type:*`, `status:*`, plus 44 wave-prefixed phase labels (`poc: 01 — …`, `alpha: 01 — …`, etc.)

### 5.3 Trigger the milestone sync

**Actions tab → Sync Phases → Run workflow → Branch: `dev` → Run**.

- [ ] Workflow succeeds
- [ ] **Issues tab → Milestones** shows 44 milestones: `poc.1 — Item Foundation` through `post.14 — …`
- [ ] Milestones whose `status` is `complete` or `hardened` in `phases.json` are **closed**; others are **open**

### 5.4 Trigger CI on a throwaway PR

`ci.yml` won't appear as a required-status-check option until it has run **at least once**. Easiest path:

1. Create a tiny PR (e.g. fix a typo in `README.md`) targeting `dev`.
2. Watch `CI` run on the PR.
3. Confirm green.
4. Merge.

The check name `CI / build` (or whatever the job's display name is — confirm from the Actions log) is now selectable in branch protection.

---

## Phase 6 — Branch protection rules

**Settings → Rules → Rulesets → New ruleset → New branch ruleset** (preferred over legacy "Branch protection rules" — same result, better UX).

### 6.1 Ruleset for `main`

- [ ] **Ruleset name**: `protect-main`
- [ ] **Enforcement status**: Active
- [ ] **Target branches** → Include → **Include by pattern** → `main`
- [ ] **Branch rules**:
  - [ ] **Restrict deletions** ✅
  - [ ] **Block force pushes** ✅
  - [ ] **Require a pull request before merging** ✅
    - [ ] Required approvals: **1** (raise to 2 once team grows)
    - [ ] **Dismiss stale pull request approvals when new commits are pushed** ✅
    - [ ] **Require review from Code Owners** ✅ (no-op until `CODEOWNERS` lands; safe to enable now)
    - [ ] **Require approval of the most recent reviewable push** ✅
  - [ ] **Require status checks to pass** ✅
    - [ ] **Require branches to be up to date before merging** ✅
    - [ ] Add required check: **`CI / build`** (or whatever name `ci.yml` reports)
  - [ ] **Require linear history** ❌ (release PRs may use merge commits)
  - [ ] **Require signed commits** — optional; off for now
- [ ] **Bypass list** → leave empty (admins bypass via "Allow specified actors to bypass" if absolutely needed)

### 6.2 Ruleset for `dev`

- [ ] **Ruleset name**: `protect-dev`
- [ ] **Enforcement status**: Active
- [ ] **Target branches** → `dev`
- [ ] **Branch rules** (lighter than `main`):
  - [ ] **Restrict deletions** ✅
  - [ ] **Block force pushes** ✅
  - [ ] **Require a pull request before merging** ✅
    - [ ] Required approvals: **1**
    - [ ] **Dismiss stale pull request approvals** ✅
  - [ ] **Require status checks to pass** ✅
    - [ ] Required check: **`CI / build`**
    - [ ] **Require branches to be up to date** ✅

### 6.3 Ruleset for `release/*` (read-only snapshots)

- [ ] **Ruleset name**: `protect-release-snapshots`
- [ ] **Target branches** → pattern `release/*`
- [ ] **Branch rules**:
  - [ ] **Restrict creations** — leave off (workflows or release process create these)
  - [ ] **Restrict deletions** ✅
  - [ ] **Block force pushes** ✅
  - [ ] **Restrict updates** ✅ (snapshots are read-only after they're cut)

### 6.4 Tag protection

**Settings → Rules → Rulesets → New tag ruleset**:

- [ ] **Ruleset name**: `protect-release-tags`
- [ ] **Target tags** → pattern `v*.*.*`
- [ ] **Tag rules**:
  - [ ] **Restrict deletions** ✅
  - [ ] **Block force pushes** ✅
- [ ] **Bypass list** → add **GitHub Actions** with **Always** bypass mode (so `auto-tag.yml` can push the release tag from `main`)

> Tags trigger `build.yml` and create GitHub Releases. Once published they should never move. Humans don't push these tags — `auto-tag.yml` does, when `package.json`'s `version` field changes on `main`.

---

## Phase 7 — Issue & PR templates

Already committed to the repo — nothing to flip in the GitHub UI. They activate automatically:

- [x] `.github/ISSUE_TEMPLATE/user-story.yml`
- [x] `.github/ISSUE_TEMPLATE/bug-report.yml`
- [x] `.github/ISSUE_TEMPLATE/config.yml` — disables blank issues, links to Discussions
- [x] `.github/PULL_REQUEST_TEMPLATE.md`

Verify after first push: **Issues tab → New issue** shows the template picker with both templates plus the contact links.

---

## Phase 8 — CODEOWNERS

When `.github/CODEOWNERS` lands:

- [ ] File is committed to `dev` (and merged to `main`)
- [ ] **Settings → Rules → `protect-main`** → confirm **Require review from Code Owners** is checked
- [ ] **Settings → Rules → `protect-dev`** → optionally enable the same

GitHub auto-detects the file at `.github/CODEOWNERS` and uses it on every PR.

---

## Phase 9 — Dependabot

When `.github/dependabot.yml` lands, **Settings → Code security → Dependabot**:

- [ ] **Dependabot alerts** → Enable
- [ ] **Dependabot security updates** → Enable
- [ ] **Dependabot version updates** → Enable (reads `dependabot.yml`)
- [ ] **Grouped security updates** → Enable

---

## Phase 10 — Release configuration

### 10.1 Releases page

Nothing to configure up front — `auto-tag.yml` creates the tag when `package.json` version changes on `main`, and `build.yml` creates the release when the tag is pushed. Confirm end-to-end by:

- [ ] Running through the first release per the workflow in [branching-strategy.md §4](branching-strategy.md): version-bump PR on `dev` → `dev` → `main` PR → merge → watch `auto-tag` then `build` workflows succeed
- [ ] **Releases tab** shows the release with both assets attached: `dnd35e-dist-vX.Y.Z.zip` + `system.json`

### 10.2 Foundry manifest URL

The `manifest` field in `system.json.template` points at the GitHub releases "latest" alias. Confirm:

- [ ] `https://github.com/<owner>/dnd35e/releases/latest/download/system.json` resolves to the release asset after the first tag

This URL is what users paste into Foundry's "Install System" dialog.

---

## Phase 11 — Discussions (optional but recommended)

**Settings → General → Features → Discussions** → enable.

Then **Discussions tab → Categories**:
- [ ] **Announcements** (Announcement format) — release notes
- [ ] **Q&A** (Q&A format) — user questions
- [ ] **Ideas** (Open-ended) — feature requests
- [ ] **Show and tell** (Open-ended) — content sharing

---

## Phase 12 — Verification checklist

Run through this once everything is set up:

- [ ] **Issues → Labels**: 44 phase labels + `type:*` + `status:*` labels exist
- [ ] **Issues → Milestones**: 44 wave-named milestones exist; correct ones are closed
- [ ] **Actions tab**: `CI`, `Sync Labels`, `Sync Phases`, `Build Release` all visible
- [ ] **Settings → Rules**: `protect-main`, `protect-dev`, `protect-release-snapshots`, `protect-release-tags` all Active
- [ ] **Pull a test PR** to `dev`: status check `CI / build` is **required**, can't merge without approval
- [ ] **Push a `v*.*.*` tag** to `main`: `Build Release` runs, GitHub Release is created with `.zip` + `system.json` assets
- [ ] **Edit `phases.json` on `dev`**: `Sync Phases` runs, milestone titles/states update
- [ ] **Edit `.github/labels.yml` on `dev`**: `Sync Labels` runs, label names/colors update

---

## Phase 13 — Day-2 maintenance

These are one-time-then-occasional:

- [ ] **Settings → Collaborators and teams** → invite collaborators with `Write` (devs) or `Triage` (community managers)
- [ ] **Settings → Moderation** → set up interaction limits if community grows
- [ ] **Settings → Webhooks** → set up Discord webhook for releases (optional; community-driven)
- [ ] **Insights → Community Standards** → confirm `README.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, security policy all green-checked

---

## What this setup gives you

After completing all phases:

| Capability | How |
|------------|-----|
| Every PR is gated on lint + typecheck + build + test | `ci.yml` + branch protection requiring `CI / build` |
| `main` and `dev` cannot be force-pushed or deleted | Rulesets `protect-main` + `protect-dev` |
| Release tags are immutable | Tag ruleset `protect-release-tags` |
| Phase milestones stay in sync with the plan | `sync-phases.yml` reading `phases.json` |
| Phase labels stay in sync with the plan | `generate-labels.mjs` + `sync-labels.yml` |
| Releases publish automatically with the right assets | `build.yml` triggered by `v*.*.*` tags |
| Foundry users always pull the latest manifest | `releases/latest/download/system.json` URL |

---

## Rollback / "what if I mess this up?"

| Mistake | Fix |
|---------|-----|
| Wrong status check name in branch protection | Edit the ruleset, remove the bad check, add `CI / build` (case-sensitive — copy from a recent Actions run) |
| Accidentally deleted a milestone | Re-run `Sync Phases` workflow — it recreates from `phases.json` (issue assignments to that milestone are lost; reassign manually) |
| Accidentally deleted a label | Re-run `Sync Labels` workflow — recreates from `labels.yml` (issue label assignments are lost) |
| Force-pushed `main` (somehow) | Restore from `git reflog` locally and push; if branch protection was on, this shouldn't have been possible |
| Tag pushed to wrong commit | Delete the tag (`git push origin :refs/tags/vX.Y.Z`), delete the GitHub Release, re-tag correctly. **Only safe if the release hasn't been distributed yet.** |
