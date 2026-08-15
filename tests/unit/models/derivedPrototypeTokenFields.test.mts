import {
  buildDerivedPrototypeTokenFields,
  diffDerivedPrototypeTokenFields,
} from '@actors/baseActor/logic/derivedPrototypeTokenFields.mjs';
import { describe, expect, it } from 'vitest';

describe('buildDerivedPrototypeTokenFields', () => {
  it('derives width/height from size and basic vision when there are no senses', () => {
    expect(buildDerivedPrototypeTokenFields('Duder', 'medium', [])).toEqual({
      name: 'Duder',
      width: 1,
      height: 1,
      sight: { enabled: true, visionMode: 'basic', range: 0 },
      detectionModes: {},
    });
  });

  it('derives width/height from a non-medium size', () => {
    expect(buildDerivedPrototypeTokenFields('Duder', 'huge', [])).toMatchObject({ width: 3, height: 3 });
  });

  it('derives sight and detectionModes from senses (distance stored in squares, converted to localized ft)', () => {
    const derived = buildDerivedPrototypeTokenFields('Duder', 'small', [
      { type: 'darkvision', distance: 12 },
      { type: 'tremorsense', distance: 6 },
    ]);
    expect(derived.sight).toEqual({ enabled: true, visionMode: 'darkvision', range: 60 });
    expect(derived.detectionModes).toEqual({ basicSight: { range: 60, enabled: true }, feelTremor: { range: 30, enabled: true } });
  });

  it('carries the given name through unchanged', () => {
    expect(buildDerivedPrototypeTokenFields('Duder, the 4th', 'medium', []).name).toBe('Duder, the 4th');
  });
});

describe('diffDerivedPrototypeTokenFields', () => {
  const derived = buildDerivedPrototypeTokenFields('Duder', 'medium', [{ type: 'darkvision', distance: 12 }]);

  it('returns null when everything already matches', () => {
    expect(diffDerivedPrototypeTokenFields({
      name: 'Duder',
      width: 1,
      height: 1,
      sight: { enabled: true, visionMode: 'darkvision', range: 60 },
      detectionModes: { basicSight: { range: 60, enabled: true } },
    }, derived)).toBeNull();
  });

  it('reports name changes', () => {
    expect(diffDerivedPrototypeTokenFields({
      name: 'Old Name',
      width: 1,
      height: 1,
      sight: { enabled: true, visionMode: 'darkvision', range: 60 },
      detectionModes: { basicSight: { range: 60, enabled: true } },
    }, derived)).toEqual({ name: 'Duder' });
  });

  it('reports width/height changes', () => {
    expect(diffDerivedPrototypeTokenFields({
      name: 'Duder',
      width: 2,
      height: 2,
      sight: { enabled: true, visionMode: 'darkvision', range: 60 },
      detectionModes: { basicSight: { range: 60, enabled: true } },
    }, derived)).toEqual({ width: 1, height: 1 });
  });

  it('reports sight changes', () => {
    expect(diffDerivedPrototypeTokenFields({
      name: 'Duder',
      width: 1,
      height: 1,
      sight: { enabled: true, visionMode: 'basic', range: 0 },
      detectionModes: { basicSight: { range: 60, enabled: true } },
    }, derived)).toEqual({ sight: { enabled: true, visionMode: 'darkvision', range: 60 } });
  });

  it('adds a managed detection mode key that is missing', () => {
    expect(diffDerivedPrototypeTokenFields({
      name: 'Duder',
      width: 1,
      height: 1,
      sight: { enabled: true, visionMode: 'darkvision', range: 60 },
      detectionModes: {},
    }, derived)).toEqual({ detectionModes: { basicSight: { range: 60, enabled: true } } });
  });

  it('removes a managed detection mode key that no longer applies, using ForcedDeletion', () => {
    const noSensesDerived = buildDerivedPrototypeTokenFields('Duder', 'medium', []);
    const result = diffDerivedPrototypeTokenFields({
      name: 'Duder',
      width: 1,
      height: 1,
      sight: { enabled: true, visionMode: 'basic', range: 0 },
      detectionModes: { basicSight: { range: 60, enabled: true } },
    }, noSensesDerived);
    expect(result?.detectionModes).toBeInstanceOf(Object);
    expect((result?.detectionModes as Record<string, unknown>).basicSight)
      .toBeInstanceOf(foundry.data.operators.ForcedDeletion);
  });

  it('leaves unmanaged detection mode keys untouched', () => {
    expect(diffDerivedPrototypeTokenFields({
      name: 'Duder',
      width: 1,
      height: 1,
      sight: { enabled: true, visionMode: 'darkvision', range: 60 },
      detectionModes: { basicSight: { range: 60, enabled: true }, seeInvisibility: { range: 30, enabled: true } },
    }, derived)).toBeNull();
  });
});
