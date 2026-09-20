import { CreatureSystemModel } from '@documents/actors/creature/data/CreatureSystemModel.mjs';
import { buildItFamiliarContext } from '@helpers/formulae/itContext.mjs';
import { gatherAspectsFromSchema } from '@helpers/formulae/schemaWalker.mjs';
import type { AspectGroup, FamiliarSchema, FieldAspect } from '@helpers/formulae/types.mjs';
import { describe, expect, it } from 'vitest';

describe('FormulaFamiliar localization data', () => {
  const originalLocalize = game.i18n.localize.bind(game.i18n);

  function withLocalizedFamiliarLabels<T>(callback: () => T): T {
    const labels: Record<string, string> = {
      'dnd35e.CREATURE.FIELDS.abilities.con.familiarLabel': 'Con',
      'dnd35e.CREATURE.FIELDS.abilities.con.score.familiarLabel': 'Score',
      'dnd35e.ACTOR.FIELDS.speed.land.familiarLabel': 'Land',
      'dnd35e.ACTOR.FIELDS.speed.flyManeuverability.familiarLabel': 'Maneuverability',
      'dnd35e.ACTOR.FIELDS.senses.element.type.familiarLabel': 'Type',
      'dnd35e.ACTOR.FIELDS.senses.element.distance.familiarLabel': 'Range',
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

  it('displays familiar labels for #it predicate fields over senses (poc §7.2b)', () => {
    return withLocalizedFamiliarLabels(() => {
      const familiar = gatherAspectsFromSchema(CreatureSystemModel) as AspectGroup;
      const schema: FamiliarSchema = { self: { properties: familiar } };

      const sensesIt = buildItFamiliarContext('#self.senses', schema);
      expect(sensesIt).not.toBeNull();
      expect((sensesIt!.properties.type as FieldAspect).display).toBe('Type');
      expect((sensesIt!.properties.distance as FieldAspect).display).toBe('Range');
    });
  });
});

