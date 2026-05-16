# Test World Snapshot — Manual Setup

Story 3 Layer C and Story 6 E2E specs need a pristine Foundry world snapshot
checked into `tests/e2e/fixtures/test-world/`. Playwright will copy this
directory into a sandbox each run so tests are hermetic.

This is a **one-time manual prep**. Once committed, no contributor should
need to redo it unless the Foundry version bumps or world structure changes.

---

## Prerequisites

- Foundry VTT v14 installed (the same version targeted by `system.json`).
- A scratch data directory you don't mind throwing away (e.g. `C:/temp/foundry-snapshot-build`).
- The dnd35e system installed into that scratch data dir, OR a built
  `dist/` that you can copy in.

## Steps

### 1. Start Foundry against a clean data dir

```powershell
# From the Foundry install directory (where foundryvtt.exe lives, or via Node)
& "C:\Program Files\Foundry Virtual Tabletop\Foundry Virtual Tabletop.exe" --dataPath="C:\temp\foundry-snapshot-build"
```

Or via Node if you have the resources folder configured:

```powershell
node "C:\Program Files\Foundry Virtual Tabletop\resources\app\main.mjs" --dataPath="C:\temp\foundry-snapshot-build"
```

Accept EULA / enter license if prompted (this is the same key you use for
local dev — Foundry's EULA permits multiple instances per license for
development).

### 2. Install the dnd35e system into the scratch data dir

Easiest: from the dnd35e repo run a build that targets the scratch dir, or
manually copy `dist/` → `C:\temp\foundry-snapshot-build\Data\systems\dnd35e\`.

The system needs to be installed before world creation so Foundry can offer
it in the system picker.

### 3. Create the test world

In the Foundry setup screen:

- **Click**: "Create World"
- **Title**: `dnd35e E2E Test World`
- **Data Path / Directory Name**: `dnd35e-e2e` (this becomes the folder name)
- **Game System**: `dnd35e` (D&D 3.5e)
- **Background**: leave default
- **Description**: `Pristine snapshot for Playwright E2E tests. Do not edit in-place.`
- **Next System Version**: leave blank
- Click **Create World** → **Launch World**

### 4. Create the two test users

Once the world boots, you'll land on the user-login screen. Click the
gear/cog icon (User Management) to manage users:

- **User 1**:
  - Name: `gm`
  - Role: `Gamemaster`
  - Password: leave blank
- **User 2**:
  - Name: `player`
  - Role: `Player`
  - Password: leave blank

Save and return to the login screen.

### 5. Create a minimal empty scene

Log in as `gm`. Open the **Scenes** sidebar tab and:

- Click **Create Scene** (the `+` button or right-click → Create)
- Name: `Test Scene`
- Set as **Active Scene** (right-click the scene → Activate)
- Save with defaults — no background image, no tokens, no walls

### 6. Shut down Foundry cleanly

- Go to **Return to Setup** (top-right user menu) → confirm
- From the setup screen close Foundry entirely (don't just kill the process —
  let it flush DB writes).

### 7. Copy the world into the repo

Keep the world directory **nested** under `test-world/` — Foundry expects
`worlds/<world-id>/world.json`, so the directory name (`dnd35e-e2e`) is
significant.

```powershell
# Adjust source path to your scratch dir
$source = "C:\temp\foundry-snapshot-build\Data\worlds\dnd35e-e2e"
$dest   = "C:\Repos\dnd35e\tests\e2e\fixtures\test-world"

# Wipe any previous snapshot but keep the README + SETUP docs
if (Test-Path "$dest\dnd35e-e2e") { Remove-Item "$dest\dnd35e-e2e" -Recurse -Force }

# Copy the whole world dir in
Copy-Item -Path $source -Destination $dest -Recurse -Force
```

The final layout under `tests/e2e/fixtures/test-world/` should look like:

```
test-world/
├── README.md              (kept)
├── SETUP.md               (kept — this file)
└── dnd35e-e2e/            (the world — directory name == world id)
    ├── world.json         (manifest — confirm system: "dnd35e")
    └── data/
        ├── users/         (LevelDB: *.ldb, *.log, CURRENT, MANIFEST-*, LOCK, LOG)
        ├── scenes/        (LevelDB: contains Test Scene)
        ├── actors/        (LevelDB: empty)
        ├── items/         (LevelDB: empty)
        └── ...            (other empty LevelDB dirs Foundry creates)
```

> Foundry v14 stores each collection as a **LevelDB directory**, not a flat
> `.db` file. Each subdirectory under `data/` contains a small set of
> LevelDB files. Don't try to hand-edit them.

### 8. Replace `world.json` with the template, sanity-check, commit

The snapshot's manifest is **templated** so it tracks `version.yaml` rather than
whatever version Foundry happened to write into the world the day you built the
snapshot. The build script `scripts/build-test-world-json.mjs` (wired into
`prebuild` and `pretest:e2e`) regenerates `dnd35e-e2e/world.json` from
`dnd35e-e2e/world.json.template`, which is the only manifest committed.

What this means for snapshot setup:

1. **Delete the Foundry-written `world.json`** that landed in step 7:

   ```powershell
   Remove-Item "$dest\dnd35e-e2e\world.json"
   ```

   It's git-ignored anyway, and `npm run build` will regenerate it from the
   template. The committed template already has the right shape — leave it
   alone unless `coreVersion` needs bumping for a new Foundry release.

2. **Sanity-check the other artifacts**:

   - Confirm `dnd35e-e2e/world.json.template` shows `"system": "dnd35e"` and a
     `"coreVersion"` matching the Foundry version you used.
   - The `dnd35e-e2e/data/` LevelDB directories should be small (a few KB each).
     If anything is multi-MB, you captured more than intended — go back to
     step 5 and start over with a minimal scene.
   - For the user check, easiest path is to relaunch Foundry pointed at the
     scratch data dir, log in, and confirm `gm` and `player` exist in User
     Management. LevelDB files aren't human-readable.

3. **Commit**:

   ```powershell
   git add tests/e2e/fixtures/test-world/
   git commit -m "test(e2e): add pristine Foundry test world snapshot"
   ```

   Push and notify SilverSmith — Layer C tests can then be activated.

---

## Notes

- **Snapshot is read-only at runtime**: Playwright copies this directory into a
  temp dir per test run. Never modify it in-place after committing.
- **Rebuilding**: if the snapshot becomes corrupt or a Foundry upgrade breaks
  schema compatibility, redo steps 1–9. The world is intentionally minimal so
  rebuild is cheap.
- **License key**: not stored in the snapshot. Playwright reads it from
  `local.config.json` per developer (already wired in `playwright.config.ts`).
- **Size**: the snapshot should be < 1 MB. If it's larger, something
  unintended got captured (modules, journal entries, scene tokens, etc.).
