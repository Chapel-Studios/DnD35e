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
