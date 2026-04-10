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

This project includes custom GitHub Copilot agents, skills, and instruction files to assist with development. These live under `.github/` and are automatically discovered by Copilot Chat in VS Code.

### Agents

Invoke by typing `@agent-name` in Copilot Chat.

| Agent | Purpose |
|-------|---------|
| `@planning` | Design new phases, refine architecture, make cross-phase decisions |
| `@kb-curator` | End-of-session documentation review, pattern extraction, KB maintenance |

### Skills

Invoke by typing `/skill-name` in Copilot Chat.

| Skill | Purpose |
|-------|---------|
| `/phase-reference` | Look up which phase covers a feature, track progress, check dependencies |
| `/phase-planning` | Improve planning docs — consolidate, update checklists, extract patterns |
| `/foundry-reference` | Query Foundry VTT v14 API, data structures, hooks, and common patterns |
| `/system-comparison` | Compare how 5e, PF2e, and 3.5e handle similar mechanics |
| `/implementation-guide` | Step-by-step workflows for adding item types, mechanics, or compendium entries |

### Instruction Files

These auto-load when you edit matching files — no invocation needed.

| File | Triggers On | Covers |
|------|-------------|--------|
| `foundry-data-fields` | DataModel/Schema files | Field types, hierarchy, options |
| `dnd35e-patterns` | Component/DataModel files | Composition chains, data models, formulas, AEs |
| `dnd35e-field` | Dnd35eField files | Compound field shape, value access, type patterns |
| `vue-sheet-patterns` | `.vue` files | Sheet view modes, EditValue, FormGroups |
| `form-groups` | FormGroup components | FormGroup variants, API, layout patterns |
| `formula-familiar` | Formula/Familiar files | FormulaFamiliar autocomplete system |

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
