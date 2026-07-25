import type { SharedVisionSourceContext } from '@canvas/vision/logic/sharedVisionScope.mjs';
import { resolveEffectiveVisionScope, resolveSharedVisionSource } from '@canvas/vision/logic/sharedVisionScope.mjs';
import { describe, expect, it } from 'vitest';

describe('resolveEffectiveVisionScope', () => {
  it('falls back to the world scope when the actor override is "default"', () => {
    expect(resolveEffectiveVisionScope('default', 'partyMembers')).toBe('partyMembers');
  });

  it('uses the actor override when explicitly set, ignoring the world scope', () => {
    expect(resolveEffectiveVisionScope('none', 'owned')).toBe('none');
    expect(resolveEffectiveVisionScope('partyMembers', 'owned')).toBe('partyMembers');
  });
});

describe('resolveSharedVisionSource', () => {
  const baseContext = (overrides: Partial<SharedVisionSourceContext> = {}): SharedVisionSourceContext => ({
    tokenVisionEnabled: true,
    hasSight: true,
    isGM: false,
    controlled: false,
    hidden: false,
    hasOtherControlledWithSight: false,
    observerPermission: true,
    owner: true,
    isPartyMember: false,
    effectiveScope: 'owned',
    selectionMode: 'passiveWhenUnselected',
    ...overrides,
  });

  it('returns false when canvas token vision is disabled', () => {
    expect(resolveSharedVisionSource(baseContext({ tokenVisionEnabled: false }))).toBe(false);
  });

  it('returns false when the token has no sight', () => {
    expect(resolveSharedVisionSource(baseContext({ hasSight: false }))).toBe(false);
  });

  it('returns false when the token is hidden from a non-GM user', () => {
    expect(resolveSharedVisionSource(baseContext({ hidden: true }))).toBe(false);
  });

  it('returns true for a controlled token regardless of other factors', () => {
    expect(resolveSharedVisionSource(baseContext({ controlled: true, hidden: true, isGM: true }))).toBe(true);
  });

  it('returns false for a GM viewing an uncontrolled token', () => {
    expect(resolveSharedVisionSource(baseContext({ isGM: true }))).toBe(false);
  });

  it('returns false without at least OBSERVER permission', () => {
    expect(resolveSharedVisionSource(baseContext({ observerPermission: false }))).toBe(false);
  });

  it('returns false when the effective scope is "none"', () => {
    expect(resolveSharedVisionSource(baseContext({ effectiveScope: 'none' }))).toBe(false);
  });

  it('"owned" scope requires ownership', () => {
    expect(resolveSharedVisionSource(baseContext({ effectiveScope: 'owned', owner: true }))).toBe(true);
    expect(resolveSharedVisionSource(baseContext({ effectiveScope: 'owned', owner: false }))).toBe(false);
  });

  it('"partyMembers" scope requires the party-member flag, not ownership', () => {
    expect(resolveSharedVisionSource(baseContext({ effectiveScope: 'partyMembers', owner: false, isPartyMember: true }))).toBe(true);
    expect(resolveSharedVisionSource(baseContext({ effectiveScope: 'partyMembers', owner: true, isPartyMember: false }))).toBe(false);
  });

  it('"passiveWhenUnselected" mode only applies the pool when nothing else is controlled', () => {
    expect(resolveSharedVisionSource(baseContext({ hasOtherControlledWithSight: false }))).toBe(true);
    expect(resolveSharedVisionSource(baseContext({ hasOtherControlledWithSight: true }))).toBe(false);
  });

  it('"alwaysShared" mode applies the pool even while something else is controlled', () => {
    expect(resolveSharedVisionSource(baseContext({ selectionMode: 'alwaysShared', hasOtherControlledWithSight: true }))).toBe(true);
  });
});
