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
   npm run build          # production build (runs lint + typecheck + system.json generation first)
   npm run dev:watch      # development watch build
   ```

   `npm run build` automatically runs these steps in order:
   - `eslint --fix` (lint)
   - `vue-tsc --noEmit` (typecheck)
   - `vite build` — compiles TypeScript + Vue → `dist/`, then the `copy-static-files` plugin runs and generates `system.json` directly into `dist/` from `system.json.template` using the version in `package.json`

   Build output is written to `<foundrySystemDir>/dnd35e/` when `local.config.json` is present. Without it (e.g. CI), output goes to `dist/`. Either way, `system.json` is never written to the repo root — it lives only in the build output.

## Build & Release Process

### Local build

See the setup steps above. `npm run build` is the only command needed — it covers lint, typecheck, `system.json` generation, and the Vite compile in one step.

To push an updated `system.json` to your local Foundry directory without a full build (e.g. after bumping the version):
```sh
npm run build:system-json
```
This writes directly to `<foundrySystemDir>/dnd35e/system.json`. Requires `local.config.json` to be configured.

### Releasing

Releases are fully automated — no manual version bump or `system.json` commit needed. The tag is the single trigger:

1. Merge your branch to `main`
2. Tag the commit and push:
   ```sh
   git tag v14.0.0-alpha.1
   git push origin v14.0.0-alpha.1
   ```
3. The `build.yml` workflow fires automatically and:
   - Sets `package.json` version from the tag
   - Runs `npm run build` (full prebuild chain including `system.json` generation with correct `manifest`/`download` URLs)
   - Packages `dist/` as `dnd35e-dist-v14.0.0-alpha.1.zip`
   - Uploads both `system.json` and the zip as release assets
   - Marks the release as a pre-release if the tag contains `-alpha.` or `-beta.`

Foundry users install or update via:
```
https://github.com/Chapel-Studios/DnD35e/releases/latest/download/system.json
```

### Tag naming

| Tag format | Example | Release type |
|---|---|---|
| `vX.Y.Z-alpha.N` | `v14.0.0-alpha.1` | Pre-release |
| `vX.Y.Z-beta.N` | `v14.0.0-beta.1` | Pre-release |
| `vX.Y.Z` | `v14.0.0` | Stable release |

## Version metadata

This repo maintains a `version.yaml` file that tracks GitHub milestone names and IDs. The version itself lives in `package.json` — that is the single source of truth.

To sync `version.yaml` with the current GitHub milestones:
```sh
npm run update:version
```

Optional environment variables:
- `GITHUB_TOKEN` — recommended to avoid API rate limits
- `GITHUB_REPOSITORY` or `--repo=owner/name` — override the default repo

There is also a manual-dispatch workflow at `.github/workflows/update-version.yml` to run this in CI when needed.

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
