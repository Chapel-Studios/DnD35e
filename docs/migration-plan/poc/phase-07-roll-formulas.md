# Phase 7: Roll Formulas & Custom Rolls

**Status**: 📋 Outlined (FormulaFamiliar system, action formulas)

> **Milestone**: POC  
> **Dependencies**: Phase 5  
> **Goal**: Formalize how roll formulas are constructed, resolved, and how roll data is assembled across the system. Ensure all formulas use FormulaFamiliar `#context.property` syntax with proper context inheritance (actor → item → action). Create D20Roll and DamageRoll custom roll classes used by Phase 8 (Action System).

> **Action System note**: This phase creates all the formula plumbing that Phase 8 consumes. D20Roll handles auto-crit/fumble confirmation. DamageRoll handles critical multipliers and damage type tagging. FormulaFamiliar contexts declared here (`#self.*`, `#item.*`) are extended with `#action.*` and `#target.*` in Phase 8.

---

## 7.1 Roll Data Assembly

Define the canonical shape of roll data at each level:

```typescript
// Actor roll data — the base context
interface ActorRollData {
  abilities: Record<AbilityKey, { mod: number, total: number, base: number }>;
  attributes: {
    bab: { total: number };
    ac: { normal: number, touch: number, flatFooted: number };
    saves: Record<SaveKey, { total: number }>;
    init: { total: number };
    // ...
  };
  details: { level: number, size: SizeCategory };
  skills: Record<SkillKey, { total: number, ranks: number }>;
  // size attack/grapple modifiers
  size: { attackMod: number, grappleMod: number, acMod: number };
}

// Item roll data — extends actor data with item-specific fields
interface ItemRollData extends ActorRollData {
  item: {
    // item-specific fields available as @item.xxx
  };
}
```

## 7.2 Formula Resolution Pipeline

1. **Author time**: User writes formula in a field (e.g., `"#self.abilities.str.mod + #self.bab"`)
2. **FormulaFamiliar**: Schema walker provides autocomplete for `#context.property` paths
3. **Prep time**: `prepareDerivedData()` resolves formulas that are needed for derived values via `Dnd35eDocumentMixin._buildFormulaContexts()`
4. **Roll time**: `Roll.fromTerms()` resolves remaining formulas with full roll data context (including `#target.*` added at execution time)
5. **Error handling**: Invalid formulas surface warnings via the preparation warning system (not blocking)

### FormulaFamiliar ↔ Foundry Roll Data Bridge

Two formula syntaxes coexist in the system:
- **`@attr`** — Foundry's native syntax. Evaluated by `Roll.replaceFormulaData()` and `NumberField._castChangeDelta()`. Used in initiative formulas, standard AE change values, inline rolls.
- **`#context.property`** — FormulaFamiliar syntax. Evaluated by `FormulaFamiliar.resolve()`. Used in the formula editor UI, cross-document references, FormulaField values.

Both resolve to the same underlying data. The bridge ensures they never drift:

```typescript
// Resolution pipeline (Phase 7)
function resolveFormula(formula: string, familiar: FamiliarSchema, rollData: Record<string, any>): string {
  // Step 1: Resolve #context.property tokens via FormulaFamiliar
  let resolved = FormulaFamiliar.resolve(formula, familiar);
  // Step 2: Remaining @attr tokens resolved by Foundry's Roll.replaceFormulaData()
  resolved = Roll.replaceFormulaData(resolved, rollData);
  return resolved;
}
```

**`getRollData()` generated from schema metadata**: Phase 5's `getRollData()` and FormulaFamiliar's schema walker should derive their structures from the same source to prevent drift. The schema walker already traverses `defineSchema()` — extend it to generate the `getRollData()` shape as well.

### Custom AE Change Type: `familiar`

The `familiar` change type (registered in Phase 2, handler implemented here) bridges FormulaFamiliar into AE change values:

```typescript
// Handler implementation for CONFIG.ActiveEffect.changeTypes.familiar
CONFIG.ActiveEffect.changeTypes.familiar = {
  label: 'DND35E.EFFECT.CHANGE_TYPE.familiar',
  defaultPriority: 25,
  handler: (targetDoc, change, options) => {
    const familiar = buildDocumentFamiliar(targetDoc);
    const resolved = FormulaFamiliar.resolve(change.value, familiar);
    const delta = Number(resolved) || 0;
    const current = foundry.utils.getProperty(targetDoc, change.key) ?? 0;
    foundry.utils.setProperty(targetDoc, change.key, current + delta);
  }
};
```

Users authoring AE changes via our Vue sheet can choose `familiar` as the change type and write `#self.abilities.str.mod` in the value field. Standard `add`/`override`/etc. change types continue to use `@attr` syntax — evaluated by Foundry's native `NumberField._castChangeDelta()` for free.

## 7.3 FormulaFamiliar Context Declarations

Establish the canonical formula contexts used throughout the system:

| Context | Provider | Available When |
|---------|----------|---------------|
| `#self.*` | Actor's `getRollData()` | Always on actor-owned items |
| `#item.*` | Item's system data | Always on item-owned actions |
| `#action.*` | ActionDataModel fields | During action execution (Phase 8) |
| `#target.*` | Target actor's `getRollData()` | During action execution with a target (Phase 8) |

```typescript
// FormulaFamiliar schema registration (per document type)
Dnd35eDocumentMixin.registerFormulaContexts("Actor", "character", {
  self: CharacterDataModel.schema,  // generates #self.abilities.str.mod etc.
});

Dnd35eDocumentMixin.registerFormulaContexts("Item", "weapon", {
  self: CharacterDataModel.schema,
  item: WeaponDataModel.schema,     // generates #item.enhancement etc.
});
```

## 7.4 Consistent Formula Paths

Establish and document the canonical `#context.property` paths:

| Path | Value |
|------|-------|
| `#self.abilities.str.mod` | Strength modifier |
| `#self.abilities.str.total` | Total Strength score |
| `#self.bab` | Base attack bonus |
| `#self.attributes.ac.normal` | Normal AC |
| `#self.saves.fort.total` | Fort save total |
| `#self.attributes.init.total` | Initiative total |
| `#self.details.level` | Character level |
| `#self.skills.perception.total` | Skill total |
| `#self.size.attackMod` | Size attack modifier |
| `#item.enhancement` | Item's enhancement bonus |
| `#target.attributes.ac.normal` | Target's AC (at execution time) |
| `#action.attackBonus` | Action's computed attack bonus |

## 7.5 Custom Roll Classes

These replace Foundry's base `Roll` class for system-specific rolling:

### D20Roll
Used by all attack rolls, skill checks, ability checks, and saves.

```typescript
class D20Roll extends Roll {
  // Auto-detect natural 20 (critical threat) and natural 1 (auto-miss)
  get isCriticalThreat(): boolean;
  get isFumble(): boolean;

  // Confirmation roll for critical threats
  async confirmCritical(targetAC: number): Promise<boolean>;

  // Modifiers applied before evaluation
  situationalModifiers: RollModifier[];
}
```

### DamageRoll
Used by all damage calculations.

```typescript
class DamageRoll extends Roll {
  // Critical multiplier (×2, ×3, etc.)
  criticalMultiplier: number;

  // Damage type tagging (slashing, piercing, fire, etc.)
  damageTypes: DamageType[];

  // Apply critical multiplication (only multiplies base dice, not flat bonuses per SRD)
  applyCritical(): DamageRoll;
}
```

> **Note**: These classes were originally planned in the old Phase 7 (Basic Combat), which has been merged. The simple `weapon.rollAttack()` concept is superseded by Phase 8's action chains — but D20Roll and DamageRoll remain as the low-level roll infrastructure the execution engine uses.

## 7.6 Formula Error Surfacing

- `FormulaFormGroup` handles field-level validation in Vue sheets
- System-level formula evaluation errors in `prepareDerivedData()` need a collection mechanism
- Preparation warnings: accumulate errors without blocking data prep, display in sheet UI

```typescript
// On actor/item during prepareDerivedData
this._preparationWarnings.push({
  field: 'system.damage.formula',
  message: 'Invalid formula: #self.nonexistent',
  severity: 'warning'
});
```

## 7.7 Group Change Targets

### Problem

Some AE changes need to target multiple fields simultaneously — e.g., "all saving throws" or "all Dexterity-based skills." These targets don't correspond to a single schema field. D35E solved this with `getChangeFlat()` + `buffTargets`, a tightly-coupled central expansion function. We need the same capability integrated seamlessly with the Formula Familiar and AE apply pipeline, without requiring individual field registration.

### Design Principles

1. **Minimal registration** — Only groups are registered. Individual field targets are discovered automatically by the schema walker and FormulaFamiliar context (§7.3). A phase adds a few group entries; it never catalogs every field.
2. **Seamless UX** — Group targets appear in the Formula Familiar picker alongside real fields. The user picks "All Saving Throws"; the system stores a group key; the user never sees the raw key or knows it differs from a real field path.
3. **Transparent expansion** — At AE apply time, group keys expand to concrete field paths. The apply loop handles each expanded path identically to a direct-targeted change.

### API Sketch

```typescript
/** A group of related AE change targets that expand to concrete field paths. */
interface ChangeTargetGroup {
  /** Unique key stored on the AE change, e.g. "group:allSaves". */
  key: string;
  /** i18n label shown in Formula Familiar picker. */
  label: string;
  /** Category header in the FF picker dropdown. */
  category: string;
  /** Expand to concrete field paths on a live actor. */
  expand(actor: Dnd35eActor): string[];
}

/** Registry — populated by later phases as data models land. */
const changeTargetGroups = new Map<string, ChangeTargetGroup>();

function registerChangeTargetGroup(group: ChangeTargetGroup): void {
  changeTargetGroups.set(group.key, group);
}

/**
 * Resolve a change key to one or more concrete field paths.
 * If the key is a registered group, expands it. Otherwise returns it unchanged.
 */
function resolveChangeTargets(key: string, actor: Dnd35eActor): string[] {
  const group = changeTargetGroups.get(key);
  return group ? group.expand(actor) : [key];
}
```

### Key Convention

Group keys use a `group:` prefix (e.g., `group:allSaves`, `group:dexSkills`) to avoid collision with real field paths (which start with `system.` or a root field name). The prefix is an internal convention — users never see it; the Formula Familiar picker shows only the friendly label.

### AE Apply Integration

In the change-application loop (customised in Phase 2), expand each change's key before applying:

```typescript
for (const change of sortedChanges) {
  const targets = resolveChangeTargets(change.key, actor);
  for (const targetPath of targets) {
    applyChangeToPath(actor, { ...change, key: targetPath });
  }
}
```

This is a ~5-line insertion into the existing apply loop. Changes targeting individual fields pass through `resolveChangeTargets()` unchanged — it returns `[key]` for unregistered keys.

### Formula Familiar Integration

The FF context builder (§7.3) already walks schemas to discover `friendlyName → fieldPath` entries. Group targets are appended under their category headers:

```typescript
// After schema-derived entries are built:
for (const [key, group] of changeTargetGroups) {
  familiarContext.addEntry({
    label: game.i18n.localize(group.label),
    path: key,                // the group key, e.g. "group:allSaves"
    category: group.category, // groups under this heading
    isGroup: true,            // visual hint in picker (e.g., italic or icon)
  });
}
```

Group targets only appear in the AE change key picker (where expansion makes sense). They do not appear in formula value contexts (where a single numeric value is needed, e.g., `#self.saves.fort.total` in a formula string). This is a natural boundary: the FF already separates "what can be targeted by an AE change" from "what can be referenced in a formula."

### Expected Groups

Registered by later phases as their data models land:

| Registering Phase | Group Key | Label | Expands To |
|-------------------|-----------|-------|------------|
| Phase 9 | `group:allSaves` | "All Saving Throws" | `system.saves.fort.value`, `.ref.value`, `.will.value` |
| Phase 9 | `group:allSkills` | "All Skills" | Every `system.skills.<key>.value` |
| Phase 9 | `group:strSkills` | "Strength Skills" | Skills keyed to Str |
| Phase 9 | `group:dexSkills` | "Dexterity Skills" | Skills keyed to Dex |
| Phase 9 | `group:intSkills` | "Intelligence Skills" | Skills keyed to Int |
| Phase 9 | `group:wisSkills` | "Wisdom Skills" | Skills keyed to Wis |
| Phase 9 | `group:chaSkills` | "Charisma Skills" | Skills keyed to Cha |

Additional groups (e.g., `group:allAC`, `group:allSpeeds`) can be registered by later phases without modifying core infrastructure.

> **Proof-of-concept recommendation**: Start with `group:allSaves` (3 fields, 1 group, trivial `expand()` function). Add skills groups immediately after in the same phase.

### What This Replaces

D35E's `getChangeFlat()` + `buffTargets` config served the same purpose but was tightly coupled to the actor model — every group was hard-coded in a central switch statement. This design decouples registration: each phase registers its own groups when its data models land.

### Relationship to Field Permission Metadata

This system is orthogonal to field permission metadata for schema field groups on item sheets (e.g., the `hp` section). Group Change Targets are about AE targeting — expanding a single AE change across multiple fields at runtime. Field permission concerns are handled by schema metadata (`useDnd35eField()` defaults) plus runtime overrides in `flags.dnd35e.fieldOverrides`. Neither system depends on the other.

## 7.8 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/dice/D20Roll.mts` — d20 roll with crit/fumble detection |
| Create | `src/dice/DamageRoll.mts` — damage roll with crit multiplier and types |
| Create | `src/dice/index.mts` — register `CONFIG.Dice.rolls` with `[D20Roll, DamageRoll]` |
| Create | `src/helpers/rollData.mts` — roll data assembly utilities |
| Create | `src/helpers/formulaBridge.mts` — `resolveFormula()` pipeline bridging `#context.property` and `@attr` |
| Create | `src/constants/rollVariables.mts` — canonical formula path documentation |
| Create | `src/helpers/changeTargetGroups.mts` — `ChangeTargetGroup` interface, registry, `registerChangeTargetGroup()`, `resolveChangeTargets()` |
| Expand | Actor `getRollData()` — structured roll data assembly (generate from schema walker metadata) |
| Expand | Item `getRollData()` — inherit actor data + add item fields |
| Expand | FormulaFamiliar context registrations per document type |
| Expand | FormulaFamiliar picker — append group targets from registry under category headers |
| Expand | AE change-application loop — call `resolveChangeTargets()` before applying each change |
| Implement | `CONFIG.ActiveEffect.changeTypes.familiar.handler` — FormulaFamiliar AE change evaluation |
| Create | Preparation warnings infrastructure on base document classes |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 7 has not started)

### ❌ Not Started (All Tasks for Phase 7)

**Roll Data Structure & Interfaces:**
- [ ] Create `src/types/rollData.d.ts` with interfaces:
  - `ActorRollData` (abilities with mod/total/base, attributes, saves, skills, size mods)
  - `ItemRollData extends ActorRollData` (adds item-specific fields)
  - `ActionRollData extends ItemRollData` (adds action-specific fields, Phase 8 will use)
  - `TargetRollData extends ActorRollData` (target's roll data, Phase 8 will use)
- [ ] Document each field's calculation/source
- [ ] Test: Interfaces compile without errors

**Actor.getRollData() Implementation:**
- [ ] Override `getRollData()` on `ActorDnd35e`
- [ ] Populate abilities: for each (str-cha), include base score, derived mod, derived total
- [ ] Populate attributes: bab, ac (normal/touch/flatFooted), saves (fort/ref/will), init
- [ ] Populate details: level, alignment
- [ ] Populate skills: each skill's total + rank count (stub for Phase 14 expansion)
- [ ] Populate size: sizeCategory and derived attackMod/grappleMod/acMod
- [ ] Test: `getRollData()` includes all expected fields
- [ ] Test: Values are correct for a test character

**Item.getRollData() Implementation:**
- [ ] Override `getRollData()` on `ItemDnd35e`
- [ ] Call parent actor's `getRollData()` to inherit all actor fields
- [ ] Add item-specific fields:
  - Weapon: enhancement, damage formula, critical range, critical multiplier
  - Equipment: armor bonus, shield bonus, ACP, spell failure
- [ ] Test: `getRollData()` includes both actor + item fields
- [ ] Test: Item fields override actor fields if names conflict (shouldn't happen, but verify logic)

**FormulaFamiliar Context Registration:**
- [ ] Create schema walker that traverses DataModel schema to build context autocomplete
- [ ] Register `#self.*` contexts mapping to actor's `getRollData()` schema
- [ ] Register `#item.*` contexts mapping to item's system schema
- [ ] Register `#action.*` contexts (placeholder, Phase 8 will populate)
- [ ] Register `#target.*` contexts (placeholder, Phase 8 will populate)
- [ ] Implement autocomplete in Vue formula input fields:
  - User types `#self.` → show available abilities, attributes, skills
  - User types `#item.` → show available item fields
- [ ] Test: Autocomplete suggestions are accurate
- [ ] Test: Invalid paths are rejected or warned

**Canonical Formula Paths Documentation:**
- [ ] Create `src/constants/formulaPaths.mts` documenting all valid `#context.property` paths
- [ ] Include examples for each:
  - Ability modifiers: `#self.abilities.str.mod`
  - Attack bonus: `#self.bab + #self.abilities.str.mod + #self.size.attackMod`
  - AC: `10 + #self.abilities.dex.mod - #item.armorCheckPenalty`
  - Save DC: `10 + #self.details.level + #self.abilities.wis.mod`
- [ ] Document context inheritance hierarchy (actor → item → action)
- [ ] Update README/docs with formula examples for users

**FormulaFamiliar ↔ Foundry Roll Data Bridge:**
- [ ] Implement `resolveFormula()` pipeline: Step 1 resolves `#context.property` via FormulaFamiliar, Step 2 resolves `@attr` via `Roll.replaceFormulaData()`
- [ ] Verify `getRollData()` paths mirror FormulaFamiliar schema paths (e.g., `@abilities.str.mod` ↔ `#self.abilities.str.mod`)
- [ ] Generate `getRollData()` structure from schema walker metadata (same source as FormulaFamiliar contexts)
- [ ] Implement `familiar` custom change type handler in `CONFIG.ActiveEffect.changeTypes.familiar` (registration done in Phase 2)
- [ ] Test: AE change with type `familiar` and value `#self.abilities.str.mod` correctly resolves and applies
- [ ] Test: AE change with type `add` and value `@abilities.str.mod` correctly resolves via Foundry's native `_castChangeDelta`
- [ ] Test: Both syntax styles resolve to the same numeric value for the same field
- [ ] Test: Invalid `#context.property` in familiar change type produces warning, not crash
- [ ] Document when to use `@attr` vs `#context.property` for system authors

**D20Roll Custom Class** in `src/dice/D20Roll.mts`:
- [ ] Extend Foundry's `Roll` class
- [ ] Implement `isCriticalThreat` getter: true if die result is natural 20
- [ ] Implement `isFumble` getter: true if die result is natural 1
- [ ] Implement `confirmCritical(targetAC: number): Promise<boolean>`
  - Roll confirmation d20
  - Compare to target AC or DC
  - Return true if confirm (≥ 11 vs AC by default)
- [ ] Add `situationalModifiers: RollModifier[]` array for temporary bonuses
- [ ] Apply modifiers correctly (add to d20 result, not total dice count)
- [ ] Test: Natural 20 detected, natural 1 detected
- [ ] Test: Confirmation roll works
- [ ] Test: Modifiers applied correctly

**DamageRoll Custom Class** in `src/dice/DamageRoll.mts`:
- [ ] Extend Foundry's `Roll` class
- [ ] Add `criticalMultiplier: number` field (2, 3, 4, etc.)
- [ ] Add `damageTypes: DamageType[]` field (slashing, piercing, bludgeoning, fire, etc.)
- [ ] Implement `applyCritical(): DamageRoll`
  - Multiply dice count by critical multiplier (only dice, not flat bonuses per SRD)
  - Re-evaluate roll with new multiplier
  - Return new DamageRoll with updated total
- [ ] Test: Critical multiplier applied to dice only
- [ ] Test: Flat bonuses not multiplied
- [ ] Test: Damage types tagged correctly

**Roll Class Registration** via `CONFIG.Dice.rolls`:
- [ ] Register `D20Roll` and `DamageRoll` in `CONFIG.Dice.rolls` array during `init` hook
  - Without registration, Foundry cannot deserialize these roll subclasses from chat message data
  - `CONFIG.Dice.rolls = [D20Roll, DamageRoll]`
- [ ] Verify `Roll.fromData()` correctly reconstructs `D20Roll` and `DamageRoll` from serialized chat messages
- [ ] Test: Create a D20Roll, send to chat, reload page — roll is still a D20Roll instance (not base Roll)
- [ ] Test: Same for DamageRoll

**Text Enrichers** via `CONFIG.TextEditor.enrichers`:
- [ ] Register custom enrichers in `init` hook for inline rolls and checks in journal entries and item descriptions:
  ```typescript
  CONFIG.TextEditor.enrichers.push(
    { pattern: /\[\[\/check (?<config>[^\]]+)\]\](?:\{(?<label>[^}]+)\})?/gi,
      enricher: enrichCheckLink, onRender: attachCheckListener },
    { pattern: /\[\[\/save (?<config>[^\]]+)\]\](?:\{(?<label>[^}]+)\})?/gi,
      enricher: enrichSaveLink, onRender: attachSaveListener },
    { pattern: /\[\[\/damage (?<config>[^\]]+)\]\](?:\{(?<label>[^}]+)\})?/gi,
      enricher: enrichDamageLink, onRender: attachDamageListener },
  );
  ```
- [ ] Implement enricher functions that return clickable `<a>` elements with `data-action` attributes
- [ ] Implement `onRender` listener functions that attach click handlers to enriched elements
- [ ] Supported inline syntax:
  - `[[/check reflex dc=15]]` → clickable Reflex save check
  - `[[/save fort]]` → clickable Fortitude save
  - `[[/damage 2d6+3 fire]]` → clickable damage roll
  - Custom label: `[[/check bluff]]{Lie convincingly}` → uses label text
- [ ] Test: Enriched text renders as clickable elements in journal entries
- [ ] Test: Clicking enriched element triggers the correct roll
- [ ] Test: Enriched elements render correctly in item descriptions and chat messages

**Codebase TODO Notes (Landing Here):**
- [ ] **Remove `ActiveEffect._shimChanges` compat shim** (`ItemDnd35e.mts:131`): The `_shimChanges(changes)` call is explicitly marked `// todo remove in v16`. When Phase 7 implements the formula-familiar change type handler and the full AE change pipeline is proven, verify whether the shim is still needed. If v16 migration transforms old AE data, remove the shim call and its TODO comment. If the shim is still required for pre-migration data, keep it but update the comment with the specific migration that will obsolete it.
- [ ] **Integrate Hooks.onError pattern into LogHelper** (`ItemDnd35e.mts:93`): The `applyActiveEffects()` method uses `LogHelper.error()` as a substitute for Foundry's `Hooks.onError()` pattern. Evaluate whether `LogHelper` should wrap `Hooks.onError()` for consistency with Foundry's error surfacing (e.g., error hooks that modules can listen to), or if the current direct logging is sufficient.
- [ ] **Fix `DnD35eActiveEffect.createDialog` type cast** (`ItemSheetStore.mts:92`): `createDialog` is called via `(DnD35eActiveEffect as any).createDialog(...)` because the type definitions don't expose it. Add proper type declaration for `createDialog` on `DnD35eActiveEffect` (either via interface merge or by adding the static method signature to the class).

**Preparation Warnings Infrastructure:**
- [ ] Add `_preparationWarnings: PreparationWarning[]` to `Dnd35eDocumentMixin`
- [ ] Define `PreparationWarning` interface: `{ field, message, severity: 'warning' | 'error' }`
- [ ] Collect warnings during `prepareDerivedData()` without blocking prep
- [ ] Display warnings in sheet UI (red/yellow banner or console summary)
- [ ] Implement formula validation that generates warnings:
  - Missing context path → warning
  - Invalid syntax → warning
  - Division by zero → warning
- [ ] Test: Warnings collected and displayed
- [ ] Test: Prep completes even with warnings

**Formula Error Handling:**
- [ ] Implement formula evaluation with try-catch:
  - Catch evaluation errors (missing variables, syntax errors)
  - Generate warning instead of throwing
  - Fall back to default value (0 or item's static value)
- [ ] Test: Invalid formula doesn't crash sheet
- [ ] Test: User sees warning message
- [ ] Test: Field shows fallback value

**Vue Form Component - Formula Input:**
- [ ] Create `FormulaFormGroup.vue` component for formula fields
- [ ] Show formula input field
- [ ] Show autocomplete dropdown on `#` key press
- [ ] Show validation status (green = valid, red = invalid)
- [ ] Show contextual help: "Formula must start with #self, #item, #action, or #target"
- [ ] Evaluate `HeaderNameField.vue` refactor (`HeaderNameField.vue:25`): Component uses its own display mode to hide formula hints when not editing. Assess whether this should be folded into `FormulaFormGroup` as a `displayMode` prop or slot, or kept as a separate wrapper. The TODO also notes styling concerns with a read-only slot that were deferred.
- [ ] Test: Autocomplete works
- [ ] Test: Validation works
- [ ] Test: Complex formulas with operators work

**Group Change Targets (§7.7):**
- [ ] Create `src/helpers/changeTargetGroups.mts`:
  - `ChangeTargetGroup` interface (key, label, category, expand function)
  - `changeTargetGroups` registry (Map)
  - `registerChangeTargetGroup()` — add a group to the registry
  - `resolveChangeTargets(key, actor)` — expand group key or pass through direct path
- [ ] Integrate `resolveChangeTargets()` into AE change-application loop (Phase 2's customised apply path)
- [ ] Integrate group targets into Formula Familiar picker:
  - Append registered groups under category headers after schema-derived entries
  - Mark group entries with `isGroup: true` for visual distinction
  - Restrict group entries to AE change key picker only (not formula value contexts)
- [ ] Test: Direct field path passes through `resolveChangeTargets()` unchanged → `[key]`
- [ ] Test: Registered group key expands to concrete paths
- [ ] Test: Group entries appear in FF picker under correct category
- [ ] Test: Group entries do NOT appear in formula value autocomplete

**Integration Testing:**
- [ ] Unit test: Roll data assembly for all document types
- [ ] Unit test: D20Roll crit/fumble detection
- [ ] Unit test: DamageRoll critical multiplication
- [ ] Integration test: Create weapon with formula damage (`1d8 + #self.abilities.str.mod`)
- [ ] Integration test: Resolve formula → get correct value based on actor stats
- [ ] Integration test: Change actor ability score → formula re-evaluates
- [ ] Integration test: Invalid formula generates warning
- [ ] Edge case: Formula with size modifier (`1d8 + #self.size.attackMod`)
- [ ] Edge case: Formula referencing nonexistent ability
- [ ] Smoke test: No console errors during prep

**Documentation & Examples:**
- [ ] Create role formula guide: "Writing Formulas in dnd35e"
  - Explain `#context.property` syntax
  - Show role data inheritance diagram
  - Provide 5-10 formula examples
  - Explain when formulas are evaluated
- [ ] Document D20Roll/DamageRoll for developers
- [ ] Add journal entry in dev world: "Roll Formula System"
- [ ] Create comment block in `rollData.mts` explaining architecture
