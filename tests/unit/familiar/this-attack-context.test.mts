import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import { buildDocumentFamiliar, registerFamiliarSchema } from '@helpers/formulae/registry.mjs';
import { normalizeLabel } from '@helpers/formulae/schemaWalker.mjs';
import { describe, expect, it } from 'vitest';

/**
 * `thisAttack` context — resolves to the current action's OWN embedded DataModel
 * (e.g. `MeleeWeaponAttack`/`RangedWeaponAttack`), distinct from `self`/`weapon`
 * (the owning Item) and `actor` (the owning Actor).
 *
 * Actions are embedded (non-Document) `foundry.abstract.DataModel` instances with
 * no `.documentName`, so they can't go through the documentType/subtype familiar
 * registry the way Items/Actors/ActiveEffects do. `buildDocumentFamiliar()` instead
 * detects the missing `.documentName` and walks the model's own schema fields
 * directly (no 'system.' path prefix, since the fields sit right on the model).
 */
const { NumberField, StringField } = foundry.data.fields;

const makeFakeAction = () => ({
  schema: {
    fields: {
      critRange: new (NumberField as any)({}),
      damageType: new (StringField as any)({}),
    },
  },
  critRange: 19,
  damageType: 'fire',
});

describe('buildDocumentFamiliar — embedded (non-Document) DataModel support', () => {
  it('walks the model\'s own schema fields with no "system." accessPath prefix', () => {
    const fakeAction = makeFakeAction();
    const schema = buildDocumentFamiliar(fakeAction as never);

    expect(schema.self).toBeDefined();
    expect(schema.self?.properties.critRange).toMatchObject({ type: 'number', accessPath: 'critRange', value: 19 });
    expect(schema.self?.properties.damageType).toMatchObject({ type: 'string', accessPath: 'damageType', value: 'fire' });
  });

  it('returns an empty schema for a falsy document', () => {
    expect(buildDocumentFamiliar(null)).toEqual({});
  });
});

describe('FormulaData.resolveSource — #thisAttack.* resolution', () => {
  it('resolves a property directly off the action\'s own DataModel', () => {
    const fakeAction = makeFakeAction();
    const source = FormulaData.toSource('#thisAttack.critRange');
    const result = FormulaData.resolveSource(source, { thisAttack: fakeAction });
    expect(result).toBe('19');
  });

  it('resolves alongside self/actor contexts in the same map', () => {
    const fakeAction = makeFakeAction();
    const source = FormulaData.toSource('#thisAttack.damageType');
    const result = FormulaData.resolveSource(source, { thisAttack: fakeAction, self: null, actor: null });
    expect(result).toBe('fire');
  });
});

describe('FormulaData.buildFamiliarSchema — one document under multiple context aliases', () => {
  registerFamiliarSchema('Item', 'dedupTestWeapon' as never, () => ({
    name: { type: 'string', accessPath: 'name', display: 'Name' },
  }));

  const fakeWeapon = {
    documentName: 'Item',
    type: 'dedupTestWeapon',
    name: 'Test Weapon',
  };

  it('keeps the localized "Self" display/alias only on the literal `self` key', () => {
    const schema = FormulaData.buildFamiliarSchema({ self: fakeWeapon, weapon: fakeWeapon } as never);
    expect(schema.self?.display).toBeTruthy();
    const selfLabel = normalizeLabel(schema.self?.display);
    expect(schema.self?.aliases).toContain(selfLabel);
    // Same underlying document under a second alias — display/alias must NOT also say "Self",
    // or the autocomplete dropdown/hint shows two identically-labeled entries.
    expect(schema.weapon?.display).toBeUndefined();
    expect(schema.weapon?.aliases).not.toContain(selfLabel);
    // The property tree itself is still shared/identical between both aliases.
    expect(schema.weapon?.properties).toEqual(schema.self?.properties);
  });
});
