import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { EFFECT_CHANGE_TARGET } from '@effects/baseActiveEffect/data/constants.mjs';
import { ACTION_TYPE } from '@items/baseItem/actions/constants.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';

import { getPathBasedFamiliarAliases, getPathBasedFamiliarLabel, getPathBasedLabel, normalizeLabel } from './schemaWalker.mjs';
import type { AspectGroup, FamiliarContext, FieldAspect } from './types.mjs';
import { isFieldAspect } from './types.mjs';

/** Any document a Group Change Target can expand against — actor-scoped groups take the actor, item-scoped groups take the item. */
type ChangeTargetGroupHost = ActorDnd35e | ItemDnd35e;

/**
 * Map of context name → live document, the same name-keyed convention `FormulaData.resolve()`
 * uses for actual formula-value resolution (its `documentDataMap` param). A group never expands
 * against an implicit/ambient "the current host" — it declares which named context it needs
 * (`ChangeTargetGroup.contextName`), and the caller supplies a map from names to documents, e.g.
 * `{ [EFFECT_CHANGE_TARGET.ITEM]: thisItem }`. This is what makes multiple simultaneously-live
 * contexts of the same kind (e.g. a future `attacker`/`defender` pair) resolvable without
 * ambiguity — each gets its own name in the map instead of overloading a single `scope`.
 */
type ChangeTargetGroupContextMap = Record<string, ChangeTargetGroupHost>;

/**
 * A group of related AE change targets that expand to concrete field paths at apply
 * time (poc §7.7). D35E solved this with `getChangeFlat()` + `buffTargets`, a tightly-coupled
 * central expansion function — this design decouples registration instead: each phase
 * registers its own groups when its data models land, and the apply loop/picker stay
 * generic.
 */
interface ChangeTargetGroup {
  /**
   * Unique key stored on the AE change — always a real canonical formula reference,
   * `#<contextName>.<treePath>` (e.g. "#actor.saves.all", "#item.meleeWeaponAttacks.attackToHit"),
   * derived by `registerChangeTargetGroup()` rather than hand-authored. This is the exact same
   * `#context.path` syntax used everywhere else in the system (formula values, `condition`
   * formulas, and `$conditional()` branch targets — see `resolveChangeKey.mts`'s
   * `#item.foo`/`#weapon.foo` precedent) — a group key is NOT a separate invented syntax,
   * it's a formula reference whose resolved "value" happens to be a fan-out to many real
   * field paths instead of one. Because it's real formula syntax, `AspectPicker`'s existing
   * `canonicalizeFormula`/`localizeFormula`/`resolveFamiliarLeafToAccessPath` round-trip it
   * for free (e.g. displayed to the user as `#Weapon.MeleeWeaponAttacks.AttackDamage`) with
   * zero group-specific UI code. The context a group belongs to is legible directly from the
   * stored key itself, so two groups can never collide by reusing the same key for different
   * contexts.
   */
  key: string;
  /**
   * Canonical schema-style tree path where this entry is nested in the familiar
   * property tree — e.g. `['saves', 'all']` nests it under the real `saves` branch
   * alongside `fort`/`reflex`/`will`. Also used to resolve this entry's own
   * `label`/`familiarLabel`/`familiarAliases` from the localization JSON at
   * `${prefix}.FIELDS.saves.all.*` — the exact same convention real schema fields use
   * (see `saves.all` in `src/lang/en/actors.json`) — so its displayed identifier is
   * never a hand-maintained string that can drift out of sync with how the real
   * `saves` branch itself resolves.
   */
  treePath: string[];
  /** LOCALIZATION_PREFIXES to search when resolving `treePath`'s label/familiarLabel/familiarAliases. */
  localizationPrefixes: string[];
  /** I18n key for this group's category header in the FF picker dropdown (currently unused; reserved). */
  category: string;
  /**
   * The named context this group resolves against — e.g. `EFFECT_CHANGE_TARGET.ITEM`/`.ACTOR`.
   * At apply/picker time, the caller's `ChangeTargetGroupContextMap` is looked up by this exact
   * name to find the live document to `expand()` against (or which key-picker branch to appear
   * under). There is no default — every group must say which context it belongs to, so adding a
   * new named role later (e.g. `attacker`/`defender`) never requires guessing which existing
   * groups silently meant "the actor".
   */
  contextName: string;
  /** Expand to concrete field paths on the live document found at `contextName` in the context map. */
  expand(host: ChangeTargetGroupHost): string[];
}

/** Registry — populated by later phases as their data models land. */
const changeTargetGroups = new Map<string, ChangeTargetGroup>();

/**
 * Register a group, computing its `key` as the canonical formula reference
 * `#<contextName>.<treePath>` — callers never hand-author a key, so a group's context
 * is always legible from the key itself and can't collide across contexts (see
 * `ChangeTargetGroup.key`/`contextName`).
 */
function registerChangeTargetGroup(group: Omit<ChangeTargetGroup, 'key'>): void {
  const key = `#${group.contextName}.${group.treePath.join('.')}`;
  changeTargetGroups.set(key, { ...group, key });
}

/**
 * Resolve a change key to one or more concrete field paths.
 * If the key is a registered group, looks up its declared `contextName` in `documentDataMap`
 * and expands against the document found there. Returns `[]` (dropping the change) if that
 * name isn't present in the map — a group can never silently fall back to the wrong document.
 * Keys that aren't a registered group pass through unchanged as a single-element array.
 */
function resolveChangeTargets(key: string, documentDataMap: ChangeTargetGroupContextMap): string[] {
  const group = changeTargetGroups.get(key);
  if (!group) return [key];
  const host = documentDataMap[group.contextName];
  if (!host) {
    console.warn(`[changeTargetGroups] "${key}" needs context "${group.contextName}", which wasn't provided — dropping this change.`);
    return [];
  }
  return group.expand(host);
}

/**
 * Resolve a registered Group Change Target's own official label (e.g. "All Saves" for
 * `#actor.saves.all`) for plain-text display contexts (not formulas) — e.g. `EffectChangeRow`'s
 * key column, which otherwise has no schema field to look a label up on. Returns undefined
 * for keys that aren't a registered group.
 */
function getChangeTargetGroupLabel(key: string): string | undefined {
  const group = changeTargetGroups.get(key);
  if (!group) return undefined;
  return getPathBasedLabel(group.treePath.join('.'), group.localizationPrefixes) ?? group.key;
}

/**
 * Expand any Group Change Target keys within `changes` into one entry per concrete
 * field path — e.g. a change with key "#actor.saves.all" becomes three cloned changes,
 * one per `system.saves.*` field. Non-group keys pass through unchanged (single-element
 * result). Called from both `ActorDnd35e.applyActiveEffects()` (actor-scoped groups) and
 * `ItemDnd35e.applyActiveEffects()` (item-scoped groups) between sorting and stacking, so
 * each expanded field then becomes an independent stacking candidate. Extracted as its own
 * function (rather than inlined) so it can be unit-tested without a full Actor/Item document.
 */
function expandChangeTargetGroups<T extends { key?: string }>(changes: T[], documentDataMap: ChangeTargetGroupContextMap): T[] {
  return changes.flatMap(change => {
    if (!change.key) return [change];
    return resolveChangeTargets(change.key, documentDataMap).map(key => ({ ...change, key }));
  });
}

/**
 * Append registered Group Change Target entries as synthetic leaf `FieldAspect`s onto
 * a clone of `context`'s property tree — for use **only** by the AE change *key* picker
 * (`AspectPicker`'s `familiar-context` prop). Never call this for a formula *value*
 * context (Value/Condition columns) — groups expand a change's `key` to many field
 * paths, which has no meaning as a single resolvable formula value.
 *
 * Each group's `treePath` (e.g. `['saves', 'all']`) is used both to nest the synthetic
 * leaf inside the existing branch it groups (cloning branches along the way, so it's
 * discovered in the picker dropdown alongside the real fields, e.g. `#character.saves.`
 * lists `all` next to `fort`/`reflex`/`will`) AND to resolve the leaf's own
 * `label`/`familiarLabel`/`familiarAliases` from the localization JSON at that same
 * path — identical to how real schema fields resolve their own labels, so nothing here
 * is a hand-maintained/hardcoded display string. Does not mutate `context`; returns a
 * new object each call.
 *
 * `contextName` selects which registered groups are offered — pass `EFFECT_CHANGE_TARGET.ITEM`
 * when building the item-targeted key-picker branch so actor-only groups (e.g. `#actor.saves.all`)
 * don't leak into an item's tree, and vice versa. Required (no default) — the caller must always
 * say which named context it's building a tree for, same as `resolveChangeTargets`/
 * `expandChangeTargetGroups`.
 */
function withChangeTargetGroups(context: FamiliarContext, contextName: string): FamiliarContext {
  const groups = [...changeTargetGroups.values()].filter(group => group.contextName === contextName);
  if (groups.length === 0) return context;
  const properties: AspectGroup = { ...context.properties };
  for (const group of groups) {
    const schemaPath = group.treePath.join('.');
    const familiarLabel = getPathBasedFamiliarLabel(schemaPath, group.localizationPrefixes);
    const officialLabel = getPathBasedLabel(schemaPath, group.localizationPrefixes);
    const display = familiarLabel ?? officialLabel ?? group.key;

    const aliases = getPathBasedFamiliarAliases(schemaPath, group.localizationPrefixes);
    const displayIdentifier = normalizeLabel(display);
    const officialIdentifier = normalizeLabel(officialLabel);
    if (officialIdentifier && officialIdentifier !== displayIdentifier && !aliases.includes(officialIdentifier)) {
      aliases.push(officialIdentifier);
    }

    const leaf: FieldAspect = {
      type: 'string',
      accessPath: group.key,
      display,
      isGroup: true,
      ...(aliases.length ? { aliases } : {}),
    };

    const leafKey = group.treePath[group.treePath.length - 1];
    let branch = properties;
    for (const segment of group.treePath.slice(0, -1)) {
      const existing = branch[segment];
      const clonedBranch: AspectGroup = existing && !isFieldAspect(existing) ? { ...(existing as AspectGroup) } : {};
      branch[segment] = clonedBranch;
      branch = clonedBranch;
    }
    branch[leafKey] = leaf;
  }
  return { ...context, properties };
}

// ─── Proof-of-concept registration ────────────────────────────────────────────
// `system.saves.fort`/`.reflex`/`.will` are plain derived numbers today (no per-save
// base/ability breakdown yet — that's a later phase's concern), so this group's
// `expand()` doesn't need the `actor` argument. This was originally scoped for a
// later phase in early planning; registered here now as the POC since the target
// fields already exist.
registerChangeTargetGroup({
  contextName: EFFECT_CHANGE_TARGET.ACTOR,
  treePath: ['saves', 'all'],
  localizationPrefixes: ['dnd35e.CREATURE'],
  category: 'dnd35e.Formula.ChangeGroups.category',
  expand: () => ['system.saves.fort', 'system.saves.reflex', 'system.saves.will'],
});

// ─── Weapon attack category groups (item-scoped) ──────────────────────────────
// A weapon's `system.actions` is an array of discriminated attack subtypes (melee/
// ranged), so "every melee attack this weapon has" can't be a single schema field path
// — it depends on how many actions the weapon has and which indices are melee vs.
// ranged. These groups fan a single AE change out across every matching action's index
// at apply time (e.g. a weapon enhancement AE no longer has to hardcode `system.actions.0.*`
// and silently stop working if a second melee attack action is ever added).
function expandWeaponAttackActionGroup(host: ChangeTargetGroupHost, actionType: string, suffix: string): string[] {
  const actions = (host.system as { actions?: unknown }).actions;
  if (!Array.isArray(actions)) return [];
  const paths: string[] = [];
  actions.forEach((action, index) => {
    if ((action as { type?: string } | undefined)?.type === actionType) paths.push(`system.actions.${index}.${suffix}`);
  });
  return paths;
}

// Leaf names are deliberately NOT the real schema field names (`attackFormula`/
// `damageFormula`) — they're the user-typeable words for this virtual group branch
// (e.g. `#weapon.meleeWeaponAttacks.attackDamage`), decoupled from whatever the real
// per-action field happens to be called.
// Formula suffixes target the `.formula` LEAF (`attackFormula.formula`), NOT the parent
// `FormulaField`: assigning a value to the parent `EmbeddedDataField` is dropped when Foundry
// re-casts it back into a fresh `FormulaData` from `_source`, whereas the leaf string survives
// core's `setProperty()` write-back. Roll-aware joining (so `$scaleDamage(1d8)` + `2` becomes
// `$scaleDamage(1d8) + 2`, not the un-computable `$scaleDamage(1d8)2`) is handled by the leaf's
// own `RollFormulaStringField._applyChangeAdd`. Non-formula fields (`damageType`/`critRange`/
// `critMultiplier`) are plain scalars and target their field directly.
const WEAPON_ATTACK_GROUP_PROPS = [
  { prop: 'attackToHit', suffix: 'attackFormula.formula' },
  { prop: 'attackDamage', suffix: 'damageFormula.formula' },
  { prop: 'damageType', suffix: 'damageType' },
  { prop: 'critRange', suffix: 'critRange' },
  { prop: 'critMultiplier', suffix: 'critMultiplier' },
] as const;

for (const { prop, suffix } of WEAPON_ATTACK_GROUP_PROPS) {
  registerChangeTargetGroup({
    contextName: EFFECT_CHANGE_TARGET.ITEM,
    treePath: ['meleeWeaponAttacks', prop],
    localizationPrefixes: ['dnd35e.WEAPON'],
    category: 'dnd35e.Formula.ChangeGroups.category',
    expand: (host) => expandWeaponAttackActionGroup(host, ACTION_TYPE.MELEE, suffix),
  });
  registerChangeTargetGroup({
    contextName: EFFECT_CHANGE_TARGET.ITEM,
    treePath: ['rangedWeaponAttacks', prop],
    localizationPrefixes: ['dnd35e.WEAPON'],
    category: 'dnd35e.Formula.ChangeGroups.category',
    expand: (host) => expandWeaponAttackActionGroup(host, ACTION_TYPE.RANGED, suffix),
  });
}

export type { ChangeTargetGroup, ChangeTargetGroupContextMap, ChangeTargetGroupHost };
export {
  changeTargetGroups,
  expandChangeTargetGroups,
  getChangeTargetGroupLabel,
  registerChangeTargetGroup,
  resolveChangeTargets,
  withChangeTargetGroups,
};
