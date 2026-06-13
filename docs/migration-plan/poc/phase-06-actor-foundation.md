# POC Phase 6: Actor Foundation

**Status**: 🔶 In Progress

> **Milestone**: POC  
> **Dependencies**: Phase 1, Phase 3  
> **Goal**: A character actor has ability scores, BAB, HP, flat AC, saves, speed, size, and an inventory with equipped weapon tracking. All stats are stored as formula-ready fields that poc.10 (Basic Combat) and alpha.3 (Action System) consume via `#self.*` contexts.

> **Action System note**: poc.10 and alpha.3 action formulas reference actor stats via `#self.*` contexts — e.g., `#self.abilities.str.mod`, `#self.bab`, `#self.ac.*`, `#self.saves.*`. These are **derived** fields (`persisted: false`): `str.mod` is calculated from base score, `bab` derives from class progressions (alpha.2; resolves to `0` until then), and `attributes.ac.*` is computed from DEX + size + bonuses. Base score fields are stored; derived stats are computed each prep cycle.

---

## Open Questions

Questions organized into groups for serial resolution. As each group is resolved, its items move to the relevant detail section and the group is marked ✅.

### Group C: Inventory System ✅

#### C2: Containers
- [x] **Container model**: Uses `containerId` reference pattern (dnd5e canonical). All items are flat siblings in `actor.items`. Contained items store `containerId` pointing to parent container's ID. Container items compute `contents` by filtering siblings.
- [x] **Weight interaction**: **Container AE Propagation** — containers emit a special AE to each contained item. Bag of holding AE sets weightlessness on contained items (no manual weight calc logic). Non-extradimensional containers: container weight + sum of contents weights.
- [x] **Nesting**: `containerId` supports nesting at schema level. Phase 6 does not implement recursive container weight or nested-container UI. Full nested container support (bag-in-backpack with recursive weight) deferred to **beta.1** (Equipment & Loot).
- [x] **UI**: Inventory tab uses a flat list. Contained items are grouped under their container's row with visual indentation — the container item acts as a section header for its contents.

#### C5: Item Lifecycle
- [x] **Drag-and-drop from compendium**: Foundry handles via `ActorSheet._onDropItem()` — creates an owned copy automatically. Override only to apply container assignment (if dropped onto a container item row) and fire the `created` lifecycle event (Phase 5 infrastructure).
- [x] **Item deletion**: Call `item.delete()`. No manual cleanup needed — equipped state is derived from the item list, so deleting the item removes it from derivation automatically. Foundry's `_onDeleteEmbeddedDocuments` hook handles re-render.

### Codebase TODO Notes (Landing Here)

The following TODO notes exist in the codebase and are tracked here for resolution during this phase:

- [ ] **Update `actorTypes.mts` placeholder** (`actorTypes.mts:1`): Currently only defines `'character'` with a TODO to add actual actor types. Phase 6 adds the character shell; Phase 23 adds NPC/Trap/Object. At minimum, verify the placeholder is sufficient for Phase 6's character-only scope, and add a forward reference to Phase 23 for expansion.
- [ ] **Equipment slot 'none' sentinel cleanup** (`equipmentSlots.mts:20`): The `'none'` option in `EQUIP_SLOT_SELECT_OPTIONS` is flagged as redundant for multiselect. When this phase implements equipment slot UI and validation, resolve whether `equippedSlotIds` should become a single-select nullable field (replace `'none'` with `value: null`) or remain multiselect (remove the `'none'` option entirely).
- [ ] **Container dropdown in PhysicalItemStore** (`PhysicalItemStore.mts:64`): `possibleContainers` computed returns only `[None]` with a TODO to build out after implementing containers. Wire this to query the parent actor's items for container-type items once the container model (§C2) is implemented.
- [ ] **FormulaFamiliar derived field support**: FormulaFamiliar's schema walker builds autocomplete from static `DataModel` schema definitions. Verify that `persisted: false` fields (ability mods, BAB, AC totals, save totals) are included in walker output — they are declared in `defineSchema()` but their runtime values only exist after `prepareDerivedData()` runs. If the walker skips them, either extend the walker to include runtime-derived fields or ensure `_buildFormulaContexts()` registers them separately as formula-visible properties. **Must be resolved before alpha.3 ships formula authoring UI** (poc.10 attack formulas also depend on this).

---

## Phase Delivery Plan

Phase 6 is delivered in **6 stories**. Each story ends with a working, user-testable slice — E2E tests are written at story completion. Unit tests accompany each commit within a story.
### Pre-story: Rename `PriceField` / `PriceData` → `CurrencyField` / `CurrencyData`

**Rationale**: `PriceField` is a generic currency-value field that happens to be used as an item's sale price. Naming it after its most common use case leaks item semantics into infrastructure. Phase 6 adds it to the actor schema as `currency: CurrencyField` — which reads wrong with the old name. Rename now so all Phase 6 code starts with the correct name.

**Scope**:
- `src/fields/PriceField.mts` → `src/fields/CurrencyField.mts` (class `CurrencyField`, type `CurrencyData`)
- All usages: `new PriceField()` → `new CurrencyField()`, `PriceData` → `CurrencyData`
- **Keep "Price" in item-specific components**: `ItemPriceFormGroup.vue`, `ItemPrice.vue`, `ItemResalePrice.vue` — these are contextually correct (they display an item's price).
- **Keep "price" as the schema field name on items**: `price: new CurrencyField()` — field name is still `price`, only the class name changes.

This pre-story PR contains **3 commits**:

1. **CurrencyField rename** — pure rename, no behavior change.
2. **`persisted: false` audit** — audit all existing system models (poc.1–poc.2: `PhysicalItemSystemModel`, `EquippableItemSystemModel`, `WeaponSystemModel`, `GeneralSystemModel`, and any mixins with schema declarations) for fields that are derived/computed but currently declared as stored fields. Reclassify them as `{ persisted: false }` with an appropriate `initial` value. Actor-only derived fields (`str.mod`, `bab`, AC totals, etc.) are new and handled in Story 1 — this commit covers the existing item and AE side models only.
3. **Pack source items** — identify and author items needed for Phase 6 testing, commit the resulting `packs/_source` JSON. Since item creation is a manual process done in the Foundry UI (export → JSON), decide what's needed here so the items exist before Stories 3+ need them.

**Pack content identification** (for commit 3): One item needed for Phase 6 E2E testing — a longsword for Story 3 inventory/equip testing. No armor items exist yet (equipment AC is Phase 11/19); AC tests run on pure math (10 + DEX mod). No consumables until much later in the roadmap.
```
Story 1
  └─► Story 2  ──► Story 4
  └─► Story 3  ──► Story 4
```

Stories 2–5 are independent of each other and can be worked in parallel after Story 1 merges. Stories 2 and 3 are design-only (layout/CSS) and do not block Combat Stats (Story 4).

```
Story 1
  └─► Story 2 (Summary Design)
  └─► Story 3 (Attributes Design)
  └─► Story 4 (Combat Stats) ──► Story 6 (AEs)
  └─► Story 5 (Inventory)
```

---

### Story 1 — Character Actor with Ability Scores

**User**: GM  
**Delivers**: A character actor can be created, its sheet opens, and all 6 ability scores are visible and editable with live modifier display. Sheet tab bar present (stubs OK for non-Abilities tabs). DocumentEventEmitter wired on all system documents.  
**Depends on**: nothing — first story.

**Commits:**
1. ✅ **Schema hierarchy + registration** — `ActorSystemModelBase`, `CreatureSystemModel`, `CharacterSystemModel` (full), `NpcSystemModel` / `ObjectSystemModel` / `TrapSystemModel` (stubs). Register `CharacterSystemModel` in `registration.mts`. *(Unit tests: schema instantiates with defaults, `persisted:false` fields reset on prep cycle)*
2. ✅ **Domain event wiring** — `DocumentEventEmitter` and `events` on all documents are already implemented (Phase 5). This commit: add `wellKnownEvents` static registry + `registerEventType()`; define typed payload interfaces for all domain events (`TakeDamagePayload`, `DeathPayload`, `DyingPayload`, etc.). *(Unit tests: on/off/once/emit/clear; failing callback doesn't block others)*
3. ✅ **VueActorSheet + sheet scaffolding** — `VueActorSheet.mts` base class, `CharacterSheet.mts` + `CharacterSheet.vue` with tab bar (Abilities | Inventory | Features | Effects | Biography), widen `VueDocumentSheetMixin` generic to accept `ActorDnd35e`. *(Unit tests: sheet mounts without errors)*
4. ✅ **Abilities tab** — 6 `NumberFormGroup`s (editable base score), derived modifier display (read-only). All labels via i18n. `abilities.json` + `actors.json`. *(Unit tests: mod formula edge cases — score 1 → −5, score 20 → +5)*
   - _Includes fix: `getSchemaField` was using private `_getField` with un-reversed path; now uses public `getField()`. Also: `persisted` is a direct runtime property on `DataField`, not nested in `options`._
5. ✅ **Notes tab** — Layered description component architecture: `ActorDescriptionTab.vue` (base, uses `system.description`), `CreatureDescriptionTab.vue` (relabels as Biography), `CharacterDescriptionTab.vue` (wraps creature tab, adds Session Notes editor for `system.notes`). `system.notes` HTMLField added to `CharacterSystemModel` only.

**E2E acceptance**: Create character actor → open sheet → Abilities tab visible → edit STR from 10 to 14 → modifier updates to `+2`.

---

### Story 2 — Summary Tab Design

**User**: GM/Player  
**Delivers**: Character sheet opens to a D35E-style Summary tab. Header shows character detail rows (gender/alignment/deity, age/height/weight, race/speed) as stub placeholders. Summary tab uses a 3-column grid: Ability Scores table (left), compact stat panel (middle), skills placeholder (right). Horizontal text tabs replace the vertical tab layout.  
**Depends on**: Story 1.

**Commits:**
1. ✅ **Horizontal tabs + header character details** — Remove `verticalTabs` prop from `CreatureSheet.vue`. Add `#actor-details` slot to `DocumentSheetBody.vue`. Create `CreatureHeaderDetails.vue` with XP bar, gender/alignment/deity row, age/height/weight row, race/speed row (all stub `—` values). Change `defaultActiveTab` to `'summary'`. Add i18n keys to `actors.json`.
2. ✅ **Summary tab 3-column grid** — Redesign `SummaryTab.vue` as a 3-column CSS grid. Redesign `AbilityScoresSection.vue` as a vertical table (Name | Base | Total | Mod rows, replacing the horizontal strip). Create `SummaryStatPanel.vue` (Rest button + Health + Init/BAB + AC trio + Saves trio + Actions placeholder). Create `SummarySkillsSection.vue` (Points | Total header + empty scrollable placeholder).
3. ✅ **Unify store inheritance pattern** — Refactor actor and item store chains so each layer takes `(context, options?)`, calls its direct parent layer internally, and returns the fully composed store. Only runtime leaves (`CharacterStore`, `WeaponStore`) register in `game.dnd35e.stores`; intermediate layers are leaves only in type and exist for future expansion.

**E2E acceptance**: Open character sheet → Summary tab is active by default → ability scores table shows 6 rows with Name/Base/Total/Mod → middle column shows stat stubs → right column shows empty skills placeholder → horizontal tab bar visible.

---

### Story 3 — Attributes Tab Redesign + Sheet Reorganization

**Status**: ✅ Complete  
**User**: GM/Player  
**Delivers**: Full sheet reorganization — stats are split to their correct tabs, a new Bio tab holds character identity fields, a new Settings tab scaffolds per-character toggles, the header gains a compact HP/AC/Saves pill strip and a Rest icon (replacing the verbose identity rows), and the Attributes tab is rebuilt as spacious editing panels for ability scores, speed stubs, senses stub, and traits. Initiative moves off Attributes and into the Combat tab (Story 4). Story 3 is purely UI/layout — no new derived data pipeline (Story 4 owns that). Stub panels hard-code sensible placeholder values until Story 4 wires live derivation.  
**Depends on**: Story 1.

**Completed in**: bio info moved out of header into new Bio tab; Summary stats moved to header sidebar; Settings tab added.

**Schema additions (on `CreatureSystemModel`):**
- `system.bio.alignment` — **moved** from `system.alignment`; fields (`law`, `moral`) unchanged, only path changes. Simple `migrateData()` handles existing actors.
- `system.bio.languages: ArrayField(StringField, { initial: [] })` — new; managed on Bio tab.
- `system.bio.senses: StringField({ nullable: true, initial: null })` — stub text field; folksonomy redesign deferred to the token/perception phase.
- `system.settings: SchemaField({ isPartyMember: BooleanField({ initial: false }) })` — new; managed on Settings tab.
- `creature.race` — **not a schema field**. A getter property on `CreatureDnd35e` class returning `'Human'` (stub until Race item type lands in a later phase).

**Commits:**
1. **Schema: bio.alignment migration + bio.languages + bio.senses + system.settings** — Move `system.alignment` → `system.bio.alignment` (add static `migrateData()` to `CreatureSystemModel` to rewrite path for existing documents). Add `system.bio.languages: ArrayField(StringField)`. Add `system.bio.senses: StringField` (nullable stub). Add `system.settings: SchemaField({ isPartyMember })`. Add `get race()` stub getter on `CreatureDnd35e` returning `'Human'`. Update all existing component/store references from `system.alignment` → `system.bio.alignment`. *(Unit tests: schema instantiates; languages array accepts strings; alignment at new path; migration correctly rewrites old path)*
2. **Header redesign** — Strip `CreatureHeaderDetails.vue` down to: portrait, name, XP bar, and a new compact stat-pill strip (HP `current/max` | AC | Fort | Ref | Will — stub values, Story 4 wires live data). Add Rest button as a `fa-campground` icon button in the header. Remove the three identity detail rows (gender/alignment/deity, age/height/weight, race/speed); the sub-components (`CreatureGender`, `CreatureAlignment`, etc.) are kept for Bio tab reuse. Update `DocumentHeader.vue` / `CreatureSheet.vue` grid columns as needed. *(Unit tests: header renders pills; icon button renders)*
3. **Bio tab (new)** — Create `src/documents/actors/creature/sheet/tabs/bio/BioTab.vue`. Sections: **Identity** (gender, alignment reusing existing `CreatureAlignment`/`CreatureGender`/`CreatureDeity` components), **Physical** (age, height, weight), **Race** (display-only, renders `creature.race` getter), **Languages** (chip/tag list bound to `system.bio.languages`), **Senses** (textarea for `system.bio.senses` stub), **Biography** (HTML editor from `system.description`). Add tab to `CreatureSheet.vue`. *(Unit tests: tab mounts; languages list renders; alignment binds to new path)*
4. **Settings tab (new)** — Create `src/documents/actors/creature/sheet/tabs/SettingsTab.vue`. "General Settings" section with `isPartyMember` toggle (`ToggleSwitchFormGroup` bound to `system.settings.isPartyMember`). Add tab to `CreatureSheet.vue`. *(Unit tests: tab mounts; toggle saves correctly)*
5. **Summary tab cleanup** — Strip `SummaryStatPanel.vue`: remove HP group, AC trio, Saves trio, and Rest button (all now on header or Combat tab). Keep Init + BAB pair. Summary 3-column layout unchanged; middle column now shows only Init/BAB with a "Combat stats · Story 4" placeholder note. *(Unit tests: stripped panel renders without HP/AC/Saves)*
6. **Attributes tab redesign** — Delete `HpSection.vue`, `SavingThrowsSection.vue`, `ArmorClassSection.vue`, `InitiativeSpeedSection.vue` (all dead code; combat sections rebuilt fresh in Story 4). Rebuild `AbilityScoresSection.vue` as wide-card format: 6 cards each with large `total/mod` display, small `base` input, and a "…" overflow button (renders, does nothing — Phase 20 wires damage/drain/penalties modal). Extract previous compact table as `AbilityScoresTable.vue` for continued use in Summary tab. Add `ActorSpeed.vue`: 5 stub cards (Land=30ft, Climb/Swim/Burrow/Fly=—); Story 4 adds schema + derivation. Add `SensesSection.vue`: textarea bound to `system.bio.senses`. Add `TraitsSection.vue`: Size dropdown (`SIZE_SELECT_OPTIONS`), Creature Type text stub, Reach text stub. Update `AttributesTab.vue` to use new sections. *(Unit tests: cards render; Size dropdown saves via SIZE_SELECT_OPTIONS; overflow button renders inert)*

**E2E acceptance**: Open character sheet → Header shows HP/AC/Saves pills and tent-icon Rest button (no identity rows) → Bio tab opens; gender/alignment/deity/age/height/weight visible; languages field is editable → Settings tab shows Party Member toggle; toggling saves correctly → Summary tab shows only Init + BAB (no HP/AC/Saves) + Skills placeholder → Attributes tab shows 6 wide ability score cards + 5 speed stub cards + Size dropdown + Senses text → changing Size saves correctly.

---

### Story 4 — Combat Stats (HP, AC, Saves, Speed, Initiative, BAB)

**User**: GM/Player  
**Delivers**: Sheet displays HP (editable current/max), all 3 AC variants, fort/ref/will saves, initiative, BAB, and land speed — all deriving live from ability scores.  
**Depends on**: Story 1.

**Commits:**
1. **Derived data pipeline** — `prepareBaseData()` + `prepareDerivedData()`: ability modifiers, AC (normal/touch/flat-footed), saves, initiative, BAB stub (0), speed, size modifier plumbing. All `persisted:false` fields reset and recomputed each prep cycle. *(Unit tests: ability mod calc; AC at DEX 14 = 12; fort = CON mod; init = DEX mod + bonus)*
2. **HP system + damage event cascade** — `hp.max` hardcoded to `100` (TODO: derive from class HD × level + CON mod in alpha.2); `hp.current` editable; wire `takeDamage → dying → death` event cascade in damage-application method. *(Unit tests: `dying` fires at HP ≤ 0, `death` fires at HP ≤ −10; threshold configurable; events fire once per transition)*
3. **Combat stats panel on sheet** — HP (editable `current` / derived `max`), AC variants, saves, initiative, BAB, speed displayed in sheet Abilities tab or a summary header section. *(Unit tests: component renders correct values)*

**E2E acceptance**: Create character with DEX 16 → AC shows `13` (10 + 3); edit `hp.current` → value persists after sheet re-open. *(No E2E for `hp.max` until Classes phase — alpha.2)*

---

### Story 5 — Inventory, Equipment Slots, Encumbrance, Currency

**User**: GM/Player  
**Delivers**: Inventory tab shows owned items grouped by type; items dragged from compendium appear in the list; weapons can be equipped to mainhand/offhand; encumbrance tier shown; currency field on sheet.  
**Depends on**: Story 1. **Runs in parallel with Stories 2–4.**

**Commits:**
1. **Inventory tab scaffold** — Inventory tab with grouped item list (Weapons / Equipment / Consumables / Loot); item rows: name, quantity, weight, price, carried/equipped state. *(Unit tests: grouping logic, stored-vs-carried display)*
2. **Equipment slots + equip toggle** — mainhand/offhand sentinel constants in `equipmentSlots.mts`; equip/unequip toggle per item; slot collision validation. *(Unit tests: slot validation; equipping occupied slot blocked)*
3. **Encumbrance + currency** — `carriedWeight` derived from `sum(item.weight × qty)` for `isCarried` items; thresholds from STR score; encumbrance tier display; `currency: CurrencyField` in inventory footer. *(Unit tests: carrying capacity at STR 10 = 100 lb; light/medium/heavy thresholds; stored items excluded from weight)*
4. **Drag-drop from compendium** — override `_onDropItem()` to apply container assignment if dropped onto a container row; `created` lifecycle event fires automatically (Phase 5 infrastructure). *(Integration tests: drop item → appears in correct group)*

**E2E acceptance**: Drag longsword from compendium → appears in Weapons list → equip to mainhand → equipped state shown; add items exceeding STR light load → encumbrance tier shows Medium.

---

### Story 6 — Active Effects Modify Stats (Stacking Engine on Actor)

**User**: GM  
**Delivers**: Effects tab shows AEs on the actor; adding a stat-modifying AE changes derived stats immediately; same bonus-type bonuses don't stack (only best applies).
**Depends on**: Story 4 (stat fields must exist before AEs can modify them).

**Commits:**
1. **`applyStackedChanges()` helper** — extract/finalize shared stacking utility in `src/helpers/stacking.mts` for use by both `ItemDnd35e` and `ActorDnd35e`. *(Unit tests: stacking rules; same-type rejection; penalty tracking)*
2. **`ActorDnd35e.applyActiveEffects()`** — integrate stacking engine: collect changes from all enabled AEs, separate penalties, resolve, write to `system`, enrich `this.overrides` with `bonusType` / `stackResult` / `stackReason` metadata. *(Unit tests: buff applies; penalty applies; duplicate enhancement bonus rejected; overrides populated correctly)*

   > **⚠️ Architectural decision required in this commit**: When an AE modifies `system.abilities.str.base`, `prepareDerivedData()` will recompute `mod` from the AE-enhanced base. In Edit mode, the GM sees the authored `base` (e.g. 14) but the `mod` will be the post-AE mod — inconsistent. The agreed approach is **Option B: cache `_preAEDerived`** — after `prepareBaseData()` but before `applyActiveEffects()` runs, snapshot the derived-only values (ability mods, etc.) into `this._preAEDerived`. `getViewAwareFieldValue` can then expose the pre-AE snapshot for `persisted:false` fields when in Edit mode. See Story 1 commit 4 for the `persisted:false` read-path plumbing that sets this up. The snapshot object only needs to contain fields that are both `persisted:false` and could be targeted indirectly by AEs (i.e. their *inputs* are AE targets).

3. **Effects tab** — AE list display; enable/disable toggle; stacking debug info visible in expanded view (which bonuses won/were rejected). *(Integration tests: toggle AE enabled → stat updates live)*

**E2E acceptance**: Add `+2 enhancement` STR AE → STR score increases by 2; add second `+2 enhancement` STR AE → STR does NOT increase to +4 (non-stacking); disable first AE from Effects tab → STR reverts; equip item with an AE change targeting `system.abilities.str.base` → actor STR reflects the item's AE (passthrough from item AE to actor stat).

---

## 5.1 Actor System Data Model

Bring over the core character data from D35E's `template.json` actor template, but as a typed `DataModel`. **All derived stats use `persisted: false` fields** — they are initialized from `initial` values every prep cycle, can be targeted by Active Effects, and are stripped before database writes.

```
ActorSystemModel (character)
├── abilities: { str, dex, con, int, wis, cha }
│   Each: { base: number, mod: number (p:f) }
│   (damage/drain/penalty added in Phase 20)
├── hp: { max (p:f), current, temp, nonlethal }
├── bab: { total (p:f) }
├── ac: { normal (p:f), touch (p:f), flatFooted (p:f) }  — start: 10 + DEX mod + size
├── saves: { fort, ref, will }
│   Each: { total (p:f) }   (base + ability mod — class contributions in alpha.2)
├── speed: { land, climb, swim, burrow, fly }
│   Each: { base, total (p:f) }   (Story 4 adds schema + derivation)
├── init: { total (p:f) }
├── sr: number
├── ~~dr: DamageReduction[]~~   ← deferred to alpha (phases 8/12/13/21 — Special Abilities & damage pipeline)
├── level (p:f, derived from class items)
├── xp: { value, max }
├── bio: {
│     gender, deity, age, height, weight  (nullable strings)
│     alignment: { law: LawAxis|null, moral: MoralAxis|null }   (moved from system.alignment in Story 3)
│     languages: string[]                                        (added Story 3)
│     senses: string|null                                        (stub — folksonomy redesign deferred to token phase)
│   }
├── settings: { isPartyMember: boolean }                         (added Story 3)
├── race  — NOT a schema field; getter on CreatureDnd35e returns 'Human' stub (real Race item lands in a later phase)
├── size: SizeCategory
├── currency: CurrencyField             (coin weight → encumbrance; "ignore currency weight" setting disables)
└── encumbrance: { carriedWeight (p:f), light (p:f), medium (p:f), heavy (p:f), carry (p:f), drag (p:f), level (p:f), carryBonus, carryMultiplier }
```

> **p:f** = `persisted: false` — initialized from `initial` value every prep cycle, AE-targetable, never saved to DB.

## 5.2 Inventory System

- Items owned by actor appear in an inventory list on the actor sheet
- Organize by type tabs: Weapons, Equipment, Consumables, Loot, Features
- Display weight, price, quantity, equipped state
- Drag-and-drop items onto actor from compendium or sidebar

## 5.3 Equipment Slot System

Two distinct slot categories:

**Armor/gear slots** (body positions): head, face, neck, shoulders, chest, abdomen, hands, waist, legs, feet, left ring, right ring — use existing `equipmentSlots` constants.

**Weapon slots**: mainhand, offhand — add weapon-specific slot constants to `equipmentSlots.mts` this phase. Distinct from gear slots since weapons are managed by wielding hand, not body position.

One item per slot; exception: both ring slots may each hold one ring independently. Equipping armor fires active effects (e.g., AC bonus from armor — implemented in Phase 11).

> A silhouette-based visual equip UI is a nice-to-have — see WISHLIST.md.

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

- **Header**: Portrait, Name, XP bar, compact stat pills (HP | AC | Fort | Ref | Will), Rest icon button (`fa-campground`)
- **Tabs**: Summary, Attributes, Combat, Inventory, Features, Skills, Bio, Effects, Settings, Notes
- **Summary tab**: 3-column grid — compact ability scores table (left), Init + BAB quick stats (middle), skills placeholder (right)
- **Attributes tab**: Wide ability score cards (base input + total/mod display), Speed stub cards, Senses stub, Traits (Size dropdown + stubs)
- **Combat tab**: HP, AC trio, Saves, BAB, Initiative — added in Story 4; combat-only resistances (SR, NA, DR, fast healing, etc.) in later phases
- **Inventory tab**: Grouped item list, equip toggles, weight/price, drag-and-drop
- **Features tab**: Placeholder — feats/class features in later phases
- **Skills tab**: Skills list + ACP reference — later phases
- **Bio tab**: Identity (gender, alignment, deity), Physical (age, height, weight), Race (getter stub), Languages, Senses, Biography
- **Effects tab**: Active effects on the actor
- **Settings tab**: Per-character toggles (`isPartyMember`; more settings added in later phases)
- **Notes tab**: GM session notes
- **All strings via i18n keys**

## 5.6 Document Store Refresh

Override `update()` on `ActorDnd35e` to refresh the active Pinia store after Foundry persists changes. This ensures Vue reactivity stays in sync. Establish this pattern here and carry it forward to all document types.

## Completion Checklist

### ✅ Complete

**DocumentMixin wiring on `ActorDnd35e`:**
- [x] `ActorDnd35e` now extends `DocumentMixin(Actor)` — adds per-instance `events: DocumentEventEmitter`, `registeredFormulas`, and lifecycle hooks (`_onCreate`, `_onDelete`, `_preCreate`, `update`)
- [x] `localizedType` getter returns `ACTOR_TYPES_LOCALIZED[this.type]` fallback to `'dnd35e.COMMON.Actor'`

**Actor Sheet class hierarchy (TS):**
- [x] `ActorSheetDnd35e` — abstract base at `src/documents/actors/baseActor/sheet/ActorSheetDnd35e.mts`; owns `DEFAULT_OPTIONS` (720×680, `[SYSTEM_ID, ACTOR_SHEET_CLASS]`) and `title` getter
- [x] `CreatureSheet` — abstract creature-layer class at `src/documents/actors/creature/sheet/CreatureSheet.mts`; extends `ActorSheetDnd35e`
- [x] `CharacterSheet` — concrete class at `src/documents/actors/character/sheet/CharacterSheet.mts`; extends `CreatureSheet`; owns only `vueComponent` getter

**Actor Sheet Vue component layer:**
- [x] `CharacterSheet.vue` — root component; calls `useActorSheetStore`, provides `DocumentSheetStoreSymbol`, renders `<CreatureSheetVue>`
- [x] `CreatureSheet.vue` — layout component at `src/documents/actors/creature/sheet/CreatureSheet.vue`; delegates to `<DocumentSheetBody>` (reuses item-sheet header/tabs/layout infrastructure)
- [x] View mode bar (Edit/Play/True toggles) renders automatically via `VueDocumentSheetMixin._onRender` — no actor-specific code needed

**Tab component layer placement:**
- [x] `ActorEffectsTab.vue` → `baseActor/sheet/tabs/` (all actors)
- [x] `AbilitiesTab.vue`, `BiographyTab.vue`, `FeaturesTab.vue`, `InventoryTab.vue` → `creature/sheet/tabs/` (creature layer)
- [x] Tab `SheetTab` definitions live at their respective layers; `CharacterSheet.vue` imports directly from `@actors/baseActor/sheet/tabs/index.mjs` and `@actors/creature/sheet/tabs/index.mjs`

### ❌ Not Started

**Foundry v14 Integration:**
- [ ] Use `persisted: false` for ALL derived stat fields: ability mods, AC totals, save totals, init total, BAB total, HP max, speed totals, encumbrance thresholds, level, race string
- [ ] Set `CONFIG.Actor.trackableAttributes` in `setup` hook:
  - `character: { bar: ['hp'], value: ['ac.normal', 'init.total'] }`
  - `npc: { bar: ['hp'], value: ['ac.normal', 'init.total', 'cr'] }`
- [ ] Override `Actor.modifyTokenAttribute()` for temp HP, nonlethal damage, custom bar modification
- [ ] Implement `isOfType(...types)` method on `ActorDnd35e` with TypeScript overloads for type narrowing (PF2E pattern)
- [ ] Register `CONFIG.Actor.documentClass = ActorProxyDnd35e` in `init` hook
- [ ] Test: Token bars show HP by default for new characters
- [ ] Test: `isOfType("character")` correctly narrows TypeScript type
- [ ] Test: Derived `persisted: false` fields reset every prep cycle and are NOT saved to DB

**Actor Data Model & Schema Structure (Group G hierarchy — build all layers now):**
- [ ] Create `src/documents/actors/baseActor/data/ActorSystemModelBase.mts` — universal base (`ActorSystemModelBase`): speed fields (land/climb/swim/burrow/fly each with base + total `persisted:false`), biography, notes
- [ ] Create `src/documents/actors/baseActor/data/CreatureSystemModel.mts` — `CreatureSystemModel extends ActorSystemModelBase`: all creature-shared stats
  - [x] Abilities: str, dex, con, int, wis, cha each with `base: number` + `mod: number (persisted:false)`
  - [ ] `hp`: `base, max (persisted:false), current, temp, nonlethal`
  - [ ] `bab`: `total (persisted:false, derived as 0; alpha.2 fills class progression)`
  - [ ] `ac`: `normal, touch, flatFooted` all `persisted:false` — start at `10 + DEX mod + size`
  - [ ] `saves`: fort, ref, will each with `base + total (persisted:false) + ability: AbilityKey`
  - [ ] `init`: `bonus + total (persisted:false)`
  - [ ] `sr`: number; `dr`: DamageReduction[] array
  - [ ] `currency: CurrencyField` at schema root (world-settings currencies; coin weight → encumbrance)
  - [ ] Encumbrance: `carriedWeight (pf), light/medium/heavy/carry/drag thresholds (pf), carryBonus, carryMultiplier`
- [ ] Create `src/documents/actors/character/data/CharacterSystemModel.mts` — `CharacterSystemModel extends CreatureSystemModel`: character-only fields
  - [ ] `level (persisted:false)`, `xp: {value, max}`, `size: SizeCategory`
  - [ ] `bio.alignment` (moved from top-level `system.alignment` — Story 3), `bio.languages: string[]`, `bio.senses: string|null`
  - [ ] `settings.isPartyMember: boolean`
  - [ ] `get race()` getter on `CreatureDnd35e` returning `'Human'` stub — NOT a schema field (real Race item in a later phase)
- [ ] Create `src/documents/actors/npc/data/NpcSystemModel.mts` — `NpcSystemModel extends CreatureSystemModel`: **stub only** (Phase 23 adds cr, type/subtype, environment, treasure, advancement)
- [ ] Create `src/documents/actors/object/data/ObjectSystemModel.mts` — `ObjectSystemModel extends ActorSystemModelBase`: **stub only** (Phase 23 adds HP(object), hardness, breakDC)
- [ ] Create `src/documents/actors/trap/data/TrapSystemModel.mts` — `TrapSystemModel extends ObjectSystemModel`: **stub only** (Phase 23 adds findDC, disarmDC)
- _(Skills are deferred to the dedicated Skills phase after Classes — see Group A for rationale.)_
- [ ] Ensure all NumberFields use proper Foundry validation (min: 0 where applicable)

**Derived Data Preparation Pipeline:**
- [ ] Implement `prepareBaseData()`: Load ability scores, level, size from source
- [x] Implement ability modifier calculation: `mod = floor((ability - 10) / 2)` for all six
- [ ] Implement AC calculation for all three variants: normal (10 + DEX), touch (10 + DEX), flatFooted (10 or less if no DEX)
- [ ] Implement AC size modifier: add `actor.system.size` modifier to all AC variants
- [ ] Implement carrying capacity from STR score using D&D 3.5e encumbrance table
- [ ] Implement encumbrance threshold calculation (light = 1/3 carry, medium = 2/3, heavy = carry)
- [ ] Implement weight calculation from inventory.items sum
- [ ] Implement carried weight encumbrance check (compare to thresholds)
- [ ] Implement initiative total = DEX mod + bonus field
- [ ] Implement BAB calculation stub (rule: compute from class items, stub as 0 for now, alpha.2 fills in class contribution)
- [ ] Implement save calculations stub (rule: base + ability mod, class contributions in alpha.2)
- [ ] Call `applyActiveEffects()` during `prepareDerivedData()` prep cycle
- [ ] Test: Prep cycle completes without errors for fresh actor

**Formula-Ready Field Preparation for poc.10 / alpha.3:**
- [ ] Call `_buildFormulaContexts()` (from Dnd35eDocumentMixin) in `prepareDerivedData()` to populate `#self.*` contexts
- [ ] Verify RollData includes: abilities, ability modifiers, bab, ac variants, saves, speed, size, initiative, hp
- [ ] Ensure `getRollData()` returns POJO with all formula-ready paths (e.g., `abilities.str.mod`, `bab`, `ac.normal`)
- [ ] Register formula contexts in Pinia store for IDE autocomplete hints
- [ ] Document all formula paths available via `#self.*` that poc.10 and alpha.3 actions will consume
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
- [ ] Enrich `this.overrides` with stacking metadata (`bonusType`, `stackResult`, `stackReason`) per the `Override` interface in `src/helpers/stacking.mts` — same pattern as Phase 2 ItemDnd35e
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
- [x] **Abilities Tab**: Render all 6 abilities with ability name, base score (editable NumberFormGroup), derived modifier display
- [ ] **Inventory Tab**: Group items by type (Weapons, Equipment, Consumables, Loot), equip toggle checkbox per item, weight/price column, total weight display
- [ ] **Features Tab**: Placeholder for feats/traits/class features (styling only, data implementation deferred to Phase 10)
- [ ] **Effects Tab**: List active effects, show effect name, enabled toggle, delete button (use Phase 2's AE component if available)
- [ ] **Biography Tab**: Textarea for character biography with rich text styling support (defer HTML editor to Phase 23)
- [ ] Pull all labels from i18n keys: abilities.str, abilities.dex, etc., actors.tabs.abilities, actors.tabs.inventory
- [ ] Add drag-and-drop support for items into inventory tab (accept drops from compendium or sidebar)
- [ ] Implement form binding to ActorSystemModel fields and update() call on change
- [x] Test: All ability scores display and can be edited
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
- [x] Add i18n keys for all ability names: dnd35e.abilities.str, .dex, .con, .int, .wis, .cha
- [ ] Add i18n keys for all attribute names: dnd35e.attributes.hp, .ac, .init, .bab
- [ ] Add i18n keys for save names: dnd35e.saves.fort, .ref, .will
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
// src/documents/actors/baseActor/ActorDnd35e.mts
override applyActiveEffects() {
  // Import the generic stacking utility from helpers
  const { resolveActiveEffectChanges } = await import('@helpers/stacking.mjs');

  // Collect all changes from enabled active effects
  const allChanges: Dnd35eEffectChangeData[] = [];
  for (const effect of this.effects) {
    if (effect.disabled) continue;
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

> **Phase 5 status**: `DocumentEventEmitter`, `events` property on all system documents, `DocumentLifeCycle.created`/`destroyed` lifecycle events, and `events.clear()` in `_onDelete()` are all **already implemented**. Phase 6 adds: `wellKnownEvents` registry, typed domain-event payload interfaces, and the `takeDamage → dying/death` cascade in the actor HP method.

A per-document event bus scoped to a single document instance — not Foundry's global `Hooks`. See Phase 5 for design rationale.

### Infrastructure: `DocumentEventEmitter`

**Complete (Phase 5).** Every `ItemDnd35e`, `ActorDnd35e`, and `DnD35eActiveEffect` instance carries `events`. `created`/`destroyed` lifecycle events are wired in the mixin.

```typescript
// src/helpers/DocumentEventEmitter.mts — COMPLETE (Phase 5)

type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

class DocumentEventEmitter {
  // Subscribe. Returns an unsubscribe function.
  on<T>(event: string, handler: EventHandler<T>): () => void
  // Subscribe once — auto-unsubscribes after first fire.
  once<T>(event: string, handler: EventHandler<T>): () => void
  off<T>(event: string, handler: EventHandler<T>): void
  // Fire event. Errors forwarded to Hooks.onError; don’t abort other handlers.
  async emit<T>(event: string, payload: T): Promise<void>
  // Remove all listeners (call in _onDelete).
  clear(): void
  // Event names that currently have ≥1 subscriber.
  get activeEvents(): string[]
}

// Phase 6 adds static well-known event registry:
// static readonly wellKnownEvents: Map<string, { label: string; description: string; appliesTo: string[] }>
// static registerEventType(type: string, meta: { label: string; description: string; appliesTo: string[] }): void
```

### Domain Events (Phase 6)

#### Actor Events

| Event | Payload | Emitted when | Example use case |
|-------|---------|-------------|-----------------|
| `takeDamage` | `{ amount: number, damageType: string, source?: string, attackerId?: string }` | Damage applied to actor HP | Damage-reactive abilities |
| `dying` | `{ previousHp: number, currentHp: number, cause?: string, attackerId?: string }` | Actor HP drops to ≤ 0 but above death threshold | Stabilization checks, bleeding out |
| `death` | `{ previousHp: number, currentHp: number, cause?: string, attackerId?: string, damage?: number }` | Actor HP drops to ≤ world death threshold | Draconian death throes, Rage ends, Contingency fires |
| `revealSecret` | `{ secretAeId: string, field: string, previousValue: unknown, revealedValue: unknown }` | Secret AE is disabled (revealed) | Chat notification, journal updates, identification macro triggers |

> `preUseAction`, `postUseAction`, `dealDamage`, and `UseActionContext` → **poc.10** (Basic Combat).

#### Item Events

| Event | Payload | Emitted when | Example use case |
|-------|---------|-------------|-----------------|
| `takeDamage` | `{ amount: number, damageType: string, source?: string }` | Damage applied to item HP | Item durability, sunder |
| `destroyed` | `{ previousHp: number, cause?: string }` | Item HP drops to ≤ 0 | Item breaks, special effects on destruction (cursed items) |
| `revealSecret` | `{ secretAeId: string, field: string, previousValue: unknown, revealedValue: unknown }` | Secret AE on item is revealed | Same as actor — identification reveals |

#### Damage → Death Cascade

`takeDamage` is the root event; `dying`/`death`/`destroyed` emit from the same damage-application flow:

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

**Death threshold** is driven by a world setting. Options:
- `−10` flat (PHB default)
- `−[CON score]` (house rule — tougher fighters survive longer)

A separate **"Monsters die at 0"** world toggle makes NPC actors without class levels die immediately at 0 HP rather than entering the dying range. Per-actor override still applies (constructs/undead always die at 0 regardless). Items always use 0.

### Completion Checklist (Document Event System)

**Already done (Phase 5):**
- [x] Create `src/helpers/DocumentEventEmitter.mts` with `DocumentEventEmitter` class
- [x] Export `EventHandler<T>` type
- [x] Add `readonly events: DocumentEventEmitter` to `Dnd35eDocumentMixin`
- [x] Wire `events.clear()` in document `_onDelete()` cleanup
- [x] Implement `DocumentLifeCycle.created` / `destroyed` lifecycle events wired in mixin
- [x] `on()` returns an unsubscribe `() => void`; `once()` auto-unsubscribes
- [x] Failing callback logs via `Hooks.onError` and does not block other callbacks

**Phase 6 — Remaining:**
- [ ] Add static `wellKnownEvents` registry + `registerEventType()` to `DocumentEventEmitter`
- [ ] Register well-known domain events at system init: `takeDamage`, `dying`, `death`, `destroyed`, `revealSecret` (`preUseAction`/`postUseAction`/`dealDamage` registered in poc.10)
- [ ] Define typed payload interfaces: `TakeDamagePayload`, `DeathPayload`, `DyingPayload`, `DestroyedPayload`, `RevealSecretPayload`
- [ ] Implement `takeDamage → dying → death` cascade in actor damage application method
- [ ] Implement world setting: death threshold mode (`−10` flat / `−CON score`)
- [ ] Implement world setting: "Monsters die at 0" toggle for NPC actors without class levels
- [ ] Per-actor override: constructs/undead always die at 0 regardless of world setting
- [ ] Implement `takeDamage → destroyed` cascade in item damage application method
- [ ] Define `RevealSecretPayload` interface (emission wired in Secret AE phase)
- [ ] Test: Subscribe to `takeDamage` on actor, apply damage, callback fires with amount/type
- [ ] Test: `takeDamage → dying` fires when HP drops to 0 but above −10
- [ ] Test: `takeDamage → death` fires when HP drops to −10 or below
- [ ] Test: `death` threshold is configurable per actor (constructs/undead die at 0)
- [ ] Test: `death` fires once per transition, not on every update while already dead
- [ ] Test: Item `takeDamage → destroyed` fires when item HP drops to 0
- [ ] Test: `on()` unsubscribe function works; `once()` auto-unsubscribes after first fire
- [ ] Test: `events.clear()` removes all listeners; subsequent `emit()` is a no-op

---

## 5.10 Files to Create/Modify

| Action | Path |
|--------|------|
| Modify | `src/helpers/DocumentEventEmitter.mts` — **Phase 5 created this file.** Phase 6 adds static `wellKnownEvents` registry + `registerEventType()` |
| *(Phase 5 done)* | `src/documents/document/DocumentDnd35e.mts` — `readonly events: DocumentEventEmitter` already added in Phase 5 |
| Create | `src/documents/actors/baseActor/data/ActorSystemModelBase.mts` — `ActorSystemModelBase`: speed, biography/notes |
| Create | `src/documents/actors/baseActor/data/CreatureSystemModel.mts` — `CreatureSystemModel extends ActorSystemModelBase`: abilities, HP, AC, saves, BAB, init, senses, encumbrance, currency |
| Create | `src/documents/actors/character/data/CharacterSystemModel.mts` — `CharacterSystemModel extends CreatureSystemModel`: xp, description fields, isPartyMember |
| Create | `src/documents/actors/npc/data/NpcSystemModel.mts` — `NpcSystemModel extends CreatureSystemModel`: stub only (Phase 23) |
| Create | `src/documents/actors/object/data/ObjectSystemModel.mts` — `ObjectSystemModel extends ActorSystemModelBase`: stub only (Phase 23) |
| Create | `src/documents/actors/trap/data/TrapSystemModel.mts` — `TrapSystemModel extends ObjectSystemModel`: stub only (Phase 23) |
| Expand | `src/documents/actors/baseActor/data/ActorSystemData.mts` — interfaces for source + derived data |
| Expand | `src/documents/actors/baseActor/ActorDnd35e.mts` — implement `prepareBaseData()`, `prepareDerivedData()`, `update()` refresh, `applyActiveEffects()` with stacking engine |
| Modify | `src/helpers/stacking.mts` — extract `applyStackedChanges()` helper (if not already done in Phase 2) for shared use by items and actors |
| Create | `src/vue/apps/VueActorSheet.mts` — abstract actor sheet base, mirrors `VueItemSheet.mts`; extends `useVueDocumentSheetMixin(ActorSheetBase)` |
| Widen | `src/vue/apps/VueDocumentSheetMixin.mts` — widen `TDocument` generic to accept `ActorDnd35e` |
| Create | `src/documents/actors/character/sheet/CharacterSheet.mts` — concrete character sheet class extending `VueActorSheet` |
| Create | `src/documents/actors/character/sheet/CharacterSheet.vue` — main character sheet Vue component |
| Create | `src/documents/actors/creature/sheet/tabs/bio/BioTab.vue` — Bio tab (identity, physical, languages, senses, biography) |
| Create | `src/documents/actors/creature/sheet/tabs/SettingsTab.vue` — Settings tab (isPartyMember, future per-character settings) |
| Create | `src/documents/actors/creature/sheet/tabs/sections/attributes/` — `AbilityScoresSection.vue` (wide cards), `AbilityScoresTable.vue` (compact, for Summary), `ActorSpeed.vue`, `SensesSection.vue`, `TraitsSection.vue` |
| Delete | `src/documents/actors/creature/sheet/tabs/sections/attributes/HpSection.vue`, `SavingThrowsSection.vue`, `ArmorClassSection.vue`, `InitiativeSpeedSection.vue` — moved to Combat tab (Story 4) |
| Create | `src/documents/actors/character/sheet/components/` — AbilityScores.vue, InventoryTab.vue, EquipmentSlots.vue and other tab/section components |
| Modify | `src/documents/actors/registration.mts` — register character sheet and `CharacterSystemModel` |
| Create | `src/constants/abilities.mts` — ability score constants (keys, labels, associated saves) |
| Create | `src/lang/en/abilities.json`, `src/lang/en/actors.json` |
| Test | `tests/unit/documents/actors/` — unit tests for ability mod calculation, AC derivation, encumbrance, stacking |
