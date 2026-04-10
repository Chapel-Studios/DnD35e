# Phase 4: Compendium Foundation

**Status**: � Planned (pack pipeline, origin tracking, authoring workflow, Foundry integration)

> **Milestone**: POC  
> **Dependencies**: Phase 1, Phase 2, Phase 3  
> **Goal**: Establish the compendium build pipeline (JSON source → LevelDB packs), origin tracking for items moving between compendiums and world, type-safe UUID helpers, migration version field on documents, and content authoring tooling. Proves the pipeline with **Broken and Masterwork material effects** — the first compendium-sourced auto-managed AEs. This phase does NOT include the amalgamated browser or end-user compendium management (Phase 26).

---

## 4.1 Why Compendiums Early

The grant system (Phases 11–12, Races & Classes) references items by compendium UUID. If compendiums don't exist yet, grant UUIDs have nothing to resolve. Origin tracking must be established before actors start acquiring items, so every document knows where it came from.

Additionally, this gives us a solid content authoring workflow from the start — every subsequent phase that adds a new item type (feats, races, classes, spells) can immediately author SRD entries as compendium source JSON.

---

## 4.2 Source Format Decision: JSON vs YAML

### Decision Framework

Phase 4 establishes the canonical source format for all compendium content. This choice affects:
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

**Choose one format for Phase 4** and document your choice in this section with rationale. Considerations:

1. **Automation-first approach**: If Phase 4 relies on CSV → Macro → Script workflow (programmatic generation), manual editing overhead doesn't matter much. _Favors JSON._

2. **Developer experience**: If team members will frequently hand-edit source files, readability and diff quality matter. _Favors YAML._

3. **Build pipeline maturity**: JSON requires only default CLI behavior. YAML requires extra parser. _Favors JSON for Phase 4; YAML can be added in Phase 26._

4. **Transformation scripts**: If scripts must process source files frequently, JSON is simpler. YAML requires parsing overhead. _Favors JSON._

### Deferred Flexibility

- The decision is not permanent — conversion infrastructure can be added in Phase 26 (Compendium Browser) if team consensus shifts.
- If JSON is chosen now, YAML export/import can be layered on top later without disrupting the core system.
- If YAML is chosen now, JSON fallback can be supported for tooling that expects it.

---

## 4.3 Source Data Structure

Compendium source data is stored as **one JSON file per document**, organized by pack:

```
packs/
  _source/
    weapons/
      longsword.json
      shortsword.json
      ...
    feats/
      weapon-focus.json
      power-attack.json
      cleave.json
      ...
    races/
      human.json
      ...
    classes/
      fighter.json
      ...
```

Each JSON file is a complete Foundry document with `_id`, `name`, `type`, and `system` data. The build pipeline compiles these into LevelDB packs.

---

## 4.4 Pack Registration in system.json

Each compendium pack is declared in `system.json` following Foundry's `PackageCompendiumData` structure (from `app/common/packages/_types.mjs`). **Phase 4 establishes conditional pack registration**: the build process generates `system.json` with pack declarations based on the build environment (dev vs production).

### System Configuration Strategy

**Problem**: 
- Every pack must be registered in `system.json` for Foundry to load it
- Dev packs (e.g., `macros-dev`) should only appear in dev builds, not production
- Each developer has a different local Foundry system directory path
- Manually editing `system.json` breaks the build process

**Solution**:
Create a build-time configuration system:

1. **Dev settings file** (git ignored): Store per-developer local paths
   ```bash
   # .env.local (git ignored)
   FOUNDRY_SYSTEM_DIR=/path/to/local/Foundry/Data/systems/dnd35e
   ```

2. **Build script** generates `system.json` from a template — Vite determines dev vs production based on the command used (`vite dev` vs `vite build`)

3. **Pack declarations** are conditional:
   - Production: weapons, feats, races, classes, materials
   - Dev: weapons, feats, races, classes, materials, macros-dev

### Template: system.json.template

Store a minimal template in version control with only unique information per pack:

```jsonc
// system.json.template
{
  "id": "dnd35e",
  "title": "D&D 3.5e System",
  "version": "{{VERSION}}",
  "packs": [
    { "name": "weapons", "label": "DND35E.CompendiumWeapons", "type": "Item" },
    { "name": "feats", "label": "DND35E.CompendiumFeats", "type": "Item" },
    { "name": "races", "label": "DND35E.CompendiumRaces", "type": "Item" },
    { "name": "classes", "label": "DND35E.CompendiumClasses", "type": "Item" },
    { "name": "materials", "label": "DND35E.CompendiumMaterials", "type": "ActiveEffect" }
    {{#DEV_BUILD}}
    ,{ "name": "macros-dev", "label": "DND35E.CompendiumMacrosDev", "type": "Macro" }
    {{/DEV_BUILD}}
  ]
}
```

**Information stored**:
- `name`: Canonical identifier (also used to generate pack path and UUID prefix)
- `label`: i18n key for user-facing title in Compendium sidebar
- `type`: Document class name (Item, ActiveEffect, Macro, etc.)

**Automatically added by build script**:
- `path`: Derived as `packs/{name}`
- `system`: Always `dnd35e` (inferred from package context)
- `banner` (optional): Can be added by build script if needed

This makes the template compact and eliminates redundancy while keeping it maintainable.

### Build Script: Generate system.json

Create a build script that:
1. Reads `.env.local` (dev settings, git ignored)
2. Reads `system.json.template`
3. Substitutes template variables (VERSION, etc.) based on Vite's mode
4. Writes to `system.json`
5. Copies compiled packs to developer's local Foundry system directory

```bash
# scripts/build-system-json.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

// Load .env.local if it exists
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Vite passes the mode via VITE_INTERNAL_MODE environment variable during build
// Or we can check process.argv or package.json scripts to infer mode
// Most reliable: Use environment to determine mode (passed by package.json script)
const isDev = process.env.VITE_DEV_MODE === 'true' || process.env.VITE_MODE === 'dev';
const version = process.env.npm_package_version || '0.0.0';

// Read template
const templatePath = path.resolve(__dirname, '../system.json.template');
let template = fs.readFileSync(templatePath, 'utf8');

// Simple template substitution for VERSION
template = template.replace('{{VERSION}}', version);

// Remove/keep dev packs based on mode
if (!isDev) {
  // Remove dev pack section
  template = template.replace(/\s*,?\s*{{#DEV_BUILD}}[\s\S]*?{{\/DEV_BUILD}}/g, '');
} else {
  // Remove conditional markers, keep dev packs
  template = template.replace('{{#DEV_BUILD}}', '').replace('{{/DEV_BUILD}}', '');
}

// Parse as JSON (template now has no conditionals)
let config = JSON.parse(template);

// Expand pack declarations: add path and system to each pack
config.packs = config.packs.map(pack => ({
  ...pack,
  path: pack.path || `packs/${pack.name}`,             // Default path
  system: pack.system || 'dnd35e'                      // Default system
}));

// Write expanded system.json
const outputPath = path.resolve(__dirname, '../system.json');
fs.writeFileSync(outputPath, JSON.stringify(config, null, 2) + '\n');

console.log(`✅ Generated system.json (${isDev ? 'DEV' : 'PROD'} build, ${config.packs.length} packs)`);

// Optional: Copy to developer's Foundry system directory
const foundrySystemDir = process.env.FOUNDRY_SYSTEM_DIR;
if (foundrySystemDir && fs.existsSync(foundrySystemDir)) {
  const destPath = path.join(foundrySystemDir, 'system.json');
  fs.copyFileSync(outputPath, destPath);
  console.log(`✅ Copied system.json to ${destPath}`);
}
```

### Update package.json Scripts

```json
{
  "scripts": {
    "build": "npm run build:system-json && vite build",
    "build:dev": "npm run build:system-json -- --dev && vite --mode dev build",
    "dev": "npm run build:system-json -- --dev && vite --mode dev",
    "build:system-json": "node scripts/build-system-json.mjs",
    "validate:packs": "node scripts/validate-packs.mjs"
  }
}
```

**Key changes:**
- `build` (production) → Vite defaults to production mode (`vite build`)
- `build:dev` (development) → Explicitly sets `--mode dev` for Vite
- `dev` (dev server) → Sets `--mode dev` for `vite` (dev server command)
- Vite automatically passes the mode to all plugins via the `env` object

### Dev Settings Template (.env.local.example)

Store in version control as a reference (NOT `.env.local` itself):

```bash
# .env.local.example — Copy to .env.local and customize for your environment
FOUNDRY_SYSTEM_DIR=/path/to/your/Foundry/Data/systems/dnd35e
```

Add to `.gitignore`:
```
.env.local
system.json
```

**Note**: The build environment (dev vs production) is determined automatically by Vite based on the `vite dev` vs `vite build` command.

### Implication

**Every pack declaration goes into system.json.template** (production + dev packs all listed conditionally). The build process then:
1. Detects the build mode from Vite (dev vs production)
2. Strips out dev-only declarations if building for production
3. Includes dev-only declarations if building for dev mode
4. Outputs the final `system.json` with the correct set of pack registrations

This ensures:
- ✅ All packs always registered (no manual edits needed)
- ✅ Dev packs conditionally included/excluded based on Vite mode
- ✅ Each developer can target their own Foundry system directory
- ✅ `system.json` is never committed (build artifact)
- ✅ Future phases can add new packs to the template without manual system.json edits

---

## 4.5 Pack/Unpack Pipeline

### Tooling & Dependencies

Add to `package.json`:

```bash
npm install --save-dev @foundryvtt/foundryvtt-cli
```

The official Foundry CLI provides `compilePack()` and `extractPack()` functions for managing compendium packs externally. Reference:
- GitHub: https://github.com/foundryvtt/foundryvtt-cli
- NPM: https://www.npmjs.com/package/@foundryvtt/foundryvtt-cli

### Packing (Source → LevelDB)

Create a custom Vite plugin that compiles packs during the build step:

```typescript
// vite-plugin-compile-packs.ts
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import path from "path";
import fs from "fs";

const PACKS = ["materials", "weapons", "feats", "races", "classes"];

export function compilePacksPlugin() {
  return {
    name: "vite-plugin-compile-packs",
    apply: "build",
    async writeBundle() {
      console.log("🔨 Compiling compendium packs...");
      for (const packName of PACKS) {
        const src = path.resolve("packs/_source", packName);
        const dest = path.resolve("packs", packName);
        
        // Skip if source dir doesn't exist
        if (!fs.existsSync(src)) {
          console.log(`  ⏭️  Skipping ${packName} (no source directory)`);
          continue;
        }
        
        try {
          await compilePack(src, dest, { log: false });
          console.log(`  ✅ Compiled ${packName}`);
        } catch (err) {
          console.error(`  ❌ Failed to compile ${packName}:`, err.message);
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
- Calls `compilePack()` from `@foundryvtt/foundryvtt-cli` for each pack
- Writes LevelDB files to `packs/{packName}/`
- Fails the build if any pack compilation fails
- Logs progress to console during build

No separate npm script needed — just run `npm run build` as normal.

### Unpacking (LevelDB → Source)

Use the `extractPack()` function:

```typescript
// CLI extraction
fvtt package unpack "materials" --outputDirectory "packs/_source/materials"
fvtt package unpack "weapons" --outputDirectory "packs/_source/weapons"
```

**Programmatic usage**:
```typescript
import { extractPack } from "@foundryvtt/foundryvtt-cli";

await extractPack("packs/materials", "packs/_source/materials", {
  log: true,
  folders: false, // Set to true if packs have folder structure
});
```

**Options** (from `@foundryvtt/foundryvtt-cli` API):
- `nedb` (boolean) — For NeDB format (older Foundry); LevelDB assumed by default
- `yaml` (boolean) — Export as YAML instead of JSON
- `log` (boolean) — Log progress to console
- `folders` (boolean) — Preserve folder structure in source
- `omitVolatile` (boolean) — Skip volatile fields like `_stats.modifiedTime` for cleaner diffs
- `transformEntry()` — Custom function to filter/modify entries during extraction
- `transformName()` — Custom filename generation per entry

Useful for:
- Importing existing D35E packs → source JSON
- Round-tripping after in-game edits in Foundry UI
- Ensuring source JSON stays canonical via version control
- Creating clean diffs for reviews

---

## 4.6 Build & Validation Setup

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

Vite determines dev vs production automatically via `command` and `mode`:
```typescript
// vite-plugin-compile-packs.ts
const PACKS = ["materials", "weapons", "feats", "races", "classes"];
const DEV_ONLY_PACKS = ["macros-dev"];

export function compilePacksPlugin() {
  let isDev = false;
  
  return {
    name: "vite-plugin-compile-packs",
    apply: "build",
    configResolved(config) {
      // Vite passes config object with mode: "dev" | "prod"
      isDev = config.mode === "dev";
    },
    async writeBundle() {
      const packsToCompile = isDev ? [...PACKS, ...DEV_ONLY_PACKS] : PACKS;
      console.log(`🔨 Compiling packs (${isDev ? "DEV" : "PROD"})...`);
      // compile logic...
    }
  };
}
```

**How Vite determines mode:**
- `vite dev` → `mode: "development"` by default
- `vite build` → `mode: "production"` by default
- `vite build --mode dev` → explicitly set mode to `"dev"` for testing
- Plugins receive mode via `config.mode` in `configResolved()` hook

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

Minimal index configuration for Phase 4. Rich search indexes are deferred to Phase 26 (amalgamated browser).

**Foundry Defaults:**

By default, Foundry indexes these fields on every compendium document:
- `name` (searchable)
- `_id` (document UUID)
- `type` (item type, actor type, etc.)
- `sort` (folder order)

These enable basic sidebar search and sorting.

**Phase 4 Custom Indexes:**

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

This enables fast lookups when loading default Broken/Masterwork AEs during item creation. Full-text search and rich faceted browsing is deferred to Phase 26.

---

## 4.7 Content Authoring Tooling

### Canonical Workflow: CSV + Macro + Transformation Script

✅ **STANDARD FOR ALL PHASES**: This is the workflow pattern for:
- Phase 4: Creating SRD content (Broken/Masterwork)
- Phase 5+: Feats, races, classes, spells
- Phase 27: Migrating old D35E data to new system

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
git commit -m "Phase 4: Initial weapon items"
npm run build  # Compiles packs (excludes dev macros)
```

**Why this workflow:**
- ✅ CSV is human-readable baseline
- ✅ Dev macro in-world, team-accessible (dev builds only)
- ✅ Foundry generates IDs (guaranteed valid)
- ✅ Transformation script is version-controlled, reproducible
- ✅ JSON is canonical source
- ✅ Same pattern for Phase 27 migration (swap CSV for old exports)

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

## 4.8 Foundation Infrastructure

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
- Content migration (Phase 27): Know origin for migration transforms

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

Establish the migration version tracking field on every document. The actual migration **runner** (iterate all docs, execute transforms) is deferred to Phase 27.

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

**Migration runner (Phase 27):**
- Iterate all world documents
- For each: compare `doc.system.migration.version < game.system.version`
- Call version-specific migration transform
- Update version after transform

**Key facts:**
- Every document tracks `system.migration.version`
- Version field exists from Phase 4 onward (all docs have it)
- On world load, documents with `migration.version < currentVersion` are upgrade candidates

---

## 4.9 Broken & Masterwork Material Effects (Compendium Proof Case)

The first real content authored into compendium packs. Broken and Masterwork are `materialSubtype` values on the Material AE (schema field established in Phase 2, §2.6). Phase 4 creates the default compendium entries and implements the sync logic that pulls them onto items.

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

**Two-way sync between `isBroken` and the Broken AE:**
- Setting `isBroken = true` on the item → enables the Broken AE (`disabled: false`)
- Setting `isBroken = false` → disables the Broken AE (`disabled: true`)
- Manually enabling the Broken AE → sets `isBroken = true` on the parent item
- Manually disabling the Broken AE → sets `isBroken = false`

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

- Sync logic lives on the item document class (e.g., `WeaponDnd35e._onUpdate()`, `_onCreateDescendantDocuments()`)
- `isMasterwork` stays as a boolean on `WeaponSystemModel` (and later `EquipmentSystemModel` in Phase 15)
- `isBroken` added to `PhysicalItemSystemModel` (all physical items can break)
- The compendium UUIDs for default broken/masterwork are stored as system constants (not hardcoded strings scattered through code)

---

## 4.10 Files to Create/Modify

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

## 4.11 Documentation Stubs (Ongoing)

Starting in Phase 4, create **journal entries in the dev world** that document each system component as it lands:

- **Material Pattern**: "Items and active effects, material subtypes, how multi-material stacking works"
- **Compendium System**: "Where SRD content lives, how to author new items for compendiums, origin tracking"
- **Bonus Type Stacking**: "How bonuses interact, why certain bonus types can't stack with each other"

These stubs are **rough and evolve** as subsequent phases add more complexity (action system, spells, enhancements, etc.). The intent is to give beta testers *something* to reference early, not polished final docs. Full documentation hardening happens in Phase 28.

---

## 4.12 Deferred to Phase 26

Everything listed here is deferred to Phase 26 (Compendium Browser & Management):
- Amalgamated cross-compendium browser (search across all packs)
- End-user compendium management (create/rename/delete user packs)
- Rich index configuration (full-text search, filter facets)
- Schema migration runner infrastructure (iterate + transform all docs)
- Compendium diff viewer (compare world doc vs compendium original)
- Compendium export/import tools for users

---

## 4.13 Completion Checklist

### ✅ Complete
- (None — Phase 4 has not started)

### ❌ Not Started (All Tasks for Phase 4)

**✅ COMMUNITY FEEDBACK RECEIVED & IMPLEMENTED:**
- [ ] **Canonical workflow established**: CSV + Dev Macro + Transformation Script (standard for all phases)
  - This is the primary approach for Phase 4, 5+, and Phase 27 migration
  - Alternative: Manual UI creation (single items, quick prototyping)
  - Dev tooling (macros) excluded from production builds
  - Status: ✅ IMPLEMENTED

**Compendium Directory & Pipeline:**
- [ ] Create `packs/` and `packs/_source/` directories
- [ ] Create `packs/.gitignore` to exclude compiled packs
- [ ] Create subdirectories: `_source/materials/`, `_source/weapons/`, `_source/feats/`, etc.
- [ ] Create `vite-plugin-compile-packs.ts` Vite plugin at project root
- [ ] Implement: custom Vite plugin with `writeBundle()` hook
- [ ] Implement: loop through pack directories and call `compilePack()`
- [ ] Integrate plugin into `vite.config.ts` (import and add to plugins array)
- [ ] Test build: `npm run build` invokes plugin, produces compiled packs in `packs/<pack>/`
- [ ] Verify `.gitignore` prevents compiled packs being committed
- [ ] Verify plugin logs progress during build

**Origin Tracking:**
- [ ] Add `system.origin` fields to all DataModels:
  - `origin.sourceId: string` (compendium UUID)
  - `origin.packId: string` (pack name)
  - `origin.importedAt: number` (timestamp)
- [ ] Implement auto-population when item imported from compendium
- [ ] Create `getCompendiumSource(item)` helper
- [ ] Create `isItemFromCompendium(item)` checker
- [ ] Test: Imported items maintain origin tracking through save/load

**Type-Safe UUID Helpers** in `src/helpers/uuid.mts`:
- [ ] Create `fromCompendiumUuid(uuid: string): Promise<Document>`
- [ ] Create `toCompendiumUuid(doc: Document): string`
- [ ] Create `resolveUuidSafe(uuid: string): Promise<Document | null>` (with error handling)
- [ ]Create `isValidUuid(uuid: string): boolean`
- [ ] Create `uuidToCompendiumRef(uuid: string): { packId, docId }`
- [ ] Test: Resolve UUIDs bidirectionally
- [ ] Test: Handle missing/invalid UUIDs gracefully

**Migration Version Field:**
- [ ] Add `system.migration.version: string` to all DataModels
- [ ] Auto-set during creation: `migration.version = game.system.version`
- [ ] Create `src/migrations/migrationRunner.mts` with runner function
- [ ] Implement: `migrateDocuments(docs[], fromVersion, toVersion)`
- [ ] Implement: `migrateDocument(doc, fromVersion, toVersion)`
- [ ] Integration: Call resolver in `ready` hook
- [ ] Test: Version field populated on existing Phase 1-3 documents
- [ ] Test: Migration can patch old documents

**Pack Metadata in system.json:**
- [ ] Add `packs` array to `system.json`:
  - `label`, `name`, `type`, `path` for each pack
- [ ] Register `materials` pack at minimum
- [ ] Verify Foundry loads packs on startup
- [ ] Test: Compendium tab shows all packs

**Content Authoring Setup:**
- [ ] Create `packs/_source/macros-dev/` directory (bootstrap, dev-only, not in prod)
- [ ] Create dev macro: `packs/_source/macros-dev/import-csv-items.json` (reads CSV, creates items)
  - Test: Run macro in dev world, verify items created with valid Foundry `_id`
- [ ] Create transformation scripts in `scripts/`:
  - [ ] `scripts/transform-weapons.mjs` (old D35E → dnd35e schema)
  - [ ] `scripts/transform-materials.mjs`
  - [ ] Document: How to add transformations for Phase 5+
- [ ] Update build system:
  - [ ] Modify `vite-plugin-compile-packs.ts`: add `configResolved()` hook to detect Vite's build mode
  - [ ] Update `package.json`: add `npm run build` (prod) vs `npm run build:dev` (dev) scripts
  - [ ] Add `.gitignore`: `packs/macros-dev/` (compiled LevelDB, dev-only)
- [ ] Test: `npm run build:dev` includes macros-dev ✅
- [ ] Test: `npm run build` excludes macros-dev ✅
- [ ] Test: Unpack macro-created items, verify JSON has Foundry `_id` + `slug`
- [ ] Test: Run transformation script, verify output JSON correct

**Validation & Build:**
- [ ] Install `@foundryvtt/foundryvtt-cli` (for packing/unpacking)
- [ ] Install `ajv` (for JSON schema validation)
- [ ] Create validation script: `npm run validate:packs`
  - Validates all `packs/_source/*/*.json` against schema
  - Checks `_id` format (16-char alphanumeric, required, unique per pack)
- [ ] Create npm scripts:
  - [ ] `build` → `npm run build:system-json && vite build` (prod, excludes dev packs)
  - [ ] `build:dev` → `npm run build:system-json -- --dev && vite build --mode dev` (dev, includes macros-dev)
  - [ ] `dev` → `npm run build:system-json -- --dev && vite --mode dev` (dev server)
  - [ ] `validate:packs` → validates all source JSON
  - [ ] `transform:weapons` → runs transformation script
- [ ] Test: `npm run build` succeeds, `packs/materials/` compiled exists
- [ ] Test: `npm run validate:packs` catches invalid `_id` format
- [ ] Test: CLI unpacking still works via `fvtt package unpack -n "materials"`
- [ ] Verify `.gitignore` prevents compiled packs being committed

**Broken & Masterwork Material Content:**
- [ ] Create Broken/Masterwork materials in-game first (following Workflow 2 CSV import or Workflow 3 manual UI)
- [ ] Create `packs/_source/materials/broken-weapon.json` (AE, -2 attack/damage)
  - Will have Foundry-generated 16-character `_id` from in-game creation
  - Schema validation will verify `_id` format
- [ ] Create `packs/_source/materials/broken-armor.json` (AE, halved AC, double ACP)
  - Foundry-generated `_id`
- [ ] Create `packs/_source/materials/masterwork-weapon.json` (AE, +1 attack/damage)
  - Foundry-generated `_id`
- [ ] Create `packs/_source/materials/masterwork-armor.json` (AE, -1 ACP)
  - Foundry-generated `_id`
- [ ] Each sets `materialSubtype` correctly (broken/masterwork)
- [ ] After creation in-game, unpack using `fvtt package unpack -n "materials"` to get source JSON with valid IDs
- [ ] Commit exported JSON files to version control
- [ ] Add `src/constants/compendiumUuids.mts` with Broken/Masterwork UUIDs (read from compiled pack)
- [ ] Test: Build compiles materials pack with all 4 entries
- [ ] Test: Verify compiled pack contains correct AE documents
- [ ] Test: Verify `_id` fields match unpacked source (consistent)

**Broken/Masterwork Sync Logic:**
- [ ] Add `isBroken: boolean` field to `PhysicalItemSystemModel` schema
- [ ] Add `isMasterwork: boolean` field (already exists, verify it's wired)
- [ ] Implement `ItemDnd35e._onCreate()`:
  - Get category (weapon/armor/etc.)
  - Fetch Broken AE from compendium
  - Create disabled copy on the item
- [ ] Implement `WeaponDnd35e._onUpdate()`:
  - If `isBroken` toggled on/off → enable/disable Broken AE
  - If `isMasterwork` toggled → enable/disable Masterwork AE
- [ ] Test: Toggling `isBroken` checkbox enables/disables broken effects
- [ ] Test: Toggling `isMasterwork` checkbox enables/disables masterwork effects
- [ ] Test: Effects apply correctly after sync

**Item Sheet UI Updates:**
- [ ] Add `isBroken` toggle checkbox to weapon/armor sheets
- [ ] Add `isMasterwork` toggle checkbox (already likely there, verify)
- [ ] Verify toggles trigger sync logic
- [ ] Test: UI changes sync effects on item

**Testing:**
- [ ] Build test: `npm run build` succeeds
- [ ] Verification: `packs/materials/` (compiled) exists and has content
- [ ] Integration: Create weapon → Broken AE auto-attached but disabled
- [ ] Integration: Toggle `isBroken` → effect disabled/enabled
- [ ] Integration: Toggle `isMasterwork` → effect disabled/enabled
- [ ] UUID test: `fromCompendiumUuid()` retrieves documents correctly
- [ ] Migration test: Old items/actors without migration version are patched
- [ ] Smoke test: System loads without console warnings about missing packs/UUIDs

**Documentation:**
- [ ] Document compendium source folder structure
- [ ] Document build process (source → compiled)
- [ ] Document origin tracking API
- [ ] Document UUID helper usage
- [ ] Create AUTHORING.md for contributors:
  - Emphasis: "CSV → Macro → Unpack → Script → Commit → Build"
  - Step-by-step: How to prepare CSV files (name, slug)
  - Step-by-step: How to run in-game macro
  - Step-by-step: How to run transformation script
  - How to extend transformation script for new fields
  - Common patterns and troubleshooting
- [ ] Create TRANSFORMATION.md for developers:
  - Pattern: CSV + Macro + Script = Canonical workflow
  - How to create transformation script for new content type
  - How to map old UUID → new slug for Phase 27 migration
  - JavaScript examples from scripts/transform-*.mjs
- [ ] Create CSV baseline examples in `docs/csv-templates/`:
  - `docs/csv-templates/weapons.csv` — baseline format (name, slug)
  - `docs/csv-templates/feats.csv`
  - `docs/csv-templates/races.csv`
  - `docs/csv-templates/classes.csv`
  - Include README explaining format
- [ ] Document macro code:
  - Store in `packs/_source/macros/import-csv-items.json` documentation
  - Show how to call macro from dev world
- [ ] Create journal entry stub in dev world: "Compendium System"
- [ ] Create journal entry stub in dev world: "Material Pattern & Stacking"

---

**This Phase Enables**:
- Phase 11 (Races) uses grant system with compendium UUIDs
- Phase 12 (Classes) uses grant system with compendium UUIDs
- Phase 26 (Compendium Browser) extends with end-user features
