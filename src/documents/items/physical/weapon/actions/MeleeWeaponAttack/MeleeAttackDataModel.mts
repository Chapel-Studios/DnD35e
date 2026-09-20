import type { TokenDnd35e } from '@canvas/index.mjs';
import { isWithinReach } from '@canvas/token/logic/reach.mjs';
import { DEX, STR } from '@constants/abilities.mjs';
import { type Size,SIZE_REACH } from '@constants/sizes.mjs';
import { ACTION_TYPE, ACTION_TYPES } from '@items/baseItem/actions/constants.mjs';
import type { ActionResult } from '@items/baseItem/actions/types.mjs';

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
      initial: ACTION_TYPE.MELEE_WEAPON_ATTACK,
      validate: (value: unknown) => value === ACTION_TYPE.MELEE_WEAPON_ATTACK,
    });
    // Same contexts as the base `name` field - only the default text differs.
    schema.name.initial = () => ({
      formula: '#self.name $l(dnd35e.WEAPON.ACTIONS.Type.melee_weapon_attack)',
      resolvedValue: null,
      expectedType: 'string',
    });
    schema.reachLength = new NumberField({
      required: true,
      initial: 1,
      min: 0,
    });
    // Weapon Properties (§10.4) — finesse/reach/threatensAdjacent/nonLethal/nonLethalNoPenalty.
    schema.properties = new SetField(new StringField({ choices: [...MELEE_WEAPON_PROPERTIES] }));
    
    return schema;
  }

  protected override _canExecute(context: UseWeaponAttackContext): ActionResult {
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

  protected override _executeCheck(context: UseWeaponAttackContext): ActionResult {
    context.attackAbility = this.properties?.has(MELEE_WEAPON_PROPERTY.FINESSE)
      ? DEX
      : STR;
    const superResult = super._executeCheck(context);
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
    
    const attackerToken = context.actor.getActiveTokens()[0] as TokenDnd35e | undefined;
    const hasReach = this.properties?.has(MELEE_WEAPON_PROPERTY.REACH) ?? false;
    const threatensAdjacent = this.properties?.has(MELEE_WEAPON_PROPERTY.THREATENS_ADJACENT) ?? false;
    const baseReach = SIZE_REACH[context.actor.system.size as Size] ?? 1;
    const effectiveReach = hasReach ? baseReach + this.reachLength : baseReach;

    for (const target of context.target ?? []) {
      const targetToken = (target.getActiveTokens()[0]) as TokenDnd35e | undefined;
      
      // TODO: enforce target min/max requirements based on combat settings.
      // const { enforceMeleeReach } = useCombatSettings();
      const enforceMeleeReach = false; // Placeholder until combat settings are integrated

      if (!attackerToken || !targetToken) {
        if (enforceMeleeReach) {
          result.cancelled = true;
          result.reason = 'missingTokens';
          return result;
        }

        continue;
      }

      if (!isWithinReach(attackerToken, targetToken, effectiveReach)) {
        if (enforceMeleeReach) {
          result.cancelled = true;
          result.reason = 'outOfReach';
          return result;
        }

        result.warnings!.push('outOfReach');
      }
      if (hasReach && !threatensAdjacent && isWithinReach(attackerToken, targetToken, baseReach)) {
        if (enforceMeleeReach) {
          result.cancelled = true;
          result.reason = 'reachDeadZone';
          return result;
        }
        result.warnings!.push('reachDeadZone');
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