import { getActionEconomy } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { CombatDnd35e } from '@documents/combat/CombatDnd35e.mjs';
import { requiredNumberField } from '@fields/fieldBuilders.mjs';
import { ACTION_TYPE, ACTION_TYPES } from '@items/baseItem/actions/constants.mjs';
import { participantToken } from '@items/baseItem/actions/logic/actionParticipant.mjs';

import type { UseWeaponAttackContext, WeaponAttackActionResult } from '../WeaponAttack/types.mjs';
import { WeaponAttackDataModel } from '../WeaponAttack/WeaponAttackDataModel.mjs';
import { RANGED_WEAPON_PROPERTIES, RANGED_WEAPON_PROPERTY } from './constants.mjs';
import type { RangedAttackData, RangedAttackSourceData } from './RangedAttackSourceData.mjs';

const {
  fields: {
    BooleanField,
    StringField,
    SetField,
  },
} = foundry.data;

class RangedWeaponAttack extends WeaponAttackDataModel {
  declare readonly _source: RangedAttackSourceData;
  declare properties: RangedAttackData['properties'];

  /** Story F will enable roll-formula diagnostics for ranged actions; H proves melee first. */
  protected override get preparationRollFormulaFields(): readonly string[] {
    return [];
  }

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
    const actorToken = participantToken(context.actor);
    const combatant = actorToken
      ? combat?.getCombatantsByToken(actorToken.id)[0] as CombatantDnd35e<CombatDnd35e> | undefined
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

  // Ranged only adds the wield-mode STR term when the weapon is flagged `rangedUsesStr` (e.g. thrown weapons).
  protected override _usesDamageAbility(): boolean {
    return this.properties?.has(RANGED_WEAPON_PROPERTY.WEAPON_PROPERTY_RANGED_USES_STR) ?? false;
  }

}

interface RangedWeaponAttack extends WeaponAttackDataModel,
  RangedAttackData {}

export { RangedWeaponAttack };
