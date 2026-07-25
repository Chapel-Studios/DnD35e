import {
  DEFAULT_LOW_LIGHT_MULTIPLIER,
  getLowLightMultiplier,
  scaleLightRadius,
} from '@canvas/vision/logic/lowLightVision.mjs';
import { describe, expect, it } from 'vitest';

describe('getLowLightMultiplier', () => {
  it('returns the default multiplier when low-light vision is present', () => {
    expect(getLowLightMultiplier([{ type: 'lowLight', distance: 0 }])).toBe(DEFAULT_LOW_LIGHT_MULTIPLIER);
  });

  it('returns null when low-light vision is absent', () => {
    expect(getLowLightMultiplier([{ type: 'darkvision', distance: 60 }])).toBeNull();
    expect(getLowLightMultiplier([])).toBeNull();
  });
});

describe('scaleLightRadius', () => {
  it('is a no-op at multiplier 1', () => {
    const data = { dim: 40, bright: 20 };
    expect(scaleLightRadius(data, 1)).toBe(data);
  });

  it('scales both dim and bright radii', () => {
    expect(scaleLightRadius({ dim: 40, bright: 20 }, 2)).toEqual({ dim: 80, bright: 40 });
  });
});
