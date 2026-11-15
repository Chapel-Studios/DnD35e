import { DAMAGE_TYPE_COLD, DAMAGE_TYPE_FIRE, DAMAGE_TYPE_SLASHING } from '@constants/attacks/damageTypes.mjs';
import { buildMarkerBag } from '@constants/diceMarkerBag.mjs';
import { DAMAGE_TYPE_MARKER_KEY, readDamageType } from '@constants/typedDamageMarkers.mjs';
import { describe, expect, it } from 'vitest';

describe('readDamageType — reads the damage-type field out of the shared marker bag', () => {
  it('round-trips a damage type through the bag', () => {
    expect(readDamageType(buildMarkerBag({ [DAMAGE_TYPE_MARKER_KEY]: DAMAGE_TYPE_FIRE }))).toEqual([DAMAGE_TYPE_FIRE]);
    expect(readDamageType(buildMarkerBag({ [DAMAGE_TYPE_MARKER_KEY]: DAMAGE_TYPE_SLASHING }))).toEqual([DAMAGE_TYPE_SLASHING]);
  });

  it('reads the damage type alongside another field in the same bag (composability)', () => {
    const marker = buildMarkerBag({ crit: 'multiply', [DAMAGE_TYPE_MARKER_KEY]: DAMAGE_TYPE_FIRE });
    expect(readDamageType(marker)).toEqual([DAMAGE_TYPE_FIRE]);
  });

  // Multiple types coexist on one component (poc.10 Story J: treated as an "and", not an "or")
  // — e.g. $typed(fire, $typed(cold, 1d6)) or two glued terms each explicitly typed.
  it('reads every type off a comma-joined multi-value list, in insertion order', () => {
    const marker = buildMarkerBag({ [DAMAGE_TYPE_MARKER_KEY]: `${DAMAGE_TYPE_FIRE},${DAMAGE_TYPE_COLD}` });
    expect(readDamageType(marker)).toEqual([DAMAGE_TYPE_FIRE, DAMAGE_TYPE_COLD]);
  });

  it('returns an empty array for flavor text that is not a marker bag at all', () => {
    expect(readDamageType('Greatsword')).toEqual([]);
    expect(readDamageType(undefined)).toEqual([]);
  });

  it('returns an empty array for a well-formed bag with no damage-type field', () => {
    expect(readDamageType(buildMarkerBag({ crit: 'exempt' }))).toEqual([]);
  });

  it('drops a value in the list that is not a real damage type, keeping the rest', () => {
    const marker = buildMarkerBag({ [DAMAGE_TYPE_MARKER_KEY]: `${DAMAGE_TYPE_FIRE},dnd35e.DAMAGE_TYPES.Bogus` });
    expect(readDamageType(marker)).toEqual([DAMAGE_TYPE_FIRE]);
  });

  it('returns an empty array for a bag whose damage-type value is entirely not a real damage type', () => {
    expect(readDamageType(buildMarkerBag({ [DAMAGE_TYPE_MARKER_KEY]: 'dnd35e.DAMAGE_TYPES.Bogus' }))).toEqual([]);
  });
});

