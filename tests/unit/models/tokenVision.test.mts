import { buildTokenVisionFromSenses } from '@canvas/token/logic/tokenVision.mjs';
import { describe, expect, it } from 'vitest';

describe('buildTokenVisionFromSenses', () => {
  it('defaults to basic vision with no detection modes when there are no senses', () => {
    expect(buildTokenVisionFromSenses([])).toEqual({
      sight: { visionMode: 'basic', range: 0 },
      detectionModes: {},
    });
  });

  it('maps darkvision to visionMode darkvision, sight.range, and a basicSight detection mode', () => {
    const result = buildTokenVisionFromSenses([{ type: 'darkvision', distance: 60 }]);
    expect(result.sight).toEqual({ visionMode: 'darkvision', range: 60 });
    expect(result.detectionModes).toEqual({ basicSight: { range: 60 } });
  });

  it('maps low-light vision to basic sight with no range and no detection mode (radius doubling handles RAW accuracy instead)', () => {
    const result = buildTokenVisionFromSenses([{ type: 'lowLight', distance: 0 }]);
    expect(result.sight).toEqual({ visionMode: 'basic', range: 0 });
    expect(result.detectionModes).toEqual({});
  });

  it('maps tremorsense to a feelTremor detection mode without changing visionMode', () => {
    const result = buildTokenVisionFromSenses([{ type: 'tremorsense', distance: 120 }]);
    expect(result.sight).toEqual({ visionMode: 'basic', range: 0 });
    expect(result.detectionModes).toEqual({ feelTremor: { range: 120 } });
  });

  it('prioritizes darkvision over low-light when both are present', () => {
    const result = buildTokenVisionFromSenses([
      { type: 'lowLight', distance: 0 },
      { type: 'darkvision', distance: 60 },
    ]);
    expect(result.sight).toEqual({ visionMode: 'darkvision', range: 60 });
  });

  it('stacks tremorsense detection alongside darkvision visionMode and detection mode', () => {
    const result = buildTokenVisionFromSenses([
      { type: 'darkvision', distance: 60 },
      { type: 'tremorsense', distance: 120 },
    ]);
    expect(result.sight).toEqual({ visionMode: 'darkvision', range: 60 });
    expect(result.detectionModes).toEqual({
      basicSight: { range: 60 },
      feelTremor: { range: 120 },
    });
  });
});
