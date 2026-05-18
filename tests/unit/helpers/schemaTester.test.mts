import { describe, expect, it } from 'vitest';

import { createSchemaTester } from '../../helpers/schemaTester.mjs';

/**
 * Self-test for the reusable schema tester. Uses synthetic schemas built
 * directly from the global field-class stubs so the assertions exercise
 * the walker, not any specific dnd35e model.
 */

const { NumberField, StringField, BooleanField, SchemaField } = (globalThis as any).foundry.data.fields;

function makeSyntheticModel () {
  return {
    defineSchema () {
      return {
        level: new NumberField({ initial: 1, required: true }),
        name: new StringField({ initial: 'unnamed', required: true }),
        flagged: new BooleanField({ initial: false }),
        size: new StringField({ choices: ['small', 'medium', 'large'], initial: 'medium' }),
        validated: new NumberField({ initial: 0, validate: (v: number) => v >= 0 }),
        nested: new SchemaField({
          inner: new StringField({ initial: 'x' }),
          deeper: new SchemaField({
            leaf: new NumberField({ initial: 42 }),
          }),
        }),
      };
    },
  };
}

describe('createSchemaTester', () => {
  it('lists top-level field keys', () => {
    const t = createSchemaTester(makeSyntheticModel());
    expect(t.fieldKeys()).toEqual(['level', 'name', 'flagged', 'size', 'validated', 'nested']);
  });

  it('returns top-level fields via field()', () => {
    const t = createSchemaTester(makeSyntheticModel());
    expect(t.field('level')).toBeDefined();
    expect(t.field('missing')).toBeUndefined();
  });

  it('descends into SchemaField.fields for dotted paths', () => {
    const t = createSchemaTester(makeSyntheticModel());
    expect(t.field('nested.inner')).toBeDefined();
    expect(t.field('nested.deeper.leaf')).toBeDefined();
    expect(t.field('nested.bogus')).toBeUndefined();
    expect(t.field('level.nope')).toBeUndefined();
  });

  it('assertField returns the field when present', () => {
    const t = createSchemaTester(makeSyntheticModel());
    const f = t.assertField('name');
    expect(f).toBeInstanceOf(StringField);
  });

  it('assertField throws when the field is missing', () => {
    const t = createSchemaTester(makeSyntheticModel());
    expect(() => t.assertField('absent')).toThrow();
  });

  it('assertFieldType passes for matching subclass', () => {
    const t = createSchemaTester(makeSyntheticModel());
    t.assertFieldType('level', NumberField);
    t.assertFieldType('nested', SchemaField);
  });

  it('assertFieldType throws on mismatch', () => {
    const t = createSchemaTester(makeSyntheticModel());
    expect(() => t.assertFieldType('level', StringField)).toThrow();
  });

  it('assertDefault reads options.initial', () => {
    const t = createSchemaTester(makeSyntheticModel());
    t.assertDefault('level', 1);
    t.assertDefault('name', 'unnamed');
    t.assertDefault('flagged', false);
  });

  it('assertDefault throws when initial does not match', () => {
    const t = createSchemaTester(makeSyntheticModel());
    expect(() => t.assertDefault('level', 99)).toThrow();
  });

  it('assertHasValidator detects a custom validate function', () => {
    const t = createSchemaTester(makeSyntheticModel());
    t.assertHasValidator('validated');
  });

  it('assertHasValidator throws when no validator is attached', () => {
    const t = createSchemaTester(makeSyntheticModel());
    expect(() => t.assertHasValidator('level')).toThrow();
  });

  it('assertChoices matches the declared choices array', () => {
    const t = createSchemaTester(makeSyntheticModel());
    t.assertChoices('size', ['small', 'medium']);
  });

  it('assertChoices throws when a required choice is missing', () => {
    const t = createSchemaTester(makeSyntheticModel());
    expect(() => t.assertChoices('size', ['huge'])).toThrow();
  });
});
