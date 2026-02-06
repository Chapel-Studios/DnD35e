# 📘 D&D 3.5e System — Branching, Release, and Publishing Strategy (Refined)

This document defines the complete lifecycle of work in this repository — from planning a feature to producing a stable release. It covers:

- Branching model  
- Milestones and story workflow  
- Development workflow  
- Release Candidate (RC) promotion  
- Stable release promotion  
- Hotfix workflow  
- Branch protection rules  

This README is the **source of truth** for contributors and automation.

---

# 1. Branching Model Overview

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
| `feature/*` | Individual stories or tasks |
| `dev` | Integration branch for all new work |
| `rc/*` | Frozen Release Candidate snapshots |
| `main` | Stable, production‑ready code |
| `hotfix/*` | Emergency fixes |

### Core Principles

- RC branches are created **only** by the promotion workflow  
- PRs into RC are **hotfix‑only**  
- PRs into main come **only** from RC or hotfix  
- Tags determine release type (alpha, beta, rc, stable)  
- `dev` always stays ahead of `main` and any active RC branches  

---

# 2. Milestones & Story Workflow

Milestones define the scope of each release phase:

```
alpha → beta → rc → stable
```

Milestones follow this naming pattern:

```
14.0.0-alpha.X - <Title>
14.0.0-beta.X  - <Title>
14.0.0-rc.X    - <Title>
14.0.0         - <Title>
```

### Stories (Issues)

Each milestone is composed of Issues that represent discrete units of work.

Stories should include:

- Labels (`feature`, `bug`, `enhancement`, etc.)  
- Acceptance criteria  
- Subtasks if needed  
- Links to related Issues/PRs  

### Working Stories

1. Create a branch:
   ```
   feature/<short-description>
   ```
2. Implement the work  
3. Open a PR into `dev`  
4. Pass required checks (lint, build, merge‑path validation)  
5. Obtain required approvals  
6. Merge into `dev`  

When all milestone stories are complete and `dev` is stable, we promote to the next release phase.

---

# 3. Development Phase (`dev`)

`dev` is the integration branch for all new work.

### Rules

- PRs only from `feature/*` or `hotfix/*`  
- Must pass all checks  
- Must be approved by dev team + Jake  
- No tags or releases are created from `dev`  

Once the milestone is complete, `dev` is promoted to an RC.

---

# 4. Release Candidate Workflow

All pre‑stable builds (alpha, beta, rc) are created using the **same promotion workflow**.  
The version string determines the release type:

```
v14.0.0-alpha.X
v14.0.0-beta.X
v14.0.0-rc.X
```

### How RCs Are Created

1. Complete the milestone  
2. Run the “Promote dev to RC” workflow  
3. The workflow:
   - Creates `rc/<version>`  
   - Updates `version.yaml`  
   - Commits the version bump  
   - Creates tag `v<version>`  
   - Pushes branch + tag  
   - Creates a prerelease on GitHub  

### Release Types

| Type | Example | Purpose |
|------|---------|---------|
| Alpha | `v14.0.0-alpha.1` | Early internal testing |
| Beta | `v14.0.0-beta.1` | Broader testing |
| RC | `v14.0.0-rc.1` | Final validation |
| Stable | `v14.0.0` | Production release |

---

# 5. Finalizing a Stable Release

When an RC is approved:

1. Open a PR:
   ```
   rc/<version> → main
   ```
2. Approve and merge  
3. Tag the stable release:
   ```
   v14.0.0
   ```
4. The release workflow builds and publishes the stable release  

Afterward:

- Close the milestone  
- Create the next milestone  
- Resume work on `dev`  

---

# 6. Hotfix Workflow

Hotfixes fix urgent issues discovered after a release or during RC testing.  
They bypass the milestone cycle and are applied directly to the branch where the bug exists.

### Creating a Hotfix

Branch from the affected branch:

```
hotfix/<description>
```

### Required PR Targets

| Scenario | Required PR Targets | Tag? |
|----------|----------------------|------|
| Bug in `main` | `main`, `dev`, active `rc/*` | Yes (`v14.0.X`) |
| Bug in `rc/*` only | that `rc/*`, `dev` | No |
| Bug in both `main` and `rc/*` | `main`, `rc/*`, `dev` | Yes |

### Hotfix Tags

If merged into `main`, tag a patch release:

```
v14.0.1
v14.0.2
```

Hotfix releases are always stable.

---

# 7. Branch Protection Rules

### dev
- PRs only from `feature/*` or `hotfix/*`  
- Required checks: lint, build, merge‑path validation  
- Required approvals: dev team + Jake  

### rc/*
- PRs only from `hotfix/*`  
- Required checks: lint, build, merge‑path validation  
- Required approvals: PM + Jake  

### main
- PRs only from `rc/*` or `hotfix/*`  
- Required checks: build, merge‑path validation  
- Required approvals: PM + Jake  

### hotfix/*
- Required checks: lint, build, merge‑path validation  
- Required approvals: PM + Jake  

---

# 8. Summary Diagram

```
feature/* → dev → (Promote Workflow) → rc/<version> → PR → main → tag → release
                     ↑                          ↑
                     |                          |
                 hotfix/* →──────────────→──────┘
```

---
