import { ActorSystemModel } from '@actors/baseActor/data/index.mjs';
import { computeEncumbranceTier } from '@constants/carryingCapacity.mjs';
import {
  getCarryingCapacity,
  LAW_AXES,
  MASKED_EDIT_STRATEGY,
  MORAL_AXES,
  SENSE_TYPES,
} from '@constants/index.mjs';
import { CurrencyField } from '@fields/currency/CurrencyField.mjs';
import {
  derivedBooleanField,
  derivedNullableOptionalStringField,
  derivedNumberField,
  requiredNumberField,
  requiredTypedStringField,
  useDnd35eField,
} from '@fields/fieldBuilders.mjs';
import { NullableCapNumberField } from '@fields/NullableCapNumberField.mjs';
import { FormulaField } from '@helpers/formulae/index.mjs';

import type { CreatureSystemData } from './CreatureSystemData.mjs';

const {
  ArrayField,
  BooleanField,
  HTMLField,
  SchemaField,
  StringField,
} = foundry.data.fields;

const abilityEntry = () => new SchemaField({
  score: useDnd35eField(requiredNumberField(10), { familiar: { aliases: ['score'] } }),
  mod:   useDnd35eField(derivedNumberField(0),   { familiar: { aliases: ['modifier'] } }),
});

const nullableBioField = () =>
  useDnd35eField(new StringField({ required: true, nullable: true, initial: null }));

abstract class CreatureSystemModel extends ActorSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.CREATURE'];

  /**
   * Reset derived (`persisted: false`) fields to their baseline before `applyActiveEffects('initial')`
   * runs. These fields have no other source of truth — nothing sets them from `_source` — so they
   * must be given a starting value every `prepareBaseData()` pass before AE contributions layer on:
   *  - `encumbrance.carriedWeight`: recomputed from currency weight each pass
   *  - `encumbrance.carryBonus`/`carryMultiplier`: reset to schema defaults (0 / 1)
   *  - `maxDexBonus`/`armorCheckPenalty`: reset so DOWNGRADE applies correctly each pass
   *  - `saves.fort`/`.reflex`/`.will`: reset to 0 so 'initial'-phase Value formula
   *    changes don't compound across repeated prepare passes
   * See docs/architecture/actor-data-pipeline.md.
   */
  override prepareBaseData(): void {
    super.prepareBaseData();

    this.encumbrance.carriedWeight = this.currency.getWeightInLbs();
    this.encumbrance.carryBonus = 0;
    this.encumbrance.carryMultiplier = 1;
    this.encumbrance.maxDexBonus = null;
    this.encumbrance.armorCheckPenalty = 0;

    this.saves.fort = 0;
    this.saves.reflex = 0;
    this.saves.will = 0;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    for (const ability of Object.values(this.abilities)) {
      ability.mod = Math.floor((ability.score - 10) / 2);
    }
    // Mirror hp.current -> hp.value: Foundry's default TokenDocument#getBarAttribute
    // only resolves bar objects with .value/.max keys, but this system stores HP as
    // .current/.max. See buildPrototypeTokenDefaults.mts (prototypeToken.bar1).
    if (this.hp) this.hp.value = this.hp.current;
    this._prepareEncumbrance();
  }

  /**
   * Derive carrying-capacity thresholds from effective Strength (base score + carryBonus)
   * per SRD Table: Carrying Capacity, scaled by carryMultiplier. Note: `carriedWeight`
   * is already settled here, populated during the 'initial' AE phase.
   */
  private _prepareEncumbrance(): void {
    const encumbrance = this.encumbrance;
    const effectiveStrength = this.abilities.str.score + encumbrance.carryBonus;
    const base = getCarryingCapacity(effectiveStrength, this.size, this.isQuadruped);

    encumbrance.light = Math.floor(base.light * encumbrance.carryMultiplier);
    encumbrance.medium = Math.floor(base.medium * encumbrance.carryMultiplier);
    encumbrance.heavy = Math.floor(base.heavy * encumbrance.carryMultiplier);
    encumbrance.maxLift = encumbrance.heavy * 2;
    encumbrance.drag = encumbrance.heavy * 5;
    encumbrance.tier = computeEncumbranceTier(
      encumbrance.carriedWeight,
      encumbrance.light,
      encumbrance.medium,
      encumbrance.heavy
    );
  }

  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();

    schema.abilities = new SchemaField({
      str: abilityEntry(),
      dex: abilityEntry(),
      con: abilityEntry(),
      int: abilityEntry(),
      wis: abilityEntry(),
      cha: abilityEntry(),
    });

    schema.hp = new SchemaField({
      max:       useDnd35eField(derivedNumberField(0)),
      current:   useDnd35eField(requiredNumberField(0), { maskedEditStrategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR }),
      temp:      useDnd35eField(requiredNumberField(0), { maskedEditStrategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR }),
      nonlethal: useDnd35eField(requiredNumberField(0), { maskedEditStrategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR }),
      regeneration: useDnd35eField(derivedNumberField(0)),
      fastHealing: useDnd35eField(derivedNumberField(0)),
    });

    schema.bab = new SchemaField({
      total: useDnd35eField(derivedNumberField(0), { familiar: { aliases: ['baseAttackBonus'] } }),
    });
    schema.aooCount = useDnd35eField(derivedNumberField(1), { familiar: { aliases: ['attacksOfOpportunity'] } });

    schema.defense = new SchemaField({
      armorClass:     useDnd35eField(derivedNumberField(10)),
      touchAC:      useDnd35eField(derivedNumberField(10)),
      flatFootedAC: useDnd35eField(derivedNumberField(10)),
      naturalArmor:    useDnd35eField(derivedNumberField(0)),
      fortification: useDnd35eField(derivedNumberField(0)),
      concealment: useDnd35eField(derivedNumberField(0)),
      spellResistance: useDnd35eField(new FormulaField({
        expectedType: 'number',
        nullable: true,
        required: false,
        initial: () => ({
          formula: '',
          expectedType: 'number',
          resolvedValue: '0',
        }),
      }), {
        familiar: { aliases: ['spellResistance'] },
      }),
    });

    schema.saves = new SchemaField({
      fort:   useDnd35eField(derivedNumberField(0)),
      reflex: useDnd35eField(derivedNumberField(0)),
      will:   useDnd35eField(derivedNumberField(0)),
    });

    schema.init = new SchemaField({
      total: useDnd35eField(derivedNumberField(0), { familiar: { aliases: ['initiative'] } }),
    });

    schema.bio = new SchemaField({
      gender: useDnd35eField(nullableBioField()),
      deity:  useDnd35eField(nullableBioField()),
      age:    useDnd35eField(nullableBioField()),
      height: useDnd35eField(nullableBioField()),
      weight: useDnd35eField(nullableBioField()),
      alignment: new SchemaField({
        law:   useDnd35eField(new StringField({ nullable: true, required: true, initial: null, choices: [...LAW_AXES] })),
        moral: useDnd35eField(new StringField({ nullable: true, required: true, initial: null, choices: [...MORAL_AXES] })),
      }),
      languages: new ArrayField(new StringField({ required: true, blank: false }), { initial: [] }),
      senses: new ArrayField(new SchemaField({
        type:     useDnd35eField(requiredTypedStringField(SENSE_TYPES, 'darkvision')),
        distance: useDnd35eField(requiredNumberField(0)),
      }), { initial: [] }),
    });

    schema.level = useDnd35eField(derivedNumberField(1), { familiar: { aliases: ['lvl'] } });

    schema.settings = new SchemaField({
      isPartyMember: new BooleanField({ initial: false }),
    });

    schema.notes = useDnd35eField(new HTMLField({ required: false, nullable: false, blank: true }));

    schema.currency = useDnd35eField(new CurrencyField({ required: true }));

    schema.attacks = new ArrayField(new SchemaField({
      damageRoll: new StringField({ required: true, initial: '', blank: true }),
      damageType: new StringField({ required: true, initial: '', blank: true }),
      critRange: new StringField({ required: true, initial: '20' }),
      critMultiplier: requiredNumberField(2),
      rangeIncrement: requiredNumberField(0),
      attackFormula: new StringField({ required: true, initial: '', blank: true }),
      damageFormula: new StringField({ required: true, initial: '', blank: true }),
    }), {
      initial: [],
      persisted: false,
    });

    schema.encumbrance = new SchemaField({
      carriedWeight:   useDnd35eField(derivedNumberField(0)),
      light:           useDnd35eField(derivedNumberField(0)),
      medium:          useDnd35eField(derivedNumberField(0)),
      heavy:           useDnd35eField(derivedNumberField(0)),
      maxLift:         useDnd35eField(derivedNumberField(0)),
      drag:            useDnd35eField(derivedNumberField(0)),
      tier:            useDnd35eField(derivedNumberField(0)),
      carryBonus:      useDnd35eField(derivedNumberField(0)),
      carryMultiplier: useDnd35eField(derivedNumberField(1)),
      maxDexBonus:     useDnd35eField(new NullableCapNumberField({ required: true, nullable: true, initial: null, persisted: false })),
      armorCheckPenalty: useDnd35eField(derivedNumberField(0)),
    });

    schema.isIncorporeal = useDnd35eField(derivedBooleanField(false), { familiar: { aliases: ['incorporeal'] } });
    schema.isQuadruped = useDnd35eField(derivedBooleanField(false), { familiar: { aliases: ['quadraped'] } });

    schema.creatureType = useDnd35eField(derivedNullableOptionalStringField(null));

    return schema;
  }
}

interface CreatureSystemModel extends CreatureSystemData {}

export {
  CreatureSystemModel,
};
