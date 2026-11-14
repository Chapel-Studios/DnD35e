import { DAMAGE_TYPE_FIRE, DAMAGE_TYPE_SLASHING } from '@constants/attacks/damageTypes.mjs';
import { buildTypedDamageMarker, parseTypedDamageMarker } from '@constants/typedDamageMarkers.mjs';
import { describe, expect, it } from 'vitest';

describe('buildTypedDamageMarker/parseTypedDamageMarker — round trip', () => {
  it('round-trips a damage type through build then parse', () => {
    expect(parseTypedDamageMarker(buildTypedDamageMarker(DAMAGE_TYPE_FIRE))).toBe(DAMAGE_TYPE_FIRE);
    expect(parseTypedDamageMarker(buildTypedDamageMarker(DAMAGE_TYPE_SLASHING))).toBe(DAMAGE_TYPE_SLASHING);
  });

  it('produces distinct markers for distinct damage types', () => {
    expect(buildTypedDamageMarker(DAMAGE_TYPE_FIRE)).not.toBe(buildTypedDamageMarker(DAMAGE_TYPE_SLASHING));
  });

  it('returns null for flavor text that is not a typed-damage marker', () => {
    expect(parseTypedDamageMarker('Greatsword')).toBeNull();
    expect(parseTypedDamageMarker('__dnd35e_critMultiply__')).toBeNull();
  });

  it('returns null for a marker-shaped string whose payload is not a real damage type', () => {
    expect(parseTypedDamageMarker('__dnd35e_typed__dnd35e.DAMAGE_TYPES.Bogus__')).toBeNull();
  });
});
