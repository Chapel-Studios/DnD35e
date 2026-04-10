# Phase 4: Compendium Foundation

**Status**: 📋 Outlined (CompendiumIndex, UUID helpers, pack structure)

> **Milestone**: POC  
> **Dependencies**: Phase 1, Phase 2, Phase 3  
> **Goal**: Establish the compendium build pipeline (JSON source → LevelDB packs), origin tracking for items moving between compendiums and world, type-safe UUID helpers, migration version field on documents, and content authoring tooling. Proves the pipeline with **Broken and Masterwork material effects** — the first compendium-sourced auto-managed AEs. This phase does NOT include the amalgamated browser or end-user compendium management (Phase 26).

---

## 4.1 Why Compendiums Early

The grant system (Phases 11–12, Races & Classes) references items by compendium UUID. If compendiums don't exist yet, grant UUIDs have nothing to resolve. Origin tracking must be established before actors start acquiring items, so every document knows where it came from.

Additionally, this gives us a solid content authoring workflow from the start — every subsequent phase that adds a new item type (feats, races, classes, spells) can immediately author SRD entries as compendium source JSON.

---

## 4.2 Source Data Format

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

## 4.3 Pack/Unpack Pipeline

### Packing (Source → LevelDB)

Integrated into the Vite build pipeline:

```typescript
// vite-plugin-compile-packs.ts
// On build: read packs/_source/**/*.json → compile to packs/<packName>/ (LevelDB)
// Uses Foundry's CompendiumCollection.createDocuments() or direct LevelDB writes
```

- Runs as a Vite plugin during `vite build`
- Each top-level folder under `packs/_source/` becomes a compendium pack
- Pack metadata defined in `system.json` under `packs[]`
- Dev mode: hot-reload watches `_source/` for changes

### Unpacking (LevelDB → Source)

CLI script for extracting existing packs back to source JSON:

```bash
npm run unpack -- --pack weapons
# Reads packs/weapons/ (LevelDB) → writes packs/_source/weapons/*.json
```

Useful for:
- Importing existing content from D35E packs
- Round-tripping after manual edits in Foundry's UI
- Ensuring source JSON stays canonical

---

## 4.4 Origin Tracking

When a document moves from a compendium to the world (or vice versa), track where it came from:

```typescript
// On every document (actor, item, etc.)
interface OriginTracking {
  // The original compendium source UUID (e.g., "Compendium.dnd35e.weapons.Item.abc123")
  sourceId: string | null;

  // Whether this document has been modified since it was pulled from the compendium
  // Computed by comparing system data hash against source
  isModified: boolean;
}
```

### Implementation

```typescript
// In Dnd35eDocumentMixin or base document class
static async _onCreateDocuments(documents, context) {
  // If created from a compendium (context.fromCompendium), stamp sourceId
  for (const doc of documents) {
    if (context.fromCompendium) {
      await doc.setFlag("dnd35e", "sourceId", context.sourceUuid);
    }
  }
}
```

### Use Cases
- **Update detection**: "This longsword was imported from SRD weapons. A newer version is available."
- **Diffing**: Show what fields were changed from the compendium original
- **Re-import**: Replace a modified world document with the latest compendium version
- **Content migration** (Phase 27): Know which documents came from which packs for migration transforms

---

## 4.5 Type-Safe UUID Helpers

Centralized UUID resolution with TypeScript generics:

```typescript
// src/helpers/uuid.mts
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

These are used by the grant system (Phases 11–12) when races/classes reference compendium items by UUID.

---

## 4.6 Migration Version Field

Establish the migration version tracking field on every document. The actual migration **runner** (iterate all docs, execute transforms) is deferred to Phase 27.

```typescript
// In every DataModel's defineSchema()
schema.migration = new foundry.data.fields.SchemaField({
  version: new foundry.data.fields.NumberField({
    required: true,
    nullable: false,
    initial: 0,
  }),
});
```

- Every document tracks `system.migration.version`
- When a migration transform runs (Phase 27), it stamps the new version
- On world load, documents with `migration.version < currentVersion` are candidates for migration
- The version field exists from Phase 4 onward so ALL subsequently created documents have it

---

## 4.7 Compendium Index Configuration

Minimal index configuration for Phase 4. Rich search indexes are deferred to Phase 26 (amalgamated browser).

```jsonc
// system.json packs entry
{
  "packs": [
    {
      "name": "weapons",
      "label": "DND35E.CompendiumWeapons",
      "path": "packs/weapons",
      "type": "Item",
      "system": "dnd35e",
      // Minimal index fields — enough for basic sidebar display
      "flags": {
        "dnd35e": {
          "indexFields": ["system.subType", "system.price.value"]
        }
      }
    }
  ]
}
```

---

## 4.8 Content Authoring Tooling

Dev scripts for creating and validating compendium source files:

```bash
# Create a new compendium entry from a template
npm run pack:new -- --type weapon --name "Longsword"
# → Creates packs/_source/weapons/longsword.json with schema skeleton

# Validate all source JSON against DataModel schemas
npm run pack:validate
# → Checks every JSON file against its type's defineSchema()

# Build all packs (also runs during vite build)
npm run pack:build

# Unpack a specific pack to source
npm run pack:unpack -- --pack weapons
```

### Validation
- Schema validation runs against the TypeScript DataModel definitions
- Checks for: missing required fields, invalid field types, orphaned UUIDs, duplicate `_id` values
- Runs in CI as a pre-commit check

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

### Masterwork AE — Sync Logic

Masterwork AE does **not** exist on the item by default. It's created on demand:

**Simple path** (checkbox):
1. User checks `isMasterwork` on the item sheet
2. System calls `fromCompendiumUuid()` → fetch matching masterwork-{category}.json
3. Creates the AE on the item (enabled)
4. Stamps origin tracking

**Custom path** (manual add):
1. User drags a custom Masterwork material from a compendium (or creates one manually)
2. System detects a Material AE with `materialSubtype: 'masterwork'` was added
3. Auto-sets `isMasterwork = true` on the parent item
4. System does **not** auto-add the default — the custom one takes precedence

**Removal sync:**
- Setting `isMasterwork = false` → removes all Masterwork AEs from the item
- Removing the last Masterwork AE → sets `isMasterwork = false`

Masterwork changes use `bonusType: 'masterwork'` — resolved independently from standard material stacking.

### Implementation Notes

- Sync logic lives on the item document class (e.g., `WeaponDnd35e._onUpdate()`, `_onCreateDescendantDocuments()`)
- `isMasterwork` stays as a boolean on `WeaponSystemModel` (and later `EquipmentSystemModel` in Phase 15)
- `isBroken` added to `PhysicalItemSystemModel` (all physical items can break)
- The compendium UUIDs for default broken/masterwork are stored as system constants (not hardcoded strings scattered through code)

---

## 4.10 system.json Pack Registration

```jsonc
// system.json
{
  "packs": [
    {
      "name": "weapons",
      "label": "DND35E.CompendiumWeapons",
      "path": "packs/weapons",
      "type": "Item",
      "system": "dnd35e"
    },
    {
      "name": "feats",
      "label": "DND35E.CompendiumFeats",
      "path": "packs/feats",
      "type": "Item",
      "system": "dnd35e"
    },
    {
      "name": "races",
      "label": "DND35E.CompendiumRaces",
      "path": "packs/races",
      "type": "Item",
      "system": "dnd35e"
    },
    {
      "name": "classes",
      "label": "DND35E.CompendiumClasses",
      "path": "packs/classes",
      "type": "Item",
      "system": "dnd35e"
    },
    {
      "name": "materials",
      "label": "DND35E.CompendiumMaterials",
      "path": "packs/materials",
      "type": "ActiveEffect",
      "system": "dnd35e"
    }
  ]
}
```

Start with weapon/feat/race/class/materials packs for POC. Additional packs (spells, equipment, monsters) added in Beta phases.

---

## 4.11 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `packs/_source/` — compendium source directory structure |
| Create | `packs/_source/materials/broken-weapon.json` — default Broken AE for weapons |
| Create | `packs/_source/materials/broken-armor.json` — default Broken AE for armor |
| Create | `packs/_source/materials/masterwork-weapon.json` — default Masterwork AE for weapons |
| Create | `packs/_source/materials/masterwork-armor.json` — default Masterwork AE for armor |
| Create | `src/build/vite-plugin-compile-packs.ts` — Vite plugin for pack compilation |
| Create | `scripts/pack-unpack.ts` — CLI unpack script |
| Create | `scripts/pack-new.ts` — CLI template generator |
| Create | `scripts/pack-validate.ts` — CLI schema validation |
| Create | `src/helpers/uuid.mts` — type-safe UUID helpers |
| Create | `src/constants/compendiumUuids.mts` — constants for default broken/masterwork UUIDs |
| Modify | `vite.config.ts` — register compile-packs plugin |
| Modify | `system.json` — add `packs[]` entries (including materials pack) |
| Modify | All DataModel `defineSchema()` methods — add `migration.version` field |
| Modify | `Dnd35eDocumentMixin` — add origin tracking in `_onCreateDocuments` |
| Modify | `src/entities/items/baseItem/ItemDnd35e.mts` — `_onCreate()` pulls Broken AE from compendium |
| Modify | `src/entities/items/weapon/WeaponDnd35e.mts` — `_onUpdate()` / `_onCreateDescendantDocuments()` sync logic |
| Modify | `src/entities/items/components/Physical/data/PhysicalItemSystemModel.mts` — add `isBroken` field |
| Modify | Item sheet Vue components — `isMasterwork` checkbox, `isBroken` toggle |

---

## 4.12 Documentation Stubs (Ongoing)

Starting in Phase 4, create **journal entries in the dev world** that document each system component as it lands:

- **Material Pattern**: "Items and active effects, material subtypes, how multi-material stacking works"
- **Compendium System**: "Where SRD content lives, how to author new items for compendiums, origin tracking"
- **Bonus Type Stacking**: "How bonuses interact, why certain bonus types can't stack with each other"

These stubs are **rough and evolve** as subsequent phases add more complexity (action system, spells, enhancements, etc.). The intent is to give beta testers *something* to reference early, not polished final docs. Full documentation hardening happens in Phase 28.

---

## 4.13 Deferred to Phase 26

Everything listed here is deferred to Phase 26 (Compendium Browser & Management):
- Amalgamated cross-compendium browser (search across all packs)
- End-user compendium management (create/rename/delete user packs)
- Rich index configuration (full-text search, filter facets)
- Schema migration runner infrastructure (iterate + transform all docs)
- Compendium diff viewer (compare world doc vs compendium original)
- Compendium export/import tools for users

---

## Completion Checklist

### ✅ Complete
- (None — Phase 4 has not started)

### ❌ Not Started (All Tasks for Phase 4)

**Compendium Directory & Pipeline:**
- [ ] Create `packs/` and `packs/_source/` directories
- [ ] Create `packs/.gitignore` to exclude compiled packs
- [ ] Create subdirectories: `_source/materials/`, `_source/weapons/`, `_source/feats/`, etc.
- [ ] Create `src/build/vite-plugin-compile-packs.ts` Vite plugin
- [ ] Implement: recursively read `packs/_source/**/*.json`
- [ ] Implement: group by top-level folder → derive pack names
- [ ] Implement: compile JSON → LevelDB format
- [ ] Integrate plugin into `vite.config.ts`
- [ ] Test build: `npm run build` produces compiled packs in `packs/<pack>/`
- [ ] Verify `.gitignore` prevents compiled packs being committed

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

**CLI Scripts:**
- [ ] Create `scripts/pack-new.ts` — template generator
  - Usage: `npm run pack:new -- --type weapon --name longsword`
- [ ] Create `scripts/pack-validate.ts` — schema validator
  - Validates all source JSON, reports errors
- [ ] Create `scripts/pack-build.ts` — manual pack build (also runs in Vite)
- [ ] Create `scripts/pack-unpack.ts` — unpack compiled packs to source (for diffs)
- [ ] Test: Each script works correctly

**Broken & Masterwork Material Content:**
- [ ] Create `packs/_source/materials/broken-weapon.json` (AE, -2 attack/damage)
- [ ] Create `packs/_source/materials/broken-armor.json` (AE, halved AC, double ACP)
- [ ] Create `packs/_source/materials/masterwork-weapon.json` (AE, +1 attack/damage)
- [ ] Create `packs/_source/materials/masterwork-armor.json` (AE, -1 ACP)
- [ ] Each sets `materialSubtype` correctly (broken/masterwork)
- [ ] Add `src/constants/compendiumUuids.mts` with Broken/Masterwork UUIDs
- [ ] Test: Build compiles materials pack with all 4 entries
- [ ] Test: Verify compiled pack contains correct AE documents

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
- [ ] Document compendium content authoring guide
- [ ] Create AUTHORING.md for contributors
- [ ] Create journal entry stub in dev world: "Compendium System"
- [ ] Create journal entry stub in dev world: "Material Pattern & Stacking"

---

**This Phase Enables**:
- Phase 11 (Races) uses grant system with compendium UUIDs
- Phase 12 (Classes) uses grant system with compendium UUIDs
- Phase 26 (Compendium Browser) extends with end-user features
