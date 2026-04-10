---
description: "Look up Foundry VTT API, data structures, and patterns. Find classes, methods, events, and configuration options."
---

# Foundry Reference Skill

## Using This Skill

Ask questions like:
- "How do I listen to actor update events?"
- "What's the hierarchy of actor sheets?"
- "How do I query items from a compendium?"
- "What folder structure does Foundry expect?"
- "How do I register a custom ActiveEffect handler?"

This skill helps you:
- **Find API methods** for working with documents (actors, items, scenes)
- **Understand structure** of Foundry data (Documents, DataModels, DataFields)
- **Locate events & hooks** for responding to changes
- **Navigate configuration** for items, actors, and system settings
- **Query & modify** data efficiently

## Core Foundry Concepts

### Documents (Top-level Collections)

```
Actor (PlayersCharacters, Companions, Monsters, NPCs)
  ├── Item (weapons, spells, abilities)
  ├── Sheet (UI for editing actor)
  └── Effects (modifiers, auras, temporary effects)

Item (Weapon, Spell, Feat, Armor, etc.)
  ├── Sheet (UI for editing item)
  └── Effects (modifiers added by item)

Scene (Battle maps, exploration areas)
  ├── Token (Placed actor instance)
  └── Drawings (Markers, info graphics)

Compendium (Packed data collections)
  └── Entries (Items, Actors, Scenes, Macros)

ChatMessage (Spell rolls, combat actions logged)
Macro / SceneNote / … (Other document types)
```

### Data Layer

```
Document (Actor, Item, etc.)
  ├── system [DataModel] ← dnd35e-specific data
  └── data [Legacy] ← general fields (name, type, etc.)

DataModel (Item's system field)
  └── Fields [DataField] ← individual persisted fields
      ├── NumberField (stats)
      ├── StringField (text)
      ├── SchemaField (nested objects)
      └── Dnd35eField (wraps value + metadata)
```

## Common API Patterns

### Querying Documents

```typescript
// Find actors
game.actors.getName("Goblin King");
game.actors.get(actorId);
game.actors.filter(a => a.type === 'npc');

// Find items in actor
actor.items.getName("Longsword");
actor.items.filter(i => i.type === 'weapon');

// Query compendium
const pack = game.packs.get('dnd35e.weapons-core');
const item = await pack.getDocument(itemId);
const weapons = await pack.getDocuments({ type: 'weapon' });

// Search all
game.actors.contents           // All actors
game.scenes.contents           // All scenes
game.items.contents            // GM items only (legacy)
```

### Creating/Updating Data

```typescript
// Create new actor
await Actor.create({
  name: "New NPC",
  type: "npc",
  system: { hardness: 10 }
});

// Update actor (delta merge)
await actor.update({
  'name': 'Updated Name',
  'system.abilities.str.value': 18
});

// Update source (no saves to server)
actor.updateSource({
  'system.hp.value': 50
});

// Delete
await actor.delete();
```

### Listening to Events

```typescript
// Document hooks
Hooks.on('createActor', (actor, options, userId) => {});
Hooks.on('updateActor', (actor, update, options, userId) => {});
Hooks.on('deleteActor', (actor, options, userId) => {});

// Sheet hooks
Hooks.on('renderActorSheet', (sheet, html, data) => {});
Hooks.on('closeActorSheet', (sheet, html) => {});

// Custom hooks
Hooks.call('myCustomEvent', {data: 'hello'});
```

### Accessing Document Layers

```typescript
// Get system-specific data
const dnd35eData = item.system;  // ItemDataModel instance

// Get all fields
const schema = ItemDataModel.schema;
for (const [name, field] of schema.entries()) {
  console.log(name, field.constructor.name);
}

// Get rendered data (for sheets)
const data = item.toObject();  // Flattened for sheets
```

## Common Tasks

### Task: Add Custom Property to Actor

```typescript
// In actor DataModel
static defineSchema() {
  return {
    properties: new SchemaField({
      customField: new StringField({ initial: 'default' })
    })
  };
}

// Use it
actor.system.properties.customField = 'value';
```

### Task: Listen to Item Changes

```typescript
class MyComponent {
  constructor(actor) {
    this.actor = actor;
    Hooks.on('updateItem', this._onItemUpdate.bind(this));
  }
  
  _onItemUpdate(item, update, options, userId) {
    if (item.actor?.id !== this.actor.id) return;  // Not our actor
    console.log('Item updated:', item.name, update);
  }
}
```

### Task: Modify Active Effect

```typescript
// Create effect
await actor.createEmbeddedDocuments('ActiveEffect', [{
  label: 'Strength Boost',
  icon: 'icons/svg/aura.svg',
  changes: [{
    key: 'system.abilities.str.value',
    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
    value: 5
  }]
}]);

// Update effect
const effect = actor.effects.getName('Strength Boost');
await effect.update({ disabled: true });  // Disable

// Disable all effects of type 'enchantment'
for (const effect of actor.effects) {
  if (effect.getFlag('dnd35e', 'effectType') === 'enchantment') {
    await effect.update({ disabled: true });
  }
}
```

### Task: Work with Sheets

```typescript
// Get sheet instance
const sheet = actor.sheet;
if (sheet?.rendered) {
  // Sheet is currently open
  sheet.render(true);  // Force refresh
}

// Get element
const html = sheet.element;
html.find('.my-button').on('click', handler);

// Application lifecycle
class MySheet extends ActorSheet {
  getData(options) {
    return { ...super.getData(options), extra: 'data' };
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.button').on('click', () => {});
  }
}
```

## Configuration Locations

System configuration files:

```
system.json          ← System metadata, packs, icons, sheets
template.json        ← Item/Actor type definitions (legacy)
lang/               ← Localization strings
icons/              ← System icons
```

Data files (in config):

```
Config/options.json   ← User settings (render preferences, etc.)
Data/worlds/dev/      ← Active world data
```

## Compendium Packing

Compendiums are `.db` files with packed JSON entries:

```typescript
// Query packed data
const pack = game.packs.get('dnd35e.weapons-core');
const index = await pack.getIndex();  // Lightweight metadata

// Load for edit
const weapon = await pack.getDocument(itemId);
await weapon.update({...});  // Changes reflected in pack

// Batch load
const weapons = await pack.getDocuments({ type: 'weapon' });
```

## Related Skills

- **system-comparison**: How Foundry APIs differ between systems
- **implementation-guide**: Step-by-step using Foundry APIs
- **phase-reference**: What features are in each phase

## Where to Find More

- [Foundry API Docs](https://foundryvtt.com/api/)
- [System Documentation](../../../README.md)
- [Data Field Types](../../instructions/foundry-data-fields.instructions.md)
