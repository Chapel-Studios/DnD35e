/**
 * SRD condition registry — poc.9 Story 4.B.
 *
 * Feasibility audit (see poc/phase-09-basic-tokens.md Story 4): most SRD conditions modify
 * AC/attack/saves/skill-check values that have no live consumer yet in the current
 * data pipeline — `Creature._buildDefenseChanges()` now flows AC through the AE stacking
 * engine (`armorBonus`/`shieldBonus` are real `system.defense.*` fields, still `0` until
 * the Armor/Shield item types exist), but there is no attack-roll, save, or skill-check
 * system yet. Only conditions that touch fields already flowing through
 * `applyActiveEffects()` (ability scores, land speed) get real `changes[]` here.
 * Everything else is registered as an icon-only status (empty `changes`) so it can be
 * toggled via the Token HUD and shows on the token, but has no mechanical effect until
 * later phases (alpha.8 Prone/ConditionManager, beta.3 full condition expansion) land
 * the systems (action economy, roll system) those effects need.
 *
 * Prone is a special case: it has no stat-modifying `changes` here (AC/attack penalties
 * still deferred), but drives real movement-action gating (crawl/standUp/dropProne) —
 * see `movementActionGating.mts` and `TokenDocumentDnd35e#_onUpdateMovement`.
 *
 * @module
 */

import type { StatusEffectConfig } from '@client/config.mjs';
import { DEX, STR } from '@constants/abilities.mjs';
import { BONUS_TYPE_UNTYPED } from '@constants/bonusTypes.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE, FINAL_EFFECT_CHANGE_PHASE, INITIAL_EFFECT_CHANGE_PHASE } from '@effects/baseActiveEffect/data/constants.mjs';
import { GENERAL_EFFECT_TYPE } from '@effects/effectTypes.mjs';

/** `CONFIG.statusEffects[].id` for the Prone condition — used by movement-action gating. */
const PRONE_CONDITION_ID = 'prone';
/** `CONFIG.statusEffects[].id` for the Blinded condition — mapped to Foundry's native `CONFIG.specialStatusEffects.BLIND`. */
const BLINDED_CONDITION_ID = 'blinded';
const FLAT_FOOTED_CONDITION_ID = 'flatFooted';

const setFieldOverride = (key: string, value: unknown): EffectChangeDataDnd35e => ({
  key,
  type: EFFECT_CHANGE_TYPE.OVERRIDE,
  value,
  priority: 100,
  phase: FINAL_EFFECT_CHANGE_PHASE,
  target: EFFECT_CHANGE_TARGET.ACTOR,
  isSystem: true,
  bonusType: BONUS_TYPE_UNTYPED,
});

/** Builds an ability-score penalty change (ADD, untyped — stacks with other conditions' penalties per SRD "no type" rule). */
const abilityPenalty = (ability: string, value: number): EffectChangeDataDnd35e => ({
  key: `system.abilities.${ability}.score`,
  type: EFFECT_CHANGE_TYPE.ADD,
  value,
  priority: 10,
  phase: INITIAL_EFFECT_CHANGE_PHASE,
  target: EFFECT_CHANGE_TARGET.ACTOR,
  isSystem: true,
  bonusType: BONUS_TYPE_UNTYPED,
});

/**
 * Halves land speed (MULTIPLY, no bonus type — multiple half-speed sources chain
 * multiplicatively via Foundry's native MULTIPLY handler rather than being summed by
 * the stacking engine, which only sums numeric bonusType'd changes).
 */
const halveLandSpeed = (): EffectChangeDataDnd35e => ({
  key: 'system.speed.land',
  type: EFFECT_CHANGE_TYPE.MULTIPLY,
  value: 0.5,
  priority: 10,
  phase: FINAL_EFFECT_CHANGE_PHASE,
  target: EFFECT_CHANGE_TARGET.ACTOR,
  isSystem: true,
  bonusType: BONUS_TYPE_UNTYPED,
});

/**
 * Caps land speed at a flat value (OVERRIDE, high priority so it applies after any
 * MULTIPLY changes — e.g. crawling is 1 square (5 ft.) regardless of the creature's
 * speed or other active speed penalties, per SRD). No bonus type, same as
 * `halveLandSpeed` — bypasses stacking summation and applies directly via priority order.
 */
const capLandSpeed = (squares: number): EffectChangeDataDnd35e =>
  setFieldOverride('system.speed.land', squares);

/**
 * Denies the Dexterity bonus to AC (OVERRIDE, boolean) — SRD: "You can't use your
 * Dexterity bonus to AC (if any) while flat-footed." Read directly by
 * `Creature._buildDefenseChanges()` to gate the Dex term, rather than summed like a
 * bonus. A future Uncanny Dodge feat overrides this back to false with a
 * higher-priority change.
 */
const denyDexToAC = (): EffectChangeDataDnd35e => ({
  key: 'system.defense.denyDexToAC',
  type: EFFECT_CHANGE_TYPE.OVERRIDE,
  value: true,
  priority: 10,
  phase: INITIAL_EFFECT_CHANGE_PHASE,
  target: EFFECT_CHANGE_TARGET.ACTOR,
  isSystem: true,
  bonusType: BONUS_TYPE_UNTYPED,
});

interface ConditionDefinition {
  /** Matches the `CONFIG.statusEffects[].id` / `Actor#toggleStatusEffect(id)` argument. */
  id: string;
  /** i18n key, resolved by Foundry's Token HUD/effect displays. */
  label: string;
  /** Icon path. Reuses Foundry core's bundled `icons/svg/*` set — no bespoke art yet. */
  icon: string;
  /**
   * Real AE changes for conditions with a working mechanical hook today. Empty for
   * conditions whose SRD effects have no live consumer yet (see module doc comment).
   */
  changes: EffectChangeDataDnd35e[];
}

/**
 * Full SRD condition audit list (`docs/reference/conditions.md`). Only Entangled,
 * Exhausted, Fatigued, Flat-Footed, and Prone carry real `changes` today — see module
 * doc comment.
 */
const CONDITIONS: Record<string, ConditionDefinition> = {
  blinded: {
    id: BLINDED_CONDITION_ID,
    label: 'dnd35e.CONDITIONS.blinded.label',
    icon: 'icons/svg/blind.svg',
    changes: [],
  },
  cowering: {
    id: 'cowering',
    label: 'dnd35e.CONDITIONS.cowering.label',
    icon: 'icons/svg/cowled.svg',
    changes: [],
  },
  dazed: {
    id: 'dazed',
    label: 'dnd35e.CONDITIONS.dazed.label',
    icon: 'icons/svg/daze.svg',
    changes: [],
  },
  dazzled: {
    id: 'dazzled',
    label: 'dnd35e.CONDITIONS.dazzled.label',
    icon: 'icons/svg/light.svg',
    changes: [],
  },
  deafened: {
    id: 'deafened',
    label: 'dnd35e.CONDITIONS.deafened.label',
    icon: 'icons/svg/deaf.svg',
    changes: [],
  },
  entangled: {
    id: 'entangled',
    label: 'dnd35e.CONDITIONS.entangled.label',
    icon: 'icons/svg/net.svg',
    changes: [
      abilityPenalty(DEX, -4),
      halveLandSpeed(),
    ],
  },
  exhausted: {
    id: 'exhausted',
    label: 'dnd35e.CONDITIONS.exhausted.label',
    icon: 'icons/svg/degen.svg',
    changes: [
      abilityPenalty(STR, -6),
      abilityPenalty(DEX, -6),
      halveLandSpeed(),
    ],
  },
  fatigued: {
    id: 'fatigued',
    label: 'dnd35e.CONDITIONS.fatigued.label',
    icon: 'icons/svg/downgrade.svg',
    changes: [
      abilityPenalty(STR, -2),
      abilityPenalty(DEX, -2),
    ],
  },
  flatFooted: {
    id: FLAT_FOOTED_CONDITION_ID,
    label: 'dnd35e.CONDITIONS.flatFooted.label',
    icon: 'icons/svg/shield.svg',
    changes: [
      denyDexToAC(),
      setFieldOverride('system.aooCount', 0),
    ],
  },
  frightened: {
    id: 'frightened',
    label: 'dnd35e.CONDITIONS.frightened.label',
    icon: 'icons/svg/terror.svg',
    changes: [],
  },
  grappled: {
    id: 'grappled',
    label: 'dnd35e.CONDITIONS.grappled.label',
    icon: 'icons/svg/anchor.svg',
    changes: [],
  },
  helpless: {
    id: 'helpless',
    label: 'dnd35e.CONDITIONS.helpless.label',
    icon: 'icons/svg/padlock.svg',
    changes: [],
  },
  invisible: {
    id: 'invisible',
    label: 'dnd35e.CONDITIONS.invisible.label',
    icon: 'icons/svg/invisible.svg',
    changes: [],
  },
  nauseated: {
    id: 'nauseated',
    label: 'dnd35e.CONDITIONS.nauseated.label',
    icon: 'icons/svg/biohazard.svg',
    changes: [],
  },
  panicked: {
    id: 'panicked',
    label: 'dnd35e.CONDITIONS.panicked.label',
    icon: 'icons/svg/explosion.svg',
    changes: [],
  },
  paralyzed: {
    id: 'paralyzed',
    label: 'dnd35e.CONDITIONS.paralyzed.label',
    icon: 'icons/svg/paralysis.svg',
    changes: [],
  },
  petrified: {
    id: 'petrified',
    label: 'dnd35e.CONDITIONS.petrified.label',
    icon: 'icons/svg/stoned.svg',
    changes: [],
  },
  pinned: {
    id: 'pinned',
    label: 'dnd35e.CONDITIONS.pinned.label',
    icon: 'icons/svg/net.svg',
    changes: [],
  },
  prone: {
    id: PRONE_CONDITION_ID,
    label: 'dnd35e.CONDITIONS.prone.label',
    icon: 'icons/svg/falling.svg',
    // AC/attack penalties still deferred (see module doc comment), but land speed is
    // capped at a flat 5 ft. while prone (SRD: crawling) — a real, visible change,
    // consistent with Entangled/Exhausted. Drives movement-action gating too
    // (crawl/standUp/dropProne) — see `movementActionGating.mts`.
    changes: [capLandSpeed(1)],
  },
  shaken: {
    id: 'shaken',
    label: 'dnd35e.CONDITIONS.shaken.label',
    icon: 'icons/svg/terror.svg',
    changes: [],
  },
  sickened: {
    id: 'sickened',
    label: 'dnd35e.CONDITIONS.sickened.label',
    icon: 'icons/svg/pill.svg',
    changes: [],
  },
  staggered: {
    id: 'staggered',
    label: 'dnd35e.CONDITIONS.staggered.label',
    icon: 'icons/svg/down.svg',
    changes: [],
  },
  stunned: {
    id: 'stunned',
    label: 'dnd35e.CONDITIONS.stunned.label',
    icon: 'icons/svg/daze.svg',
    changes: [],
  },
  unconscious: {
    id: 'unconscious',
    label: 'dnd35e.CONDITIONS.unconscious.label',
    icon: 'icons/svg/unconscious.svg',
    changes: [],
  },
} as const;

/**
 * Builds the `CONFIG.statusEffects` entries for every SRD condition. Registered in
 * the actor init hook (`registration.mts`). `type: 'general'` + `system.target: 'actor'`
 * ensures the AE created by `Actor#toggleStatusEffect()` validates against our custom
 * `ActiveEffectSystemModel` schema (changes live in `system.changes`, not core's
 * top-level `changes` — see `ActorDnd35e.applyActiveEffects()`).
 */
const buildConditionStatusEffects = (): StatusEffectConfig[] =>
  Object.values(CONDITIONS).map(condition => ({
    id: condition.id,
    name: condition.label,
    img: condition.icon,
    type: GENERAL_EFFECT_TYPE,
    flags: {
      dnd35e: {
        isCondition: true,
      },
    },
    system: {
      target: EFFECT_CHANGE_TARGET.ACTOR,
      isHidden: false,
      changes: condition.changes,
    },
  } as unknown as StatusEffectConfig));

export {
  BLINDED_CONDITION_ID,
  buildConditionStatusEffects,
  CONDITIONS,
  FLAT_FOOTED_CONDITION_ID,
  PRONE_CONDITION_ID,
};

export type {
  ConditionDefinition,
};
