# Phase 5: Actor Foundation

**Status**: 📋 Outlined (Actor schema, multiclass stacking, ability scores)

> **Milestone**: POC  
> **Dependencies**: Phase 1, Phase 3  
> **Goal**: A character actor has ability scores, BAB, HP, flat AC, saves, speed, size, and an inventory with equipped weapon tracking. All stats are stored as formula-ready fields that Phase 8 (Action System) consumes via `#self.*` contexts.

> **Action System note**: BAB is stored on the actor even before classes compute it (Phase 12). The Actor schema defines the fields that become `#self.abilities.str.mod`, `#self.bab`, `#self.attributes.ac.*`, `#self.saves.*` — all referenced by action formulas.

---

## 5.1 Actor System Data Model

Bring over the core character data from D35E's `template.json` actor template, but as a typed `DataModel`:

```
ActorSystemModel (character)
├── abilities: { str, dex, con, int, wis, cha }
│   Each: { base: number, mod: number (derived) }
│   (damage/drain/penalty added in Phase 20)
├── attributes
│   ├── hp: { base, max (derived), value, temp, nonlethal }
│   ├── bab: { total (derived) }
│   ├── ac: { normal, touch, flatFooted } (all derived, start with DEX+10)
│   ├── saves: { fort, ref, will } each: { base, total (derived), ability: AbilityKey }
│   ├── speed: { land, climb, swim, burrow, fly } each: { base, total (derived) }
│   ├── init: { bonus, total (derived) }
│   ├── sr: number
│   └── dr: DamageReduction[]
├── details
│   ├── level (derived from class items)
│   ├── xp: { value, max }
│   ├── alignment: string
│   ├── race: string (derived from race item)
│   └── size: SizeCategory
├── skills: Record<SkillKey, SkillData> (stub — expanded in Phase 14)
├── currency: { pp, gp, sp, cp }
├── encumbrance: { current (derived), light, medium, heavy, carry, drag } (all derived)
└── conditions: Record<ConditionKey, boolean> (stub — expanded in Phase 20)
```

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
- [ ] Implement `ActorDnd35e.applyActiveEffects()` method in actor class
- [ ] Override `reduceOnActiveEffects()` to return false (we handle AE manually via stacking engine)
- [ ] Collect all active effects where `effect.disabled === false`
- [ ] For each enabled effect, call `effect.system.buildChanges()` to generate Dnd35eEffectChangeData array (using Material pattern)
- [ ] Separate all changes into two groups: `penalty` bonus type vs all others
- [ ] Call `resolveActiveEffectChanges(bonuses, penalties)` to get resolved values + history
- [ ] Store resolved values back into `this.system` using setProperty for each field
- [ ] Store full stacking history in `system._stackingHistory` for Phase 8 chat cards
- [ ] Test: Buff AE with +2 bonus applies and shows in resolved value
- [ ] Test: Penalty AE is tracked separately and rejected if higher bonus wins
- [ ] Test: Stacking history contains all applied/ignored changes with reasons

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

## 5.9 Files to Create/Modify

| Action | Path |
|--------|------|
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
