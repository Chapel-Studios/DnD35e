# d35e

* the Foundry Types were originally created by the PFE2 team. original credit to them.

## Development Setup

1. Install dependencies:
   ```sh
   npm ci
   ```

2. Copy the local config template and set your Foundry systems path:
   ```sh
   cp local.config.json.example local.config.json
   ```
   Edit `local.config.json` and set `foundrySystemDir` to your Foundry `Data/systems` directory (not the `dnd35e` subfolder — the build creates that automatically):
   ```json
   {
     "foundrySystemDir": "C:/Foundry/V14/Data/systems"
   }
   ```

3. Build:
   ```sh
   npm run build          # production build
   npm run dev:watch      # development watch build
   ```

Build output is written to `<foundrySystemDir>/dnd35e/` when `local.config.json` is present. Without it (e.g. CI), the build falls back to `dist/` automatically.

## Build & Release Process

### CI (GitHub Actions)

This repo ships a GitHub Actions workflow at `.github/workflows/build.yml`.

- Trigger: pushing a SemVer tag matching `v*.*.*` (example: `v0.1.0`)
- Steps: `npm ci` then `npm run build`
- Artifact: `dnd35e-dist-<tag>.zip` (example: `dnd35e-dist-v0.1.0.zip`) containing a top-level `dist/` folder (source maps excluded)
- Delivery: the zip is uploaded to the corresponding GitHub Release

Node is pinned via `.nvmrc` and used by CI.

## Foundry Version Updates

Foundry frequently changes its world data layout (LevelDB schema, manifest
fields, migration touchpoints) between releases. Bumping the supported
Foundry version is therefore **not just a metadata change** — the committed
E2E test world snapshot must also be re-migrated and re-snapshotted, or
Playwright runs will fail to launch the world on the new build.

Follow these steps in order whenever the target Foundry version changes.

### 1. Update manifest metadata

Edit **`system.json.template`** (the committed template — `system.json` is
generated):

- `compatibility.minimum` — lowest Foundry version we still support
- `compatibility.verified` — Foundry version this release is tested against

Edit **`tests/e2e/fixtures/test-world/dnd35e-e2e/world.json.template`** to
match:

- `coreVersion` — the new full Foundry version (e.g. `"14.359"` → `"15.310"`)
- `compatibility.minimum` / `compatibility.verified`

Both templates feed generated, git-ignored manifests via
`npm run build:system-json` and `npm run build:test-world-json`.

### 2. Re-snapshot the E2E test world

Foundry will migrate the LevelDB stores the first time it opens the world
on a new version. The committed snapshot must be the **post-migration**
state, otherwise every test run will trigger migration writes and our
"hermetic copy" assumption breaks.

1. Follow [`tests/e2e/fixtures/test-world/SETUP.md`](tests/e2e/fixtures/test-world/SETUP.md)
   against the new Foundry version. Start from the committed snapshot —
   copy `tests/e2e/fixtures/test-world/dnd35e-e2e/` into your scratch
   Foundry data dir's `Data/worlds/`.
2. Launch Foundry on the new version and open the `dnd35e-e2e` world. Let
   it run the migration silently, then **exit cleanly** (do not force-quit
   — LevelDB needs a clean shutdown to flush logs).
3. Copy the migrated `Data/worlds/dnd35e-e2e/data/` directory back over
   `tests/e2e/fixtures/test-world/dnd35e-e2e/data/`, replacing all files.
4. Delete the Foundry-written `world.json` and let
   `npm run build:test-world-json` regenerate it from the template
   (already wired into `prebuild` and `pretest:e2e`).
5. `git status` should show updates only inside
   `tests/e2e/fixtures/test-world/dnd35e-e2e/data/`. The LevelDB files are
   pinned to binary via `.gitattributes` so CRLF conversion cannot corrupt
   them — do not override that.

### 3. Validate

```sh
npm run build      # regenerates system.json and world.json
npm test           # unit tests
npm run test:e2e   # Playwright launches Foundry against the new snapshot
```

If the E2E suite cannot open the world, the migration didn't complete or
the snapshot wasn't copied back cleanly — repeat step 2.

### 4. Bump `.nvmrc` if required

Major Foundry releases occasionally bump the required Node version. Check
the Foundry release notes and update `.nvmrc` to match before opening the
PR, so CI uses the same Node version as the new Foundry build.

### 5. Commit

One commit, scoped to the version bump:

```
chore(foundry): bump verified version to <X.Y.Z>

- system.json.template + world.json.template: compatibility + coreVersion
- tests/e2e/fixtures/test-world/dnd35e-e2e/data: re-migrated snapshot
- .nvmrc: <only if Node version changed>
```

## Version metadata automation

This repo maintains a `version.yaml` file that tracks the current system version and GitHub milestone mapping.

### Local update

Run the updater script to refresh `version.yaml` from GitHub milestones:

- `npm run update:version`

Optional environment variables:

- `GITHUB_TOKEN` (recommended to avoid API rate limits)
- `GITHUB_REPOSITORY` or `--repo=owner/name` (override the default repo)

### CI updater

There is an automatic workflow in `.github/workflows/update-version.yml` that:

- Runs daily on a schedule (06:00 UTC) and via manual dispatch
- Uses `.nvmrc` + `npm ci`
- Runs `npm run update:version`
- Commits and pushes changes to `version.yaml` if it changed

## AI Tooling (GitHub Copilot)

This project includes custom instruction files, skills, and agents to provide domain-specific guidance for GitHub Copilot Chat. These are defined in configuration files under `.github/` and integrate with VS Code's Copilot Chat.

**Setup**: VS Code Copilot Chat discovers and loads custom instructions from `.github/copilot-instructions.md` and related configuration files. No additional setup is required beyond opening the workspace in VS Code.

**Invocation**: 
- Custom agents: Use `@agent-name` syntax in Copilot Chat (e.g. `@planning`, `@kb-curator`)
- Custom skills: Use `/skill-name` syntax in Copilot Chat (e.g. `/phase-reference`)
- Instruction files: Load automatically — no user action needed (see below)

### Agents

| Agent | Purpose |
|-------|---------|
| `@planning` | Design new phases, refine architecture, make cross-phase decisions |
| `@silversmith` | Implement phases one checklist item at a time — discuss, build, test, approve |
| `@kb-curator` | End-of-session documentation review, pattern extraction, KB maintenance |

> **Tip**: At the end of every session, type **`@kb-curator curate the kb`** — it reviews your session, proposes documentation updates, and coaches you on AI tools you could have used.

Full list: see [`.github/AGENTS.md`](.github/AGENTS.md)

### Skills

| Skill | Purpose |
|-------|---------|
| `/phase-reference` | Look up which phase covers a feature, track progress, check dependencies |
| `/phase-planning` | Improve planning docs — consolidate, update checklists, extract patterns |
| `/foundry-reference` | Query Foundry VTT v14 API, data structures, hooks, and common patterns |
| `/system-comparison` | Compare how 5e, PF2e, and 3.5e handle similar mechanics |
| `/implementation-guide` | Step-by-step workflows for adding item types, mechanics, or compendium entries |

Full list: see [`.github/AGENTS.md`](.github/AGENTS.md)

### Instruction Files

Context-specific instructions stored in `.github/instructions/`. Each file has frontmatter with a `description` used for contextual matching. Files with an `applyTo` glob auto-load when editing matching files; files without it are included by Copilot when it determines they are relevant to the current task.

| File | Loading | Covers |
|------|---------|--------|
| `vue-sheet-patterns` | Auto-loads on `src/**/*.vue` | Sheet view modes, EditValue, FormGroups |
| `foundry-data-fields` | By relevance | Field types, hierarchy, options |
| `dnd35e-patterns` | By relevance | Composition chains, data models, formulas, AEs |
| `dnd35e-field` | By relevance | Compound field shape, value access, type patterns |
| `form-groups` | By relevance | FormGroup variants, API, layout patterns |
| `formula-familiar` | By relevance | FormulaFamiliar autocomplete system |

### Discovery

For the full list with detailed capabilities, see [.github/AGENTS.md](.github/AGENTS.md).

---

## License

This system is licensed under **CC BY-NC-ND 4.0**.

### What you can do
- Use the system in your own Foundry VTT worlds.
- Modify it for personal use.
- Extend it privately.
- Study the code and learn from it.

### What you cannot do
- Redistribute the system (original or modified).
- Publish forks or repackaged versions.
- Use it commercially.

### Attribution
If you build on this system privately or internally, please include:

>This project includes or builds upon work from DnD35e by RevJake,
>licensed under CC BY-NC-ND 4.0. Original source:
>[<REPO URL>](https://github.com/Chapel-Studios/DnD35e)

Full license text: https://creativecommons.org/licenses/by-nc-nd/4.0/
