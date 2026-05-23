# POC Phase 5: Compendium Foundation

**Status**: 🔶 In Progress (pack pipeline, origin tracking, authoring workflow, Foundry integration)

> **Milestone**: POC  
> **Dependencies**: Phase 1, Phase 2, Phase 3  
> **Goal**: Establish the compendium build pipeline (JSON source → LevelDB packs), origin tracking for items moving between compendiums and world, type-safe UUID helpers, migration version field on documents, and content authoring tooling. Proves the pipeline with **Broken and Masterwork material effects** — the first compendium-sourced auto-managed AEs. This phase does NOT include the amalgamated browser or end-user compendium management (release.1 — Compendium Browser).

---

## 5.1 Why Compendiums Early

The grant system (Phases 11–12, Races & Classes) references items by compendium UUID. If compendiums don't exist yet, grant UUIDs have nothing to resolve. Origin tracking must be established before actors start acquiring items, so every document knows where it came from.

Additionally, this gives us a solid content authoring workflow from the start — every subsequent phase that adds a new item type (feats, races, classes, spells) can immediately author SRD entries as compendium source JSON.

---

## 5.2 Source Format Decision: JSON vs YAML

### Decision Framework

Phase 5 establishes the canonical source format for all compendium content. This choice affects:
- Build pipeline complexity
- Developer editing experience
- Version control diffs
- Transformation script architecture
- Long-term maintenance burden

### Format Comparison

| Criteria | JSON | YAML |
|----------|------|------|
| **TypeScript ecosystem alignment** | ✅ Native | ⚠️ Requires parser |
| **Tooling overhead** | ✅ Minimal | ⚠️ YAML parser dependency |
| **Serialization from Foundry** | ✅ Direct | ⚠️ Requires export flag |
| **Human readability** | ⚠️ Dense | ✅ Clear structure |
| **Manual editing** | ⚠️ Tedious | ✅ Easy |
| **Version control diffs** | ⚠️ Verbose | ✅ Concise |
| **Transformation scripting** | ✅ Simple | ⚠️ Extra parsing |
| **File sizes** | ✅ Smaller | ⚠️ Larger |
| **Compatibility with CLI** | ✅ Default | ✅ Supported |

### Implementation Decision Required

**Choose one format for Phase 5** and document your choice in this section with rationale. Considerations:

1. **Automation-first approach**: If Phase 5 relies on CSV → Macro → Script workflow (programmatic generation), manual editing overhead doesn't matter much. _Favors JSON._

2. **Developer experience**: If team members will frequently hand-edit source files, readability and diff quality matter. _Favors YAML._

3. **Build pipeline maturity**: JSON requires only default CLI behavior. YAML requires extra parser. _Favors JSON for Phase 5; YAML can be added in the Compendium Browser phase (release.1)._

4. **Transformation scripts**: If scripts must process source files frequently, JSON is simpler. YAML requires parsing overhead. _Favors JSON._

### Exploration Tool: Foundry CLI

The `@foundryvtt/foundryvtt-cli` supports both JSON and YAML extraction via flags (`--yaml`). At phase start, use the CLI to extract a sample pack in both formats and compare:
- Diff readability (git diff on a field change)
- Round-trip fidelity (extract → edit → compile → extract again)
- File sizes and nesting depth
- How transformation scripts interact with each format

This hands-on comparison will inform the final decision. See §5.15 risk_5 for how the plan proceeds while this remains open.

### Deferred Flexibility

- The decision is not permanent — conversion infrastructure can be added in release.1 (Compendium Browser) if team consensus shifts.
- If JSON is chosen now, YAML export/import can be layered on top later without disrupting the core system.
- If YAML is chosen now, JSON fallback can be supported for tooling that expects it.

---

## 5.3 Source Data Structure

Compendium source data is stored as **one JSON file per document**, organized into a tree that reflects how the content will appear in Foundry's compendium sidebar. Foundry's sidebar has **two** independent grouping mechanisms and the on-disk layout mirrors both:

1. **Pack folders** — sidebar folders that group whole compendium packs (declared via `packFolders` in `system.json`). See [§5.4.5 Pack Folders](#545-pack-folders-grouping-packs-in-the-sidebar).
2. **In-pack folders** — folders *inside* a pack that group documents (declared as `_Folder.json` documents inside the pack). See [§5.5.4 In-Pack Folders](#554-in-pack-folders).

### Canonical on-disk layout

```
packs/
  _source/
    items/                                   # cosmetic: Foundry already groups packs by document type
      Gear/                                  # sidebar pack-folder (declared in system.json packFolders)
        Weapons/                             # the actual pack (system.json packs[] entry)
          Simple/                            # in-pack folder (contains _Folder.json + documents)
            _Folder.json
            dagger.json
            club.json
          Martial/
            _Folder.json
            longsword.json
            greatsword.json
          Exotic/
            _Folder.json
            spiked-chain.json
        Armor/                               # another pack inside the same Gear sidebar folder
          _Folder.json                       # (optional) root-level in-pack folder
          chainmail.json
      Magic/                                 # another sidebar pack-folder
        Spells/
          spell-fireball.json
    activeEffects/
      Materials/                             # pack: materials
        broken-weapon.json                   # flat: no in-pack folders
        masterwork-weapon.json
```

### What each level means to Foundry vs. the build pipeline

| Path level | Example | Foundry sees it via | Pipeline behaviour |
|---|---|---|---|
| `_source/<docType>/` | `items/`, `activeEffects/` | Nothing — Foundry already auto-groups packs by `type` in the sidebar | Cosmetic on-disk grouping; pure organizational convenience |
| `_source/<docType>/<sidebarFolder>/` | `items/Gear/` | `system.json` → `packFolders[]` entries | Build script reads `packFolders[]` from template; the directory name should match the folder's `name` for clarity but Foundry uses the metadata, not the path |
| `_source/<docType>/<sidebarFolder>/<packName>/` | `items/Gear/Weapons/` | `system.json` → `packs[]` entry with matching `path` | The pack's source dir; build script invokes `compilePack(src, dest, { recursive: true })` |
| `_source/.../<packName>/<inPackFolder>/` | `items/Gear/Weapons/Simple/` | `_Folder.json` document inside the pack | Documents in this directory carry `folder: "<folderId>"`; layout is preserved by the CLI's `extractPack({ folders: true })` |
| `_source/.../<doc>.json` | `dagger.json` | The document itself | Standard Foundry document JSON with `_id`, `_key`, `name`, `type`, `system` |

Every JSON file is a complete Foundry document (with `_id`, `_key`, `name`, `type`, `system`). `_Folder.json` files are Foundry **Folder** documents (see §5.5.4). The build pipeline compiles the per-pack subtrees into LevelDB packs and emits `packs[]` + `packFolders[]` into the final `system.json`.

## 5.4 Pack Registration in system.json

Each compendium pack is declared in `system.json` following Foundry's `PackageCompendiumData` structure (from `app/common/packages/_types.mjs`). The build pipeline that generates `system.json` from a template **already exists** (it landed alongside Phase 1's build infrastructure). Phase 5 adds the `packs` array to that template and extends the build script to handle dev-only packs conditionally.

> **Implementation status**: The template, build script, version substitution, per-developer Foundry copy-out, and CI-mode fallback are **already in place**. What this phase adds is documented in [§5.4.3](#543-what-this-phase-adds).

### 5.4.1 What's Already Implemented

#### `system.json.template`
Lives at the repo root. Currently declares document types for Item and ActiveEffect, plus the `{{VERSION}}` placeholder:

```jsonc
// system.json.template (current actual content)
{
  "id": "dnd35e",
  "title": "Dungeons & Dragons 3.5 Edition SRD",
  "version": "{{VERSION}}",
  "compatibility": { "minimum": "14.354", "verified": "14.354" },
  "esmodules": ["main.mjs"],
  "styles": ["main.css"],
  "languages": [{ "lang": "en", "path": "lang/en.json", "name": "English" }],
  "documentTypes": {
    "Item": { "weapon": {} },
    "ActiveEffect": { "general": {}, "material": {}, "secret": {} }
  }
}
```

There is **no `packs` array yet** — adding it is part of this phase.

#### `scripts/build-system-json.mjs`
- Reads `local.config.json` (git-ignored, **not** `.env.local`/dotenv) for the per-developer `foundrySystemDir` path
- Normalizes `foundrySystemDir`: strips trailing `/dnd35e` if developer included it
- Reads version from `version.yaml` (the canonical version source — see `scripts/update-version-yaml.mjs`), **not** `package.json`
- Substitutes `{{VERSION}}` only — no conditional template syntax yet
- Validates the result parses as JSON before writing
- Writes to repo-root `system.json`
- Copies to `<foundrySystemDir>/dnd35e/system.json` when configured (creates the directory if missing)
- **CI mode**: when `local.config.json` is absent, warns and generates in-repo only (no copy)

#### `local.config.json.example`
Committed reference template. Single field:

```jsonc
{
  "_comment": "Copy this file to local.config.json and customize for your environment. local.config.json is git-ignored.",
  "foundrySystemDir": "C:/path/to/Foundry/Data/systems"
}
```

Note the path points at the **`systems` parent directory**, not the `dnd35e` subfolder.

#### `.gitignore`
Already excludes `local.config.json`. The generated `system.json` is **not** gitignored (it's checked in as a build artifact for users who clone and run without npm). This differs from earlier planning notes — confirm whether this should change before Phase 5 ships any volatile content.

#### `package.json` scripts (current)
```json
{
  "build:system-json": "node scripts/build-system-json.mjs",
  "prebuild": "npm run lint && npm run typecheck && npm run build:system-json",
  "build": "vite build --mode production",
  "dev:watch": "npm run build:system-json && vite build --watch --mode development"
}
```

`prebuild` runs `build:system-json` automatically before `npm run build`. `dev:watch` runs it explicitly because npm's `pre*` hook chain doesn't cover watch mode.

#### `vite.config.ts` integration
- Reads the same `local.config.json` to resolve `buildOutDir` (Foundry path or `dist/` CI fallback)
- The `copyStaticFiles` plugin copies `system.json` into the build output via `closeBundle`
- `--mode production` / `--mode development` is what currently distinguishes builds at the **Vite** level — but the `build-system-json` script itself is mode-agnostic today

### 5.4.2 Pack Field Schema

When `packs` are added in Phase 5, each entry stores only the unique fields:
- `name` — canonical identifier (also pack ID and UUID prefix)
- `label` — i18n key for the user-facing title in the Compendium sidebar
- `type` — document class (`Item`, `ActiveEffect`, `Macro`, `JournalEntry`, etc.)
- `path` (optional in template) — if the pack lives somewhere other than `packs/{name}`, declare it explicitly. With the canonical layout (§5.3) this is usually `packs/<docType>/<sidebarFolder>/<packName>` (e.g. `packs/items/Gear/Weapons`).
- `flags.dnd35e.indexFields` (optional) — extra index fields beyond Foundry's defaults; see [§5.6](#56-build--validation-setup)

The build script will fill in defaults during expansion:
- `path` → `packs/{name}` if absent
- `system` → `dnd35e`

### 5.4.3 What This Phase Adds

> **Scope note (impl)**: Phase 5 only ships the packs it needs — `materials` and a single unified `documentation` pack (workflows + SRD reference live as in-pack folders inside it). The separate `d35e-docs-workflows` / `d35e-srd-reference` packs from earlier drafts were consolidated. Production content packs (`weapons`, `feats`, `races`, `classes`) are deferred to their respective phases. A minimal `packFolders[]` entry groups `materials` + `documentation` under a `"Content"` folder to exercise the sidebar grouping mechanism; this will be expanded as more packs are added.

- [x] **Add a `packs` array to `system.json.template`** for the Phase 5 packs: `materials`, `documentation`, and the dev-only `macros-dev`
- [x] **Per-pack `_dev: true` flag** (replaces the earlier `_devPacks` proposal): the dev-only `macros-dev` carries `"_dev": true` inline; the build script strips entries where `_dev` is truthy unless `--dev` is passed, and drops the `_dev` key from kept entries
- [x] **Extend `build-system-json.mjs` to expand pack entries**: fills in `path: packs/{name}` (when absent) and `system: 'dnd35e'`
- [x] **Validate `packFolders[].packs` references**: dev-stripped names are silently filtered; references to packs that don't exist fail the build (implemented; behavior currently exercised only when a `packFolders[]` is declared)
- [x] **Add dev-mode awareness to `build-system-json.mjs`**: `--dev` CLI flag honors per-pack `_dev: true` stripping
- [x] **Update `package.json` scripts**: `build:system-json:dev` runs the script with `--dev`; `dev:watch` and new `build:dev` use it
- [ ] **Verify generated `system.json` against Foundry's `PackageCompendiumData`** schema (deferred to `validate:packs` work in [§5.6](#56-build--validation-setup))

### 5.4.4 Decisions to Confirm Before Coding

These were assumed in earlier drafts but contradict current state — confirm intent before implementing:

1. **Should `system.json` be gitignored?** The earlier draft said yes; current `.gitignore` keeps it tracked. If it stays tracked, every `npm run build` will produce a dirty working tree. If it becomes ignored, downstream tooling that expects it (e.g. CI extracting metadata, manifest URLs) needs review.
2. **Where should dev-mode detection live?** Two choices: (a) explicit `--dev` flag passed to `build-system-json` from npm scripts (matches current build-script style); (b) `process.env.NODE_ENV` (set automatically by Vite). Option (a) is more explicit and works whether or not Vite is involved.
3. **Should the SRD reference journal pack be production-shipped or dev-only?** [§5.11](#511-documentation-stubs-workflow-journals-compendium-foundation) implies prod, but it carries the largest content cost; revisit once authoring is underway.

### 5.4.5 Pack Folders (Grouping Packs in the Sidebar)

Foundry's compendium sidebar groups packs in two ways: automatically by `type`, and (optionally) by user-defined **pack folders** declared at the top level of `system.json` via `packFolders`. This is what creates the "Gear" expand-collapse group in the sidebar that contains the `weapons` and `armor` packs.

#### Schema (verified in our type defs)

From [types/foundry/common/packages/base-package.d.mts](types/foundry/common/packages/base-package.d.mts#L60-L65):

```typescript
type PackageCompendiumFolderSchema = {
  name: StringField<string, string, true, false, false>;       // sidebar label
  sorting: StringField<'a' | 'm'>;                             // 'a' = alphabetical, 'm' = manual
  color: ColorField;                                            // hex sidebar tag colour
  packs: SetField<StringField<string, string, true, false, false>>;  // pack names belonging to this folder
};
```

Foundry v11+ runtime also supports a `folders: SetField<PackageCompendiumFolder>` field for nested pack folders, even though our local type defs don't yet reflect it. If the team wants nested sidebar folders later, the build script can emit them; for Phase 5 we keep it flat.

#### Example: `system.json` excerpt

```jsonc
{
  // ... id, version, packs[] etc.
  "packFolders": [
    {
      "name": "Gear",
      "sorting": "a",
      "color": "#7a4f1d",
      "packs": ["weapons", "armor"]
    },
    {
      "name": "Magic",
      "sorting": "a",
      "color": "#553388",
      "packs": ["spells", "magic-items"]
    },
    {
      "name": "Documentation",
      "sorting": "a",
      "color": "#3a3a3a",
      "packs": ["d35e-docs-workflows", "d35e-srd-reference"]
    }
  ]
}
```

#### `system.json.template` authoring rule

`packFolders` lives in the template at the same level as `packs`. The build script's only responsibility is to:
1. Validate every `packFolders[].packs[*]` matches a `packs[].name`.
2. In dev builds, allow folder entries that contain dev-only packs to remain (or strip dev-only pack names from prod folders so the array doesn't reference unknown packs).
3. Pass `packFolders` through unchanged to the final `system.json`.

#### Mapping to on-disk layout

The canonical layout in [§5.3](#53-source-data-structure) puts each pack inside a directory named after its sidebar folder (e.g. `packs/_source/items/Gear/Weapons/`). This is **convention only** — the build script does **not** auto-generate `packFolders[]` from the directory tree. Authors declare `packFolders` explicitly in the template; the on-disk layout is a human-readability mirror that should match.

The pack's `path` field in `system.json` must reflect the on-disk location (e.g. `path: "packs/items/Gear/Weapons"`), or the build pipeline can derive `path` from a flat pack name if the pack source dir is at `packs/_source/{name}` instead. Recommend explicit `path` in the template once the canonical layout is adopted, to keep one obvious source of truth.

---

## 5.5 Pack/Unpack Pipeline


### Tooling & Dependencies

Add to `package.json`:

```bash
npm install --save-dev @foundryvtt/foundryvtt-cli
```

The official Foundry CLI provides `compilePack()` and `extractPack()` functions for managing compendium packs externally. Reference:
- GitHub: https://github.com/foundryvtt/foundryvtt-cli
- NPM: https://www.npmjs.com/package/@foundryvtt/foundryvtt-cli

### Packing (Source → LevelDB)

Create a custom Vite plugin that compiles packs during the build step. The plugin reads the generated `system.json` (produced by `build-system-json.mjs`) so the list of packs and their source paths are not duplicated in two places.

```typescript
// vite-plugin-compile-packs.ts
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import path from "path";
import fs from "fs";

export function compilePacksPlugin() {
  return {
    name: "vite-plugin-compile-packs",
    apply: "build",
    async writeBundle() {
      console.log("🔨 Compiling compendium packs...");
      const systemJson = JSON.parse(fs.readFileSync("system.json", "utf8"));

      for (const pack of systemJson.packs ?? []) {
        // pack.path is e.g. "packs/items/Gear/Weapons" (canonical layout per §5.3)
        // Source mirrors this under packs/_source/, dest is the path itself.
        const src = path.resolve(pack.path.replace(/^packs\//, "packs/_source/"));
        const dest = path.resolve(pack.path);

        if (!fs.existsSync(src)) {
          console.log(`  ⏭️  Skipping ${pack.name} (no source dir at ${src})`);
          continue;
        }

        try {
          // recursive: true is REQUIRED so the CLI walks subdirectories
          // (in-pack folder hierarchy lives in subdirs; see §5.5.4)
          await compilePack(src, dest, { log: false, recursive: true });
          console.log(`  ✅ Compiled ${pack.name}`);
        } catch (err) {
          console.error(`  ❌ Failed to compile ${pack.name}:`, err.message);
          throw err; // Fail the build
        }
      }
      console.log("✨ Pack compilation complete!");
    }
  };
}
```

**Integration into vite.config.ts:**

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { compilePacksPlugin } from "./vite-plugin-compile-packs.ts";

export default defineConfig({
  plugins: [
    vue(),
    compilePacksPlugin(),  // Runs during `vite build` after bundle is written
  ],
  // ... rest of config
});
```

**How it works:**
- Runs as the `writeBundle` hook during `vite build` (after all other build steps complete)
- Iterates through pack source directories (`packs/_source/{packName}`)
- Calls `compilePack()` from `@foundryvtt/foundryvtt-cli` for each pack with `recursive: true` so subdirectories are walked
- Writes LevelDB files to `packs/{packName}/`
- Fails the build if any pack compilation fails
- Logs progress to console during build

No separate npm script needed — just run `npm run build` as normal.

### Unpacking (LevelDB → Source)

Use the `extractPack()` function. Extracts always run with `folders: true` so the on-disk layout mirrors the in-Foundry folder hierarchy (see [§5.5.4](#554-folder-support)):

```typescript
// CLI extraction
fvtt package unpack "materials" --outputDirectory "packs/_source/materials" --folders
fvtt package unpack "weapons"   --outputDirectory "packs/_source/weapons"   --folders
```

**Programmatic usage**:
```typescript
import { extractPack } from "@foundryvtt/foundryvtt-cli";

await extractPack("packs/materials", "packs/_source/materials", {
  log: true,
  folders: true,        // mirror compendium folder hierarchy as nested directories
  omitVolatile: true,   // strip _stats.modifiedTime etc. for clean diffs
});
```

**Options** (from `@foundryvtt/foundryvtt-cli` API):
- `nedb` (boolean) — For NeDB format (older Foundry); LevelDB assumed by default
- `yaml` (boolean) — Export as YAML instead of JSON
- `log` (boolean) — Log progress to console
- `folders` (boolean) — **Recommended `true`**: nests documents under directories named `<safeName>_<folderId>/` and writes a `_Folder.json` per folder. See §5.5.4.
- `omitVolatile` (boolean) — Skip volatile fields like `_stats.modifiedTime` for cleaner diffs
- `transformEntry()` — Custom function to filter/modify entries during extraction
- `transformName()` — Custom filename generation per entry
- `transformFolderName()` — Custom directory-name generation for folders (default: `<safeName>_<id>`)

Useful for:
- Importing existing D35E packs → source JSON
- Round-tripping after in-game edits in Foundry UI (re-organize folders in Foundry, then unpack to commit the new layout)
- Ensuring source JSON stays canonical via version control
- Creating clean diffs for reviews

---

### 5.5.4 In-Pack Folders

> **Scope:** This section covers folders **inside a pack** (grouping documents within the same compendium). For folders that group **whole packs in the sidebar**, see [§5.4.5 Pack Folders](#545-pack-folders-grouping-packs-in-the-sidebar) — they're a separate Foundry mechanism declared via `packFolders` in `system.json`.

Foundry's compendium sidebar lets users group documents inside a pack into nested folders (e.g. weapons-by-category). The pack pipeline treats these as first-class so authors can organize SRD content and Foundry will display that organization out of the box.

#### Foundry's folder model

A folder is just another document inside the pack with `documentName: "Folder"`. Each folder has:
- `_id` — 16-char alphanumeric, like any document
- `name` — user-visible label
- `type` — the document type the folder contains (`"Item"`, `"ActiveEffect"`, `"JournalEntry"`, etc.) — must match the pack's content type
- `folder` — parent folder `_id`, or `null` for root-level folders
- `sorting` — `"a"` (alphabetical) or `"m"` (manual)
- `color` — optional hex color for the sidebar tag
- `description`, `flags`, `_stats` — standard document fields

Documents inside a folder reference it via their own `folder: "<folderId>"` field (`null` if not in a folder).

#### CLI source convention (`folders: true`)

When `extractPack()` runs with `folders: true`, the CLI's `buildFolderMap()` (verified in `@foundryvtt/foundryvtt-cli@3.0.3 lib/package.mjs`) produces this on-disk layout:

- Each folder becomes a directory named `<safeName>_<folderId>/` (e.g. `martial-weapons_aB3kPq9XzQrM5tN8/`).
- Inside each folder directory: a `_Folder.json` file containing the Folder document.
- Documents that belong to the folder are placed in the same directory.
- Nested folders produce nested directories.
- The top-level `_source/<pack>/` directory holds documents and folders not assigned to any parent folder.

Example (weapons pack, after `extractPack` with `folders: true`):

```
packs/_source/weapons/
  simple-weapons_aB3kPq9XzQrM5tN8/
    _Folder.json                    # { _id: "aB3kPq9XzQrM5tN8", name: "Simple Weapons", type: "Item", folder: null, ... }
    dagger.json                     # { _id: "...", folder: "aB3kPq9XzQrM5tN8", ... }
    club.json
  martial-weapons_cD4mLs7YwTbN6vR2/
    _Folder.json                    # folder: null
    longsword.json                  # folder: "cD4mLs7YwTbN6vR2"
    one-handed_eF5nMt8ZxUcO7wS3/
      _Folder.json                  # folder: "cD4mLs7YwTbN6vR2" (nested under Martial)
      rapier.json                   # folder: "eF5nMt8ZxUcO7wS3"
```

#### How `compilePack` consumes it

`compileClassicLevel()` (LevelDB) and `compileNedb()` walk the source tree (with `recursive: true`) and read each JSON file. The CLI does **not** infer folder relationships from directory structure during compilation — it relies entirely on the `_key` and `folder` fields baked into each JSON file:

- Folder docs carry `_key: "!folders!<id>"`.
- Item docs carry `_key: "!items!<id>"` (or the appropriate collection prefix).
- The `folder` field on each doc is what Foundry uses to render the tree.

This means: **the directory layout on disk is cosmetic for compilation, but semantic for extraction and human authoring**. Round-tripping (extract → edit → compile → extract) is lossless because the CLI's extract step is the source of truth for the layout.

#### What the dnd35e pipeline does

1. **Authoring loop**: GM creates folders + documents in the dev world via Foundry UI → `npm run unpack -- --pack <pack>` runs `extractPack({ folders: true, omitVolatile: true })` → source tree gets rewritten with the canonical nested layout → commit the diff.
2. **Compile loop**: `npm run build` invokes the Vite plugin → plugin calls `compilePack(src, dest, { recursive: true })` → every `*.json` (including `_Folder.json`) gets packed by `_key` → Foundry sees the folder hierarchy at world load.
3. **Validation** ([§5.6](#56-build--validation-setup)) treats `_Folder.json` like any other document: requires `_id`, `_key: "!folders!<id>"`, `name`, `type` matching the pack's content type, and a `folder` parent reference that resolves to another folder in the same pack (or `null`).

#### Authoring constraints

- **Do not hand-craft folder IDs.** Use the dev world + unpack flow so Foundry generates them. This guarantees `_id` and `_key` are valid 16-char alphanumeric values.
- **Do not rename `_Folder.json` files** — the CLI looks for that exact basename when packing.
- **Folder type must match pack content type.** A `weapons` pack (`type: "Item"`) cannot contain `_Folder.json` whose `type` is `"ActiveEffect"`.
- **Moving an item between folders** is a one-field edit: change `folder` to the new parent's `_id` (or `null`). The directory placement on disk matters only for human readability and for round-trips through unpack.

#### Decision to confirm

Whether each pack ships with a default folder structure is a content decision, not a pipeline decision. The pipeline supports folders unconditionally; whether `weapons`, `materials`, `feats`, etc. carry folders at v1.0 ships is left to the authoring tasks in Stories 1–3.

---

## 5.6 Build & Validation Setup

**Build via Vite Plugin:**

The Vite plugin compiles all source JSON to LevelDB during build. Vite automatically determines the build environment:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { compilePacksPlugin } from "./vite-plugin-compile-packs.ts";

export default defineConfig((env) => ({
  plugins: [vue(), compilePacksPlugin()],
  // Vite config is a function that receives env object
  // env.mode = "dev" or "prod" (or custom modes)
  // env.command = "serve" (vite dev) or "build" (vite build)
  // ...
}));
```

When you run:
- `npm run dev` — dev server with `macros-dev` pack included
- `npm run build:dev` — production bundle with `macros-dev` pack included (for testing)
- `npm run build` — production bundle without `macros-dev` pack

**Build Configuration:**

Dev-vs-prod selection happens in `build-system-json.mjs` (which conditionally writes dev packs into `system.json`), so the Vite plugin doesn't need to know about modes at all — it simply compiles whatever packs the generated `system.json` declares. The plugin still reads Vite's `config.mode` only for logging purposes:

```typescript
// vite-plugin-compile-packs.ts (mode-aware logging only)
export function compilePacksPlugin() {
  let mode = "production";

  return {
    name: "vite-plugin-compile-packs",
    apply: "build",
    configResolved(config) {
      mode = config.mode;  // "production" | "development" | custom
    },
    async writeBundle() {
      console.log(`🔨 Compiling packs (mode=${mode})...`);
      // … iterate system.json packs[] as shown in §5.5
    }
  };
}
```

**How dev vs prod packs are filtered:**
- `npm run build` → `build-system-json.mjs` runs without `--dev` → `system.json` excludes `macros-dev`, `d35e-docs-workflows-dev` → Vite plugin only sees prod packs.
- `npm run dev:watch` → `build-system-json.mjs --dev` → `system.json` includes dev packs → Vite plugin compiles them too.
- Single source of truth: the generated `system.json`. The plugin never hard-codes pack names.

**Validation Tech Stack:**

Before build, validate all source JSON:

**AJV (JSON Schema):**
- `npm install ajv`
- Validates `_id` format (16-char alphanumeric, required, unique per pack)
- Checks all required fields present
- Reports: "missing required field `system.weaponType`", etc.

**Foundry DataModel:**
- Custom field validators
- Cross-field constraints
- Example: "Attack bonus cannot exceed +10"

**CI/Pre-commit:**
```bash
npm run validate:packs  # Must pass before commit
```

### Compendium Index Configuration

Minimal index configuration for Phase 5. Rich search indexes are deferred to release.1 (amalgamated Compendium Browser).

**Foundry Defaults:**

By default, Foundry indexes these fields on every compendium document:
- `name` (searchable)
- `_id` (document UUID)
- `type` (item type, actor type, etc.)
- `sort` (folder order)

These enable basic sidebar search and sorting.

**Phase 5 Custom Indexes:**

We add one custom index field for materials pack. In the template, add flags to a pack entry:

```jsonc
// system.json.template excerpt
{
  "name": "materials",
  "label": "DND35E.CompendiumMaterials",
  "type": "ActiveEffect",
  "flags": {
    "dnd35e": {
      "indexFields": ["system.materialSubtype"]
    }
  }
}
```

During build expansion, the `path` and `system` fields are automatically added. The final compiled `system.json` will be:

```jsonc
{
  "name": "materials",
  "label": "DND35E.CompendiumMaterials",
  "path": "packs/materials",
  "type": "ActiveEffect",
  "system": "dnd35e",
  "flags": {
    "dnd35e": {
      "indexFields": ["system.materialSubtype"]
    }
  }
}
```

This enables fast lookups when loading default Broken/Masterwork AEs during item creation. Full-text search and rich faceted browsing is deferred to release.1 (Compendium Browser).

---

## 5.7 Content Authoring Tooling

### Canonical Workflow: CSV + Macro + Transformation Script

✅ **STANDARD FOR ALL PHASES**: This is the workflow pattern for:
- Phase 5: Creating SRD content (Broken/Masterwork)
- Phase 5+: Feats, races, classes, spells
- release.6 (Content Migration): Migrating old D35E data to new system

**Overview:**  
```
CSV (baseline) → Dev Macro (creates in-game, generates IDs) 
  → Unpack (extract JSON) → Transform Script (add remaining data) 
  → Commit (version control) → Build (compile packs)
```

**Step 1: Prepare CSV baseline** with item names and slugs:

```csv
name,slug
Longsword,longsword
Shortsword,shortsword
Greatsword,greatsword
Adamantite Longsword,adamantite-longsword
Mithral Shortsword,mithral-shortsword
```

**Step 2: Use Dev Macro to create items in-game:**

The dev macro (stored in `packs/_source/macros-dev/import-csv-items.json`) reads CSV and creates items with Foundry-generated IDs:

```javascript
// Macro: Import Items from CSV (DEV ONLY)
async function importItemsFromCSV(csvText) {
  let [headers, ...rows] = csvText.replaceAll('\r\n', '\n').split('\n').map(row => row.split(','))
  for (const row of rows) {
    const rowObj = Object.fromEntries(headers.map((name, i) => [name, row[i]]))
    await Item.create({
      name: rowObj.name,
      type: 'Item',
      system: {
        slug: rowObj.slug,
        // Other fields added by transformation script later
      }
    })
  }
  ui.notifications.info(`Created ${rows.length} items from CSV`)
}
await importItemsFromCSV(csvText)
```

Run in dev world:
- Dev build: `npm run build:dev` (includes macros-dev pack)
- Open macro → run it → paste CSV → items created with valid Foundry `_id` + `slug` field

**Step 3: Export to JSON** to get valid IDs:

```bash
fvtt package unpack -n "weapons" --outputDirectory "packs/_source/weapons"
```

Result: JSON files with Foundry-generated `_id` values that are stable across builds.

**Step 4: Transform via terminal script** to add remaining data:

```bash
npm run transform:weapons -- \
  --old-export "path/to/old-d35e-weapons.json" \
  --new-source "packs/_source/weapons" \
  --output "packs/_source/weapons"
```

Script (`scripts/transform-weapons.mjs`) maps old UUID → new slug and transforms fields:
```javascript
export async function transformWeapons(oldExportPath, newSourceDir, outputDir) {
  const oldData = JSON.parse(fs.readFileSync(oldExportPath, 'utf8'))
  const newItems = new Map()
  
  for (const file of fs.readdirSync(newSourceDir)) {
    if (!file.endsWith('.json')) continue
    const item = JSON.parse(fs.readFileSync(path.join(newSourceDir, file), 'utf8'))
    newItems.set(item.system.slug, item)
  }
  
  for (const oldItem of oldData) {
    const newItem = newItems.get(oldItem.system.slug)
    if (!newItem) continue
    
    // Transform old fields → new schema
    newItem.system.damage = transformDamage(oldItem.system.damage)
    newItem.system.cost = oldItem.system.cost
    newItem.system.weaponType = oldItem.system.weaponType
    
    fs.writeFileSync(
      path.join(outputDir, `${newItem.system.slug}.json`),
      JSON.stringify(newItem, null, 2)
    )
  }
  console.log(`✅ Transformed ${newItems.size} weapons`)
}
```

**Step 5: Commit and build:**

```bash
git add packs/_source/weapons/*
git commit -m "Phase 5: Initial weapon items"
npm run build  # Compiles packs (excludes dev macros)
```

**Why this workflow:**
- ✅ CSV is human-readable baseline
- ✅ Dev macro in-world, team-accessible (dev builds only)
- ✅ Foundry generates IDs (guaranteed valid)
- ✅ Transformation script is version-controlled, reproducible
- ✅ JSON is canonical source
- ✅ Same pattern for release.6 (Content Migration) when swapping CSV for old exports

**About `_id` fields:**
- **Required**: Yes, every document must have `_id`
- **Format**: 16-character alphanumeric (e.g., `hPLXDSGyHzlupBS2`)
- **How**: Always let Foundry generate IDs (create in-game via macro or UI, then export)
- **Stability**: IDs remain stable across builds
- **When to use this workflow**: Whenever you need to batch-create content or migrate from old system

### Alternative: Manual UI Item Creation

For single items or quick tweaks:

1. **Create in-game UI**: Open dev world, create item via normal UI
2. **Configure**: Set all fields using item sheet
3. **Export to JSON**:
   ```bash
   fvtt package unpack -n "weapons" --outputDirectory "packs/_source/weapons"
   ```
4. **Commit**: Add JSON file to repo (contains valid Foundry `_id`)
5. **Build**: `npm run build` auto-compiles

Use when adding one or two items, or for quick prototyping.

---

## 5.8 Foundation Infrastructure

### Origin Tracking

When a document moves from a compendium to the world (or vice versa), track where it came from and whether it has been modified:

```typescript
// On every document (actor, item, etc.)
interface OriginTracking {
  // The original compendium source UUID (e.g., "Compendium.dnd35e.weapons.Item.abc123")
  sourceId: string | null;

  // Hash of the original source document's system data (at import time)
  sourceHash: string | null;

  // Current hash of this document's system data
  currentHash: string | null;

  // Convenience: isModified = (currentHash !== sourceHash && sourceId !== null)
  get isModified(): boolean {
    return this.sourceId !== null && this.currentHash !== this.sourceHash;
  }
}
```

**Implementation:**

```typescript
// In Dnd35eDocumentMixin or base document class
static async _onCreateDocuments(documents, context) {
  // If created from a compendium (context.fromCompendium), stamp origin
  for (const doc of documents) {
    if (context.fromCompendium) {
      const sourceHash = computeHash(doc.system);
      await doc.setFlag("dnd35e", "origin", {
        sourceId: context.sourceUuid,
        sourceHash,
        currentHash: sourceHash,
      });
    }
  }
}

// On every update to a document with origin tracking:
static async _onUpdateDocuments(documents, context) {
  for (const doc of documents) {
    const origin = doc.getFlag("dnd35e", "origin");
    if (origin?.sourceId) {
      origin.currentHash = computeHash(doc.system);
      await doc.setFlag("dnd35e", "origin", origin);
    }
  }
}

function computeHash(obj: object): string {
  // Use crypto.subtle.digest or a library like object-hash
  // Returns stable hash of serialized system data
}
```

**Update Detection & Modification Warning:**

- Add "Check for Updates" button on item sheet (visible when `origin.sourceId` is set)
- On click: Fetch current compendium source and compare hashes
- If hashes differ: display warning with diff preview
- Modification warning logic: If user has changed item, warn before overwriting

**Use Cases:**
- Update detection: "This longsword v4 has v5 available from SRD weapons"
- Non-destructive updates: If unmodified, update silently
- Diffing: Show what fields changed
- Re-import: Replace world document with latest compendium version
- Content migration (release.6): Know origin for migration transforms

### Type-Safe UUID Helpers

Centralized UUID resolution with TypeScript generics in `src/helpers/uuid.mts`:

```typescript
export async function fromCompendiumUuid<T extends foundry.abstract.Document>(
  uuid: string
): Promise<T | null> {
  const doc = await fromUuid(uuid);
  return doc as T | null;
}

// Convenience for common types
export async function getCompendiumWeapon(uuid: string) {
  return fromCompendiumUuid<Dnd35eItem>(uuid);
}

// Batch resolution (for grant systems)
export async function resolveUuids<T extends foundry.abstract.Document>(
  uuids: string[]
): Promise<Map<string, T>> {
  const results = new Map<string, T>();
  await Promise.all(uuids.map(async (uuid) => {
    const doc = await fromCompendiumUuid<T>(uuid);
    if (doc) results.set(uuid, doc);
  }));
  return results;
}
```

Used by the grant system (Phases 11–12) when races/classes reference compendium items by UUID.

### Migration Version Field

Establish the migration version tracking field on every document. The actual migration **runner** (iterate all docs, execute transforms) is deferred to release.6 (Content Migration).

```typescript
// In Core Mixin's defineSchema()
schema.migration = new foundry.data.fields.SchemaField({
  version: new foundry.data.fields.StringField({
    required: true,
    nullable: false,
    initial: () => game.system.version,  // Auto-populate at document creation
  }),
});
```

**Foundry DataModel Integration:**

Foundry's `DataModel` class provides built-in schema validation:
- `DataModel._initialize()` — Can check `data.migration.version` and dispatch to version-specific handlers
- `SchemaField.initial` — Auto-populates new documents with `game.system.version`
- `CompendiumDocument._preUpdateData()` — Can validate before packs write documents

**Migration runner (release.6):**
- Iterate all world documents
- For each: compare `doc.system.migration.version < game.system.version`
- Call version-specific migration transform
- Update version after transform

**Key facts:**
- Every document tracks `system.migration.version`
- Version field exists from Phase 5 onward (all docs have it)
- On world load, documents with `migration.version < currentVersion` are upgrade candidates

---

## 5.9 Broken & Masterwork Material Effects (Compendium Proof Case)

The first real content authored into compendium packs. Broken and Masterwork are `materialSubtype` values on the Material AE (schema field established in Phase 2, §2.6). Phase 5 creates the default compendium entries and implements the sync logic that pulls them onto items.

### Default Compendium Entries

```
packs/_source/materials/
  broken-weapon.json      # materialSubtype: 'broken', -2 attack, -2 damage
  broken-armor.json       # materialSubtype: 'broken', halved AC bonus, double ACP
  masterwork-weapon.json  # materialSubtype: 'masterwork', +1 enhancement to attack
  masterwork-armor.json   # materialSubtype: 'masterwork', -1 ACP
```

These are standard Material AE documents with `materialSubtype` set. They use the same `MaterialSystemModel` and `buildChanges()` as standard materials — no new effect type registration needed.

### Broken AE — Sync Logic

Every physical item gets a Broken AE pulled from the compendium at creation time, in a **disabled** state:

```
Item._onCreate() →
  1. Determine item category (weapon, armor, other)
  2. fromCompendiumUuid() → fetch matching broken-{category}.json
  3. Create the AE on the item with disabled: true
  4. Stamp origin tracking (sourceId → compendium UUID)
```

**`isBroken` is a derived property — the Broken AE is the source of truth:**
- `isBroken` is NOT stored in the schema. It is computed in `PhysicalItemSystemModel.prepareDerivedData()` by checking whether any active (`!disabled`) Material AE with `materialSubtype === 'broken'` exists on the item.
- HP drops to ≤ 0 (and `hp.max > 0`) → `_onUpdate` detects the HP change → enables the system-managed Broken AE
- HP restored above 0 → `_onUpdate` disables the system-managed Broken AE
- Manually enabling any broken-material AE → `prepareDerivedData` recomputes `isBroken = true` automatically on next data prep cycle — no write-back needed
- Manually disabling → same, `isBroken` recomputes to `false`

> **Phase 6 refactor (deferred):** The `_onUpdate` HP watcher is a PoC placeholder. In Phase 6 (§5.9), the `DocumentEventEmitter` infrastructure lands on all documents. The correct long-term trigger is: `_onUpdate` emits `item 'destroyed'` when HP crosses 0; the broken AE sync subscribes to that event. See [Phase 6 §5.9](phase-06-actor-foundation.md#59-document-event-system) for the full design.

The Broken AE is **not** subject to single-material enforcement — it's always allowed alongside any standard material. Its changes use `bonusType: 'broken'` (penalty type, always stacks).

### Broken AE Subtype Slot Clarity

**Important:** Broken is **not** subject to the single-material rule. Each material subtype gets its own bonus type slot:
- `bonusType: 'material'` → Standard material enhancements (adamantite, mithral, etc.)
- `bonusType: 'broken'` → Weapon/armor breakage penalty
- `bonusType: 'masterwork'` → Masterwork enhancement bonus

These **do not** compete. A broken longsword can have:
- Standard material AE (e.g., mithral +1 enhancement)
- Broken AE (-2 attack, -2 damage)
- Effects stack independently because they use different bonus types

The "one material per subtype" rule (Phase 9) applies only to `bonusType: 'material'` entries.

### Masterwork AE — Sync Logic

Masterwork AE does **not** exist on the item by default. It's created on demand:

**Simple path** (checkbox):
1. User checks `isMasterwork` on the item sheet
2. System calls `fromCompendiumUuid()` → fetch matching masterwork-{category}.json
3. Creates the AE on the item (enabled)
4. Stamps origin tracking
5. If a custom Masterwork AE already exists on the item, do **not** add the default (custom takes precedence)

**Custom path** (manual add):
1. User drags a custom Masterwork material from a compendium (or creates one manually)
2. System detects a Material AE with `materialSubtype: 'masterwork'` was added
3. Auto-sets `isMasterwork = true` on the parent item
4. System does **not** auto-add the default — the custom one takes precedence

**Removal sync (non-destructive semantics):**
- Unchecking `isMasterwork = false` checkbox → removes **only system-added** Masterwork AE (the default one)
- **Custom Masterwork AEs are never auto-removed** — user must manually delete if desired
- If user had checked the box (system added default) and then added a custom one, unchecking removes only the default, preserving the custom
- If last Masterwork AE is manually deleted → auto-sets `isMasterwork = false`

Masterwork changes use `bonusType: 'masterwork'` — resolved independently from standard material stacking.

### Implementation Notes

- Sync logic lives on `PhysicalItem._onUpdate()` watching `system.hp` changes (not per-subclass)
- `isMasterwork` stays as a boolean on `WeaponSystemModel` (and later `EquipmentSystemModel` in Phase 15)
- `isBroken` is a **derived boolean** on `PhysicalItemSystemData` — computed in `PhysicalItemSystemModel.prepareDerivedData()` from AE state; it is NOT a stored schema field
- The compendium UUIDs for default broken/masterwork are stored as system constants (not hardcoded strings scattered through code)

### Phase 2 Deferrals (Landing Here)

The following items were deferred from Phase 2 to this phase because they require compendium content:

- [x] **`materialSubtype` selector UI**: Visible and functional in Material AE sheet — user can pick `standard` / `broken` / `masterwork`
- [ ] **Material AE creation workflow end-to-end test**: Create Material AE → verify changes propagate to weapon stats
- [ ] **Material AE updates propagate immediately to weapon stats**: Verify `buildChanges()` regeneration after materialSubtype change
- [ ] **Integration tests for material stacking**: Single material applies; two materials → highest-wins per field; standard + broken + masterwork all apply (different bonus types); overrides enriched correctly
- [ ] **Integration test: History tracking accuracy across material subtypes**: Verify stacking history correctly records applied/ignored changes for each subtype

### Codebase TODO Notes (Landing Here)

The following TODO notes exist in the Phase 1/2 codebase and are tracked here for resolution:

- [ ] **`resalePrice` / `brokenResalePrice` / `isBroken` reassessment as material effects** (`PhysicalItemStore.mts:77`): These getters are commented out pending material effects redesign. Once Broken/Masterwork AE content is authored in this phase, determine whether resale pricing should be a derived value from the Broken material AE (computed from base price × broken multiplier) or remain as standalone schema fields. Resolve alongside the `isBroken` sync logic above.
- [ ] **Material details tab hardcoded label** (`material/sheet/tabs/index.mts:7`): Tab label is hardcoded as `'Details'` instead of using a localization key like `dnd35e.MATERIAL.Tab.Details`. Replace with `game.i18n.localize('dnd35e.MATERIAL.Tab.Details')` and add the key to `effects.json`. (Cross-tracked with Phase 3 remaining hardcoded string audit.)

> **Moved out:** The "Random-Price Art Objects" GM use case (`priceFormula` → `_preCreate` formula resolution → `system.price`) was formerly section 4.11 of this phase. It has been relocated to [post-release/phase-09-random-treasure.md](../post-release/phase-09-random-treasure.md), which is its natural thematic home. The `_preCreate` formula resolution mechanism it relies on is already established in Phase 1 (`Dnd35eDocumentMixin`) — Phase 5 does not need to demonstrate it.

---

## 5.10 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `packs/_source/` — compendium source directory structure |
| Create | `packs/_source/materials/broken-weapon.json` — default Broken AE for weapons |
| Create | `packs/_source/materials/broken-armor.json` — default Broken AE for armor |
| Create | `packs/_source/materials/masterwork-weapon.json` — default Masterwork AE for weapons |
| Create | `packs/_source/materials/masterwork-armor.json` — default Masterwork AE for armor |
| Create | `packs/.gitignore` — exclude compiled LevelDB packs from version control |
| Create | `vite-plugin-compile-packs.ts` — custom Vite plugin for pack compilation (at project root) |
| Create | `src/helpers/uuid.mts` — type-safe UUID helpers |
| Create | `src/constants/compendiumUuids.mts` — constants for default broken/masterwork UUIDs |
| Modify | `package.json` — add `@foundryvtt/foundryvtt-cli` as devDependency |
| Modify | `vite.config.ts` — import and register compilePacksPlugin() |
| Modify | `system.json` — add `packs[]` entries (including materials pack) |
| Modify | All DataModel `defineSchema()` methods — add `migration.version` field |
| Modify | `Dnd35eDocumentMixin` — add origin tracking in `_onCreateDocuments` |
| Modify | `src/entities/items/baseItem/ItemDnd35e.mts` — `_onCreate()` pulls Broken AE from compendium |
| Modify | `src/entities/items/weapon/WeaponDnd35e.mts` — `_onUpdate()` / `_onCreateDescendantDocuments()` sync logic |
| Modify | `src/entities/items/components/Physical/data/PhysicalItemSystemModel.mts` — add `isBroken` field |
| Modify | Item sheet Vue components — `isMasterwork` checkbox, `isBroken` toggle |

---

## 5.11 Documentation Stubs: Workflow Journals (Compendium Foundation)

### Rationale

Starting in Phase 5, establish **journal compendiums** to house workflow documentation and operational guidance. These stubs evolve throughout development as each phase adds complexity. The intent is to give end users and DMs accessible reference material early, embedded in their Foundry workspace. Final documentation hardening happens in release.2 (Documentation & SRD).

### Journal Compendium Structure

Create a new compendium pack: `d35e-docs-workflows` (production) and `d35e-docs-workflows-dev` (dev-only).

```
packs/_source/
  journals/
    01-material-pattern.json
    02-compendium-system.json
    03-bonus-stacking.json
    04-how-to-create-material.json
    05-how-to-create-weapon.json
```

Each journal entry follows Foundry's journal structure with:
- `name`: Clear workflow title
- `type`: "JournalEntry"
- `system.content`: HTML (generated from markdown templates)
- `system.pages[]`: Organized as individual pages within entries
- `flags.origin`: Metadata tracking which phase introduced/updated this entry

### Phase 5 Documentation Stubs

**5.11.1: Material Pattern** (`01-material-pattern.json`)
- Overview of items, active effects, and material subtypes
- Explanation of `materialSubtype` field (established Phase 2)
- How `prepareDerivedData()` generates dynamic AE changes
- Broken vs Masterwork distinction
- Internal reference: Phase 2 §2.6, Phase 5 §5.8

**5.11.2: Compendium System** (`02-compendium-system.json`)
- What are compendiums and where SRD content lives
- How the system stores materials, weapons, and other items
- Overview of how items are sourced from compendiums
- Internal reference: Phase 5 §5.3, §5.4

**5.11.3: Bonus Type Stacking** (`03-bonus-stacking.json`)
- Which bonus types can stack (racial, {size}, enhancement, {untyped})
- Which cannot (ability score, nat armor, {insight}, etc.)
- Highest-wins resolution for conflicting bonuses
- Examples with weapons and materials
- Internal reference: Phase 2 §2.5

**5.11.4: How to Create a Material** (`04-how-to-create-material.json`)
- Step-by-step guide for DMs to add custom materials
- Overview of material subtypes: Standard, Broken, Masterwork
- How materials modify weapon properties
- Basic examples (Mithral, Adamantite, etc.)
- **Important note**: "These workflows will change frequently as the system evolves. For complex or batch creation, consider using an AI assistant to generate items — it will save significant time during this early phase. All content will be refined and hardened in release.2 (Documentation & SRD)."
- Internal reference: Phase 5 §5.8

**5.11.5: How to Create a Weapon** (`05-how-to-create-weapon.json`)
- Step-by-step guide for DMs to add custom weapons
- Creating a simple weapon from scratch
- Applying materials and enchantments to weapons
- Testing weapon properties and bonuses
- **Important note**: Same as above — AI-assisted creation encouraged for saving time during early development phases.
- Internal reference: Phase 2 §2.6

### Implementation Details

**Source Format**: Journal entries stored as JSON in `packs/_source/journals/` matching Foundry's `JournalEntry` schema. Markdown content converted to HTML in the transformation step.

**Build Integration**: The Vite pack compilation plugin treats journal packs like any other compendium — compiles from `_source/` into LevelDB packs.

**Versioning & Evolution**:
- Each journal entry includes a `flags.phase` field tracking first implementation
- Updates from later phases append version markers (e.g., "Updated Phase 7: Feats System")
- Never delete entries; instead mark as deprecated with migration notes
- Enables reliable end-user reference material throughout development

**Dev World Integration**: 
- The `dev/` world (Data/worlds/dev/) automatically loads both production and `*-dev` packs
- Documentation available immediately upon opening the dev world
- Content emphasizes rough early-stage nature with clear warnings about future changes

### SRD Reference Journal (from D35E)

A user-translated SRD journal export exists at `fvtt-JournalEntry-3.5-srd-working-c3lf0RUqQVJ8Pm20.json` (exported from D35E 2.4.3). This multi-page journal covers: Table of Contents, The Core Mechanic, Races, Character Descriptions, Base Classes, Multiclass Characters, Prestige Classes, NPC Classes, Skills, Feats, and Magic Items. During Phase 5, import this into a `d35e-srd-reference` journal compendium as the system's built-in SRD reference. Pages will need schema updates (D35E → dnd35e field names) and any D35E-specific markup cleaned up.

### Deferred to release.2 (Documentation & SRD)

- Full markdown → HTML generation with metadata extraction
- Rich journal search integration with index configuration
- Comments / discussion features on documentation entries
- Version history and changelog rollup
- Localization (Phase 3 infrastructure ready; content translation deferred)
- Content hardening and stabilization

---

## 5.12 Deferred to release.1 (Compendium Browser)

Everything listed here is deferred to release.1 (Compendium Browser & Management):
- Amalgamated cross-compendium browser (search across all packs)
- End-user compendium management (create/rename/delete user packs)
- Rich index configuration (full-text search, filter facets)
- Schema migration runner infrastructure (iterate + transform all docs)
- Compendium diff viewer (compare world doc vs compendium original)
- Compendium export/import tools for users

---

## 5.13 Completion Checklist

This is the **acceptance-gate** view of the phase. For task-level routing, dependencies, and parallelization, see [§5.14 Execution Plan](#514-execution-plan) — which is the source of truth for what work exists. Each gate below corresponds to a story in §5.14 and lists only the user-verifiable success signals.

> Status: 🔶 In Progress (pipeline + manifest scripts shipped; validation, dev macro, transformation scripts still pending).

### Gate 1 — Pipeline & Authoring Workflow Ship

The compendium build pipeline works end-to-end, and the authoring tooling devs will use for the rest of the project is in place.

- [x] `npm run build` (prod) and `npm run build:dev` / `npm run dev:watch` (dev) both succeed; both produce a Foundry-loadable `system.json` plus compiled LevelDB packs via `vite-plugin-compile-packs` (output lands in `<foundryDataPath>/systems/dnd35e/` when configured, `dist/` otherwise)
- [x] `system.json` is generated from `system.json.template` via `scripts/build-system-json.mjs`; the `packs[]` array is populated from the template; dev-only packs (`macros-dev`) are conditionally included via the `--dev` flag and the per-pack `_dev: true` marker
- [x] `system.json` `packFolders[]` declares sidebar pack grouping; build fails when a `packFolders[].packs[]` entry references an unknown pack. A `"Content"` folder grouping `materials` + `documentation` is declared in the template to exercise the mechanism.
- [x] Compiled LevelDB packs are git-ignored; sources in `packs/_source/` are committed; `local.config.json` remains git-ignored; `system.json` is git-ignored (generated artifact)
- [x] `npm run validate:packs` (AJV) catches malformed `_id`s and missing required fields, and validates `_Folder.json` files (folder type matches pack content type, parent folder reference resolves or is null)
- [ ] **Folder round-trip works** at both layers: (a) `packFolders[]` sidebar grouping is visible in Foundry's compendium sidebar *(infrastructure ready — verify by reloading dev world)*; (b) in-pack folders authored in Foundry unpack to `_Folder.json` subdirs via `npm run unpack -- --pack <pack>` and re-compile cleanly *(infrastructure ready — verify manually: create item in folder → close Foundry → `npm run unpack -- --pack materials` → check JSON → `npm run build:dev` → reload)*
- [ ] Dev macro `import-csv-items` creates items with valid Foundry-generated `_id`s when run in the dev world
- ~~[ ] Transformation scripts (`transform-weapons.mjs`, `transform-materials.mjs`) run and produce schema-correct output~~ *(deferred to Content Migration phase)*
- [x] CSV skeleton template (`docs/ItemCreation.SAMPLE.csv`) exists with `name,type,slug,pack` columns; intentionally minimal — CSV is for ID generation only, not data migration
- [ ] `AUTHORING.md` exists with the canonical CSV → Macro → Unpack (--folders) → Edit JSON → Build workflow, including the `_Folder.json` convention *(written last in phase, after full round-trip is verified)*

### Gate 2 — Documents Remember Their Origin

Items and actors track where they came from and whether they've been changed; UUIDs resolve type-safely; documents stamp their migration version.

> **Scope change (feat/poc-05.2-tracking)**: `origin.sourceId`/`sourceHash`/`isModified` hash tracking was deferred to post-release. Foundry's native `_stats.compendiumSource` is sufficient to identify system-managed AEs for Story 3 — it's set automatically on drag-drop import and can be set programmatically (mirrors Foundry's own region behavior pattern at foundry.mjs L76331). The `system.origin` schema was reduced to `migrationVersion` only.

- ~~`[ ]` Importing a doc from a compendium populates `origin.sourceId` + `sourceHash`~~ — **deferred to post-release** (use `_stats.compendiumSource` natively instead)
- ~~`[ ]` Modifying an imported doc flips `isModified` (current hash diverges from source hash)~~ — **deferred to post-release**
- [ ] `fromCompendiumUuid<T>()` and batch `resolveUuids<T>()` resolve correctly; invalid UUIDs return `null` without throwing
- [x] `system.origin.migrationVersion` is auto-populated to `game.system.version` on document creation
- [x] All document DataModels carry `system.origin.migrationVersion` (via `DocumentSystemModel` base — propagates to items, AEs, actors)

### Gate 3 — Broken & Masterwork Work End-to-End

The headline POC proof case: GMs and players can apply Broken or Masterwork to a weapon and see the effect on stats.

- [x] Four Material AEs exist in `packs/_source/materials/` (broken-weapon, broken-armor, masterwork-weapon, masterwork-armor) and compile into the materials pack
- [x] `src/constants/compendiumUuids.mts` exports the four UUIDs as named constants
- [ ] Creating a new weapon auto-attaches a disabled Broken AE pulled from the compendium with origin tracking stamped
- [x] Reducing weapon HP to 0 → system-managed Broken AE auto-enables; restoring HP above 0 → AE auto-disables
- [x] `isBroken` reflects the live AE state: `true` when any active broken-material AE is present, `false` otherwise (no stored flag — derived each prepare cycle)
- [x] Toggling `isMasterwork` on creates the Masterwork AE from compendium; toggling off removes only the system-added one (custom Masterwork AEs are preserved)
- [x] Manually enabling/disabling either AE syncs `isBroken`/`isMasterwork` derived values on next render
- [ ] Effects visibly modify weapon stats per their `bonusType` (broken / masterwork stack independently from `material`)

### Gate 4 — Workflow Journals Visible in Dev World

Contributors and DMs see workflow documentation embedded in Foundry from the start.

- [ ] Five journal stub entries (`01-material-pattern` … `05-how-to-create-weapon`) compile into the `d35e-docs-workflows` pack
- [ ] `d35e-docs-workflows` (prod) and `d35e-docs-workflows-dev` (dev-only) are registered via `system.json.template`
- [ ] SRD reference journal imported into a `d35e-srd-reference` compendium with D35E → dnd35e schema cleanup
- [ ] Each journal entry has `flags.phase` versioning metadata and uses i18n keys (Phase 3 is complete)

### Gate 5 — Final Smoke Test

- [ ] System loads in Foundry with no console warnings about missing packs or UUIDs
- [ ] Compendium sidebar lists all registered packs (prod build) and all + dev packs (dev build)
- [ ] No regression on Phase 1/2 weapon-and-material flows

---


## 5.14 Execution Plan

Story-oriented decomposition. Each story delivers something a developer, GM, or player can interact with or notice. Within stories, tasks are atomic and routed by skill. Between stories, dependencies flow from foundation upward — but parallelization is generous because Stories 2 and 4 don't depend on each other.

> **Open decision (Explore-at-phase-start):** JSON vs YAML source format (see §5.2 / §5.15 risk_5). The plan proceeds on JSON as the default; if YAML wins after exploration, the delta is small and confined to the pipeline tasks of Story 1.

### Story 1 — Devs ship content through the pipeline

> **User**: Developer / content author
> **Delivers**: Drop a JSON file into `packs/_source/<pack>/`, run `npm run build:dev`, and see the entry appear in Foundry's compendium sidebar. The full authoring toolchain (CSV → macro → unpack → transform → commit → build) is real and documented.

This is foundational — every other story rides on it. Authoring tooling (dev macro, transformation scripts, CSV templates, AUTHORING.md, TRANSFORMATION.md) lives here because devs use those tools to do *this phase's own* content authoring in Story 3 and Story 4.

```yaml
task_1a:
  name: "Directory structure + .gitignore (packs/, packs/_source/<subdirs>, root .gitignore updates)"
  routing: Flexible
  blocking: [1b, 1c, 1f, 4a]
  verify: "Directories exist for materials, weapons, feats, races, classes, macros-dev, journals; compiled LevelDB packs are git-ignored; local.config.json remains git-ignored. (system.json gitignore status — confirm per §5.4.4 decision.)"

task_1b:
  name: "Implement vite-plugin-compile-packs.ts (writeBundle hook, configResolved for dev/prod mode)"
  routing: Lead dev
  depends_on: [1a]
  blocking: [1d]
  verify: "Plugin compiles packs/_source/<pack>/ → packs/<pack>/ on vite build; honors dev vs prod mode for conditional packs (macros-dev)"

task_1c:
  name: "Extend system.json.template + scripts/build-system-json.mjs for packs (the script and template already exist — see §5.4.1; this task adds packs[] and packFolders[] to the template, expands path/system in the script, validates packFolders references, and adds a --dev flag for conditional dev packs)"
  routing: Lead dev
  depends_on: [1a]
  blocking: [1d]
  verify: "system.json.template carries the prod packs[] entries with explicit path values matching the canonical layout (§5.3); packFolders[] declares sidebar grouping (e.g. Gear, Magic, Documentation — §5.4.5); build:system-json --dev appends macros-dev + d35e-docs-workflows-dev; without --dev they are excluded; per-pack expansion fills path: packs/{name} (when absent) and system: 'dnd35e'; build fails when packFolders references an unknown pack; existing local.config.json copy-out and CI mode still work; version still sourced from version.yaml"

task_1d:
  name: "Wire package.json scripts to pass dev mode (extend dev:watch, add a build:dev if needed) + vite.config.ts plugin registration"
  routing: Lead dev
  depends_on: [1b, 1c]
  blocking: [1f, 1g, 4b, 3a]
  verify: "npm run build (prod) excludes dev packs; dev:watch (or build:dev) passes --dev to build:system-json AND --mode development to vite; pack-compile plugin runs as part of vite build; output lands in <foundrySystemDir>/dnd35e/ when local.config.json is set, dist/ otherwise"

task_1e: # ✅ Complete
  name: "AJV validation script (npm run validate:packs)"
  routing: Jr dev
  depends_on: [1a]
  blocking: [3b]
  verify: "validate:packs catches missing/malformed _id (not 16-char alphanumeric), missing required fields, duplicate _ids; passes on valid source JSON; recognizes _Folder.json files (requires _key starting with !folders!, type matching pack content type, valid parent folder reference or null)"

task_1f:
  name: "Dev macro: import-csv-items.json (reads CSV, creates items with Foundry-generated _ids)"
  routing: Jr dev
  depends_on: [1d]
  blocking: [3a]
  verify: "Run macro in dev world with sample CSV → items created with valid Foundry _ids and slug field; unpacking with --folders produces canonical nested JSON layout (see §5.5.4)"

task_1g: # ⛔ DEFERRED — Content Migration phase (end of release / post-release)
  name: "Transformation scripts (scripts/transform-weapons.mjs, scripts/transform-materials.mjs)"
  routing: Jr dev or Pair
  depends_on: [1d]
  note: >-
    Deferred to Content Migration phase. Content in Phase 5 is authored fresh in Foundry UI
    (Material AEs) or imported via the CSV macro skeleton-only workflow — no old D35E data
    needs transforming here. Transform scripts belong with the bulk migration effort, not
    in the POC toolchain.
  verify: "(deferred)"

task_1h: # ✅ Complete — docs/ItemCreation.SAMPLE.csv serves as the skeleton template
  name: "CSV baseline templates (skeleton only — name/slug/pack columns, no data migration)"
  routing: Flexible
  note: >-
    Intentionally minimal: CSV is a skeleton for getting Foundry-generated _ids only.
    Data is never migrated via CSV; it is populated via direct JSON editing post-unpack
    or via scripts in the Content Migration phase. docs/ItemCreation.SAMPLE.csv is the
    canonical example. No per-type files or README needed at this stage.
  verify: "docs/ItemCreation.SAMPLE.csv exists with name,type,slug,pack columns"

task_1i: # ⏳ LAST in phase — deferred until all other implementation is stable
  name: "Author AUTHORING.md and TRANSFORMATION.md"
  routing: Flexible
  depends_on: [1f, 1j] # removed 1g (deferred); added 1j so the unpack workflow is proven first
  note: >-
    Must be last in the phase. The authoring workflow evolves as implementation progresses
    and documenting it mid-phase produces stale docs. Write once the full cycle
    (CSV → macro → unpack → edit JSON → build) is verified end-to-end.
  verify: "AUTHORING.md documents CSV→Macro→Unpack(--folders)→Edit JSON→Build with step-by-step, including the _Folder.json convention from §5.5.4; omits TRANSFORMATION.md (content migration scripts deferred to release.6)"

task_1j:
  name: "Verify folder round-trip end-to-end (both layers: packFolders sidebar grouping AND in-pack folders)"
  routing: Pair (Lead + Jr)
  depends_on: [1b, 1d, 1f]
  verify: "(a) Sidebar pack folders: system.json packFolders[] groups packs as declared (e.g. Gear contains weapons + armor) and Foundry's compendium sidebar shows the grouping. (b) In-pack folders: dev world has weapons in nested Simple/Martial/Exotic folders → npm run unpack -- --pack weapons writes _Folder.json files in subdirectories matching the hierarchy → npm run build compiles without warnings → reloading the world shows the same folder tree in the compendium sidebar with no orphaned docs."
```

**Story 1 acceptance**: A developer can author a single sample item in `packs/_source/`, run `npm run build:dev`, and see it in the Foundry compendium sidebar. CSV-driven workflow is documented and the macro generates valid IDs.

---

### Story 2 — Documents remember where they came from

> **User**: Developer (POC scope) — the visible payoff comes in alpha races/classes when grant systems resolve UUIDs and content updates can be detected. POC value: it's the foundation Story 3 stamps onto its Broken AEs, and it unblocks alpha.1.
> **Delivers**: Imported docs carry origin metadata; modifications flip `isModified`; UUIDs resolve type-safely; new docs auto-stamp `migration.version`.

Independent of Story 1's pipeline (pure schema + helpers + lifecycle hooks), so it can run fully in parallel.

```yaml
task_2a:  # DONE (combined with 2c)
  name: "[REDUCED SCOPE] system.origin.migrationVersion on DocumentSystemModel base"
  status: complete
  note: |
    Hash tracking (sourceId/sourceHash/currentHash/isModified) deferred to post-release.
    _stats.compendiumSource is Foundry-native and sufficient for Story 3 AE identification.
    Removed old item-level origin schema (originId/originVersion/originPack) from ItemSystemModel.
    DocumentSystemModel now has: origin SchemaField { migrationVersion: StringField(nullable, stamps game.system.version at creation) }
  verify: "New document created → system.origin.migrationVersion === game.system.version."

task_2b:  # TODO
  name: "src/helpers/uuid.mts (fromCompendiumUuid<T>, resolveUuids<T>, isValidUuid, error-safe variants)"
  routing: Jr dev or Pair
  blocking: [3c, 3d]
  verify: "fromCompendiumUuid resolves a real compendium doc with the typed return; batch resolveUuids handles a Map; invalid UUID returns null without throwing"

task_2c:  # DONE (combined with 2a)
  name: "Add system.origin.migrationVersion to all DataModel defineSchema() (DocumentSystemModel level)"
  status: complete
  verify: "New documents auto-populate system.origin.migrationVersion = game.system.version on creation; existing POC.1–3 docs receive the field without breaking schema validation"
```

**Story 2 acceptance (revised)**: UUID helpers resolve and reject invalid input gracefully; new docs ship with `system.origin.migrationVersion`; Story 3 uses `_stats.compendiumSource` (native Foundry) to identify system-managed AEs.

---

### Story 3 — GMs apply Broken or Masterwork to a weapon

> **User**: GM and Player
> **Delivers**: The headline POC proof. Create a weapon → a disabled Broken AE is auto-attached from the compendium with origin metadata. Toggle `isBroken` or `isMasterwork` on the sheet → effects enable/disable with bidirectional sync. Stats visibly change.

Depends on Story 1 (pipeline must compile materials) and Story 2 (origin stamps the auto-attached Broken AE; UUID helpers fetch the compendium source).

```yaml
task_3a:
  name: "Author 4 Material AEs in dev world (broken-weapon, broken-armor, masterwork-weapon, masterwork-armor)"
  routing: Jr dev
  depends_on: [1d, 1f]
  blocking: [3b]
  verify: "4 Material AEs exist in dev world with correct materialSubtype + bonusType ('broken' or 'masterwork') + change list; verified by exercising each in-game"

task_3b:
  name: "Unpack materials to packs/_source/materials/ + validate"
  routing: Jr dev
  depends_on: [3a, 1e]
  blocking: [3c]
  verify: "4 JSON files committed under packs/_source/materials/ with stable Foundry-generated _ids; npm run validate:packs passes"

task_3c:
  name: "src/constants/compendiumUuids.mts with named UUID constants for the 4 default materials"
  routing: Jr dev
  depends_on: [3b, 2a, 2b]
  blocking: [3d, 3e]
  verify: "Constants exported (BROKEN_WEAPON_UUID, BROKEN_ARMOR_UUID, MASTERWORK_WEAPON_UUID, MASTERWORK_ARMOR_UUID); UUIDs match the source JSON _ids exactly"

task_3d:
  name: "isBroken as derived property + Broken AE auto-attach on create + HP-driven AE sync"
  routing: Lead dev
  depends_on: [3c]
  blocking: [3f]
  verify: "New weapon → Broken AE auto-attached, disabled, with origin stamped. isBroken is NOT in the schema (derived only). HP drops to 0 → system-managed Broken AE enables. HP restored → AE disables. Manually enabling/disabling Broken AE → isBroken reflects new AE state on next data-prep cycle. Note: _onUpdate HP watcher is a Phase 5 PoC placeholder; Phase 6 refactors to DocumentEventEmitter 'destroyed' event."
  # IMPLEMENTED — build clean, circular barrel-import TDZ crash fixed, awaiting Foundry test

task_3e:
  name: "Masterwork AE on-demand creation + sync (preserves custom Masterwork AEs)"
  routing: Lead dev
  depends_on: [3c]
  blocking: [3f]
  verify: "Toggle isMasterwork=true → default Masterwork AE created from compendium with origin. Toggle off → only system-added AE removed; custom Masterwork AEs survive. Custom Masterwork AE drag-in → isMasterwork auto-syncs true and default is NOT added."
  # ✅ IMPLEMENTED — masterworkAe.mts at @effects/material/logic/; isMasterwork derived at equippable layer

task_3f:
  name: "isBroken / isMasterwork toggles on item sheet UI"
  routing: Jr dev
  depends_on: [3d, 3e]
  blocking: [3g]
  verify: "Weapon sheet shows both toggles; toggling fires sync; AE list reflects state changes; effects visible in derived weapon stats"
  # ✅ IMPLEMENTED — ItemSheetIsBrokenCheckbox at physicalItem layer; ItemSheetIsMasterworkCheckbox at equippableItem layer

task_3g:
  name: "Integration tests: full Broken/Masterwork sync cycle"
  routing: Jr dev or Pair
  depends_on: [3f]
  verify: "Tests cover: auto-attach on create, sheet toggle bidirectional sync, manual AE toggle reverse sync, custom MW preservation, broken+material+masterwork stacking with independent bonus types"
  # ✅ IMPLEMENTED — tests/unit/effects/material-sync.test.mts (39 tests); weapon.model.test.mts updated (isMasterwork removed from schema assertions)
```

**Story 3 acceptance**: All four material AEs ship in the compiled materials pack. Creating a weapon attaches Broken (disabled) automatically. Both toggles work end-to-end with origin tracking, bidirectional sync, and custom-AE preservation.

---

### Story 4 — Workflow journals appear in the dev world

> **User**: Developer / GM browsing in-Foundry documentation
> **Delivers**: Five workflow stub journals plus the SRD reference journal compile through the same pipeline as item packs and show up in the dev world's compendium sidebar.

Depends on Story 1 (pipeline) only. Doubles as a real second consumer of the pipeline beyond materials, which strengthens Story 1's verification.

```yaml
task_4a:
  name: "Author 5 journal stubs in packs/_source/journals/ (Material Pattern, Compendium System, Bonus Type Stacking, How to Create a Material, How to Create a Weapon)"
  routing: Flexible
  depends_on: [1a]
  verify: "5 JSON files exist with name + JournalEntry type + page content stubs; each has flags.phase=5 metadata; uses i18n keys (Phase 3 is complete) — no hardcoded English content keys"

task_4b:
  name: "Register d35e-docs-workflows (prod) and d35e-docs-workflows-dev (dev-only) in system.json.template"
  routing: Flexible
  depends_on: [1c, 4a]
  verify: "Generated system.json declares both packs in dev builds; only the prod one in prod builds; Foundry loads them on startup"

task_4c:
  name: "Import SRD reference journal (fvtt-JournalEntry-3.5-srd-working...) into d35e-srd-reference compendium with schema cleanup"
  routing: Flexible
  depends_on: [1d]
  verify: "Journal imports cleanly; D35E-specific markup removed; pages render in dev world; pack registered in system.json.template"
```

**Story 4 acceptance**: Open the dev world, see three new journal compendiums (workflows + workflows-dev + srd-reference). Stubs use i18n keys and carry `flags.phase` for future incremental updates.

---

### Final Gate — Smoke test

```yaml
task_smoke:
  name: "Full system load smoke test"
  routing: Lead dev
  depends_on: [3g, 4b]
  verify: "System loads in Foundry with no console warnings about missing packs or UUIDs; sidebar lists all registered packs (prod + dev variants); Phase 1/2 weapon-and-material flows still pass; both build:dev and prod build succeed and produce loadable system.json"
```

---

### Parallelization Diagram

```
STORY 1: Pipeline + Authoring         STORY 2: Origin & UUIDs
─────────────────────────────         ───────────────────────
1a: Dirs + .gitignore                  2a: Origin tracking (Lead)
1b: Vite plugin (Lead)                 2b: UUID helpers (Jr/Pair)
1c: system.json template (Lead)        2c: migration.version field (Jr)
1d: package.json wiring (Lead)
1e: AJV validation (Jr)
1f: Dev macro (Jr)               (Story 2 fully independent of Story 1 — parallel)
1g: Transform scripts (Jr/Pair)
1h: CSV templates (Flexible)
1i: AUTHORING + TRANSFORM docs (Flexible)
                │
                ├──────────────────────────────────────────┐
                ▼                                          ▼
   STORY 4: Workflow Journals          STORY 3: Broken & Masterwork
   ────────────────────────────         ───────────────────────────────
   4a: Stub journals (Flexible)         (needs Story 1 pipeline + Story 2 origin/UUID)
   4b: Register journal packs           3a: Author materials in dev world (Jr)
   4c: SRD reference import             3b: Unpack + validate (Jr)
                │                       3c: compendiumUuids constants (Jr)
                │                       3d: isBroken sync (Lead)
                │                       3e: Masterwork sync (Lead)
                │                       3f: Sheet UI toggles (Jr)
                │                       3g: Integration tests (Jr/Pair)
                │                                  │
                └──────────────────┬───────────────┘
                                   ▼
                            FINAL GATE
                            ──────────
                            Full system smoke test (Lead)
```

### What can run in parallel

- **Stories 1 and 2 are fully independent** — start both at kickoff. Lead dev splits time between 1b/1c/1d (pipeline) and 2a (origin); Jr devs take 1e/1f/1g/1h (authoring tooling) and 2b/2c (UUID + migration version)
- **Story 4 starts as soon as Story 1's `1d` lands** (need `system.json.template` and the build script), runs in parallel with Story 3
- **Story 3 unblocks once Story 1's pipeline + Story 2's origin/UUID infrastructure are in place** — its content-creation tasks (3a, 3b) are gated on the dev macro (1f) and validation (1e), and its sync logic (3d, 3e) is gated on origin (2a) + UUID helpers (2b)
- **Final gate** waits on all of Story 3 and Story 4 to land

### Routing summary

- **Lead dev**: 1b, 1c, 1d, 2a, 3d, 3e, smoke
- **Jr dev**: 1e, 1f, 2c, 3a, 3b, 3c, 3f
- **Jr dev or Pair**: 1g, 2b, 3g
- **Pair (Lead + Jr)**: 1j
- **Flexible**: 1a, 1h, 1i, 4a, 4b, 4c

### Optional prep slot folded in

There is no standalone "research" or "infrastructure setup" track. Build pipeline work *is* Story 1's deliverable; origin/UUID work *is* Story 2's deliverable. Authoring tooling lives in Story 1 because that's where it's first used to build content.

---

## 5.15 Risks & Blockers

### Hard Blockers

```yaml
risk_1:
  name: "Phase 2 ~90% — Broken/Masterwork sync near-unblocked"
  impact: "Track D (sync logic) depends on MaterialSystemModel and buildChanges() from Phase 2"
  mitigation: "Phase 2 is approximately 90% complete (MaterialSystemModel landed). Tracks A, B, E, F can proceed in full. Track C can create the material JSON files. Track D should be safe to start once the final 10% of Phase 2 lands; verify before kickoff."
  status: "Confirm remaining Phase 2 work does not affect MaterialSystemModel or buildChanges() before starting D1/D2."

risk_2:
  name: "Phase 3 complete — i18n keys available"
  impact: "Track F journal stubs use i18n keys, not hardcoded English"
  mitigation: "Phase 3 is complete. Use proper i18n keys for all journal stubs from the start — no placeholder English needed."
  status: "Resolved (Phase 3 done)."
```

### Technical Risks

```yaml
risk_3:
  name: "Foundry CLI V14 compatibility"
  impact: "@foundryvtt/foundryvtt-cli may not support V14 LevelDB format yet"
  mitigation: "Verify CLI works with V14 early in Track A (task A2). If incompatible, fall back to direct LevelDB API or pin CLI version."
  check: "npm install @foundryvtt/foundryvtt-cli && run compilePack() on a test pack"

risk_4:
  name: "Vite plugin hook ordering"
  impact: "writeBundle runs after Vue compilation — if source JSON is also generated during build, pack compilation may see stale files"
  mitigation: "Source JSON is static (committed to repo), not generated at build time. writeBundle hook is correct. Only system.json is generated, and that's a separate pre-build step."

risk_5:
  name: "Open decision: JSON vs YAML source format (§5.2)"
  impact: "Build pipeline, CLI commands, and transformation scripts all depend on format choice"
  mitigation: "Decision intentionally deferred to phase start — needs hands-on exploration. Tracks A-B can proceed with JSON as the default assumption since CLI defaults to JSON. If YAML is chosen after exploration, the delta is: add yaml parser dep, change CLI flags, update transform scripts."
  type: "Explore-at-phase-start"
```

---

**This Phase Enables**:
- Phase 11 (Races) uses grant system with compendium UUIDs
- Phase 12 (Classes) uses grant system with compendium UUIDs
- release.1 (Compendium Browser) extends with end-user features
