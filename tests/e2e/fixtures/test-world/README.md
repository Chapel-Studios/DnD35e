# E2E test world fixture

This directory holds the **pristine Foundry world snapshot** that Playwright
copies into a sandbox at the start of each E2E run. The snapshot is fully
committed — no contributor should need to recreate it for day-to-day work.

## Contents

```
test-world/
├── README.md                       — this file
├── SETUP.md                        — full procedure to (re)build the snapshot
├── world.json                      — generated from world.json.template (do not edit by hand)
├── world.json.template             — source of truth; bump coreVersion / compatibility here
├── scenes/                         — scene-level assets (if any)
└── dnd35e-e2e/                     — the actual world directory copied into the sandbox
    ├── world.json
    └── data/                       — LevelDB stores
        ├── users/                  — `gm` (Gamemaster) + `player` (Player) accounts
        ├── scenes/                 — single "Test Scene"
        ├── settings/, actors/, items/, journal/, …
        └── …
```

`world.json` is regenerated from `world.json.template` by
`npm run build:test-world-json` — never hand-edit the generated file.

## When you might need to rebuild

The only time the snapshot needs regenerating is when the **target Foundry
version bumps** (LevelDB format / world manifest schema can shift between
majors and even some minors). In that case, follow the
**"Foundry Version Updates"** section in the
[repo root README](../../../../README.md#foundry-version-updates), which
walks through [`SETUP.md`](SETUP.md) end-to-end.

For everyday changes (adding seed actors/items/scenes to the snapshot),
follow [`SETUP.md`](SETUP.md) directly — start from the committed snapshot,
mutate it inside a scratch Foundry instance, and copy the resulting
`data/` back here.
