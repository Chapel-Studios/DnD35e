# POC Phase 7: Roll Formulas & Custom Rolls

**Status**: 🔶 In Progress (FormulaFamiliar system, action formulas)

> **Milestone**: POC  
> **Dependencies**: Phase 5  
> **Goal**: Formalize how roll formulas are constructed, resolved, and how roll data is assembled across the system. Ensure all formulas use FormulaFamiliar `#context.property` syntax with proper context inheritance (actor → item → action). Create D20Roll and DamageRoll custom roll classes used by Phase 10 (Action System).

> **Action System note**: This phase creates all the formula plumbing that Phase 10 consumes. D20Roll handles auto-crit/fumble confirmation. DamageRoll handles critical multipliers and damage type tagging. FormulaFamiliar contexts declared here (`#self.*`, `#item.*`) are extended with `#action.*` and `#target.*` in Phase 10.

---

## Design Decisions (this planning pass)

- **No `@attr` bridging.** The system sends zero `@`-prefixed tokens to Foundry's `Roll`/`_castChangeDelta` pipeline. Every authored formula (weapon damage, DC, AE change value, AE change condition) resolves exclusively through FormulaFamiliar's `#context.property` syntax to a literal value *before* it ever reaches `Roll` or `NumberField._castChangeDelta`. This is already how the shipped code behaves — this phase formalizes it as the permanent design rather than the two-syntax bridge originally sketched below (see §7.2).
- **Typed resolution.** FormulaFamiliar formulas resolve to one of three output types — `string` (default, name/text interpolation), `number` (already implemented, e.g. Spell Resistance), and `boolean` (new — comparison/logical expressions like `#self.skill.concentration.ranks > 5`). Each `FormulaField`/`FormulaData` declares its `expectedType`, and resolution enforces it instead of only coercing at read time.
- **First boolean consumer: AE change conditional gate.** A `condition` formula (boolean-typed) on an individual AE change determines whether that change applies at all. This slot already exists as a typed placeholder (`EffectChangeSourceDnd35e.condition`) — this phase implements it for real.
- **Advanced conditional formula editor.** Every `FormulaFormGroup` gets a button (opt-out via `hideAdvancedEditor` prop) that opens one of two modes depending on the field's `expectedType`: `number`/`string` fields get **Conditional Values** (an ordered list of condition → value rules, first true condition wins, original formula becomes the trailing default); `boolean` fields (e.g. the AE Condition column) get the **Condition Builder** standalone — a single structured condition row, no rule list. Both modes share the same Condition Builder row component (aspect/formula + operator + aspect/formula, AND/OR chaining, "Edit as text" escape hatch) and compile down to a single formula string — no separate structured-data storage format. See §7.10.
- **Boolean grammar supports arithmetic operands.** Comparison operands in a boolean-typed formula may themselves be arithmetic sub-expressions, e.g. `#actor.hp.current > (#actor.hp.max / 2)`. Required because a `condition` string resolves as one fully-substituted expression handed whole to `evaluateBooleanExpression()` — there is no separate per-operand resolution step, so `+ - * /` (with standard precedence and unary minus) must be part of the same grammar as the comparison/logical operators. **Implemented** — see §7.2a.
- **AE Sheet Revamp (Story B, redesigned).** Story B's first UI pass (a collapsed toggle row per change) was built, reviewed, and **rejected** — it buried the condition behind an icon and conflated the simple boolean gate with Story C's conditional-value editor. Story B is now scoped as part of a broader Changes-tab redesign, using the AE sheet (General + Material) as the flagship use case for FormulaFamiliar across the system. See §7.7b.

## Stories (this decomposition)

| Story | Delivers | Depends on |
|---|---|---|
| **A** | Boolean-typed formulas: schema support, resolution, comparison/logical operators, validation | Existing FormulaFamiliar infra (already built — see note below) |
| **B** | GM can gate an individual AE change on a boolean formula — change is skipped entirely when false | Story A |
| **C** | Any formula field can be turned into an ordered list of condition → value rules ("Conditional Values") that compiles to a formula string | Story A (rule conditions are boolean formulas) |
| **D** | (Existing POC story, §7.9) Clickable defense stat → roll dialog → chat card | §7.1/7.2 (rewritten, no `@` bridge) |

Stories A→B and A→C are the only hard dependencies; B and C can proceed in parallel once A lands. Story D is unchanged in scope but its roll-building step no longer uses `@` tokens (see §7.2).

> **Status note**: Much of the FormulaFamiliar plumbing this phase originally scoped as net-new (schema walker, `FormulaField`/`FormulaData`, per-context autocomplete, universal `#`-token resolution for AE change values regardless of declared `type`) **already shipped** ahead of this phase, landing alongside Phase 2/5/6 AE work. The Completion Checklist at the bottom of this doc has been updated to reflect what's actually done vs. still pending. D20Roll, DamageRoll, and the roll-dialog/chat-card pipeline (Story D) have **not** started.

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

> **Scope of `getRollData()`**: This shape exists **only** to satisfy Foundry-native `@attr` consumers we don't control — e.g. the Combat Tracker's initiative formula setting (`CONFIG.Combat.initiative.formula`). It is not a resolution path any of our own authored formulas travel (see §7.2). Keep it minimal; do not expand it in lockstep with every FormulaFamiliar aspect.

## 7.2 Formula Resolution Pipeline

1. **Author time**: User writes a formula in a field (e.g., `"#self.abilities.str.mod + #self.bab"`), or turns it into Conditional Values for branching logic (§7.10).
2. **FormulaFamiliar**: Schema walker provides autocomplete for `#context.property` paths as the user types.
3. **Prep time**: `prepareDerivedData()` resolves formulas needed for derived values via the document's familiar context (`buildDocumentFamiliar()` / `buildDocumentDataMap()`).
4. **Resolution**: `FormulaData.resolve()` / `FormulaData.resolveSource()` substitute every `#context.property` token with its live value, then coerce/validate the result against the field's `expectedType` (`string` / `number` / `boolean` — see §7.2a).
5. **Roll time**: The fully-resolved formula (a plain dice-notation string with zero `#` or `@` tokens remaining, e.g. `"1d8 + 4"`) is handed directly to `Roll.create()`. There is no second substitution pass.
6. **Error handling**: Invalid formulas surface warnings via the preparation warning system (§7.6, not blocking).

### No `@attr` Bridge

FormulaFamiliar's `#context.property` syntax is the **only** authoring syntax the system supports. We do not translate to, accept, or emit Foundry's native `@attr` syntax anywhere in an authored formula's resolution path:

- Weapon damage formulas, DC formulas, AE change values, and AE change conditions (§7.7a) resolve exclusively through `FormulaData.resolve()` / `resolveActiveEffectChangeValue()`.
- The resolved output is always a literal (a number, a boolean, or a plain string/dice-formula) — never a string containing `@` tokens.
- Foundry itself still calls `getRollData()` for its own native mechanics we don't control (initiative formula, etc. — see the callout at the end of §7.1). That is a narrow accommodation, not a general bridge.

This is already how the shipped code behaves: `resolveActiveEffectChangeValue()` (`resolveChangeValue.mts`) resolves every AE change's `value` through `FormulaData.resolveSource()` regardless of the change's declared `type`. This section formalizes that as the permanent design — the two-syntax bridge originally sketched for this phase is not being built.

### Custom AE Change Type: `familiar` — Removed

`CONFIG.ActiveEffect.changeTypes.familiar` (`handler: null` placeholder) was registered speculatively and never used. It leaked into the AE sheet's Type dropdown as a nonsensical user-selectable option — since any `CONFIG.ActiveEffect.changeTypes` entry automatically becomes user-selectable via `ActiveEffect.CHANGE_TYPES` in any UI that iterates that getter. **Resolved**: removed entirely (registration, the `CHANGE_TYPE.FAMILIAR` constant, its `SystemActiveEffectChangeTypes` type augmentation in `global.mts`, and its localization key). Do not conflate change *types* (Add/Multiply/Override/etc. — how a value combines onto a field) with the `condition` field (§7.7a) — `condition` gates whether *any* change, of any type, applies at all.

## 7.2a Typed Formula Outputs (Story A)

Every `FormulaField`/`FormulaData` already declares an `expectedType` (`'string' | 'number'`, e.g. Spell Resistance uses `'number'`). This phase adds a third type and makes resolution enforce the declared type rather than only coercing at read time.

### `expectedType: 'string' | 'number' | 'boolean'`

| Type | Use | Example field | Resolution behavior |
|---|---|---|---|
| `string` | Text interpolation (names, descriptions) | Item name formula | Substituted tokens joined as-is; no coercion |
| `number` | Numeric derived values | Spell Resistance, weapon damage bonus | After substitution, evaluate via `Roll.safeEval` (dice-formula arithmetic); non-numeric result is a validation error |
| `boolean` *(new)* | Gates and conditions | AE change `condition` (§7.7a), rule conditions in Conditional Values (§7.10) | After substitution, evaluate via a new small comparison/logical expression evaluator — `Roll.safeEval` has no `>`/`&&`/etc. |

### Boolean Expression Grammar

Boolean-typed formulas support comparison and logical operators over already-substituted numeric/string literals, and comparison operands may be arithmetic sub-expressions:

```
#self.skill.concentration.ranks > 5
#self.abilities.str.mod >= 2 && #self.bab > 0
!#self.hasCondition
#actor.hp.current > (#actor.hp.max / 2)
```

Supported operators: `>`, `<`, `>=`, `<=`, `==`, `!=`, `&&`, `||`, `!`, `+`, `-`, `*`, `/` (standard arithmetic precedence, unary minus), parentheses for grouping. This is a small, purpose-built evaluator (`evaluateBooleanExpression()`, `src/helpers/formulae/evaluateBooleanExpression.mts`) — not a general JS `eval`, and distinct from `Roll.safeEval`. Grammar:

```
orExpr         := andExpr ( '||' andExpr )*
andExpr        := notExpr ( '&&' notExpr )*
notExpr        := '!' notExpr | comparison
comparison     := additive ( ('>' | '<' | '>=' | '<=' | '==' | '!=') additive )?
additive       := multiplicative ( ('+' | '-') multiplicative )*
multiplicative := unary ( ('*' | '/') unary )*
unary          := ('-' | '+') unary | primary
primary        := '(' orExpr ')' | NUMBER | STRING | 'true' | 'false' | IDENT
```

**Status: implemented and tested** (`tests/unit/familiar/evaluate-boolean-expression.test.mts`).

### Schema Walker & `FieldAspect` Changes

- `schemaWalker.mts`: `inferFieldType()` gains a `BooleanField → 'boolean'` branch (currently only distinguishes `NumberField` from everything else — every other field, including `BooleanField`, falls into `'string'`).
- `FieldAspect.type` widens from `'string' | 'number'` to `'string' | 'number' | 'boolean'` (`types.mts`).
- `FormulaFieldMeta.aspectType` override widens to match.
- Autocomplete/validation in `FormulaFormGroup.vue` / `useFormulaEditor.mts` flags a type mismatch (e.g. a `number`-typed field whose formula resolves to a boolean) as a validation error, not just a silent runtime fallback.

### `FormulaData` / `FormulaField` Changes

- `FormulaData.defineSchema()`: `expectedType` choices become `['string', 'number', 'boolean']`.
- `FormulaData._finalizeResolvedValue()`: branch on `'boolean'` — run `evaluateBooleanExpression()` instead of `Roll.safeEval`; store `'true'`/`'false'` as the resolved string (consistent with how `resolveActiveEffectChangeValue()` already special-cases `BooleanField` results).
- `FormulaField` constructor options: `expectedType` widens to include `'boolean'`.

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
| `#self.defense.armorClass` | Normal AC |
| `#self.saves.fort.total` | Fort save total |
| `#self.attributes.init.total` | Initiative total |
| `#self.details.level` | Character level |
| `#self.skills.perception.total` | Skill total |
| `#self.size.attackMod` | Size attack modifier |
| `#item.enhancement` | Item's enhancement bonus |
| `#target.defense.armorClass` | Target's AC (at execution time) |
| `#action.attackBonus` | Action's computed attack bonus |
| `#self.skill.concentration.ranks > 5` | Boolean gate example — true when ranks exceed 5 |
| `#self.abilities.str.mod >= 2 && #self.bab > 0` | Boolean gate example — compound condition |

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

### Relationship to AE Change Conditional Gate (§7.7a)

Also orthogonal, and easy to conflate since both live on the `changes` array. Group Change Targets expand a change's **key** (one change → many field paths, all values identical). The conditional gate (§7.7a) decides whether a change **applies at all** (one change → applied or entirely skipped). A single change entry can use both: a `group:allSaves` key with a `condition` formula that must be true for the whole group to apply.

## 7.7a AE Change Conditional Gate (Story B)

**User**: GM authoring an Active Effect.
**Delivers**: An individual change row in the AE sheet's change list gets an optional boolean formula. When present and it resolves to `false` at apply time, that change is skipped entirely — as if it weren't in the `changes` array for this preparation cycle. When absent (`null`), the change always applies (current behavior, unchanged).
**Depends on**: Story A (boolean-typed formula resolution).

### Schema

`EffectChangeSourceDnd35e.condition` already exists as a typed placeholder (`ActiveEffectSystemData.mts`):
```ts
condition?: string | null;
```
This phase adds it to the actual Foundry schema — `ActiveEffectSystemModel.defineSchema()`'s `changes` `ArrayField`/`SchemaField` currently has no `condition` field:
```ts
condition: new StringField({ required: false, nullable: true, initial: null }),
```
String-only, no function form — `condition` is persisted to the database as part of the change entry, and a function could never round-trip through it. Live-computed changes with no backing AE document (`ItemDnd35e.getContributedActorChanges()`, `ActorDnd35e.getSelfContributedChanges()`) use the same string-form grammar if they ever need a condition (none currently do — they're filtered unconditionally in TS before the change entry is even built, e.g. Creature's encumbrance changes only get pushed `when tier > 0`). The one system-computed change that DID need a condition (`buildContainmentChanges.mts`'s weightless-bag-of-holding check) now uses the formula string `'!#item.contentsAreWeightless'` instead of a TS predicate.

### Apply-Loop Integration

Both gathering loops that build the `changes[]` array before stacking need the same check, right alongside the existing `!change.key` / phase / target filters:

- `ActorDnd35e.applyActiveEffects()` — all three gathering loops (AE-backed changes, `item.getContributedActorChanges()`, `this.getSelfContributedChanges()`)
- `ItemDnd35e.applyActiveEffects()` — its equivalent gathering loop

```typescript
// Alongside the existing continue-filters in each gathering loop:
if (change.condition && !evaluateChangeCondition(change, contextMap)) continue;
```

`evaluateChangeCondition()` (new — `src/documents/activeEffects/baseActiveEffect/logic/`):
- Resolve via `FormulaData.resolveSource({ formula: change.condition, expectedType: 'boolean', resolvedValue: null }, contextMap)`, reusing the **same** `contextMap` `getEffectContexts()` already builds for value resolution (`resolveChangeValue.mts`) — don't duplicate context assembly.
- No `contextMap` available (live-contributed changes with no backing AE) → treat as `false` and warn, rather than silently passing.
- Resolution failure (invalid formula) → treat as `false` and surface a preparation warning (§7.6), never throw.

### UI

Superseded by §7.7b (AE Sheet Revamp) — the condition input is a dedicated **Condition column** in `EffectChangesList.vue`, not a per-row collapsed toggle. See §7.7b for the current design.

### Tests

- [x] Change with `condition: null` applies unconditionally (current behavior unchanged)
- [x] Change with a `condition` formula that resolves `true` applies
- [x] Change with a `condition` formula that resolves `false` is skipped — target field unaffected, no `Override` recorded for it
- [x] Invalid `condition` formula → warning generated, change treated as `false` (skipped), no crash
- [ ] Condition on a `group:`-targeted change (§7.7) gates the whole expanded group

## 7.7b AE Sheet Revamp — Changes Tab Redesign

**User**: GM authoring an Active Effect (General or Material type).
**Status**: Design in progress — partially implemented, partially still under discussion. Do not implement further UI beyond what's listed as done below without a fresh go-ahead.
**Depends on**: Story A, §7.7a's schema/logic (unchanged).

### Motivation

Story B's first UI pass added a condition as a collapsed toggle row hidden behind a branch icon in `FieldControls`. This was reviewed and rejected: it buried a first-class per-change setting, and blurred the line between the simple boolean gate (Story B) and Story C's Conditional Values editor (a different feature entirely — branching the *value*, not gating the *change*). The AE sheet is being treated as the flagship use case for FormulaFamiliar across the system, so this redesign covers the full Changes tab, not just the condition field.

### Changes Tab — Column Layout

Reordered left-to-right (previously Key/Type/Value/Bonus Type/Target/Priority/Controls):

| Order | Column | Notes |
|---|---|---|
| 1 | **Target** | Moved first — determines which document's context the Key/Value/Condition pickers resolve against. Was last. |
| 2 | Key | `AspectPicker`, unchanged. Re-validates against the new target's context when Target changes (see AspectPicker fix below). |
| 3 | Type | Add/Multiply/etc. dropdown — now excludes `mask` (never user-selectable) and no longer offers the removed `familiar` placeholder. |
| 4 | Value | `FormulaFormGroup`, now enforces the picked aspect's `expectedType` (derived via `findAspectByAccessPath()`) instead of accepting any type. Gets the advanced-editor entry point (Story C, §7.10) once that's built. |
| 5 | **Condition** *(new)* | Plain `FormulaFormGroup` (`expectedType: 'boolean'`) — same kind of control as the Value column, just its own field/column. Comparison/logical operators get their own highlight class alongside the existing `#token` highlighting. Advanced-editor button opens the **Condition Builder** (§7.10) in standalone mode. Replaces the removed branch-toggle row. |
| 6 | Priority | Unchanged. |
| 7 | Controls | Delete button only — branch-toggle button removed (condition now has its own column). |

Bonus Type (mask variant only) and Target-select stay in their existing relative positions otherwise unaffected by this reorder.

### Value Column — `expectedType` Enforcement

The Value formula's `expectedType` is derived from the picked aspect (`change.key`), not left to default to `'string'`:
- Look up the aspect via `findAspectByAccessPath(contextForTarget.properties, change.key)`.
- Pass its resolved `FieldAspect.type` (`'string' | 'number' | 'boolean' | undefined`) as `FormulaFormGroup`'s `expected-type` prop.
- This logic lives in `EffectChangesList.vue` (the row component) — not `AspectPicker.vue` — since the row is what owns both the Key and Value columns and needs to bridge them. (Open to emitting it from `AspectPicker` instead if that proves easier at implementation time — not a hard requirement either way.)

### Condition Column

No new component. The Condition column is a plain `FormulaFormGroup` with `expectedType: 'boolean'` — identical in kind to the Value column, just its own field/column. Three side-by-side inputs (`[formula] [op ▾] [formula]`) don't fit the column width, so the "structured picker" experience lives entirely in the advanced editor instead (§7.10's Condition Builder); the column itself is always raw-text entry with highlighting.

**Highlighting**: extend formula syntax highlighting to tag comparison/logical operators (`>`, `<`, `>=`, `<=`, `==`, `!=`, `&&`, `||`) with their own highlight class, in addition to the existing `#context.property` token highlighting. Example: in `#self.hp.current > (#self.hp.max / 2)`, both `#self.hp.current` and `#self.hp.max` highlight as tokens, and `>` highlights as an operator. This is a system-wide enhancement to the formula renderer (benefits any boolean-typed `FormulaFormGroup`), not Condition-column-specific.

**Advanced editor entry point**: clicking the advanced-editor button on a boolean-typed `FormulaFormGroup` (Condition column included) opens the Condition Builder (§7.10) in **standalone mode** — a single structured `[aspect/formula] [operator ▾] [aspect/formula]` row with AND/OR chaining and an "Edit as text" escape hatch, no surrounding rule list. This is the *same component* used per-rule inside Conditional Values (§7.10) for number/string fields.

### Bug Fixes (shipped)

- Removed `CONFIG.ActiveEffect.changeTypes.familiar` (registration, the `CHANGE_TYPE.FAMILIAR` constant, its `SystemActiveEffectChangeTypes` type augmentation, and its localization key) — it was an unused placeholder that leaked into the Type dropdown as a nonsensical user-selectable option.
- `changeTypes.mask` stays registered (Secret AE internals still need it) but is filtered out of the Type dropdown for `variant='default'` rows.
- `AspectPicker.vue`: a stored key that becomes unresolvable after switching Target (a raw path with no `#` token) previously produced **zero** validation errors — `validateFormula()` only inspects `#context.property` tokens, so an orphaned raw path silently looked valid. Now detected explicitly and surfaced via `has-error` styling + hint text (reusing `dnd35e.Formula.Errors.propertyNotFound`), matching the "leave the raw value in place, flag it as an error" reset behavior (never silently clear or destroy the stored key on a Target switch).

### General AE Custom Sheet

`general` (and `containment`) AE types currently fall back to Foundry's default `ActiveEffectConfig` — only `material` and `secret` have custom Vue sheets. Add a General sheet mirroring Material's minimal pattern (`GeneralSheet.mts`/`.vue`, `GeneralStore.mts`, `sheet/tabs/index.mts`) with a bare `EffectDetails`-only Details tab (no appends) so General AEs get sheet parity (same Changes tab redesign, same Duration tab) without any type-specific fields.

### Design Decisions (resolved)

- **Condition column is not a compound control.** No `ConditionFormGroup.vue`. It's a plain boolean `FormulaFormGroup`, same as any other formula field, just given its own column instead of being hidden behind a toggle.
- **One shared Condition Builder component** (§7.10), used two ways:
  - **Standalone** — the advanced-editor entry point for any boolean-typed `FormulaFormGroup` (Condition column included): a single structured condition row with AND/OR chaining and a text escape hatch.
  - **Embedded per-rule** — inside Conditional Values (number/string fields, §7.10): one Condition Builder per rule, gating that rule's value.
- **Advanced editor mode depends on the field's `expectedType`**: `boolean` fields open the Condition Builder (helps write a gate/condition expression); `number`/`string` fields open Conditional Values (branches which value is used). Both compile to plain formula text — no new storage format either way.
- **Advanced editor button is system-wide** on every `FormulaFormGroup`, with a `hideAdvancedEditor` prop for the rare case a consumer needs to opt out.
- **Operator highlighting** is a system-wide formula-renderer enhancement, not Condition-column-specific — see above.

## 7.8 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/dice/D20Roll.mts` — d20 roll with crit/fumble detection |
| Create | `src/dice/DamageRoll.mts` — damage roll with crit multiplier and types |
| Create | `src/dice/index.mts` — register `CONFIG.Dice.rolls` with `[D20Roll, DamageRoll]` |
| Create | `src/helpers/rollData.mts` — minimal `getRollData()` assembly for Foundry-native `@attr` consumers only (§7.1) |
| Create | `src/constants/rollVariables.mts` — canonical formula path documentation |
| Create | `src/helpers/changeTargetGroups.mts` — `ChangeTargetGroup` interface, registry, `registerChangeTargetGroup()`, `resolveChangeTargets()` |
| Create | `src/helpers/formulae/evaluateBooleanExpression.mts` — comparison/logical operator evaluator for boolean-typed formulas (Story A, §7.2a) |
| Create | `src/helpers/formulae/conditionalFormula.mts` — `#if(cond, then, else)` parser + serializer for the advanced editor (Story C, §7.10) |
| Create | `src/vue/components/.../ConditionBuilder.vue` — shared condition-builder row (aspect/formula + operator ▾ + aspect/formula, AND/OR chaining, text escape hatch); used standalone for boolean fields and embedded per-rule in Conditional Values (Story C, §7.10) |
| Create | `src/vue/components/.../ConditionalValuesEditor.vue` — rule-list builder UI embedding `ConditionBuilder` per rule (Story C, §7.10) |
| Create | `src/documents/activeEffects/general/sheet/GeneralSheet.mts` / `.vue`, `GeneralStore.mts`, `sheet/tabs/index.mts`, `GeneralDetails.vue` — General AE custom sheet mirroring Material's pattern, bare `EffectDetails`-only Details tab (§7.7b) |
| Create | `src/documents/activeEffects/baseActiveEffect/logic/evaluateChangeCondition.mts` — AE change conditional gate (Story B, §7.7a) |
| Expand | Actor `getRollData()` — minimal, Foundry-native mechanics only (not our authored-formula resolution path) |
| Expand | Item `getRollData()` — inherit actor data + add item fields (same narrow scope) |
| Expand | `schemaWalker.mts` — `inferFieldType()` gains `BooleanField → 'boolean'` (Story A) |
| Expand | `FormulaData.mts` / `FormulaField.mts` — `expectedType` widens to include `'boolean'` (Story A) |
| Expand | `FormulaFormGroup.vue` — advanced-editor button (opens Condition Builder standalone or Conditional Values depending on `expectedType`), plus `hideAdvancedEditor` opt-out prop (Story C) |
| Expand | `ActiveEffectSystemModel.defineSchema()` — add `condition` field to `changes` schema (Story B) |
| Expand | `EffectChangesList.vue` — reorder columns (Target first), remove branch-toggle, add plain boolean Condition column, derive Value `expected-type` from picked aspect (Story B/§7.7b) |
| Expand | Formula syntax highlighter (wherever `renderFormulaHTML`/token highlighting lives today) — tag comparison/logical operators (`>`, `<`, `==`, `&&`, `||`, etc.) with their own highlight class (§7.7b) |
| Expand | FormulaFamiliar picker — append group targets from registry under category headers |
| Expand | AE change-application loop — call `resolveChangeTargets()` and `evaluateChangeCondition()` before applying each change |
| Create | Preparation warnings infrastructure on base document classes |
| Create | `src/vue/components/actors/CreatureDefenseStat.vue` — clickable stat chip for saves and AC |
| Create | `src/vue/components/dialogs/D20RollDialog.vue` — roll dialog with situational mod + roll mode |
| Create | `src/vue/components/chat/SaveRollChatCard.vue` — chat card with full modifier breakdown |
| Create | `src/helpers/rollMessages.mts` — chat message assembly from a `D20Roll` + modifier history |
| Expand | `CreatureDnd35e` — add `rollSave(saveKey, options)` method |
| Expand | `CreatureDnd35e` — add `rollAC(acVariant, options)` stub (same pipeline, AC-specific label) |

---

## 7.9 POC Story: Clickable Defense Stat → Roll Dialog → Chat Card

**User**: GM / Player  
**Delivers**: Clicking a save (Fort / Ref / Will) or AC value on the character sheet opens a Roll dialog. The user optionally adds a situational modifier, picks a roll mode, and clicks Roll. A `D20Roll` executes and posts a chat card with a full modifier breakdown — mirroring D35E's save roll window.  
**Depends on**: Phase 6 Story 4 (saves and AC are live derived fields), §7.2 (`D20Roll` class), §7.1 (`getRollData`).

This is Phase 7's proof-of-concept story — the first complete click-to-chat-card pipeline in the system.

### `CreatureDefenseStat.vue`

A general-purpose clickable stat chip used wherever a derived defense stat appears on the sheet. Replaces plain text displays in the header stat pills and Combat tab stat rows.

**Props**:
- `label` — display string (already localized by caller)
- `value` — the computed numeric value
- `rollable: boolean` — default `true`; set to `false` to suppress click (e.g. flat-footed AC displayed as info-only)

**Behavior**:
- **Edit mode**: read-only display, no click — GMs edit source values; rolling from edit mode would be confusing
- **Play / True mode**: renders as a button-like chip (cursor pointer); click → opens roll dialog

Used in:
- Header stat pills: Fort | Ref | Will | AC (normal)
- Combat tab rows for each save variant and all three AC variants

### Roll Dialog (`D20RollDialog.vue`)

A Vue dialog component (consistent with the system's Vue-first approach).

**Contents**:
| Element | Notes |
|---------|-------|
| Title | `"Roll Fortitude Save"` / `"Roll AC"` etc. — localized |
| Base total | Read-only display of the actor's current computed value |
| Situational modifier | Signed number input (`+2`, `-1`); defaults to `0`; live-updates the total preview |
| Total preview | `= base + situational` shown reactively as modifier is typed |
| Roll Mode | Selector: Normal / GM Only / Blind / Self — maps to `CONST.DICE_ROLL_MODES` |
| Roll button | Evaluates, sends chat card, closes dialog |

> **Open decision** (explore at implementation): Vue dialog vs. lightweight Foundry `Application`. Default assumption is Vue (consistent with sheets). If wiring `renderVueComponent()` in a modal context proves awkward, fall back to a minimal Foundry `FormApplication`.

### Chat Card

Mimics D35E's save roll window (see `migration notes/Save Roll window.png`). The key feature is the **modifier breakdown list** (the green circle panel in D35E) — every contributor shown as a labeled row, not just the final number.

**Required elements**:
- Save / stat name + actor name header
- Large die result (the raw d20 face value) — prominently displayed
- Large total — die + all modifiers
- **Breakdown list** — one labeled row per modifier source:
  - Base save/AC total (e.g. `Fortitude +4`)
  - Situational bonus if non-zero (e.g. `Situational +2`)
  - Die roll (e.g. `d20 → 14`)
- Natural 1 callout (fumble styling) / Natural 20 callout (exceptional)
- Pass / Fail indicator — shown only when a DC is provided (Phase 8 wire-up; Phase 7 leaves DC as an optional parameter that defaults to undefined / not shown)

> **Design note**: Exact layout and styling is an implementation-time decision. The modifier breakdown list is the non-negotiable requirement — it must show every contributor in the order they were added. The D35E screenshot is the visual target; we do not need to pixel-match it.

### Actor Method: `rollSave(saveKey, options)`

```typescript
// On CreatureDnd35e
async rollSave(
  saveKey: SaveKey,                  // 'fort' | 'ref' | 'will'
  options?: {
    situationalModifier?: number;    // pre-fill dialog situational field
    rollMode?: string;               // CONST.DICE_ROLL_MODES default
    dc?: number;                     // optional; shows pass/fail on card if set
    skipDialog?: boolean;            // for macro / API callers
  }
): Promise<D20Roll>
```

**Pipeline**:
1. If `!skipDialog` → render `D20RollDialog`; await user confirmation (situational mod, roll mode)
2. Assemble modifier list: `[{ label: saveName, value: saveTotal }, { label: 'Situational', value: situationalMod }]`
3. Build the roll formula by interpolating the already-known literal numbers directly, e.g. `` `1d20 + ${saveTotal} + ${situationalMod}` `` — no `@` tokens, no roll-data object needed (see §7.2's "No `@attr` Bridge"); the values are plain JS numbers at this point, not formula references
4. Create and evaluate `D20Roll` — `situationalModifiers` carries the labeled list
5. Call `rollMessages.buildSaveCard(roll, modifierList, { dc, saveKey })` → HTML
6. `ChatMessage.create({ content, roll, rollMode })`
7. Return evaluated `D20Roll`

A matching `rollAC(acVariant, options)` method follows the same pipeline with AC-appropriate labels (no pass/fail concept for Phase 7).

---

## 7.10 Conditional Values & Condition Builder (Story C)

**User**: Anyone authoring a formula (GM or player, depending on field permissions).
**Delivers**: An advanced-editor button appears on every `FormulaFormGroup` (opt out via a `hideAdvancedEditor` prop). What it opens depends on the field's `expectedType`:
- **`number` / `string` fields → Conditional Values**: turns the field into an ordered list of condition → value rules. Rules evaluate top-to-bottom; the first whose condition is true supplies the result. The field's original formula becomes the trailing default, always evaluated last if no rule matches. A preview at the bottom shows the live-evaluated result and the fully compiled formula string.
- **`boolean` fields (e.g. the AE Condition column, §7.7b) → Condition Builder, standalone**: a single structured condition row (no rule list, no value column — the field *is* the condition), same builder described below minus the per-rule wrapping.

Both modes share the same **Condition Builder** component (aspect + operator + value pickers, described below) — embedded per-rule in Conditional Values, or standalone for a boolean field.
**Depends on**: Story A (aspect type-awareness drives which operators are offered; boolean grammar is the compiled target).

### Layout — Conditional Values mode (`number`/`string` fields)

Top to bottom in the editor window:
1. **Header** — field label / context
2. **"Add Condition" button** (relabels to **"+ Add Rule"** once at least one rule exists) — inserts a new rule row
3. **Rule rows**, evaluated top-to-bottom. Each newly added rule is appended directly above the default — so the first rule you add is checked first, and each later addition is checked after all earlier ones, right before falling through to the default:
   - Each row: `[Condition builder]` → `[Value formula (FormulaFormGroup, same expectedType as the field)]` → `[✕ remove row]`
4. **Default formula** — the field's original plain `FormulaFormGroup`, now labeled as the fallback ("Otherwise…"). Always evaluated last, always present — removing all rules just leaves the plain formula field behaved exactly as it did before Conditional Values was turned on.
5. **Preview** — live-evaluated result (when a preview context is available) plus the fully compiled formula string, read-only.

### Layout — Condition Builder standalone mode (`boolean` fields)

Same editor window, drastically simpler — there's no rule list and no separate value column, since the field itself already *is* the condition:
1. **Header** — field label / context
2. A single **Condition Builder** row (see below)
3. **Preview** — live-evaluated true/false result plus the compiled boolean string, read-only

No "Add Rule" button, no default formula slot — closing the editor just writes the compiled condition string back into the field, same as it would for a plain formula.

### Condition Builder (shared row component)

Structured, dropdown-driven — no raw text required for the common case:

```
[ Aspect picker ▾ ]  [ Operator ▾ ]  [ Value: literal input | Aspect picker ▾ ]   ( + AND/OR another clause )
```

- **Aspect picker**: same autocomplete data source as every other `#`-token picker (schema walker's `AspectGroup` tree) — pick e.g. `#self.skill.concentration.ranks`.
- **Operator dropdown**: options are filtered by the picked aspect's resolved type (Story A's `FieldAspect.type`):
  - `number` → `>`, `<`, `>=`, `<=`, `==`, `!=`
  - `string` → `==`, `!=`
  - `boolean` → no operator needed; the row becomes a plain "is true" / "is false" toggle
- **Right-hand value**: a literal input (number/string, matching the aspect's type) **or** a toggle to compare against another aspect instead (e.g. `#self.hp.value < #self.hp.max`).
- **+ AND / OR**: appends another clause to the same rule's condition, joined by the selected logical operator; renders as a stacked additional `[Aspect] [Operator] [Value]` group with an "AND"/"OR" connector label.

The picker compiles to the exact same boolean-formula text from §7.2a (e.g. `#self.abilities.str.mod >= 2 && #self.bab > 0`) — it's a friendlier front-end onto that grammar, not a separate one. Consequences:
- The stored/compiled formula stays plain text; existing validation/warning/resolution code needs no changes to support it.
- **Escape hatch**: an "Edit as text" toggle per condition row falls back to a plain boolean `FormulaFormGroup` for anyone who wants a compound expression the picker can't represent (nested parens, unusual operators). A row left in text mode simply doesn't re-parse into pickers on reopen — no forced conversion.

### Compiled Syntax

Grammar: `#conditional( when(cond₁, val₁) when(cond₂, val₂) ... else(default) )` — a single inline token (like any `#context.property` reference) that resolves to whichever branch wins, with surrounding literal text/tokens untouched.

- **`when(condition, value)`** — zero or more, evaluated in left-to-right source order via the existing boolean grammar (§7.2a); first true `condition` wins and its `value` is resolved (recursively — a `value` may itself contain another `#conditional(...)`).
- **`else(value)`** — required exactly once, may appear anywhere among the clauses; supplies the result when no `when()` matches.
- **Clause separator is don't-care**: `when(...)`/`else(...)` are self-delimiting via their own balanced parens, so a comma, whitespace, or nothing at all between clauses is equivalent — the parser just scans forward for the next `when(`/`else(` keyword.
- **Backward compatible**: zero `#conditional(...)` blocks in a formula = today's plain-formula behavior, unchanged.
- **Non-selected branches are never evaluated** — avoids errors from untaken branches (e.g. a divide-by-zero in a branch that never gets picked).
- **Matching is lenient**: `#conditional`/`when`/`else` keywords are case-insensitive, optional whitespace before `(`.
- **Malformed input** (unbalanced parens, missing `else()`, bad arg count) is a validation error; resolution leaves the formula raw/unresolved rather than guessing.
- **Token/literal-text adjacency requires parens to disambiguate**: a `#context.property` token immediately followed by more literal text with no separator (e.g. `#self.sneakAttackDice` directly followed by `d6`) greedily merges into one invalid path segment, since a property path segment matches any run of letters/digits/underscores — `sneakAttackDiced6` isn't a real property, so it fails validation. This is a general, pre-existing `VARIABLE_REGEX` characteristic (not specific to `#conditional(...)`), and it's the expected/required pattern going forward: wrap the token in parens to disambiguate, e.g. `(#self.sneakAttackDice)d6`.
- **Escaping**: `\#`, `\(`, `\)`, and `\,` escape a literal `#`/`(`/`)`/`,` character (same backslash convention throughout the formula grammar). An escaped paren doesn't count toward balanced-paren depth tracking, so a branch value can contain literal/unbalanced parens (e.g. `else(\(unbalanced\))`). Escaping the paren immediately after `when`/`else` (e.g. `when\(`) also prevents that occurrence from being parsed as a clause at all, and escaping `#conditional(`'s own `#` (`\#conditional(`) prevents the whole construct from being recognized as a block. The comma escape matters when a condition's string literal itself contains a comma — e.g. `when(#self.name == "\,", 500)` — since an unescaped comma there would be mistaken for the top-level separator between the clause's own `condition`/`value` arguments.
- **Condition grammar reminders (from §7.2a)**: string literals accept single **or** double quotes interchangeably; equality is `==` (loose/truthy comparison, coerces number↔string as needed) — there is no single `=` (reserved, unused) and no `===` (not needed at this time). A condition that resolves to a non-boolean value is coerced truthy: numbers are truthy unless `0`, strings are truthy unless empty — e.g. `when(#self.name, 1)` is true whenever the name isn't an empty string.

```
#conditional(when(#self.hp.value <= 0, 0) when(#target.isFlanked, 1d6+(#self.sneakAttackDice)d6) else(2d6))
```
Reads: "2d6, unless HP ≤ 0 (then 0), unless flanked (then 1d6 + sneak attack dice)." (`(#self.sneakAttackDice)d6` wraps the token in parens per the adjacency rule above — without the parens, `d6` would merge into the token's path segment and fail validation.)

Supersedes the earlier `#if(condition, value, elseExpr)` right-nested-chain proposal — same problem (first-match-wins rule list with a mandatory default), but expressed as a flat rule list rather than nested ternaries, matching how "Conditional Values" actually presents to the user (a list of rules + a fallback, not a chain).

### Opening on an Existing Formula (Round-Trip)

Because storage is text-only, opening the editor on an existing value requires parsing it back into rule rows:

- If the formula contains a `#conditional(...)` block → parse its `when()` clauses into rule rows (in source order) and its `else()` into the default.
- If it doesn't (a plain value, a hand-typed expression, or anything not expressible in this grammar) → the whole string becomes the default value; the rule list starts empty (best-effort: never silently discard the user's existing formula).
- Each parsed rule's *condition* is additionally checked against the "simple comparison (+ AND/OR chain)" shape to decide whether it opens in structured-picker mode or falls back to "Edit as text" mode for that one row.

> **Open decision** (explore at implementation start): whether partial/best-effort parsing (recovering a rule list from loosely-formed input) is worth the complexity vs. the simpler "exact grammar or start fresh" rule above. Default: exact-grammar-only — if it doesn't parse cleanly, treat the whole existing string as the default value.

### Tests

- [ ] Adding a rule inserts a condition+value row above the default; default remains last
- [ ] Adding a second rule appends it above the default but below the first rule (first-added = evaluated first)
- [ ] Structured condition compiles to correct boolean text for `number`, `string`, and `boolean` aspect types
- [ ] AND/OR clause chaining compiles correctly and matches §7.2a's grammar
- [ ] Comparing against another aspect (not just a literal) compiles correctly
- [ ] "Edit as text" escape hatch accepts arbitrary boolean formulas and round-trips them as raw text on reopen
- [ ] Removing a rule re-flattens the chain correctly (no orphaned nesting)
- [ ] Preview shows correct live result and correct compiled string for a 3+ rule chain
- [ ] Opening the editor on an existing plain (non-conditional) formula shows it as the default, no rules
- [ ] Opening the editor on an existing compiled `#conditional(...)` block reconstructs the rule list correctly

---

## Completion Checklist

### ✅ Complete

The FormulaFamiliar core plumbing shipped ahead of this phase, landing alongside Phase 2/5/6 AE work. Confirmed in the current codebase:

- **Schema walker** (`src/helpers/formulae/schemaWalker.mts`) auto-derives `AspectGroup` trees from `defineSchema()` — opt-out model via `formulaVisible: false`, opaque leaves via `isFamiliarLeaf`
- **`FormulaField`/`FormulaData`** (`src/helpers/formulae/FormulaField.mts`, `FormulaData.mts`) — formula storage + resolution, `expectedType: 'string' | 'number'` already implemented (e.g. `spellResistance` on `CreatureSystemModel` uses `'number'`)
- **`#context.property` resolution** — `FormulaData.resolve()` / `resolveSource()` / `resolveDisplaySource()`; zero `@attr` tokens anywhere in the pipeline
- **AE change value resolution** — `resolveActiveEffectChangeValue()` (`resolveChangeValue.mts`) universally resolves every change's `value` through `FormulaData.resolveSource()` regardless of the change's declared `type` — this already validates the "No `@attr` Bridge" design in §7.2 as the shipped reality, not just a plan
- **Autocomplete + formula editor UI** — `FormulaFormGroup.vue`, `useFormulaEditor.mts`, `useFamiliarOverlayInput.mts`, `#`-token validation/highlighting, per-context aliasing
- **`condition` type placeholder** — `EffectChangeSourceDnd35e.condition` (`ActiveEffectSystemData.mts`) already typed as `string | null | ((target) => boolean)`, ready for Story B to wire up
- **Boolean Formula Type (Story A, §7.2a)** — schema walker `BooleanField → 'boolean'` branch, `FieldAspect.type`/`FormulaFieldMeta.aspectType` widened, `FormulaData`/`FormulaField` `expectedType` includes `'boolean'`, `evaluateBooleanExpression()` implemented **including arithmetic operands** (`+ - * /`, unary minus, standard precedence — see §7.2a), `FormulaData._finalizeResolvedValue()` branches on `'boolean'`. All tests passing (`tests/unit/familiar/evaluate-boolean-expression.test.mts`).
- **AE Change Conditional Gate — schema & logic (Story B, §7.7a)** — `condition` field added to `ActiveEffectSystemModel.defineSchema()`'s `changes` schema; `evaluateChangeCondition()` implemented (string-form only via `FormulaData.resolveSource()`) and wired into `ActorDnd35e.applyActiveEffects()`'s three gathering loops and `ItemDnd35e.applyActiveEffects()`. All five test cases passing (`tests/unit/effects/evaluate-change-condition.test.mts`). A function-form condition type was briefly supported for live-computed changes with no backing AE document, but was removed — conditions are persisted to the database, so a function could never round-trip through it. **UI is not done** — see §7.7b checklist below.
- **Bug fixes (§7.7b)** — removed the unused `changeTypes.familiar` placeholder (registration, constant, type augmentation, localization key); `AspectPicker.vue` now surfaces a validation error when a stored key becomes unresolvable after a Target switch instead of silently looking valid.

### ❌ Not Started

**Roll Data Structure & Interfaces** *(narrow scope — Foundry-native `@attr` consumers only, see §7.1's callout)*:
- [ ] Create `src/types/rollData.d.ts` with interfaces:
  - `ActorRollData` (abilities with mod/total/base, attributes, saves, skills, size mods)
  - `ItemRollData extends ActorRollData` (adds item-specific fields)
  - `ActionRollData extends ItemRollData` (adds action-specific fields, Phase 8 will use)
  - `TargetRollData extends ActorRollData` (target's roll data, Phase 8 will use)
- [ ] Document each field's calculation/source
- [ ] Test: Interfaces compile without errors

**Actor.getRollData() Implementation** *(minimal — only for Foundry-native mechanics like the Combat Tracker initiative formula; not a resolution path our own formulas use)*:
- [ ] Override `getRollData()` on `ActorDnd35e`
- [ ] Populate abilities: for each (str-cha), include base score, derived mod, derived total
- [ ] Populate attributes: bab, ac (normal/touch/flatFooted), saves (fort/ref/will), init
- [ ] Populate details: level, alignment
- [ ] Populate skills: each skill's total + rank count (stub for Phase 14 expansion)
- [ ] Populate size: sizeCategory and derived attackMod/grappleMod/acMod
- [ ] Test: `getRollData()` includes all expected fields
- [ ] Test: Values are correct for a test character

**Item.getRollData() Implementation** *(same narrow scope as above)*:
- [ ] Override `getRollData()` on `ItemDnd35e`
- [ ] Call parent actor's `getRollData()` to inherit all actor fields
- [ ] Add item-specific fields:
  - Weapon: enhancement, damage formula, critical range, critical multiplier
  - Equipment: armor bonus, shield bonus, ACP, spell failure
- [ ] Test: `getRollData()` includes both actor + item fields
- [ ] Test: Item fields override actor fields if names conflict (shouldn't happen, but verify logic)

**FormulaFamiliar Context Registration** *(schema walker + `#self`/`#item` already shipped — remaining work is Phase 8's placeholder contexts + user docs)*:
- [ ] Register `#action.*` contexts (placeholder, Phase 8 will populate)
- [ ] Register `#target.*` contexts (placeholder, Phase 8 will populate)
- [ ] Test: Invalid paths are rejected or warned (verify existing behavior covers Phase 8's future contexts too)

**Canonical Formula Paths Documentation:**
- [ ] Create `src/constants/formulaPaths.mts` documenting all valid `#context.property` paths
- [ ] Include examples for each:
  - Ability modifiers: `#self.abilities.str.mod`
  - Attack bonus: `#self.bab + #self.abilities.str.mod + #self.size.attackMod`
  - AC: `10 + #self.abilities.dex.mod - #item.armorCheckPenalty`
  - Save DC: `10 + #self.details.level + #self.abilities.wis.mod`
  - Boolean gate: `#self.skill.concentration.ranks > 5`
- [ ] Document context inheritance hierarchy (actor → item → action)
- [ ] Update README/docs with formula examples for users

**Boolean Formula Type (Story A, §7.2a):** — ✅ moved to Complete above.

**AE Change Conditional Gate (Story B, §7.7a):** — schema/logic/wiring ✅ moved to Complete above. Remaining:
- [ ] UI — see AE Sheet Revamp checklist below (§7.7b)

**AE Sheet Revamp (§7.7b):**
- [x] Remove `changeTypes.familiar` placeholder (registration, constant, type augmentation, localization key)
- [x] Filter `changeTypes.mask` out of the Type dropdown for `variant='default'` rows
- [x] `AspectPicker.vue`: surface a validation error for an unresolvable stored key after a Target switch
- [x] Reorder `EffectChangesList.vue` columns: Target first
- [x] Remove the rejected branch-toggle button + collapsible condition row
- [x] Derive Value column's `expected-type` from the picked aspect (`findAspectByAccessPath()`)
- [x] Add Condition column: plain `FormulaFormGroup` (`expectedType: 'boolean'`), no new compound component
- [ ] Extend formula syntax highlighting to tag comparison/logical operators (`>`, `<`, `==`, `&&`, `||`, etc.), not just `#tokens`
- [ ] Add `hideAdvancedEditor` opt-out prop to `FormulaFormGroup.vue`
- [ ] Create General AE custom sheet (`GeneralSheet.mts`/`.vue`, `GeneralStore.mts`, `sheet/tabs/index.mts`) mirroring Material's pattern
- [ ] Test: Condition column accepts and evaluates a boolean formula with operator highlighting
- [ ] Test: Value column rejects/flags a formula that doesn't match the picked aspect's type
- [ ] Test: General AE sheet renders Changes/Duration tabs with parity to Material

**Condition Builder & Conditional Values (Story C, §7.10):**
- [ ] Build shared **Condition Builder** row component (aspect/formula + operator ▾ + aspect/formula, AND/OR clause chaining, "Edit as text" escape hatch per row)
- [ ] Wire Condition Builder in **standalone mode** as the advanced-editor target for boolean-typed `FormulaFormGroup`s (Condition column included)
- [ ] Wire Condition Builder **embedded per-rule** inside Conditional Values for number/string fields
- [x] Implement `#conditional(when(cond, value) ... else(default))` parser + evaluator (new, `src/helpers/formulae/conditionalFormula.mts`) — flat rule-list shape, `else()` required exactly once, position-independent among clauses; includes `\#`/`\(`/`\)` escaping and parens-required-for-adjacency handling
- [x] Hook parser into `FormulaData.resolve()`/`resolveSource()` and into `utils.mts`'s `resolveFormula()`/`validateFormula()` so `#conditional(` isn't flagged as an unknown context and malformed blocks surface a structural `ValidationError`
- [ ] Create `ConditionalValuesEditor.vue` (or equivalent) — rule-list builder UI embedding the Condition Builder per rule
- [ ] Add "Add Condition" button to `FormulaFormGroup.vue`'s controls; relabels to "+ Add Rule" once a rule exists
- [ ] Implement live preview (result + compiled formula string) at the bottom of the editor
- [ ] Save path: serialize rule list → `#conditional(when(...) ... else(...))` block → same `onCommit` the plain text input uses
- [ ] Non-`#conditional(...)`-parseable existing values: preserve as the default value rather than discarding (see §7.10's round-trip note)
- [ ] Test: all ten cases listed under §7.10's Tests subsection

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
- [ ] **Remove `ActiveEffect._shimChanges` compat shim** (`ItemDnd35e.mts:131`): The `_shimChanges(changes)` call is explicitly marked `// todo remove in v16`. Once Story B's conditional gate and the full AE change pipeline are proven, verify whether the shim is still needed. If v16 migration transforms old AE data, remove the shim call and its TODO comment. If the shim is still required for pre-migration data, keep it but update the comment with the specific migration that will obsolete it.
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

**Vue Form Component - Formula Input** *(`FormulaFormGroup.vue` already exists and ships autocomplete + validation; remaining items are new here)*:
- [ ] Show contextual help: "Formula must start with #self, #item, #action, or #target"
- [ ] Evaluate `HeaderNameField.vue` refactor (`HeaderNameField.vue:25`): Component uses its own display mode to hide formula hints when not editing. Assess whether this should be folded into `FormulaFormGroup` as a `displayMode` prop or slot, or kept as a separate wrapper. The TODO also notes styling concerns with a read-only slot that were deferred.
- [ ] Test: Complex boolean expressions with operators work (Story A)

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

**POC Story 7.9 — Clickable Defense Stat → Roll → Chat Card:**

*`CreatureDefenseStat.vue`*
- [ ] Create `src/vue/components/actors/CreatureDefenseStat.vue`
- [ ] Props: `label: string`, `value: number`, `rollable: boolean` (default `true`)
- [ ] Edit mode: read-only display, no click handler
- [ ] Play / True mode: cursor pointer, click emits roll intent
- [ ] Wire into header stat pills: Fort | Ref | Will | AC (normal)
- [ ] Wire into Combat tab rows: all three AC variants + fort/ref/will rows
- [ ] Test: Click in edit mode does nothing
- [ ] Test: Click in play mode triggers dialog

*`D20RollDialog.vue`*
- [ ] Create `src/vue/components/dialogs/D20RollDialog.vue`
- [ ] Props: `title: string`, `baseTotal: number`, `defaultRollMode: string`
- [ ] Signed situational modifier input, defaults to `0`
- [ ] Live total preview (`baseTotal + situationalMod`)
- [ ] Roll Mode selector bound to `CONST.DICE_ROLL_MODES` options
- [ ] Roll button: resolves promise with `{ situationalMod, rollMode }`; closes dialog
- [ ] Cancel button / ESC: resolves with `null` (roll cancelled)
- [ ] Test: Total preview updates reactively
- [ ] Test: Submitting with no situational mod passes 0
- [ ] Test: Cancel resolves null

*`rollMessages.mts` + chat card*
- [ ] Create `src/helpers/rollMessages.mts`
- [ ] `buildSaveCard(roll: D20Roll, modifierList: RollModifier[], opts: { dc?, saveKey })` → HTML string
- [ ] `buildACCard(roll: D20Roll, modifierList: RollModifier[], opts: { acVariant })` → HTML string
- [ ] Create `src/vue/components/chat/SaveRollChatCard.vue` (rendered into card HTML)
- [ ] Card shows: stat name + actor name header, large die face value, large total
- [ ] Breakdown list: one row per `RollModifier` entry (label + signed value) + die row
- [ ] Natural 1 / Natural 20 callout (distinct CSS class for styling)
- [ ] Pass / Fail indicator: only rendered when `dc` is provided
- [ ] Test: Card renders breakdown list with correct labels and values
- [ ] Test: Natural 1 has fumble CSS class
- [ ] Test: Natural 20 has exceptional CSS class
- [ ] Test: Pass/Fail absent when no DC; correct when DC provided

*`CreatureDnd35e` actor methods*
- [ ] Add `async rollSave(saveKey: SaveKey, options?)` to `CreatureDnd35e`
- [ ] Add `async rollAC(acVariant: 'normal'|'touch'|'flatFooted', options?)` to `CreatureDnd35e`
- [ ] Both methods follow the dialog → D20Roll → ChatMessage pipeline (§7.9)
- [ ] `skipDialog` option bypasses dialog (for macro callers)
- [ ] Test: `rollSave('fort')` creates a chat message with Fort save breakdown
- [ ] Test: Situational modifier from dialog appears in card breakdown
- [ ] Test: `skipDialog: true` skips dialog and uses provided options directly
- [ ] Test: `rollSave` with `dc: 15` shows Pass on roll ≥ 15, Fail below

*E2E acceptance*: Open character sheet in play mode → click Fort save pill → dialog opens with correct base total → enter `+2` situational modifier → click Roll → chat card appears with: `Fortitude +X`, `Situational +2`, `d20 → N`, bold total. Click AC pill → same pipeline, AC-labeled card, no Pass/Fail shown.
