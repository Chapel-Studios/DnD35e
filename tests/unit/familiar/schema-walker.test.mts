import { gatherAspectsFromSchema } from '@helpers/formulae/schemaWalker.mjs';
import type { AspectGroup, FieldAspect } from '@helpers/formulae/types.mjs';
import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Tiny field-stub helpers that satisfy the walker's expectations:
// - `instanceof SchemaField` for branching
// - `field.constructor.isFamiliarLeaf === true` for opaque leaves
// - `field.options.familiar` for opt-out / overrides
// - optional `field.label` (the localized label set after i18nInit)
// ---------------------------------------------------------------------------

const { NumberField, StringField, BooleanField, SchemaField } = foundry.data.fields;

type AnyField = foundry.data.fields.DataField;

const makeNumber = (opts: Record<string, unknown> = {}): AnyField => {
  const f = new (NumberField as any)({ ...opts });
  return f as AnyField;
};

const makeString = (opts: Record<string, unknown> = {}): AnyField => {
  const f = new (StringField as any)({ ...opts });
  return f as AnyField;
};

const makeBoolean = (opts: Record<string, unknown> = {}): AnyField => {
  const f = new (BooleanField as any)({ ...opts });
  return f as AnyField;
};

const makeSchema = (
  fields: Record<string, AnyField>,
  opts: Record<string, unknown> = {}
): AnyField => {
  const f = new (SchemaField as any)(fields, { ...opts });
  return f as AnyField;
};

class OpaqueLeafField {
  static isFamiliarLeaf = true;
  // eslint-disable-next-line no-empty-function
  constructor(public options: Record<string, unknown> = {}) {}
}

const makeOpaqueLeaf = (opts: Record<string, unknown> = {}): AnyField => {
  const f = new OpaqueLeafField({ ...opts });
  return f as unknown as AnyField;
};

const makeModelClass = (fields: Record<string, AnyField>) =>
  ({
    defineSchema: () => fields,
    schema: { fields },
  }) as unknown as Parameters<typeof gatherAspectsFromSchema>[0];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('gatherAspectsFromSchema — FormulaFamiliar schema walker', () => {
  describe('opt-out model (all fields included by default)', () => {
    it('includes a plain NumberField as a leaf with inferred type', () => {
      const group = gatherAspectsFromSchema(makeModelClass({
        hp: makeNumber(),
      }));
      expect(group.hp).toBeDefined();
      const aspect = group.hp as FieldAspect;
      expect(aspect.type).toBe('number');
      expect(aspect.accessPath).toBe('system.hp');
    });

    it('includes a plain StringField as a string leaf', () => {
      const group = gatherAspectsFromSchema(makeModelClass({
        flavor: makeString(),
      }));
      const aspect = group.flavor as FieldAspect;
      expect(aspect.type).toBe('string');
      expect(aspect.accessPath).toBe('system.flavor');
    });

    it('includes a plain BooleanField as a boolean leaf (Story A)', () => {
      const group = gatherAspectsFromSchema(makeModelClass({
        hasCondition: makeBoolean(),
      }));
      const aspect = group.hasCondition as FieldAspect;
      expect(aspect.type).toBe('boolean');
      expect(aspect.accessPath).toBe('system.hasCondition');
    });

    it('excludes a field marked `formulaVisible: false`', () => {
      const group = gatherAspectsFromSchema(makeModelClass({
        visible: makeNumber(),
        hidden: makeNumber({ familiar: { formulaVisible: false } }),
      }));
      expect(group.visible).toBeDefined();
      expect(group.hidden).toBeUndefined();
    });
  });

  describe('SchemaField recursion', () => {
    it('recurses into SchemaField children with dotted access paths', () => {
      const group = gatherAspectsFromSchema(makeModelClass({
        hp: makeSchema({
          value: makeNumber(),
          max: makeNumber(),
        }),
      }));
      const branch = group.hp as AspectGroup;
      expect(branch).toBeDefined();
      expect((branch.value as FieldAspect).accessPath).toBe('system.hp.value');
      expect((branch.max as FieldAspect).accessPath).toBe('system.hp.max');
    });

    it('omits a branch whose children are all opted-out', () => {
      const group = gatherAspectsFromSchema(makeModelClass({
        empty: makeSchema({
          a: makeNumber({ familiar: { formulaVisible: false } }),
          b: makeNumber({ familiar: { formulaVisible: false } }),
        }),
      }));
      expect(group.empty).toBeUndefined();
    });
  });

  describe('opaque leaf marker (isFamiliarLeaf)', () => {
    it('treats a field whose constructor has `isFamiliarLeaf=true` as a single leaf', () => {
      const group = gatherAspectsFromSchema(makeModelClass({
        price: makeOpaqueLeaf(),
      }));
      const aspect = group.price as FieldAspect;
      expect(aspect).toBeDefined();
      // Not recursed into — single accessPath, not an AspectGroup branch.
      expect(aspect.accessPath).toBe('system.price');
      expect((aspect as unknown as AspectGroup).value).not.toBeDefined();
    });
  });

  describe('metadata overrides', () => {
    it('honors `aspectKey` to rename the tree key', () => {
      const group = gatherAspectsFromSchema(makeModelClass({
        criticalRange: makeNumber({ familiar: { aspectKey: 'critRange' } }),
      }));
      expect(group.critRange).toBeDefined();
      expect(group.criticalRange).toBeUndefined();
    });

    it('honors `aspectType` to override the inferred type', () => {
      const group = gatherAspectsFromSchema(makeModelClass({
        label: makeNumber({ familiar: { aspectType: 'string' } }),
      }));
      expect((group.label as FieldAspect).type).toBe('string');
    });

    it('attaches `aliases` to the leaf when provided', () => {
      const group = gatherAspectsFromSchema(makeModelClass({
        damage: makeNumber({ familiar: { aliases: ['dmg'] } }),
      }));
      const aspect = group.damage as FieldAspect;
      expect(aspect.aliases).toContain('dmg');
    });
  });

  describe('document-level name field', () => {
    it('always merges a top-level `name` leaf with accessPath="name"', () => {
      const group = gatherAspectsFromSchema(makeModelClass({}));
      const aspect = group.name as FieldAspect;
      expect(aspect).toBeDefined();
      expect(aspect.accessPath).toBe('name');
      expect(aspect.type).toBe('string');
    });
  });

  describe('live value resolution', () => {
    it('resolves scalar property values when a context document is provided', () => {
      const ctx = { system: { hp: 7, flavor: 'sharp' }, name: 'sword' } as unknown as Parameters<typeof gatherAspectsFromSchema>[1];
      const group = gatherAspectsFromSchema(makeModelClass({
        hp: makeNumber(),
        flavor: makeString(),
      }), ctx);
      expect((group.hp as FieldAspect).value).toBe(7);
      expect((group.flavor as FieldAspect).value).toBe('sharp');
      expect((group.name as FieldAspect).value).toBe('sword');
    });

    it('omits .value when the context has no value at the access path', () => {
      const ctx = { system: {} } as unknown as Parameters<typeof gatherAspectsFromSchema>[1];
      const group = gatherAspectsFromSchema(makeModelClass({
        hp: makeNumber(),
      }), ctx);
      const aspect = group.hp as FieldAspect;
      expect(aspect.value).toBeUndefined();
    });
  });
});
