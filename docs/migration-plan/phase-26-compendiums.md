# Phase 26: Compendium Browser & Management

**Status**: � Rough Sketch (200+ item checklist, compendium browser, version tracking)

> **Milestone**: Release  
> **Dependencies**: Phase 4 (Compendium Foundation), Phase 15+  
> **Goal**: Amalgamated cross-compendium browsing, end-user compendium management, rich index configuration, schema migration runner, and compendium diff tooling. Builds on Phase 4's pack/unpack pipeline and origin tracking.

> **Note**: The compendium build pipeline, origin tracking, UUID helpers, migration version field, and content authoring tooling were moved to Phase 4 (Compendium Foundation) during POC restructuring. This phase handles the user-facing features and migration execution.

---

## 24.1 Amalgamated Compendium Browser

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

## 24.2 Rich Index Configuration

Expand the minimal index fields from Phase 4 to support full-text search and filter facets:

```typescript
// Extended index fields per pack — beyond the minimal set in Phase 4
const RICH_INDEX_FIELDS = {
  weapons: ["system.subType", "system.damage.type", "system.price.value", "system.weaponGroups"],
  feats: ["system.featType", "system.prerequisites", "system.source"],
  spells: ["system.level", "system.school", "system.components", "system.castingTime"],
  // ...
};
```

## 24.3 End-User Compendium Management

- Track compendium source versions (which version of the system pack an item came from)
- "Check for updates" feature: compare user's compendium items against source packs
- Highlight items that have been modified locally vs source
- One-click update for items that haven't been customized
- Diff view for items that have local changes

## 24.4 Schema Migration Runner

The migration **runner** infrastructure. The version **field** exists from Phase 4.

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

## 24.5 Files to Create

| Action | Path |
|--------|------|
| Create | `src/apps/CompendiumBrowser.mts` + Vue component |
| Create | `src/helpers/compendiumManager.mts` — version tracking, update detection |
| Create | `src/migration/` — migration runner, per-version migration functions |
| Expand | Phase 4 pack index configuration with rich fields |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 26 has not started)

### ❌ Not Started (All Tasks for Phase 26)

**Compendium Browser Infrastructure:**
- [ ] Create `src/apps/CompendiumBrowser.mts` class
- [ ] Implement `async browse(options)` method
  - Parameter: documentType ('Item' | 'ActiveEffect')
  - Parameter: subtypes (optional filter, e.g., ['material'] for materials only)
  - Parameter: sources (optional, filter by compendium name, e.g., ['dnd35e.weapons', 'dnd35e.materials'])
  - Parameter: search (optional, text search query)
  - Parameter: filters (optional, type-specific filter criteria)
  - Return: Promise<BrowseResult[]> with results
- [ ] Implement `async addToDocument(uuid, targetDocument)` method
  - Parameter: uuid of item in compendium
  - Parameter: targetDocument (actor, item, etc. to add to)
  - Resolve uuid, clone item, add to target
  - Prevent duplicates (check for existing)
  - Return success/error
- [ ] Test: Browser instantiation

**Compendium Browser Vue Component:**
- [ ] Create `src/vue/apps/CompendiumBrowser.vue` extending ApplicationV2
- [ ] Implement filter UI:
  - Dropdown: document type selector
  - Checkboxes: subtype filters (weapons, armor, feats, etc.)
  - Checkboxes: source compendium filters
  - Text input: search box with live filter (debounced 300ms)
  - Advanced filter panel (optional, for attributes like level, rarity, etc.)
- [ ] Implement results list:
  - Paginated table/list (25 items per page)
  - Columns: name, type, source compendium, last modified
  - Click row to preview
  - Checkbox to select multiple items
- [ ] Implement preview pane:
  - Show selected item details
  - Display description/stats
  - "Add to [target]" button
  - "Open in compendium" button
- [ ] Implement drag-and-drop:
  - Drag item to character sheet inventory
  - Drag item to actor equipment slots
  - Drag spell to spellbook
- [ ] Test: Browser UI renders

**Integration with Item Sheets:**
- [ ] On weapon sheet: add "Browse Materials" button in material section
  - Click → open CompendiumBrowser filtered to materials
  - Select material → apply to weapon
- [ ] On armor sheet: add "Browse Materials" button
- [ ] On actor inventory tab: add "Browse Items" button
  - Filtered to appropriate item types (weapons, armor, loot)
  - Select → add to inventory
- [ ] Test: Browse buttons on sheets functional

**Integration with Spellbook:**
- [ ] On actor spellbook tab: add "Browse Spells" button per level
  - Click level 1 "Browse" → opens browser filtered to level 1 spells
  - Auto-filters by class (if prepared caster with specific class)
  - Select spell → add to spellbook (prepared or unprepared, depending on caster type)
- [ ] Test: Browse spells by level

**Rich Index Configuration (Expansion of Phase 4):**
- [ ] Extend minimal index fields from Phase 4
- [ ] For weapons compendium:
  - Index fields: system.subType, system.damage.type, system.price.value, system.weaponGroups, system.melee, system.ranged
- [ ] For armor/shields:
  - Index fields: system.ac, system.maxDex, system.armorCheckPenalty, system.spellFailure, system.price.value
- [ ] For feats:
  - Index fields: system.featType, system.prerequisites, system.source, system.level (if prereq level exists)
- [ ] For spells:
  - Index fields: system.level, system.school, system.components, system.castingTime, system.range, system.savingThrow.type
- [ ] For races:
  - Index fields: system.size, system.baseSpeed, system.languages
- [ ] For classes:
  - Index fields: system.classType, system.hitDice
- [ ] Update Phase 4 pack index builder to include rich fields
- [ ] Test: Index fields populated for all packs

**Full-Text Search Implementation:**
- [ ] Implement full-text search engine (Lunr.js or similar)
- [ ] Index all items across all packs
- [ ] Search logic:
  - Match in name (highest weight)
  - Match in description (medium weight)
  - Match in index fields (lower weight)
- [ ] Fuzzy matching for typos (optional)
- [ ] Test: Search returns correct items
- [ ] Test: Relevance ranking makes sense

**Compendium Version Tracking:**
- [ ] Create `src/helpers/compendiumManager.mts`
- [ ] Implement `trackCompendiumVersion(pack, version)`:
  - Store in game.settings (per world)
  - Format: {packId: versionString, ...}
  - Example: {"dnd35e.weapons": "14.1.0"}
- [ ] Implement `getPackVersion(packId)`:
  - Return version string or null
- [ ] Implement `setPackVersion(packId, version)`:
  - Update version tracking
- [ ] Test: Version tracking persists

**User Compendium Item Modification Tracking:**
- [ ] Track which items have been modified locally vs source
- [ ] Metadata on items: {sourceVersion, lastModified, localChanges: boolean}
- [ ] When item opened: check if sourceVersion < current pack version
  - If source updated and item not modified: mark as "can be updated"
  - If item modified locally: mark as "modified locally"
  - If source updated and item modified: mark as "modified + source updated"
- [ ] Test: Modification tracking works

**"Check for Updates" Feature:**
- [ ] Create `src/apps/CompendiumUpdateChecker.vue` component
- [ ] On actor/item open:
  - Query all source packs for items by UUID
  - Compare local item version/hash to source version
  - If different and not locally modified: offer "Update from source"
- [ ] Batch update UI:
  - Show list of items with available updates
  - Checkbox to select which to update
  - "Update Selected" button
  - Progress bar during update
- [ ] Test: Update checker identifies outdated items
- [ ] Test: Update button applies changes

**Diff View for Locally Modified Items:**
- [ ] Create `src/apps/CompendiumItemDiff.vue`
- [ ] Show side-by-side comparison:
  - Left: current local version
  - Right: source version
  - Highlight differences (fields that changed, additions, deletions)
- [ ] Allow selective application of changes:
  - Checkbox per field to apply or skip
  - "Apply Selected Changes" button
- [ ] Test: Diff shows correct changes
- [ ] Test: Selective update works

**Schema Migration Infrastructure:**
- [ ] Create `src/migration/MigrationRunner.mts`
- [ ] Implement `runMigrations()`:
  - Query all actors/items for system.migration.version field
  - Determine current system version (from system.json)
  - For each document: if doc version < system version, run migrations in sequence
  - Update document version after each successful migration
  - Log migration results
- [ ] Define migration structure:
  ```typescript
  interface Migration {
    version: string;  // e.g., "14.1.0"
    migrate: async (doc: Document) => Promise<Document>;
    description: string;
  }
  ```
- [ ] Implement `registerMigration(migration)`:
  - Add migration to registry
  - Validate version format (semver)
- [ ] Create global registry of all migrations
- [ ] Test: Migration infrastructure functional

**Per-Version Migration Functions (Stubs for Phase 26, expanded in Phase 27):**
- [ ] Create `src/migration/migrations/` directory
- [ ] Stub migration functions per version:
  - `migrate14_1_0.mts`
  - `migrate14_2_0.mts`
  - (Full migrations in Phase 27)
- [ ] Each migration file exports: `migrate(doc)` async function
- [ ] Migration functions are no-op stubs in Phase 26 (actual logic in Phase 27)
- [ ] Test: Migrations can be loaded

**World Migration Trigger:**
- [ ] On world initialization:
  - Check if user's world version < current system version
  - If different: prompt GM "Updates available, run migrations?"
  - If yes: run `MigrationRunner.runMigrations()`
  - Show progress during migration
  - Display summary after completion
- [ ] Add world version tracking:
  - Store in flag: `world.flags.dnd35e.migration.version`
  - Initialize to current system version on first load
- [ ] Test: Migration prompt appears when needed

**Compendium Migration Tool (UI, Stubs):**
- [ ] Create `src/apps/CompendiumMigrator.vue`
- [ ] UI for migrating compendium packs:
  - List of all installed packs (system + user + module)
  - Checkbox to select which packs to migrate
  - "Migrate Selected" button
  - Progress bar during migration
  - Results summary
- [ ] Backup option:
  - Before migration, create backup pack `[original-name]-backup`
  - Allow restoring from backup
- [ ] Stub: Migration logic in Phase 27
- [ ] Access: GMs menu → "Compendium Tools" → "Migrate Packs"
- [ ] Test: UI renders and allows pack selection

**System Settings Integration:**
- [ ] Add to `system.json`:
  ```json
  "settings": [
    {
      "key": "compendium.browser.suggestMatching",
      "scope": "world",
      "type": Boolean,
      "default": true,
      "label": "Suggest matching materials when adding items"
    },
    {
      "key": "compendium.browser.autoAddDependencies",
      "scope": "world",
      "type": Boolean,
      "default": false,
      "label": "Auto-add related items (feat prerequisites, material dependencies)"
    }
  ]
  ```
- [ ] Settings UI in world settings
- [ ] Test: Settings persist

**Module Compendium Support:**
- [ ] Automatically discover compendium packs from installed modules
- [ ] Include module packs in browser search (no manual registration needed)
- [ ] Mark packs by origin (system, world, module-name)
- [ ] Test: Module packs visible in browser

**Chat Card Display for Compendium Items:**
- [ ] When item added to inventory from browser, show chat card:
  - "Added [item name] to inventory"
  - Item thumbnail
  - Item type icon
- [ ] Test: Chat card displays on add

**Search Performance & Caching:**
- [ ] Implement search index caching:
  - Build index on first browser open (or on pack change)
  - Cache in game.settings
  - Invalidate on pack update
  - Rebuild only changed packs (if possible)
- [ ] Limit search results: return max 100 results, paginate
- [ ] Search debouncing: 300ms delay on typing before searching
- [ ] Test: Search < 200ms for typical queries
- [ ] Test: Large queries don't freeze UI

**Localization & i18n:**
- [ ] Add i18n keys: "Browse [type]"
- [ ] Add i18n keys: "Check for Updates", "Update from Source"
- [ ] Add i18n keys: "Modified Locally", "Source Updated"
- [ ] Add i18n keys: Filter labels, button labels
- [ ] Add i18n keys: Settings labels
- [ ] Update en.json

**Comprehensive Testing:**
- [ ] Unit test: CompendiumManager version tracking
- [ ] Unit test: Modification detection
- [ ] Unit test: Rich index field population
- [ ] Unit test: Full-text search algorithm
- [ ] Integration test: Browse weapons
  - All weapons visible
  - Filters work (damage type, weapon group, etc.)
  - Search finds item by partial name
- [ ] Integration test: Add item from browser to inventory
  - Item cloned correctly
  - Duplicates prevented
  - Chat card shown
- [ ] Integration test: Material browsing on weapon sheet
  - Browser filters to materials only
  - Select material → applies to weapon
  - Weapon changes visible
- [ ] Integration test: Update item from source
  - Outdated item flagged
  - Update applied correctly
  - Local changes preserved if modified
- [ ] Integration test: Diff view for modified items
  - Shows correct differences
  - Selective application works
- [ ] Integration test: Migration prompt on world load
  - Appears when needed
  - Can run migrations
  - World version updated
- [ ] Integration test: Module packs in browser
  - Module packs visible
  - Can add module items to inventory
- [ ] Edge case: Very large compendium (100+ items)
  - Browser still responsive
  - Search completes in < 500ms
  - Pagination works
- [ ] Edge case: Item with circular dependencies
  - Handle gracefully (don't create infinite loop)
- [ ] Edge case: Pack with corrupt data
  - Skip corrupted items, continue
- [ ] Smoke test: Browser with all system packs
  - All packs searchable
  - All item types browsable
  - No console errors
- [ ] Performance test: Browser opens < 1 second
- [ ] Performance test: Search 50 items < 200ms

**Documentation & User Guides:**
- [ ] Document browser usage: how to browse, filter, search
- [ ] Document adding items from browser
- [ ] Document update checker: checking for updates, diff view
- [ ] Document for GMs: managing compendiums, version updates
- [ ] Note limitations: Full migration in Phase 27, D35E import in Phase 27
