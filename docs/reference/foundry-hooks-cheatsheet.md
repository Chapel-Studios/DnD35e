# Foundry VTT Hooks Cheatsheet

> Cataloged from source: `App/resources/app/` (Foundry VTT v14)
>
> **`Hooks.callAll`** — Every registered handler fires. Cannot be prevented.
> **`Hooks.call`** — Handlers run in order. Return `false` from any handler to cancel the operation.

---

## Table of Contents

- [Game Lifecycle](#game-lifecycle)
- [World State](#world-state)
- [Document CRUD (Templated)](#document-crud-templated)
- [Application Lifecycle (Templated)](#application-lifecycle-templated)
- [Context Menus (Templated)](#context-menus-templated)
- [Canvas Lifecycle](#canvas-lifecycle)
- [Canvas Layers (Templated)](#canvas-layers-templated)
- [Canvas Groups (Templated)](#canvas-groups-templated)
- [Canvas Environment & Vision](#canvas-environment--vision)
- [Placeable Objects (Templated)](#placeable-objects-templated)
- [Token](#token)
- [Combat](#combat)
- [Active Effects](#active-effects)
- [Chat & Messaging](#chat--messaging)
- [Cards](#cards)
- [Adventure Import](#adventure-import)
- [Compendium](#compendium)
- [Sidebar & UI](#sidebar--ui)
- [Sheet Drop Operations](#sheet-drop-operations)
- [ProseMirror Editor](#prosemirror-editor)
- [Audio](#audio)
- [AV / WebRTC](#av--webrtc)
- [Detached Windows](#detached-windows)
- [Miscellaneous](#miscellaneous)
- [Appendix: Document Types](#appendix-document-types)

---

## Game Lifecycle

These fire once during game initialization, in this order:

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `init` | `callAll` | `()` | First hook. Register CONFIG, sheets, data models here. |
| `i18nInit` | `callAll` | `()` | Localization loaded. Pre-localize CONFIG labels here. |
| `setup` | `callAll` | `()` | After i18n, before game state/UI. Register sheets, run `registerCommon()`. |
| `ready` | `callAll` | `()` | Full game ready. All documents loaded, canvas drawn. |
| `streamReady` | `callAll` | `()` | Stream/broadcast view is ready (stream clients only). |

**Source:** `client/game.mjs`, `client/helpers/localization.mjs`

### Usage Pattern (system registration)

```ts
Hooks.once('init', () => {
  CONFIG.Item.documentClass = MyItemClass;
  Object.assign(CONFIG.Item.dataModels, { weapon: WeaponModel });
});

Hooks.once('setup', () => {
  registerSheets();
});

Hooks.once('ready', () => {
  // Safe to access game.users, game.actors, etc.
});
```

---

## World State

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `pauseGame` | `callAll` | `(paused: boolean, options: object)` | Game pause toggled. |
| `updateWorldTime` | `callAll` | `(worldTime: number, dt: number, options: object, userId: string)` | In-game time advances. |
| `hotReload` | **`call`** | `(data: object)` | Hot module reload. Return `false` to prevent. |
| `userConnected` | `callAll` | `(user: User, active: boolean)` | A user connects/disconnects. |
| `clientSettingChanged` | `callAll` | `(key: string, value: any, options: object)` | A client setting value changed. |
| `error` | `callAll` | `(location: string, error: Error, data: object)` | An error is dispatched. |

---

## Document CRUD (Templated)

These hooks fire for **every** document type. Replace `{Type}` with any document name from the [appendix](#appendix-document-types).

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `preCreate{Type}` | **`call`** | `(document, data, options, userId)` | Before creation. Return `false` to cancel. |
| `create{Type}` | `callAll` | `(document, options, userId)` | After creation. |
| `preUpdate{Type}` | **`call`** | `(document, changes, options, userId)` | Before update. Return `false` to cancel. Mutate `changes` to alter. |
| `update{Type}` | `callAll` | `(document, changes, options, userId)` | After update. |
| `preDelete{Type}` | **`call`** | `(document, options, userId)` | Before deletion. Return `false` to cancel. |
| `delete{Type}` | `callAll` | `(document, options, userId)` | After deletion. |

**Source:** `client/data/client-backend.mjs`

### Common Examples

```
preCreateItem, createItem, preUpdateActor, updateActor, deleteActiveEffect
preCreateChatMessage, updateScene, preDeleteCombat
```

### Synthetic Actor (ActorDelta) Note

For **unlinked tokens**, Foundry dispatches synthetic actor hooks through `ActorDelta`:
- `preUpdateActor` fires via `ActorDelta._preUpdate()` for the synthetic actor
- `updateActor` fires via `ActorDelta._onUpdate()` for the synthetic actor

---

## Application Lifecycle (Templated)

For **Application v2** (`foundry.applications.api.ApplicationV2` and subclasses), hooks fire for the class and all parent classes in the inheritance chain. Replace `{AppName}` with the application class name.

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `preRender{AppName}` | `callAll` | `(app, context, options)` | Before render. |
| `render{AppName}` | `callAll` | `(app, element, context, options)` | After render. |
| `getHeaderControls{AppName}` | `callAll` | `(app, controls[])` | Collecting header buttons. Mutate `controls` to add/remove. |
| `close{AppName}` | `callAll` | `(app)` | After close. |

For **Application v1** (legacy `Application`):

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `render{AppName}` | `callAll` | `(app, html, data)` | After render. |

**Source:** `client/applications/api/application.mjs`, `client/appv1/api/application-v1.mjs`

### Examples

```
renderActorSheet, preRenderItemSheet, closeJournalSheet
getHeaderControlsActorSheet, renderChatLog, renderSettings
```

---

## Context Menus (Templated)

These fire when building right-click context menus. Mutate the `menuItems` array to add/remove options.

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `get{AppName}ContextOptions` | `callAll` | `(app, menuItems[])` | Default pattern for any app. |
| `get{DocName}ContextOptions` | `callAll` | `(app, menuItems[])` | Document directory context menus. |
| `getFolderContextOptions` | `callAll` | `(app, menuItems[])` | Folder context menu in directories. |
| `getSceneContextOptions` | `callAll` | `(app, menuItems[])` | Scene navigation bar. |
| `getUserContextOptions` | `callAll` | `(app, menuItems[])` | Players list. |
| `getMacroContextOptions` | `callAll` | `(app, menuItems[])` | Hotbar macros. |
| `getCompendiumContextOptions` | `callAll` | `(app, menuItems[])` | Compendium directory. |
| `getCombatContextOptions` | `callAll` | `(app, menuItems[])` | Combat tracker entries. |
| `getChatMessageContextOptions` | `callAll` | `(app, menuItems[])` | Chat message right-click. |
| `getPlaylistContextOptions` | `callAll` | `(app, menuItems[])` | Playlist entries. |
| `getPlaylistSoundContextOptions` | `callAll` | `(app, menuItems[])` | Playlist sound entries. |
| `getJournalEntryPageContextOptions` | `callAll` | `(app, menuItems[])` | Journal page entries. |
| `get{DocName}PlaceableContextOptions` | `callAll` | `(app, menuItems[])` | Placeable HUD context (sidebar placeable tab). |

**Source:** Various sidebar/UI files

---

## Canvas Lifecycle

Fire in this order when a scene is loaded:

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `canvasConfig` | `callAll` | `(config: object)` | Canvas configuration prepared. Mutate `config` to alter. |
| `canvasInit` | `callAll` | `(canvas: Canvas)` | Canvas initialized. |
| `canvasDraw` | `callAll` | `(canvas: Canvas)` | Canvas drawn (layers, groups ready). |
| `canvasReady` | **`call`** | `(canvas: Canvas)` | Canvas fully ready. Return `false` to prevent. |
| `canvasTearDown` | `callAll` | `(canvas: Canvas)` | Canvas being torn down (scene change). |
| `canvasPan` | `callAll` | `(canvas: Canvas, position: {x, y, scale})` | Canvas viewport panned/zoomed. |
| `dropCanvasData` | **`call`** | `(canvas: Canvas, data: object, event: DragEvent)` | Something dropped on canvas. Return `false` to prevent. |
| `highlightObjects` | `callAll` | `(active: boolean)` | Alt-key highlight toggled. |
| `initializeEdges` | `callAll` | `()` | Edge/wall geometry initialized. |

**Source:** `client/canvas/board.mjs`, `client/canvas/geometry/edges/edges.mjs`

---

## Canvas Layers (Templated)

Replace `{LayerName}` with the layer's `hookName` value.

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `draw{LayerName}` | `callAll` | `(layer)` | Layer drawn. |
| `tearDown{LayerName}` | `callAll` | `(layer)` | Layer torn down. |
| `activate{LayerName}` | `callAll` | `(layer)` | Layer activated (user switched tool). |
| `deactivate{LayerName}` | `callAll` | `(layer)` | Layer deactivated. |
| `activateCanvasLayer` | `callAll` | `(layer)` | Generic — fires for every layer activation. |

### Layer hookName Values

| Layer Class | hookName |
|-------------|----------|
| `TokenLayer` | `TokenLayer` |
| `TilesLayer` | `TilesLayer` |
| `DrawingsLayer` | `DrawingsLayer` |
| `WallsLayer` | `WallsLayer` |
| `LightingLayer` | `LightingLayer` |
| `SoundsLayer` | `SoundsLayer` |
| `NotesLayer` | `NotesLayer` |
| `TemplateLayer` | `TemplateLayer` |
| `RegionLayer` | `RegionLayer` |
| `GridLayer` | `GridLayer` |
| `WeatherEffects` | `WeatherEffects` |

### Examples

```
drawTokenLayer, activateWallsLayer, tearDownLightingLayer, deactivateDrawingsLayer
```

**Source:** `client/canvas/layers/base/canvas-layer.mjs`, `client/canvas/layers/base/interaction-layer.mjs`

---

## Canvas Groups (Templated)

Replace `{GroupName}` with the group's class name.

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `draw{GroupName}` | `callAll` | `(group)` | Group drawn. |
| `tearDown{GroupName}` | `callAll` | `(group)` | Group torn down. |

### Group Names

| Group Class | hookName |
|-------------|----------|
| `EffectsCanvasGroup` | `EffectsCanvasGroup` |
| `EnvironmentCanvasGroup` | `EnvironmentCanvasGroup` |
| `HiddenCanvasGroup` | `HiddenCanvasGroup` |
| `InterfaceCanvasGroup` | `InterfaceCanvasGroup` |
| `OverlayCanvasGroup` | `OverlayCanvasGroup` |
| `PrimaryCanvasGroup` | `PrimaryCanvasGroup` |
| `RenderedCanvasGroup` | `RenderedCanvasGroup` |
| `CanvasVisibility` | `CanvasVisibility` |

### Examples

```
drawEffectsCanvasGroup, tearDownPrimaryCanvasGroup, drawCanvasVisibility
```

**Source:** `client/canvas/groups/canvas-group-mixin.mjs`, `client/canvas/groups/effects.mjs`

---

## Canvas Environment & Vision

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `configureCanvasEnvironment` | **`call`** | `(config: object)` | Environment configured. Return `false` to prevent. |
| `initializeCanvasEnvironment` | `callAll` | `()` | Environment initialized. |
| `initializeVisionMode` | `callAll` | `(visibility: CanvasVisibility)` | Vision mode set up. |
| `initializeVisionSources` | `callAll` | `(sources: Collection)` | Vision sources initialized. |
| `initializeLightSources` | `callAll` | `(group: EffectsCanvasGroup)` | Light sources initialized. |
| `initializePriorityLightSources` | `callAll` | `(group: EffectsCanvasGroup)` | Priority light sources initialized. |
| `initializeWeatherEffects` | `callAll` | `(weatherLayer, config: object)` | Weather effects initialized. |
| `visibilityRefresh` | `callAll` | `(visibility: CanvasVisibility)` | Visibility recomputed. |
| `lightingRefresh` | `callAll` | `(group: EffectsCanvasGroup)` | Lighting recomputed. |
| `sightRefresh` | `callAll` | `(visibility: CanvasVisibility)` | Sight/fog recomputed. |

**Source:** `client/canvas/groups/visibility.mjs`, `client/canvas/groups/environment.mjs`, `client/canvas/groups/effects.mjs`

---

## Placeable Objects (Templated)

Replace `{DocumentName}` with the placeable's document name (e.g., `Token`, `Tile`, `Wall`, `Drawing`, `AmbientLight`, `AmbientSound`, `Note`, `Region`).

For `control` and `hover`, replace `{EmbeddedName}` with the embedded name (e.g., `Token`, `Tile`, `Wall`).

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `draw{DocumentName}` | `callAll` | `(placeable)` | Placeable object drawn on canvas. |
| `refresh{DocumentName}` | `callAll` | `(placeable, flags: object)` | Placeable refreshed. `flags` indicate what changed. |
| `destroy{DocumentName}` | `callAll` | `(placeable)` | Placeable destroyed/removed from canvas. |
| `control{EmbeddedName}` | `callAll` | `(placeable, controlled: boolean)` | Placeable selected/deselected. |
| `hover{EmbeddedName}` | `callAll` | `(placeable, hovered: boolean)` | Mouse enters/leaves placeable. |
| `paste{DocumentName}` | **`call`** | `(objects[], data, {cut: boolean})` | Placeables pasted. Return `false` to prevent. |

### Examples

```
drawToken, refreshWall, destroyTile, controlToken, hoverAmbientLight, pasteDrawing
```

**Source:** `client/canvas/placeables/placeable-object.mjs`, `client/canvas/layers/base/placeables-layer.mjs`

---

## Token

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `preMoveToken` | **`call`** | `(document: TokenDocument, movement, operation)` | Before token moves. Return `false` to prevent. |
| `moveToken` | `callAll` | `(document: TokenDocument, movement, operation, user)` | Token moved. |
| `stopToken` | `callAll` | `(document: TokenDocument)` | Token movement stopped. |
| `pauseToken` | `callAll` | `(document: TokenDocument)` | Token movement paused. |
| `planToken` | `callAll` | `(document: TokenDocument)` | Token movement planned/waypoint. |
| `recordToken` | `callAll` | `(document: TokenDocument)` | Token position recorded. |
| `targetToken` | `callAll` | `(user: User, token: Token, targeted: boolean)` | Token targeted/untargeted. |
| `applyTokenStatusEffect` | `callAll` | `(token: Token, statusId: string, active: boolean)` | Status effect toggled on token. |
| `initializeDynamicTokenRingConfig` | `callAll` | `(ringConfig: object)` | Dynamic token ring configuration initialized. |

**Source:** `client/documents/token.mjs`, `client/canvas/placeables/token.mjs`, `client/canvas/placeables/tokens/targets.mjs`

---

## Combat

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `combatStart` | `callAll` | `(combat: Combat, updateData: object)` | Combat encounter started. |
| `combatRound` | `callAll` | `(combat: Combat, updateData: object, updateOptions: object)` | New round begins. |
| `combatTurn` | `callAll` | `(combat: Combat, updateData: object, updateOptions: object)` | Turn advances. |
| `combatTurnChange` | `callAll` | `(combat: Combat, previous: object, current: object)` | Active combatant changed. |
| `initializeCombatConfiguration` | `callAll` | `(config: object)` | Combat configuration initialized. Mutate `config`. |

**Source:** `client/documents/combat.mjs`, `client/data/combat-config.mjs`

---

## Active Effects

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `applyActiveEffect` | **`call`** | `(actor, change, current, delta, changes)` | An AE change is being applied. Override application logic. |
| `applyCompendiumArt` | `callAll` | `(documentClass, source, pack, art)` | Compendium art mapping applied to a document. |
| `modifyTokenAttribute` | **`call`** | `({attribute, value, isDelta, isBar}, updates, actor)` | Token bar attribute modified. Return `false` to prevent. |

**Source:** `client/documents/active-effect.mjs`, `client/documents/actor.mjs`, `common/data/fields.mjs`

---

## Chat & Messaging

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `chatInput` | **`call`** | `(event: Event, options: object)` | Chat input submitted (ProseMirror). Return `false` to prevent. |
| `chatMessage` | **`call`** | `(chatLog, message: string, chatData: object)` | Chat message about to be created. Return `false` to prevent. |
| `renderChatInput` | `callAll` | `(app, {elements}, context)` | Chat input area rendered. |
| `renderChatMessageHTML` | `callAll` | `(message: ChatMessage, html: HTMLElement, messageData?)` | Chat message HTML rendered. Modify `html` to alter display. |
| `renderChatMessage` | `callAll` | `(message: ChatMessage, $html: jQuery, messageData)` | Legacy jQuery variant of chat message render. |
| `chatBubbleHTML` | **`call`** | `(token: Token, html: HTMLElement, message: string, options)` | Chat bubble HTML created. Return `false` to prevent. |
| `chatBubble` | **`call`** | `(token: Token, $html: jQuery, message: string, options)` | Legacy jQuery chat bubble. Return `false` to prevent. |

**Source:** `client/applications/sidebar/tabs/chat.mjs`, `client/documents/chat-message.mjs`, `client/canvas/animation/chat-bubbles.mjs`

---

## Cards

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `dealCards` | **`call`** | `(origin: Cards, destinations: Cards[], {action, toCreate, fromUpdate, fromDelete})` | Cards dealt. Return `false` to prevent. |
| `passCards` | **`call`** | `(origin: Cards, destination: Cards, {action, toCreate, toUpdate, fromUpdate, fromDelete})` | Cards passed. Return `false` to prevent. |
| `returnCards` | **`call`** | `(origin: Cards, returned: Card[], {toUpdate, fromDelete})` | Cards returned to deck. Return `false` to prevent. |

**Source:** `client/documents/cards.mjs`

---

## Adventure Import

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `preImportAdventure` | **`call`** | `(adventure, options/formData, toCreate, toUpdate)` | Before adventure import. Return `false` to prevent. |
| `importAdventure` | `callAll` | `(adventure, options/formData, created, updated)` | After adventure imported. |

**Source:** `client/documents/adventure.mjs`, `client/appv1/sheets/adventure-importer.mjs`

---

## Compendium

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `updateCompendium` | `callAll` | `(pack: CompendiumCollection, documents, operation, userId)` | Compendium pack updated. |

**Source:** `client/documents/collections/compendium-collection.mjs`

---

## Sidebar & UI

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `changeSidebarTab` | `callAll` | `(tab: SidebarTab)` | Active sidebar tab changed. |
| `collapseSidebar` | `callAll` | `(sidebar, collapsed: boolean)` | Sidebar collapsed/expanded. |
| `collapseSceneNavigation` | `callAll` | `(app, collapsed: boolean)` | Scene navigation collapsed/expanded. |
| `getSceneControlButtons` | `callAll` | `(controls: SceneControl[])` | Scene control buttons collected. Mutate to add custom tools. |
| `hotbarDrop` | **`call`** | `(hotbar: Hotbar, data: object, slot: number)` | Macro dropped on hotbar. Return `false` to prevent default. |

**Source:** `client/applications/sidebar/sidebar.mjs`, `client/applications/ui/scene-controls.mjs`, `client/applications/ui/hotbar.mjs`

---

## Sheet Drop Operations

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `dropActorSheetData` | **`call`** | `(actor: Actor, sheet, data: object)` | Data dropped on actor sheet. Return `false` to prevent. |
| `dropItemSheetData` | **`call`** | `(document, sheet, data: object)` | Data dropped on item sheet. Return `false` to prevent. |
| `dropRollTableSheetData` | **`call`** | `(table: RollTable, sheet, data: object)` | Data dropped on roll table sheet. Return `false` to prevent. |

**Source:** `client/applications/sheets/actor-sheet.mjs`, `client/applications/sheets/item-sheet.mjs`, `client/applications/sheets/roll-table-sheet.mjs`

---

## ProseMirror Editor

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `createProseMirrorEditor` | `callAll` | `(uuid: string, plugins: object[], options: object)` | ProseMirror editor created. Add custom plugins. |
| `getProseMirrorMenuDropDowns` | `callAll` | `(menu, menus: object)` | Collecting menu dropdowns. Mutate to add items. |
| `getProseMirrorMenuItems` | `callAll` | `(menu, items: object)` | Collecting menu items. Mutate to add items. |
| `activateEditorLegacy` | `callAll` | `(editor, options, content)` | Legacy TinyMCE/editor activated (deprecated). |

**Source:** `client/applications/ux/prosemirror-editor.mjs`, `common/prosemirror/menu.mjs`

---

## Audio

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `globalPlaylistVolumeChanged` | `callAll` | `(volume: number)` | Playlist volume slider changed. |
| `globalAmbientVolumeChanged` | `callAll` | `(volume: number)` | Ambient volume slider changed. |
| `globalInterfaceVolumeChanged` | `callAll` | `(volume: number)` | Interface volume slider changed. |

**Source:** `client/audio/helper.mjs`

---

## AV / WebRTC

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `rtcSettingsChanged` | `callAll` | `(settings: AVSettings, changed: object)` | AV/RTC settings changed. |

**Source:** `client/av/settings.mjs`

---

## Detached Windows

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `openDetachedWindow` | `callAll` | `(id: string, win: Window)` | Detached (pop-out) window opened. |
| `closeDetachedWindow` | `callAll` | `(id: string, win: Window)` | Detached window closed. |

**Source:** `client/applications/detached/window-manager.mjs`

---

## Miscellaneous

| Hook | Method | Signature | When |
|------|--------|-----------|------|
| `activateNote` | **`call`** | `(note: Note, options: object)` | Map note activated/clicked. Return `false` to prevent. |
| `initialize{SourceName}Shaders` | `callAll` | `(source: RenderedEffectSource)` | Custom shaders initialized for a rendered effect source. |

**Source:** `client/canvas/placeables/note.mjs`, `client/canvas/sources/rendered-effect-source.mjs`

---

## Appendix: Document Types

These are the valid `{Type}` values for document CRUD hooks like `preCreateItem`, `updateActor`, etc.

### Primary Document Types

`ActiveEffect` · `Actor` · `Adventure` · `Cards` · `ChatMessage` · `Combat` · `FogExploration` · `Folder` · `Item` · `JournalEntry` · `Macro` · `Playlist` · `RollTable` · `Scene` · `Setting` · `User`

### Embedded Document Types

`ActiveEffect` · `ActorDelta` · `AmbientLight` · `AmbientSound` · `Card` · `Combatant` · `CombatantGroup` · `Drawing` · `Item` · `JournalEntryCategory` · `JournalEntryPage` · `Level` · `Note` · `PlaylistSound` · `Region` · `RegionBehavior` · `TableResult` · `Tile` · `Token` · `Wall`

### Commonly Used Hook Combinations

```
preCreateItem / createItem          — Item created in world or on actor
preUpdateActor / updateActor        — Actor data changed
preDeleteActiveEffect / deleteActiveEffect — Effect removed
createCombatant / deleteCombatant   — Combatant added/removed from tracker
updateScene                         — Scene settings changed
createChatMessage                   — New chat message
```

---

## Quick Reference: Cancellable Hooks (`Hooks.call`)

These hooks can be **prevented** by returning `false`:

| Hook | What it prevents |
|------|-----------------|
| `preCreate{Type}` | Document creation |
| `preUpdate{Type}` | Document update |
| `preDelete{Type}` | Document deletion |
| `canvasReady` | Canvas ready finalization |
| `hotReload` | Hot module reload |
| `dropCanvasData` | Canvas drop handling |
| `dropActorSheetData` | Actor sheet drop |
| `dropItemSheetData` | Item sheet drop |
| `dropRollTableSheetData` | Roll table sheet drop |
| `chatInput` | Chat input submission |
| `chatMessage` | Chat message creation |
| `chatBubbleHTML` / `chatBubble` | Chat bubble display |
| `hotbarDrop` | Hotbar macro assignment |
| `preMoveToken` | Token movement |
| `activateNote` | Note activation |
| `preImportAdventure` | Adventure import |
| `dealCards` / `passCards` / `returnCards` | Card operations |
| `modifyTokenAttribute` | Token bar modification |
| `applyActiveEffect` | Active effect application |
| `configureCanvasEnvironment` | Canvas environment setup |
| `paste{DocumentName}` | Placeable paste operation |
