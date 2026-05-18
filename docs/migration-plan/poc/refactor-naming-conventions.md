# Refactor: Naming & Layout Conventions (src-wide)

**Status**: ✅ Complete
**Type**: Cross-cutting refactor (mini-phase)
**Branch**: `poc/refactor-naming-conventions` (off `origin/dev`)
**Dependencies**: None (pure rename / relocation / re-export work, no runtime behavior change)
**Goal**: Establish one consistent naming-and-layout rule set across the *entire* `src/` tree — Foundry-aligned vocabulary, suffix-only `Dnd35e` decoration, file-name = primary export, community-standard PascalCase/camelCase/lowercase split — *before* Phase 6 multiplies these patterns across the actor side.

---

## R.1 Rationale

Foundry's own vocabulary calls these things **documents**: `Document` is the root abstract class, and `Item` / `Actor` / `ActiveEffect` / `Scene` / `TokenDocument` / `RegionDocument` are concrete documents. Our system extends them. The current `entities/` folder name, the inconsistent `Dnd35e` prefix/suffix application, and several smaller drift items obscure the parent-child relationship and make new contributors guess at where things live. This refactor settles those rules across **all of `src/`** in one pass.

### Problems being fixed

1. **Foundry alignment**. `src/entities/` → `src/documents/`; `src/scene/` collapses into `src/documents/scene/` (Scene and TokenDocument are Foundry documents); cross-document mixins become top-level peers of `items/`, `actors/`, `activeEffects/`, `scene/`.
2. **Suffix consistency**. `Dnd35e` is a suffix, applied only when the bare name collides with a Foundry class. No more mixed prefix/suffix usage, anywhere in `src/`.
3. **File name = primary export**, with intentional exceptions for files that group related helpers.
4. **Drop the `Base` marker** where it only restates `abstract class`. Keep it when it's the most accurate descriptor *and* avoids a `Dnd35e` collision suffix.
5. **File-name casing rule** (PascalCase / camelCase / lowercase) aligned with JS/TS community standards, applied repo-wide.
6. **Folder-name casing**: camelCase when the folder groups multiple files (`baseItem/`, `formGroups/`); PascalCase only when the folder is dedicated to a single same-named export (`TabDivider/TabDivider.vue`). Full file-casing rule lives in §R.2.9.
7. **Co-locate code with its purpose**, not its incidental neighbours. Custom `DataField` subclasses (`PriceField`, `PriceData`, `SectionField`) live in top-level `src/fields/` — they're schema primitives, not utility helpers. Settings-only files live under `settings/<category>/`.
8. **Tab `.vue` naming**. `documents/items/baseItem/sheet/tabs/Effects.vue` → `ItemEffects.vue` for parity with the `<ConceptType><TabPurpose>` convention all other tab files already follow.

### In-scope, multi-wave

Several cleanup threads are part of this refactor but are sequenced as later execution waves so the main document-hierarchy work lands first and the diff stays reviewable. None are deferred out of the refactor effort itself, but the work **will ship as several focused PRs** (likely one per group, or small group clusters) to keep diffs reviewable — a single mega-PR for the whole refactor would be unreviewable. PR boundaries are decided per-group as we go; each PR must independently leave `npm run build` clean and the unit suite green.

- **Folder casing inside `documents/`**. After the directory move, normalize `BaseActiveEffect/` and similar PascalCase folder remnants to camelCase peers of `baseItem/`, `baseActor/`. Sequenced as Group 7.
- **`documents/items/components/` folder name**. The `components/` folder currently holds two abstract physical-item layers (`Physical/`, `Equippable/`) plus three vestigial files (`Alignment.mts`, `Changes.mts`, `CursableItem.mts`) with zero imports anywhere in `src/`. Group item documents under `physical/` and `metaphysical/` buckets, move the two abstract layers into `physical/` alongside their concretes, delete the three dead files, and relocate the `Dnd35eBuff/` placeholder to `documents/activeEffects/buff/` as parked reference material for alpha.9 Buff AE Core (Buff is an AE subtype in dnd35e, not an item type). Field-bundle types like `WeaponStats`/`ArmorStats` live inside their primary concrete type's `*SystemData.mts` and need no folder. The `Item` suffix still distinguishes abstract layers (`physicalItem/`, `equippableItem/`) from bare-noun concretes (`weapon/`) inside each bucket. Sequenced as Group 8.
- **Helper-type prefix audit**. Apply the same suffix rule to non-class symbols still carrying `Dnd35e` (`Dnd35eFieldMeta`, `Dnd35eParentDoc`, `Dnd35eEffectChangeData`, `Dnd35eOverrideOptions`, `Dnd35eSystemConfig`, `Dnd35eBaseFlags`, `Dnd35eChangeType`, `DND35E_CHANGE_TYPE`). Strip the prefix where bare names don't collide; restore as suffix where they do. Note: `EffectChangeData` *does* collide (verified against `types/foundry/`) — so `Dnd35eEffectChangeData` → `EffectChangeDataDnd35e`. Sequenced as Group 9.
- **Non-`entities/` casing & file-name fixes**. `class tokenDnd35e` (camelCase class!) → `TokenDnd35e`; `logHelper.mts` (exports `class LogHelper`) → `LogHelper.mts`. Sequenced as Group 5e.
- **Settings structural cleanup**. Delete the `settings/constants/` and `settings/_types.mts` backwards-compat aggregators (consumers re-point to category modules); flatten `settings/core/` to hidden settings only (orchestration moves to `settings/index.mts`, menu registration inlines into each category's `registration.mts`); fold `settings/core/settings/unitOfMeasure.mts` into `settings/display/` (it's a display-format setting). Sequenced as Group 5f. A broader settings reorg is planned post-poc — some looseness in category fit is acceptable for now; this group only resolves the structural problems (overloaded `core/`, dead aggregators).
- **`fields/` hoist + relocations**. Create top-level `src/fields/` as a peer of `helpers/` and `constants/` — custom `DataField` subclasses are schema primitives, not utility helpers (dnd5e and pf2e both keep DataFields out of `helpers/`). Move `helpers/fieldBuilders.mts`, `settings/currency/PriceField.mts`, `settings/currency/PriceData.mts`, and the existing `helpers/fields/Dnd35eSectionField.mts` into `src/fields/`. Sequenced as Group 5g.
- **`_types.mts` → `types.mts` repo-wide**. The leading-underscore convention is borrowed from Python and is not standard in JS/TS; dnd5e and pf2e both use plain `types.ts`. Sequenced as Group 5h.
- **`scene/` move into `documents/`**. Scene, TokenDocument, RegionDocument, and RegionBehavior are Foundry documents and belong under `documents/scene/`. Also normalize kebab-case sub-folder names to camelCase (`region-document/` → `regionDocument/`, `token-document/` → `tokenDocument/`). The `behaviour/` folder keeps its spelling. Sequenced as Group 6b.

### Out of scope

- **Phase 6 design questions** (Identifiable for actors, etc.). Resolved during Phase 6 planning.
- **`canvas/` relocation**. `Canvas`, `Token` (the placeable), and `Region` (the placeable) extend `PlaceableObject`, not `Document`. They stay as a top-level peer of `documents/`.
- **Internals of class methods and function bodies**. Symbol names at the module surface (exported classes, functions, types, consts, file-level bindings) are in scope per the R.3 rename map; the *implementation* inside those symbols is not touched by this refactor. If a method body needs to be rewritten, that's a separate phase.

This refactor is **mechanical, no runtime behavior change**. Proof: `npm run build` clean, full unit suite green, **full E2E suite green** at the end of the last wave (single run, not per-group).

---

## R.2 Conventions adopted

These rules are the target state. The checklist in §R.5 enforces them.

### R.2.1 Foundry-aligned vocabulary

`entities/` → `documents/`. The folder name matches the Foundry concept it implements. Foundry documents we extend: `Item`, `Actor`, `ActiveEffect`, `Scene`, `TokenDocument`, `RegionDocument`, `RegionBehavior`. All of them live under `documents/`.

`canvas/` stays separate — `Canvas`, `Token` (placeable), and `Region` (placeable) extend `PlaceableObject`, not `Document`.

### R.2.2 Top-level layout

```
src/
  canvas/                ← runtime placeables (Canvas, Token, Region — NOT documents)
  constants/             ← system-wide constants and CONFIG.dnd35e shape
  fields/                ← custom DataField subclasses + factories (PriceField, SectionField, fieldBuilders)
  documents/             ← all Foundry documents (was entities/ + scene/)
    document/            ← cross-document base (was entities/components/CoreMixin/)
    identifiable/        ← cross-document mixin (was entities/components/Identifiable/)
    items/               ← item documents
      baseItem/          ← abstract: registered base layer
      physical/          ← bucket for physical item layers + concretes
        physicalItem/    ← abstract: schema layer (was components/Physical/)
        equippableItem/  ← abstract: schema layer (was components/Equippable/)
        weapon/          ← concrete physical item type
      metaphysical/      ← bucket for metaphysical item layers + concretes
        (empty until Phase 7+ lands concrete metaphysical types)
    actors/              ← actor documents
      baseActor/
    activeEffects/       ← active-effect documents
      baseActiveEffect/  ← folder cased lowercase (Group 7)
      general/
      material/
      secret/
      buff/              ← parked WIP (was items/Dnd35eBuff/, relocated)
    scene/               ← scene documents (was src/scene/)
      regionBehaviour/   ← was region-behaviour/; spelling preserved
      regionDocument/    ← was region-document/
      tokenDocument/     ← was token-document/
    types.mts
    index.mts
  helpers/               ← cross-cutting utility code
    formulae/            ← FormulaFamiliar + FormulaField
    localization/        ← localization config & helpers
    LogHelper.mts
    HasSystem.mts
    stacking.mts
    stringHelpers.mts
    typeHelpers.mts
    helpers.mts          ← misc bag of helpers
    index.mts
  lang/                  ← localization JSON
  scene/                 ← (removed — contents moved to documents/scene/)
  settings/              ← world/client settings (registration + sheet UIs)
    combat/
    core/                ← hidden/internal settings only (after Group 5f cleanup)
    currency/            ← currency settings only (Price field/data relocated to src/fields/)
    display/
    gameRules/
    health/
    roll/
    skills/
    index.mts            ← orchestrates all category registrations (after Group 5f)
  styles/                ← SCSS
  vue/                   ← Vue 3 apps, components, stores, composables
    apps/
    components/
  global.mts
  main.mts
```

Note the top-level `entities/components/` ambiguity disappears entirely: cross-document concerns become *siblings* of the document-kind folders, and item-side abstract layers move under their nature bucket (`physical/` or `metaphysical/`). There is no longer any `components/` folder under `documents/`.

**Convention for `items/` children**: Item documents are grouped under `physical/` and `metaphysical/` buckets by nature. Within each bucket, abstract layers carry the `Item` suffix (`physicalItem/`, `equippableItem/`) and concrete types use the bare type noun (`weapon/`, future `armor/`, `shield/`, `consumable/`, `feat/`, `spell/`, etc.). The bucket name says what *kind* of item it is; the suffix says *layer vs. concrete*. `baseItem/` stays at `items/` root because it is the root of both buckets. If a future layer truly spans both buckets, it lifts to `items/` root alongside `baseItem/`.

**Schema-fragment types** (e.g. `WeaponStats`, `ArmorStats` from the Physical PropertyMap) live as exported types inside the *primary* concrete type's `*SystemData.mts` (`WeaponStats` in `WeaponSystemData.mts`, `ArmorStats` in `ArmorSystemData.mts`). Cross-consumers like `Shield` import them as types from siblings. They do not get their own folder — they are not class layers, just shared field shapes.

### R.2.3 Class-name suffix rule

**Rule**: `Dnd35e` is a suffix, applied **only when the bare name collides with a Foundry built-in**. If we can drop it, we drop it. When it does apply, it is the **terminal token** of the name — nothing follows it. Never prefix. Never insert it in the middle.

| Foundry class | Our class | Note |
| ------------- | --------- | ---- |
| `Document` | `DocumentDnd35e` | Was `Dnd35eDocument` (prefix → suffix) |
| `Item` | `ItemDnd35e` | Already correct |
| `Actor` | `ActorDnd35e` | Already correct |
| `ActiveEffect` | `ActiveEffectDnd35e` | Was `Dnd35eActiveEffect` (prefix → suffix) |
| `ActiveEffectConfig` | `ActiveEffectConfigDnd35e` | Was `Dnd35eActiveEffectConfig` (prefix → suffix) |
| `TokenDocument` | `TokenDocumentDnd35e` | Already correct |

**Verified Foundry collisions** (confirmed by grep against `types/foundry/` — these **must** carry the `Dnd35e` suffix):

| Name | Found at |
| ---- | -------- |
| `ActiveEffectSource` | `types/foundry/common/documents/active-effect.d.mts` line 147 |
| `ActiveEffectSystemSource` | `types/foundry/common/documents/active-effect.d.mts` line 80 |
| `DocumentFlags` | `types/foundry/common/data/_types.d.mts` line 326 |
| `EffectChangeData` (helper sweep) | `types/foundry/common/documents/active-effect.d.mts` line 127 |

**Drop the suffix when the descriptor disambiguates by itself.** Companion types of a colliding class — mixin factories, system models, system data — generally do **not** collide on bare names. All companion symbols get the bare target name *except* the three verified collisions below:

| Concept | Target name | Old name |
| ------- | ----------- | -------- |
| Flags type for our Document | `DocumentFlagsDnd35e` | `Dnd35eDocumentFlags` |
| Source type for our ActiveEffect | `ActiveEffectSourceDnd35e` | `Dnd35eActiveEffectSource` |
| System source type for our ActiveEffect | `ActiveEffectSystemSourceDnd35e` | `Dnd35eActiveEffectSystemSource` |

(Full bare-name companion list is in §R.3.2.)

**Resolution principle when an unforeseen escalation is needed**: if `npm run build` errors on a name collision the grep missed, append `Dnd35e` to that specific name. Do not pre-emptively keep the suffix "just in case."

**Bare classes** (no Foundry collision, no `Dnd35e` decoration): `Weapon`, `PhysicalItem`, `EquippableItem`, `Material`, `Secret`, `General`, `IdentifiableDocument`, `SectionField` (verified no collision — see §R.3.2), `Buff` (was `Dnd35eBuff` — placeholder, see §R.6).

Helper types/interfaces/constants under `src/helpers/`, `src/entities/components/CoreMixin/types.mts`, etc. (e.g. `Dnd35eFieldMeta`, `Dnd35eParentDoc`, `Dnd35eEffectChangeData`, `Dnd35eOverrideOptions`) follow the **same rule** and are renamed in Group 9 of the checklist (see §R.3.3 for targets).

### R.2.4 `Dnd35e` capitalization

`DnD` → `Dnd` consistently. After this refactor the only acceptable casing is the lowercase-bridge `Dnd35e` token. Class names always start uppercase (so `class tokenDnd35e` is wrong — see Group 5e).

### R.2.5 File name = primary export

A `.mts` file whose primary export is a class, mixin factory, Vue component, or top-level type is named after that export. **Exception**: files that deliberately group related helpers under one logical roof keep a generic, descriptive, camelCase name (`displayName.mts`, `resolveChangeValue.mts`, `formulaRegistrationHelpers.mts`, `fieldBuilders.mts`, `stringHelpers.mts`, `typeHelpers.mts`, `stacking.mts`, etc.). The exception is intentional, not a workaround.

Canonical violations being fixed:
- `logHelper.mts` exports `class LogHelper` → file renamed to `LogHelper.mts` (Group 5e).
- `tokenDnd35e.mts` exports `class tokenDnd35e` → both file and class renamed to `TokenDnd35e` (Group 5e).

### R.2.6 SystemModel / SystemData naming

Drop the `Base` marker. `abstract class` conveys abstractness in the source; file names should match the class.

| Layer | Model class | Data type | Model file | Data file |
| ----- | ----------- | --------- | ---------- | --------- |
| Document base | `DocumentSystemModel` | `DocumentSystemData` | `DocumentSystemModel.mts` | `DocumentSystemData.mts` |
| Item base | `ItemSystemModel` | `ItemSystemData` | `ItemSystemModel.mts` | `ItemSystemData.mts` |
| Actor base | `ActorSystemModel` | `ActorSystemData` | `ActorSystemModel.mts` | `ActorSystemData.mts` |
| ActiveEffect base | `ActiveEffectSystemModel` | `ActiveEffectSystemData` | `ActiveEffectSystemModel.mts` | `ActiveEffectSystemData.mts` |
| Physical item layer | `PhysicalItemSystemModel` | `PhysicalItemSystemData` | `PhysicalItemSystemModel.mts` | `PhysicalItemSystemData.mts` |
| Equippable item layer | `EquippableItemSystemModel` | `EquippableItemSystemData` | (already correct) | (already correct) |
| Weapon (concrete) | `WeaponSystemModel` | `WeaponSystemData` | (already correct) | (already correct) |
| Material (concrete AE) | `MaterialSystemModel` | `MaterialSystemData` | (already correct) | (already correct) |
| Secret (concrete AE) | `SecretSystemModel` | `SecretSystemData` | (already correct) | (already correct) |
| General (concrete AE) | `GeneralSystemModel` | `GeneralSystemData` | (already correct) | (already correct) |

### R.2.7 Tab `.vue` file naming

Tab files under `<concept>/sheet/tabs/` are named `<ConceptType><TabPurpose>.vue`.

| Folder | Existing | Target |
| ------ | -------- | ------ |
| `documents/items/baseItem/sheet/tabs/` | `Effects.vue` | `ItemEffects.vue` |

All other existing tab files already follow this convention.

### R.2.8 Path aliases

Aliases follow the new folder layout. `@entities/*` and `@ec/*` are removed; replacements are explicit.

| Old alias | New alias | Resolves to |
| --------- | --------- | ----------- |
| `@entities/*` | — (removed) | (use specific aliases below) |
| `@ec/*` | — (removed) | (use `@documents/document/*` or `@documents/identifiable/*`) |
| `@items/*` | `@items/*` | `./src/documents/items/*` (target moved) |
| `@actors/*` | `@actors/*` | `./src/documents/actors/*` (target moved) |
| `@effects/*` | `@effects/*` | `./src/documents/activeEffects/*` (target moved) |
| `@scene/*` | `@scene/*` | `./src/documents/scene/*` (target moved) |
| — (new) | `@documents/*` | `./src/documents/*` |
| — (new) | `@physicalItems/*` | `./src/documents/items/physical/*` (bucket shortcut) |
| — (new) | `@metaphysicalItems/*` | `./src/documents/items/metaphysical/*` (bucket shortcut) |

**On the `@physicalItems` / `@metaphysicalItems` naming**: the alias is **plural** (`Items`) because it points at the bucket *folder* that contains many item documents. The singular `PhysicalItem` *class* lives at `@physicalItems/physicalItem/PhysicalItem.mjs` — the plural alias + singular folder segment keeps the bucket-vs-layer distinction visible at use sites (`@physicalItems/weapon/Weapon.mjs` vs `@physicalItems/physicalItem/PhysicalItem.mjs`).

**Three config locations must be updated in lockstep** when adding, removing, or retargeting an alias:
1. `tsconfig.json` → `compilerOptions.paths` (TypeScript resolution)
2. `vite.config.ts` → `resolve.alias` block (build-time bundling)
3. `vitest.config.ts` → `resolve.alias` block (unit-test resolution)

Drift between these three is a common source of "works in build but fails in tests" (or vice versa).

Use-site updates:
- `@ec/CoreMixin/*` → `@documents/document/*` (50+ sites)
- `@ec/Identifiable/*` → `@documents/identifiable/*` (20+ sites)
- `@entities/*` → `@documents/*` (handful of sites; mostly `types.mts` and `index.mts`)
- `@scene/region-document/*` → `@scene/regionDocument/*` (folder rename, alias target shifts)
- `@scene/token-document/*` → `@scene/tokenDocument/*`
- `@scene/region-behaviour/*` → `@scene/regionBehaviour/*` (kebab → camel; spelling preserved)
- Inner paths under `@items/*`, `@actors/*`, `@effects/*` are unchanged (the alias retargets to the new location transparently).

### R.2.9 File-name casing (repo-wide)

Three-way rule, matching JS/TS community conventions:

| Pattern | When | Examples |
| ------- | ---- | -------- |
| `PascalCase.ext` | File's primary export is a **class**, **Vue/React component**, or a **single named type/interface** the file is named after | `LogHelper.mts`, `SectionField.mts`, `ItemDnd35e.mts`, `WeaponSystemModel.mts`, `HasSystem.mts`, `Button.vue` |
| `camelCase.mts` | Multiple loose helpers / functions / constants / composables; no single primary export | `fieldBuilders.mts`, `stringHelpers.mts`, `typeHelpers.mts`, `stacking.mts`, `useFamiliar.mts`, `bonusTypes.mts`, `damageTypes.mts` |
| `lowercase.mts` | Generic role files | `index.mts`, `types.mts`, `utils.mts`, `helpers.mts` |

Folders are **camelCase** for code organization (`baseItem/`, `gameRules/`, `regionDocument/`). PascalCase is reserved for folders whose sole purpose is to package one same-named component (`TabDivider/TabDivider.vue`). Folders that group multiple components by category are camelCase (`vue/components/fields/formGroups/`).

### R.2.10 Types-only modules

A file that exports only type aliases/interfaces (no runtime values) is named **`types.mts`** — no leading underscore. The `_types.mts` pattern (borrowed from Python's `_private` convention) is not standard in JS/TS; dnd5e and pf2e both use plain `types.ts`. Group 5h renames all existing `_types.mts` files repo-wide.

### R.2.11 Scope discipline (what gets touched, what doesn't)

This refactor renames **module-surface symbols** and rewires **imports**. It does not touch implementation. Concretely:

- **In scope**: file names, directory names, exported classes/functions/types/consts, top-level file bindings, import paths, path aliases, barrel re-exports, JSDoc references that grep flags as broken.
- **In scope for `.vue` files**: `<script setup>` imports, exports, and template-referenced top-level bindings (because `<script setup>` exposes every top-level binding to the template). The compiled component's `name` follows the file name.
- **Out of scope**: method bodies, function bodies, control flow, runtime behavior, purely-internal locals inside a function/method.
- **Out of scope (string-typed surface)**: CSS class names, `data-*` attributes, HTML `id`s, localization keys (`dnd35e.EFFECT.*` — Phase 3 owns those), Foundry hook names, event names, document type strings (`'weapon'`, `'character'`). Even when these textually contain old names they stay as-is.
- **No backward-compat shims**: when a symbol is renamed, the old name disappears in the same PR. No `export { OldName as NewName }` aliases, no transitional re-exports. Each PR is a clean break.

---

## R.3 Rename map (authoritative inventory)

### R.3.1 Top-level directory moves

| From | To |
| ---- | -- |
| `src/entities/` | `src/documents/` |
| `src/entities/components/CoreMixin/` | `src/documents/document/` |
| `src/entities/components/Identifiable/` | `src/documents/identifiable/` |
| `src/entities/components/` | (removed — was only used to nest the above two) |
| `src/entities/items/` | `src/documents/items/` |
| `src/entities/actors/` | `src/documents/actors/` |
| `src/entities/activeEffects/` | `src/documents/activeEffects/` |
| `src/scene/` | `src/documents/scene/` |
| `src/scene/region-behaviour/` | `src/documents/scene/regionBehaviour/` (kebab → camel; British spelling preserved) |
| `src/scene/region-document/` | `src/documents/scene/regionDocument/` |
| `src/scene/token-document/` | `src/documents/scene/tokenDocument/` |

### R.3.2 File + symbol renames (combined)

One row per rename unit. "Symbols" lists all in-file symbol renames; "—" means file-only (the file's primary symbol is already in target form).

| Old file (post-move) | New file | Symbols (old → new) | Note |
| -------------------- | -------- | -------------------- | ---- |
| `document/Dnd35eDocument.mts` | `document/DocumentDnd35e.mts` | `Dnd35eDocument` → `DocumentDnd35e`; `Dnd35eDocumentMixin` → `DocumentMixin`; `Dnd35eDocumentProperties` → `DocumentProperties`; `Dnd35eDocumentConstructor` → `DocumentConstructor` | escalate Constructor to `DocumentConstructorDnd35e` if build collision surfaces |
| `document/data/Dnd35eDocumentSystemModel.mts` | `document/data/DocumentSystemModel.mts` | `Dnd35eDocumentSystemModel` → `DocumentSystemModel` | |
| `document/data/BaseDnd35eSystemData.mts` | `document/data/DocumentSystemData.mts` | `BaseDnd35eSystemData` → `DocumentSystemData`; `BaseDnd35eSystemSource` → `DocumentSystemSource` | |
| `document/data/Dnd35eDocumentFlags.mts` | `document/data/DocumentFlagsDnd35e.mts` | `Dnd35eDocumentFlags` → `DocumentFlagsDnd35e` | **verified collision** with Foundry `DocumentFlags` |
| `identifiable/IdentifiableItem.mts` | `identifiable/IdentifiableDocument.mts` | — | class already named `IdentifiableDocument` |
| `identifiable/data/applyIdentifiableSchema.mts` | `identifiable/data/IdentifiableSchemaMixin.mts` | — | file-only |
| `items/baseItem/data/ItemSystemModelBase.mts` | `items/baseItem/data/ItemSystemModel.mts` | `ItemSystemModelBase` → `ItemSystemModel` | |
| `items/baseItem/sheet/BaseItemSheet.mts` | `items/baseItem/sheet/ItemSheetDnd35e.mts` | — | class already named `ItemSheetDnd35e` |
| `items/baseItem/sheet/tabs/Effects.vue` | `items/baseItem/sheet/tabs/ItemEffects.vue` | — | tab naming parity |
| `items/components/Physical/PhysicalItemDnd35e.mts` | `items/physical/physicalItem/PhysicalItem.mts` | — | class already `PhysicalItem`; folder relocated in Group 8 |
| `items/components/Physical/data/PhysicalSystemData.mts` | `items/physical/physicalItem/data/PhysicalItemSystemData.mts` | — | folder relocated in Group 8 |
| `actors/baseActor/data/ActorSystemModelBase.mts` | `actors/baseActor/data/ActorSystemModel.mts` | `ActorSystemModelBase` → `ActorSystemModel` (and `interface ActorSystemModelBase` mirror) | |
| `activeEffects/BaseActiveEffect/DnD35eActiveEffect.mts` | `activeEffects/BaseActiveEffect/ActiveEffectDnd35e.mts` | `DnD35eActiveEffect` → `ActiveEffectDnd35e`; `DnD35eActiveEffectFlags` → `ActiveEffectFlags`; `DnD35eActiveEffectBase` → `ActiveEffectBase`; `Dnd35eActiveEffectSource` → `ActiveEffectSourceDnd35e`; `Dnd35eActiveEffectSystemSource` → `ActiveEffectSystemSourceDnd35e` | Source/SystemSource are **verified collisions** |
| `activeEffects/BaseActiveEffect/sheet/Dnd35eActiveEffectConfig.mts` | `activeEffects/BaseActiveEffect/sheet/ActiveEffectConfigDnd35e.mts` | `Dnd35eActiveEffectConfig` → `ActiveEffectConfigDnd35e` | |
| `activeEffects/BaseActiveEffect/data/ActiveEffectSystemModelBase.mts` | `activeEffects/BaseActiveEffect/data/ActiveEffectSystemModel.mts` | `ActiveEffectSystemModelBase` → `ActiveEffectSystemModel` | |
| `canvas/token/tokenDnd35e.mts` | `canvas/token/TokenDnd35e.mts` | `tokenDnd35e` (class) → `TokenDnd35e` | R.2.5 + R.2.9 violation: lowercase file + lowercase class |
| `helpers/logHelper.mts` | `helpers/LogHelper.mts` | — | R.2.5: file = class `LogHelper` |
| `helpers/fields/Dnd35eSectionField.mts` | `fields/SectionField.mts` | `Dnd35eSectionField` → `SectionField` | verified no Foundry collision (subagent check against types/ and Foundry v14 source); relocated to top-level `fields/` in Group 5g |

### R.3.3 Helper-type symbol renames (Group 9)

| Old | New | Note |
| --- | --- | ---- |
| `Dnd35eParentDoc` | `ParentDoc` | no collision |
| `Dnd35eFieldMeta` | `SchemaFieldMeta` | collision with `FieldOverridesStore.FieldMeta` discovered during PR 15; suffix-form `FieldMeta` already exists as the sheet-store runtime-resolved meta, so the schema-definition meta took the descriptive `SchemaFieldMeta` name |
| `Dnd35eOverrideOptions` | `OverrideOptions` | no collision |
| `Dnd35eSystemConfig` | `SystemConfig` | verify; escalate to `SystemConfigDnd35e` if needed |
| `Dnd35eBaseFlags` | `BaseFlags` | `Base` prefix is the accurate descriptor |
| `Dnd35eEffectChangeData` | `EffectChangeDataDnd35e` | **verified collision** with Foundry `EffectChangeData` |
| `Dnd35eChangeType` | `ChangeType` | verify |
| `DND35E_CHANGE_TYPE` | `CHANGE_TYPE` | verify |

(`Dnd35eSectionField` was promoted to §R.3.2 once verified no-collision.)

### R.3.4 Path-alias updates (`tsconfig.json`)

- Add: `"@documents/*": ["./src/documents/*"]`
- Retarget: `@items/*`, `@actors/*`, `@effects/*`, `@scene/*` → `./src/documents/...`
- Remove: `@entities/*`, `@ec/*`

`vite.config.ts` reads aliases via `vite-tsconfig-paths`, so only `tsconfig.json` needs editing for the bundler. Re-check that no other tool config (vitest, playwright, eslint) hard-codes the removed aliases.

### R.3.5 Cross-tree relocations & deletions

File relocations that change owning folder (not just casing/name):

| From | To | Reason |
| ---- | -- | ------ |
| `src/helpers/fieldBuilders.mts` | `src/fields/fieldBuilders.mts` | Field factory; co-locate with field types |
| `src/helpers/fields/Dnd35eSectionField.mts` | `src/fields/SectionField.mts` | Hoist out of `helpers/` (schema primitive, not utility helper) |
| `src/settings/currency/PriceField.mts` | `src/fields/PriceField.mts` | Schema field type, not a setting; reused by merchants/treasure |
| `src/settings/currency/PriceData.mts` | `src/fields/PriceData.mts` | Companion data class of PriceField |
| `src/settings/core/settings/unitOfMeasure.mts` | `src/settings/display/unitOfMeasure.mts` | Fold orphan setting into `display/` (broader settings reorg post-poc) |
| `src/entities/activeEffects/BaseActiveEffect/resolveChangeValue.mts` | `src/entities/activeEffects/BaseActiveEffect/logic/resolveChangeValue.mts` | Pure evaluation helper; matches `CoreMixin/logic/` and `Identifiable/logic/` convention |
| inline `getSchemaField()` in 3 files (DocumentSheetStore, FieldOverridesStore, resolveChangeValue) | `src/fields/getSchemaField.mts` | Triplicated schema-traversal helper; co-locate with field types |
| inline `syncOpenSheetTitle()` in 2 files (`activeEffects/registration.mts`, `ActiveEffectConfigStore.mts`) | `src/helpers/syncOpenSheetTitle.mts` | Duplicated 5-line helper; unlikely to catch it again later |

File deletions (backwards-compat aggregators — consumers re-point to category modules):

| File | Reason |
| ---- | ------ |
| `src/settings/constants/index.mts` | Re-export aggregator; header comment admits it's backwards-compat only |
| `src/settings/_types.mts` | Re-export aggregator; same |

Repo-wide `_types.mts` → `types.mts` rename (Group 5h) covers every remaining `_types.mts` file once the settings aggregator is gone. Each rename is mechanical: rename file, update imports.

Settings structural cleanup (Group 5f):
- `settings/core/registration.mts` loses its orchestrator role; orchestration of all category `registerXxxSettings()` calls moves to `settings/index.mts`.
- `settings/core/menus.mts` is removed; menu registration inlines into each category's own `registration.mts`.
- `settings/core/settings/unitOfMeasure.mts` moves to `settings/units/unitOfMeasure.mts` with its own `constants.mts`, `index.mts`, `registration.mts`, and (if needed) `sheet/` matching the standard category shape.
- `settings/core/` retains only hidden/internal settings (migration version, dev flags). Its `registration.mts` registers only those.

---

## R.4 Risks & mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Missed reference outside `src/` (tests, docs, e2e helpers, system.json, planning docs) | After each group: workspace-wide `grep_search` for the old symbol/path. Planning docs (`docs/migration-plan/**`) are allowed to retain historical references; production code must be clean. |
| Git case-only file rename on Windows | `DnD35eActiveEffect.mts` → `Dnd35eActiveEffect.mts` is one such case (then group 4c renames it again). Use a two-step `git mv` through a temp filename when needed. |
| Foundry world data | World data persists *type strings* (`'weapon'`, `'character'`, etc.) and document IDs — neither is touched. No data-migration needed. |
| ESLint import sort breakage after each rename | `npx eslint --fix <touched files>` after each group; the auto-fixer handles it. |
| E2E selectors | CSS selectors don't reference TS class names; the only risk is in helpers that import from `@ec/` or `@entities/`. Full E2E suite runs **per-PR** as part of pre-submission gating (see R.7); FV.4 is a final post-merge sanity pass. |
| Vitest / playwright / eslint configs referencing old aliases | After group 6a, grep configs for `@ec` and `@entities`. |
| Re-export barrels (`index.mts`) | Each group's checklist explicitly includes the sibling `index.mts` update. |
| Two-pass renames where a symbol AND its file both change (e.g. `DnD35eActiveEffect.mts` → `Dnd35eActiveEffect.mts` in group 2, then → `ActiveEffectDnd35e.mts` in group 4c) | Plan keeps the two changes in separate groups so each commit is reviewable. |
| Windows case-insensitive FS during `scene/` move and folder casing fixes (`region-document/` → `regionDocument/`, `BaseActiveEffect/` → `baseActiveEffect/`) | Two-step `git mv` through a temp name, same approach as Group 2. |
| Cross-tree relocations (PriceField, fieldBuilders, unitOfMeasure) breaking grep audits | Each relocation group ends with `grep_search` for old import paths workspace-wide; expected zero matches in `src/` and `tests/`. |
| Settings consumers relying on `settings/_types.mts` or `settings/constants/index.mts` aggregator re-exports | Group 5f deletes the aggregators after rewriting every importer to point at the owning category module; build verifies. |

---

## R.5 Completion checklist

Every numbered task ends with `npm run build` exit 0. Failures block the next task. Use `vscode_renameSymbol` for symbol renames where available (semantically safe), `git mv` for file/directory moves, `grep_search` + `replace_string_in_file` for stragglers.

### Group 1: Tab rename
- [x] G1.1 — `git mv src/entities/items/baseItem/sheet/tabs/Effects.vue ItemEffects.vue`
- [x] G1.2 — Update import in `src/entities/items/baseItem/sheet/tabs/index.mts`
- [x] G1.3 — Workspace `grep_search` for `Effects.vue`; fix any remaining references
- [x] G1.4 — `npm run build` clean; commit

### Group 2: `DnD` → `Dnd` casing
- [x] G2.1 — Rename file `DnD35eActiveEffect.mts` → `Dnd35eActiveEffect.mts` (use temp-name two-step on Windows)
- [x] G2.2 — Rename class `DnD35eActiveEffect` → `Dnd35eActiveEffect`
- [x] G2.3 — Rename type `DnD35eActiveEffectFlags` → `Dnd35eActiveEffectFlags`
- [x] G2.4 — Rename local const `DnD35eActiveEffectBase` → `Dnd35eActiveEffectBase`
- [x] G2.5 — Replace `DnD35e` → `Dnd35e` across production-code paths (case-sensitive; e.g. `src/`, `tests/`, and related type/runtime files), not attribution/docs-only references
- [x] G2.6 — Re-run eslint --fix on touched files
- [x] G2.7 — Run `grep_search` for `DnD35e` from the workspace root; expect zero matches in `src/` and `tests/` (non-code references such as README/docs/scripts may remain intentionally)
- [x] G2.8 — `npm run build` clean; commit

### Group 3a: `BaseDnd35eSystemData` → `DocumentSystemData`
- [x] G3a.1 — Rename file `BaseDnd35eSystemData.mts` → `DocumentSystemData.mts`
- [x] G3a.2 — Rename symbols: `BaseDnd35eSystemData` → `DocumentSystemData`, `BaseDnd35eSystemSource` → `DocumentSystemSource`
- [x] G3a.3 — Update all imports
- [x] G3a.4 — `npm run build` clean; commit

### Group 3b: `PhysicalSystemData.mts` → `PhysicalItemSystemData.mts`
- [x] G3b.1 — `git mv` the file
- [x] G3b.2 — Update sibling `index.mts` and any other importers
- [x] G3b.3 — `npm run build` clean; commit

### Group 3c: `ItemSystemModelBase` → `ItemSystemModel`
- [x] G3c.1 — Rename file
- [x] G3c.2 — Rename class symbol
- [x] G3c.3 — Update imports
- [x] G3c.4 — `npm run build` clean; commit

### Group 3d: `ActorSystemModelBase` → `ActorSystemModel`
- [x] G3d.1 — Rename file
- [x] G3d.2 — Rename class symbol (and the `interface ActorSystemModelBase` mirror)
- [x] G3d.3 — Update imports
- [x] G3d.4 — `npm run build` clean; commit

### Group 3e: `ActiveEffectSystemModelBase` → `ActiveEffectSystemModel`
- [x] G3e.1 — Rename file
- [x] G3e.2 — Rename class symbol
- [x] G3e.3 — Update imports
- [x] G3e.4 — `npm run build` clean; commit

### Group 4a: `Dnd35eDocument` (mixin + types) → `DocumentDnd35e`
- [x] G4a.1 — Rename file `Dnd35eDocument.mts` → `DocumentDnd35e.mts`
- [x] G4a.2 — Rename: `Dnd35eDocument` → `DocumentDnd35e`, `Dnd35eDocumentMixin` → `DocumentMixin`, `Dnd35eDocumentProperties` → `DocumentProperties`, `Dnd35eDocumentConstructor` → `DocumentConstructor` (no Foundry collision)
- [x] G4a.3 — Rename file `Dnd35eDocumentFlags.mts` → `DocumentFlagsDnd35e.mts`; rename type `Dnd35eDocumentFlags` → `DocumentFlagsDnd35e` (**verified collision** with Foundry `DocumentFlags`)
- [x] G4a.4 — Update all imports / re-export barrels
- [x] G4a.5 — `npm run build` clean; commit

### Group 4b: `Dnd35eDocumentSystemModel` → `DocumentSystemModel`
- [x] G4b.1 — Rename file `Dnd35eDocumentSystemModel.mts` → `DocumentSystemModel.mts`
- [x] G4b.2 — Rename class symbol
- [x] G4b.3 — Update imports
- [x] G4b.4 — `npm run build` clean; commit

### Group 4c: `Dnd35eActiveEffect` → `ActiveEffectDnd35e`
- [x] G4c.1 — Rename file `Dnd35eActiveEffect.mts` → `ActiveEffectDnd35e.mts`
- [x] G4c.2 — Rename: `Dnd35eActiveEffect` (class) → `ActiveEffectDnd35e`, `Dnd35eActiveEffectFlags` → `ActiveEffectFlags`, `Dnd35eActiveEffectBase` (const) → `ActiveEffectBase`, `Dnd35eActiveEffectSource` → `ActiveEffectSourceDnd35e` (**verified collision**), `Dnd35eActiveEffectSystemSource` → `ActiveEffectSystemSourceDnd35e` (**verified collision**)
- [x] G4c.3 — `ActiveEffectProxyDnd35e` already in suffix form — verify, no rename
- [x] G4c.4 — Update all imports / re-export barrels
- [x] G4c.5 — `npm run build` clean; commit

### Group 4d: `Dnd35eActiveEffectConfig` → `ActiveEffectConfigDnd35e`
- [x] G4d.1 — Rename file
- [x] G4d.2 — Rename class symbol
- [x] G4d.3 — Update imports / re-export barrels (Secret, Material, General sheets all extend this)
- [x] G4d.4 — `npm run build` clean; commit

### Group 5a: `PhysicalItemDnd35e.mts` → `PhysicalItem.mts`
- [x] G5a.1 — Rename file (class already named `PhysicalItem`)
- [x] G5a.2 — Update sibling `index.mts`
- [x] G5a.3 — `grep_search` for `PhysicalItemDnd35e` workspace-wide
- [x] G5a.4 — `npm run build` clean; commit

### Group 5b: `IdentifiableItem.mts` → `IdentifiableDocument.mts`
- [x] G5b.1 — Rename file
- [x] G5b.2 — Update sibling `index.mts` import path
- [x] G5b.3 — `grep_search` for `IdentifiableItem` (file path only — class is `IdentifiableDocument`)
- [x] G5b.4 — `npm run build` clean; commit

### Group 5c: `applyIdentifiableSchema.mts` → `IdentifiableSchemaMixin.mts`
- [x] G5c.1 — Rename file
- [x] G5c.2 — Update sibling `index.mts`
- [x] G5c.3 — `npm run build` clean; commit

### Group 5d: `BaseItemSheet.mts` → `ItemSheetDnd35e.mts`
- [x] G5d.1 — Rename file (class already named `ItemSheetDnd35e`)
- [x] G5d.2 — Update sibling `index.mts`
- [x] G5d.3 — `grep_search` for `BaseItemSheet`
- [x] G5d.4 — `npm run build` clean; commit

### Group 5e: Non-`entities/` casing & file-name fixes
- [x] G5e.1 — Rename file `src/canvas/token/tokenDnd35e.mts` → `TokenDnd35e.mts` (two-step on Windows)
- [x] G5e.2 — Rename class `tokenDnd35e` → `TokenDnd35e`; update sibling `index.mts`; workspace `grep_search` for `tokenDnd35e` lowercase
- [x] G5e.3 — Rename file `src/helpers/logHelper.mts` → `LogHelper.mts` (two-step on Windows); update sibling `index.mts` and all importers
- [x] G5e.4 — `npm run build` clean; commit

### Group 5f: Settings structural cleanup
- [x] G5f.1 — Move orchestrator logic from `src/settings/core/registration.mts` into `src/settings/index.mts` (import + call each category's `registerXxxSettings()`)
- [x] G5f.2 — Inline each category's menu registration from `src/settings/core/menus.mts` into that category's own `registration.mts` (e.g. game-rules menu → `gameRules/registration.mts`); delete `core/menus.mts`
- [x] G5f.3 — Move `unitOfMeasure.mts` content into `src/settings/display/`; merge its registration into `display/registration.mts` (`registerDisplaySettings` registers it alongside other display settings); rename `registerRootSettings` symbol away (it becomes part of `registerDisplaySettings`)
- [x] G5f.4 — `core/registration.mts` retains only hidden/internal settings (system migration version, dev flags); remove the orchestration block
- [x] G5f.5 — Delete `src/settings/core/settings/unitOfMeasure.mts` and any now-empty `core/settings/` subfolder
- [x] G5f.6 — Promote shared sheet infrastructure out of `core/`: `git mv src/settings/core/sheet → src/settings/shared/sheet` (`GenericSettingsApp.vue`, `SettingsTable/`, `settingsStore.mts`, barrel). Rationale: after `core/` is narrowed to hidden settings only, this shared UI plumbing no longer belongs there. The `shared/` folder is named in anticipation of future cross-cutting helpers (composables, formatters) as settings grow. Update all importers (`@settings/core/sheet/*` → `@settings/shared/sheet/*`; ~6 files including `VueAppBaseMixin`, `VueSettingsMixin`, `DamageReductionTable.vue`, `CurrencySettingsApp.vue`, `PhysicalItemStore`, `DisplaySettingsConfig`)
- [x] G5f.7 — Delete `src/settings/constants/index.mts` aggregator and `src/settings/_types.mts` aggregator; rewrite every importer to point at the owning category module (`grep_search` for `@settings/constants` and `@settings/_types`)
- [x] G5f.8 — Update `src/settings/index.mts` to call each category's `registerXxxSettings()`; update any consumer imports of the unit-of-measure setting key if its export path changed
- [x] G5f.9 — `npm run build` clean; commit

### Group 5g: `helpers/` relocations (field-related files)
- [x] G5g.1 — Create `src/fields/` directory + `src/fields/index.mts` (empty barrel)
- [x] G5g.2 — Add `@fields/*` → `./src/fields/*` to `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` (all three configs)
- [x] G5g.3 — `git mv src/helpers/fields/Dnd35eSectionField.mts src/fields/SectionField.mts`; rename symbol `Dnd35eSectionField` → `SectionField` (this is the R.3.2 promotion); update importers
- [x] G5g.4 — `git mv src/helpers/fieldBuilders.mts src/fields/fieldBuilders.mts`; update importers
- [x] G5g.5 — `git mv src/settings/currency/PriceField.mts src/fields/PriceField.mts`; update importers; workspace `grep_search` for `@settings/currency/PriceField`
- [x] G5g.6 — `git mv src/settings/currency/PriceData.mts src/fields/PriceData.mts`; update importers; workspace `grep_search` for `@settings/currency/PriceData`
- [x] G5g.7 — Update `src/fields/index.mts` to export all relocated files
- [x] G5g.8 — Delete the now-empty `src/helpers/fields/` directory + its `index.mts`
- [x] G5g.9 — `npm run build` clean; commit

### Group 5h: `_types.mts` → `types.mts` repo-wide
- [x] G5h.1 — Workspace `file_search` for `_types.mts` to inventory all files
- [x] G5h.2 — Per file: `git mv _types.mts types.mts`; workspace `grep_search` for the old import path (e.g. `from './_types.mjs'`) and update each
- [x] G5h.3 — Workspace `grep_search` for `_types.mjs` and `_types.mts` after all renames; zero matches expected in production code
- [x] G5h.4 — `npm run build` clean; commit

### Group 5i: Method/file rehoming (DRY + co-location)
- [x] G5i.1 — Create `src/fields/getSchemaField.mts` with the extracted helper (~20 lines, takes `document` and `fieldPath`, returns `DataField | undefined`).
- [x] G5i.2 — Update `src/fields/index.mts` to export it.
- [x] G5i.3 — Replace the inline copy in `src/entities/components/CoreMixin/sheet/DocumentSheetStore.mts` with an import from `@fields/`.
- [x] G5i.4 — Replace the inline copy in `src/entities/components/CoreMixin/sheet/stores/FieldOverridesStore.mts` with the import.
- [x] G5i.5 — Replace the inline copy in `src/entities/activeEffects/BaseActiveEffect/resolveChangeValue.mts` with the import.
- [x] G5i.6 — Create `src/entities/activeEffects/BaseActiveEffect/logic/` folder with `index.mts`.
- [x] G5i.7 — `git mv src/entities/activeEffects/BaseActiveEffect/resolveChangeValue.mts src/entities/activeEffects/BaseActiveEffect/logic/resolveChangeValue.mts`; update sibling `index.mts` re-exports; update importers (`grep_search` `resolveChangeValue` workspace-wide).
- [x] G5i.8 — Create `src/helpers/syncOpenSheetTitle.mts` with the extracted 5-line helper.
- [x] G5i.9 — Update `src/helpers/index.mts` to export it.
- [x] G5i.10 — Replace inline copies in `src/entities/activeEffects/registration.mts` and `src/entities/activeEffects/BaseActiveEffect/sheet/ActiveEffectConfigStore.mts` with imports from `@helpers/`.
- [x] G5i.11 — `npm run build` clean; commit.

### Group 6: Directory move `entities/` → `documents/`
- [x] G6.1 — Edit `tsconfig.json`: add `"@documents/*": ["./src/documents/*"]`; retarget `@items/*`, `@actors/*`, `@effects/*` to `./src/documents/...`; remove `@entities/*` and `@ec/*`
- [x] G6.2 — `git mv src/entities src/documents`
- [x] G6.3 — `git mv src/documents/components/CoreMixin src/documents/document`
- [x] G6.4 — `git mv src/documents/components/Identifiable src/documents/identifiable`
- [x] G6.5 — Remove the now-empty `src/documents/components/` directory
- [x] G6.6 — Workspace replace: `@ec/CoreMixin/` → `@documents/document/` (string replace)
- [x] G6.7 — Workspace replace: `@ec/Identifiable/` → `@documents/identifiable/`
- [x] G6.8 — Workspace replace: `@entities/` → `@documents/`
- [x] G6.9 — Workspace replace in non-code files (docs, comments) of `src/entities/` → `src/documents/` and `entities/components/` → `documents/...` paths
- [x] G6.10 — `grep_search` `@ec/` workspace-wide: zero matches expected outside planning docs and git history
- [x] G6.11 — `grep_search` `@entities/` workspace-wide: zero matches expected outside planning docs and git history
- [x] G6.12 — Check `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `package.json` scripts for hardcoded paths
- [x] G6.13 — `npm run build` clean; commit

### Group 6b: Move `src/scene/` into `src/documents/scene/`
- [x] G6b.1 — Edit `tsconfig.json`: retarget `@scene/*` from `./src/scene/*` to `./src/documents/scene/*`
- [x] G6b.2 — `git mv src/scene src/documents/scene` (two-step on Windows via temp folder name if case collision risk; here it's a fresh target so a single move should be fine)
- [x] G6b.3 — `git mv src/documents/scene/region-document src/documents/scene/regionDocument` (two-step on Windows)
- [x] G6b.4 — `git mv src/documents/scene/token-document src/documents/scene/tokenDocument` (two-step on Windows)
- [x] G6b.5 — `git mv src/documents/scene/region-behaviour src/documents/scene/regionBehaviour` (two-step on Windows; British spelling preserved)
- [x] G6b.6 — Workspace replace: `@scene/region-document/` → `@scene/regionDocument/`, `@scene/token-document/` → `@scene/tokenDocument/`, `@scene/region-behaviour/` → `@scene/regionBehaviour/`
- [x] G6b.7 — Workspace `grep_search` for `src/scene/` and kebab-case scene subfolders; zero matches expected in production code
- [x] G6b.8 — Update `src/main.mts` and `src/global.mts` scene imports
- [x] G6b.9 — `npm run build` clean; commit

### Group 7: Folder casing (documents/ + vue/components/)
- [x] G7.1 — Audit all PascalCase folders under `src/documents/` and decide per-folder: keep PascalCase (proper noun, brand) or normalize to camelCase (common noun).
- [x] G7.2 — `git mv src/documents/activeEffects/BaseActiveEffect src/documents/activeEffects/baseActiveEffect` (two-step on Windows via temp name).
- [x] G7.3 — Apply remaining folder renames identified in G7.1 (note: `items/components/Physical/` and `items/components/Equippable/` are NOT renamed here — Group 8 relocates them into `items/physical/physicalItem/` and `items/physical/equippableItem/`).
- [x] G7.4 — `git mv src/vue/components/Fields src/vue/components/fields` (two-step on Windows); `git mv src/vue/components/fields/FormGroups src/vue/components/fields/formGroups` (two-step on Windows). Single-component packaging folders like `TabDivider/` retain PascalCase per R.2.9.
- [x] G7.5 — Workspace replace import paths and any string references: `vue/components/Fields/` → `vue/components/fields/`, `vue/components/fields/FormGroups/` → `vue/components/fields/formGroups/`; `grep_search` to confirm zero leftover production-code matches.
- [x] G7.6 — Update all import paths; eslint --fix on touched files.
- [x] G7.7 — `npm run build` clean; commit.

### Group 8: Reorganize `documents/items/` into `physical/` + `metaphysical/` buckets
- [x] G8.1 — Verify zero imports of the three dead files (`Alignment.mts`, `Changes.mts`, `CursableItem.mts`) — `grep_search` workspace-wide must return only the files themselves.
- [x] G8.2 — `git rm src/documents/items/components/Alignment.mts src/documents/items/components/Changes.mts src/documents/items/components/CursableItem.mts`.
- [x] G8.3 — Create `src/documents/items/physical/` and `src/documents/items/metaphysical/` directories (placeholder `index.mts` or `.gitkeep` if needed).
- [x] G8.4 — `git mv src/documents/items/components/Physical src/documents/items/physical/physicalItem` (two-step on Windows if case-only collision risk).
- [x] G8.5 — `git mv src/documents/items/components/Equippable src/documents/items/physical/equippableItem`.
- [x] G8.6 — `git mv src/documents/items/weapon src/documents/items/physical/weapon`.
- [x] G8.7 — `git mv src/documents/items/Dnd35eBuff src/documents/activeEffects/buff` (folder cased lowercase as part of the move). Rename file `Dnd35eBuff.mts` → `Buff.mts`. Prepend a header comment marking the file as **parked work-in-progress reference — not registered, not used, retained for alpha.9 Buff AE Core (and expansion in beta.3); see `docs/architecture/property-maps/PropertyMap-ActiveEffects.md` §5**. The single commented-out class line stays as-is.
- [x] G8.8 — Remove the now-empty `src/documents/items/components/` directory.
- [x] G8.9 — Workspace replace of import paths: `@items/components/Physical/` → `@items/physical/physicalItem/`, `@items/components/Equippable/` → `@items/physical/equippableItem/`, `@items/weapon/` → `@items/physical/weapon/`. `@items/Dnd35eBuff/` has zero imports (verified — the placeholder class line is commented out) so no path replacement needed; if any straggler reference is found, repoint to `@effects/buff/`.
- [x] G8.10 — eslint --fix on touched files.
- [x] G8.11 — `grep_search` workspace-wide for `items/components` — zero matches expected in production code.
- [x] G8.12 — `npm run build` clean; commit.

### Group 9: Helper-type prefix sweep
- [x] G9.1 — Verified-collision rename first: `Dnd35eEffectChangeData` → `EffectChangeDataDnd35e` (file + symbol + imports).
- [x] G9.2 — Bare renames: `Dnd35eParentDoc` → `ParentDoc`, `Dnd35eFieldMeta` → `SchemaFieldMeta` (collision with `FieldOverridesStore.FieldMeta` — see R.3.3), `Dnd35eOverrideOptions` → `OverrideOptions`, `Dnd35eSectionField` → `SectionField`, `Dnd35eBaseFlags` → `BaseFlags`, `Dnd35eChangeType` → `ChangeType`, `DND35E_CHANGE_TYPE` → `CHANGE_TYPE`.
- [x] G9.3 — Verify-during-execution: confirm `Dnd35eSystemConfig` → `SystemConfig` does not collide with Foundry; if it does, use `SystemConfigDnd35e`.
- [x] G9.4 — Update all imports / barrels; eslint --fix.
- [x] G9.5 — `grep_search` workspace-wide for `Dnd35e` — remaining matches should be only the verified colliding names (`*Dnd35e` suffix form) plus planning docs.
- [x] G9.6 — `npm run build` clean; commit.

### Final validation
- [x] FV.1 — Workspace `grep_search` for old prefix forms (`DnD35e`, `BaseDnd35eSystemData`, `BaseDnd35eSystemSource`, `ItemSystemModelBase`, `ActorSystemModelBase`, `ActiveEffectSystemModelBase`, `PhysicalSystemData.mjs`, `PhysicalItemDnd35e`, `BaseItemSheet`, `applyIdentifiableSchema.mjs`, `Dnd35eDocument` class, `Dnd35eDocumentMixin`, `Dnd35eDocumentSystemModel`, `Dnd35eDocumentFlags`, `Dnd35eDocumentProperties`, `Dnd35eDocumentConstructor`, `Dnd35eActiveEffect` class, `Dnd35eActiveEffectFlags`, `Dnd35eActiveEffectConfig`, `Dnd35eActiveEffectSystemSource`, `Dnd35eActiveEffectSource`, `Dnd35eParentDoc`, `Dnd35eFieldMeta`, `Dnd35eOverrideOptions`, `Dnd35eSectionField`, `Dnd35eSystemConfig`, `Dnd35eBaseFlags`, `Dnd35eEffectChangeData`, `Dnd35eChangeType`, `DND35E_CHANGE_TYPE`, `tokenDnd35e` (lowercase class form), `logHelper.mjs`, `src/scene/`, `region-document`, `token-document`, `region-behaviour`, `@settings/_types`, `@settings/constants`, `_types.mjs`, `_types.mts`, `@ec/`, `@entities/`, `src/entities/`, inline `getSchemaField` definitions, inline `syncOpenSheetTitle` definitions, top-level `BaseActiveEffect/resolveChangeValue.mjs`). Production code must show zero matches; planning docs / changelog allowed.
- [x] FV.2 — `npm run build` clean
- [x] FV.3 — `npx vitest run` green
- [x] FV.4 — **Full Playwright E2E suite** (`npx playwright test`) green on the final merged `dev` tree (one last sanity pass; each PR already ran E2E pre-merge).
- [x] FV.5 — `.github/copilot-instructions.md` and `.github/instructions/dnd35e-patterns.instructions.md` updated to reflect the new `documents/` vocabulary, the suffix rule (with verified-collision exceptions), the `Base`-over-`Dnd35e` preference, the file-name-vs-grouped-helpers exception, the R.2.9 file-casing rule, and the R.2.10 `types.mts` convention.
- [x] FV.6 — Mark this phase doc Complete (no roadmap row needed — see R.7).

---

## R.6 Truly-deferred items (not part of this refactor)

- **`Dnd35eBuff` placeholder content**. The class body itself stays commented-out work-in-progress. Group 8 relocates the file from `items/Dnd35eBuff/Dnd35eBuff.mts` to `activeEffects/buff/Buff.mts` (Buff is an AE subtype in dnd35e, not an item type — see `PropertyMap-ActiveEffects.md` §5). Actual implementation lands in alpha.9 Buff AE Core (and expands in beta.3). This refactor does not uncomment or rewrite the placeholder body; it just parks it in the correct location.
- **Sheet boilerplate helper**. Reconsider once 5+ item types exist and per-type `*Sheet.mts` wrappers feel repetitive.
- unit tests around unit of measurement settings and currency settings

---

## R.7 PR strategy

The refactor ships as a sequence of focused PRs, **not** one mega-PR. Each PR must independently leave `npm run build` clean, the unit suite green, **and the full Playwright E2E suite green** — the E2E run isn't long enough to defer.

**Branch naming**: one branch per PR, named `refactor/pr{NN}-{kebab-summary}` where `{NN}` is the two-digit PR number from the group-to-PR table below and `{kebab-summary}` is a short kebab-case theme. Examples: `refactor/pr01-tab-and-casing`, `refactor/pr02-drop-base-marker`, `refactor/pr08-entities-to-documents`. Branches auto-delete on merge.

**Per-PR workflow** (repeats for every row in the group-to-PR table below):

1. Pull `dev`, create a fresh branch named per the convention above.
2. Implement the PR's scope in as many commits as makes sense (granular per checklist item is fine; squashing on merge is not done).
3. Run `npm run build`, unit suite, **and full E2E suite**; all must pass.
4. Open the PR.
5. Reviewer reviews; address feedback as additional commits on the same branch.
6. Reviewer approves and signals approval.
7. Pull `dev`, merge it into the PR branch (resolve conflicts if any), re-run build + tests, push.
8. PR merges to `dev`.
9. Return to step 1 for the next PR.

**Commits stay granular** — typically one commit per checklist item (G1.1, G1.2, etc.). No squashing on merge. This matches the rest of the repo's commit conventions and keeps blame/bisect useful for "why did this rename happen?" questions years later.

**Sizing principles**:
- **Mechanical sweep PRs** can touch many files (50+) when the diff is grep-verifiable and the change pattern is uniform across all sites.
- **Architectural PRs** target tighter file counts (10-20) and the description must call out the *why*, not just the *what*.
- **Move PRs** ship the directory rename, alias retarget, and import updates as one unit — splitting them produces broken intermediate states.
- Each PR description includes: which groups, grep audit results (expected zero matches for old names), and `npm run build` + unit + E2E confirmation.

**Group-to-PR mapping** (proposed; adjustable as work progresses):

| PR | Groups | Theme | Size profile |
| -- | ------ | ----- | ------------ |
| 1  | Doc + G1 | Land this planning doc on `dev` + Effects tab rename | Tiny; doc-only commit + one-file rename |
| 2  | G2 | `DnD35e` → `Dnd35e` casing sweep | Mechanical sweep; warm-up code PR |
| 3  | G3a–e | Drop `Base` marker from SystemModel/SystemData | Mechanical sweep; five same-pattern renames bundled |
| 4  | G4a + G4b | `Dnd35eDocument` → `DocumentDnd35e` + system model | Architectural rename of cross-document base |
| 5  | G4c + G4d | `Dnd35eActiveEffect` + Config rename | Architectural rename of AE base |
| 6  | G5a–G5e | Misc file renames (PhysicalItem, IdentifiableDocument, IdentifiableSchemaMixin, ItemSheetDnd35e) + Token/LogHelper casing | Mechanical sweep; small |
| 7  | G5f | Settings cleanup (`core/` flattening + aggregator deletions) | Architectural; reviewer needs settings-domain context |
| 8  | G5g + G5h + G5i | Cross-tree relocations (`fields/` hoist, `_types.mts`→`types.mts`, method rehoming) | Mechanical sweep |
| 9  | G6 | `entities/` → `documents/` directory move | Largest PR; the centerpiece move |
| 10 | G6b | `scene/` → `documents/scene/` + kebab→camel sub-folders | Move PR; medium |
| 11 | G7 | Folder casing inside `documents/` (`BaseActiveEffect/` → `baseActiveEffect/`) | Mechanical sweep |
| 12 | G8 | Items `physical/` + `metaphysical/` buckets + dead-file deletions | Substantive items/ reorg |
| 13 | G9 | Helper-type prefix sweep | Mechanical sweep |
| 14 | FV | Final validation (workspace-wide grep audit + doc updates) | No code changes; verification only |

**Dependency order**: PRs land in numerical order. PR 9 (the big `entities/` move) depends on PRs 1–8 being merged — doing the directory move first would force every subsequent rename to re-write paths twice. PRs after 9 operate on the post-move tree.

**Roadmap placement**: This refactor is **not** a roadmap row. It's mechanical cleanup, no feature work, no Phase-N dependency block. It lives entirely in `docs/migration-plan/poc/refactor-naming-conventions.md`; the roadmap stays focused on feature phases.
