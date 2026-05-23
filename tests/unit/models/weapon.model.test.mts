import { DAMAGE_TYPE_SLASHING } from '@constants/attacks/damageTypes.mjs';
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
 * Combat-related semantics (crit range parsing, attack/damage formula
 * evaluation, range increment math, ammo enforcement) intentionally land
 * as `it.todo` and are fleshed out in the combat phase.
 */

const { NumberField, StringField, SchemaField, ArrayField, BooleanField } =
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
      t.assertField('weaponDamage');
      t.assertField('attackNotes');
      t.assertField('damageNotes');
      t.assertField('noAmmoRequired');
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
      // isMasterwork is derived, not a schema field
      t.assertFieldType('noAmmoRequired', BooleanField);
    });

    it('weaponType / weaponSubtype / weaponBaseType use StringField', () => {
      t.assertFieldType('weaponType', StringField);
      t.assertFieldType('weaponSubtype', StringField);
      t.assertFieldType('weaponBaseType', StringField);
    });

    it('weaponDamage is a SchemaField sub-schema', () => {
      t.assertFieldType('weaponDamage', SchemaField);
    });

    it('equippedSlotIds is an ArrayField', () => {
      t.assertFieldType('equippedSlotIds', ArrayField);
    });
  });

  describe('weaponDamage sub-fields', () => {
    it('declares all expected damage sub-fields', () => {
      t.assertField('weaponDamage.damageRoll');
      t.assertField('weaponDamage.damageType');
      t.assertField('weaponDamage.critRange');
      t.assertField('weaponDamage.critMultiplier');
      t.assertField('weaponDamage.rangeIncrement');
      t.assertField('weaponDamage.attackFormula');
      t.assertField('weaponDamage.damageFormula');
    });

    it('uses correct field types within weaponDamage', () => {
      t.assertFieldType('weaponDamage.damageRoll', StringField);
      t.assertFieldType('weaponDamage.damageType', StringField);
      t.assertFieldType('weaponDamage.critRange', StringField);
      t.assertFieldType('weaponDamage.critMultiplier', NumberField);
      t.assertFieldType('weaponDamage.rangeIncrement', NumberField);
    });
  });

  describe('declared defaults', () => {
    it('non-combat flags default to false', () => {
      t.assertDefault('isBaseWeaponType', false);
      // isMasterwork is derived — no schema default
      t.assertDefault('noAmmoRequired', false);
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
  // Combat-related semantics — flesh out during the combat phase.
  // ─────────────────────────────────────────────────────────────────────

  describe('combat semantics (deferred to combat phase)', () => {
    it.todo('weaponDamage.critRange parses "20", "19-20", "18-20" correctly');
    it.todo('weaponDamage.critRange rejects malformed strings ("0", "21", "abc")');
    it.todo('weaponDamage.critMultiplier validates >= 1');
    it.todo('weaponDamage.damageRoll validates as a parseable dice expression');
    it.todo('weaponDamage.rangeIncrement validates as a positive integer when set');
    it.todo('weaponDamage.attackFormula / damageFormula resolve via FormulaFamiliar');
    it.todo('damageType is restricted to declared DAMAGE_TYPES choices');
    it.todo('noAmmoRequired interacts correctly with ammunition consumption logic');
  });

  // Default value sanity for damageType lives here (not deferred — it's
  // pure schema declaration, not combat behavior).
  it('damageType defaults to slashing', () => {
    t.assertDefault('weaponDamage.damageType', DAMAGE_TYPE_SLASHING);
  });
});
