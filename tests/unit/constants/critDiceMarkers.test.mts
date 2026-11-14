import { CRIT_MARKER_KEY, CRIT_OVERRIDE_EXEMPT, CRIT_OVERRIDE_MULTIPLY, readCritOverride } from '@constants/critDiceMarkers.mjs';
import { buildMarkerBag } from '@constants/diceMarkerBag.mjs';
import { describe, expect, it } from 'vitest';

describe('readCritOverride — reads the crit-override field out of the shared marker bag', () => {
  it('round-trips both override values through the bag', () => {
    expect(readCritOverride(buildMarkerBag({ [CRIT_MARKER_KEY]: CRIT_OVERRIDE_MULTIPLY }))).toBe(CRIT_OVERRIDE_MULTIPLY);
    expect(readCritOverride(buildMarkerBag({ [CRIT_MARKER_KEY]: CRIT_OVERRIDE_EXEMPT }))).toBe(CRIT_OVERRIDE_EXEMPT);
  });

  it('reads the crit override alongside another field in the same bag (composability)', () => {
    const marker = buildMarkerBag({ [CRIT_MARKER_KEY]: CRIT_OVERRIDE_MULTIPLY, type: 'dnd35e.DAMAGE_TYPES.Fire' });
    expect(readCritOverride(marker)).toBe(CRIT_OVERRIDE_MULTIPLY);
  });

  it('returns null for flavor text that is not a marker bag at all', () => {
    expect(readCritOverride('Greatsword')).toBeNull();
    expect(readCritOverride(undefined)).toBeNull();
  });

  it('returns null for a well-formed bag with no crit-override field', () => {
    expect(readCritOverride(buildMarkerBag({ type: 'dnd35e.DAMAGE_TYPES.Fire' }))).toBeNull();
  });

  it('returns null for a bag whose crit-override value is not a real override token', () => {
    expect(readCritOverride(buildMarkerBag({ [CRIT_MARKER_KEY]: 'bogus' }))).toBeNull();
  });
});
