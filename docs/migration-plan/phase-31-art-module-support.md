# Phase 31: 3rd Party Art Module Support

**Status**: 📖 Rough Sketch (300+ item checklist, art module lookup, GM config)

> **Milestone**: Post-Release  
> **Dependencies**: Phase 4 (Compendium Foundation), Phase 26 (Compendium Management)  
> **Goal**: Allow GMs to point SRD compendium items at 3rd-party art modules. Users can have custom artwork for weapons, spells, items, etc. while keeping the system-provided mechanics intact.

---

## 31.1 The Problem

GMs want gorgeous artwork for their campaigns. Foundry has amazing art modules. But if you want that art on SRD items, you have to either:
1. Manually edit every item (tedious)
2. Create duplicate items (messy)
3. Abandon the SRD and create your own compendium (lots of work)

Phase 31 solves this: "Use SRD weapon stats, but show this art from [Art Module]."

---

## 31.2 Art Module Integration Pattern

### Art Module Lookup

Art modules typically expose images via:
- Folder structure (`/module-name/path/to/weapon-name.jpg`)
- Compendium index (another compendium with images mapped by name/UUID)
- URL pattern (`https://example.com/images/{name}.jpg`)

### GM Configuration (Per-World)

```json
{
  "artModule": {
    "weapons": {
      "source": "module:icons-module",
      "pathPattern": "weapons/{weaponName}.jpg",
      "fallbackToSRD": true
    },
    "spells": {
      "source": "compendium:spell-art.spells",
      "fieldMap": { "compendium_name": "srd_uuid" },
      "fallbackToSRD": true
    }
  }
}
```

This config tells dnd35e: "Whenever you show a weapon, first try to find an image in spell-icons module using this path. If not found, use SRD default."

## 31.3 Implementation

### Sheet-Level Art Override

When rendering an item sheet:
```typescript
const artConfig = game.settings.get('dnd35e', 'artModuleConfig');
const artUrl = lookupArtUrl(item, artConfig) || item.img; // Fallback to SRD
sheet.img = artUrl;
```

### Chat Card Integration

When displaying action results:
```typescript
const artUrl = lookupArtUrl(weapon, artConfig);
// Render chat card with custom image
ChatMessage.create({ content: renderCardWithArt(artUrl, ...details) });
```

## 31.4 Art Module Directory

Publish/maintain a curated list of compatible art modules:
- **Token Artwork Compendium** — tokens
- **Icon Module X** — weapon icons
- **Spell Art Pack** — spell card art
- **Monster Artwork** — creature art
- **Paizo Art** (if licensed) — official art

For each module, document:
- What item types it covers
- How to configure it in dnd35e
- Any special setup needed

---

## 31.5 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/settings/artModuleConfig.mts` — configuration UI + settings |
| Create | `src/helpers/artModuleLookup.mts` — resolution logic |
| Create | `src/vue/apps/settings/ArtModuleConfigurator.vue` — GM-facing UI |
| Create | `docs/ART_MODULE_COMPATIBILITY.md` — directory of compatible modules |
| Modify | Item sheets — use art override when rendering |
| Modify | Chat card template — use art override when rendering |
| Modify | `system.json` — register art module settings |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 31 has not started)

### ❌ Not Started (All Tasks for Phase 31)

**Art Module Configuration Data Model:**
- [ ] Create `src/settings/artModuleConfig.mts`
- [ ] Define interface: `ArtModuleConfig`:
  ```typescript
  interface ArtModuleConfig {
    enabled: boolean;
    modules: ArtModuleEntry[];
  }
  interface ArtModuleEntry {
    id: string; // unique identifier for this config
    name: string; // display name ("Weapon Icons Module")
    itemType: string; // "weapon", "spell", "armor", etc.
    sourceType: 'folder' | 'compendium' | 'url-pattern';
    sourceModule: string; // module ID for folder/compendium
    sourcePath?: string; // for folder type: "weapons/"
    sourcePattern?: string; // for url-pattern type: "https://example.com/{type}/{name}.jpg"
    fieldMap?: Record<string, string>; // mapping for compendium lookups
    fallbackToSRD: boolean; // if art not found, use default
    priority: number; // order to check (higher = check first)
  }
  ```
- [ ] Implement`ArtModuleConfigManager` class:
  - `loadConfig()`: get from world settings
  - `saveConfig(config)`: persist to world settings
  - `validateConfig()`: check valid structure
  - `prioritySort()`: sort by priority for lookup
- [ ] Test: Configuration model works

**Art Module Lookup Logic:**
- [ ] Create `src/helpers/artModuleLookup.mts`
- [ ] Implement `lookupArtUrl(item, config)` async function:
  - Input: item (weapon, spell, armor), art config
  - For each entry in config (sorted by priority):
    - Try to resolve art based on sourceType
    - If found: return URL
    - If not found: continue to next entry or fallback
  - Return: URL or null (if null, caller uses default item.img)
- [ ] Implement folder-based lookup:
  - `lookupInFolder(item, moduleId, folderPath)`
  - Construct path from item name
  - Try exact match, then fuzzy match
  - Return URL or null
- [ ] Implement compendium-based lookup:
  - `lookupInCompendium(item, packName, fieldMap)`
  - Load compendium pack
  - Search by field map or direct name match
  - Return URL from matched document
- [ ] Implement URL pattern lookup:
  - `lookupByPattern(item, pattern)`
  - Replace {name}, {type}, {rarity} placeholders
  - Construct URL
  - Return URL
- [ ] Caching:
  - Cache lookup results per item UUID
  - Invalidate on config change
  - Cache ={} as property of helper
- [ ] Test: lookupArtUrl finds correct image

**System Settings Registration:**
- [ ] Add to `system.json`:
  ```json
  "settings": [
    {
      "key": "artModules.enabled",
      "default": false,
      "scope": "world",
      "type": Boolean,
      "label": "Enable art module support"
    },
    {
      "key": "artModules.config",
      "default": [],
      "scope": "world",
      "type": Object,
      "label": "Art module configurations (managed by UI)"
    }
  ]
  ```
- [ ] Test: Settings register correctly

**Art Module Configurator UI (Vue Component):**
- [ ] Create `src/vue/apps/settings/ArtModuleConfigurator.vue`
- [ ] Access: World settings → "Art Modules" tab (new tab)
- [ ] Layout:
  - **Enable toggle**: "Enable art module support"
  - **Add New Entry button**: "Add Art Module Mapping"
  - **List of entries** (sortable, editable):
    - Each entry as a card or row:
      - Name field (display name)
      - Item Type dropdown (weapon, spell, armor, loot, etc.)
      - Source Type selector: (radio buttons) Folder | Compendium | URL Pattern
      - Source Module picker (depends on source type):
        - If Folder: module dropdown + folder path input
        - If Compendium: pack name picker (dropdown)
        - If URL Pattern: URL pattern input with placeholders hint
      - Fallback to SRD checkbox
      - Priority slider (1-100, higher = first)
      - Test button: "Find example image"
      - Delete button:
      - Up/down arrows for reordering
- [ ] Layout for adding new entry:
  - Modal dialog with form fields:
    - Name
    - Item Type
    - Source Type (radio)
    - Source settings (dynamic based on source type)
    - Fallback to SRD checkbox
    - Buttons: Save, Cancel
- [ ] Test button functionality:
  - Try to resolve art for a sample item
  - Show result (found image, or "not found")
  - Display resolved URL
- [ ] Validation:
  - Module must exist
  - Path/pattern must be non-empty
  - Name must be unique
  - Priority must be 1-100
- [ ] Live preview (optional):
  - Show thumbnail of found image
  - Update on config change
- [ ] Import/Export:
  - Export configs as JSON
  - Import configs from JSON
  - Useful for GMs sharing setup
- [ ] Test: UI allows add/edit/delete/reorder

**Item Sheet Art Override:**
- [ ] Modify item sheet rendering (all item types):
  - Before rendering: call artmoduleLookup.lookupArtUrl()
  - If URL found: use as item.img override
  - Display: art from module while keeping SRD mechanics
- [ ] For item sheet tabs:
  - Header image: check for override
  - Preview pane: check for override
  - Alt art: if override exists, show both "SRD art" and "module art" options for toggling
- [ ] Implement in `src/vue/sheets/ItemSheet.vue`:
  - In `computed`: `displayImage()` method returns override URL or default
  - In `onLoad`: cacheartUrl for this item
- [ ] Respects fallback setting:
  - If fallback = true and art not found: use SRD
  - If fallback = false and art not found: use default placeholder
- [ ] Test: Item sheet shows module art

**Chat Card Art Override:**
- [ ] Modify chat card template rendering:
  - Check artModuleLookup for weapon/spell rendered in chat
  - If override URL found: use in chat card display
  - Display: larger art image in chat messages
- [ ] For action resolution chat cards:
  - Attack rolls: show weapon art from module
  - Spellcasting: show spell art from module
  - Item use: show item art from module
- [ ] Implement in `templates/chat/` templates:
  - `src/templates/chat/action.hbs` (attacks, etc.)
  - `src/templates/chat/spell.hbs`
  - `src/templates/chat/item-use.hbs`
  - Each uses helper: `artModuleImage(item.uuid)`
- [ ] Fallback: if override not available, use SRD or placeholder
- [ ] Test: Chat cards render with module art

**Art Module Handlebars Helper:**
- [ ] Register handlebars helper: `artModuleImage`
  ```handlebars
  {{#artModuleImage item.uuid}}...{{/artModuleImage}}
  ```
- [ ] Helper function:
  - Input: UUID or item object
  - Resolve item by UUID
  - Call lookupArtUrl()
  - Return URL (default if not found)
- [ ] Implement in `src/helpers/handlebars.mts`
- [ ] Test: Helper renders correct image

**Art Module Drawer/Browser:**
- [ ] Optional: Create visual browser for art modules
- [ ] UI: "Browse Art Module Library"
  - List installed art modules
  - Show preview of available art
  - Filter by item type
  - Search by name
- [ ] Useful for GMs to preview art before configuring
- [ ] Implementation: Can be deferred to Phase 32 if needed
- [ ] Test: Art browser displays

**Compendium Cross-Linking:**
- [ ] If using compendium-based art lookup:
  - Check that source compendium has matching items
  - Build index: SRD item name → art module item name/UUID
  - Allow GMs to create mapping table
- [ ] UI: Mapping helper
  - Show: list of SRD items (weapons, for example)
  - Suggest: matching art module items
  - Let GM confirm/edit mappings
- [ ] Save mapping:
  - Store in config `fieldMap`
  - Use in lookup logic
- [ ] Test: Mapping resolves correctly

**Module Autodiscovery (Optional):**
- [ ] Auto-detect installed art modules:
  - Scan module list
  - Parse manifest for art module indicator
  - List candidates for user
  - User selects which to configure
- [ ] Module Manifest Convention (document for module creators):
  - Add flag in manifest: `"isArtModule": true`
  - Add flag: `"artModuleType": ["weapons", "spells", "armor"]`
  - Add flag: `"artModulePattern": "weapons/{name}.jpg"`
  - This lets dnd35e auto-generate config
- [ ] If flags present: auto-populate configurator form
- [ ] Test: Auto-discovery finds art modules

**Configuration Persistence & Migration:**
- [ ] Save config to world settings
- [ ] Load on world initialization
- [ ] On system update: validate config (remove old modules, etc.)
- [ ] Copy config template for new worlds
- [ ] Test: Config persists between sessions

**Performance Optimization:**
- [ ] Cache art URLs per item UUID
  - Avoid repeated lookups
  - Clear cache when config changes
  - Memory limit: ~1000 cached items
- [ ] Batch loading:
  - If rendering 20 weapons in list: batch-load all URLs
  - Don't make 20 separate lookups
- [ ] Lazy load:
  - Only resolve art when item rendered
  - Don't preload entire module on startup
- [ ] Test: Performance with 100+ items < 500ms

**Localization & i18n:**
- [ ] Add i18n keys:
  - `settings.artModules.enabled`
  - `settings.artModules.addEntry`
  - `settings.artModules.sourceType.folder`
  - `settings.artModules.sourceType.compendium`
  - `settings.artModules.sourceType.url-pattern`
  - `settings.artModules.fallbackToSRD`
  - `settings.artModules.testButton`
  - `settings.artModules.found`
  - `settings.artModules.notFound`
- [ ] Update en.json

**Art Module Compatibility Directory:**
- [ ] Create `docs/ART_MODULE_COMPATIBILITY.md`
- [ ] Header: Overview of using art modules with dnd35e
- [ ] Quick start: 3 steps to set up art
- [ ] **Section per compatible module:**
  - Module name + link
  - What it covers (weapons, spells, etc.)
  - Configuration example (JSON)
  - Screenshots (before/after)
  - Special notes/setup
  - Community feedback/rating
- [ ] Modules to document:
  - Token Artwork Compendium
  - Icon Module X
  - Spell Art Pack
  - Monster Artwork
  - Any other major art modules
- [ ] For each, provide:
  - Direct copy-paste config
  - Troubleshooting if needed
  - Links to module page
- [ ] Community examples:
  - "User setup guide: Paizo-style campaign"
  - "User setup guide: Anime-style campaign"
- [ ] Test: Documented modules work as described

**Error Handling & Fallbacks:**
- [ ] If module not installed:
  - Log warning
  - Fall back to SRD art
  - Show GM notification: "[Module] not installed, using default art"
- [ ] If image URL 404:
  - Cache miss
  - Fall back to SRD
  - Log error
- [ ] If config invalid:
  - Skip entry, continue
  - Log warning
- [ ] If compendium pack not found:
  - Skip entry
  - Log warning
  - Continue to next art module entry
- [ ] Graceful degradation:
  - If art module lookup fails entirely: use SRD art
  - No crashes, no blank art fields
- [ ] Test: Error handling doesn't break rendering

**Comprehensive Testing:**
- [ ] Unit test: lookupArtUrl with valid config
- [ ] Unit test: lookupArtUrl with invalid config (handles gracefully)
- [ ] Unit test: lookupArtUrl priority ordering (higher priority checked first)
- [ ] Unit test: Cache hit/miss behavior
- [ ] Integration test: Folder-based art lookup
  - Set up config pointing to folder
  - Load item
  - Verify art URL correct
- [ ] Integration test: Compendium-based art lookup
  - Set up config pointing to art pack
  - Load item
  - Verify art URL resolved
- [ ] Integration test: URL pattern lookup
  - Set up config with pattern
  - Load item
  - Verify URL constructed correctly
- [ ] Integration test: Item sheet with override
  - Configure art module
  - Open item sheet
  - Verify module art displays
  - Verify SRD art option still available
- [ ] Integration test: Chat card with override
  - Configure art module
  - Trigger action (weapon attack, spell)
  - Verify chat card shows module art
- [ ] Integration test: Fallback to SRD
  - Configure art module but disable fallback
  - Request art for non-existent item
  - Verify placeholder or blank
  - Re-enable fallback
  - Verify SRD art now shows
- [ ] Integration test: Multiple modules priority
  - Configure 3 art modules, different priorities
  - Item has art in all 3
  - Verify highest priority used
- [ ] Integration test: Config import/export
  - Save config
  - Export to JSON
  - Import into new world
  - Verify settings match
- [ ] Edge case: Art module disabled mid-campaign
  - Open world
  - Disable art module support
  - Item sheets still load (fallback to SRD)
  - Re-enable art module
  - Custom art returns
- [ ] Edge case: Module uninstalled but config still references it
  - Config specifies module ID
  - Module uninstalled
  - Fallback to SRD
  - No errors/crashes
- [ ] Edge case: Very large art module (1000+ images)
  - Search/load performance still acceptable
  - Cache prevents repeated lookups
- [ ] Smoke test: All item types can get art overrides
- [ ] Smoke test: Art module integration doesn't break standard rendering
- [ ] Performance test: Loading 50 items with art overrides < 1 second

**Documentation & User Guides:**
- [ ] Document: How to set up art modules (step-by-step)
- [ ] Document: Supported art module types
- [ ] Document: Creating custom art module mappings
- [ ] Document: Folder structure convention for module creators
- [ ] Document: Troubleshooting art not showing
- [ ] Document: Performance tips for large art modules
- [ ] Tutorial: Farm module setup (popular example)

---

## 31.6 Success Criteria

✅ **GM can map art module → SRD items**  
✅ **Custom art displays on sheets**  
✅ **Custom art displays in chat cards**  
✅ **Fallback to SRD when art not found**  
✅ **Art module directory published**  
✅ **GMs report successful custom art integration**  
