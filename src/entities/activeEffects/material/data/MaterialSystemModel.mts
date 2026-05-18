import type { Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/data/ActiveEffectSystemData.mjs';
import { ActiveEffectSystemModel } from '@effects/BaseActiveEffect/data/ActiveEffectSystemModel.mjs';
import type { MaterialSystemData } from '@effects/material/index.mjs';
import { requiredNumberField, useDnd35eField } from '@fields/fieldBuilders.mjs';
import { PriceField } from '@fields/PriceField.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import type { TargetContexts } from '@helpers/formulae/registry.mjs';

import { buildMaterialChanges } from './buildMaterialChanges.mjs';
import type { MaterialSubtype } from './materialTypes.mjs';
import { MATERIAL_SUBTYPE_STANDARD, MATERIAL_SUBTYPES } from './materialTypes.mjs';

const { fields: { StringField } } = foundry.data;

class MaterialSystemModel extends ActiveEffectSystemModel {
  static override targetContexts: TargetContexts = { item: ['weapon'] };
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.MATERIAL'];

  static override defineSchema () {
    const schema = super.defineSchema();

    // Declare Item context on inherited nameFormula
    (schema.nameFormula as FormulaField).formulaContexts = [
      { contextName: 'Item', resolvePath: 'parent', documentType: 'Item', fallbackSubtypes: ['weapon'], aliases: ['Parent'] },
    ];

    schema.price = useDnd35eField(new PriceField({}));
    schema.magicEquivalency = useDnd35eField(requiredNumberField(0));
    schema.hardness = useDnd35eField(requiredNumberField(0));
    schema.bonusHp = useDnd35eField(requiredNumberField(0));
    schema.damageReductionTypes = new foundry.data.fields.SetField(
      new foundry.data.fields.StringField({ required: true }),
      { initial: [] }
    );
    schema.materialSubtype = new StringField({
      required: true,
      initial: MATERIAL_SUBTYPE_STANDARD,
      choices: MATERIAL_SUBTYPES as readonly MaterialSubtype[],
    });

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    this.changes = this.buildChanges();
  }

  buildChanges(): Dnd35eEffectChangeData[] {
    return buildMaterialChanges({
      materialSubtype: this.materialSubtype,
      price: this.price,
      magicEquivalency: this.magicEquivalency,
      hardness: this.hardness,
      bonusHp: this.bonusHp,
      damageReductionTypes: this.damageReductionTypes,
      existingChanges: this.changes,
    });
  }
}

interface MaterialSystemModel extends MaterialSystemData {}

export { MaterialSystemModel };
