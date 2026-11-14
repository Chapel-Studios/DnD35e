import { buildMarkerBag, parseMarkerBag, withMarkerField } from '@constants/diceMarkerBag.mjs';
import { describe, expect, it } from 'vitest';

describe('buildMarkerBag/parseMarkerBag — round trip', () => {
  it('round-trips a single-field bag', () => {
    expect(parseMarkerBag(buildMarkerBag({ crit: 'multiply' }))).toEqual({ crit: 'multiply' });
  });

  it('round-trips a multi-field bag', () => {
    const marker = buildMarkerBag({ crit: 'exempt', type: 'dnd35e.DAMAGE_TYPES.Fire' });
    expect(parseMarkerBag(marker)).toEqual({ crit: 'exempt', type: 'dnd35e.DAMAGE_TYPES.Fire' });
  });

  it('round-trips an empty bag', () => {
    expect(parseMarkerBag(buildMarkerBag({}))).toEqual({});
  });

  it('throws when building with an unsafe key or value', () => {
    expect(() => buildMarkerBag({ 'bad;key': 'value' })).toThrow();
    expect(() => buildMarkerBag({ key: 'bad=value' })).toThrow();
  });
});

describe('parseMarkerBag — non-bag and malformed input', () => {
  it('returns null for undefined', () => {
    expect(parseMarkerBag(undefined)).toBeNull();
  });

  it('returns null for a plain display label (not a bag at all)', () => {
    expect(parseMarkerBag('Greatsword')).toBeNull();
  });

  it('returns null for a bag-shaped string with a malformed pair (no =)', () => {
    expect(parseMarkerBag('__dnd35e_marker__crit__')).toBeNull();
  });

  it('returns null for a bag-shaped string with an unsafe token', () => {
    expect(parseMarkerBag('__dnd35e_marker__crit=mul;tiply__')).toBeNull();
  });
});

describe('withMarkerField — upsert composability', () => {
  it('starts a fresh bag when the existing flavor is not a bag', () => {
    expect(parseMarkerBag(withMarkerField(undefined, 'crit', 'multiply'))).toEqual({ crit: 'multiply' });
    expect(parseMarkerBag(withMarkerField('Greatsword', 'crit', 'multiply'))).toEqual({ crit: 'multiply' });
  });

  it('preserves an existing field while adding a new one, regardless of which is set first', () => {
    const critFirst = withMarkerField(buildMarkerBag({ crit: 'multiply' }), 'type', 'dnd35e.DAMAGE_TYPES.Fire');
    const typeFirst = withMarkerField(buildMarkerBag({ type: 'dnd35e.DAMAGE_TYPES.Fire' }), 'crit', 'multiply');
    const expected = { crit: 'multiply', type: 'dnd35e.DAMAGE_TYPES.Fire' };
    expect(parseMarkerBag(critFirst)).toEqual(expected);
    expect(parseMarkerBag(typeFirst)).toEqual(expected);
  });

  it('overwrites an existing field with the same key rather than duplicating it', () => {
    const marker = withMarkerField(buildMarkerBag({ crit: 'multiply' }), 'crit', 'exempt');
    expect(parseMarkerBag(marker)).toEqual({ crit: 'exempt' });
  });
});
