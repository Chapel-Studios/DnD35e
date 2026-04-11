# d35e

* the Foundry Types were originally created by the PFE2 team. original credit to them.

## Build & Release Process

### Local build

- Install dependencies: `npm ci`
- Production build: `npm run build`
- Development watch build: `npm run watch`

Build output is written to `dist/`.

### CI (GitHub Actions)

This repo ships a GitHub Actions workflow at `.github/workflows/build.yml`.

- Trigger: pushing a SemVer tag matching `v*.*.*` (example: `v0.1.0`)
- Steps: `npm ci` then `npm run build`
- Artifact: `dnd35e-dist-<tag>.zip` (example: `dnd35e-dist-v0.1.0.zip`) containing a top-level `dist/` folder (source maps excluded)
- Delivery: the zip is uploaded to the corresponding GitHub Release

Node is pinned via `.nvmrc` and used by CI.

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
| `@kb-curator` | End-of-session documentation review, pattern extraction, KB maintenance |

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
