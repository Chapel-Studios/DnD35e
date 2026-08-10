import { CreatureSystemModel } from '@documents/actors/creature/data/CreatureSystemModel.mjs';
import { buildItFamiliarContext } from '@helpers/formulae/itContext.mjs';
import { gatherAspectsFromSchema } from '@helpers/formulae/schemaWalker.mjs';
import type { AspectGroup, FamiliarSchema, FieldAspect } from '@helpers/formulae/types.mjs';
import { WeaponSystemModel } from '@items/physical/weapon/data/WeaponSystemModel.mjs';
import { describe, expect, it } from 'vitest';

describe('FormulaFamiliar localization data', () => {
  const originalLocalize = game.i18n.localize.bind(game.i18n);

  function withLocalizedFamiliarLabels<T>(callback: () => T): T {
    const labels: Record<string, string> = {
      'dnd35e.CREATURE.FIELDS.abilities.con.familiarLabel': 'Con',
      'dnd35e.CREATURE.FIELDS.abilities.con.score.familiarLabel': 'Score',
      'dnd35e.ACTOR.FIELDS.speed.land.familiarLabel': 'Land',
      'dnd35e.ACTOR.FIELDS.speed.flyManeuverability.familiarLabel': 'Maneuverability',
      'dnd35e.WEAPON.FIELDS.weaponDamage.familiarLabel': 'Weapon Damage',
      'dnd35e.WEAPON.FIELDS.weaponDamage.damageRoll.familiarLabel': 'Roll',
      'dnd35e.WEAPON.FIELDS.weaponDamage.damageType.familiarLabel': 'Type',
      'dnd35e.WEAPON.FIELDS.weaponDamage.critRange.familiarLabel': 'Range',
      'dnd35e.WEAPON.FIELDS.weaponDamage.critMultiplier.familiarLabel': 'Multiplier',
      'dnd35e.WEAPON.FIELDS.weaponDamage.attackFormula.familiarLabel': 'Attack Formula',
      'dnd35e.WEAPON.FIELDS.weaponDamage.damageFormula.familiarLabel': 'Damage Formula',
      'dnd35e.CREATURE.FIELDS.bio.senses.element.type.familiarLabel': 'Type',
      'dnd35e.CREATURE.FIELDS.bio.senses.element.distance.familiarLabel': 'Range',
      'dnd35e.CREATURE.FIELDS.attacks.actions.element.damageRoll.familiarLabel': 'Roll',
      'dnd35e.CREATURE.FIELDS.attacks.actions.element.damageType.familiarLabel': 'Type',
    };

    game.i18n.localize = ((key: string) => labels[key] ?? originalLocalize(key)) as typeof game.i18n.localize;
    try {
      return callback();
    } finally {
      game.i18n.localize = originalLocalize;
    }
  }

  it('displays familiar labels for creature ability scores and speed', () => {
    return withLocalizedFamiliarLabels(() => {
      const familiar = gatherAspectsFromSchema(CreatureSystemModel) as AspectGroup;

      const abilities = familiar.abilities as AspectGroup;

      expect((abilities.con as AspectGroup)._display).toBe('Con');
      expect(((abilities.con as AspectGroup).score as FieldAspect).display).toBe('Score');
    });
  });

  it('displays familiar labels for weapon damage nodes', () => {
    return withLocalizedFamiliarLabels(() => {
      const familiar = gatherAspectsFromSchema(WeaponSystemModel) as AspectGroup;
      const damage = familiar.weaponDamage as AspectGroup;

      expect((damage as AspectGroup)._display).toBe('Weapon Damage');
      expect((damage.damageRoll as FieldAspect).display).toBe('Roll');
      expect((damage.damageType as FieldAspect).display).toBe('Type');
      expect((damage.critRange as FieldAspect).display).toBe('Range');
      expect((damage.critMultiplier as FieldAspect).display).toBe('Multiplier');
      expect((damage.attackFormula as FieldAspect).display).toBe('Attack Formula');
      expect((damage.damageFormula as FieldAspect).display).toBe('Damage Formula');
    });
  });

  it('displays familiar labels for #it predicate fields over senses/attacks (poc §7.2b)', () => {
    return withLocalizedFamiliarLabels(() => {
      const familiar = gatherAspectsFromSchema(CreatureSystemModel) as AspectGroup;
      const schema: FamiliarSchema = { self: { properties: familiar } };

      const sensesIt = buildItFamiliarContext('#self.bio.senses', schema);
      expect(sensesIt).not.toBeNull();
      expect((sensesIt!.properties.type as FieldAspect).display).toBe('Type');
      expect((sensesIt!.properties.distance as FieldAspect).display).toBe('Range');

      const attacksIt = buildItFamiliarContext('#self.attacks.actions', schema);
      expect(attacksIt).not.toBeNull();
      expect((attacksIt!.properties.damageRoll as FieldAspect).display).toBe('Roll');
      expect((attacksIt!.properties.damageType as FieldAspect).display).toBe('Type');
    });
  });
});
