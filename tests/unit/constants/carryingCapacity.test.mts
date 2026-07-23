import { getCarryingCapacity } from '@constants/carryingCapacity.mjs';
import { describe, expect, it } from 'vitest';

describe('getCarryingCapacity', () => {
  it('returns all zeros for non-positive strength scores', () => {
    expect(getCarryingCapacity(0, 'medium', false)).toEqual({ light: 0, medium: 0, heavy: 0 });
    expect(getCarryingCapacity(-5, 'medium', false)).toEqual({ light: 0, medium: 0, heavy: 0 });
  });

  it('floors fractional strength scores before lookup', () => {
    expect(getCarryingCapacity(10.9, 'medium', false)).toEqual(getCarryingCapacity(10, 'medium', false));
  });

  it('looks up direct table values for str 1-29', () => {
    expect(getCarryingCapacity(1, 'medium', false)).toEqual({ light: 3, medium: 6, heavy: 10 });
    expect(getCarryingCapacity(10, 'medium', false)).toEqual({ light: 33, medium: 66, heavy: 100 });
    expect(getCarryingCapacity(18, 'medium', false)).toEqual({ light: 100, medium: 200, heavy: 300 });
    expect(getCarryingCapacity(29, 'medium', false)).toEqual({ light: 466, medium: 933, heavy: 1400 });
  });

  it('extrapolates "Tremendous Strength" for str > 29 by multiplying the matching 20-29 row by 4 per 10 points above', () => {
    // Str 30 -> row 20 (ones digit 0), one full 10 above -> x4
    expect(getCarryingCapacity(30, 'medium', false)).toEqual({ light: 133 * 4, medium: 266 * 4, heavy: 400 * 4 });
    // Str 40 -> row 20, two full 10s above -> x16
    expect(getCarryingCapacity(40, 'medium', false)).toEqual({ light: 133 * 16, medium: 266 * 16, heavy: 400 * 16 });
    // Str 33 -> row 23 (ones digit 3), one full 10 above -> x4
    expect(getCarryingCapacity(33, 'medium', false)).toEqual({ light: 200 * 4, medium: 400 * 4, heavy: 600 * 4 });
  });
});
