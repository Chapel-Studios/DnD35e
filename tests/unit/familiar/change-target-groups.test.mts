import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { ChangeTargetGroup } from '@helpers/formulae/changeTargetGroups.mjs';
import {
  changeTargetGroups,
  registerChangeTargetGroup,
  resolveChangeTargets,
  withChangeTargetGroups,
} from '@helpers/formulae/changeTargetGroups.mjs';
import type { FamiliarContext } from '@helpers/formulae/types.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Unit tests for poc §7.7's Group Change Target registry (`src/helpers/formulae/changeTargetGroups.mts`).
 *
 * The module self-registers a POC entry ("group:allSaves") at import time — these tests
 * exercise that real registration alongside a locally-registered fixture group, rather
 * than clearing/mocking the module-level `changeTargetGroups` Map (it's meant to be a
 * process-lifetime singleton, same as `familiarSchemaRegistry`).
 */

describe('changeTargetGroups — POC registration', () => {
  it('registers "group:allSaves" expanding to the three flattened save fields', () => {
    const group = changeTargetGroups.get('group:allSaves');
    expect(group).toBeDefined();
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

  it('appends registered groups as synthetic isGroup leaf entries without mutating the input', () => {
    const result = withChangeTargetGroups(baseContext);

    expect(result).not.toBe(baseContext);
    expect(result.properties).not.toBe(baseContext.properties);
    expect(baseContext.properties['group:allSaves']).toBeUndefined();

    const groupEntry = result.properties['group:allSaves'];
    expect(groupEntry).toEqual({
      type: 'string',
      accessPath: 'group:allSaves',
      display: 'dnd35e.Formula.ChangeGroups.allSaves',
      isGroup: true,
    });
  });

  it('preserves existing real fields alongside the injected group entries', () => {
    const result = withChangeTargetGroups(baseContext);
    expect(result.properties.hardness).toEqual(baseContext.properties.hardness);
  });
});

describe('registerChangeTargetGroup', () => {
  it('adds a new group that becomes resolvable via resolveChangeTargets', () => {
    const fixture: ChangeTargetGroup = {
      key: 'group:__testFixtureOnly',
      label: 'dnd35e.Test.fixtureLabel',
      category: 'dnd35e.Test.fixtureCategory',
      expand: () => ['system.testField.a', 'system.testField.b'],
    };
    registerChangeTargetGroup(fixture);

    expect(resolveChangeTargets('group:__testFixtureOnly', {} as ActorDnd35e)).toEqual([
      'system.testField.a',
      'system.testField.b',
    ]);

    const withGroups = withChangeTargetGroups({ properties: {} });
    expect(withGroups.properties['group:__testFixtureOnly']).toEqual({
      type: 'string',
      accessPath: 'group:__testFixtureOnly',
      display: 'dnd35e.Test.fixtureLabel',
      isGroup: true,
    });
  });
});
