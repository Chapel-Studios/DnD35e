# E2E test world fixture

Story 1 ships the directory placeholder only. The actual pristine Foundry
world snapshot (GM user, player user, empty scene) is built in **Story 3
Layer C / Story 6** when the first real E2E spec lands.

## Planned contents (future)

```
test-world/
├── world.json          — world manifest
├── data/
│   ├── users.db        — GM + Player accounts
│   ├── scenes.db       — empty scene
│   └── …
```

## Rebuild procedure (placeholder)

1. Start Foundry locally with `--dataPath=<temp>`
2. Create world `dnd35e-e2e` with the dnd35e system
3. Create users: `gm` (role: Gamemaster) and `player` (role: Player)
4. Create a single empty scene named "Test Scene"
5. Stop Foundry, copy the world dir contents into `tests/e2e/fixtures/test-world/`
6. Commit. Hermetic from this point.
