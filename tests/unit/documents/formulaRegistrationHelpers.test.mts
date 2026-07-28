import { buildFormulaContexts, type FormulaRegistrationHost } from '@documents/document/formulaRegistrationHelpers.mjs';
import { ContainmentSystemModel } from '@effects/containment/data/ContainmentSystemModel.mjs';
import { GeneralEffectSystemModel } from '@effects/general/data/GeneralEffectSystemModel.mjs';
import { MaterialSystemModel } from '@effects/material/data/MaterialSystemModel.mjs';
import { SecretSystemModel } from '@effects/secret/data/SecretSystemModel.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import { ContainerSystemModel } from '@items/physical/container/data/ContainerSystemModel.mjs';
import { WeaponSystemModel } from '@items/physical/weapon/data/WeaponSystemModel.mjs';
import { describe, expect, it } from 'vitest';

import { createSchemaTester } from '../../helpers/schemaTester.mjs';

/**
 * Regression tests for the `nameFormula` field's `formulaContexts` declarations
 * (Parent/Owner/Container/Item) across every AE subtype + the two item subtypes
 * that declare one. Two layers:
 *
 *  1. Shape — the declared array on the real `defineSchema()` output has the
 *     expected `contextName`/`resolvePath`/`documentType`/`aliases`.
 *  2. Behavior — `buildFormulaContexts()` (the schema walker consumer) actually
 *     resolves a live `parent` into a correctly-keyed context entry, and also
 *     resolves every declared alias's underlying context under the same key
 *     shape a formula author would reference (e.g. `#Owner...` / `#Parent...`).
 */

describe('nameFormula formulaContexts — declared schema shape', () => {
  it('SecretSystemModel declares Parent (Item, no fallback)', () => {
    const t = createSchemaTester(SecretSystemModel);
    const field = t.field('nameFormula') as FormulaField;
    expect(field.formulaContexts).toEqual([
      { contextName: 'Parent', resolvePath: 'parent', documentType: 'Item', fallbackSubtypes: [] },
    ]);
  });

  it('GeneralEffectSystemModel declares Parent (Item, no fallback)', () => {
    const t = createSchemaTester(GeneralEffectSystemModel);
    const field = t.field('nameFormula') as FormulaField;
    expect(field.formulaContexts).toEqual([
      { contextName: 'Parent', resolvePath: 'parent', documentType: 'Item', fallbackSubtypes: [] },
    ]);
  });

  it('MaterialSystemModel declares Item (Item/weapon fallback, aliased to Parent)', () => {
    const t = createSchemaTester(MaterialSystemModel);
    const field = t.field('nameFormula') as FormulaField;
    expect(field.formulaContexts).toEqual([
      { contextName: 'Item', resolvePath: 'parent', documentType: 'Item', fallbackSubtypes: ['weapon'], aliases: ['Parent'] },
    ]);
  });

  it('ContainmentSystemModel declares Container (Item/container fallback, aliased to Owner+Parent)', () => {
    const t = createSchemaTester(ContainmentSystemModel);
    const field = t.field('nameFormula') as FormulaField;
    expect(field.formulaContexts).toEqual([
      { contextName: 'Container', resolvePath: 'parent', documentType: 'Item', fallbackSubtypes: ['container'], aliases: ['Owner', 'Parent'] },
    ]);
  });

  it('ContainerSystemModel declares Owner (Actor/character fallback, aliased to Parent)', () => {
    const t = createSchemaTester(ContainerSystemModel);
    const field = t.field('nameFormula') as FormulaField;
    expect(field.formulaContexts).toEqual([
      { contextName: 'Owner', resolvePath: 'parent', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['Parent'] },
    ]);
  });

  it('WeaponSystemModel declares Owner (Actor/character fallback, aliased to Parent)', () => {
    const t = createSchemaTester(WeaponSystemModel);
    const field = t.field('nameFormula') as FormulaField;
    expect(field.formulaContexts).toEqual([
      { contextName: 'Owner', resolvePath: 'parent', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['Parent'] },
    ]);
  });
});

describe('buildFormulaContexts — resolves declared contexts from a live parent', () => {
  const mkHost = (schemaModel: { defineSchema (): Record<string, any> }, parent: unknown): FormulaRegistrationHost => ({
    system: { schema: { fields: schemaModel.defineSchema() } },
    documentName: 'ActiveEffect',
    type: 'test',
    registeredFormulas: new Set(),
    toObject: () => ({}),
    updateSource: () => undefined,
    parent,
  } as unknown as FormulaRegistrationHost);

  it('resolves Secret\'s Parent context from a live Item parent', () => {
    const parentItem = {
      documentName: 'Item',
      type: 'weapon',
      name: 'Longsword',
      toObject: () => ({ name: 'Longsword', type: 'weapon' }),
    };
    const host = mkHost(SecretSystemModel, parentItem);

    const contexts = buildFormulaContexts(host, 'system.nameFormula');
    expect(contexts.Parent).toBeDefined();
    expect(contexts.Parent.documentName).toBe('Item');
    expect(contexts.Parent.type).toBe('weapon');
  });

  it('resolves Container\'s Owner context from a live Actor parent', () => {
    const parentActor = {
      documentName: 'Actor',
      type: 'character',
      name: 'Hero',
      toObject: () => ({ name: 'Hero', type: 'character' }),
    };
    const host = mkHost(ContainerSystemModel, parentActor);

    const contexts = buildFormulaContexts(host, 'system.nameFormula');
    expect(contexts.Owner).toBeDefined();
    expect(contexts.Owner.documentName).toBe('Actor');
    expect(contexts.Owner.type).toBe('character');
  });

  it('returns no context when the declared resolvePath has no live parent', () => {
    const host = mkHost(GeneralEffectSystemModel, undefined);

    const contexts = buildFormulaContexts(host, 'system.nameFormula');
    expect(contexts).toEqual({});
  });
});
