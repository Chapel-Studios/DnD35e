import type { FieldOverrideValue, ResolveAtPath } from '@documents/document/sheet/stores/cascadeFieldOverride.mjs';
import { cascadeFieldOverride, pickMoreRestrictive } from '@documents/document/sheet/stores/cascadeFieldOverride.mjs';
import type { FieldOverrideKey } from '@vc/Fields/FormGroups/fieldPermissions.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Pure-function tests for the field-override cascade.
 *
 * The store wires up a real `resolveAtPath` that reads flags + schema defaults; here we pass
 * a synthetic table-driven resolver so the cascade logic is exercised in isolation.
 */

type CascadeTable<K extends FieldOverrideKey> = Record<string, Partial<Record<K, FieldOverrideValue<K>>>>;

const makeResolver = <K extends FieldOverrideKey>(table: CascadeTable<K>): ResolveAtPath =>
  (<KK extends FieldOverrideKey>(path: string, key: KK): FieldOverrideValue<KK> | undefined =>
    (table[path]?.[key as unknown as K] ?? undefined) as FieldOverrideValue<KK> | undefined);

describe('pickMoreRestrictive', () => {
  it('returns b when a is undefined', () => {
    expect(pickMoreRestrictive('visibility', undefined, 'gmOnly')).toBe('gmOnly');
  });

  it('returns a when b is undefined', () => {
    expect(pickMoreRestrictive('visibility', 'ownerPlus', undefined)).toBe('ownerPlus');
  });

  it('returns undefined when both inputs are undefined', () => {
    expect(pickMoreRestrictive('visibility', undefined, undefined)).toBeUndefined();
  });

  it('picks the more restrictive visibility (gmOnly > ownerPlus > everyone)', () => {
    expect(pickMoreRestrictive('visibility', 'everyone', 'ownerPlus')).toBe('ownerPlus');
    expect(pickMoreRestrictive('visibility', 'ownerPlus', 'gmOnly')).toBe('gmOnly');
    expect(pickMoreRestrictive('visibility', 'everyone', 'gmOnly')).toBe('gmOnly');
  });

  it('picks the more restrictive editability (gmOnly > normal)', () => {
    expect(pickMoreRestrictive('editability', 'normal', 'gmOnly')).toBe('gmOnly');
    expect(pickMoreRestrictive('editability', 'gmOnly', 'normal')).toBe('gmOnly');
  });

  it('returns either side when equal (idempotent)', () => {
    expect(pickMoreRestrictive('visibility', 'ownerPlus', 'ownerPlus')).toBe('ownerPlus');
  });
});

describe('cascadeFieldOverride', () => {
  it('returns undefined when no overrides are set anywhere', () => {
    const resolver = makeResolver({});
    expect(cascadeFieldOverride('system.hp.value', 'visibility', resolver)).toBeUndefined();
    expect(cascadeFieldOverride('system.hp.value', 'editability', resolver)).toBeUndefined();
  });

  it('returns the leaf value when only the leaf has an override', () => {
    const resolver = makeResolver<'visibility'>({
      'system.hp.value': { visibility: 'ownerPlus' },
    });
    expect(cascadeFieldOverride('system.hp.value', 'visibility', resolver)).toBe('ownerPlus');
  });

  it('parent ownerPlus + child gmOnly → gmOnly (child wins because more restrictive)', () => {
    const resolver = makeResolver<'visibility'>({
      'system.hp': { visibility: 'ownerPlus' },
      'system.hp.value': { visibility: 'gmOnly' },
    });
    expect(cascadeFieldOverride('system.hp.value', 'visibility', resolver)).toBe('gmOnly');
  });

  it('parent gmOnly + child everyone → gmOnly (parent wins because more restrictive)', () => {
    const resolver = makeResolver<'visibility'>({
      'system.hp': { visibility: 'gmOnly' },
      'system.hp.value': { visibility: 'everyone' },
    });
    expect(cascadeFieldOverride('system.hp.value', 'visibility', resolver)).toBe('gmOnly');
  });

  it('parent gmOnly editability + child normal editability → gmOnly (parent restriction propagates)', () => {
    const resolver = makeResolver<'editability'>({
      'system.hp': { editability: 'gmOnly' },
      'system.hp.value': { editability: 'normal' },
    });
    expect(cascadeFieldOverride('system.hp.value', 'editability', resolver)).toBe('gmOnly');
  });

  it('merges visibility and editability independently per property', () => {
    // Parent locks editability gmOnly but visibility stays at ownerPlus.
    // Child sets visibility gmOnly but editability normal.
    // Expected: visibility=gmOnly (child), editability=gmOnly (parent).
    const resolver = makeResolver({
      'system.hp': { visibility: 'ownerPlus', editability: 'gmOnly' },
      'system.hp.value': { visibility: 'gmOnly', editability: 'normal' },
    });
    expect(cascadeFieldOverride('system.hp.value', 'visibility', resolver)).toBe('gmOnly');
    expect(cascadeFieldOverride('system.hp.value', 'editability', resolver)).toBe('gmOnly');
  });

  it('cascades through a deep ancestor chain — most-restrictive across the whole chain wins', () => {
    // 4 levels: system.a.b.c.d — restriction set at grandparent only
    const resolver = makeResolver<'visibility'>({
      'system.a.b': { visibility: 'gmOnly' },
      'system.a.b.c.d': { visibility: 'everyone' },
    });
    expect(cascadeFieldOverride('system.a.b.c.d', 'visibility', resolver)).toBe('gmOnly');
  });

  it('cascades through a deep chain with restrictions at every level — final result is the strictest', () => {
    const resolver = makeResolver<'visibility'>({
      'system.a': { visibility: 'ownerPlus' },
      'system.a.b': { visibility: 'everyone' },
      'system.a.b.c': { visibility: 'gmOnly' },
      'system.a.b.c.d': { visibility: 'ownerPlus' },
    });
    expect(cascadeFieldOverride('system.a.b.c.d', 'visibility', resolver)).toBe('gmOnly');
  });

  it('does not cascade above the bare "system" root', () => {
    // Even if a fake resolver returns gmOnly for 'system', the cascade should never visit it.
    let visitedSystemRoot = false;
    const resolver: ResolveAtPath = (path, key) => {
      if (path === 'system') {
        visitedSystemRoot = true;
        return 'gmOnly' as FieldOverrideValue<typeof key>;
      }
      if (path === 'system.hp.value' && key === 'visibility') {
        return 'everyone' as FieldOverrideValue<typeof key>;
      }
      return undefined;
    };
    expect(cascadeFieldOverride('system.hp.value', 'visibility', resolver)).toBe('everyone');
    expect(visitedSystemRoot).toBe(false);
  });

  it('does not cascade for non-system paths (e.g. name, img)', () => {
    // Document-level paths never walk ancestors.
    const resolver: ResolveAtPath = (path, key) => {
      if (path === 'name' && key === 'visibility') return 'gmOnly' as FieldOverrideValue<typeof key>;
      return undefined;
    };
    expect(cascadeFieldOverride('name', 'visibility', resolver)).toBe('gmOnly');
    expect(cascadeFieldOverride('img', 'visibility', resolver)).toBeUndefined();
  });
});
