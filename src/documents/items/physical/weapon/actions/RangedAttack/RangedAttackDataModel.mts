import { getActionEconomy } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { CombatDnd35e } from '@documents/combat/CombatDnd35e.mjs';
import { requiredNumberField } from '@fields/fieldBuilders.mjs';
import { ACTION_TYPE, ACTION_TYPES } from '@items/baseItem/actions/constants.mjs';

import type { UseWeaponAttackContext, WeaponAttackActionResult } from '../WeaponAttack/types.mjs';
import { WeaponAttackDataModel } from '../WeaponAttack/WeaponAttackDataModel.mjs';
import { RANGED_WEAPON_PROPERTIES, type RangedWeaponProperty } from './constants.mjs';
import type { RangedAttackSourceData } from './RangedAttackSourceData.mjs';

const {
  fields: {
    BooleanField,
    StringField,
    SetField,
  },
} = foundry.data;

class RangedWeaponAttack extends WeaponAttackDataModel {
  declare properties: Set<RangedWeaponProperty>;

  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();
    schema.type = new StringField({
      required: true,
      blank: false,
      choices: [...ACTION_TYPES],
      initial: ACTION_TYPE.RANGED,
      validate: (value: unknown) => value === ACTION_TYPE.RANGED,
    });
    schema.rangeIncrement = requiredNumberField(2, 0);
    schema.isAmmoRequired = new BooleanField({ required: true, nullable: false, initial: false });
    schema.properties = new SetField(new StringField({ choices: [...RANGED_WEAPON_PROPERTIES] }));
    return schema;
  }

  protected override _canExecute(context: UseWeaponAttackContext): WeaponAttackActionResult {
    const result = super._canExecute(context);
    if (result.cancelled) return result;

    // SRD: a charge's mandatory attack must be melee — block ranged/thrown before the dialog opens.
    const combat = game.combat;
    const combatant = context.actorToken
      ? combat?.getCombatantsByToken(context.actorToken.id)[0] as CombatantDnd35e<CombatDnd35e> | undefined
      : undefined;
    if (
      combat?.started
      && combatant
      && !context.isFree
      && this.type !== ACTION_TYPE.MELEE
      && getActionEconomy(combatant).used.chargedThisTurn
    ) {
      ui.notifications.warn(game.i18n.localize('dnd35e.COMBAT.ChargeMeleeOnly'));
      result.cancelled = true;
      result.reason = 'chargeMeleeOnly';
    }

    return result;
  }
}
interface RangedWeaponAttack extends WeaponAttackDataModel,
  Omit<RangedAttackSourceData, 'attackFormula' | 'damageFormula' | 'name'> {}

export { RangedWeaponAttack };
