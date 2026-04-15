# Phase 30: Content Migration

**Status**: 📖 Rough Sketch (300+ item checklist, D35E→dnd35e migration, world transformer)

> **Milestone**: Release  
> **Dependencies**: Phase 26 (Compendium Browser)  
> **Goal**: Migration tools for D35E world data and compendiums. Automated transforms for all document types.

---
## Critical Context: Non-Destructive User-Facing Migration

**Key Technical Constraint**: Users **cannot** open existing D35E worlds in the new dnd35e system directly. The data models are fundamentally different (item names, field structures, effect representation, compendium organization). This is a **one-way migration** from old system to new, not an in-place upgrade.

### High-Level User Migration Workflow

Users will follow this workflow to migrate their D35E worlds:

1. **Backup Old World** (Standard Foundry Backup)
   - User opens their D35E world in Foundry
   - User creates a backup using Foundry's built-in backup system (Game Settings → Manage → Create Backup)
   - Foundry generates a `.zip` file containing all world data
   - User downloads backup to their computer (or accesses from Foundry data folder)

2. **Transform World Data** (Migration tool reads backup)
   - User runs migration tool (UI-based, no CLI required)
   - Points tool at the `.zip` backup file from D35E world
   - Tool extracts data from backup, validates it, shows preview of transform results
   - Example preview: "300 items found → 280 items will transform (weapon, spell, feat, etc.), 15 will be custom, 5 skipped"
   - Tool generates dnd35e-compatible JSON output file (dnd35e-world-import.json)
   - User can review transformations, make corrections if needed (JSON editor optional)

3. **Import into New World** (dnd35e system)
   - User creates a new blank world using dnd35e system
   - User opens the import UI, selects their transformed JSON file
   - System imports actors, items, scenes into the new world
   - User reviews results in-game, makes any manual adjustments

**Why this workflow**: 
- Uses Foundry's proven backup mechanism (no custom export tool needed)
- Keeps users out of CLI/command-line
- Allows data review/correction between transform and import steps
- Preserves old world intact and backed up for reference
- Leverages existing infrastructure users already trust

---

## 27.1 User-Facing Migration Strategy

### Design Principals

- **Leverage existing Foundry backups**: Use Foundry's built-in backup system instead of custom exports. Backups are already tested, validated, and trusted by users.
- **No CLI required**: UI-based tools only. Maximum file-system operation is selecting a backup ZIP file.
- **Non-destructive**: Preserve originals at every step. Backup never modified. Transformation generates new output file.
- **Transparent**: Show users what's being transformed, what's being dropped, what might need manual review (ambiguous item types, unsupported features).
- **Gradual**: Migrated data is usable immediately, but users can manually refine as they discover issues in play.

### Migration Backup Extraction (Phase 27.1a - Tool Implementation Deferred)

**What Foundry backup contains:**
- All actors (characters, NPCs)
- All items in all collections (actor-owned items, world items, compendiums)
- All scenes, tiles, tokens, drawings, lights, sounds, videos
- All journal entries, tables, macros
- All world settings and configuration
- Asset references (images, audio, etc.)

**How we read the backup:**
- User provides a `.zip` file from Foundry's backup system
- Tool extracts the ZIP to temporary directory
- Tool reads world.json and related object databases/JSON files
- Tool validates data integrity
- Tool builds transformation inputs from extracted backup data
- Tool cleans up temporary directory after processing

**Backup extraction validation:**
- Check ZIP structure (must contain `worlds/{worldName}/` directory)
- Validate world.json schema
- Verify all referenced documents present
- Check for data corruption or truncation
- Report any issues clearly to user before proceeding

### Migration Transform (Phase 27.1b - Detailed Mapping Deferred)

**High-level transformation tasks** (implementation details deferred until final item models exist):
- Validate source data (check for null fields, truncated docs, etc.)
- Map item types (D35E item types → dnd35e item types, assign to loot/ignored where needed)
- Transform field names (D35E: `system.weaponType` → dnd35e: `system.weaponCategory`, etc.)
- Convert buff/enhancement/material items → Active Effects (most complex step)
- Normalize bonus types (D35E system structures → dnd35e stacking engine)
- Update compendium references (old pack UUIDs → new pack UUIDs where SRD matches)
- Flag ambiguous data for manual review (custom item types, unsupported features)

**Transformation does NOT include** (deferred to Phase 28 or later):
- Full D35E content SRD matching (e.g., matching "my custom Fireball to the Fireball from SRD compendium")
- Character art/portrait migration (art references not portable)
- Macros & script fragments (d35e-specific D&D formulas won't work in dnd35e)
- Spell animations, special Foundry extensions (system-specific)

### Migration Import (Phase 27.1c - Foundry Integration)

**User-facing import interface** (in-Foundry UI running on dnd35e system):
- UI shows transformed JSON file selection
- Preview of what will be imported (actor count, item count, scenes, etc.)
- Import progress (with rollback if critical error)
- Post-import report: successful imports vs failed imports with reasons
- Drag-and-drop to reorder actor placement if desired

---

## 27.2 Data Transform Map

| D35E Source | dnd35e Target | Notes |
|-------------|---------------|-------|
| Weapon item | Weapon item | Field renames. WeaponStats mixin fields. |
| Equipment item (`equipmentType: 'armor'`) | **Armor item** | Split from Equipment. ArmorStats mixin. |
| Equipment item (`equipmentType: 'shield'`) | **Shield item** | Split from Equipment. ArmorStats + WeaponStats. |
| Equipment item (wondrous/clothing) | Equipment item | Slotted gear. Enhancement sub-items → Enhancement AEs. |
| Loot item (`subType: 'ammo'`) | **Ammo item** | New type. WeaponStats override fields from `bonusAmmo*`. |
| Loot item (non-ammo, non-container) | Loot item | `subType` → `lootSubtype` (configurable). `valuable` → lootSubtype + fullResalePrice. |\n| Loot item (`subType: 'container'` or has capacity) | **Container item** | New type. AE propagation, type restrictions, weight overrides. |
| Consumable item | Consumable item | `spell` reference → `actionSnapshot` (snapshot created from spell data). |
| Class item | Class item | Restructured progression. |
| Spell item | Spell item | Restructured. |
| Feat item (`featType: classFeature`) | **ClassFeature item** | New type split from Feat. |
| Feat item (other) | Feat item | `changes` → AE pattern. |
| Buff item | **Buff Active Effect** | Item → AE migration. Timeline, damage pool, shapechange fields preserved. |
| Attack item | **Dropped** | Actions on weapons/actors via Action System (Phase 8). |
| Race item | Race item | Restructured with grants. |
| Enhancement item (sub-items in `enhancements.items[]`) | **Enhancement Active Effect** | JSON array → Foundry AE on parent item. |
| Material item | **Material Active Effect** | Already done (Phase 2). |
| Aura item | **Aura Active Effect** | Item → AE via Region system (Phase 18). |
| Alignment item | Actor property | Dropped as type. Actor field + weapon AE flags + DR bypass. |
| Damage-type item | Config constant | Dropped as type. Hardcoded defaults + setting overrides. |
| Full-attack item | **Dropped** | Dynamic from equipped weapons + BAB iteratives. |
| Card item | Card item | Carries forward. |
| Valuable item | Loot (`lootSubtype: \"Valuables\"`, `fullResalePrice: true`) | Merged into Loot. |

## 27.3 In-World Version Migration

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

## 27.4 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/migration/backup/BackupExtractor.mts` — extract & validate Foundry backup ZIP files |
| Create | `src/migration/transform/D35ETransformer.mts` — transform extracted backup data to dnd35e format |
| Create | `src/migration/import/Dnd35eImporter.mts` — import dnd35e-world-import.json into world |
| Create | `src/apps/MigrationTransformDialog.vue` — transform UI (select backup, preview, run transform) |
| Create | `src/apps/MigrationImportDialog.vue` — import UI (select JSON, preview, run import) |
| Create | `src/migration/d35eToJson.mts` — transformer pipeline (detailed implementation) |
| Create | `src/migration/world/WorldMigrator.mts` — world data transform |
| Create | `src/migration/compendiums/CompendiumMigrator.mts` — pack transform |
| Use | `src/apps/CompendiumBrowser.mts` (from Phase 26) |
| Create | `docs/MIGRATION_GUIDE.md` — user-facing step-by-step guide |
| Create | `docs/MIGRATION_MAP.md` — D35E → dnd35e type/field reference |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 27 has not started)

### ❌ Not Started (All Tasks for Phase 27)

**Backup Extraction & Validation (Phase 27.1a):**
- [ ] Design backup file selector UI
  - File picker: Allow user to select .zip file from Foundry backup
  - Show file info: backup date, world name, file size
  - Validation button: "Validate Backup" to check ZIP structure before proceeding
  - Clear error messages if backup is invalid (wrong format, corrupted, etc.)
- [ ] Implement backup ZIP extraction
  - Read .zip file safely (no path traversal vulnerabilities)
  - Extract to temporary directory
  - Validate directory structure (must contain worlds/{worldName}/ at minimum)
  - Read world.json to extract metadata
  - List all document types found (actors, items, scenes, etc.) with counts
  - Store extracted data in temp cache for next phase
- [ ] Data validation after extraction
  - Check world.json valid JSON schema
  - Verify all referenced actor/item/scene documents exist
  - Check for data corruption (truncated JSON, missing fields)
  - Report validation results: "✓ Valid" or detailed error list
  - Flag suspicious data for user review (e.g., negative quantities, missing UUIDs)
- [ ] Clean temp files
  - On success: clean temp directory after data loaded into tool state
  - On error: preserve temp directory for debugging (user can clean manually)
  - Provide clear messaging when temp space is freed
- [ ] Testing:
  - Extract test Foundry backup successfully
  - Validate valid backup ZIP passes checks
  - Reject invalid/corrupted ZIPs with clear errors
  - Verify all data types extracted correctly
  - Check temp file cleanup works

**User-Facing Migration Transform Tool (Phase 27.1b):**
- [ ] Design transform UI (reads extracted backup)
  - Show summary of extracted data: "Found X actors, Y items, Z scenes"
  - Preview mode: Show transform summary before running
    - "300 items found"
    - "280 items will transform (weapon, spell, feat, etc.)"
    - "15 items will be created as custom (unknown type)"
    - "5 items will be skipped (unsupported, no equivalent type)"
  - Transform button: Run full transformation
  - Progress indicator with per-step details (transforming actors, items, scenes, etc.)
  - Post-transform report:
    - Items transformed successfully
    - Items created as custom (list of names for review)
    - Items skipped (list + reason)
    - Any errors with error details
  - Output file: Save dnd35e-world-import.json to user's downloads or Foundry data folder
  - Option to review/edit output JSON if desired
- [ ] Implement D35E → dnd35e transformation runner
  - Load extracted backup data
  - For each actor: apply actor transform logic
  - For each item: apply item type transform + field mappings
  - For each scene/token: preserve or adapt scene data as needed
  - Compile output to dnd35e-compatible JSON
  - Save to dnd35e-world-import.json
  - Generate transformation report
- [ ] Error handling & recovery
  - Catch and log transformation errors without stopping whole process
  - Mark problematic items for manual review
  - Provide user-friendly error messages (not stack traces)
  - Allow retry on individual items if needed
- [ ] Data validation:
  - Check all items have required fields post-transform
  - Verify compendium UUID format where applicable
  - Check schema compliance (all items match dnd35e schemas)
  - Generate warnings/errors if validation fails
- [ ] Testing:
  - Transform extracted backup successfully
  - Output JSON is dnd35e schema-compliant
  - Error handling works on corrupt data
  - Performance acceptable (100-item transform < 10 seconds)

**User-Facing Migration Import Tool (Phase 27.1c - Foundry Integration):**
- [ ] Create in-Foundry import UI (imported by dnd35e system)
  - New world option: "Import from D35E Migration" (alongside blank world)
  - Or menu option in new/existing dnd35e world: "Import... → D35E World Migration"
  - File selector: User points to dnd35e-world-import.json from previous step
  - Preview:
    - Actor count to import
    - Item count to import
    - Scene count to import
    - Estimated import time
    - Compatibility warnings if any
  - Import progress bar
  - Post-import report:
    - Actors imported: count, list
    - Items imported: count grouped by type
    - Scenes imported: count
    - Any import errors with item name & reason
    - "Migration Complete" success message
- [ ] Implement import logic
  - Parse dnd35e-world-import.json
  - For each actor: create Foundry actor document
  - For each item: create Foundry item document (owned or world)
  - For each scene: create scene with tokens
  - Update actor.system.migration.version to current
  - Update item.system.migration.version to current
  - Log all imports
- [ ] Rollback capability
  - If critical error occurs during import, provide "Undo" option
  - Store pre-import state, allow user to revert
  - Preserve all newly-created documents for potential cleanup
- [ ] Integration with Phase 26 Compendium Browser
  - After import, user can browse compendiums
  - "Find compendium match" button on custom items created during migration
  - Manual linking of custom items to compendium sources
  - Tools for replacing custom items with compendium equivalents
- [ ] Testing:
  - Import test JSON into empty dnd35e world successfully
  - All actors, items, scenes created
  - Versions updated to current
  - No console errors during import
  - Performance acceptable (100-item import < 10 seconds)

**Migration Documentation & User Guide:**
- [ ] Create user-facing guide: "Migrating Your D35E World"
  - Step 1: Create backup of D35E world using Foundry's backup system (screenshot showing how)
  - Step 2: Run migration transform tool, select backup ZIP file (with screenshots)
  - Step 3: Review transform preview, approve transformation (with screenshots)
  - Step 4: Import transformed JSON into dnd35e system (with screenshots)
  - Troubleshooting: Common issues & solutions
  - FAQ: What data is preserved? What's lost? What becomes custom?
  - FAQ: Where do I find my backup file?
  - FAQ: Can I restore to D35E if something goes wrong? (Yes, backup is safe)
- [ ] Document data preservation:
  - Actor names, ability scores, HP, BAB preserved
  - Item names preserved (with type changes noted)
  - Scene layouts preserved (may need token art updates)
  - Chat log entries imported (reference only)
  - Notes/journals imported where possible
- [ ] Document data loss/limitation:
  - D35E-specific macros/scripts won't work (need rewrite)
  - Art/portraits: references preserved but may need path updates
  - Unsupported item types become custom items
  - Complex homebrew may need manual adjustment
- [ ] Document data transformation:
  - Buff items → Buff Active Effects (automatically created)
  - Material items → Material Active Effects (linked to items)
  - Enhancement items → Enhancement Active Effects
  - Feat changes → Active Effect changes
  - Custom fields → Custom properties or dropped (documented per type)
- [ ] Migration map reference document
  - D35E item type → dnd35e item type mapping table
  - Field-by-field mapping for common item types
  - Examples of transformed items
  - Decision flow: "Is my item X supported?"
- [ ] Localization:
  - All UI strings localized (en.json, other languages as available)
  - User guide available in system languages
  - Error messages helpful and translated

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
