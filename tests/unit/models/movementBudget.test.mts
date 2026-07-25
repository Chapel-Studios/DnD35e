import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { getMovementBudget, isOverBudget } from '@canvas/token/logic/movementBudget.mjs';
import { describe, expect, it } from 'vitest';

const actorWithLandSpeed = (land: number): ActorDnd35e => ({ system: { speed: { land } } }) as unknown as ActorDnd35e;

describe('getMovementBudget', () => {
  it('returns land speed for the walk action', () => {
    expect(getMovementBudget(actorWithLandSpeed(30), 'walk')).toBe(30);
  });

  it('returns 0 when actor is null or undefined', () => {
    expect(getMovementBudget(null, 'walk')).toBe(0);
    expect(getMovementBudget(undefined, 'walk')).toBe(0);
  });

  it('resolves fly/swim/burrow/climb/crawl to their matching speed fields', () => {
    const actor = {
      system: { speed: { land: 30, fly: 60, swim: 20, burrow: 10, climb: 15 } },
    } as unknown as ActorDnd35e;
    expect(getMovementBudget(actor, 'fly')).toBe(60);
    expect(getMovementBudget(actor, 'swim')).toBe(20);
    expect(getMovementBudget(actor, 'burrow')).toBe(10);
    expect(getMovementBudget(actor, 'climb')).toBe(15);
    expect(getMovementBudget(actor, 'crawl')).toBe(30);
  });

  it('returns 0 for actions with no speed concept (jump, blink, displace)', () => {
    const actor = actorWithLandSpeed(30);
    expect(getMovementBudget(actor, 'jump')).toBe(0);
    expect(getMovementBudget(actor, 'blink')).toBe(0);
    expect(getMovementBudget(actor, 'displace')).toBe(0);
  });
});

describe('isOverBudget', () => {
  it('marks the last 10ft of a 40ft drag over a 30ft budget', () => {
    expect(isOverBudget(30, 30)).toBe(false);
    expect(isOverBudget(40, 30)).toBe(true);
  });

  it('returns false when exactly at budget', () => {
    expect(isOverBudget(30, 30)).toBe(false);
  });
});
