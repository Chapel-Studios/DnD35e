# Beta Phase 5: Consumables

**Status**: 📖 Rough Sketch (300+ item checklist, consumable types, use chains)

> **Milestone**: Beta  
> **Dependencies**: Phase 8 (Action System)  
> **Goal**: Potions, scrolls, wands, and other limited-use items. Consumable use is an action chain via the Action System (use action → effect/heal/buff).

---

## 17.1 Consumable Item Type

Consumables store an **action snapshot** baked in at creation time — NOT a spell reference. A potion of Bull’s Strength cast at CL 3 with metamagic captures that moment as an `EmbeddedDataField(ActionDataModel)`. At use time, the snapshot executes directly; only the *user’s* situational modifiers (Use Magic Device, etc.) apply on top.

```
ConsumableSystemModel extends PhysicalItemSystemModel
├── consumableType: 'potion' | 'scroll' | 'wand' | 'dorje' | 'powerstone' | 'poison' | 'drug' | 'tattoo' | 'crystal' | 'misc'
├── uses: { value: number, max: number, maxFormula: string }
└── actionSnapshot: ActionDataModel (EmbeddedDataField — snapshot of spell/effect at creation time)
```

> **Key decision**: Action snapshot, not spell reference. The snapshot includes CL, metamagic, and creator bonuses. This avoids reference-chasing and means consumables work even if the source spell is modified or deleted later.

## 17.2 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/consumable/` — class, data model, sheet |
| Modify | `system.json` — register consumable type |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 21 has not started)

### ❌ Not Started (All Tasks for Phase 21)

**Consumable System Model:**
- [ ] Create `src/entities/items/consumable/ConsumableSystemModel.mts` extending ItemSystemModelBase
- [ ] Define schema: consumableType (StringField with choices: 'potion', 'scroll', 'wand', 'dorje', 'powerstone', 'poison', 'drug', 'misc')
- [ ] Define schema: charges (SchemaField with value: NumberField, max: NumberField, represents uses for wands/dorjes)
  - Potion: always 1 charge (value = 1 or 0 if used)
  - Wand: up to 50 charges
  - Scroll: 1 charge (consumable)
- [ ] Define schema: uses (SchemaField with value: NumberField, max: NumberField, autoDestroy: BooleanField)
  - For multi-use consumables (e.g., applies 5 times, then consumed)
  - autoDestroy: true if item deleted after last use
- [ ] Define schema: spell (SchemaField or null, contains uuid: StringField, level: NumberField, casterLevel: NumberField)
  - For scrolls, wands, potions that cast spells
  - uuid: reference to spell item
  - level: spell's level (for slot calculation, wand uses level +1 slot worth of power)
  - casterLevel: caster level for scroll/wand (default: 2 × spell level)
- [ ] Define schema: activation (StringField, references ActivationType from Phase 8, e.g., "action", "standardAction", "freeAction")
- [ ] Define schema: save (SchemaField or null, contains type: StringField, dc: FormulaField)
  - For consumables that trigger saves (poison, for example)
- [ ] Define schema: effect (HTMLField, description of effect when consumed)
- [ ] Define schema: price (NumberField or null, item price in gold pieces, informational)
- [ ] Test: ConsumableSystemModel instantiation with various types
- [ ] Test: Schema validation (consumableType in enum, charges.value <= charges.max, etc.)

**Splash Weapon Rules (SRD Combat):**
- [ ] Implement splash weapon subtype on ConsumableSystemModel: isSplash (BooleanField), splashRadius (NumberField, default 5ft), splashDamage (FormulaField)
- [ ] Splash weapon attack: ranged touch attack against target square (AC 5 for unoccupied square)
- [ ] Direct hit: full damage to target creature
- [ ] Splash damage: creatures within splashRadius take splashDamage (typically 1 point)
- [ ] Miss scatter: on miss, determine scatter direction (1d8) and distance (range increment)
- [ ] SRD splash weapons: Alchemist's Fire (1d6 fire + 1 splash + 1d6 next round), Holy Water (2d4 vs undead/evil outsiders + 1 splash), Acid Flask (1d6 acid + 1 splash), Thunderstone (DC 15 Fort or deafened 1 hour), Tanglefoot Bag (entangled, no splash)
- [ ] POC items: Alchemist's Fire, Holy Water, Acid Flask
- [ ] Test: Splash weapon direct hit applies full damage
- [ ] Test: Splash misses scatter correctly
- [ ] Test: Splash radius hits adjacent creatures

**Consumable Item Class:**
- [ ] Create `src/entities/items/consumable/ItemDnd35eConsumable.mts` extending ItemDnd35e
- [ ] Implement `use(actor)`: async method to use/consume the item
  - Parameter: actor (creature using the item, typically player character)
  - Decrement charges or uses
  - Execute effect (damage, healing, buff, spell, etc.)
  - If autoDestroy and last use: remove item from inventory
  - Return result object {success, message, effect}
- [ ] Implement `canUse(actor)`: check if consumable can be used
  - Check: charges.value > 0 (for wands/scrolls)
  - Check: uses.value > 0 (if multi-use)
  - Check: user has spellcasting ability (for spell scrolls, if not on divine scroll, e.g.)
  - Check: not cursed/broken/damaged
- [ ] Implement `getAvailableUses()`: available uses/charges
  - For wands: return charges.value
  - For multi-use: return uses.value
  - For potions: return 1 (or 0 if already consumed)
- [ ] Implement `consumeUse(actor)`: decrement charges or uses
  - charges.value -= 1
  - Or uses.value -= 1
  - Save actor
  - Check autoDestroy: if uses/charges <= 0, delete item from actor
- [ ] Test: Consumable instantiation
- [ ] Test: Use consumable, charges decrement
- [ ] Test: Last use, item deleted if autoDestroy true

**Consumable Sheet Component (Vue):**
- [ ] Create `src/vue/components/sheets/ConsumableSheetDnd35e.vue` extending item sheet
- [ ] Implement tabs: Details, Effects, Description
- [ ] **Details tab**: type, charges/uses (show value/max), price
- [ ] If consumable has spell attached: show spell name + link
- [ ] **Effects tab**: activation type, save (if any), activation time
- [ ] **Description tab**: rich text editor for effect description
- [ ] Show "Use" button (visible only to owner/GM)
  - Clicking uses the consumable
  - Charges/uses decrement
  - Effect displayed
  - Item deleted if last use
- [ ] Display item quantity in inventory (if using Foundry item quantities)
- [ ] Test: Consumable sheet renders
- [ ] Test: Can edit consumable properties
- [ ] Test: Use button visible and functional

**Potion Consumable Type:**
- [ ] Potion definition: single-use item consumed when drunk
- [ ] Charges: always value: 1, max: 1
- [ ] Usage: action type "free action" or "standard action" depending on potion type
- [ ] Effect: typically buff (e.g., Potion of Strength +2) or healing (e.g., Cure Light Wounds effect)
- [ ] Activation: typically instant (no casting time for premade potions)
- [ ] Storage: can be carried in inventory, bottle breaks/spills if dropped in water
- [ ] Test: Potion item type registers
- [ ] Test: Can create potion with buff effect

**POC Potion #1 - Potion of Healing (Cure Light Wounds):**
- [ ] Create item: Potion of Healing
  - Type: consumable, consumableType: "potion"
  - Charges: 1/1
  - Activation: free action
  - Effect: "Heals 1d8+1 HP" (or fixed 9 HP in POC)
  - Price: 50 gp
- [ ] Use effect: apply healing buff (temporary effect that heals actor)
  - Healing buff: +1d8 HP gained immediately
- [ ] Test: Drink Potion of Healing
  - Buff applied
  - HP restored
  - Potion consumed (charges to 0, item deleted if quantity 1)

**POC Potion #2 - Potion of Strength:**
- [ ] Create item: Potion of Strength
  - Type: consumable, consumableType: "potion"
  - Charges: 1/1
  - Activation: standard action
  - Effect: "+4 enhancement bonus to STR" for 1 hour
  - Price: 250 gp
- [ ] Use effect: apply buff to actor
  - Buff: STR +4 (enhancement bonus, stacks with other bonus types)
  - Duration: 1 hour (Phase 9 turn tracker compatible)
  - Bonus type: enhancement
- [ ] Test: Drink Potion of Strength
  - STR modifier increased by 2 (bonus +4)
  - Buff visible on actor sheet
  - Expires after 1 hour
  - Potion consumed

**POC Potion #3 - Potion of Cure Poison:**
- [ ] Create item: Potion of Cure Poison
  - Type: consumable, consumableType: "potion"
  - Charges: 1/1
  - Activation: standard action
  - Effect: "Neutralizes active poison" (removes Poisoned condition if present)
  - Price: 50 gp
- [ ] Use effect: remove Poisoned condition from actor
  - Query actor for active Poison conditions
  - Remove (if present)
  - Message: "Poison neutralized"
- [ ] Test: Apply Poison condition, drink Cure Poison potion
  - Poison condition removed
  - Message shown

**Scroll Consumable Type:**
- [ ] Scroll definition: single-use item containing a spell
- [ ] Charges: value: 1, max: 1 (consumed after one reading)
- [ ] Spell attached: contains uuid + level + casterLevel (typically 2 × spell level)
- [ ] Usage: cast spell, must pass appropriate save to read (Spellcraft DC 15 + spell level) if arcane and not wizard, etc.
  - Simple version: always succeeds if user is literate
- [ ] Activation: casting time of contained spell
- [ ] Effect: spell executes from scroll
- [ ] Stub: Full spell scroll prerequisite checks deferred to Phase 25 if complex
  - Simple version: anyone can read the spell
- [ ] Test: Scroll item type registers
- [ ] Test: Can create scroll with spell

**POC Scroll #1 - Scroll of Fireball:**
- [ ] Create item: Scroll of Fireball
  - Type: consumable, consumableType: "scroll"
  - Charges: 1/1
  - Spell: Fireball (3rd-level), casterLevel: 5
  - Activation: standard action
  - Price: 225 gp (3rd-level spell × wizard spell level × 25 gp base)
- [ ] Use effect: trigger spell casting from scroll
  - Cast Fireball spell (caster level 5) as if cast from scroll
  - Follow standard spell casting flow (Phase 16/19)
  - Scroll consumed after casting
- [ ] Test: Use Scroll of Fireball
  - Spell casting dialog appears
  - Template placement
  - Spell resolves
  - Scroll consumed

**POC Scroll #2 - Scroll of Cure Light Wounds:**
- [ ] Create item: Scroll of Cure Light Wounds
  - Type: consumable, consumableType: "scroll"
  - Charges: 1/1
  - Spell: Cure Light Wounds (1st-level), casterLevel: 1
  - Activation: standard action
  - Price: 25 gp
- [ ] Use effect: cast CLW spell
- [ ] Test: Use scroll on party member
  - Touch spell targeting available
  - Heal applied (1d8+1)

**Wand Consumable Type:**
- [ ] Wand definition: reusable item containing a spell, 50 charges
- [ ] Charges: value: 50 (or less if used before), max: 50
  - Can be recharged by spell with X level spells in it (not in Phase 21 scope)
- [ ] Spell attached: spell stored in wand
- [ ] Activation: casting time of spell typically becomes standard action (wand speeds up casting)
- [ ] Usage: expend 1 charge, cast spell from wand
  - No targeting required from wand itself, spell determines targeting
  - Can be used multiple times, each use expends 1 charge
  - If charges reach 0: wand becomes inert (can be recharged with magic)
- [ ] Stub: Recharging wands deferred to Phase 35+ if implemented
- [ ] Test: Wand item type registers
- [ ] Test: Can create wand with charges

**POC Wand #1 - Wand of Cure Light Wounds (Cleric 1st level):**
- [ ] Create item: Wand of Cure Light Wounds
  - Type: consumable, consumableType: "wand"
  - Charges: 50/50
  - Spell: Cure Light Wounds (1st-level), casterLevel: 1
  - Activation: standard action
  - Price: 750 gp (1st-level spell × 1st-level spell cost basis × 50 charges)
- [ ] Use effect: cast CLW each use
  - Expend 1 charge per use
  - Spell casting proceeds normally
- [ ] Test: Use wand 3 times
  - 3 charges consumed (50 → 47)
  - Each use heals target
  - Wand persists (not consumed)
- [ ] Test: Use wand until charges depleted
  - Wand becomes inert

**POC Wand #2 - Wand of Magic Missile:**
- [ ] Create item: Wand of Magic Missile
  - Type: consumable, consumableType: "wand"
  - Charges: 50/50
  - Spell: Magic Missile (1st-level), casterLevel: 1
  - Activation: standard action
- [ ] Test: Use wand to cast Magic Missile
  - 1 charge expended
  - Spell casting follows standard flow

**Dorje Consumable Type (PSI):**
- [ ] Dorje: psionic equivalent of wand
- [ ] TBD: Full psionic system in Phase 24, stub representation for now
- [ ] Charges: value: up to 50, max: 50 (power points, not physical charges)
- [ ] Power attached: similar to spell but for psionics
- [ ] Test: Dorje item type registers (stub)

**Poison Consumable Type:**
- [ ] Poison definition: applies damage/ability damage or condition to target
- [ ] Charges: value: typically 1, max: 1 (single use dose)
- [ ] Application types:
  - Injury: applied to weapon or arrow, affects on hit
  - Contact: affects on touch
  - Ingested: affects when consumed
  - Inhaled: affects when creature enters area
- [ ] Effects: typically ability damage (STR, CON, DEX, etc.) or condition (sleep, paralysis, etc.)
- [ ] Save: poison typically allows save (Fortitude) to resist
- [ ] Stub for Phase 21: Simple poison type, minimal POC
  - Full poison tables deferred to Phase 27 (Content Migration)
- [ ] Test: Poison item type registers

**POC Poison #1 - Ghostcapsule Poison (minimal):**
- [ ] Create item: Ghostcapsule Poison
  - Type: consumable, consumableType: "poison"
  - Charges: 1/1
  - Application: ingested
  - Effect: "1d6 CON damage" plus "Fort save DC 15 or sleep 1 minute"
  - Price: 1500 gp (high-level poison)
- [ ] Use effect: apply condition or damage
  - If ingested: Fort save DC 15 vs poison
  - Success: no effect
  - Failure: 1d6 CON damage + Asleep condition 1 minute
- [ ] Test: Create poison, apply to target
  - Poison condition applied with save trigger

**Drug/Enchantment Consumable Type:**
- [ ] Drug: addictive or temporary-use consumable
- [ ] TBD: Not priority for POC, likely stub
- [ ] Could include: alcohol (temporary CON damage), recreational drugs, etc.

**Misc Consumable Type:**
- [ ] Catch-all category for other consumables (beads, candles, chalk, etc.)
- [ ] TBD: Minimal POC, full integration with utility items Phase 23

**Integration with Actor Inventory:**
- [ ] Consumables appear in actor inventory (Phase 5 actor sheet)
- [ ] Inventory tab shows consumable items with quantity
- [ ] Click "Use" button on consumable:
  - If targeting required (scroll of cure, touchspell): show targeting dialog
  - If instant: apply effect immediately
  - Charges/uses decrement
  - Effect applied
  - Item deleted if last use
- [ ] Test: Add potion to actor inventory, use from inventory
- [ ] Test: Add wand to inventory, use multiple times

**Use Action Integration (Phase 8):**
- [ ] Create "Use Consumable" action chain type
- [ ] Action chain flow:
  1. Check: Can actor use item (has charges/uses, not cursed, etc.)
  2. Activate: Consume one use/charge from item
  3. Apply: Execute effect (cast spell, heal, apply condition, damage, etc.)
  4. Clean up: Delete item if last use
  5. Post: Chat card with effect result
- [ ] Integration with Phase 9 turn budget:
  - Using consumable costs one action (standard action by default)
  - Can use quick action consumables (free action) multiple times
  - Wands with standard action cost standard action per use
- [ ] Test: Use consumable in combat
  - Action economy tracked correctly
  - Effect applied
  - Item removed from inventory if one-use

**Chat Card Integration:**
- [ ] Create chat card template for consumable use:
  - Item name + type (Potion, Scroll, Wand, etc.)
  - User/caster
  - Effect description
  - Charges/uses remaining (show before/after)
  - Result of use (effect applied, damage dealt, healing given, etc.)
  - If spell contained: spell effect (damage, saves, etc.)
- [ ] Include action buttons for follow-up effects (deferred, Phase 8 chat integration)
- [ ] Test: Use consumable, chat card displayed

**Item Identification (Stub for Phase 24):**
- [ ] Identified vs unidentified consumables
- [ ] Unidentified consumables: show generic description ("Unknown Potion", etc.)
- [ ] Identified consumables: show full details
- [ ] Use Identify spell to identify consumable (Phase 25)
- [ ] Stub: Simple implementation, always identified for Phase 21 POC

**Cursed Consumable Option (Advanced):**
- [ ] Some consumables can be cursed (e.g., Potion of Sickness instead of Healing)
- [ ] Using cursed consumable applies negative effect instead
- [ ] Curse can be identified with Identify spell or Detect Magic
- [ ] Stub for Phase 21: Cursed consumables possible but no POC
- [ ] Full cursed item system deferred to Phase 23 (Enhancements)

**System Registration:**
- [ ] Register consumable item type in `system.json`
- [ ] Add to CONFIG.Item.documentClasses: consumable → ItemDnd35eConsumable
- [ ] Add consumable types to CONFIG.DND35E.consumableTypes
- [ ] Add activation types to CONFIG.DND35E.activationTypes (for consumables)

**Localization & i18n:**
- [ ] Add i18n keys: Consumable types (potion, scroll, wand, dorje, poison, etc.)
- [ ] Add i18n keys: Potion names + descriptions
- [ ] Add i18n keys: Scroll labels + spell references
- [ ] Add i18n keys: Wand labels + charge display
- [ ] Add i18n keys: UI labels ("Use", "Charges:", "Uses:")
- [ ] Update en.json with all keys

**Comprehensive Testing:**
- [ ] Unit test: ConsumableSystemModel instantiation with each type
- [ ] Unit test: Charges/uses decrement logic
- [ ] Unit test: autoDestroy flag (item deleted on last use)
- [ ] Integration test: Create Potion of Healing
  - Can use from inventory
  - Healing applied to actor
  - Potion consumed (deleted if quantity 1)
- [ ] Integration test: Create Potion of Strength
  - Can use from inventory
  - Buff applied to actor (STR +4)
  - Buff expires after 1 hour
  - Potion consumed
- [ ] Integration test: Create Scroll of Fireball
  - Can use from inventory
  - Spell casting dialog appears
  - Template placed, targets selected
  - Spell resolves
  - Scroll consumed
- [ ] Integration test: Create Wand of Cure Light Wounds
  - Can use multiple times
  - Each use expends 1 charge
  - Wand persists (50 → 49 → 48...)
  - Healing applied each use
- [ ] Integration test: Use consumable in combat (Phase 9)
  - Standard action cost applies
  - Action economy tracked
  - Effect applied
- [ ] Integration test: Poison consumable applied
  - Poisoned condition applied with save trigger
  - Fort save made
  - Success or failure resolved
- [ ] Edge case: Use last consumable charge
  - Item deleted if quantity 1 and no more charges
- [ ] Edge case: Use consumable with targeting (spell scroll)
  - Targeting dialog appears
  - Can select target
  - Spell cast on target
- [ ] Edge case: Use consumable when no targets available (scroll of heal)
  - Can apply to self or nearby ally
- [ ] Smoke test: Full combat encounter with consumables
  - Characters use potions, scrolls, wands
  - All effects apply correctly
  - No console errors
  - Action economy tracked
- [ ] Performance test: Use 10 consumables in sequence < 2 seconds total

**Documentation & User Guides:**
- [ ] Document each consumable type: potions, scrolls, wands, poisons
- [ ] Document how to use consumables from inventory
- [ ] Document how to create custom consumables
- [ ] Document potion/scroll/wand crafting costs basics (informational)
- [ ] Create journal entry: "Potions & Scrolls"
- [ ] Create journal entry: "Wands & Staffs"
- [ ] Create journal entry: "Poisons"
- [ ] Note limitations: Poison tables in Phase 27, full customization in Phase 23
