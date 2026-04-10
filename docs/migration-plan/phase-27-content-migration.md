# Phase 27: Content Migration

**Status**: � Rough Sketch (300+ item checklist, D35E→dnd35e migration, world transformer)

> **Milestone**: Release  
> **Dependencies**: Phase 26 (Compendium Browser)  
> **Goal**: Migration tools for D35E world data and compendiums. Automated transforms for all document types.

---

## 24.1 Data Transform Map

| D35E Source | dnd35e Target |
|-------------|---------------|
| Weapon item | Weapon item (field renames) |
| Equipment item | Equipment item |
| Loot item | Loot item |
| Consumable item | Consumable item |
| Class item | Class item (restructured progression) |
| Spell item | Spell item (restructured) |
| Feat item | Feat item (changes → AE pattern) |
| Buff item | **Buff Active Effect** ← item to AE migration |
| Attack item | Attack item (actions via Action System) |
| Race item | Race item (restructured with grants) |
| Enhancement item | **Enhancement Active Effect** ← item to AE |
| Material item | **Material Active Effect** ← already done |
| Aura item | **Aura Active Effect** ← item to AE |
| Alignment item | Actor property (dropped as type) |
| Damage-type item | Constant (dropped as type) |
| Full-attack item | Action Chain (dropped as type) |
| Card item | Defer or drop |
| Valuable item | Loot subtype |

## 24.2 World Migration

```
migrateWorld()
├── Check system.migration.version vs current
├── For each actor: migrateActor()
│   ├── Transform system data fields
│   ├── For each item: migrateItem()
│   │   ├── Transform item data
│   │   └── Convert "changes" → AE changes
│   └── Convert buff items → buff AEs
├── For each scene: migrateScene()
│   └── For each token: migrateTokenData()
├── For each compendium: migrateCompendium() (if user opts in)
└── Update system.migration.version
```

## 24.3 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/migration/d35eToJson.mts` — transformer pipeline |
| Create | `src/migration/world/WorldMigrator.mts` — world data transform |
| Create | `src/migration/compendiums/CompendiumMigrator.mts` — pack transform |
| Use | `src/apps/CompendiumBrowser.mts` (from Phase 26) |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 27 has not started)

### ❌ Not Started (All Tasks for Phase 27)

**D35E Item Type Transform Map (Authorization):**
- [ ] Define transform map: D35E item type → dnd35e item type
  - D35E.weapon → dnd35e.weapon (direct)
  - D35E.loot → dnd35e.loot (direct)
  - D35E.feat → dnd35e.feat (direct)
  - D35E.spell → dnd35e.spell (direct) + spellbook entry
  - D35E.class → dnd35e.class (specific classes only, not custom)
  - D35E.race → dnd35e.race (specific, curated selection)
  - D35E.equipment → dnd35e.equipment (direct)
  - D35E.consumable → dnd35e.consumable (direct)
  - D35E.backpack → dnd35e.container (container subtype)
  - D35E.buff → dnd35e.buff (direct)
  - D35E.condition → dnd35e.condition (direct)
  - D35E.material → dnd35e.material (direct)
  - D35E.skill → *skip* (D&D 3.5e skills are handled in class/feat)
  - D35E.language → *skip* (races handle languages)
  - D35E.trait → dnd35e.trait (if system supports)
  - D35E.customItem → dnd35e.loot (fallback)
- [ ] Document map: create file `docs/MIGRATION_MAP.md` for reference

**Data Field Transform Matrix (Per Item Type):**
- [ ] Weapon transform:
  - D35E: name → dnd35e: name
  - D35E: system.damage.type → dnd35e: system.damage.type (normalize if needed)
  - D35E: system.price → dnd35e: system.price (convert gp values)
  - D35E: system.weight → dnd35e: system.weight
  - D35E: system.quantity → dnd35e: system.quantity
  - D35E: system.description → dnd35e: system.description
  - D35E: system.damageBonus → *create* dnd35e: system.bonuses.weapon (consolidate with other bonuses)
  - Map D35E custom fields → dnd35e compendium entries if available
- [ ] Armor transform:
  - D35E: name → dnd35e: name
  - D35E: system.ac → dnd35e: system.ac
  - D35E: system.maxDex → dnd35e: system.maxDex
  - D35E: system.price → dnd35e: system.price
  - D35E: system.weight → dnd35e: system.weight
  - D35E: system.enchantment → dnd35e: *create linked item* (material or enhancement)
- [ ] Feat transform:
  - D35E: name → dnd35e: name
  - D35E: system.featType → dnd35e: system.featType (preserve)
  - D35E: system.description → dnd35e: system.description
  - D35E: system.prerequisites → dnd35e: system.prerequisites (normalize format)
  - D35E: system.customTag → *map to* dnd35e compendium feat if exists (otherwise custom)
- [ ] Spell transform:
  - D35E: name → dnd35e: name
  - D35E: system.level → dnd35e: system.level
  - D35E: system.school → dnd35e: system.school
  - D35E: system.components → dnd35e: system.components (normalize V/S/M)
  - D35E: system.description → dnd35e: system.description
  - D35E: system.castingTime → dnd35e: system.castingTime
  - *create* spellbook entry (add to actor's spellbook of matching caster type)
- [ ] Consumable transform:
  - D35E: name → dnd35e: name
  - D35E: system.consumableType → dnd35e: system.subtype (potion/scroll/wand/etc.)
  - D35E: system.price → dnd35e: system.price
  - D35E: system.quantity → dnd35e: system.quantity
  - D35E: system.effect → *map to* action chain script (if structured effect data)
- [ ] Race/Class transform (if applicable):
  - D35E: system.data → *extract relevant* (size, speed, languages, traits)
  - *skip* outdated/custom classes not in dnd35e
- [ ] Buff/Condition transform:
  - D35E: name → dnd35e: name
  - D35E: system.bonusType → dnd35e: system.bonusType (align with Phase 20 27-type enum)
  - D35E: system.condition → dnd35e: system.conditionType (align with Phase 20 conditions)

**D35E → dnd35e Data Transformer Pipeline (Core):**
- [ ] Create `src/migration/d35eToJson.mts`
- [ ] Implement `class D35ETransformer`:
  - Constructor: `new D35ETransformer(sourceDoc, systemVersion)`
  - Property: sourceDoc (D35E item/actor)
  - Property: targetVersion (what version of dnd35e to target, e.g., "14.1.0")
  - Property: logs (list of warnings/info during transform)
- [ ] Implement `transform()` async method:
  - Step 1: Determine item type (use transform map)
  - Step 2: Normalize data fields (call specific transformer per type)
  - Step 3: Handle linked items (compendium lookup, or fallback to custom)
  - Step 4: Validate result schema
  - Step 5: Return transformed object
- [ ] Implement per-type transformers:
  - `transformWeapon(sourceWeapon)` → dnd35e weapon object
  - `transformArmor(sourceArmor)` → dnd35e armor object
  - `transformFeat(sourceFeat)` → dnd35e feat object
  - `transformSpell(sourceSpell, actor?)` → dnd35e spell object + spellbook entry
  - `transformConsumable(sourceConsumable)` → dnd35e consumable object
  - `transformBuff(sourceBuff)` → dnd35e buff object
  - `transformCondition(sourceCondition)` → dnd35e condition object
  - `transformClass(sourceClass)` → dnd35e class object (if recognized)
  - `transformRace(sourceRace)` → dnd35e race object (if recognized)
- [ ] Test: Transformer instantiation

**Field Normalization Functions:**
- [ ] Implement `normalizePrice(d35ePrice)`:
  - Convert string prices (e.g., "10 gp 5 sp") → numeric gp value
  - Return number (gp)
- [ ] Implement `normalizeWeight(d35eWeight)`:
  - Convert string weights → numeric lbs or kg
  - Determine system unit preference (Phase 1 setting)
  - Return number
- [ ] Implement `normalizeDamageType(d35eDmgType)`:
  - Map D35E damage types (bludgeoning, piercing, slashing, cold, fire, etc.) → dnd35e equivalents
  - Return normalized type string
- [ ] Implement `normalizeBonusType(d35eBonusType)`:
  - Map D35E bonus types → dnd35e enum (from Phase 20: 27 types)
  - Return enum value
- [ ] Implement `normalizeComponents(d35eComponents)`:
  - Normalize spell components (V, S, M, F, XP)
  - Return object {verbal, somatic, material, focus, xpCost}
- [ ] Implement `normalizeCastingTime(d35eCastingTime)`:
  - Parse strings like "1 standard action", "1 minute", "10 minutes"
  - Return object {time: number, unit: "action" | "minute" | "hour" | ...}
- [ ] Test: Each normalization function for typical inputs

**Compendium Lookup & Fallback:**
- [ ] Implement `lookupInCompendium(sourceItemName, itemType)`:
  - Search dnd35e compendium packs for matching item
  - Match on name (exact or fuzzy)
  - Return foundry CompendiumDocument or null if not found
- [ ] If found: return compendium UUID (use source pack item, avoid duplicate data)
- [ ] If not found:
  - Log warning: "Item not found in compendium: [name]"
  - Create custom item instead (transform and save as custom)
  - Track custom items for user review (end of migration)
- [ ] Prioritize lookup: system packs > world compendiums > module packs
- [ ] Test: Lookup finds common items

**World Migration Runner (Core):**
- [ ] Create `src/migration/world/WorldMigrator.mts`
- [ ] Implement `class WorldMigrator`:
  - Constructor: `new WorldMigrator(world, targetVersion)`
  - Property: world (Foundry world object)
  - Property: targetVersion
  - Property: migrationLog (detailed log of all changes)
- [ ] Implement `migrateWorld()` async method:
  - Step 1: Get all actors in world
  - Step 2: For each actor: call migrateActor()
  - Step 3: Get all items in world (stored items, not in compendiums)
  - Step 4: For each item: transform and update in-world
  - Step 5: Save migration log to file/database
  - Return summary
- [ ] Implement `migrateActor(actor)` async method:
  - Deep clone actor document
  - Transform actor data (name, description, portrait, token, etc.)
  - Transform actor items (inventory):
    - For each item: call D35ETransformer
    - Update item in actor's inventory
  - Transform actor classes:
    - For each class: transform class data
    - Update class levels
  - Transform actor features (feats, abilities):
    - For each feature: transform
    - Update actor features
  - Update actor.system.migration.version to targetVersion
  - Save actor
- [ ] Test: Actor migration (single actor, all items)

**Actor Data Field Transform:**
- [ ] Actor name: preserve
- [ ] Actor type: D35E actor type (character/npc) → dnd35e equivalent
- [ ] Actor portrait/token:
  - Preserve image paths
  - Check paths exist in new system
- [ ] Actor character data:
  - Ability scores (copy directly if same structure)
  - Hit points (copy, system will recalculate if needed)
  - Skill ranks/proficiencies (copy with normalization)
  - Saving throws (copy or recalculate)
  - Base attack bonus (copy, Phase 22 will recalculate)
  - Combat info (AC, initiative, etc. — recalculate in Phase 1)
- [ ] Actor flags: preserve custom flags
- [ ] Test: Actor data preserves correctly

**Compendium Migration Runner:**
- [ ] Create `src/migration/compendiums/CompendiumMigrator.mts`
- [ ] Implement `class CompendiumMigrator`:
  - Constructor: `new CompendiumMigrator(targetVersion)`
  - Property: targetVersion
  - Property: migrationLog
- [ ] Implement `migrateCompendiums(packs)` async method:
  - Parameter: packs (list of compendium pack names to migrate, e.g., ['dnd35e.weapons', 'dnd35e.feats'])
  - For each pack:
    - Create backup pack: `[pack-name]-backup-[timestamp]`
    - Migrate all items in pack
    - Save results
  - Return summary with items migrated, items failed, items created as custom
- [ ] Implement `migratePack(packName)` async method:
  - Get all documents in pack
  - For each document: apply schema migration
  - Update version metadata
  - Save pack
- [ ] Backup strategy:
  - Before migration: snapshot entire pack → new backup pack
  - Backup pack read-only (locked)
  - User can restore from backup any time
- [ ] Test: Pack migration (single pack)

**Batch vs. Selective Migration:**
- [ ] UI option: Migrate entire world (all actors + items)
- [ ] UI option: Migrate selected actors only
- [ ] UI option: Migrate selected packs only
- [ ] Progress tracking: show items processed, % complete
- [ ] Test: Batch migration option

**Error Handling & Recovery:**
- [ ] Validate transformed documents before saving:
  - Check schema matches dnd35e schema
  - Check required fields present
  - Check no circular references
- [ ] On validation error:
  - Log detailed error message
  - Save item as custom with flag `_migrationError: true`
  - Continue with next item (don't stop entire migration)
- [ ] On fatal error (database error, etc.):
  - Roll back: restore from backup
  - Report error to user
  - Halt migration
- [ ] Create error report:
  - List items that failed to migrate
  - List items created as custom
  - List warnings (missing compendium matches, etc.)
- [ ] Test: Error handling on corrupt item
- [ ] Test: Recovery from partial migration

**Custom Item Tracking & Review:**
- [ ] Track all custom items created during migration:
  - Items not found in compendium
  - Items with migration errors
  - Items with unsupported data types
- [ ] Create summary report:
  - List custom items by count
  - Group by reason (not in compendium, error, etc.)
  - Include source item name and type
- [ ] Add to migration results UI:
  - "X items migrated from D35E"
  - "Y items created as custom (review needed)"
  - List custom items for user inspection
- [ ] Test: Custom item list generated correctly

**Migration Log & Audit Trail:**
- [ ] Log structure:
  - Timestamp
  - Item name, type, ID
  - Transformation applied
  - Result (success, skipped, custom)
  - Any warnings/errors
- [ ] Save migration log:
  - Option 1: World flag (world.flags.dnd35e.migration.log)
  - Option 2: Local database table
  - Option 3: Export as .json file download
- [ ] UI: GMs can review migration log
  - Filter by result (success, error, custom)
  - Filter by item type
  - Search by name
- [ ] Test: Migration log captures all operations

**Per-Version Migration Functions (Stubs from Phase 26, Stubs for Future Phases):**
- [ ] Migration from schema version X → X+1
- [ ] Each migration in `src/migration/migrations/migrateX_Y_Z.mts`
- [ ] Example structure (stub):
  ```typescript
  export async function migrate14_1_0(doc: Document) {
    // Handle changes between 14.0.0 → 14.1.0
    // (actual logic filled in when changes made)
    return doc;
  }
  ```
- [ ] Test: Migration functions registered and callable

**System Settings for Migration:**
- [ ] Add to `system.json`:
  ```json
  "settings": [
    {
      "key": "migration.d35eSource",
      "scope": "world",
      "type": String,
      "default": "D35E",
      "label": "Source system for world (for D35E data lookup)"
    },
    {
      "key": "migration.autoLookupCompendium",
      "scope": "world",
      "type": Boolean,
      "default": true,
      "label": "Auto-lookup items in dnd35e compendiums during migration"
    },
    {
      "key": "migration.createCustomOnMiss",
      "scope": "world",
      "type": Boolean,
      "default": true,
      "label": "Create custom items if not found in compendiums"
    }
  ]
  ```
- [ ] Settings UI in world settings
- [ ] Test: Settings persist

**Integration with Phase 26 Compendium Browser:**
- [ ] After migration, user can use Compendium Browser to:
  - Find better matches for custom items
  - Replace custom items with compendium versions
  - Manually link items to compendium sources
- [ ] Add "Find Compendium Match" button on custom items:
  - Opens Compendium Browser filtered to same type
  - User selects best match
  - Replace custom with compendium version
  - (Implement in Phase 26 extension if needed)
- [ ] Test: Browser integration works post-migration

**Migration Progress & Status UI:**
- [ ] Create `src/apps/MigrationProgress.vue`:
  - Header: "Migrating world data..."
  - Progress bar (% complete)
  - Status text: "Processing actor 5 of 12..."
  - List of processed items (optional, scrollable)
  - Cancel button (if cancellable)
- [ ] On completion:
  - Show summary
  - List items migrated, custom, failed
  - "View Migration Log" button
  - "Show Details" (expand custom items list)
- [ ] Test: Progress UI updates correctly

**Localization & i18n:**
- [ ] Add i18n: "Migrating World Data"
- [ ] Add i18n: "X items migrated successfully"
- [ ] Add i18n: "Y items created as custom"
- [ ] Add i18n: "Migration completed"
- [ ] Add i18n: "Error during migration: [error]"
- [ ] Add i18n: Filter labels (result type, item type)
- [ ] Add i18n: "Find Compendium Match"
- [ ] Update en.json

**Comprehensive Testing:**
- [ ] Unit test: D35ETransformer weapon → dnd35e weapon
- [ ] Unit test: D35ETransformer spell → dnd35e spell
- [ ] Unit test: Normalization functions (price, weight, damage type, etc.)
- [ ] Unit test: Compendium lookup for existing item
- [ ] Unit test: Compendium lookup miss (fallback to custom)
- [ ] Integration test: Migrate single actor (all items)
  - Actor items transform correctly
  - Items match dnd35e schema
  - Actor version updated
- [ ] Integration test: Migrate world (all actors)
  - All actors processed
  - Custom items tracked
  - Migration log complete
- [ ] Integration test: Migrate compendium pack
  - All items in pack transformed
  - Backup created
  - Can restore from backup
- [ ] Integration test: Error recovery
  - Corrupt item handled gracefully
  - Migration continues
  - Error logged
- [ ] Integration test: Custom item review
  - Custom items list generated
  - Matches count in summary
  - Can filter by type
- [ ] Edge case: Actor with 50+ items
  - All items migrate correctly
  - No performance degradation
- [ ] Edge case: Item with circular dependencies
  - Handle gracefully (don't copy circular refs)
- [ ] Edge case: Item with unsupported feature (Phase 24 psionics in non-psion actor)
  - Safely skip or normalize
- [ ] Smoke test: Migrate small test world
  - 3-5 actors, 20-30 items
  - No console errors
  - Migration log valid
- [ ] Performance test: Migrate 100-item world < 30 seconds
- [ ] Performance test: Migrate large pack (500+ items) < 60 seconds

**Documentation & User Guides:**
- [ ] Document migration process: step-by-step for GMs
- [ ] Document limitations: what data is preserved vs converted
- [ ] Document custom item follow-up: how to find/replace custom items
- [ ] Document backup/restore: how to restore from backup if needed
- [ ] Document troubleshooting: common migration errors and fixes
- [ ] Migration map reference: D35E → dnd35e type mappings
