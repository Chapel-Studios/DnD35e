# POC Phase 6: Actor Foundation

**Status**: 📋 Outlined (Actor schema, multiclass stacking, ability scores)

> **Milestone**: POC  
> **Dependencies**: Phase 1, Phase 3  
> **Goal**: A character actor has ability scores, BAB, HP, flat AC, saves, speed, size, and an inventory with equipped weapon tracking. All stats are stored as formula-ready fields that Phase 8 (Action System) consumes via `#self.*` contexts.

> **Action System note**: BAB is stored on the actor even before classes compute it (Phase 12). The Actor schema defines the fields that become `#self.abilities.str.mod`, `#self.bab`, `#self.attributes.ac.*`, `#self.saves.*` — all referenced by action formulas.

---

## Open Questions

Questions organized into groups for serial resolution. As each group is resolved, its items move to the relevant detail section and the group is marked ✅.

### Group A: Deferred Property Philosophy ✅

> **Architecture Decision: Shell-Now, Derive-Later**
>
> The actor schema includes the *shell* for every field that has a reasonable default or a partial derivation available now. Properties get full derivation logic when the phase that provides the source data arrives. This differs from the strict "no property until consumer exists" rule used for items — actors benefit from having their stat block visible on the character sheet even before classes/races/etc. fill in the computed parts.
>
> **Examples**: AC exists now as `10 + DEX mod`. When Equipment arrives, armor/shield bonuses layer in. When Races arrive, size modifiers layer in. The field was always there — only its derivation grows.

**Resolved decisions:**

- [x] **Level**: Placeholder derived property, hardcoded to `1`. Classes phase replaces with real derivation from class item HD. Needed because HP max formula uses level.
- [x] **Size**: Default `medium` on model. Races modify it (likely through an active effect). Carrying capacity and AC size modifiers use this field and work correctly at medium defaults.
- [x] **Race (string)**: Deferred until Races phase. Not on the model.
- [x] **BAB**: Field exists, derived as `0`. Classes phase fills in progression. Phase 8 can reference `#self.bab` — it just reads 0 until classes exist.
- [x] **Saves**: Shell fields exist: `fort = CON mod + base(0)`, `ref = DEX mod + base(0)`, `will = WIS mod + base(0)`. Class base progression added in Classes phase.
- [x] **AC**: `normal = 10 + DEX mod`, `touch = 10 + DEX mod`, `flatFooted = 10`. Armor/shield (Equipment), size (Races), dodge/deflect etc. layer in later.
- [x] **Init**: `total = DEX mod + bonus(0)`. Improved Initiative feat etc. add to bonus later.
- [x] **Speed**: Default `land.base = 30, total = 30`. Races modify base (possibly via AE). Armor/encumbrance modify total later.
- [x] **HP max**: Derived as `placeholder_level(1) × HD + CON mod`. Classes replace this with sum of actual class HD rolls.
- [x] **Alignment, description fields**: In Phase 5. biography, notes, height, weight, gender, deity, age, XP — these are character sheet display properties with no external consumer dependency.
- [x] **DR / SR**: Fields exist on model but empty/0. Populated by race/class/item effects when those arrive.
- [x] **Encumbrance**: Derived from STR + inventory weight, assumes Medium size multiplier. Races adjust multiplier.
- [x] **Skills**: **Not on model at all** until the Skills phase. No stub, no empty record.
- [x] **Conditions**: **Not on model** until Conditions phase. The Effects tab shows Active Effects (which already work). Condition toggle UI added when Conditions phase arrives.
- [x] **Formula familiar**: Each phase registers its own `#self.*` fields when it adds properties. Phase 5 registers abilities, HP, AC, saves, init, BAB, speed. Later phases add their fields.

### Group B: Actor PropertyMap ✅

**Resolved**: Full PropertyMap created at `docs/architecture/property-maps/PropertyMap-Actors.md`.

- [x] **Location**: `docs/architecture/property-maps/PropertyMap-Actors.md`
- [x] **Format**: Hybrid — mermaid ER for inheritance hierarchy, grouped field tables per model with Phase/Stored-Derived/D35E-Source columns
- [x] **Scope**: All 6 types mapped: Character, NPC (covers monsters), Companion, Object, Trap + future Vehicle/IntelligentItem notes
- [x] **Composition**: Inheritance-first architecture:
  - `ActorSystemModelBase` → speed, biography/notes (truly universal)
  - `CreatureSystemModel` → abilities, HP(creature), AC, saves, BAB, init, combat, senses, encumbrance, currency, equipment
  - `CharacterSystemModel` → xp, description fields, isPartyMember
  - `NpcSystemModel` → cr, creature type/subtype, environment, treasure, advancement (covers all monsters)
  - `CompanionSystemModel` → bond { actorId, bondType, sharedInitiative }
  - `ObjectSystemModel` → HP(object), hardness, breakDC
  - `TrapSystemModel` → init, findDC, disarmDC, cr, saves

**Key decisions documented in PropertyMap**:
- NPC = Monster (same type, different sheet presentation)
- `bond` replaces `master` (familiar, animalCompanion, mount, summon, cohort, commanded)
- Racial HD handled as pseudo-class in Races/Classes phases
- Spellbooks are NOT common — added per class by class items
- Identifiable needs system-wide redesign → Secret AE phase (flagged, not solved here)

### Group C: Inventory System ❓

#### C1: Item States
- [ ] **Three-state model**: Stored (not on person) → Carried (on person) → Equipped (subset of carried). Items in containers inherit their container's state.
- [ ] **Existing flags**: `isCarried` exists on `PhysicalItemSystemModel`, `isEquipped` exists on `EquippableItemSystemModel`. Confirm these are the right home — no new flags needed on the actor.
- [ ] **"Stored" semantics**: `isCarried = false` means stored. Is "stored" always on the actor but just not contributing to weight? Or does stored mean "in a chest somewhere, not on this actor at all"?

#### C2: Containers
- [x] **Container model**: Uses `containerId` reference pattern (dnd5e canonical). All items are flat siblings in `actor.items`. Contained items store `containerId` pointing to parent container's ID. Container items compute `contents` by filtering siblings.
- [x] **Weight interaction**: **Container AE Propagation** — containers emit a special AE to each contained item. Bag of holding AE sets weightlessness on contained items (no manual weight calc logic). Non-extradimensional containers: container weight + sum of contents weights.
- [ ] **Nesting**: Can containers contain containers? (Bag inside a backpack?) — needs rules decision
- [ ] **UI**: How do containers display in the inventory tab? Expandable tree? Flat list with parent indicator?

#### C3: Weapon Slots
- [ ] **Slot definitions**: Need mainhand / offhand at minimum. Natural attack slots?
- [ ] **Two-handing**: A weapon in mainhand that is two-handed occupies both hand slots. How is this tracked?
- [ ] **Dual wield**: Two weapons, one per hand. Interaction with the existing `equipmentSlots.mts` body slots.
- [ ] **Where do weapon slots live**: Extend `equipmentSlots.mts` or separate `weaponSlots.mts`?

#### C4: Currency
- [ ] **Storage model**: User has detailed plans. Need in-depth dialog.
- [ ] **Weight rule**: 50 coins = 1 lb. Is this always-on or setting-dependent?
- [ ] **Currency on actor vs in containers**: Can coins be in a bag of holding?
- [ ] **Multiple currency pools**: D35E has `currency` + `altCurrency` + `customCurrency`. What do we need?

#### C5: Item Lifecycle
- [ ] **Drag-and-drop from compendium**: Foundry creates owned item copy. Confirm this works out-of-the-box or needs custom handling.
- [ ] **Item deletion**: Remove from actor. Any cleanup needed (unequip, remove from container)?

### Group D: Character Sheet UX ❓

- [ ] **Tab structure**: Review D35E's 12-tab layout and DnD5e's 8-tab sidebar layout. Decide our approach.
  - D35E tabs: Details, Attributes, Combat, Inventory, Features, Skills, Buffs, Spells, Cards, Biography, Notes, Config
  - DnD5e tabs: Details, Inventory, Features, Spells, Effects, Biography (+ conditional Bastion, Special Traits)
- [ ] **Tab navigation style**: Horizontal top bar (D35E) vs vertical sidebar (DnD5e) vs something else?
- [ ] **What's available in Phase 5**: Abilities display, Inventory tab, Effects tab (no conditions yet), Biography tab. Features tab as placeholder.
- [ ] **Skills tab**: Blank/hidden until Skills phase. Confirm.
- [ ] **Combat tab**: Deferred until Phase 8/9. Confirm.
- [ ] **Conditions in Effects tab**: Show effects list now, add conditions toggles when Conditions phase arrives.
- [ ] **Inventory tab detail level**: Grouped by type, equip toggles, weight/price. Slot selection is basic until Equipment phase refines it.
- [ ] **Header bar content**: Name, portrait — what else in Phase 5? (Level, race, alignment all deferred per Group A?)

### Group E: Active Effect & Store Integration ❓

- [ ] **AE processing update**: Current `ActorDnd35e.applyActiveEffects()` uses Foundry's base `CHANGE_TYPES` handlers. Phase 2 introduced `resolveActiveEffectChanges()` with pre-filter stacking. The actor override should **fully replace** the base application loop with the same collect → resolve → apply winners pattern used by `ItemDnd35e`. Extract shared logic into `applyStackedChanges()` helper in `src/helpers/stacking.mts`.
- [ ] **Stale references**: §5.8 and completion checklist reference `system._stackingHistory` which was redesigned in Phase 2 to use enriched `overrides`. Update to use `overrides` with `bonusType`, `stackResult`, `stackReason` metadata.
- [ ] **VueDocumentSheetMixin**: Current type constraint is `ItemDnd35e | DnD35eActiveEffect`. Needs to accept actors. This is likely a small change (widen the generic), not a big task — confirm.
- [ ] **Actor Pinia store**: No dedicated actor store exists. Need one for document sheet reactivity. Follow existing `DocumentSheetStore` pattern or create actor-specific store?
- [ ] **Actor config registration**: `src/constants/config/actor.mts` has empty `documentClasses`. Register character class.
- [ ] **Formula familiar expansion**: `registration.mts` currently registers only document-level aspects (name). Expand with ability scores, attributes, etc. for `#self.*` contexts.

### Codebase TODO Notes (Landing Here)

The following TODO notes exist in the codebase and are tracked here for resolution during this phase:

- [ ] **Update `actorTypes.mts` placeholder** (`actorTypes.mts:1`): Currently only defines `'character'` with a TODO to add actual actor types. Phase 6 adds the character shell; Phase 23 adds NPC/Trap/Object. At minimum, verify the placeholder is sufficient for Phase 6's character-only scope, and add a forward reference to Phase 23 for expansion.
- [ ] **Equipment slot 'none' sentinel cleanup** (`equipmentSlots.mts:20`): The `'none'` option in `EQUIP_SLOT_SELECT_OPTIONS` is flagged as redundant for multiselect. When this phase implements equipment slot UI and validation, resolve whether `equippedSlotIds` should become a single-select nullable field (replace `'none'` with `value: null`) or remain multiselect (remove the `'none'` option entirely).
- [ ] **Container dropdown in PhysicalItemStore** (`PhysicalItemStore.mts:64`): `possibleContainers` computed returns only `[None]` with a TODO to build out after implementing containers. Wire this to query the parent actor's items for container-type items once the container model (§C2) is implemented.

### Group F: Phase Structure ✅

**Resolved decisions:**

- [x] **Skills split into two scopes**:
  - **Phase 8 (Action System)**: Basic skill check as an example of an *actor-owned action*. d20 + ability mod → chat card. No ranks, no class skills, just an ability check with skill flavor. Proves that actions can live on actors, not just items.
  - **New phase after Phase 12 (Classes)**: Full skill system — ranks, class skills, skill points per level, trained-only, ACP, synergies, custom skills. This phase depends heavily on class data.
- [x] **No skills on the actor model in Phase 5**: No `skills` property at all. The basic skill check in Phase 8 reads ability mods directly. The full Skills phase adds the schema.
- [x] **INSERT, don't take over**: The full Skills phase is inserted after Classes. Does not replace Phase 14 (Testing & POC Validation). Exact numbering deferred until we do the README update.
- [x] **POC exit criteria**: Will revisit — tentatively includes "a character can roll a skill check" via the Phase 8 actor-action example.
- [x] **Current spec cleanup**: Remove "skills stub — expanded in Phase 14" references from §5.1 and completion checklist. (Phase 14 is Testing, not Skills.)

---

## 5.1 Actor System Data Model

Bring over the core character data from D35E's `template.json` actor template, but as a typed `DataModel`. **All derived stats use `persisted: false` fields** — they are initialized from `initial` values every prep cycle, can be targeted by Active Effects, and are stripped before database writes.

```
ActorSystemModel (character)
├── abilities: { str, dex, con, int, wis, cha }
│   Each: { base: number, mod: number (persisted: false, derived) }
│   (damage/drain/penalty added in Phase 20)
├── attributes
│   ├── hp: { base, max (persisted: false, derived), value, temp, nonlethal }
│   ├── bab: { total (persisted: false, derived) }
│   ├── ac: { normal (p:f), touch (p:f), flatFooted (p:f) } (all derived, start with DEX+10)
│   ├── saves: { fort, ref, will } each: { base, total (p:f, derived), ability: AbilityKey }
│   ├── speed: { land, climb, swim, burrow, fly } each: { base, total (p:f, derived) }
│   ├── init: { bonus, total (p:f, derived) }
│   ├── sr: number
│   └── dr: DamageReduction[]
├── details
│   ├── level (persisted: false, derived from class items)
│   ├── xp: { value, max }
│   ├── alignment: string
│   ├── race: string (persisted: false, derived from race item)
│   └── size: SizeCategory
├── skills: Record<SkillKey, SkillData> (stub — expanded in Phase 14)
├── currency: { pp, gp, sp, cp }
├── encumbrance: { current (p:f), light (p:f), medium (p:f), heavy (p:f), carry (p:f), drag (p:f) }
└── conditions: Record<ConditionKey, boolean> (stub — expanded in Phase 20)
```

> **p:f** = `persisted: false` — initialized from `initial` value every prep cycle, AE-targetable, never saved to DB.

## 5.2 Inventory System

- Items owned by actor appear in an inventory list on the actor sheet
- Organize by type tabs: Weapons, Equipment, Consumables, Loot, Features
- Display weight, price, quantity, equipped state
- Drag-and-drop items onto actor from compendium or sidebar

## 5.3 Equipment Slot System

- Use the existing `equipmentSlots` constants (head, face, neck, shoulders, etc.)
- Weapon equip: mainhand / offhand (not in slot list yet — add weapon slots)
- Only one item per slot (except rings: left + right)
- Equipping fires active effects (e.g., armor grants AC — implemented in Phase 11)

## 5.4 Ability Score Preparation

- `prepareBaseData()`: set raw ability scores from source
- `prepareDerivedData()`:
  - Calculate ability modifiers: `floor((score - 10) / 2)`
  - Apply size modifiers
  - Calculate carrying capacity from STR
  - Calculate encumbrance from inventory weight
  - Calculate AC (10 + DEX mod + size; armor/shield added in Phase 11)
  - Calculate saves (base + ability mod; class contributions added in Phase 14)
  - Calculate initiative (DEX mod + misc)

## 5.5 Actor Sheet (Vue)

- **Header**: Name, level, race, alignment, portrait
- **Tabs**: Abilities, Inventory, Features, Effects, Biography
- **Abilities tab**: Six ability scores (editable base, display modifier)
- **Inventory tab**: Grouped item list, equip toggles, weight/price, drag-and-drop
- **Effects tab**: Active effects on the actor
- **All strings via i18n keys**

## 5.6 Document Store Refresh

Override `update()` on `ActorDnd35e` to refresh the active Pinia store after Foundry persists changes. This ensures Vue reactivity stays in sync. Establish this pattern here and carry it forward to all document types.

## 5.7 Migration Version Tracking

Start tracking `system.migration.version` on actors from this phase onward. Even though migration infrastructure lives in Phase 27, the version field needs to exist early so future migrations can key off it.

## Completion Checklist

### ✅ Complete
- (None — Phase 5 has not started)

### ❌ Not Started (All Tasks for Phase 5)

**Foundry v14 Integration:**
- [ ] Use `persisted: false` for ALL derived stat fields: ability mods, AC totals, save totals, init total, BAB total, HP max, speed totals, encumbrance thresholds, level, race string
- [ ] Set `CONFIG.Actor.trackableAttributes` in `setup` hook:
  - `character: { bar: ['attributes.hp'], value: ['attributes.ac.normal', 'attributes.init.total'] }`
  - `npc: { bar: ['attributes.hp'], value: ['details.cr'] }`
- [ ] Override `Actor.modifyTokenAttribute()` for temp HP, nonlethal damage, custom bar modification
- [ ] Implement `isOfType(...types)` method on `ActorDnd35e` with TypeScript overloads for type narrowing (PF2E pattern)
- [ ] Register `CONFIG.Actor.documentClass = ActorProxyDnd35e` in `init` hook
- [ ] Test: Token bars show HP by default for new characters
- [ ] Test: `isOfType("character")` correctly narrows TypeScript type
- [ ] Test: Derived `persisted: false` fields reset every prep cycle and are NOT saved to DB

**Actor Data Model & Schema Structure:**
- [ ] Create `src/entities/actor/ActorSystemModel.mts` extending DataModel
- [ ] Implement abilities section: str, dex, con, int, wis, cha each with base + derived mod
- [ ] Implement attributes.hp: base, max (derived), value, temp, nonlethal fields
- [ ] Implement attributes.bab: total field (derived, computed from BAB formula)
- [ ] Implement attributes.ac: normal, touch, flatFooted (all derived from DEX + 10 + size)
- [ ] Implement attributes.saves: fort, ref, will each with base + total (derived) + ability key
- [ ] Implement attributes.speed: land, climb, swim, burrow, fly each with base + total (derived)
- [ ] Implement attributes.init: bonus + total (derived from DEX mod + bonus)
- [ ] Implement attributes.sr and attributes.dr[]  array
- [ ] Implement details: level (derived from class items), xp (value/max), alignment, race, size (SizeCategory enum)
- [ ] Implement skills as empty Record<string, SkillData> stub for Phase 14 expansion
- [ ] Implement currency: pp, gp, sp, cp fields
- [ ] Implement encumbrance: current (derived), light/medium/heavy (derived), carry/drag (derived)
- [ ] Implement conditions as empty Record<string, boolean> stub for Phase 20 expansion
- [ ] Add `system.migration.version` field with initial value matching current dnd35e version
- [ ] Ensure all NumberFields use proper Foundry validation (min: 0 where applicable)

**Derived Data Preparation Pipeline:**
- [ ] Implement `prepareBaseData()`: Load ability scores, level, size from source
- [ ] Implement ability modifier calculation: `mod = floor((ability - 10) / 2)` for all six
- [ ] Implement AC calculation for all three variants: normal (10 + DEX), touch (10 + DEX), flatFooted (10 or less if no DEX)
- [ ] Implement AC size modifier: add actor.system.details.size modifier to all AC variants
- [ ] Implement carrying capacity from STR score using D&D 3.5e encumbrance table
- [ ] Implement encumbrance threshold calculation (light = 1/3 carry, medium = 2/3, heavy = carry)
- [ ] Implement weight calculation from inventory.items sum
- [ ] Implement carried weight encumbrance check (compare to thresholds)
- [ ] Implement initiative total = DEX mod + bonus field
- [ ] Implement BAB calculation stub (rule: compute from class items, stub as 0 for now, Phase 12 fills in class contribution)
- [ ] Implement save calculations stub (rule: base + ability mod, class contributions in Phase 12)
- [ ] Call `applyActiveEffects()` during `prepareDerivedData()` prep cycle
- [ ] Test: Prep cycle completes without errors for fresh actor

**Formula-Ready Field Preparation for Phase 8:**
- [ ] Call `_buildFormulaContexts()` (from Dnd35eDocumentMixin) in `prepareDerivedData()` to populate `#self.*` contexts
- [ ] Verify RollData includes: abilities, ability modifiers, bab, ac variants, saves, speed, size, initiative, hp
- [ ] Ensure `getRollData()` returns POJO with all formula-ready paths (e.g., `abilities.str.mod`, `bab`, `attributes.ac.normal`)
- [ ] Register formula contexts in Pinia store for IDE autocomplete hints
- [ ] Document all formula paths available via `#self.*` that Phase 8 actions will consume
- [ ] Test: `getRollData()` returns complete object with no undefined fields

**Active Effect Integration (Stacking Engine):**
- [ ] Import `resolveActiveEffectChanges()` utility function from Phase 2 helpers
- [ ] **Extract shared stacking application logic into helper**: Create `applyStackedChanges(document, changes, replacementData)` in `src/helpers/stacking.mts` — used by both `ItemDnd35e` and `ActorDnd35e` (Phase 2 keeps it inline on ItemDnd35e; this phase extracts it)
- [ ] Implement `ActorDnd35e.applyActiveEffects()` method in actor class
- [ ] Override `reduceOnActiveEffects()` to return false (we handle AE manually via stacking engine)
- [ ] Iterate `effect.system.changes` — cast to `Dnd35eEffectChangeData` (v14 canonical location)
- [ ] Collect all active effects where `effect.disabled === false`
- [ ] For each enabled effect, call `effect.system.buildChanges()` to generate Dnd35eEffectChangeData array (using Material pattern)
- [ ] Separate all changes into two groups: `penalty` bonus type vs all others
- [ ] Call `resolveActiveEffectChanges(bonuses, penalties)` to get resolved values + history
- [ ] Store resolved values back into `this.system` using setProperty for each field
- [ ] Enrich `this.overrides` with stacking metadata (`bonusType`, `stackResult`, `stackReason`) — same pattern as Phase 2 ItemDnd35e
- [ ] Test: Buff AE with +2 bonus applies and shows in resolved value
- [ ] Test: Penalty AE is tracked separately and rejected if higher bonus wins
- [ ] Test: Stacking history in overrides contains all applied/ignored changes with reasons

**Inventory System & Equipment Slots:**
- [ ] Implement method to add item to actor (create Link)
- [ ] Implement method to remove item from actor (delete Link)
- [ ] Implement equipment slot constants: head, face, neck, shoulders, chest, abdomen, hands, waist, legs, feet plus left ring / right ring
- [ ] Implement slot validation: no more than one item per slot, except both ring types allowed
- [ ] Implement equip/unequip toggle on item: check if slot is free before equip
- [ ] Implement weight calculation: sum all owned item weights (multiply by quantity if applicable)
- [ ] Implement price total calculation: sum of all item prices × quantity
- [ ] Implement findItemInSlot(slotName) helper for armor/shield checks in AC calculation
- [ ] Test: Can equip weapon to main hand and display in sheet
- [ ] Test: Cannot equip item to already-occupied slot (blocking validation works)
- [ ] Test: Unequip removes weight from total
- [ ] Test: Weight updates reactively

**Actor Sheet Vue Component:**
- [ ] Create `src/vue/components/sheets/ActorSheetDnd35e.vue` extending `.vue` with tabs array
- [ ] Implement tab structure: `[Abilities, Inventory, Features, Effects, Biography]` with router-like tab state
- [ ] **Abilities Tab**: Render all 6 abilities with ability name, base score (editable NumberFormGroup), derived modifier display
- [ ] **Inventory Tab**: Group items by type (Weapons, Armor, Weapons, Consumables, Loot), equip toggle checkbox per item, weight/price column, total weight display
- [ ] **Features Tab**: Placeholder for feats/traits/class features (styling only, data implementation deferred to Phase 10)
- [ ] **Effects Tab**: List active effects, show effect name, enabled toggle, delete button (use Phase 2's AE component if available)
- [ ] **Biography Tab**: Textarea for character biography with rich text styling support (defer HTML editor to Phase 23)
- [ ] Pull all labels from i18n keys: abilities.str, abilities.dex, etc., actors.tabs.abilities, actors.tabs.inventory
- [ ] Add drag-and-drop support for items into inventory tab (accept drops from compendium or sidebar)
- [ ] Implement form binding to ActorSystemModel fields and update() call on change
- [ ] Test: All ability scores display and can be edited
- [ ] Test: Inventory tab updates when items added/removed
- [ ] Test: AE list updates when effects enabled/disabled

**Document Store Sync Pattern:**
- [ ] Override `update(data, options)` in ActorDnd35e class
- [ ] Call parent `update()` for Foundry persistence
- [ ] After update completes, refresh the actor in Pinia actor store: `useActorStore().updateActor(this)`
- [ ] Ensure Pinia store listener re-renders Vue components reactively
- [ ] Test: Edit actor name in sheet → store updates → UI re-renders
- [ ] Document pattern for next phases to follow

**Localization & i18n:**
- [ ] Add i18n keys for all ability names: dnd35e.abilities.str, .dex, .con, .int, .wis, .cha
- [ ] Add i18n keys for all attribute names: dnd35e.attributes.hp, .ac, .init, .bab
- [ ] Add i18n keys for save names: dnd35e.saves.fort, .ref, .will
- [ ] Add i18n keys for skill names (empty for now, Phase 14 fills in)
- [ ] Add i18n keys for actor sheet tabs
- [ ] Add i18n keys for inventory grouping labels
- [ ] Update en.json in src/lang/ with all new keys
- [ ] Test: Sheet renders with localized labels

**Comprehensive Testing:**
- [ ] Unit test: Ability modifier calculation (ability 10 → mod 0, ability 8 → mod -1, ability 18 → mod +4)
- [ ] Unit test: AC derivation (actor DEX +2, size small → -1, result = 10 + 2 - 1 = 11)
- [ ] Unit test: Carrying capacity (STR 14 → medium load 58 lb)
- [ ] Unit test: Encumbrance thresholds applied correctly
- [ ] Unit test: Initiative total = DEX mod + bonus
- [ ] Unit test: Weight calculation from 3-item inventory
- [ ] Integration test: Create actor → check all derived stats compute
- [ ] Integration test: Change ability score → derived stats update
- [ ] Integration test: Add weapon to inventory → weight totals update
- [ ] Integration test: Equip weapon → appears in equipment slot
- [ ] Integration test: Add AE buff (+2 STR) → stacking engine applies → modifier updates
- [ ] Integration test: Edit actor in sheet → Pinia store updates → re-render
- [ ] Edge case: Ability score 3 (mod -4), ability score 18 (+4), ability score 1 (-5)
- [ ] Edge case: Small size (-1 AC, +4 Stealth), Large size (+1 AC, -4 Stealth)
- [ ] Edge case: No items in inventory → weight = 0, encumbrance = light
- [ ] Edge case: Multiple AE buffs with different bonus types → stacking resolver picks correct ones
- [ ] Smoke test: Create character, add weapon, add buff AE, equip weapon, edit biography → no console errors

## 5.8 Active Effect Integration

This phase integrates active effect changes into actor preparation, using the **stacking engine established in Phase 2**.

### Actor-Level AE Changes

Actors can have active effects that modify their stats (e.g., a buff that grants +2 to Strength checks). These effects generate `Dnd35eEffectChangeData` changes just like Material AEs on items do:

```typescript
// src/entities/actor/ActorDnd35e.mts
override applyActiveEffects() {
  // Import the generic stacking utility from Phase 2
  const { resolveActiveEffectChanges } = await import('@helpers/stacking.mts');

  // Collect all changes from enabled active effects
  const allChanges: Dnd35eEffectChangeData[] = [];
  for (const effect of this.effects) {
    if (effect.data.disabled) continue;
    if (effect.system.buildChanges) {
      allChanges.push(...effect.system.buildChanges());
    }
  }

  // Separate penalties
  const penalties = allChanges.filter(c => c.bonusType === 'penalty');
  const bonuses = allChanges.filter(c => c.bonusType !== 'penalty');

  // Apply stacking resolution (same algorithm as items)
  const resolved = resolveActiveEffectChanges(bonuses, penalties);

  // Merge resolved changes into actor data
  for (const [field, value] of Object.entries(resolved)) {
    foundry.utils.setProperty(this.system, field, value);
  }
}

override prepareDerivedData() {
  // Call applyActiveEffects() during prep cycle
  this.applyActiveEffects();

  // Then compute derived stats (BAB, saves, AC, etc.)
  this._prepareDerivedStats();
}
```

### When AEs Run

- **Initial phase**: `prepareEmbeddedDocuments()` (for AE changes that feed into derived stats)
- **Final phase**: `prepareDerivedData()` (after ability scores and other base values are set)

Each `Dnd35eEffectChangeData` specifies its `phase` property so the actor knows when to apply it.

### Reusing the Stacking Engine

The `resolveActiveEffectChanges()` function (created in Phase 2, §2.5.1) is imported and reused here. Both items and actors apply the same stacking logic — no duplication. This is why the engine was designed generically.

---

## 5.9 Document Event System

A per-document event bus that lets system code, macros, and external modules subscribe to domain events on individual document instances. This is **not** Foundry's global `Hooks` — it's scoped to a single document and carries typed payloads.

### Why Not Global Hooks?

Foundry's `Hooks.on('updateActor', ...)` fires for **every** actor. Document events fire on a **specific** document instance and carry domain-specific payloads (e.g., "this creature died" with cause-of-death data). Subscribers don't need to filter by document ID or check preconditions — if the event fires, it's relevant.

Use cases that motivate this:
- **Death throes**: A creature with a death effect (e.g., Balor explosion) triggers `death` → subscribers (class features, items, macros) react
- **Instantiation**: An item added to an actor triggers `instantiate` → the item can run setup logic (register formulas, create companion effects)
- **Reveal secret**: The identifiable system reveals a property → `revealSecret` fires with what was revealed → UI notifications, chat messages, journal updates react
- **Class features**: Paladin's Aura of Courage reacts to `death` on the paladin to drop the aura. Rage ends on `death`. Contingency spells fire on `death`.
- **Macros**: A user writes a macro that listens for `death` on a boss token to trigger a cutscene

### Infrastructure: `DocumentEventEmitter`

Lives on `Dnd35eDocumentMixin` so **all** system documents (items, actors, effects) can emit and subscribe. The emitter is instance-scoped — each document has its own subscriber list.

```typescript
// src/helpers/DocumentEventEmitter.mts

type DocumentEventCallback<T = unknown> = (event: DocumentEvent<T>) => void | Promise<void>;

interface DocumentEvent<T = unknown> {
  type: string;              // Event name, e.g. 'death', 'instantiate', 'revealSecret'
  document: ClientDocument;  // The document that emitted
  data: T;                   // Event-specific payload
  timestamp: number;         // Date.now() at emission
}

class DocumentEventEmitter {
  #listeners = new Map<string, Set<DocumentEventCallback>>();

  on<T = unknown>(event: string, callback: DocumentEventCallback<T>): void {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event)!.add(callback as DocumentEventCallback);
  }

  off<T = unknown>(event: string, callback: DocumentEventCallback<T>): void {
    this.#listeners.get(event)?.delete(callback as DocumentEventCallback);
  }

  once<T = unknown>(event: string, callback: DocumentEventCallback<T>): void {
    const wrapper: DocumentEventCallback<T> = (e) => {
      this.off(event, wrapper);
      return callback(e);
    };
    this.on(event, wrapper);
  }

  async emit<T = unknown>(type: string, data: T, document: ClientDocument): Promise<void> {
    const event: DocumentEvent<T> = { type, document, data, timestamp: Date.now() };
    const callbacks = this.#listeners.get(type);
    if (!callbacks?.size) return;
    for (const cb of callbacks) {
      try {
        await cb(event);
      } catch (err) {
        Hooks.onError('DocumentEventEmitter.emit', err as Error, {
          msg: `Error in '${type}' event handler on ${document.documentName} ${document.id}`,
          log: 'error',
        });
      }
    }
  }

  /** Remove all listeners. Called on document deletion cleanup. */
  clear(): void {
    this.#listeners.clear();
  }

  /** List registered event types (for debugging / dev tools). */
  get registeredEvents(): string[] {
    return [...this.#listeners.keys()];
  }
}
```

### Integration with `Dnd35eDocumentMixin`

```typescript
// Added to Dnd35eDocumentMixin:
abstract class Dnd35eDocument extends Base {
  readonly events = new DocumentEventEmitter();
  // ...existing constructor, formulas, etc.
}
```

Every `ItemDnd35e`, `ActorDnd35e`, and `DnD35eActiveEffect` instance gets an `events` property. Subscribers attach per-instance:

```typescript
// Example: A class feature item subscribes to its owner's death
this.parent.events.on('death', (e) => {
  // Trigger death throe ability
});
```

### Default Events

Phase 6 ships the event infrastructure and registers all well-known event types. Events are wired to emit as their triggering systems land in later phases.

#### Actor Events

| Event | Payload | Emitted when | Example use case |
|-------|---------|-------------|-----------------|
| `instantiate` | `{ actor: ActorDnd35e }` | Item added to actor (`_onCreate`) | Axe: register formulas. Gem: apply passive bonus |
| `takeDamage` | `{ amount: number, damageType: string, source?: string, attackerId?: string }` | Damage applied to actor HP | Bloodied effects (4e retrofit), damage-reactive abilities |
| `dying` | `{ previousHp: number, currentHp: number, cause?: string, attackerId?: string }` | Actor HP drops to ≤ 0 but above death threshold | Stabilization checks, bleeding out |
| `death` | `{ previousHp: number, currentHp: number, cause?: string, attackerId?: string, damage?: number }` | Actor HP drops to ≤ death threshold (default −10) | Draconian death throes, Rage ends, Contingency fires |
| `preUseAction` | `UseActionContext & { cancel: () => void }` | Before an action executes — calling `cancel()` aborts it | Silence preventing spells, exhaustion blocking actions, curse gates |
| `postUseAction` | `UseActionContext & { result: ActionResult }` | After an action completes successfully | Curse of the Magi (backlash after casting), resource tracking |
| `dealDamage` | `{ amount: number, damageType: string, target: ActorDnd35e, context?: UseActionContext }` | Actor deals damage to another actor | Cleave trigger, life-drain effects, vampiric abilities |
| `revealSecret` | `{ secretAeId: string, field: string, previousValue: unknown, revealedValue: unknown }` | Secret AE is disabled (revealed) | Chat notification, journal updates, identification macro triggers |

#### Item Events

| Event | Payload | Emitted when | Example use case |
|-------|---------|-------------|-----------------|
| `instantiate` | `{ actor: ActorDnd35e }` | Item added to actor (`_onCreate`) | Already defined — item setup on creation |
| `takeDamage` | `{ amount: number, damageType: string, source?: string }` | Damage applied to item HP (sunder, AoE, etc.) | Item durability tracking, shatter effects |
| `destroyed` | `{ previousHp: number, cause?: string }` | Item HP drops to ≤ 0 | Item breaks, special effects on destruction (cursed items) |
| `revealSecret` | `{ secretAeId: string, field: string, previousValue: unknown, revealedValue: unknown }` | Secret AE on item is revealed | Same as actor — identification reveals |

#### Damage → Death Cascade

`takeDamage` is the root event. Death/dying are **sub-events** emitted from the same damage-application flow — not separate subscriptions a consumer needs to wire independently:

```
actor.applyDamage(amount, type, source)
  → emit 'takeDamage' { amount, damageType, source }
  → if actor HP ≤ 0 and > deathThreshold:
      emit 'dying' { previousHp, currentHp, cause }
  → if actor HP ≤ deathThreshold (default −10):
      emit 'death' { previousHp, currentHp, cause, damage }

item.applyDamage(amount, type, source)
  → emit 'takeDamage' { amount, damageType, source }
  → if item HP ≤ 0:
      emit 'destroyed' { previousHp, cause }
```

The death threshold is configurable per actor (most creatures die at −10; some die at 0; constructs/undead die at 0). Items always use 0.

#### UseActionContext

Action events carry a self-contained `UseActionContext` — everything a macro or module needs to evaluate the action locally without re-resolving references:

```typescript
interface UseActionContext {
  actor: ActorDnd35e;          // The actor executing the action
  item: ItemDnd35e;             // The source item that declared the action
  action: ActionDataModel;      // The full resolved action data model
  itemId: string;               // Convenience — item.id
  actionId: string;             // Convenience — action.id
  params: unknown[];            // Additional parameters passed at invocation
}
```

The context is built once at the start of `actor.useAction()` and passed through the entire lifecycle: `preUseAction` → execution → `postUseAction`. Macros receive this as a single object and can inspect `context.action.type`, read `context.item.system`, check `context.actor.system.hp`, etc. — no lookups needed.

#### preUseAction Cancellation Pattern

`preUseAction` supports cancellation via a `cancel()` callback merged into the context. If any subscriber calls `cancel()`, the action execution is aborted and the action budget is not consumed. The emitter checks a cancelled flag after all callbacks run:

```typescript
// In actor.useAction(itemId, actionId, ...params):
const item = this.items.get(itemId);
const action = item.system.actions.get(actionId);
const context: UseActionContext = { actor: this, item, action, itemId, actionId, params };

const cancelled = { value: false };
const payload = { ...context, cancel: () => { cancelled.value = true; } };
await this.events.emit('preUseAction', payload, this);
if (cancelled.value) return; // Action aborted — budget not consumed

// ... execute the action
const result = await action.execute(context);

await this.events.emit('postUseAction', { ...context, result }, this);
```

Multiple subscribers can call `cancel()` — it's idempotent. The cancellation reason is not tracked in the base implementation (subscribers should post their own chat messages explaining why the action was blocked).

#### Action Invocation Model

Actions are always executed in the context of the owning actor. The actor maintains an array of available actions (sourced from owned items, class features, racial abilities, etc.). Invocation follows the pattern:

```typescript
actor.useAction(itemId: string, actionId: string, ...params: unknown[])
```

The actor looks up the item by `itemId`, finds the action by `actionId` on that item, builds a `UseActionContext` with all resolved references, then executes it. The `preUseAction` / `postUseAction` events fire on the actor — not on the item — because the actor is the execution context. Subscribers attach once on the actor and see all actions. They can filter by `context.action.type`, `context.itemId`, or any property on the resolved data model.

The exact signature and dispatch mechanism is an explore-at-phase-start decision for Phase 10. Phase 6 defines the `UseActionContext` interface and event payloads so subscribers have a stable contract.

**`instantiate`** fires when an item is first added to an actor (in `_onCreate` if the item has a parent actor). It does NOT fire on world-level item creation or on data preparation cycles — only on the initial creation event. Items use this to run one-time setup: register additional formulas, create companion effects, or initialize state.

**`takeDamage`** fires on every damage application — both actor and item. This is the root event for damage-reactive abilities. Subscribers see the raw damage amount, type, and source. The `dying`, `death`, and `destroyed` sub-events fire from the same flow when HP thresholds are crossed.

**`death`** fires when an actor's HP drops to the death threshold or below (default −10, configurable per actor). It fires once per death transition (HP above threshold → HP at/below threshold), not on every update while already dead.

**`dying`** fires when an actor's HP drops to 0 or below but remains above the death threshold. This represents the bleeding-out state in D&D 3.5e. It fires once per transition into the dying range.

**`preUseAction`** fires before any action executes on the actor. The payload is a full `UseActionContext` plus `cancel()`. Subscribers can inspect `context.action` (the resolved data model), `context.item`, `context.actor`, or any nested property — then call `cancel()` to abort. Fires for all action types — attacks, spells, abilities, item uses. The action system (Phase 10) wires the emission point.

**`postUseAction`** fires after an action completes successfully (not fired if cancelled). The payload is `UseActionContext` plus `result: ActionResult`. Macros can read the full action context alongside the outcome. The action system (Phase 10) wires the emission point.

**`dealDamage`** fires on the actor that dealt the damage (not the target). Optionally carries `context: UseActionContext` when the damage came from an action (absent for environmental or effect-based damage). This is the hook point for on-hit abilities that care about dealing damage (Cleave, vampiric touch, life drain). Distinct from the `EffectTrigger` system (Phase 10) which handles combat-specific triggers like `onKill` and `onCrit` — `dealDamage` is broader and fires on all damage sources.

**`destroyed`** fires when an item's HP drops to 0 or below. This is the item equivalent of `death` — items have a single threshold at 0.

**`revealSecret`** fires when a Secret AE is disabled (revealed). The payload includes the Secret AE id, the field path that was masked, the display value (what was shown), and the real value (what is now revealed). This is the hook point for chat notifications ("The sword reveals itself to be a +2 Flaming Longsword!"), journal updates, and macro triggers.

### Extensibility

Macros and modules register custom events by simply emitting/subscribing to any string key:

```typescript
// A module registers a custom event type
actor.events.on('myModule.stunned', (e) => { /* react */ });

// The module emits it from its own logic
actor.events.emit('myModule.stunned', { rounds: 3 }, actor);
```

No registration step needed — event types are open strings. System events use unprefixed names (`death`, `instantiate`). Module events should use a namespace prefix (`myModule.eventName`) to avoid collisions.

### Well-Known Event Registry

While event types are open strings (anything can be emitted/subscribed), the system maintains a static registry of **well-known events** with labels and descriptions. This serves two purposes: documentation for developers, and a future UI dropdown for GM-authored traits.

```typescript
// On DocumentEventEmitter (static):
static readonly wellKnownEvents = new Map<string, { label: string; description: string }>();

static registerEventType(type: string, meta: { label: string; description: string }): void {
  DocumentEventEmitter.wellKnownEvents.set(type, meta);
}
```

Registered at system init:

```typescript
// Actor events
DocumentEventEmitter.registerEventType('instantiate', {
  label: 'Instantiate',
  description: 'Fires when an item is first added to an actor.',
  appliesTo: ['actor', 'item'],
});
DocumentEventEmitter.registerEventType('takeDamage', {
  label: 'Take Damage',
  description: 'Fires when damage is applied to the document\'s HP.',
  appliesTo: ['actor', 'item'],
});
DocumentEventEmitter.registerEventType('dying', {
  label: 'Dying',
  description: 'Fires when an actor\'s HP drops to ≤ 0 but above death threshold.',
  appliesTo: ['actor'],
});
DocumentEventEmitter.registerEventType('death', {
  label: 'Death',
  description: 'Fires when an actor\'s HP drops to the death threshold (default −10).',
  appliesTo: ['actor'],
});
DocumentEventEmitter.registerEventType('destroyed', {
  label: 'Destroyed',
  description: 'Fires when an item\'s HP drops to ≤ 0.',
  appliesTo: ['item'],
});
DocumentEventEmitter.registerEventType('preUseAction', {
  label: 'Pre-Use Action',
  description: 'Fires before an action executes. Calling cancel() aborts the action.',
  appliesTo: ['actor'],
});
DocumentEventEmitter.registerEventType('postUseAction', {
  label: 'Post-Use Action',
  description: 'Fires after an action completes successfully.',
  appliesTo: ['actor'],
});
DocumentEventEmitter.registerEventType('dealDamage', {
  label: 'Deal Damage',
  description: 'Fires on the actor that dealt damage to another actor.',
  appliesTo: ['actor'],
});
DocumentEventEmitter.registerEventType('revealSecret', {
  label: 'Reveal Secret',
  description: 'Fires when a Secret AE is disabled (revealed), exposing the real value.',
  appliesTo: ['actor', 'item'],
});
```

Modules extend: `DocumentEventEmitter.registerEventType('myModule.stunned', { label: 'Stunned', description: '...' })`. The registry is informational — unregistered events still work fine. See Phase 8, §11.5 for how this feeds a future trait-authoring dropdown.

### Lifecycle & Cleanup

- `events.clear()` is called in the document's `_onDelete()` to prevent stale references
- Listeners are **not persisted** — they're runtime-only, re-established during each session (class features re-subscribe in `prepareDerivedData()` or `_onCreate()`)
- The emitter is synchronous-first but supports async callbacks (awaited in sequence, not parallel) — a failing callback does not block subsequent callbacks

### Completion Checklist (Document Event System)

- [ ] Create `src/helpers/DocumentEventEmitter.mts` with `DocumentEventEmitter` class
- [ ] Export `DocumentEvent<T>` and `DocumentEventCallback<T>` types
- [ ] Add `readonly events: DocumentEventEmitter` to `Dnd35eDocumentMixin`
- [ ] Wire `events.clear()` in document `_onDelete()` cleanup
- [ ] Implement static `wellKnownEvents` registry on `DocumentEventEmitter` with `registerEventType()` method and `appliesTo` metadata
- [ ] Register all well-known events at system init: `instantiate`, `takeDamage`, `dying`, `death`, `destroyed`, `preUseAction`, `postUseAction`, `dealDamage`, `revealSecret`
- [ ] Define typed payload interfaces for each event (e.g., `TakeDamageEvent`, `DeathEvent`, `PreUseActionEvent`)
- [ ] Emit `instantiate` in `ItemDnd35e._onCreate()` when item has a parent actor
- [ ] Implement `takeDamage` → `dying` / `death` cascade in actor damage application method (threshold-based sub-event emission)
- [ ] Implement `takeDamage` → `destroyed` cascade in item damage application method (HP ≤ 0)
- [ ] Implement `preUseAction` cancellation pattern with `cancel()` callback (emission wired in Phase 10 action system)
- [ ] Define `postUseAction`, `dealDamage` event payload interfaces (emission wired in Phase 10 action system)
- [ ] Define `revealSecret` event type and payload interface (emission wired during Secret AE phase)
- [ ] Test: Subscribe to `takeDamage` on actor, apply damage, callback fires with amount/type
- [ ] Test: `takeDamage` → `dying` fires when HP drops to 0 but above −10
- [ ] Test: `takeDamage` → `death` fires when HP drops to −10 or below
- [ ] Test: `death` threshold is configurable per actor (constructs/undead die at 0)
- [ ] Test: `death` fires once per transition, not on every update while dead
- [ ] Test: Item `takeDamage` → `destroyed` fires when item HP drops to 0
- [ ] Test: `preUseAction` cancel() prevents action execution (wired in Phase 10)
- [ ] Test: Subscribe to `death` on actor, reduce HP to −10, callback fires with payload
- [ ] Test: `instantiate` fires once on item creation, not on subsequent updates
- [ ] Test: `events.clear()` removes all listeners, subsequent emit is no-op
- [ ] Test: Failing callback logs error via `Hooks.onError` but doesn't block other callbacks
- [ ] Test: `once()` auto-unsubscribes after first fire

---

## 5.10 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/helpers/DocumentEventEmitter.mts` — `DocumentEventEmitter` class, `DocumentEvent<T>`, `DocumentEventCallback<T>` types |
| Modify | `src/entities/components/CoreMixin/Dnd35eDocument.mts` — add `readonly events: DocumentEventEmitter` to mixin |
| Expand | `src/entities/actors/baseActor/data/ActorSystemModelBase.mts` — add ability scores, HP, AC, saves, etc. |
| Expand | `src/entities/actors/baseActor/data/ActorSystemData.mts` — interfaces for source + derived data |
| Implement | `ActorDnd35e.applyActiveEffects()` — import `resolveActiveEffectChanges()` from Phase 2 stacking module; store history in `system._stackingHistory` |
| Expand | `src/entities/actors/baseActor/ActorDnd35e.mts` — implement `prepareBaseData()`, `prepareDerivedData()`, `update()` refresh, `applyActiveEffects()` |
| Create | `src/vue/apps/actor/CharacterSheet.vue` — main character sheet |
| Create | `src/vue/apps/actor/CharacterSheetApp.mts` — Vue app wrapper |
| Create | `src/vue/components/actor/` — AbilityScores, Inventory, EquipmentSlots components |
| Modify | `src/entities/actors/registration.mts` — register character sheet |
| Create | `src/constants/abilities.mts` — ability score constants |
| Create | `src/lang/en/abilities.json`, `src/lang/en/actors.json` |
| Test | Unit tests for actor-level stacking (buffs, penalties); validate history accuracy on combat-relevant fields |
