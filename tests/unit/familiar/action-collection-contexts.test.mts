import { withActionCollectionAspects } from '@helpers/formulae/actionCollectionFamiliar.mjs';
import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import { describe, expect, it } from 'vitest';

/**
 * `#self.actions`/`#weapon.actions`/`#actor.actions` — searchable action collection.
 *
 * Unlike `#self.items` (real Item documents, dispatched per-element via the
 * documentType/subtype registry), action elements are embedded (non-Document)
 * DataModels — walked per-element via their own `.schema.fields` directly
 * (`arrayElement.kind: 'embeddedModel'`).
 *
 * `weapon.system.actions` is a real ArrayField; `actor.system.actions` is a
 * `TypedObjectField` (Record<id, stub>) — both materialize to a searchable array at
 * resolve time (Record values via `Object.values()`).
 */
const { resolveFormula } = FormulaResolver;
const { NumberField, StringField } = foundry.data.fields;

const makeFakeAttack = (name: string, type: string, reachLength: number) => ({
  schema: {
    fields: {
      type: new (StringField as any)({}),
      reachLength: new (NumberField as any)({}),
    },
  },
  type,
  reachLength,
  name: { resolvedValue: name },
});

describe('withActionCollectionAspects', () => {
  it('adds an actions array FieldAspect with kind embeddedModel', () => {
    const group = withActionCollectionAspects({});
    expect(group.actions).toMatchObject({ type: 'array', accessPath: 'system.actions' });
    expect((group.actions as { arrayElement?: { kind?: string } }).arrayElement?.kind).toBe('embeddedModel');
  });

  it('counts a live ArrayField-shaped actions collection (weapon)', () => {
    const context = { system: { actions: [makeFakeAttack('A', 'melee_weapon_attack', 5), makeFakeAttack('B', 'ranged_weapon_attack', 0)] } };
    const group = withActionCollectionAspects({}, context as never);
    expect((group.actions as { value?: number }).value).toBe(2);
  });

  it('counts a live TypedObjectField-shaped (Record) actions collection (actor)', () => {
    const context = { system: { actions: { a1: makeFakeAttack('A', 'melee_weapon_attack', 5), a2: makeFakeAttack('B', 'melee_weapon_attack', 0) } } };
    const group = withActionCollectionAspects({}, context as never);
    expect((group.actions as { value?: number }).value).toBe(2);
  });
});

describe('$weapon.actions — embeddedModel predicate resolution + Record materialization', () => {
  const schema: FamiliarSchema = {
    weapon: { properties: withActionCollectionAspects({}) },
    actor: { properties: withActionCollectionAspects({}) },
  };

  const weaponDocMap = {
    weapon: {
      system: {
        actions: [
          makeFakeAttack('Longsword Attack', 'melee_weapon_attack', 5),
          makeFakeAttack('Longbow Attack', 'ranged_weapon_attack', 0),
        ],
      },
    },
  };

  const actorDocMap = {
    actor: {
      system: {
        actions: {
          a1: makeFakeAttack('Longsword Attack', 'melee_weapon_attack', 5),
          a2: makeFakeAttack('Longbow Attack', 'ranged_weapon_attack', 0),
        },
      },
    },
  };

  it('$count(#weapon.actions) counts a real ArrayField collection', () => {
    expect(resolveFormula('$count(#weapon.actions)', schema, weaponDocMap as never)).toBe('2');
  });

  it('$count(#actor.actions) counts a TypedObjectField (Record) collection via Object.values()', () => {
    expect(resolveFormula('$count(#actor.actions)', schema, actorDocMap as never)).toBe('2');
  });

  it('$any(...) filters by the action\'s own `type` field', () => {
    expect(resolveFormula('$any(#weapon.actions, #it.type == \'melee_weapon_attack\')', schema, weaponDocMap as never)).toBe('true');
    expect(resolveFormula('$any(#weapon.actions, #it.type == \'spell\')', schema, weaponDocMap as never)).toBe('false');
  });

  it('$count(...) with a predicate matching only one action type', () => {
    expect(resolveFormula('$count(#weapon.actions, #it.type == \'melee_weapon_attack\')', schema, weaponDocMap as never)).toBe('1');
  });
});

describe('named-element access — #weapon.actions.\'Resolved Name\'.property', () => {
  const schema: FamiliarSchema = {
    weapon: { properties: withActionCollectionAspects({}) },
  };

  const docMap = {
    weapon: {
      system: {
        actions: [
          makeFakeAttack('Longsword Attack', 'melee_weapon_attack', 5),
          makeFakeAttack('LongbowAttack', 'ranged_weapon_attack', 0),
        ],
      },
    },
  };

  it('resolves a quoted custom path addressing one element by its resolved name', () => {
    expect(resolveFormula('#weapon.\'system.actions.Longsword Attack.reachLength\'', schema, docMap as never)).toBe('5');
  });

  it('resolves an unquoted path when the resolved name has no spaces', () => {
    expect(resolveFormula('#weapon.actions.LongbowAttack.reachLength', schema, docMap as never)).toBe('0');
  });

  it('leaves the token unresolved when no element matches the given name', () => {
    expect(resolveFormula('#weapon.actions.NoSuchAction.reachLength', schema, docMap as never)).toBe('#weapon.actions.NoSuchAction.reachLength');
  });
});
