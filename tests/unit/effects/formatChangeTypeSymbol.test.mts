import { EFFECT_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import { formatChangeTypeSymbol } from '@effects/baseActiveEffect/logic/formatChangeTypeSymbol.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Unit tests for `formatChangeTypeSymbol` (src/documents/activeEffects/baseActiveEffect/logic/formatChangeTypeSymbol.mts).
 *
 * Shared glyph lookup used by both `HasActiveEffectsNotification` (field-level effect
 * tooltip) and `SystemEffectRow` (Actor Effects tab's expanded system/condition rows) -
 * a single source of truth for the symbol shown next to a change's value.
 */
describe('formatChangeTypeSymbol', () => {
  it('returns "+" for ADD', () => {
    expect(formatChangeTypeSymbol(EFFECT_CHANGE_TYPE.ADD)).toBe('+');
  });

  it('returns "×" for MULTIPLY', () => {
    expect(formatChangeTypeSymbol(EFFECT_CHANGE_TYPE.MULTIPLY)).toBe('×');
  });

  it('returns "=" for OVERRIDE', () => {
    expect(formatChangeTypeSymbol(EFFECT_CHANGE_TYPE.OVERRIDE)).toBe('=');
  });

  it('returns "↑" for UPGRADE', () => {
    expect(formatChangeTypeSymbol(EFFECT_CHANGE_TYPE.UPGRADE)).toBe('↑');
  });

  it('returns "↓" for DOWNGRADE', () => {
    expect(formatChangeTypeSymbol(EFFECT_CHANGE_TYPE.DOWNGRADE)).toBe('↓');
  });

  it('falls back to the raw type string for an unrecognized/custom type', () => {
    expect(formatChangeTypeSymbol('custom')).toBe('custom');
    expect(formatChangeTypeSymbol('mask')).toBe('mask');
  });
});
