import type { ActorDnd35e } from '@actors/baseActor/index.mjs';

import type { AspectGroup, FamiliarContext } from './types.mjs';

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
  /** I18n key for the label shown in the Formula Familiar picker. */
  label: string;
  /** I18n key for this group's category header in the FF picker dropdown. */
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
 * Does not mutate `context`; returns a new object each call.
 */
function withChangeTargetGroups(context: FamiliarContext): FamiliarContext {
  if (changeTargetGroups.size === 0) return context;
  const properties: AspectGroup = { ...context.properties };
  for (const group of changeTargetGroups.values()) {
    properties[group.key] = {
      type: 'string',
      accessPath: group.key,
      display: game.i18n.localize(group.label),
      isGroup: true,
    };
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
  label: 'dnd35e.Formula.ChangeGroups.allSaves',
  category: 'dnd35e.Formula.ChangeGroups.category',
  expand: () => ['system.saves.fort', 'system.saves.reflex', 'system.saves.will'],
});

export type { ChangeTargetGroup };
export {
  changeTargetGroups,
  expandChangeTargetGroups,
  registerChangeTargetGroup,
  resolveChangeTargets,
  withChangeTargetGroups,
};
