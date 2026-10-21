import { WEAPON_EQUIP_SLOTS, type WeaponEquipSlot } from '@constants/equipmentSlots.mjs';
import {
  requiredBooleanField,
  useDnd35eField,
  withFamiliar,
} from '@fields/fieldBuilders.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import { ACTION_TYPE } from '@items/baseItem/actions/constants.mjs';
import { EquippableItemSystemModel } from '@items/physical/equippableItem/data/index.mjs';
import { MeleeWeaponAttack } from '@items/physical/weapon/actions/MeleeWeaponAttack/MeleeAttackDataModel.mjs';
import { RangedWeaponAttack } from '@items/physical/weapon/actions/RangedAttack/RangedAttackDataModel.mjs';

import { WEAPON_BASE_TYPES, WEAPON_SUBTYPES, WEAPON_TYPE, WEAPON_TYPES } from './constants.mjs';
import type { WeaponSystemData } from './WeaponSystemData.mjs';

const {
  fields: {
    ArrayField,
    StringField,
    TypedSchemaField,
  },
} = foundry.data;

class WeaponSystemModel extends EquippableItemSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.WEAPON'];

  static override defineSchema () {
    const schema = super.defineSchema();

    // Force Slots into subset of Weapon slots (mainHand, offHand, etc.)
    schema.availableEquipmentSlots = useDnd35eField( new ArrayField(
      new StringField<WeaponEquipSlot, WeaponEquipSlot, true, false, true>({ required: true }),
      { initial: [...WEAPON_EQUIP_SLOTS], required: true }
    ));

    // Declare Owner context on inherited nameFormula (it's now a plain FormulaField)
    (schema.nameFormula as FormulaField).formulaContexts = [
      { contextName: 'Owner', resolvePath: 'parent', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['Parent'] },
    ];

    schema.isBaseWeaponType = requiredBooleanField(false);
    schema.weaponType = useDnd35eField(
      new StringField({ 
        choices: [
          ...WEAPON_TYPES,
        ],
        initial: WEAPON_TYPE.SIMPLE,
        required: true,
      }),
      {
        familiar: { aliases: ['type'] },
      });
    schema.weaponSubtype = useDnd35eField(new StringField({ choices: [...WEAPON_SUBTYPES], initial: 'light', required: true }), { familiar: { aliases: ['subtype'] } });
    schema.weaponBaseType = useDnd35eField(new StringField({ choices: [...WEAPON_BASE_TYPES], initial: '', required: true, blank: true }));

    // System-managed weapon-attack actions (§10.3/§10.4) — auto-created/synced by
    // weaponActionSync.mts, live-merged by Weapon.getContributedActorChanges().
    // Key names must match each leaf DataModel's own `type` field value for
    // TypedSchemaField's type discriminant to resolve correctly.
    // `formulaVisible: false` — the raw ArrayField(TypedSchemaField) shape isn't
    // recognized by the schema walker's default array-classification (`inferArrayElementInfo()`
    // only handles plain `SchemaField` elements); a proper `actions` FieldAspect
    // (`arrayElement.kind: 'embeddedModel'`) is injected instead by
    // `withActionCollectionAspects()` in the item familiar schema registration.
    schema.actions = withFamiliar(useDnd35eField(new ArrayField(
      new TypedSchemaField({
        [ACTION_TYPE.MELEE]: MeleeWeaponAttack,
        [ACTION_TYPE.RANGED]: RangedWeaponAttack,
      }),
      { initial: [] }
    )), { formulaVisible: false });

    return schema;
  }

  /**
   * `system.actions` is an `ArrayField` — `DocumentSystemModel`'s generic
   * `prepareBaseData()` reset walk never recurses into it, so each embedded action must
   * reset its own `FormulaField`s explicitly (see `ActionDataModel.resetFormulaFields()`).
   */
  override prepareBaseData(): void {
    super.prepareBaseData();
    for (const action of this.actions) {
      action.resetFormulaFields();
    }
  }

  /**
   * `system.actions`' Group Change Target AE changes (`#item.meleeWeaponAttacks.attackDamage`/
   * `attackToHit`, see `changeTargetGroups.mts`) apply in the `'final'` phase — after this
   * system model's own `prepareDerivedData()` already ran. Resolving here (instead of in
   * `prepareDerivedData()`) means `ItemDnd35e.prepareDerivedData()` can call this *after*
   * its FINAL/POST active-effect phases, so resolution sees the fully AE-settled formula
   * (see `ActionDataModel.resolveFormulaFields()`).
   */
  override resolveDeferredFormulaFields(): void {
    super.resolveDeferredFormulaFields();
    for (const action of this.actions) {
      action.resolveFormulaFields();
    }
  }
}

interface WeaponSystemModel extends WeaponSystemData {}

export { WeaponSystemModel };
