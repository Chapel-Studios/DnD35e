# Content Pipeline

> Source phases: 4, 26, 27, 29

The content pipeline covers how game content moves from source files to playable compendium packs, how users browse and search content, and how existing worlds migrate to the new system.

---

## Source → Compendium Build

SRD content is stored as human-editable JSON source files, compiled to Foundry LevelDB packs at build time.

```
/packs/_source/weapons.json        ← version-controlled, human-editable
     │
     └─→ [Vite build plugin]
           ├─ Validate against DataModel schema
           ├─ Generate stable UUIDs (content-hash based)
           ├─ Inject sourceId for origin tracking
           ├─ Build rich index fields (for compendium browser)
           └─ Write Foundry LevelDB pack

/packs/weapons.db                  ← build artifact, not version-controlled
     │
     └─→ game.packs.get('dnd35e.weapons')
```

### Origin Tracking

Every compendium item carries a `sourceId` flag indicating where it came from:

```typescript
{
  flags: {
    core: {
      sourceId: 'Compendium.dnd35e.weapons.longsword-001'
    }
  }
}
```

When an item is dragged from a compendium to an actor, the `sourceId` is preserved. This enables:
- Detecting which compendium version an item was imported from
- Offering upgrade prompts when compendium items change
- Linking in-game items back to their SRD source

---

## Compendium Browser

The compendium browser provides amalgamated cross-pack search with rich filtering. Rather than browsing one pack at a time, users search all packs simultaneously.

### Rich Index

Each pack configures which fields to index for fast filtering:

```typescript
// Per-pack index configuration
{
  'dnd35e.weapons': ['system.subType', 'system.damage.type', 'system.price', 'system.weaponGroups'],
  'dnd35e.feats':   ['system.featType', 'system.prerequisites', 'system.source'],
  'dnd35e.spells':  ['system.level', 'system.school', 'system.components', 'system.castingTime'],
}
```

### Search Architecture

```typescript
class CompendiumBrowser {
  // Index all packs at startup, cache results
  async buildIndex(): Promise<void> {
    for (const pack of game.packs) {
      const index = await pack.getIndex({ fields: this.getIndexFields(pack) });
      this._indexCache.set(pack.collection, index);
    }
    // Build full-text search index (Lunr or similar)
    this._searchIndex = this.buildSearchIndex(this._indexCache);
  }

  // Search with filters
  async browse(options: BrowseOptions): Promise<IndexEntry[]> {
    let results = this._getAllFromCache();
    if (options.documentType) results = results.filter(i => i.type === options.documentType);
    if (options.subtypes) results = results.filter(i => options.subtypes.includes(i.system.subtype));
    if (options.search) results = this._searchIndex.search(options.search);
    return results;
  }
}
```

The browser is used by:
- Players browsing available items
- Grant system's `choice-from-filter` during level-up
- GM placing items from compendium

---

## Migration Runner

World migration from legacy D35E data uses a version-keyed function registry. Each migration function transforms data from one version to the next.

### Version Tracking

Every document stores its migration version:

```typescript
system.migration.version: "14.1.0"
```

### Migration Registry

```typescript
const MIGRATIONS = {
  '14.0.1': migrateFrom14_0_0,
  '14.0.2': migrateFrom14_0_1,
  '14.1.0': migrateFrom14_0_2,
  // ...
};
```

### Migration Workflow (Non-Destructive)

```
1. Backup
   └─ Create world backup before migration begins

2. Transform
   FOR each actor/item in the world:
     IF document.system.migration.version < currentSystemVersion:
       FOR each migration from stored version to current:
         run migration.transform(document)
       Update document.system.migration.version

3. Validate
   └─ Run schema validation on transformed documents
   └─ Log warnings for fields that couldn't be migrated

4. Import
   └─ Save transformed documents to world
```

### Transform Pipeline

Complex migrations use a 7-stage pipeline:

```
1. Extract    → Pull raw data from legacy format
2. Normalize  → Standardize field names and types
3. Map        → Map old fields to new schema paths
4. Validate   → Check for required fields, valid ranges
5. Enrich     → Add computed/derived fields
6. Reconcile  → Resolve conflicts (duplicate IDs, missing refs)
7. Commit     → Write to new format
```

### Fallback Resolution

When migration encounters missing data (deleted compendium items, broken references):

```typescript
interface FallbackResolution {
  strategy: 'default' | 'search' | 'prompt' | 'skip';
  defaultValue?: any;           // for 'default' strategy
  searchPack?: string;          // for 'search' strategy
  promptMessage?: string;       // for 'prompt' strategy
}
```

The system tries to resolve automatically, logs what it couldn't resolve, and provides a post-migration report.

---

## SRD Housing

SRD reference content is generated from compendium data as a build step — not maintained as static documentation.

```
Compendium packs (weapons, feats, spells, classes)
     │
     └─→ [Build script]
           ├─ Extract items from packs
           ├─ Generate JournalEntry with rich HTML
           ├─ Build cross-links (feat → prerequisites, spell → components)
           ├─ Build search keywords
           └─ Create SRD compendium pack

/packs/srd.db → In-game searchable SRD journal
```

Cross-linking is data-driven: feats link to related feats and prerequisite chains, spells link to components and material items, classes link to class skills and bonus feat lists.

---

## Integration Points

| System | Integration |
|---|---|
| [Progression](progression-system.md) | Grant system references compendium UUIDs for class/race features |
| [Active Effects](active-effect-lifecycle.md) | Migrated AEs need bonusType and phase fields added |
| [Architecture Overview](architecture-overview.md) | Plain DataField schemas validate compendium data at build time |
