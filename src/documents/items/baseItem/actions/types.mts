import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import type { MeleeWeaponAttack } from '@items/physical/weapon/actions/MeleeWeaponAttack/MeleeAttackDataModel.mjs';
import type { RangedWeaponAttack } from '@items/physical/weapon/actions/RangedAttack/RangedAttackDataModel.mjs';

import type { ActionType } from './constants.mjs';

/**
 * Context passed into `executeAction()` — dialog-time choices the Attack Roll Dialog
 * (Story D) collects before invoking the action. Minimal for Story C: only what the
 * self-contained reach-validation pass below needs. Story D expands this with the full
 * attack-roll pipeline's own requirements (non-lethal toggle, charge, etc.).
 */
interface UseActionContext {
  actor: ACTORS_DND35E;
  target: ACTORS_DND35E[] | null;
}

/**
 * Result of `executeAction()`/`continue()`. Base shape shared by every action kind —
 * concrete action kinds (weapon attacks, future spell casts, etc.) extend this with their
 * own result fields rather than piling optional fields onto one shared shape.
 */
interface ActionResult {
  cancelled: boolean;
  reason: string;
  warnings: string[];
}

/**
 * The actor-side projection of an action, live-merged onto `system.actions.<id>` by
 * `ActionDataModel.createActionChange()` (an `EFFECT_CHANGE_PHASE.FINAL` change, no
 * backing AE document). Keyed by the source `ActionDataModel`'s own `_id`. Deliberately
 * minimal — the actor only ever holds a pointer back to the source item; resolved
 * `check`/`damage`/`range`-equivalent data (`attackFormula`/`damageFormula`/etc.) stays
 * on the item and is looked up live via `itemUuid`, never duplicated onto the actor.
 */
interface IAction {
  id: string;
  itemUuid: string;
  type: ActionType;
  isSystem: boolean;
}

type WeaponAction = MeleeWeaponAttack
  | RangedWeaponAttack

type AllActions = WeaponAction;

export type {
  ActionResult,
  AllActions,
  IAction,
  UseActionContext,
  WeaponAction,
};
