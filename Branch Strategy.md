# 📘 D&D 3.5e System — Branching, Release, and Publishing Strategy

This document defines the complete lifecycle of work in this repository — from planning a feature to publishing a stable release on Foundry VTT. It covers:

- Branching strategy  
- Milestones and story workflow  
- Development workflow  
- Release Candidate (RC) promotion  
- Stable release promotion  
- Hotfix workflow  
- Foundry publishing (beta + stable)  
- Required GitHub steps  

This README is the **source of truth** for both contributors and our automated pipelines.

---

# 📑 Table of Contents

1. [Branching Model Overview](#-1-branching-model-overview)  
2. [Milestones & Story Workflow](#-2-milestones--story-workflow)  
   - 2.1 [Create a Milestone](#21-create-a-milestone)  
   - 2.2 [Create Stories (Issues)](#22-create-stories-issues)  
   - 2.3 [Work the Stories](#23-work-the-stories)  
3. [Development Phase (`dev`)](#-3-development-phase-dev)  
4. [Release Candidate (RC) Promotion](#-4-release-candidate-rc-promotion)  
   - 4.1 [When to Promote](#41-when-to-promote)  
   - 4.2 [How to Promote](#42-how-to-promote)  
   - 4.3 [What the Workflow Does](#43-what-the-workflow-does)  
   - 4.4 [RC Lifecycle](#44-rc-lifecycle)  
5. [Stable Release Promotion](#-5-stable-release-promotion)  
   - 5.1 [How to Promote](#51-how-to-promote)  
   - 5.2 [What the Workflow Does](#52-what-the-workflow-does)  
   - 5.3 [After Release](#53-after-release)  
6. [Hotfix Workflow](#-6-hotfix-workflow)  
7. [Foundry Publishing Model](#-7-foundry-publishing-model)  
8. [Branch Protection Rules](#-8-branch-protection-rules)  
9. [Summary Diagram](#-9-summary-diagram)  
10. [Next Steps](#-10-next-steps)

---

# 🧭 1. Branching Model Overview

We use a structured, promotion‑based branching model:

```
feature/* → dev → promote → rc/* → promote → main → tag → release
```

Hotfixes follow a parallel path:

```
hotfix/* → main → promote → rc/* (optional) → dev
```

### Branch Purposes

| Branch | Purpose |
|--------|---------|
| `feature/*` | Work on individual stories or tasks |
| `dev` | Integration branch for all new work |
| `rc/*` | Frozen Release Candidate snapshots |
| `main` | Stable, production‑ready code |
| `hotfix/*` | Emergency fixes for production |

### Key Principles

- **No PRs into RC except hotfixes**  
- **No PRs into main except RC or hotfix**  
- **RCs are created only by promotion workflows**  
- **Releases are created only by promotion workflows**  
- **Tags drive publishing**  

---

# 🗂️ 2. Milestones & Story Workflow

Our release process is milestone‑driven. Each milestone represents a **phase** of the 14.x development cycle, aligned with Foundry’s major versioning.

We progress through:

```
alpha → beta → rc → stable
```

Each phase has its own naming convention and purpose.

---

## 2.1 Create a Milestone

Milestones follow this naming pattern:

```
14.0.0-alpha.X - <Short Title>
14.0.0-beta.X  - <Short Title>
14.0.0-rc.X    - <Short Title>
14.0.0         - <Short Title>   (final release)
```

### Examples

- `14.0.0-alpha.1 - Item PoC` *(current milestone)*  
- `14.0.0-alpha.2 - Compendium PoC`  
- `14.0.0-beta.1 - ActualTitle` *(first real beta)*  
- `14.0.0-rc.1 - Launch` *(first release candidate)*  
- `14.0.0 - Launch` *(final stable release)*  

### How to create a milestone

In GitHub:

1. Go to **Issues → Milestones**
2. Create a new milestone using the naming pattern above
3. Add a description of the goals for this phase  
   - What PoC or feature set is being validated  
   - What must be completed before promotion  
4. Set a target date (optional)

---

## 2.2 Create Stories (Issues)

Each milestone is composed of **stories** (GitHub Issues).  
Stories represent discrete units of work required to complete the milestone.

For each story:

1. Create an Issue  
2. Assign it to the active milestone  
3. Add labels such as:
   - `feature`
   - `bug`
   - `enhancement`
   - `refactor`
   - `documentation`
4. Break down into subtasks if needed  
5. Add acceptance criteria  
6. Link related Issues or PRs  

Stories are the atomic units of progress.  
Milestones are the containers that define release scope.

---

## 2.3 Work the Stories

Each story is implemented on its own feature branch.

### Workflow

1. Create a branch:
   ```
   feature/<short-description>
   ```
   Examples:
   - `feature/item-sheet`
   - `feature/compendium-import`
   - `feature/roll-parser`

2. Implement the work  
3. Open a PR into `dev`  
4. Ensure all required checks pass:
   - Lint (ts-standardx)
   - Build (CI)
   - Merge‑path validation
   - Required approvals (dev team + Jake)

5. Merge into `dev`

### Notes

- `dev` is the integration branch for all milestone work  
- No tags or releases are created from `dev`  
- When all milestone stories are complete and dev is stable, we promote to the next phase:
  - alpha → beta  
  - beta → rc  
  - rc → stable  

> This promotion process is described in later sections.

---

# 🧪 3. Development Phase (`dev`)

`dev` is the integration branch for all new work.

### Rules:

- Only PRs from `feature/*` or `hotfix/*`  
- Must pass all CI checks  
- Must be approved by dev team + Jake  
- No tags created from `dev`  
- No publishing from `dev`  

When all milestone stories are merged and dev is stable, we begin RC promotion.

---

# 🚀 4. Release Candidate (RC) Workflow

All development converges on `dev`, and each milestone produces a new **release candidate tag**.  
Alpha, beta, and rc are **release tags**, not workflow phases or branches.  
The mechanics for creating any RC are identical — only the **version string** changes.

The initial release progression looks like this:

```
v14.0.0-alpha.1 → v14.0.0-alpha.2 → … → v14.0.0-beta.1 → v14.0.0-beta.2 → … → v14.0.0-rc.1 → v14.0.0-rc.2 → … → v14.0.0
```

Each tag represents a **candidate build** of increasing stability.

> This process will be updated after the full V14 release.

---

## 4.1 How Release Candidates Are Created (Alpha, Beta, and RC)

All RCs — regardless of whether they are alpha, beta, or rc — are created using the **same workflow**.

### Step 1 — Complete the milestone

When all Issues assigned to the milestone are merged into `dev` and the branch is stable, we are ready to cut a release candidate.

### Step 2 — Run the promotion workflow

In GitHub:

1. Go to **Actions → Promote dev to RC**
2. Enter the version string:
   ```
   14.0.0-alpha.1
   ```
   or:
   ```
   14.0.0-beta.1
   ```
   or:
   ```
   14.0.0-rc.1
   ```

### Step 3 — What the workflow does

The workflow:

1. Creates the RC branch:
   ```
   rc/<version>
   ```
   Examples:
   ```
   rc/14.0.0-alpha.1
   rc/14.0.0-beta.1
   rc/14.0.0-rc.1
   ```
2. Updates `version.yaml`
3. Commits the version bump
4. Creates the tag:
   ```
   v<version>
   ```
5. Pushes the branch and tag
6. Creates a **GitHub prerelease**

This process is identical for alpha, beta, and rc — only the **version string** determines the release type.

---

## 4.2 Alpha Builds (`v14.0.0-alpha.X`)

Alpha builds are our earliest release candidates. During prerelease, they will create our proof of concept.

### Characteristics

- Created frequently as development stabilizes
- Used for internal testers and early adopters
- **Not published to Foundry**
- Available on GitHub Releases only
- Tag increment pattern:
  ```
  v14.0.0-alpha.1
  v14.0.0-alpha.2
  v14.0.0-alpha.3
  ```

Alpha builds are GitHub‑only and never pushed to Foundry.

---

## 4.3 Beta Builds (`v14.0.0-beta.X`)

At some point, we decide the project is stable enough to move from alpha to beta. During prerelease, these builds will add in additional core functionality and expand compendiums. 

### Characteristics

- More stable than alpha
- Intended for broader testing
- **Published to Foundry as beta/dev builds**
- Still considered pre‑release
- Tag increment pattern:
  ```
  v14.0.0-beta.1
  v14.0.0-beta.2
  ```

Beta builds are the first builds distributed through Foundry.

---

## 4.4 Release Candidate Builds (`v14.0.0-rc.X`)

Once beta testing stabilizes, we begin creating true release candidates. This will include our core features, all core item types with full compendiums.

### Characteristics

- Nearly production‑ready
- Published to Foundry as **dev builds**
- Used for final validation before stable release
- Tag increment pattern:
  ```
  v14.0.0-rc.1
  v14.0.0-rc.2
  ```

RC builds represent the final stage before the stable release.

---

## 4.5 Stable Release (`v14.0.0`)

When an RC is fully approved:

1. Open a PR:
   ```
   rc/<version> → main
   ```
2. Approve and merge
3. Tag the stable release:
   ```
   v14.0.0
   ```
4. Publish to Foundry as a **full stable release**

This closes the milestone.

---

## 4.6 Summary of Publishing Rules

| Tag Type | Example | Published To | Notes |
|----------|---------|--------------|-------|
| Alpha | `v14.0.0-alpha.1` | GitHub only | Internal testing |
| Beta | `v14.0.0-beta.1` | Foundry (beta/dev) | Wider testing |
| RC | `v14.0.0-rc.1` | Foundry (dev) | Final validation |
| Stable | `v14.0.0` | Foundry (stable) | Production release |

---

## 4.7 Why This Model Works

- Alpha, beta, and RC are **just tags**, not branches  
- All development stays on `dev`  
- All release candidates are created via a **single promotion workflow**  
- PRs only occur when merging an approved RC into `main`  
- Foundry only receives beta, RC, and stable builds  
- GitHub testers can use alpha builds without polluting Foundry  
- The process is simple, predictable, and easy to automate later

---

# 🏁 5. Finalizing a Stable Release

When a release candidate (RC) is fully approved, it becomes the basis for the stable release.

## 5.1 Merge the RC into `main`

Open a PR:

```
rc/<version> → main
```

Example:

```
rc/14.0.0-rc.1 → main
```

Approve and merge the PR.

## 5.2 Tag the stable release

Create the final stable tag:

```
v14.0.0
```

Pushing this tag triggers the release workflow, which:

- Builds the system
- Packages the distribution
- Publishes a **stable GitHub Release**
- Publishes the build to **Foundry stable**

## 5.3 After Release

- Close the milestone  
- Create the next milestone (e.g., `14.1.0-alpha.1`)  
- Begin new development on `dev`  

---

# 🔥 6. Hotfix Workflow

Hotfixes are used to fix urgent issues discovered after a release or during RC testing.  
They bypass the normal milestone cycle and are applied **directly to the branch where the bug was found**.

This may be:

- `main` (if the bug exists in a stable release)
- `rc/*` (if the bug exists in an active release candidate)

Hotfixes are **manual PR‑based fixes**.  
There is no automation for hotfix promotion.

---

## 6.1 Create a Hotfix Branch

Create a branch from the branch where the bug exists:

```
hotfix/<description>
```

Examples:

```
hotfix/fix-item-crash
hotfix/compendium-import-null
```

If the bug is in:

- `main` → branch from `main`
- `rc/14.0.0-rc.1` → branch from that RC branch

---

## 6.2 Open PRs

A hotfix must be merged into:

### If the bug was found in `main`:
- `main` (required)
- `dev` (required)
- any active `rc/*` branches (required if they exist)

### If the bug was found in an `rc/*` branch:
- that specific `rc/*` branch (required)
- `dev` (required)
- `main` (optional — only if the bug also affects stable)

This ensures:

- The branch with the bug is fixed immediately  
- `dev` always stays ahead of all other branches  
- Active RCs remain valid and testable  
- Stable releases only receive fixes when appropriate  

---

## 6.3 Tag the Hotfix Release (Only if merged into `main`)

If the hotfix is merged into `main`, create a patch version tag:

```
v14.0.1
v14.0.2
v14.0.3
```

Pushing this tag triggers the normal release workflow, which:

- Builds the system  
- Packages the distribution  
- Publishes a **stable GitHub Release**  
- Publishes the build to **Foundry stable**  

Hotfixes are always **stable releases**, never alpha/beta/rc.

---

## 6.4 After the Hotfix

Once the hotfix is merged and (if applicable) tagged:

1. Ensure the hotfix branch is merged into:
   - `dev` (always)
   - any active `rc/*` branches (if they exist)
   - `main` (if the bug affects stable)
2. Delete the hotfix branch
3. Continue normal development

---

## 6.5 Summary

| Scenario | Required PR Targets | Tag? | Foundry Publish? |
|----------|----------------------|------|-------------------|
| Bug in `main` | `main`, `dev`, `rc/*` | Yes (`v14.0.X`) | Yes (stable) |
| Bug in `rc/*` only | `rc/*`, `dev` | No | No |
| Bug in both `main` and `rc/*` | `main`, `rc/*`, `dev` | Yes | Yes |

Hotfixes are intentionally simple and manual to avoid accidental automation during critical fixes.

# 📦 7. Foundry Publishing Model

We publish via GitHub Releases.

## 7.1 RC Builds (Beta Channel)

- Tags containing `-rc.`  
- Published as **prereleases**  
- Foundry users install via beta manifest URL  
- Used for testing only  

## 7.2 Stable Releases (Stable Channel)

- Tags without `-rc.`  
- Published as **stable releases**  
- Foundry users receive updates automatically  

## 7.3 Artifacts

Each release includes:

- ZIP of `dist/`  
- `module.json` or `system.json`  
- Release notes  

---

# 🛡️ 8. Branch Protection Rules

These rules enforce our branching strategy and ensure that all merges follow the correct flow.

---

## dev
- PRs only from:
  - `feature/*`
  - `hotfix/*` (after fixing a bug found in dev, main, or rc)
- Required checks:
  - lint
  - build
  - merge‑path validation
- Required approvals:
  - dev team
  - Jake

`dev` is the integration branch for all new work and must always stay ahead of `main` and any active RC branches.

---

## rc/*
- PRs only from:
  - `hotfix/*` (when the bug exists in an RC)
- Required checks:
  - lint
  - build
  - merge‑path validation
- Required approvals:
  - PM
  - Jake

RC branches are created **only** by the “Promote dev to RC” workflow.  
They are frozen except for hotfixes.

---

## main
- PRs only from:
  - `rc/*` (when an RC is approved)
  - `hotfix/*` (when the bug exists in main)
- Required checks:
  - build
  - merge‑path validation
- Required approvals:
  - PM
  - Jake

`main` represents the stable release line.  
Only approved RCs or hotfixes may merge into it.

---

## hotfix/*
- Required checks:
  - lint
  - build
  - merge‑path validation
- Required approvals:
  - PM
  - Jake

Hotfix branches are temporary and used to fix urgent issues.  
They must be merged into all relevant branches (`main`, `dev`, and any active `rc/*`).

---

# 🧩 9. Summary Diagram

```
feature/* → dev → (Promote Workflow) → rc/<version> → PR → main → tag → release
                     ↑                          ↑
                     |                          |
                 hotfix/* →──────────────→──────┘
```

### Notes:
- RC branches are created **only** by the promotion workflow.
- PRs into RC branches happen **only** for hotfixes.
- PRs into main happen **only** from RC branches or hotfix branches.
- Tags determine whether a build is alpha, beta, rc, or stable.
