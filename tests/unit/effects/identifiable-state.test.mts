import {
  deriveIdentifiableState,
  type IdentifiableEffectLike,
} from '@ec/Identifiable/logic/index.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Helper: build a minimal effect fixture. Defaults to active secret.
 */
function mkEffect (partial: Partial<IdentifiableEffectLike> = {}): IdentifiableEffectLike {
  return {
    type: secretEffectType,
    active: true,
    ...partial,
  };
}

describe('deriveIdentifiableState', () => {
  it('no effects → not identifiable, identified', () => {
    expect(deriveIdentifiableState([])).toEqual({
      isIdentifiable: false,
      isIdentified: true,
    });
  });

  it('one disabled Secret AE → identifiable, identified', () => {
    // "Disabled" from the identifiable perspective means `active === false`.
    // A Secret AE that exists but isn't active still makes the doc identifiable
    // (it has secrets attached) but currently identified (none are hiding things).
    const effects = [mkEffect({ active: false })];
    expect(deriveIdentifiableState(effects)).toEqual({
      isIdentifiable: true,
      isIdentified: true,
    });
  });

  it('one active Secret AE → identifiable, not identified', () => {
    const effects = [mkEffect({ active: true })];
    expect(deriveIdentifiableState(effects)).toEqual({
      isIdentifiable: true,
      isIdentified: false,
    });
  });

  it('mixed active and disabled Secrets → identifiable, not identified (any active wins)', () => {
    const effects = [
      mkEffect({ active: false }),
      mkEffect({ active: true }),
      mkEffect({ active: false }),
    ];
    expect(deriveIdentifiableState(effects)).toEqual({
      isIdentifiable: true,
      isIdentified: false,
    });
  });

  it('non-secret effects only → not identifiable, identified', () => {
    // Material AE, General AE, etc. — any non-secret type is ignored entirely.
    const effects = [
      mkEffect({ type: 'material', active: true }),
      mkEffect({ type: 'general', active: false }),
      mkEffect({ type: 'general', active: true }),
    ];
    expect(deriveIdentifiableState(effects)).toEqual({
      isIdentifiable: false,
      isIdentified: true,
    });
  });

  it('secret mixed with non-secret effects → only secrets contribute', () => {
    // Documents the boundary: non-secret active effects don't mark identifiable,
    // even when sitting alongside Secrets that do.
    const effects = [
      mkEffect({ type: 'material', active: true }),
      mkEffect({ type: secretEffectType, active: false }),
    ];
    expect(deriveIdentifiableState(effects)).toEqual({
      isIdentifiable: true,
      isIdentified: true,
    });
  });

  it('accepts an iterable, not just an array (matches mixin call site)', () => {
    // The mixin passes `this.effects` which is a Foundry Collection (iterable).
    function* gen (): Generator<IdentifiableEffectLike> {
      yield mkEffect({ active: true });
      yield mkEffect({ active: false });
    }
    expect(deriveIdentifiableState(gen())).toEqual({
      isIdentifiable: true,
      isIdentified: false,
    });
  });
});
