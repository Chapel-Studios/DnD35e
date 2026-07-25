import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import {
  canSelectSpeedGatedMovementAction,
  DISABLED_MOVEMENT_ACTIONS,
} from '@canvas/token/logic/movementActionGating.mjs';
import { describe, expect, it } from 'vitest';

const actorWithSpeed = (speed: Partial<Record<string, number>>): ActorDnd35e =>
  ({ system: { speed } }) as unknown as ActorDnd35e;

describe('canSelectSpeedGatedMovementAction', () => {
  it('returns true when the actor has positive fly/swim/burrow speed', () => {
    const actor = actorWithSpeed({ fly: 60, swim: 20, burrow: 10 });
    expect(canSelectSpeedGatedMovementAction(actor, 'fly')).toBe(true);
    expect(canSelectSpeedGatedMovementAction(actor, 'swim')).toBe(true);
    expect(canSelectSpeedGatedMovementAction(actor, 'burrow')).toBe(true);
  });

  it('returns false when the matching speed is 0 or missing', () => {
    const actor = actorWithSpeed({ fly: 0 });
    expect(canSelectSpeedGatedMovementAction(actor, 'fly')).toBe(false);
    expect(canSelectSpeedGatedMovementAction(actor, 'swim')).toBe(false);
  });

  it('returns false when actor is null or undefined', () => {
    expect(canSelectSpeedGatedMovementAction(null, 'fly')).toBe(false);
    expect(canSelectSpeedGatedMovementAction(undefined, 'fly')).toBe(false);
  });

  it('returns false for actions with no speed gate mapping (e.g. walk, climb)', () => {
    const actor = actorWithSpeed({ land: 30, climb: 15 });
    expect(canSelectSpeedGatedMovementAction(actor, 'walk')).toBe(false);
    expect(canSelectSpeedGatedMovementAction(actor, 'climb')).toBe(false);
  });
});

describe('DISABLED_MOVEMENT_ACTIONS', () => {
  it('lists climb, crawl, jump, blink, and displace', () => {
    expect(DISABLED_MOVEMENT_ACTIONS).toEqual(['climb', 'crawl', 'jump', 'blink', 'displace']);
  });
});
