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
- **Story C rescoped: basic multiline editor + engine consolidation, advanced Condition Builder deferred.** Story C originally planned a full structured Condition Builder / Conditional Values rule-list UI. That's now split in two: (1) consolidate the FormulaFamiliar resolution engine (parsing, `#context.property` substitution, boolean grammar, `$conditional(when()else())`, type validation — currently spread across `utils.mts`, `evaluateBooleanExpression.mts`, `conditionalFormula.mts`) into a single `FormulaResolver` class; (2) every `FormulaFormGroup` gets a button (opt-out via `hideAdvancedEditor` prop) that opens a small modal with a multiline rich-text editor — same `#context.property` rules, highlighting, and validation as the inline field, just with line breaks allowed (line breaks are collapsed/hidden when the formula is displayed back in the single-line field). The structured aspect/operator/value pickers, AND/OR clause builder, and ordered Conditional-Values rule list are deferred to the wishlist (`docs/migration-plan/post-release/WISHLIST.md`) — the `$conditional(when()else())` grammar they'd target already ships today (§7.2a), so the wishlist item is purely front-end sugar on top of existing infra. See §7.10.
- **Boolean grammar supports arithmetic operands.** Comparison operands in a boolean-typed formula may themselves be arithmetic sub-expressions, e.g. `#actor.hp.current > (#actor.hp.max / 2)`. Required because a `condition` string resolves as one fully-substituted expression handed whole to `evaluateBooleanExpression()` — there is no separate per-operand resolution step, so `+ - * /` (with standard precedence and unary minus) must be part of the same grammar as the comparison/logical operators. **Implemented** — see §7.2a.
- **AE Sheet Revamp (Story B, redesigned).** Story B's first UI pass (a collapsed toggle row per change) was built, reviewed, and **rejected** — it buried the condition behind an icon and conflated the simple boolean gate with Story C's conditional-value editor. Story B is now scoped as part of a broader Changes-tab redesign, using the AE sheet (General + Material) as the flagship use case for FormulaFamiliar across the system. See §7.7b.
- **Array operators (Story A follow-up).** `ArrayField`s currently have no real `FieldAspect.type` — they fall through the schema walker's default branch, get mis-tagged `'string'`, and silently resolve via `Array.prototype.toString()` comma-joining. This adds a proper `'array'` `FieldAspect.type` plus a small `$contains`/`$find`/`$any`/`$count`/`$stringContains` function set (same `$`-prefixed pre-processing tier as `$conditional`, one shared `FormulaResolver.functionGrammar.mts` module) for querying arrays and searching strings. See §7.2b. **Item-collection contexts** (`#self.items` and per-type-aware `#it` resolution for querying an actor's/container's inventory) are a related but larger follow-up, deliberately split out to §7.2c so they don't block §7.2b's simpler schema-array case.

## Stories (this decomposition)

| Story | Delivers | Depends on |
|---|---|---|
| **A** | Boolean-typed formulas: schema support, resolution, comparison/logical operators, validation | Existing FormulaFamiliar infra (already built — see note below) |
| **B** | GM can gate an individual AE change on a boolean formula — change is skipped entirely when false | Story A |
| **C** | (Rescoped) FormulaFamiliar resolution engine consolidated into one `FormulaResolver` class; every `FormulaFormGroup` gets a basic multiline rich-text modal editor (line breaks allowed, same rules/validation as the inline field). Structured Condition Builder / Conditional Values rule-list UI deferred to `WISHLIST.md` | Story A (boolean grammar); no dependency on the deferred rule-list UI |
| **D** | (Existing POC story, §7.9) Clickable defense stat → roll dialog → chat card. Also owns §7.7 Group Change Targets (registry mechanism only — filed here for bookkeeping, not a design dependency) | §7.1/7.2 (rewritten, no `@` bridge) |

Stories A→B and A→C are the only hard dependencies; B and C can proceed in parallel once A lands. Story D is unchanged in scope but its roll-building step no longer uses `@` tokens (see §7.2). §7.7 (Group Change Targets) is filed under Story D as of this pass — it has no functional relationship to the roll dialog work, it's just the catch-all bucket for phase-7 scope not covered by A/B/C.

> **Status note**: Much of the FormulaFamiliar plumbing this phase originally scoped as net-new (schema walker, `FormulaField`/`FormulaData`, per-context autocomplete, universal `#`-token resolution for AE change values regardless of declared `type`) **already shipped** ahead of this phase, landing alongside Phase 2/5/6 AE work. The Completion Checklist at the bottom of this doc has been updated to reflect what's actually done vs. still pending. `DamageRoll` is deferred to Phase 10 (Basic Combat), which already scopes it (`applyCritical()`, crit/damage-type handling wired into `takeDamage()`) — not a gap in this phase. D20Roll and the roll-dialog/chat-card pipeline (Story D/§7.9) shipped partially this pass; remaining test coverage and `CreatureDefenseStat.vue` click-wiring are still open.

---

## 7.1 Roll Data Assembly

**Cut.** Originally scoped to define a minimal `getRollData()` shape purely for Foundry-native `@attr` consumers (Combat Tracker initiative formula, raw chat `/roll` commands) — decided against. This system does not bridge to `@attr` syntax at all; `getRollData()` stays at its Foundry default (unused) on `ActorDnd35e`/`ItemDnd35e`. Deferred to the wishlist (`docs/migration-plan/post-release/WISHLIST.md`) — chat-command support (`/roll`, `/r`) needs `getRollData()` populated to work at all, so it's tracked there instead of here.

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

Supported operators: `>`, `<`, `>=`, `<=`, `==`, `!=`, `&&`, `||`, `!`, `+`, `-`, `*`, `/` (standard arithmetic precedence, unary minus), parentheses for grouping. This is a small, purpose-built evaluator (`FormulaResolver.evaluateBooleanExpression()`, `src/helpers/formulae/FormulaResolver.mts` — consolidated there per §7.10) — not a general JS `eval`, and distinct from `Roll.safeEval`. Grammar:

```
orExpr         := andExpr ( '||' andExpr )*
andExpr        := comparison ( '&&' comparison )*
comparison     := additive ( ('>' | '<' | '>=' | '<=' | '==' | '!=') additive )?
additive       := multiplicative ( ('+' | '-') multiplicative )*
multiplicative := unary ( ('*' | '/') unary )*
unary          := ('!' | '-' | '+') unary | primary
primary        := '(' orExpr ')' | NUMBER | STRING | 'true' | 'false' | IDENT
```

`!` binds like JS's unary `!` — tighter than comparison, not looser. `!#self.broken > 0` reads as `(!#self.broken) > 0`, not `!(#self.broken > 0)`; wrap the comparison in parens (`!(#self.hp.value > 0)`) to negate the whole thing.

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

## 7.2b Array & String Operators (Story A follow-up)

`ArrayField`s (`languages`, `damageReductionTypes`, `senses`, `attacks`, AE `changes`, etc.) currently fall through `schemaWalker.inferFieldType()`'s default branch and get mis-tagged `'string'` — at resolution time `String(rawArray)` silently comma-joins the elements (`Array.prototype.toString()`), which happens to look plausible but has no real containment/count/lookup semantics. This section gives arrays a real `FieldAspect.type` and a small set of `$`-prefixed functions (same sigil convention as `$conditional`) for querying them, plus a matching string-search function for plain-text fields.

### Function Set

| Function | Operand shape | Signature | Returns |
|---|---|---|---|
| `$contains` | primitive array (`ArrayField(StringField\|NumberField)`) | `$contains(#context.path, value)` | `boolean` — exact membership (case-sensitive, same semantics as `==`) |
| `$contains` | object array (`ArrayField(SchemaField)`) | `$contains(#context.path, #it.field == value ...)` | `boolean` — true if any element matches the predicate |
| `$find` | object array | `$find(#context.path, #it.field == value ...).resultField` | scalar — the matched element's `resultField`; `""` if no match |
| `$any` | array (either) | `$any(#context.path)` | `boolean` — array has ≥1 element |
| `$any` | object array | `$any(#context.path, #it.field == value ...)` | `boolean` — true if any element matches the predicate (alias for `$contains`'s predicate mode) |
| `$count` | array (either) | `$count(#context.path)` | `number` — array length |
| `$count` | object array | `$count(#context.path, #it.field == value ...)` | `number` — count of elements matching the predicate |
| `$stringContains` | string | `$stringContains(#context.path, "substring")` | `boolean` — case-sensitive substring match |

```
$contains(#self.languages, "Elvish")
$contains(#self.senses, #it.type == "darkvision")
$find(#self.senses, #it.type == "darkvision").distance > 0
$any(#self.attacks)
$count(#self.damageReductionTypes)
$count(#self.senses, #it.range > 30)
$stringContains(#self.name, "zodiac")
```

- **`#it`** is a bound per-element variable, valid only inside a `$contains`/`$find` predicate — resolved against each array element in turn using the same schema/type info as the array's own `SchemaField` definition. It does not exist anywhere else in the grammar.
- **Dispatch**: `$contains`/`$any`/`$count`'s 2nd argument (when present) is primitive-membership mode if it contains no `#it` reference, predicate mode if it does — no separate function name needed for the two array shapes. `$any`/`$count` also accept a bare 1-argument form (no predicate) for the plain non-empty-check/length case.
- **`$find` requires a trailing `.resultField`** immediately after its closing paren (`$find(...).range`, not bare `$find(...)`) — a "found object" is never itself a usable formula value, only its projected field is.
- **Predicates support the full boolean grammar** (`&&`, `||`, `!`, nested comparisons) — reuses `evaluateBooleanExpression()` unchanged.
- **No match / empty array** → resolves to `""` (consistent with how other unresolvable tokens behave).
- **`$stringContains` is case-sensitive** — same exact-match convention as `==`/`$contains`, no separate case-insensitive variant in this pass. Its 2nd argument is a plain string literal (or a resolved `#context.property` token) — no `#it` involved, it's a two-arg function like `$any`/`$count`, not a predicate form.
- These are all pre-processing blocks, same tier as `$conditional(...)` — resolved to a literal *before* the generic `#context.property` substitution pass runs, so they compose with `$conditional(...)` for free (e.g. a `$contains(...)` or `$stringContains(...)` can appear inside a `when()`/`else()` clause and vice versa).

### Schema Walker & `FieldAspect` Changes

- `FieldAspect.type` widens to `'string' | 'number' | 'boolean' | 'array'`.
- New `FieldAspect.arrayElement` metadata, present only when `type === 'array'`:
  - Primitive array: `{ kind: 'primitive', type: 'string' | 'number' }`
  - Object array: `{ kind: 'object', elementFields: <raw inner SchemaField.fields> }` — cached so predicate evaluation can re-walk the same fields per array element (reusing `walkFields`'s existing type-coercion/alias logic) without re-deriving them from the live DataModel at resolve time.
- `schemaWalker.mts`'s `walkFields` gains an `ArrayField` branch (currently falls through to the default leaf branch and is mis-tagged `'string'` — see intro above).

### New Grammar Module

- `FormulaResolver.functionGrammar.mts` (mirrors `FormulaResolver.conditionalGrammar.mts`'s block-scanning structure) — one shared module resolving `$contains`/`$find`/`$any`/`$count`/`$stringContains` blocks, since they're all the same `$name(args)` pre-processing tier regardless of whether the underlying operand is an array or a string.
- `findMatchingParen`/`splitTopLevelArgs` extracted out of `conditionalGrammar.mts` into a shared helper module so all grammars use one copy.
- Wired into `FormulaResolver.resolveFormula()` as a pre-pass alongside `$conditional` resolution (before the generic `#context.property` substitution loop).

### Autocomplete (`#it.*` inside predicates)

While the caret is inside an open `$contains(`/`$find(` call, past its array-reference argument, the autocomplete dropdown temporarily offers `it` as a selectable context scoped to that specific array field's element schema (`arrayElement.elementFields`) — everywhere else, `it` is not a valid context. This needs its own caret/bracket-depth detection in `useFamiliar.mts`/`useFamiliarOverlayInput.mts` and is the least-precedented piece of this section; expect it to take its own design pass once the resolution engine below is solid. `$stringContains` has no predicate argument, so it needs no `#it` autocomplete support.

### Tests

- [x] `$contains` primitive-array membership: true/false cases, case-sensitivity
- [x] `$contains` object-array predicate: true/false cases, compound `&&`/`||` predicates
- [x] `$find` object-array predicate + trailing `.field` projection: match and no-match (`""`) cases
- [x] `$any`/`$count` on both primitive and object arrays, including empty arrays, and with/without a `#it` predicate
- [x] `$stringContains` true/false cases, case-sensitivity
- [x] `$contains`/`$find`/`$stringContains` nested inside a `$conditional(when()else())` block resolve correctly
- [x] Schema walker: `ArrayField(StringField|NumberField)` → `FieldAspect.type === 'array'`, `arrayElement.kind === 'primitive'`
- [x] Schema walker: `ArrayField(SchemaField)` → `FieldAspect.type === 'array'`, `arrayElement.kind === 'object'` with correct `elementFields`
- [x] Autocomplete: `#it.*` suggestions appear only while the caret is inside a `$contains`/`$find`/`$any`/`$count` call, scoped to that array's element schema (`itContext.mts`'s `resolveItAutocompleteContext`, tested in `tests/unit/familiar/function-grammar.test.mts`)

## 7.2c Item Collection Contexts (future follow-up — depends on §7.2b)

**Status**: ✅ Implemented (full scope). Builds directly on §7.2b's `$contains`/`$find`/`$any`/`$count` function grammar.

### Implementation Notes

- **New `ArrayElementInfo` variant**: `{ kind: 'heterogeneous', documentType: foundry.CONST.DocumentType, filterTypes?: string[] }` (`src/helpers/formulae/types.mts`) — sibling to the existing `'primitive'`/`'object'` variants. `filterTypes` narrows a sub-collection (e.g. `weapons`) to a subset of registered subtypes.
- **`withItemCollectionAspects(group, context?)`** (`src/helpers/formulae/itemCollectionFamiliar.mts`) injects `items`/`weapons`/`equipment` `FieldAspect`s (`type: 'array'`, `accessPath: 'items'`, `arrayElement.kind: 'heterogeneous'`) onto any document-level group. `weapons` filters to `[weaponItemType]`, `equipment` filters to `EQUIPPABLE_ITEM_TYPES` (newly exported from `itemTypes.mts`). Computes a live `.value` count from the passed document context when available. Wired into `registerFamiliarSchema('Actor', ...)` (all actor subtypes) and `registerFamiliarSchema('Item', containerItemType, ...)` in `src/documents/actors/registration.mts` / `src/documents/items/registration.mts`.
- **Per-element type-aware predicate resolution**: `FormulaResolver.functionGrammar.mts`'s `evaluatePredicateForHeterogeneousElement()` resolves each array element's own `#it.*` schema via `getFamiliarBuilder(documentType, element.type)(element)` rather than one shared `elementFields` shape — a predicate referencing a field the element's type lacks fails variable substitution and is treated as non-matching, never throws (verified in tests).
- **`familiarBuilderRegistry.mts` extraction**: the `documentType → subtype → builder` Map and its accessors (`registerFamiliarSchema`, `hasFamiliarSchema`, `getFamiliarBuilder`, new `getRegisteredSubtypes(documentType)`) were extracted from `registry.mts` into a dependency-free leaf module so `functionGrammar.mts` can call `getFamiliarBuilder()` directly without a `registry.mts → FormulaResolver.mjs → functionGrammar.mts → registry.mts` runtime cycle. `registry.mts` re-exports everything for backward compatibility.
- **`EmbeddedCollection` support**: Foundry's `actor.items`/`item.items` are Map-based `EmbeddedCollection`s, not real arrays — `resolveFunctionBlock()`'s array-retrieval step now accepts any iterable (`Symbol.iterator`) and materializes it via spread, in addition to `Array.isArray()`.
- **Autocomplete union with provenance (`ownerTypes`)**: `buildMergedFamiliarContext(documentType, subtypes)` (`registry.mts`) tags each merged leaf field with `ownerTypes: string[]` listing which subtype(s) it came from, then strips `ownerTypes` from fields universal to every merged subtype (so only subtype-specific fields are flagged). `itContext.mts`'s `buildItFamiliarContext()` calls this for `arrayElement.kind === 'heterogeneous'`, using `filterTypes` when present or `getRegisteredSubtypes(documentType)` otherwise, to build the `#it` autocomplete context for `$find(#self.items, #it. ...)`.
- **Provenance badge UI**: `FamiliarDropdown.vue` renders a small badge (`.option-owner-badge`) next to any autocomplete option carrying `ownerTypes`, showing which item subtype(s) the field applies to.
- **i18n**: `dnd35e.Formula.ItemCollections.items`/`.weapons`/`.equipment` added to `src/lang/en/common.json` (labels for the three built-in collections; `itemCollectionFamiliar.mts`'s `localize()` helper falls back to hardcoded English if a key is ever missing).
- **Tests**: `tests/unit/familiar/item-collection-contexts.test.mts` (8 tests) covers `withItemCollectionAspects` shape/live-count, `$count`/`$any` over a heterogeneous fixture collection, the "field doesn't exist on this subtype → non-matching, not throwing" case, and `buildMergedFamiliarContext`'s `ownerTypes` tagging (unique-to-one-subtype vs. universal fields, and the empty/no-registered-subtypes case).

**Goal**: `#self.items` (and, symmetrically, a container item's own `#self.items` for its contents) exposes a document's embedded Item collection as a queryable array:

```
$count(#self.items, $stringContains(#it.name, "zodiac"))
$find(#self.items, #it.type == "weapon" && #it.system.enhancement > 1).name
```

- **Per-element type-aware resolution.** Unlike a uniform `ArrayField(SchemaField)` array (`senses`, `attacks`), `#self.items` is heterogeneous — each element's real fields depend on its own `type` (weapon vs. spell vs. feat, etc.). At runtime, `#it.*` for a given element must resolve against **that element's own registered builder** (`getFamiliarBuilder('Item', item.type)(item)`), not one shared `elementFields` shape. A predicate referencing a field the element's type doesn't have resolves as unresolvable for that element → treated as non-matching, never throws.
- **Autocomplete union.** While typing inside a `$find(#self.items, #it. ...)` predicate, the dropdown should offer the *union* of every registered Item subtype's schema — reuse the existing `buildMergedFamiliarContext('Item', allRegisteredItemTypes)` (`registry.mts`), the same mechanism `AspectPicker` already uses for cross-subtype union display (orphaned effects / compendium entries with no live parent). Not every offered field will exist on every element at runtime — expected, mirrors how `AspectPicker` already behaves.
- **Filtered sub-collections (later extension).** `#self.weapons`, `#self.equipment`, etc. — same iteration/predicate mechanism, pre-filtered to a subset of item types or a whole composition tier (e.g. "equippable" — the amalgamated context across all `EquippableItem`-derived subtypes). `buildMergedFamiliarContext` already generalizes to tier-level merges for this case.
- **Containers included for free.** A container item's own `#self.items` refers to its contents — same document shape (`.items` `EmbeddedCollection`), same mechanism, no separate design needed.

## 7.2d Unit Conversion Functions (`$fromFeet`/`$fromMeters`/`$fromKg`)

**Status**: ✅ Implemented. Not tied to a Story — an ad hoc addition alongside a system-wide change to the canonical distance storage unit.

**Architecture change**: canonical storage for every distance-bearing field (`speed.*`, `senses[].distance`, `attacks[].rangeIncrement`, weapon `rangeIncrement`) is now **squares** (1 square = 5 ft = 1.5 m, the SRD's own grid unit), not feet. `settingsStore.mts`'s `convertToLocalizedDistance`/`convertToStoredDistance` translate squares to the world's configured unit (ft or m) for display — there is no "stored value is feet" assumption anywhere in the schema layer anymore. This is a pre-release/POC-stage schema change; no data migration was needed.

`$fromFeet(n)`/`$fromMeters(n)` let a value formula (e.g. an AE change's `value`, or a compendium author's homebrew formula) be written in real-world units and resolve to the stored square count:

```
$fromFeet(60)    → '12'   (60 ft / 5 = 12 squares)
$fromMeters(9)   → '6'    (9 m / 1.5 = 6 squares)
$fromMeters(2)   → '1.33' (non-exact conversions round to 2 decimal places)
```

`$fromKg(n)` is the weight equivalent: canonical storage for weight-bearing fields is pounds (`settingsStore.mts`'s `convertToLocalizedWeight`/`convertToStoredWeight` translate lbs to kg for metric display, factor 1 kg = 2 lbs). It lets a value formula be authored in kilograms and resolve to the stored pound value:

```
$fromKg(10)  → '20'   (10 kg * 2 = 20 lbs)
$fromKg(2.5) → '5'    (2.5 kg * 2 = 5 lbs)
```

- Same `$name(...)` pre-processing tier as `$contains`/`$find`/`$any`/`$count`/`$stringContains` (§7.2b) — lives in the same `FormulaResolver.functionGrammar.mts` module, reusing its `resolveOperand()` helper (single scalar argument, quoted-literal-or-sub-formula resolution).
- A non-numeric operand resolves to `'0'` rather than throwing, matching the rest of the module's fallback convention.
- `$fromKg`/`$fromFeet`/`$fromMeters` all round to 2 decimal places, matching display precision for weight and distance.
- Foundry's own scene grid (`grid.distance`/`grid.units`, `src/documents/scene/registration.mts`) is unaffected — that's a Foundry API contract denominated directly in ft/m, orthogonal to system schema storage.

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
| `#self.saves.fort` | Fort save total |
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

## 7.7 Group Change Targets (Story D)

**Status**: ✅ Implemented (POC scope — `group:allSaves` only).

### Implementation Notes

The design below was implemented essentially as sketched, with these concrete details:

- Registry lives in `src/helpers/formulae/changeTargetGroups.mts`: `changeTargetGroups` Map, `registerChangeTargetGroup()`, `resolveChangeTargets()`, plus two helpers not in the original sketch:
  - `expandChangeTargetGroups(changes, actor)` — flat-maps an array of resolved changes, cloning each change once per expanded field path. Extracted as its own exported function (rather than inlined in the apply loop) so it's testable without importing `ActorDnd35e` as a live module (see below).
  - `withChangeTargetGroups(context)` — appends registered groups as synthetic `isGroup: true` leaf entries onto a `FamiliarContext.properties`, without mutating the input context.
- **Apply-loop wiring is actor-only**: `ActorDnd35e.applyActiveEffects()` calls `expandChangeTargetGroups(changes, this)` right before `applyStackedActiveEffectChanges()`. `ItemDnd35e.applyActiveEffects()` was NOT wired up — `ChangeTargetGroup.expand(actor)` takes an actor, and no groups currently target item-only fields. If a future group needs to target items, `expand()`'s signature and the item apply loop will both need revisiting.
- **Formula Familiar wiring is key-picker-only, actor-target-only**: `EffectChangesList.vue`'s `getKeyPickerContext(target)` calls `withChangeTargetGroups()` only when `target === EFFECT_CHANGE_TARGET.ACTOR`; the Value/Condition column contexts (`getContextsForTarget()`) are untouched, so groups never leak into formula value/condition autocomplete — matching the "natural boundary" described above.
- **Visual hint**: `FamiliarDropdown.vue` renders a small `fa-layer-group` icon plus an italicized label for any `AutocompleteOption` with `isGroup: true` (propagated from `FieldAspect.isGroup` via `getAutocompleteOptions()`).
- **Colon-in-key parsing caveat**: `group:allSaves`'s colon is illegal in `VARIABLE_REGEX`'s path-segment character class, so `AspectPicker.vue`'s `rawToFamiliar()` special-cases registered group keys with a direct registry lookup + `game.i18n.localize()`, bypassing `findAspectByAccessPath`/`localizeFormula`'s regex-tokenizing path entirely for that one branch. The reverse direction (`familiarToRaw()` / dropdown selection via `option.accessPath`) needed no changes — the colon only ever appears in output strings there, never re-tokenized.
- **Tests**: `tests/unit/familiar/change-target-groups.test.mts` (registry + `withChangeTargetGroups` unit tests), `tests/unit/effects/actor-apply-change-groups.test.mts` (`expandChangeTargetGroups` unit tests + integration with `applyStackedActiveEffectChanges` proving each expanded field stacks independently by bonus type), `tests/unit/components/AspectPicker.test.mts` (group-key display round-trip, no false "property not found" error).
- Only `group:allSaves` is registered so far (POC scope, per the recommendation below) — skills groups (`group:allSkills`, `group:dexSkills`, etc.) are deferred to Phase 9 when the skills data model lands, as originally planned.

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

Group targets only appear in the AE change key picker (where expansion makes sense). They do not appear in formula value contexts (where a single numeric value is needed, e.g., `#self.saves.fort` in a formula string). This is a natural boundary: the FF already separates "what can be targeted by an AE change" from "what can be referenced in a formula."

### Expected Groups

Registered by later phases as their data models land:

| Registering Phase | Group Key | Label | Expands To |
|-------------------|-----------|-------|------------|
| Phase 9 | `group:allSaves` | "All Saving Throws" | `system.saves.fort`, `.reflex`, `.will` |
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
- [x] Condition on a `group:`-targeted change (§7.7) gates the whole expanded group — `condition` is evaluated in `ActorDnd35e.applyActiveEffects()` at change-collection time, before `expandChangeTargetGroups()` runs; a `false` condition drops the change before it ever reaches expansion, so the entire group is skipped as one unit

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
- `custom` (`CONST.ACTIVE_EFFECT_CHANGE_TYPES.CUSTOM`) removed entirely from the system's own `EFFECT_CHANGE_TYPE` constant (`constants.mts`) — Foundry core still enumerates it via `ActiveEffect.CHANGE_TYPES`, so the Type dropdown filters it out by its literal `'custom'` key, same pattern as the `mask` exclusion.
- Bonus Type dropdown: removed the redundant separate "Untyped" option — the empty/`null` selection already **is** untyped (`stacking.mts` normalizes `undefined`/`null` → `BONUS_TYPE_UNTYPED` at grouping time), so the two options were functionally identical. The empty option is now labeled "Untyped" directly; `BONUS_TYPE_UNTYPED` is filtered out of the separately-listed `bonusTypeOptions`.
- `EffectsListSection`/`EffectChangeRow`: `group:allSaves` (and other Group Change Target keys) now resolve to their registered label ("All Saves") instead of a raw/humanized key string, via a new `getChangeTargetGroupLabel()` export on `changeTargetGroups.mts`.
- `EFFECT_TYPES.general` localization key fixed from the invalid `'Document.ActiveEffect'` to Foundry core's actual `'DOCUMENT.ActiveEffect'` — was displaying the raw untranslated key ("Document.ActiveEffect") instead of "Active Effect" in category labels.
- `stacking.mts`'s rejection-reason messages (`LowerBonus`/`LessSeverePenalty`/`ZeroValue`) were silently crashing real gameplay (`Cannot read properties of undefined (reading 'translations')`) because `game.i18n.localize`/`format` were referenced as detached function values (losing their `this` binding) instead of called as methods — fixed to call through `game.i18n.` directly.

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
| Create | `src/helpers/formulae/FormulaResolver.mts` — consolidated resolution engine (tokenizing, substitution, boolean grammar, `$conditional(...)`, type validation) — Story C, §7.10 |
| Delete | `src/helpers/formulae/evaluateBooleanExpression.mts`, `src/helpers/formulae/conditionalFormula.mts` — content absorbed into `FormulaResolver.mts` (Story C, §7.10) |
| Create | Basic multiline formula editor modal (opt out via `hideAdvancedEditor`) — Story C, §7.10. `ConditionBuilder.vue`/`ConditionalValuesEditor.vue` deferred — see `docs/migration-plan/post-release/WISHLIST.md` |
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

## 7.10 Basic Formula Editor & Engine Consolidation (Story C)

**User**: Anyone authoring a formula (GM or player, depending on field permissions).

Story C is now split into two independent halves.

### Half 1 — Consolidate the resolution engine into `FormulaResolver`

Everything involved in parsing/resolving/validating a `#context.property` formula — tokenizing (`parseFormula`), variable substitution (`resolveFormula`), the boolean comparison/logical grammar (formerly `evaluateBooleanExpression.mts`), the `$conditional(when()else())` parser/evaluator (formerly `conditionalFormula.mts`), and type validation (`validateFormula`/`validateFormulaType`) — consolidate into a single `FormulaResolver` class (`src/helpers/formulae/FormulaResolver.mts`). `FormulaData` delegates to it instead of importing loose functions from three separate files.

Editor-only concerns stay separate and unmoved: `schemaWalker.mts` (schema → `AspectGroup` derivation), `registry.mts` (context/document assembly), and `utils.mts`'s HTML-highlighting/autocomplete/localization-display functions (`renderFormulaHTML`, `getAutocompleteOptions`, `localizeFormula`/`canonicalizeFormula`, etc.) — those serve the live-typing editor UI, not resolution, and folding them in would mix data-resolution concerns with HTML-rendering concerns in one file.

#### Compiled Syntax Reference (already implemented)

`$conditional(when(cond₁, val₁) when(cond₂, val₂) ... else(default))` — a single inline token (like any `#context.property` reference) that resolves to whichever branch wins, with surrounding literal text/tokens untouched. Implemented and tested today in `FormulaResolver` (formerly `conditionalFormula.mts`); kept here for reference since Half 2's wishlist follow-up (structured Condition Builder) will target this same grammar.

- **`when(condition, value)`** — zero or more, evaluated in left-to-right source order via the boolean grammar (§7.2a); first true `condition` wins and its `value` is resolved (recursively — a `value` may itself contain another `$conditional(...)`).
- **`else(value)`** — required exactly once, may appear anywhere among the clauses; supplies the result when no `when()` matches.
- **Clause separator is don't-care**: `when(...)`/`else(...)` are self-delimiting via their own balanced parens, so a comma, whitespace, or nothing at all between clauses is equivalent — the parser just scans forward for the next `when(`/`else(` keyword.
- **Backward compatible**: zero `$conditional(...)` blocks in a formula = plain-formula behavior, unchanged.
- **Non-selected branches are never evaluated** — avoids errors from untaken branches (e.g. a divide-by-zero in a branch that never gets picked).
- **Matching is lenient**: `$conditional`/`when`/`else` keywords are case-insensitive, optional whitespace before `(`.
- **Malformed input** (unbalanced parens, missing `else()`, bad arg count) is a validation error; resolution leaves the formula raw/unresolved rather than guessing.
- **Token/literal-text adjacency requires parens to disambiguate**: a `#context.property` token immediately followed by more literal text with no separator (e.g. `#self.sneakAttackDice` directly followed by `d6`) greedily merges into one invalid path segment — wrap the token in parens to disambiguate, e.g. `(#self.sneakAttackDice)d6`.
- **Escaping**: `\#`, `\(`, `\)`, and `\,` escape a literal `#`/`(`/`)`/`,` character. An escaped paren doesn't count toward balanced-paren depth tracking, so a branch value can contain literal/unbalanced parens (e.g. `else(\(unbalanced\))`).
- **Condition grammar reminders (from §7.2a)**: string literals accept single **or** double quotes interchangeably; equality is `==` (loose/truthy comparison) — no single `=`, no `===`. A condition resolving to a non-boolean value is coerced truthy (numbers truthy unless `0`, strings truthy unless empty). `$and`/`$or` are case-insensitive keyword aliases for `&&`/`||`, fully interchangeable with the symbol form.

```
$conditional(when(#self.hp.value <= 0, 0) when(#target.isFlanked, 1d6+(#self.sneakAttackDice)d6) else(2d6))
```
Reads: "2d6, unless HP ≤ 0 (then 0), unless flanked (then 1d6 + sneak attack dice)."

### Half 2 — Basic multiline formula editor

**Delivers**: An editor button appears on every `FormulaFormGroup` (opt out via a `hideAdvancedEditor` prop). Clicking it opens a small modal containing a multiline rich-text editor for the same formula — identical `#context.property` rules, autocomplete, validation, and highlighting as the inline single-line field, but line breaks are allowed. Line breaks are collapsed/hidden when the value is displayed back in the normal single-line `FormulaFormGroup` field (a display-only transform — the stored formula keeps its real newlines).

No variable/logic insertion helpers (aspect-picker buttons, operator buttons, snippet insertion) ship in this pass — the modal is a plain rich-text box using the exact same editing rules as today's inline field, just bigger and multiline.

**Deferred to wishlist** (`docs/migration-plan/post-release/WISHLIST.md`): the structured Condition Builder (aspect + operator + value pickers, AND/OR clause chaining, "Edit as text" escape hatch) and the Conditional Values ordered rule-list editor (add/remove rule rows, live preview, round-trip parsing of an existing `$conditional(...)` block back into rule rows). The `$conditional(when()else())` grammar those would target is already fully implemented and tested (§7.2a) — the wishlist item is purely a friendlier front-end onto that existing grammar, not new resolution logic.

### Tests

- [x] `FormulaResolver` consolidation: existing test suites for the boolean grammar, `$conditional(...)` parsing/resolution, `resolveFormula`, and `validateFormula`/`validateFormulaType` all pass unchanged (import path updated to `FormulaResolver.mjs`, behavior identical)
- [x] Basic multiline modal: opening the editor shows the current formula with real line breaks (`tests/unit/familiar/formula-multiline-modal.test.mts`, mounts the real `FormulaMultilineModal.vue`)
- [x] Basic multiline modal: typing/pasting a newline is preserved in the stored formula (`tests/unit/familiar/use-formula-editor-multiline.test.mts`)
- [x] Inline `FormulaFormGroup` display collapses/hides line breaks from a formula that contains them, including collapsing indentation/extra whitespace left by an indented multiline formula (`collapseFormulaLineBreaks`, same test file)
- [x] Basic multiline modal: `#context.property` highlighting/validation/autocomplete behave identically to the inline field (`tests/unit/familiar/formula-multiline-modal.test.mts`)
- [x] `hideAdvancedEditor` prop suppresses the editor button (`tests/unit/familiar/formula-form-group-advanced-editor.test.mts`)

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
- **Bug fixes (§7.7b)** — removed the unused `changeTypes.familiar` placeholder (registration, constant, type augmentation, localization key); `AspectPicker.vue` now surfaces a validation error when a stored key becomes unresolvable after a Target switch instead of silently looking valid; `custom` removed entirely from `EFFECT_CHANGE_TYPE`; Bonus Type dropdown's redundant "Untyped"/"None" duplicate options collapsed into one; `group:allSaves` label resolution fixed in the read-only Effects list; `DOCUMENT.ActiveEffect` localization key typo fixed; unbound `game.i18n.localize`/`format` crash in stacking rejection messages fixed.

### ❌ Not Started

**Roll Data Structure & Interfaces, `Actor`/`Item` `getRollData()` — CUT.** Decided against: this system does not bridge to Foundry's native `@attr` roll-data syntax at all, not even for the narrow Combat Tracker/macro use case originally scoped here. `getRollData()` is left at its Foundry default (unused) on both `ActorDnd35e` and `ItemDnd35e`. See the wishlist (`docs/migration-plan/post-release/WISHLIST.md`) if native `@attr` support (e.g. a custom Combat Tracker initiative formula) is ever wanted later.

**FormulaFamiliar Context Registration (`#action.*`/`#target.*`)** — deferred to Phase 10 (Basic Combat), which already scopes this (§"FormulaFamiliar contexts": `check.formula`/`damage.formula` declare `#target.defense.armorClass` etc.). Not tracked here to avoid duplicate ownership. `#self`/`#item` already shipped in this phase.

**Canonical Formula Paths Documentation:** deferred — folded into "Documentation & Examples" below (Foundry journal page, not a `.mts` file; skipped for now).

**Boolean Formula Type (Story A, §7.2a):** — ✅ moved to Complete above.

**Array Operators (Story A follow-up, §7.2b):**
- [x] `FieldAspect.type` widens to include `'array'`; new `arrayElement` metadata (`{ kind: 'primitive', type }` or `{ kind: 'object', elementFields }`)
- [x] `schemaWalker.mts`: `walkFields`/`inferFieldType`/`resolveValue` gain array handling (fixes the current mis-tagging as `'string'`; array `.value` resolves to element count)
- [x] Extract `findMatchingParen`/`splitTopLevelArgs` out of `conditionalGrammar.mts` into a shared helper used by all grammars
- [x] Create `FormulaResolver.functionGrammar.mts`: `$contains`/`$find`/`$any`/`$count`/`$stringContains` block scanning + resolution (one shared module for array + string functions)
- [x] Wire the new grammar into `FormulaResolver.resolveFormula()` as a pre-pass alongside `$conditional`
- [x] `$find`'s trailing `.resultField` projection parsing (dotted-path suffix after the block's closing paren)
- [x] `#it` predicate evaluation: synthetic per-element `FamiliarSchema`/context, reusing `resolveFormula` + `evaluateBooleanExpression` — also extended to `$any`/`$count`'s optional 2nd argument
- [x] `$stringContains`: case-sensitive substring match, no `#it` involved
- [ ] Autocomplete: `#it.*` suggestions scoped to the array's element schema while the caret is inside a `$contains`/`$find` call
- [x] Test: all cases listed under §7.2b's Tests subsection (except the deferred autocomplete item above)

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
- [x] Extend formula syntax highlighting to tag comparison/logical operators (`>`, `<`, `>=`, `<=`, `==`, `!=`, `&&`, `||`), not just `#tokens` — same blue/valid, yellow/still-typing, red/invalid-operand contract as `!` and `()`, reusing shared `classifyOperandForward()`/`classifyOperandBackward()`/`classifyBinaryOperator()` classifiers in `utils.mts`; `&&`/`||` cascade validity through their parenthesized operands via the existing paren-matched-state check (no deep sub-expression validation needed). Added real DOM-focus-based severity escalation (`isFocused` param on `renderFormulaHTML()`, `escalateOnBlur()`): a still-typing operand renders yellow while the field is focused, and escalates to red once the field blurs — applied uniformly to `!`, `()`, comparisons, `&&`/`||`, and the two variable-token "still typing"/"fallback" branches. `useFormulaEditor.mts`'s focus tracking was converted from a non-reactive closure flag to a reactive `isFocused` ref feeding this. AND/OR word-keyword syntax was initially deferred by the user for future consideration (`&&`/`||` symbols only); later implemented as `$and`/`$or` keyword aliases (not `#and`/`#or` — see the sigil rescope note below) once the `#` vs `$` sigil split was settled. See `tests/unit/familiar/render-formula-html-comparison-operators.test.mts`.
- [x] Highlight `$conditional`/`when(`/`else(` as their own keyword class (new `.formula-keyword`, purple — distinct from data-bound `#context.property` tokens): `$conditional` tracks its block's own well-formedness (purple when clean; yellow-while-focused/red-once-blurred for still-typing states `unbalancedParens`/`missingElse`; always-red for genuinely malformed states `multipleElse`/`whenArgCount`/`elseArgCount` — see `conditionalErrorState()` in `utils.mts`), with the specific localized error as a tooltip. `when(`/`else(` are always plain purple (validity tracked only at the `$conditional` token). Nested `#context.property` tokens and operators inside `when()`/`else()` clauses continue to highlight normally, unaffected. See `tests/unit/familiar/render-formula-html-conditional-keyword.test.mts`.
- [x] Sigil rescope: the conditional keyword moved from `#conditional(...)` to `$conditional(...)` — `#` is reserved for context/property data references, `$` for control-flow/keyword constructs — eliminating the `isConditionalKeywordToken()` disambiguation hack entirely (a `$`-prefixed token is never extracted as a `#`-style variable in the first place). Also added `$and`/`$or` as case-insensitive keyword aliases for `&&`/`||` in the boolean grammar (`FormulaResolver.booleanGrammar.mts`), rendered as `.formula-operator` like their symbol equivalents. `when`/`else` intentionally kept bare (no `$` prefix) — no disambiguation need, and shorter is better.
- [x] Create General AE custom sheet (`GeneralSheet.mts`/`.vue`, `GeneralStore.mts`) mirroring Material's pattern — thin pass-through leaf store reusing the base `getDefaultActiveEffectTabs()` directly (no custom tabs needed; General has no fields beyond the base Details/Duration/Changes schema)
- [x] Test: Condition column accepts and evaluates a boolean formula with operator highlighting
- [x] Test: Value column rejects/flags a formula that doesn't match the picked aspect's type
- [x] Test: General AE sheet renders Changes/Duration tabs with parity to Material

**Basic Formula Editor & Engine Consolidation (Story C, §7.10):**
- [x] Implement `$conditional(when(cond, value) ... else(default))` parser + evaluator (flat rule-list shape, `else()` required exactly once, position-independent among clauses; includes `\$`/`\(`/`\)` escaping and parens-required-for-adjacency handling) — shipped ahead of this rescope, now living in `FormulaResolver`
- [x] Hook parser into `FormulaData.resolve()`/`resolveSource()` and into resolution/validation so `$conditional(` isn't flagged as an unknown context and malformed blocks surface a structural `ValidationError` — shipped ahead of this rescope
- [x] Create `src/helpers/formulae/FormulaResolver.mts`: consolidate `parseFormula`, `extractVariables`, `resolveFormula`, `getNestedValue`, `fieldAspect`, `getFieldAspect`, `getPropertyValue`, `findAspectByAccessPath`, `mergeAspectGroups`, `filterExcludedFields`, `validateFormula`, `validateFormulaType`, the boolean grammar (formerly `evaluateBooleanExpression.mts`), and the `$conditional(...)` parser (formerly `conditionalFormula.mts`) as static methods on one class (split across `FormulaResolver.aspectResolution.mts`/`.validation.mts`/`.booleanGrammar.mts`/`.conditionalGrammar.mts`/`.functionGrammar.mts`/`.parenUtils.mts`, re-exported as one facade class)
- [x] Update `FormulaData.mts` to call `FormulaResolver.*` instead of importing loose functions from three files
- [x] Update all cross-file call sites (Vue components, `registry.mts`, tests) to the new import path
- [x] Delete `evaluateBooleanExpression.mts` and `conditionalFormula.mts` (content absorbed)
- [x] Build clean; all existing familiar/effects unit tests pass unchanged (behavior-preserving refactor)
- [x] Add basic multiline editor button to `FormulaFormGroup.vue`, including its `hideAdvancedEditor` opt-out prop — note: the button was later relocated from FormGroup's `#controls` slot to a `#decoration` slot rendered inside `FamiliarOverlayInput` itself, so it stays visible even when a consumer sets `hideFieldControls` (e.g. the AE Changes table row)
- [x] Create the multiline modal component: rich-text box, same `#context.property` validation/highlighting/autocomplete as the inline field, line breaks allowed (`FormulaMultilineModal.vue`, shares `useFormulaEditor`'s `multiline` mode)
- [x] Inline `FormulaFormGroup` display: collapse/hide line breaks when rendering a multiline formula back in the single-line field (including indentation/extra whitespace, not just newlines)
- [x] Save path: modal writes back through the same `onCommit` the plain text input uses (`commitFormula` shared between both)
- [x] Test: all cases listed under §7.10's Tests subsection
- [x] Wishlist: file the deferred Condition Builder / Conditional Values rule-list editor in `docs/migration-plan/post-release/WISHLIST.md` (done as part of this rescope)

**D20Roll Custom Class** in `src/dice/D20Roll.mts`:
- [x] Extend Foundry's `Roll` class
- [x] Implement `isCriticalThreat` getter: true if die result is natural 20
- [x] Implement `isFumble` getter: true if die result is natural 1
- [x] Implement `confirmCritical(targetAC: number): Promise<boolean>` (re-rolls the formula, compares `total >= targetAC` — simpler than the spec's "≥ 11 vs AC" fixed-margin sketch since attack-roll confirmation rules aren't finalized until Phase 8/10; not yet exercised by any caller)
- [x] Add `situationalModifiers: RollModifier[]` array for temporary bonuses
- [x] Apply modifiers correctly (carried via `options.situationalModifiers`, survives `toJSON()`/`fromData()`)
- [ ] Test: Natural 20 detected, natural 1 detected
- [ ] Test: Confirmation roll works
- [ ] Test: Modifiers applied correctly

**DamageRoll Custom Class** — deferred to Phase 10 (Basic Combat), which already scopes `DamageRoll` (`applyCritical()`, crit multiplier, damage-type tagging, wired into `takeDamage()`). Not tracked here to avoid duplicate ownership.

**Roll Class Registration** via `CONFIG.Dice.rolls`:
- [x] Register `D20Roll` in `CONFIG.Dice.rolls` array during `init` hook (`CONFIG.Dice.rolls = [Roll, D20Roll]` in `main.mts`) — `DamageRoll` will be added to this array when it's created in Phase 10
- [ ] Verify `Roll.fromData()` correctly reconstructs `D20Roll` from serialized chat messages (DamageRoll: tracked in Phase 10)
- [ ] Test: Create a D20Roll, send to chat, reload page — roll is still a D20Roll instance (not base Roll)

**Text Enrichers** (`[[/check]]`, `[[/save]]`, `[[/damage]]`) — deferred to wishlist alongside native chat-roll command support (`docs/migration-plan/post-release/WISHLIST.md`, "Formula System" section).

**Codebase TODO Notes** — moved to `docs/migration-plan/poc/phase-11-poc-cleanup.md` Task 11.2 (none of these three explicitly required poc.7 to close them out).

**Preparation Warnings Infrastructure:** ✅ implemented (see `src/documents/document/preparationWarnings.mts`)
- [x] Add `_preparationWarnings: PreparationWarning[]` field to `ActorDnd35e`, `ItemDnd35e`, `ActiveEffectDnd35e` directly (not via a shared mixin — matches the existing `effectOverrides` precedent), reset each `prepareBaseData()`
- [x] Define `PreparationWarning` interface: `{ field, message, severity: 'warning' | 'error', sourceUuid, sourcePath }` in `preparationWarnings.mts` — `sourceUuid`/`sourcePath` (ancestor chain of document names, e.g. `["Aragorn", "Longsword +1", "Strength Bonus"]`) are computed at push time by walking `host.parent`, so actor-level rollup of owned-item/AE warnings needs no separate relabeling type
- [x] Collect warnings during `prepareDerivedData()` without blocking prep — `DocumentSystemModel._evaluateFormulaFields()` passes an `onFailure` callback into `FormulaData.resolveSource()` for every schema-declared `FormulaField`, covering all document types through the single central chokepoint
- [x] Display warnings in sheet UI: dismissable summary banner (`PreparationWarningsBanner.vue`, its own grid row in `DocumentSheetBody.vue`, pushes the sheet body down rather than overlaying it) + a conditional "Warnings" tab (`PreparationWarningsTab.vue`, full detail list) that only appears while warnings exist and is NOT dismissable (persists until fixed)
- [x] Implement formula validation that generates warnings:
  - Unresolved `#context.property` references → warning (boolean/number fall back to `null`; string falls back to showing the raw formula text, per design)
  - Invalid boolean/number expression syntax → warning
  - AE `condition` formula failing to resolve → warning, change treated as `false`
  - AE `value` formula failing to resolve → warning, change skipped entirely (guarded via a `FORMULA_RESOLUTION_FAILED` sentinel in `resolveChangeValue.mts`, never silently coerced to `0`/`false`)
- [x] Test: `tests/unit/familiar/formula-data-boolean.test.mts` verifies invalid boolean expressions resolve to `null` without throwing
- [x] Test: Prep completes even with warnings (verified via existing actor/item sheet store unit test suite — 779 unit tests passing)

**Formula Error Handling:** ✅ implemented
- [x] Implement formula evaluation with type-aware fallback (no try-catch needed at call sites — centralized in `FormulaData._finalizeResolvedValue()`):
  - Unresolved variables / evaluation errors → `onFailure` callback fires a `PreparationWarning`
  - boolean/number fall back to `null` (never a stale/garbled raw value); string falls back to the raw formula text so it's still human-readable
- [x] Test: Invalid formula doesn't crash sheet — `resolveActiveEffectChange()` returns `null` on failure and both `ActorDnd35e`/`ItemDnd35e`'s apply loops `continue` past it
- [x] Test: User sees warning message — surfaced via the summary banner + Warnings tab
- [x] Test: Field shows fallback value — `null`/raw-formula-text fallback verified in `formula-data-boolean.test.mts` and existing FormulaData test suites

**Vue Form Component - Formula Input** *(`FormulaFormGroup.vue` already exists and ships autocomplete + validation; remaining items are new here)*:
- [ ] Show contextual help: "Formula must start with #self, #item, #action, or #target"
- [ ] Evaluate `HeaderNameField.vue` refactor (`HeaderNameField.vue:25`): Component uses its own display mode to hide formula hints when not editing. Assess whether this should be folded into `FormulaFormGroup` as a `displayMode` prop or slot, or kept as a separate wrapper. The TODO also notes styling concerns with a read-only slot that were deferred.
- [ ] Test: Complex boolean expressions with operators work (Story A)

**Group Change Targets (§7.7):** ✅ moved to Complete above (see §7.7's Implementation Notes) — the checklist duplicated here previously was stale.

**Integration Testing:**
- [ ] Unit test: Roll data assembly for all document types
- [ ] Unit test: D20Roll crit/fumble detection
- [ ] Integration test: Create weapon with formula damage (`1d8 + #self.abilities.str.mod`)
- [ ] Integration test: Resolve formula → get correct value based on actor stats
- [ ] Integration test: Change actor ability score → formula re-evaluates
- [ ] Integration test: Invalid formula generates warning
- [ ] Edge case: Formula with size modifier (`1d8 + #self.size.attackMod`)
- [ ] Edge case: Formula referencing nonexistent ability
- [ ] Smoke test: No console errors during prep

**Documentation & Examples:** deferred/skipped for now — to be authored as a Foundry journal page (dev world), not markdown/code docs.
- [ ] "Writing Formulas in dnd35e" journal page: `#context.property` syntax, context inheritance (actor → item → action), 5-10 formula examples (ability mods, attack bonus, AC, save DC, boolean gate), when formulas are evaluated
- [ ] Document `D20Roll` for developers (code comments, not journal)

**POC Story 7.9 — Clickable Defense Stat → Roll → Chat Card:**

*`CreatureDefenseStat.vue`*
- [x] `src/documents/actors/creature/sheet/components/CreatureDefenseStat.vue` already exists (read-only shield display: `label`/`value`/`sublabel`/tooltips) — different path than originally sketched (`src/vue/components/actors/`), and it is NOT yet interactive. Extend this component rather than creating a new one.
- [ ] Add `rollable: boolean` prop (default `true`)
- [ ] Edit mode: read-only display, no click handler (already true today, since there's no click handler at all yet)
- [ ] Play / True mode: cursor pointer, click emits roll intent
- [ ] Wire into header stat pills: Fort | Ref | Will | AC (normal)
- [ ] Wire into Combat tab rows: all three AC variants + fort/ref/will rows
- [ ] Test: Click in edit mode does nothing
- [ ] Test: Click in play mode triggers dialog

*`D20RollDialog.vue`*
- [x] Created as `D20RollDialogConfig.mts` (`ApplicationV2` subclass via `useVueDialogMixin`) + `D20RollDialogApp.vue` (form UI) — different split than the original single-file sketch, matching the project's Vue-dialog-mixin pattern
- [x] Props/data: `title`, `baseLabel`, `baseTotal`, `situationalModifier`, `rollMode` (`D20RollDialogData`)
- [x] Signed situational modifier input, defaults to `0`
- [x] Live total preview (`baseTotal + situationalModifier`)
- [x] Roll Mode selector bound to `CONST.DICE_ROLL_MODES` options
- [x] Roll button: resolves promise with `{ situationalModifier, rollMode }` (`D20RollDialogResult`); closes dialog
- [x] Cancel button / ESC: resolves with `null` (roll cancelled)
- [ ] Test: Total preview updates reactively
- [ ] Test: Submitting with no situational mod passes 0
- [ ] Test: Cancel resolves null

*`rollMessages.mts` + chat card*
- [x] Created as `src/dice/rollMessages.mts` (co-located with the roll classes rather than `src/helpers/`)
- [x] `buildSaveCard(roll: D20Roll, modifierList: RollModifier[], opts: { actorName, saveLabel, dc? })` → `Promise<string>` HTML (async: splices in `await roll.render()`'s native Foundry dice-roll block)
- [ ] `buildACCard(...)` — deferred with AC rolling (explicitly out of scope for this pass; AC excluded, see Cycle E note below)
- [x] Chat card built via `.hbs?raw` + `Handlebars.compile()` (`src/dice/templates/save-roll-card.hbs`), not a `.vue` component — resolved a pattern conflict between this section's original Vue sketch and `alpha/phase-03-action-system.md` §18.11's "no Vue in chat cards" rule; user chose the existing `.hbs?raw` precedent from `TokenRulerDnd35e.mts` as a third option
- [x] Card shows: stat name + actor name header, large die face value, large total
- [x] Breakdown list: one row per `RollModifier` entry (label + signed value); die roll shown via Foundry's own embedded `.dice-roll` block (native collapsible tooltip, `data-action="expandRoll"`) rather than a synthetic die row — verified against real Foundry core source (`roll.mjs`/`roll.hbs`/`chat.mjs`) after comparing against D35E's clickable-breakdown save UI
- [x] Natural 1 / Natural 20 callout (`.callout.fumble` / `.callout.critical` CSS classes)
- [x] Pass / Fail indicator: only rendered when `dc` is provided
- [ ] Test: Card renders breakdown list with correct labels and values
- [ ] Test: Natural 1 has fumble CSS class
- [ ] Test: Natural 20 has exceptional CSS class
- [ ] Test: Pass/Fail absent when no DC; correct when DC provided

*`Creature` actor methods* (real class is `Creature`, not `CreatureDnd35e` as originally sketched — the abstract base shared by Character/NPC):
- [x] Add `async rollSave(saveKey: SaveKey, options?)` to `Creature` — `SaveKey = 'fort' | 'reflex' | 'will'` (real schema key is `reflex`, not `ref` as originally sketched); returns `Promise<D20Roll | null>` (`null` on dialog cancel — deviates from the spec's `Promise<D20Roll>` sketch since cancellation must be representable)
- [ ] Add `async rollAC(acVariant: 'normal'|'touch'|'flatFooted', options?)` to `Creature` — deferred; AC rolling explicitly excluded from this implementation pass per user direction
- [x] `rollSave` follows the dialog → D20Roll → chat-card pipeline (§7.9), using `Roll#toMessage()` (Foundry's sanctioned Roll-to-chat helper) rather than a raw `ChatMessage.create()` call
- [x] `skipDialog` option bypasses dialog (for macro callers)
- [ ] Test: `rollSave('fort')` creates a chat message with Fort save breakdown
- [ ] Test: Situational modifier from dialog appears in card breakdown
- [ ] Test: `skipDialog: true` skips dialog and uses provided options directly
- [ ] Test: `rollSave` with `dc: 15` shows Pass on roll ≥ 15, Fail below

*E2E acceptance*: Open character sheet in play mode → click Fort save pill → dialog opens with correct base total → enter `+2` situational modifier → click Roll → chat card appears with: `Fortitude +X`, `Situational +2`, `d20 → N`, bold total. Click AC pill → same pipeline, AC-labeled card, no Pass/Fail shown.
