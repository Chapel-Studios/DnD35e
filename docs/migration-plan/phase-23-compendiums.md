# Phase 23: Compendium Infrastructure

> **Status**: Not started  
> **Dependencies**: Phase 10+  
> **Goal**: Build pipeline for compendium content, amalgamated cross-compendium browsing, end-user compendium management, and schema migration versioning.

---

## 23.1 Source-Controlled Content

**JSON files in source code → Foundry packs via build:**

```
src/packs/
├── weapons/
│   ├── longsword.json
│   ├── greatsword.json
│   └── ...
├── materials/
│   ├── adamantine.json
│   ├── cold-iron.json
│   └── ...
├── armor/
├── spells/
├── feats/
├── classes/
├── races/
└── ...
```

- Vite build step: compile JSON → Foundry NeDB/LevelDB packs
- PR workflow: edit JSON files, review diffs, merge
- Existing tool integration for JSON ↔ pack export/import

## 23.2 Amalgamated Compendium Browser

**The "click a button and browse all materials" feature:**

```typescript
class CompendiumBrowser {
  async browse(options: {
    documentType: 'Item' | 'ActiveEffect';
    subtypes?: string[];       // e.g., ['material'] for only materials
    sources?: string[];        // Filter by source compendium  
    search?: string;           // Text search
    filters?: FilterCriteria;  // Type-specific filters
  }): Promise<BrowseResult[]>;
  
  async addToDocument(uuid: string, targetDocument: Document): Promise<void>;
}
```

**UI Integration:**
- On weapon sheet material list: "Browse Materials" button → opens amalgamated browser filtered to materials
- On actor inventory: "Browse Items" button → opens browser filtered to items
- On actor spellbook: "Browse Spells" button → filtered by class & level
- Module compendiums included automatically — no manual registration needed

## 23.3 End-User Compendium Management

- Track compendium source versions (which version of the system pack an item came from)
- "Check for updates" feature: compare user's compendium items against source packs
- Highlight items that have been modified locally vs source
- One-click update for items that haven't been customized
- Diff view for items that have local changes

## 23.4 Schema Migration Versioning

This phase also houses the schema migration infrastructure:

```typescript
const MIGRATIONS: Migration[] = [
  { version: "14.1.0", migrate: migrateV14_1 },
  { version: "14.2.0", migrate: migrateV14_2 },
  // ...
];
```

- Track `system.migration.version` on every actor/item (field exists from Phase 4)
- On world load, run all migrations newer than the stored version
- Compendium items also get migrated when opened or on system update
- Migration from D35E pack tool: script to convert D35E JSON exports → dnd35e JSON format

## 23.5 Files to Create

| Action | Path |
|--------|------|
| Create | `src/packs/` — JSON source directories per type |
| Create | `build/compile-packs.js` — Vite plugin or build script to compile JSON → packs |
| Create | `src/apps/CompendiumBrowser.mts` + Vue component |
| Create | `src/helpers/compendiumManager.mts` — version tracking, update detection |
| Create | `src/migration/` — migration runner, per-version migration functions |
| Expand | Build pipeline — pack compilation in `vite.config.ts` |
