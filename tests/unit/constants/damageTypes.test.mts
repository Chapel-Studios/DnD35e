import { DAMAGE_TYPE_FIRE, resolveDamageTypeAlias } from '@constants/attacks/damageTypes.mjs';
import { describe, expect, it } from 'vitest';

describe('resolveDamageTypeAlias', () => {
  it('resolves a lowercase alias to its canonical constant', () => {
    expect(resolveDamageTypeAlias('fire')).toBe(DAMAGE_TYPE_FIRE);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(resolveDamageTypeAlias(' FIRE ')).toBe(DAMAGE_TYPE_FIRE);
  });

  it('resolves the canonical value directly, not just the short alias', () => {
    // A dynamic $typed(#thisAttack.damageType, ...) first argument resolves to the canonical
    // constant (e.g. "dnd35e.DAMAGE_TYPES.Fire"), not the short alias "fire" — this must not
    // silently fail just because it's already the canonical form.
    expect(resolveDamageTypeAlias(DAMAGE_TYPE_FIRE)).toBe(DAMAGE_TYPE_FIRE);
  });

  it('returns undefined for an unrecognized alias', () => {
    expect(resolveDamageTypeAlias('bogus')).toBeUndefined();
  });

  it('does not return an inherited Object.prototype member for a prototype-polluting alias', () => {
    // A plain-object-backed lookup table returns a truthy inherited method instead of
    // undefined for these keys — DAMAGE_TYPE_ALIASES is a Map specifically to avoid this.
    expect(resolveDamageTypeAlias('constructor')).toBeUndefined();
    expect(resolveDamageTypeAlias('__proto__')).toBeUndefined();
    expect(resolveDamageTypeAlias('toString')).toBeUndefined();
    expect(resolveDamageTypeAlias('hasOwnProperty')).toBeUndefined();
  });
});
