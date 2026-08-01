import type { ContextDocumentType } from '@helpers/formulae/familiarBuilderRegistry.mjs';
import { registerFamiliarSchema } from '@helpers/formulae/familiarBuilderRegistry.mjs';
import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import { withItemCollectionAspects } from '@helpers/formulae/itemCollectionFamiliar.mjs';
import { buildMergedFamiliarContext } from '@helpers/formulae/registry.mjs';
import type { AspectGroup, FamiliarSchema } from '@helpers/formulae/types.mjs';
import { beforeAll, describe, expect, it } from 'vitest';

const { resolveFormula } = FormulaResolver;

/**
 * poc §7.2c — Item Collection Contexts (`#self.items`/`#self.weapons`/`#self.equipment`).
 * See `docs/migration-plan/poc/phase-07-roll-formulas.md` poc §7.2c.
 */
const FIXTURE_WEAPON = '__fixtureWeapon' as unknown as ContextDocumentType;
const FIXTURE_ARMOR = '__fixtureArmor' as unknown as ContextDocumentType;

beforeAll(() => {
  registerFamiliarSchema('Item', FIXTURE_WEAPON, (): AspectGroup => ({
    damage: { type: 'string', accessPath: 'system.damage' },
    masterwork: { type: 'boolean', accessPath: 'system.masterwork' },
  }));
  registerFamiliarSchema('Item', FIXTURE_ARMOR, (): AspectGroup => ({
    acBonus: { type: 'number', accessPath: 'system.acBonus' },
  }));
});

describe('withItemCollectionAspects', () => {
  it('adds items/weapons/equipment array FieldAspects to a group', () => {
    const group = withItemCollectionAspects({});
    expect(group.items).toBeDefined();
    expect(group.weapons).toBeDefined();
    expect(group.equipment).toBeDefined();
    expect(group.items).toMatchObject({ type: 'array', accessPath: 'items' });
    expect(group.items && (group.items as { arrayElement?: { kind?: string } }).arrayElement?.kind).toBe('heterogeneous');
  });

  it('computes a live count when a document context with .items is provided', () => {
    const context = { items: [{ type: 'weapon' }, { type: 'weapon' }, { type: 'armor' }] };
    const group = withItemCollectionAspects({}, context as never);
    expect(group.items && (group.items as { value?: number }).value).toBe(3);
  });
});

describe('$self.items / $self.weapons — heterogeneous predicate resolution', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: withItemCollectionAspects({}),
    },
  };

  const docMap = {
    self: {
      items: [
        { type: FIXTURE_WEAPON, system: { damage: '1d8', masterwork: true } },
        { type: FIXTURE_WEAPON, system: { damage: '1d6', masterwork: false } },
        { type: FIXTURE_ARMOR, system: { acBonus: 4 } },
      ],
    },
  };

  it('$count(#self.items) counts the whole heterogeneous collection', () => {
    expect(resolveFormula('$count(#self.items)', schema, docMap as never)).toBe('3');
  });

  it('$any(...) matches a predicate only valid for one subtype', () => {
    expect(resolveFormula('$any(#self.items, #it.masterwork == true)', schema, docMap as never)).toBe('true');
    expect(resolveFormula('$any(#self.items, #it.masterwork == false)', schema, docMap as never)).toBe('true');
  });

  it('a predicate referencing a field a subtype lacks resolves as non-matching, not throwing', () => {
    expect(() =>
      resolveFormula('$any(#self.items, #it.acBonus > 10)', schema, docMap as never)
    ).not.toThrow();
    expect(resolveFormula('$any(#self.items, #it.acBonus > 10)', schema, docMap as never)).toBe('false');
    expect(resolveFormula('$any(#self.items, #it.acBonus == 4)', schema, docMap as never)).toBe('true');
  });

  it('$count(...) with a predicate matching only weapon-typed elements', () => {
    expect(resolveFormula('$count(#self.items, #it.masterwork == true)', schema, docMap as never)).toBe('1');
  });
});

describe('buildMergedFamiliarContext — ownerTypes provenance tagging', () => {
  it('tags fields unique to one subtype with ownerTypes and omits it from universal fields', () => {
    const merged = buildMergedFamiliarContext('Item', [FIXTURE_WEAPON, FIXTURE_ARMOR]);
    expect(merged).not.toBeNull();
    const props = merged!.properties;
    expect((props.damage as { ownerTypes?: string[] }).ownerTypes).toEqual([FIXTURE_WEAPON]);
    expect((props.acBonus as { ownerTypes?: string[] }).ownerTypes).toEqual([FIXTURE_ARMOR]);
  });

  it('returns null when no subtypes have a registered builder', () => {
    const merged = buildMergedFamiliarContext('Item', ['__unregisteredSubtype' as unknown as ContextDocumentType]);
    expect(merged).toBeNull();
  });
});
