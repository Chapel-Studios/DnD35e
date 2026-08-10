import type { ActorDnd35e } from '@actors/baseActor/index.mjs';

import { getPathBasedFamiliarAliases, getPathBasedFamiliarLabel, getPathBasedLabel, normalizeLabel } from './schemaWalker.mjs';
import type { AspectGroup, FamiliarContext, FieldAspect } from './types.mjs';
import { isFieldAspect } from './types.mjs';

/**
 * A group of related AE change targets that expand to concrete field paths at apply
 * time (poc §7.7). D35E solved this with `getChangeFlat()` + `buffTargets`, a tightly-coupled
 * central expansion function — this design decouples registration instead: each phase
 * registers its own groups when its data models land, and the apply loop/picker stay
 * generic.
 */
interface ChangeTargetGroup {
  /** Unique key stored on the AE change, e.g. "group:allSaves". Never shown to the user. */
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
  /** Expand to concrete field paths on a live actor. */
  expand(actor: ActorDnd35e): string[];
}

/** Registry — populated by later phases as their data models land. */
const changeTargetGroups = new Map<string, ChangeTargetGroup>();

function registerChangeTargetGroup(group: ChangeTargetGroup): void {
  changeTargetGroups.set(group.key, group);
}

/**
 * Resolve a change key to one or more concrete field paths.
 * If the key is a registered group, expands it against the given actor. Otherwise
 * returns it unchanged as a single-element array.
 */
function resolveChangeTargets(key: string, actor: ActorDnd35e): string[] {
  const group = changeTargetGroups.get(key);
  return group ? group.expand(actor) : [key];
}

/**
 * Resolve a registered Group Change Target's own official label (e.g. "All Saves" for
 * `group:allSaves`) for plain-text display contexts (not formulas) — e.g. `EffectChangeRow`'s
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
 * field path — e.g. a change with key "group:allSaves" becomes three cloned changes,
 * one per `system.saves.*` field. Non-group keys pass through unchanged (single-element
 * result). Called from `ActorDnd35e.applyActiveEffects()` between sorting and stacking,
 * so each expanded field then becomes an independent stacking candidate. Extracted as
 * its own function (rather than inlined) so it can be unit-tested without a full Actor
 * document.
 */
function expandChangeTargetGroups<T extends { key?: string }>(changes: T[], actor: ActorDnd35e): T[] {
  return changes.flatMap(change => {
    if (!change.key) return [change];
    return resolveChangeTargets(change.key, actor).map(key => ({ ...change, key }));
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
 */
function withChangeTargetGroups(context: FamiliarContext): FamiliarContext {
  if (changeTargetGroups.size === 0) return context;
  const properties: AspectGroup = { ...context.properties };
  for (const group of changeTargetGroups.values()) {
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
  key: 'group:allSaves',
  treePath: ['saves', 'all'],
  localizationPrefixes: ['dnd35e.CREATURE'],
  category: 'dnd35e.Formula.ChangeGroups.category',
  expand: () => ['system.saves.fort', 'system.saves.reflex', 'system.saves.will'],
});

export type { ChangeTargetGroup };
export {
  changeTargetGroups,
  expandChangeTargetGroups,
  getChangeTargetGroupLabel,
  registerChangeTargetGroup,
  resolveChangeTargets,
  withChangeTargetGroups,
};
