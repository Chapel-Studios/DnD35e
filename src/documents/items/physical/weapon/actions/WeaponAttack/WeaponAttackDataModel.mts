import { DAMAGE_TYPE_SLASHING } from '@constants/attacks/damageTypes.mjs';
import { DAMAGE_TYPES } from '@constants/index.mjs';
import { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import type { FormulaData } from '@helpers/formulae/index.mjs';
import { ActionDataModel } from '@items/baseItem/actions/ActionDataModel.mjs';
import type { ActionResult } from '@items/baseItem/actions/types.mjs';

import type { Weapon } from '../../Weapon.mjs';
import { WEAPON_PROPERTIES } from './constants.mjs';
import type { UseWeaponAttackContext } from './types.mjs';
import type { WeaponAttackSourceData } from './WeaponAttackSourceData.mjs';

const {
  fields: {
    BooleanField,
    NumberField,
    StringField,
    SetField,
  },
} = foundry.data;

abstract class WeaponAttackDataModel extends ActionDataModel {
  declare attackFormula: FormulaData;
  declare damageFormula: FormulaData;

  isTargetRequired = true;

  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();
    // No `hand` field, no `defaultSlotId` field — both determined live at execution
    // time (wield mode / Attack Roll Dialog hand select), not authored per-action.
    schema.requiresEquipped = new BooleanField({ required: true, initial: true });
    schema.attackFormula = new FormulaField({
      expectedType: 'string',
      contexts: [
        { contextName: 'Actor', resolvePath: 'item.actor', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['self'] },
        { contextName: 'Item', resolvePath: 'item', documentType: 'Item', fallbackSubtypes: ['weapon'], aliases: ['item', 'weapon'] },
      ],
      initialFormula: '1d20',
    });
    schema.damageFormula = new FormulaField({
      expectedType: 'string',
      contexts: [
        { contextName: 'Actor', resolvePath: 'item.actor', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['self'] },
        { contextName: 'Item', resolvePath: 'item', documentType: 'Item', fallbackSubtypes: ['weapon'], aliases: ['item', 'weapon'] },
      ],
      initialFormula: '$scaleDamage(1d4)',
    });
    schema.damageType = new StringField({ choices: [...DAMAGE_TYPES], initial: DAMAGE_TYPE_SLASHING, required: true });
    schema.critRange = new NumberField({ required: true, initial: 20, integer: true, min: 2, max: 20 });
    schema.critMultiplier = new NumberField({ required: true, initial: 2, integer: true });
    // Weapon Properties (§10.4) — finesse/reach/threatensAdjacent/thrown/nonLethal/nonLethalNoPenalty.
    schema.properties = new SetField(new StringField({ choices: [...WEAPON_PROPERTIES] }));

    return schema;
  }

  override get item(): Weapon | undefined {
    return super.item as Weapon | undefined;
  }

  protected override _canExecute(context: UseWeaponAttackContext): ActionResult {
    const superResult = super._canExecute(context);
    if (superResult.cancelled) return superResult;

    if (this.requiresEquipped && !this.item?.system.equippedSlotIds.length) {
      superResult.cancelled = true;
      superResult.reason = 'requiresEquipped';
    }

    return superResult;
  }

  protected override _executeCheck(_context: UseWeaponAttackContext): ActionResult {
    if (!this.item) {
      return { cancelled: true, reason: 'noItem', warnings: [] };
    }

    const damageRollTerm = this.damageFormula.resolvedValue || '1d4';

    // TODO(poc.10 Story D): open the Attack Roll Dialog, roll check/damage, post the
    // attack chat card, and advance the action chain (§10.7). Story C stops here.
    console.warn(
      `dnd35e | ActionDataModel#executeAction(): attack-roll pipeline is Story D scope — not yet implemented (resolved damage term: ${damageRollTerm}).`
    );
    return { cancelled: true, reason: 'notImplemented', warnings: [] };
  }
}
interface WeaponAttackDataModel extends ActionDataModel,
  Omit<WeaponAttackSourceData, 'attackFormula' | 'damageFormula' | 'name'> {}

export { WeaponAttackDataModel };
