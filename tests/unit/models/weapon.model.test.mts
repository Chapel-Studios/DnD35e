import { WeaponSystemModel } from '@items/physical/weapon/data/WeaponSystemModel.mjs';
import { describe, it } from 'vitest';

import { createSchemaTester } from '../../helpers/schemaTester.mjs';

/**
 * Schema-shape tests for WeaponSystemModel.
 *
 * Inspects `defineSchema()` output via the reusable {@link createSchemaTester}
 * factory. Runtime behavior (defaults applied on construction, validators
 * rejecting bad input) is verified end-to-end in Playwright — not here.
 *
 * Weapon-attack semantics (crit range, attack/damage formula evaluation, range
 * increment math, ammo enforcement) live on each `system.actions` entry's own
 * `ActionDataModel`/`WeaponAttackDataModel` subclass (poc.10), not directly on
 * `WeaponSystemModel` — those intentionally land as `it.todo` here.
 */

const { StringField, ArrayField, BooleanField } =
  (globalThis as any).foundry.data.fields;

describe('WeaponSystemModel schema', () => {
  const t = createSchemaTester(WeaponSystemModel);

  describe('declared top-level fields', () => {
    it('declares all weapon-specific fields', () => {
      t.assertField('isBaseWeaponType');
      // isMasterwork is derived (from active masterwork AEs) — not a schema field
      t.assertField('weaponType');
      t.assertField('weaponSubtype');
      t.assertField('weaponBaseType');
      t.assertField('availableEquipmentSlots');
      // System-managed weapon-attack actions (poc.10 §10.3) — replaces the
      // earlier single `weaponDamage` sub-schema.
      t.assertField('actions');
    });

    it('inherits the equippable layer (equipment slots, size, meld)', () => {
      t.assertField('isEquipped');
      t.assertField('equippedSlotIds');
      t.assertField('isMelded');
      t.assertField('designedForSize');
      t.assertField('isWeightlessWhenEquipped');
    });

    it('inherits the physical layer (hp, hardness, quantity, weight)', () => {
      t.assertField('hp');
      t.assertField('hardness');
      t.assertField('quantity');
      t.assertField('weight');
    });

    it('inherits the document base (nameFormula, description)', () => {
      t.assertField('nameFormula');
      t.assertField('description');
    });
  });

  describe('field types', () => {
    it('boolean flags use BooleanField', () => {
      t.assertFieldType('isBaseWeaponType', BooleanField);
    });

    it('weaponType / weaponSubtype / weaponBaseType use StringField', () => {
      t.assertFieldType('weaponType', StringField);
      t.assertFieldType('weaponSubtype', StringField);
      t.assertFieldType('weaponBaseType', StringField);
    });

    it('availableEquipmentSlots is an ArrayField', () => {
      t.assertFieldType('availableEquipmentSlots', ArrayField);
    });

    it('equippedSlotIds is an ArrayField', () => {
      t.assertFieldType('equippedSlotIds', ArrayField);
    });

    it('actions is an ArrayField of TypedSchemaField-discriminated attack subtypes', () => {
      t.assertFieldType('actions', ArrayField);
    });
  });

  describe('declared defaults', () => {
    it('non-combat flags default to false', () => {
      t.assertDefault('isBaseWeaponType', false);
    });

    it('weaponType defaults to "simple", weaponSubtype to "light"', () => {
      t.assertDefault('weaponType', 'simple');
      t.assertDefault('weaponSubtype', 'light');
    });

    it('weaponBaseType defaults to empty string (blank allowed)', () => {
      t.assertDefault('weaponBaseType', '');
    });
  });

  describe('choices', () => {
    it('weaponType allows the declared weapon-type set', () => {
      t.assertChoices('weaponType', ['simple', 'martial', 'exotic']);
    });

    it('weaponSubtype includes "light"', () => {
      t.assertChoices('weaponSubtype', ['light']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // Weapon-attack semantics — flesh out during the combat phase, on
  // WeaponAttackDataModel/MeleeWeaponAttack/RangedWeaponAttack instead.
  // ─────────────────────────────────────────────────────────────────────

  describe('combat semantics (deferred to combat phase)', () => {
    it.todo('critRange parses "20", "19-20", "18-20" correctly');
    it.todo('critRange rejects malformed strings ("0", "21", "abc")');
    it.todo('critMultiplier validates >= 1');
    it.todo('damageFormula validates as a parseable dice expression');
    it.todo('rangeIncrement validates as a positive integer when set');
    it.todo('attackFormula / damageFormula resolve via FormulaFamiliar');
    it.todo('damageType is restricted to declared DAMAGE_TYPES choices');
    it.todo('noAmmoRequired interacts correctly with ammunition consumption logic');
  });
});

