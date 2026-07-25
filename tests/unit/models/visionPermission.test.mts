import { hasSharedTokenVision } from '@actors/creature/logic/visionPermission.mjs';
import type { TokenDnd35e } from '@canvas/token/TokenDnd35e.mjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeToken (actor: unknown, controlled = false): TokenDnd35e {
  return { actor, controlled } as unknown as TokenDnd35e;
}

function makeActor (flagValue: unknown) {
  return { getFlag: vi.fn(() => flagValue) };
}

describe('hasSharedTokenVision', () => {
  beforeEach(() => {
    (game.user as unknown as { id: string }).id = 'user-1';
    (game.settings.get as ReturnType<typeof vi.fn>).mockReturnValue('withoutSelection');
  });

  it('returns false when the token has no actor', () => {
    expect(hasSharedTokenVision(makeToken(null))).toBe(false);
  });

  it('returns false when there is no visionPermission flag', () => {
    expect(hasSharedTokenVision(makeToken(makeActor(undefined)))).toBe(false);
  });

  it('grants vision when the per-user level is yes', () => {
    const actor = makeActor({ default: 'no', users: { 'user-1': 'yes' } });
    expect(hasSharedTokenVision(makeToken(actor))).toBe(true);
  });

  it('denies vision when the per-user level is no, even if default is yes', () => {
    const actor = makeActor({ default: 'yes', users: { 'user-1': 'no' } });
    expect(hasSharedTokenVision(makeToken(actor))).toBe(false);
  });

  it('falls back to the actor default when the user has no override', () => {
    const actor = makeActor({ default: 'yes', users: {} });
    expect(hasSharedTokenVision(makeToken(actor))).toBe(true);
  });

  it('falls back to the actor default when the user level is "default"', () => {
    const actor = makeActor({ default: 'yes', users: { 'user-1': 'default' } });
    expect(hasSharedTokenVision(makeToken(actor))).toBe(true);
  });

  it('in withSelection mode, only grants vision while the token is controlled', () => {
    (game.settings.get as ReturnType<typeof vi.fn>).mockReturnValue('withSelection');
    const actor = makeActor({ default: 'yes', users: {} });
    expect(hasSharedTokenVision(makeToken(actor, false))).toBe(false);
    expect(hasSharedTokenVision(makeToken(actor, true))).toBe(true);
  });
});
