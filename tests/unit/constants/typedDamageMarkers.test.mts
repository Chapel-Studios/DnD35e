import { DAMAGE_TYPE_FIRE, DAMAGE_TYPE_SLASHING } from '@constants/attacks/damageTypes.mjs';
import { buildMarkerBag } from '@constants/diceMarkerBag.mjs';
import { DAMAGE_TYPE_MARKER_KEY, readDamageType } from '@constants/typedDamageMarkers.mjs';
import { describe, expect, it } from 'vitest';

describe('readDamageType — reads the damage-type field out of the shared marker bag', () => {
  it('round-trips a damage type through the bag', () => {
    expect(readDamageType(buildMarkerBag({ [DAMAGE_TYPE_MARKER_KEY]: DAMAGE_TYPE_FIRE }))).toBe(DAMAGE_TYPE_FIRE);
    expect(readDamageType(buildMarkerBag({ [DAMAGE_TYPE_MARKER_KEY]: DAMAGE_TYPE_SLASHING }))).toBe(DAMAGE_TYPE_SLASHING);
  });

  it('reads the damage type alongside another field in the same bag (composability)', () => {
    const marker = buildMarkerBag({ crit: 'multiply', [DAMAGE_TYPE_MARKER_KEY]: DAMAGE_TYPE_FIRE });
    expect(readDamageType(marker)).toBe(DAMAGE_TYPE_FIRE);
  });

  it('returns null for flavor text that is not a marker bag at all', () => {
    expect(readDamageType('Greatsword')).toBeNull();
    expect(readDamageType(undefined)).toBeNull();
  });

  it('returns null for a well-formed bag with no damage-type field', () => {
    expect(readDamageType(buildMarkerBag({ crit: 'exempt' }))).toBeNull();
  });

  it('returns null for a bag whose damage-type value is not a real damage type', () => {
    expect(readDamageType(buildMarkerBag({ [DAMAGE_TYPE_MARKER_KEY]: 'dnd35e.DAMAGE_TYPES.Bogus' }))).toBeNull();
  });
});
