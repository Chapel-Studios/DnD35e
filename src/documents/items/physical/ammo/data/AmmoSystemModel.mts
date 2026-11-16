import { requiredBooleanField, requiredNullableStringField, useDnd35eField } from '@fields/fieldBuilders.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import { PhysicalItemSystemModel } from '@items/physical/physicalItem/data/PhysicalItemSystemModel.mjs';

import type { AmmoSystemData } from './AmmoSystemData.mjs';

class AmmoSystemModel extends PhysicalItemSystemModel {
  static override LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'dnd35e.AMMO',
  ];

  static override defineSchema() {
    const schema = super.defineSchema();

    (schema.nameFormula as FormulaField).formulaContexts = [
      { contextName: 'Owner', resolvePath: 'parent', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['Parent'] },
    ];

    schema.isAlwaysRecoverable = requiredBooleanField(false);
    schema.ammoType = useDnd35eField(
      requiredNullableStringField(),
      { 
        familiar: { aliases: ['subtype'] },
      });

    return schema;
  }
}

interface AmmoSystemModel extends AmmoSystemData {}

export { AmmoSystemModel };
