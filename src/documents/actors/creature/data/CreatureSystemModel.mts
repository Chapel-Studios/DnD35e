import { ActorSystemModel } from '@actors/baseActor/data/index.mjs';
import { ABILITY_KEYS } from '@constants/abilities.mjs';
import { computeEncumbranceTier } from '@constants/carryingCapacity.mjs';
import {
  getCarryingCapacity,
  LAW_AXES,
  MASKED_EDIT_STRATEGY,
  MORAL_AXES,
  SENSE_TYPES,
  SIZES,
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

import type { CreatureSystemData, CreatureSystemSource } from './CreatureSystemData.mjs';

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
   * Reset every AE-mutated field this class cares about to its baseline before
   * `applyActiveEffects('initial')` runs (which happens in `prepareEmbeddedDocuments()`,
   * right after `prepareBaseData()` - before `prepareDerivedData()` computes ability mods
   * and encumbrance from them - see docs/architecture/actor-data-pipeline.md). DataModel
   * instances persist in memory across `prepareData()` passes, so any field an 'initial'-phase
   * ADD/DOWNGRADE change writes to must be put back to a known baseline here, or it
   * compounds every re-prepare instead of just applying once:
   *  - `abilities.*.score` is a real persisted field (the character's entered score) - reset
   *    from `_source`, not a hardcoded baseline, so an item AE like "of Strength +4" (an
   *    'initial'-phase ADD targeting `system.abilities.str.score`) adds cleanly on top of
   *    the true stored score every pass instead of stacking on its own previous result.
   *    This is what guarantees the enhancement resolves - and is reflected in `score` -
   *    before `_prepareEncumbrance()` below ever reads it.
   *  - `encumbrance.carriedWeight` (populated only via `PhysicalItem._buildCarriedChanges()`'s
   *    'add' changes) would compound every re-prepare since nothing else recomputes it from
   *    scratch.
   *  - `encumbrance.carryBonus`/`carryMultiplier` (AE targets per the Carrying Capacity table -
   *    e.g. a Carrying feat or Ant Haul) are `persisted: false` derived fields with no
   *    `_source` to fall back on, so they reset to their schema defaults (0 / 1) instead.
   *  - `maxDexBonus`/`armorCheckPenalty` (populated only via `Creature.getSelfContributedChanges()`'s
   *    'final'-phase DOWNGRADE changes) have the same problem in reverse: once downgraded,
   *    they'd never return to baseline after the tier drops back to 0, since DOWNGRADE
   *    never restores a value, only lowers it further.
   * Mirrors the existing reset pattern used for `speed.<key>`/`inventoryValue` in
   * `ActorSystemModel.prepareDerivedData()`.
   */
  override prepareBaseData(): void {
    super.prepareBaseData();

    const sourceAbilities = (this._source as unknown as CreatureSystemSource).abilities;
    for (const key of ABILITY_KEYS) {
      this.abilities[key].score = sourceAbilities[key].score;
    }

    this.encumbrance.carriedWeight = this.currency.getWeightInLbs();
    this.encumbrance.carryBonus = 0;
    this.encumbrance.carryMultiplier = 1;
    this.encumbrance.maxDexBonus = null;
    this.encumbrance.armorCheckPenalty = 0;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    for (const ability of Object.values(this.abilities)) {
      ability.mod = Math.floor((ability.score - 10) / 2);
    }
    this._prepareEncumbrance();
  }

  /**
   * Derive carrying-capacity thresholds from effective Strength (base score + carryBonus)
   * per SRD Table: Carrying Capacity, scaled by carryMultiplier (size/quadruped AEs target
   * this). SRD "lift over head" equals the `heavy` threshold (see `CreatureEncumbrance.vue`'s
   * `carry` label); `maxLift` ("lift off ground") is 2x heavy; `drag` ("push or drag") is
   * 5x heavy.
   *
   * `tier` is derived from `carriedWeight` here too - carried-item AE changes that
   * populate `carriedWeight` apply in the 'initial' phase (see `PhysicalItem._buildCarriedChanges()`),
   * which runs before `prepareDerivedData()`, so `carriedWeight` is already settled for
   * this pass by the time this method runs.
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

    const saveEntry = () => new SchemaField({
      total: useDnd35eField(derivedNumberField(0)),
    });

    schema.saves = new SchemaField({
      fort: saveEntry(),
      ref:  saveEntry(),
      will: saveEntry(),
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

    schema.size = useDnd35eField(requiredTypedStringField(SIZES, 'medium'));

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
      carry:           useDnd35eField(derivedNumberField(0)),
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
