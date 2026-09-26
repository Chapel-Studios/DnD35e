import { DEX, STR } from '@constants/abilities.mjs';
import { type Size,SIZE_REACH } from '@constants/sizes.mjs';
import { isWithinReach } from '@documents/token/logic/reach.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import { ACTION_TYPE, ACTION_TYPES } from '@items/baseItem/actions/constants.mjs';
import type { ActionResult } from '@items/baseItem/actions/types.mjs';

import type { WeaponAttackActionResult } from '../WeaponAttack/types.mjs';
import type { UseWeaponAttackContext } from '../WeaponAttack/types.mjs';
import { WeaponAttackDataModel } from '../WeaponAttack/WeaponAttackDataModel.mjs';
import { MELEE_WEAPON_PROPERTIES, MELEE_WEAPON_PROPERTY, type MeleeWeaponProperty } from './constants.mjs';
import type { MeleeAttackSourceData } from './MeleeAttackSourceData.mjs';

const {
  fields: {
    NumberField,
    StringField,
    SetField,
  },
} = foundry.data;

class MeleeWeaponAttack extends WeaponAttackDataModel {
  declare properties: Set<MeleeWeaponProperty>;

  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();
    schema.type = new StringField({
      required: true,
      blank: false,
      choices: [...ACTION_TYPES],
      initial: ACTION_TYPE.MELEE,
      validate: (value: unknown) => value === ACTION_TYPE.MELEE,
    });
    // Same contexts as the base `name` field - only the default text differs.
    schema.name.initial = () => ({
      formula: '#self.name $l(dnd35e.WEAPON.ACTIONS.Type.melee_weapon_attack)',
      resolvedValue: null,
      expectedType: 'string',
    });
    // Total effective reach in squares while the `reach` property is active - only
    // meaningful in combination with it (see `_validateMeleeReach()`). Static `initial`
    // fallback of 1 (Medium's un-doubled reach) is only ever used if a caller creates
    // this DataModel directly without going through `weaponActionSync.mts`, which seeds
    // the real default (double the wielding actor's size-based reach) at creation time
    // - stays editable afterward for homebrew weapons with more than double reach.
    schema.reachLength = new NumberField({
      required: true,
      initial: 1,
      min: 0,
    });
    // Weapon Properties (§10.4) — finesse/reach/threatensAdjacent/nonLethal/nonLethalNoPenalty.
    schema.properties = new SetField(new StringField({ choices: [...MELEE_WEAPON_PROPERTIES] }));
    
    return schema;
  }

  protected override _canExecute(context: UseWeaponAttackContext): WeaponAttackActionResult {
    const superResult = super._canExecute(context);
    if (superResult.cancelled) return superResult;

    const reachResult = this._validateMeleeReach(context);
    superResult.warnings.push(...reachResult.warnings);
    if (reachResult.cancelled) {
      superResult.cancelled = true;
      superResult.reason = reachResult.reason;
    }

    return superResult;
  }

  protected override async _executeCheck(context: UseWeaponAttackContext): Promise<WeaponAttackActionResult> {
    context.attackAbility = this.properties?.has(MELEE_WEAPON_PROPERTY.FINESSE)
      ? DEX
      : STR;
    const superResult = await super._executeCheck(context);
    if (superResult.cancelled) return superResult;

    return superResult;
  }

  /**
   * Melee reach validation (§10.5/§10.10) — only applies to actions with no `range`
   * block (ranged/thrown actions use range increments instead, handled by Story D/F).
   * Self-contained: no dependency on the Attack Roll Dialog.
   */
  private _validateMeleeReach(context: UseWeaponAttackContext): ActionResult {
    const result: ActionResult = { cancelled: false, warnings: [], reason: 'success' };
    
    // Prefer the threaded tokens (unambiguous when multiple unlinked tokens share an actor);
    // fall back to `getActiveTokens()[0]` only when a caller didn't thread one through.
    const attackerToken = context.actorToken ?? (context.actor.getActiveTokens()[0] as TokenDnd35e | undefined);
    const hasReach = this.properties?.has(MELEE_WEAPON_PROPERTY.REACH) ?? false;
    const threatensAdjacent = this.properties?.has(MELEE_WEAPON_PROPERTY.THREATENS_ADJACENT) ?? false;
    const baseReach = SIZE_REACH[context.actor.system.size as Size] ?? 1;
    // `reachLength` is authored as the weapon's total effective reach (defaults to
    // double the wielder's size at creation - see weaponActionSync.mts - but stays
    // editable for homebrew reach weapons longer than the standard double).
    const effectiveReach = hasReach ? this.reachLength : baseReach;

    for (const target of context.target ?? []) {
      // `context.targetToken` only resolves the primary target (`context.target?.[0]`,
      // see `WeaponAttackDataModel._executeCheck()`); any additional targets fall back.
      const targetToken = (target === context.target?.[0] ? context.targetToken : undefined)
        ?? (target.getActiveTokens()[0] as TokenDnd35e | undefined);

      if (!attackerToken || !targetToken) {
        ui.notifications.warn(game.i18n.localize('dnd35e.COMBAT.MissingTargetToken'));
        result.cancelled = true;
        result.reason = 'missingTokens';
        return result;
      }

      if (!isWithinReach(attackerToken, targetToken, effectiveReach)) {
        ui.notifications.warn(game.i18n.format('dnd35e.COMBAT.TargetOutOfReach', { target: target.name }));
        result.cancelled = true;
        result.reason = 'outOfReach';
        return result;
      }
      if (hasReach && !threatensAdjacent && isWithinReach(attackerToken, targetToken, baseReach)) {
        ui.notifications.warn(game.i18n.format('dnd35e.COMBAT.TargetTooCloseForReach', { target: target.name }));
        result.cancelled = true;
        result.reason = 'reachDeadZone';
        return result;
      }
    }

    return result;
  }
}
interface MeleeWeaponAttack extends WeaponAttackDataModel,
  Omit<MeleeAttackSourceData, 'attackFormula' | 'damageFormula' | 'name'> {}

export {
  MeleeWeaponAttack,
};