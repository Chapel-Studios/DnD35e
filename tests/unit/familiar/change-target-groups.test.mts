import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { EFFECT_CHANGE_TARGET } from '@effects/baseActiveEffect/data/constants.mjs';
import type { ChangeTargetGroup } from '@helpers/formulae/changeTargetGroups.mjs';
import {
  changeTargetGroups,
  registerChangeTargetGroup,
  resolveChangeTargets,
  withChangeTargetGroups,
} from '@helpers/formulae/changeTargetGroups.mjs';
import type { FamiliarContext, FamiliarSchema } from '@helpers/formulae/types.mjs';
import { getAutocompleteOptions, resolveFamiliarLeafToAccessPath } from '@helpers/formulae/utils.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import { describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for poc §7.7's Group Change Target registry (`src/helpers/formulae/changeTargetGroups.mts`).
 *
 * The module self-registers a POC entry ("#actor.saves.all") at import time — these tests
 * exercise that real registration alongside a locally-registered fixture group, rather
 * than clearing/mocking the module-level `changeTargetGroups` Map (it's meant to be a
 * process-lifetime singleton, same as `familiarSchemaRegistry`).
 *
 * `withChangeTargetGroups` resolves each group's own label/familiarLabel/familiarAliases
 * from the localization JSON at `${prefix}.FIELDS.<treePath>.*` — the exact same convention
 * real schema fields use (see `getPathBasedFamiliarLabel`/`getPathBasedLabel` in
 * `schemaWalker.mts`) — so there is no hand-maintained display string to keep in sync.
 * Tests mock `game.i18n.localize` the same way `familiar-localization.test.mts` does.
 */

const originalLocalize = game.i18n.localize.bind(game.i18n);

function withLocalizedGroupLabels<T>(labels: Record<string, string>, callback: () => T): T {
  game.i18n.localize = ((key: string) => labels[key] ?? originalLocalize(key)) as typeof game.i18n.localize;
  try {
    return callback();
  } finally {
    game.i18n.localize = originalLocalize;
  }
}

describe('changeTargetGroups — POC registration', () => {
  it('registers "#actor.saves.all" nested at ["saves", "all"], expanding to the three flattened save fields', () => {
    const group = changeTargetGroups.get('#actor.saves.all');
    expect(group).toBeDefined();
    expect(group!.treePath).toEqual(['saves', 'all']);
    expect(group!.localizationPrefixes).toEqual(['dnd35e.CREATURE']);
    expect(group!.expand({} as ActorDnd35e)).toEqual([
      'system.saves.fort',
      'system.saves.reflex',
      'system.saves.will',
    ]);
  });
});

describe('resolveChangeTargets', () => {
  it('expands a registered group key against the given actor', () => {
    expect(resolveChangeTargets('#actor.saves.all', { [EFFECT_CHANGE_TARGET.ACTOR]: {} as ActorDnd35e })).toEqual([
      'system.saves.fort',
      'system.saves.reflex',
      'system.saves.will',
    ]);
  });

  it('returns an unregistered key unchanged as a single-element array', () => {
    expect(resolveChangeTargets('system.hp.max', { [EFFECT_CHANGE_TARGET.ACTOR]: {} as ActorDnd35e })).toEqual(['system.hp.max']);
  });

  it('drops the change and warns when the group\'s declared contextName is missing from the map', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveChangeTargets('#actor.saves.all', {})).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('#actor.saves.all'));
    warnSpy.mockRestore();
  });
});

describe('withChangeTargetGroups', () => {
  const baseContext: FamiliarContext = {
    display: 'Actor',
    properties: {
      hardness: { type: 'number', accessPath: 'system.hardness', value: 5 },
    },
  };

  it('nests registered groups at their treePath rather than a flat top-level key, without mutating the input', () => {
    const result = withLocalizedGroupLabels(
      { 'dnd35e.CREATURE.FIELDS.saves.all.familiarLabel': 'All' },
      () => withChangeTargetGroups(baseContext, EFFECT_CHANGE_TARGET.ACTOR)
    );

    expect(result).not.toBe(baseContext);
    expect(result.properties).not.toBe(baseContext.properties);
    expect(baseContext.properties.saves).toBeUndefined();
    expect(result.properties['#actor.saves.all']).toBeUndefined();

    // treePath ['saves', 'all'] nests the leaf as result.properties.saves.all — discoverable
    // in the picker dropdown at the same tree position as any real "saves.*" field.
    const savesBranch = result.properties.saves as Record<string, unknown>;
    expect(savesBranch.all).toEqual({
      type: 'string',
      accessPath: '#actor.saves.all',
      display: 'All',
      isGroup: true,
    });
  });

  it('falls back to the plain (non-familiar) label when no familiarLabel resolves', () => {
    const result = withLocalizedGroupLabels(
      { 'dnd35e.CREATURE.FIELDS.saves.all.label': 'All Saves' },
      () => withChangeTargetGroups(baseContext, EFFECT_CHANGE_TARGET.ACTOR)
    );
    const savesBranch = result.properties.saves as Record<string, unknown>;
    expect(savesBranch.all).toMatchObject({ display: 'All Saves' });
  });

  it('falls back to the raw key when neither label nor familiarLabel resolve', () => {
    const result = withChangeTargetGroups(baseContext, EFFECT_CHANGE_TARGET.ACTOR);
    const savesBranch = result.properties.saves as Record<string, unknown>;
    expect(savesBranch.all).toMatchObject({ display: '#actor.saves.all' });
  });

  it('adds the normalized official label as a fallback alias when familiarLabel diverges from it', () => {
    const result = withLocalizedGroupLabels(
      {
        'dnd35e.CREATURE.FIELDS.saves.all.familiarLabel': 'All',
        'dnd35e.CREATURE.FIELDS.saves.all.label': 'All Saves',
      },
      () => withChangeTargetGroups(baseContext, EFFECT_CHANGE_TARGET.ACTOR)
    );
    const savesBranch = result.properties.saves as Record<string, unknown>;
    expect(savesBranch.all).toMatchObject({ aliases: ['AllSaves'] });
  });

  it('preserves existing real fields alongside the injected group entries', () => {
    const result = withChangeTargetGroups(baseContext, EFFECT_CHANGE_TARGET.ACTOR);
    expect(result.properties.hardness).toEqual(baseContext.properties.hardness);
  });

  it('nests alongside real sibling leaves already present in the target branch, preserving the branch\'s own metadata', () => {
    const contextWithSaves: FamiliarContext = {
      display: 'Actor',
      properties: {
        saves: {
          _display: 'SavingThrows',
          fort: { type: 'number', accessPath: 'system.saves.fort', display: 'Fort' },
        },
      },
    };

    const result = withChangeTargetGroups(contextWithSaves, EFFECT_CHANGE_TARGET.ACTOR);
    const savesBranch = result.properties.saves as Record<string, unknown>;

    // Real sibling field is untouched, and the branch's own metadata (e.g. whatever the
    // real "saves" branch resolves its own identifier to) is preserved as-is.
    expect(savesBranch.fort).toEqual((contextWithSaves.properties.saves as Record<string, unknown>).fort);
    expect(savesBranch._display).toBe('SavingThrows');
    expect(savesBranch.all).toMatchObject({ accessPath: '#actor.saves.all', isGroup: true });

    // The original branch object is not mutated.
    expect((contextWithSaves.properties.saves as Record<string, unknown>).all).toBeUndefined();
  });

  it('is discoverable via getAutocompleteOptions nested under the real branch\'s own resolved identifier', () => {
    const contextWithSaves: FamiliarContext = {
      display: 'Actor',
      properties: {
        saves: {
          _display: 'SavingThrows',
          fort: { type: 'number', accessPath: 'system.saves.fort', display: 'Fort' },
        },
      },
    };

    const result = withLocalizedGroupLabels(
      { 'dnd35e.CREATURE.FIELDS.saves.all.familiarLabel': 'All' },
      () => withChangeTargetGroups(contextWithSaves, EFFECT_CHANGE_TARGET.ACTOR)
    );

    const options = getAutocompleteOptions('#character.SavingThrows.', { character: result });
    const groupOption = options.find(o => o.isGroup);

    expect(groupOption).toBeDefined();
    expect(options.some(o => o.path === 'Fort')).toBe(true);
    // Same generic resolution pipeline as any real field — the "SavingThrows" segment comes
    // from the real branch's own `_display`, matching "Fort"'s parent segment exactly.
    expect(groupOption?.fullPath).toBe('#character.SavingThrows.All');
  });
});

describe('registerChangeTargetGroup', () => {
  it('adds a new group that becomes resolvable via resolveChangeTargets', () => {
    const fixture: Omit<ChangeTargetGroup, 'key'> = {
      contextName: EFFECT_CHANGE_TARGET.ACTOR,
      treePath: ['__testFixtureOnly'],
      localizationPrefixes: [],
      category: 'dnd35e.Test.fixtureCategory',
      expand: () => ['system.testField.a', 'system.testField.b'],
    };
    registerChangeTargetGroup(fixture);

    expect(resolveChangeTargets('#actor.__testFixtureOnly', { [EFFECT_CHANGE_TARGET.ACTOR]: {} as ActorDnd35e })).toEqual([
      'system.testField.a',
      'system.testField.b',
    ]);

    const withGroups = withChangeTargetGroups({ properties: {} }, EFFECT_CHANGE_TARGET.ACTOR);
    expect(withGroups.properties.__testFixtureOnly).toEqual({
      type: 'string',
      accessPath: '#actor.__testFixtureOnly',
      display: '#actor.__testFixtureOnly',
      isGroup: true,
    });
  });
});

describe('weapon attack groups (item-scoped)', () => {
  function mockWeapon(actions: { type: string }[]): ItemDnd35e {
    return { system: { actions } } as unknown as ItemDnd35e;
  }

  it('expands "#item.meleeWeaponAttacks.attackToHit" to every melee action\'s attack formula, skipping ranged actions', () => {
    const weapon = mockWeapon([
      { type: 'melee_weapon_attack' },
      { type: 'ranged_weapon_attack' },
      { type: 'melee_weapon_attack' },
    ]);

    expect(resolveChangeTargets('#item.meleeWeaponAttacks.attackToHit', { [EFFECT_CHANGE_TARGET.ITEM]: weapon })).toEqual([
      'system.actions.0.attackFormula.formula',
      'system.actions.2.attackFormula.formula',
    ]);
  });

  it('expands "#item.rangedWeaponAttacks.attackDamage" to every ranged action\'s damage formula', () => {
    const weapon = mockWeapon([
      { type: 'melee_weapon_attack' },
      { type: 'ranged_weapon_attack' },
    ]);

    expect(resolveChangeTargets('#item.rangedWeaponAttacks.attackDamage', { [EFFECT_CHANGE_TARGET.ITEM]: weapon })).toEqual([
      'system.actions.1.damageFormula.formula',
    ]);
  });

  it('returns an empty array when the host has no actions array', () => {
    const notAWeapon = { system: {} } as unknown as ItemDnd35e;
    expect(resolveChangeTargets('#item.meleeWeaponAttacks.attackToHit', { [EFFECT_CHANGE_TARGET.ITEM]: notAWeapon })).toEqual([]);
  });

  it('are offered under contextName "item" but not "actor", and vice versa for "#actor.saves.all"', () => {
    const itemSchema = withChangeTargetGroups({ properties: {} }, EFFECT_CHANGE_TARGET.ITEM);
    const actorSchema = withChangeTargetGroups({ properties: {} }, EFFECT_CHANGE_TARGET.ACTOR);

    const meleeBranch = itemSchema.properties.meleeWeaponAttacks as Record<string, unknown> | undefined;
    expect(meleeBranch?.attackToHit).toMatchObject({ accessPath: '#item.meleeWeaponAttacks.attackToHit' });
    expect(itemSchema.properties.saves).toBeUndefined();

    expect(actorSchema.properties.meleeWeaponAttacks).toBeUndefined();
    expect((actorSchema.properties.saves as Record<string, unknown>)?.all).toMatchObject({ accessPath: '#actor.saves.all' });
  });

  it('round-trips a hand-typed canonical formula (e.g. "#weapon.meleeWeaponAttacks.attackDamage") to the group\'s accessPath', () => {
    const schema: FamiliarSchema = {
      weapon: withChangeTargetGroups({ display: 'Weapon', properties: {} }, EFFECT_CHANGE_TARGET.ITEM),
    };

    expect(resolveFamiliarLeafToAccessPath('#weapon.meleeWeaponAttacks.attackDamage', schema))
      .toBe('#item.meleeWeaponAttacks.attackDamage');
  });
});

