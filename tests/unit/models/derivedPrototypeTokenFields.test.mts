import {
  buildDerivedPrototypeTokenFields,
  diffDerivedPrototypeTokenFields,
} from '@actors/creature/logic/derivedPrototypeTokenFields.mjs';
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

  it('derives sight and detectionModes from senses', () => {
    const derived = buildDerivedPrototypeTokenFields('Duder', 'small', [
      { type: 'darkvision', distance: 60 },
      { type: 'tremorsense', distance: 30 },
    ]);
    expect(derived.sight).toEqual({ enabled: true, visionMode: 'darkvision', range: 60 });
    expect(derived.detectionModes).toEqual({ basicSight: { range: 60 }, feelTremor: { range: 30 } });
  });

  it('carries the given name through unchanged', () => {
    expect(buildDerivedPrototypeTokenFields('Duder, the 4th', 'medium', []).name).toBe('Duder, the 4th');
  });
});

describe('diffDerivedPrototypeTokenFields', () => {
  const derived = buildDerivedPrototypeTokenFields('Duder', 'medium', [{ type: 'darkvision', distance: 60 }]);

  it('returns null when everything already matches', () => {
    expect(diffDerivedPrototypeTokenFields({
      name: 'Duder',
      width: 1,
      height: 1,
      sight: { enabled: true, visionMode: 'darkvision', range: 60 },
      detectionModes: { basicSight: { range: 60 } },
    }, derived)).toBeNull();
  });

  it('reports name changes', () => {
    expect(diffDerivedPrototypeTokenFields({
      name: 'Old Name',
      width: 1,
      height: 1,
      sight: { enabled: true, visionMode: 'darkvision', range: 60 },
      detectionModes: { basicSight: { range: 60 } },
    }, derived)).toEqual({ name: 'Duder' });
  });

  it('reports width/height changes', () => {
    expect(diffDerivedPrototypeTokenFields({
      name: 'Duder',
      width: 2,
      height: 2,
      sight: { enabled: true, visionMode: 'darkvision', range: 60 },
      detectionModes: { basicSight: { range: 60 } },
    }, derived)).toEqual({ width: 1, height: 1 });
  });

  it('reports sight changes', () => {
    expect(diffDerivedPrototypeTokenFields({
      name: 'Duder',
      width: 1,
      height: 1,
      sight: { enabled: true, visionMode: 'basic', range: 0 },
      detectionModes: { basicSight: { range: 60 } },
    }, derived)).toEqual({ sight: { enabled: true, visionMode: 'darkvision', range: 60 } });
  });

  it('adds a managed detection mode key that is missing', () => {
    expect(diffDerivedPrototypeTokenFields({
      name: 'Duder',
      width: 1,
      height: 1,
      sight: { enabled: true, visionMode: 'darkvision', range: 60 },
      detectionModes: {},
    }, derived)).toEqual({ detectionModes: { basicSight: { range: 60 } } });
  });

  it('removes a managed detection mode key that no longer applies, using -= deletion syntax', () => {
    const noSensesDerived = buildDerivedPrototypeTokenFields('Duder', 'medium', []);
    expect(diffDerivedPrototypeTokenFields({
      name: 'Duder',
      width: 1,
      height: 1,
      sight: { enabled: true, visionMode: 'basic', range: 0 },
      detectionModes: { basicSight: { range: 60 } },
    }, noSensesDerived)).toEqual({ detectionModes: { '-=basicSight': null } });
  });

  it('leaves unmanaged detection mode keys untouched', () => {
    expect(diffDerivedPrototypeTokenFields({
      name: 'Duder',
      width: 1,
      height: 1,
      sight: { enabled: true, visionMode: 'darkvision', range: 60 },
      detectionModes: { basicSight: { range: 60 }, seeInvisibility: { range: 30 } },
    }, derived)).toBeNull();
  });
});
