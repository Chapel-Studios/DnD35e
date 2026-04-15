# Phase 37: Cards

**Status**: 📖 Rough Sketch (200+ item checklist, card types, counter mechanics)

> **Milestone**: Post-Release  
> **Dependencies**: Phase 8 (Action System)  
> **Goal**: Card item type for tracking special abilities, conditions, and flavor. Cards can be actions, counters, or reference material. Integrate with the action system for card-based abilities (some campaigns use card mechanics instead of tradition action economy).

---

## 30.1 Card Item Type

Cards are flavor/convenience items that sit in your inventory:

```
CardSystemModel extends PhysicalItemSystemModel
├── cardType: 'ability' | 'condition' | 'resource' | 'reference'
├── description: string (rich text)
├── imageUrl: string (card art)
├── effect: optional (if tied to an action or condition)
├── counter: optional {
│   ├── current: number
│   ├── max: number
│   └── label: string ("uses", "rounds", etc.)
├── linkedAction: optional (UUID to an action this card represents)
└── linkedCondition: optional (UUID to a condition this card represents)
```

## 30.2 Card Types

**Ability**: Represents a special ability or feat. Can be dragged onto a character, creates an action in the action system.

**Condition**: Represents a tracked condition ("Cursed for 3 more rounds"). Can synchronize with the condition system (Phase 20).

**Resource**: Represents a countable resource ("Wild Shape uses remaining: 2/3"). Counter auto-updates.

**Reference**: Pure flavor/information ("Curse description", "Spell notes"). Can't be dragged, just viewed.

## 30.3 Card Sheet UI

- Card image (art)
- Card name
- Description (rendered from rich text)
- If counter: +/- buttons to adjust current value
- If action: "Use" button that triggers the linked action
- If condition: indicator showing remaining duration
- Drag-and-drop to add to character sheet

## 30.4 Card Rendering in Chat

When a card's action is triggered or condition applied, render in chat:

```
[CARD: Rage]
Duration: 3 more rounds
Effect: +2 melee, -1 AC

[Icon] Use Now | [Icon] View Details
```

## 30.5 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/card/` — Card class, data model, sheet |
| Create | `src/entities/items/card/data/CardSystemModel.mts` — schema |
| Create | `src/vue/apps/card/CardSheet.vue` — main card sheet |
| Create | Chat card template for card-based actions |
| Modify | `system.json` — register card item type |
| Modify | Inventory components — allow card drag-and-drop |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 30 has not started)

### ❌ Not Started (All Tasks for Phase 30)

**Card Item Type Definition (Schema):**
- [ ] Create `src/entities/items/card/data/CardSystemModel.mts`
- [ ] Extend: `ItemSystemData` base class
- [ ] Properties:
  - `cardType: 'ability' | 'condition' | 'resource' | 'reference'` (enum, required)
  - `description: string` (rich text, HTML allowed)
  - `imageUrl: string` (URL to card art image)
  - `effect: optional` (detailed object if tied to game mechanics)
    - `effectType`: 'bonus' | 'penalty' | 'special' | 'none'
    - `effectDescription`: string (what the effect does)
  - `counter: optional` (only used for 'resource' type)
    - `current: number` (current value, >= 0)
    - `max: number` (maximum value)
    - `label: string` (e.g., "uses", "rounds", "charges")
    - `resetOnShortRest: boolean` (default FALSE)
    - `resetOnLongRest: boolean` (default TRUE)
  - `linkedAction: optional string` (UUID to action in Action System)
  - `linkedCondition: optional string` (UUID to condition)
  - `linkedEffect: optional string` (UUID to ActiveEffect to apply when used)
  - `rarity: string` (optional, "common" | "uncommon" | "rare" | "artifact" for flavor)
  - `source: string` (optional, where the card came from)
  - `tags: string[]` (optional, searchable tags: ["barbarian", "rage"], etc.)
- [ ] Schema validation:
  - cardType must be one of enum values
  - If cardType === 'resource': counter must be present and valid
  - If cardType === 'ability': linkedAction or description must exist
  - If cardType === 'condition': linkedCondition should exist
- [ ] Test: Model instantiates correctly

**Card Item Class:**
- [ ] Create `src/entities/items/card/Card.mts`
- [ ] Extend: `PhysicalItem` class
- [ ] Implement `useCard()` async method:
  - If cardType === 'ability': trigger linkedAction
  - If cardType === 'resource': decrement counter
  - If cardType === 'condition': apply linkedEffect
  - If cardType === 'reference': just display card in chat
  - Return: result object (success boolean, message)
- [ ] Implement `resetCounter()` async method:
  - If counter exists: set current = max
  - Useful for rest actions
- [ ] Implement `applyToActor(actor)` async method:
  - Clone card → new item
  - Add to actor.items
  - Return: result (success, item ID)
- [ ] Implement `canUse()` method:
  - Return: boolean (can this card be used now?)
  - Check: counter not zero, conditions met
- [ ] Test: Card methods functional

**Card Item Sheet UI (Vue Component):**
- [ ] Create `src/vue/apps/card/CardSheet.vue`
- [ ] Extend: `ItemSheetV2`
- [ ] Layout:
  - **Header**: Card name, rarity badge, source label (if present)
  - **Art section**: 
    - Large card image (400x600 px or flexible)
    - Image upload button for GMs
  - **Type selector**: Dropdown to change cardType
  - **Description**: Rich text editor (WYSIWYG or Markdown)
  - **Counter section** (if cardType === 'resource'):
    - Display: "Current: X / Max: Y"
    - Input fields for current and max
    - +/- buttons for quick adjustments
    - Checkboxes: resetOnShortRest, resetOnLongRest
    - Label input: "uses", "rounds", etc.
  - **Links section** (if applicable):
    - "Linked Action": Picker to select Action UUID
    - "Linked Condition": Picker to select Condition UUID
    - "Linked Effect": Picker to select ActiveEffect UUID
  - **Tags section**:
    - Add/remove searchable tags
    - Tag suggestions from prev cards
  - **Action buttons**:
    - "Use Card" button (disabled if can't use)
    - "Reset Counter" button (if counter present and resetable)
    - "Preview Chat" button (show how card will look in chat)
    - "Add to Character (drag or button)" button
- [ ] Responsive: Works on mobile/tablet
- [ ] Test: Sheet renders without errors

**Card Sheet Tabs:**
- [ ] Tab 1: Details (name, image, description, card type)
- [ ] Tab 2: Counter/Mechanics (counter values, links, effects)
- [ ] Tab 3: Tags/Metadata (searchable tags, source, rarity)
- [ ] Persist active tab per user preference
- [ ] Test: Tabs switch correctly

**Card Type-Specific UI Rendering:**
- [ ] **Ability cards**:
  - Highlight: linked action name
  - Show: "This card triggers [Action Name]"
  - Display green "Use" button
- [ ] **Condition cards**:
  - Show: linked condition icon/name
  - Display: "Applies [Condition Name] to holder"
  - Show: duration if available
- [ ] **Resource cards**:
  - Highlight: counter progress (bar chart)
  - Show: X of Y uses remaining
  - Display +/- buttons for adjustment
- [ ] **Reference cards**:
  - Display: "Reference Only" badge (no user action)
  - Disable: "Use Card" button
  - Enable: "View in Chat" button
- [ ] Test: Each type displays correctly

**Counter Mechanics:**
- [ ] Implement counter increment/decrement:
  - Method: `adjustCounter(delta)` async
  - Clamp: keep within [0, max]
  - Triggers: "counter-changed" hook
  - Logs: action to item history
- [ ] Implement rest resets:
  - Hook: when actor takes short/long rest
  - Check: card.system.counter.resetOnShortRest / resetOnLongRest
  - If true: call `resetCounter()`
- [ ] Implement counter UI update:
  - After adjustment: refresh sheet
  - Show: toast notification ("Rage uses: 1/3")
  - Send: message to chat (visible to all)
- [ ] Test: Counter increments/decrements correctly
- [ ] Test: Reset on rest works correctly

**Card-Based Actions (Links to Action System):**
- [ ] If card linkedAction exists:
  - On "Use Card" button → trigger action
  - Pass: card as context (for logging)
  - Example: barbarian "Rage" card triggers Action System "Rage" action
- [ ] If card linkedEffect exists:
  - On "Use Card" → apply effect to actor holdingg card
  - Example: "Buffs" card applies +2 STR effect
- [ ] If card linkedCondition exists:
  - On "Use Card" → apply condition (Phase 20)
  - Example: "Cursed" card applies "cursed" condition
- [ ] Chat log all uses:
  - "[Actor Name] uses [Card Name]"
  - Show: effect triggered or counter decremented
- [ ] Test: Linked actions execute correctly

**Card Drag-and-Drop:**
- [ ] Implement drag from compendium → actor inventory:
  - Card in compendium browser → drag to actor sheet
  - Drop → copy card to actor's items
  - Show: toast "Card added to inventory"
- [ ] Implement drag from card sheet → character sheet:
  - Open card sheet → drag name/image to actor
  - Drop → same as above
- [ ] Implement drag → external (world/journal):
  - Drag card → chat
  - Result: card rendered in chat
  - Droppable: reference only
- [ ] Test: Drag-and-drop works

**Chat Card Display/Rendering:**
- [ ] Create chat template: `templates/chat/card.hbs`
- [ ] Display format:
  ```
  [CARD: Rage]
  Rarity: Uncommon
  
  [Card Art Image]
  
  Description:
  "You enter a powerful rage, gaining +2 to melee attacks but -1 AC..."
  
  Effect: +2 melee, -1 AC
  Duration: 3 more rounds
  
  [Use Now] [View Details] [Add to Character]
  ```
- [ ] Include:
  - Card name as title
  - Card art image
  - Description (rich text rendered)
  - Effect description (if present)
  - Counter (if resource): "X/Y uses remaining"
  - Buttons: Use, View Details, Add to Character
- [ ] Buttons in chat:
  - "Use Now": trigger useCard() on original card
  - "View Details": open card sheet or pop-up
  - "Add to Character": drag method above
- [ ] Test: Chat card displays correctly

**Card Inventory Display:**
- [ ] In character inventory:
  - Show: card as item in "Items" or "Cards" section
  - Display: Card image thumbnail (60x90 px)
  - Display: Card name
  - Display: Counter if resource (X/Y)
  - Click → open CardSheet
  - Right-click → context menu (use, delete, etc.)
- [ ] Organize:
  - Separate "Cards" tab on inventory sheet (optional)
  - Or mixed in with items
  - Settable per GM preference
- [ ] Test: Cards appear in inventory

**Card Drag-and-Drop on Sheet:**
- [ ] Drag card icon from inventory → action bar (if supported)
- [ ] Quick-access: macros or action bar can reference card
- [ ] Result: One-click "Use Card"
- [ ] Test: Drag to action bar works

**Card Compendium Browsing:**
- [ ] Integrate with Phase 26 Compendium Browser:
  - Add filter: "Cards"
  - Show: all packaged cards
  - Filter by type: Ability, Condition, Resource, Reference
  - Filter by tag (e.g., "barbarian", "spell")
- [ ] Search: card name, description, tags
- [ ] Preview: click card → shows in CompendiumBrowser detail pane
- [ ] Add to character: button in preview or drag
- [ ] Test: Cards browsable and addable

**Card Compendium Package:**
- [ ] Create compendium: `dnd35e.cards` (built-in cards)
- [ ] Populate with example cards per class:
  - **Barbarian**: "Rage" card (resource, 3+CON mod uses, +2 melee, -1 AC effect)
  - **Paladin**: "Divine Wrath" card (ability, action, effect: extra smite damage)
  - **Bard**: "Inspiration" card (resource, X uses, grants bardic inspiration)
  - **Monk**: "Flurry of Blows" card (ability, action chain)
  - And 10+ more examples
- [ ] Each card fully populated:
  - Name, description, image
  - cardType: 'ability' or 'resource'
  - Counter values if needed
  - Linked action/effect if applicable
  - Tags for filtering
- [ ] Test: Cards load from compendium

**System Settings for Cards:**
- [ ] Add to `system.json`:
  ```json
  "settings": [
    {
      "key": "ui.inventory.showCardsSeparate",
      "default": false,
      "scope": "world",
      "type": Boolean,
      "label": "Show Cards in separate inventory tab"
    },
    {
      "key": "cards.renderInChat",
      "default": true,
      "scope": "world",
      "type": Boolean,
      "label": "Auto-render cards in chat when used"
    }
  ]
  ```
- [ ] Settings UI in world settings
- [ ] Test: Settings persist

**Card Filtering & Search:**
- [ ] In inventory or cards tab:
  - Search box: filter by name or tag
  - Dropdown: filter by cardType (All, Ability, Condition, Resource, Reference)
  - Optional: filter by rarity
  - Live filtering (debounced)
- [ ] Sorting:
  - By name (A-Z)
  - By type
  - By rarity
  - Custom order via drag-reorder
- [ ] Test: Filtering and sorting works

**Localization & i18n:**
- [ ] Add i18n keys:
  - `item.card.types.ability`
  - `item.card.types.condition`
  - `item.card.types.resource`
  - `item.card.types.reference`
  - `item.card.counter.label`
  - `item.card.counter.remaining`
  - `item.card.button.use`
  - `item.card.button.add-to-character`
  - `item.card.description.linked-action`
  - `item.card.description.linked-condition`
- [ ] Update en.json

**Comprehensive Testing:**
- [ ] Unit test: CardSystemModel validation
  - Valid card with all fields
  - Valid card minimal fields
  - Invalid card (missing required type)
  - Invalid card (bad cardType enum)
- [ ] Unit test: Counter logic
  - `adjustCounter(+1)` increments
  - `adjustCounter()` clamps to [0, max]
  - `resetCounter()` sets to max
- [ ] Integration test: Card in actor inventory
  - Add card to actor
  - Card appears on sheet
  - Can click card → opens sheet

- [ ] Integration test: Counter adjustment
  - Start with X uses
  - Adjust +1, -1
  - Counter displays correctly
  - Counter persists on save
- [ ] Integration test: Use Card with linked action
  - Card has linkedAction set
  - Click "Use" button
  - Action System triggers
  - Chat message appears
- [ ] Integration test: Use Card with counter
  - Resource card with counter
  - Click "Use" button
  - Counter decrements
  - Toast shows new value
  - Cannot use when counter = 0
- [ ] Integration test: Drag card to actor
  - Card in inventory
  - Drag to another actor
  - Copy created
  - Original remains
- [ ] Integration test: Render card in chat
  - Card "Use" button in chat
  - Click button
  - Card effect applies
  - Chat records action
- [ ] Integration test: Compendium card
  - Load card from dnd35e.cards pack
  - Add to actor via browser
  - Card works identically to local
- [ ] Edge case: Counter = 0
  - Cannot use resource card
  - "Use" button disabled or grayed
- [ ] Edge case: Multiple cards with same name
  - Each tracked independently
  - Counter adjustments don't cross-affect
- [ ] Edge case: Card with no image/art
  - Sheet still renders
  - Shows placeholder
- [ ] Edge case: Drag card onto non-actor target
  - Gracefully fails
  - Shows error toast
- [ ] Smoke test: All 4 card types functional
- [ ] Smoke test: No console errors with cards
- [ ] Performance test: Inventory rendering with 20 cards < 200ms

**Documentation & User Guides:**
- [ ] Document card item type: what is a card
- [ ] Document card types: each type and use cases
- [ ] Document counter mechanics: how to use resources
- [ ] Document linking actions/conditions/effects to cards
- [ ] Document drag-and-drop usage
- [ ] Document GM setup: creating cards for campaigns
- [ ] Tutorial: Creating a custom class action card

---

## 30.6 Success Criteria

✅ **Card item type complete**  
✅ **All four card types functional**  
✅ **Counter mechanics working**  
✅ **Card chat rendering clear**  
✅ **Drag-and-drop works**  
✅ **Condition sync (if applicable) working**  
