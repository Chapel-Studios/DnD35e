import {
  DEFAULT_LOW_LIGHT_MULTIPLIER,
  getLowLightMultiplier,
  resolveLowLightMultiplier,
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

describe('resolveLowLightMultiplier', () => {
  it('returns 1 when there are no observers', () => {
    expect(resolveLowLightMultiplier([])).toBe(1);
  });

  it('returns 1 when no observer has low-light vision', () => {
    expect(resolveLowLightMultiplier([
      { controlled: true, owner: true, lowLightMultiplier: null },
    ])).toBe(1);
  });

  it('uses the controlled observer(s) when any are controlled, ignoring uncontrolled owned tokens', () => {
    const result = resolveLowLightMultiplier([
      { controlled: true, owner: true, lowLightMultiplier: null },
      { controlled: false, owner: true, lowLightMultiplier: 2 },
    ]);
    expect(result).toBe(1);
  });

  it('falls back to owned observers when nothing is controlled', () => {
    const result = resolveLowLightMultiplier([
      { controlled: false, owner: true, lowLightMultiplier: 2 },
      { controlled: false, owner: false, lowLightMultiplier: 3 },
    ]);
    expect(result).toBe(2);
  });

  it('uses the highest multiplier among the counted observers', () => {
    const result = resolveLowLightMultiplier([
      { controlled: true, owner: true, lowLightMultiplier: 2 },
      { controlled: true, owner: true, lowLightMultiplier: 4 },
    ]);
    expect(result).toBe(4);
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
