import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { ChangeTargetGroup } from '@helpers/formulae/changeTargetGroups.mjs';
import {
  changeTargetGroups,
  registerChangeTargetGroup,
  resolveChangeTargets,
  withChangeTargetGroups,
} from '@helpers/formulae/changeTargetGroups.mjs';
import type { FamiliarContext } from '@helpers/formulae/types.mjs';
import { getAutocompleteOptions } from '@helpers/formulae/utils.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Unit tests for poc §7.7's Group Change Target registry (`src/helpers/formulae/changeTargetGroups.mts`).
 *
 * The module self-registers a POC entry ("group:allSaves") at import time — these tests
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
  it('registers "group:allSaves" nested at ["saves", "all"], expanding to the three flattened save fields', () => {
    const group = changeTargetGroups.get('group:allSaves');
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
    expect(resolveChangeTargets('group:allSaves', {} as ActorDnd35e)).toEqual([
      'system.saves.fort',
      'system.saves.reflex',
      'system.saves.will',
    ]);
  });

  it('returns an unregistered key unchanged as a single-element array', () => {
    expect(resolveChangeTargets('system.hp.max', {} as ActorDnd35e)).toEqual(['system.hp.max']);
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
      () => withChangeTargetGroups(baseContext)
    );

    expect(result).not.toBe(baseContext);
    expect(result.properties).not.toBe(baseContext.properties);
    expect(baseContext.properties.saves).toBeUndefined();
    expect(result.properties['group:allSaves']).toBeUndefined();

    // treePath ['saves', 'all'] nests the leaf as result.properties.saves.all — discoverable
    // in the picker dropdown at the same tree position as any real "saves.*" field.
    const savesBranch = result.properties.saves as Record<string, unknown>;
    expect(savesBranch.all).toEqual({
      type: 'string',
      accessPath: 'group:allSaves',
      display: 'All',
      isGroup: true,
    });
  });

  it('falls back to the plain (non-familiar) label when no familiarLabel resolves', () => {
    const result = withLocalizedGroupLabels(
      { 'dnd35e.CREATURE.FIELDS.saves.all.label': 'All Saves' },
      () => withChangeTargetGroups(baseContext)
    );
    const savesBranch = result.properties.saves as Record<string, unknown>;
    expect(savesBranch.all).toMatchObject({ display: 'All Saves' });
  });

  it('falls back to the raw key when neither label nor familiarLabel resolve', () => {
    const result = withChangeTargetGroups(baseContext);
    const savesBranch = result.properties.saves as Record<string, unknown>;
    expect(savesBranch.all).toMatchObject({ display: 'group:allSaves' });
  });

  it('adds the normalized official label as a fallback alias when familiarLabel diverges from it', () => {
    const result = withLocalizedGroupLabels(
      {
        'dnd35e.CREATURE.FIELDS.saves.all.familiarLabel': 'All',
        'dnd35e.CREATURE.FIELDS.saves.all.label': 'All Saves',
      },
      () => withChangeTargetGroups(baseContext)
    );
    const savesBranch = result.properties.saves as Record<string, unknown>;
    expect(savesBranch.all).toMatchObject({ aliases: ['AllSaves'] });
  });

  it('preserves existing real fields alongside the injected group entries', () => {
    const result = withChangeTargetGroups(baseContext);
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

    const result = withChangeTargetGroups(contextWithSaves);
    const savesBranch = result.properties.saves as Record<string, unknown>;

    // Real sibling field is untouched, and the branch's own metadata (e.g. whatever the
    // real "saves" branch resolves its own identifier to) is preserved as-is.
    expect(savesBranch.fort).toEqual((contextWithSaves.properties.saves as Record<string, unknown>).fort);
    expect(savesBranch._display).toBe('SavingThrows');
    expect(savesBranch.all).toMatchObject({ accessPath: 'group:allSaves', isGroup: true });

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
      () => withChangeTargetGroups(contextWithSaves)
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
    const fixture: ChangeTargetGroup = {
      key: 'group:__testFixtureOnly',
      treePath: ['__testFixtureOnly'],
      localizationPrefixes: [],
      category: 'dnd35e.Test.fixtureCategory',
      expand: () => ['system.testField.a', 'system.testField.b'],
    };
    registerChangeTargetGroup(fixture);

    expect(resolveChangeTargets('group:__testFixtureOnly', {} as ActorDnd35e)).toEqual([
      'system.testField.a',
      'system.testField.b',
    ]);

    const withGroups = withChangeTargetGroups({ properties: {} });
    expect(withGroups.properties.__testFixtureOnly).toEqual({
      type: 'string',
      accessPath: 'group:__testFixtureOnly',
      display: 'group:__testFixtureOnly',
      isGroup: true,
    });
  });
});

