import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { getMovementBudget, getSessionAwareBudget, isOverBudget } from '@documents/token/logic/movementBudget.mjs';
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
      system: { speed: { land: 6, fly: 10, swim: 4, burrow: 2, climb: 3 } },
    } as unknown as ActorDnd35e;
    expect(getMovementBudget(actor, 'walk')).toBe(6);
    expect(getMovementBudget(actor, 'fly')).toBe(10);
    expect(getMovementBudget(actor, 'swim')).toBe(4);
    expect(getMovementBudget(actor, 'burrow')).toBe(2);
    expect(getMovementBudget(actor, 'climb')).toBe(3);
    expect(getMovementBudget(actor, 'crawl')).toBe(1);
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

describe('getSessionAwareBudget', () => {
  it('non-escalating actions (charge/withdraw/doubleMove/fiveFootStep) never escalate, regardless of isBudgetEscalatable', () => {
    for (const action of ['charge', 'withdraw', 'doubleMove', 'fiveFootStep']) {
      expect(getSessionAwareBudget(30, action, 40, true)).toEqual({
        totalCost: 40,
        budget: 30,
        overBudget: true,
        isDoubleMove: false,
      });
    }
  });

  it('stays within the single budget while totalCost has not exceeded it', () => {
    expect(getSessionAwareBudget(30, 'walk', 20, true)).toEqual({
      totalCost: 20,
      budget: 30,
      overBudget: false,
      isDoubleMove: false,
    });
  });

  it('does not escalate when isBudgetEscalatable is false, even if totalCost exceeds the single budget', () => {
    expect(getSessionAwareBudget(30, 'walk', 40, false)).toEqual({
      totalCost: 40,
      budget: 30,
      overBudget: true,
      isDoubleMove: false,
    });
  });

  it('escalates to a doubled budget once totalCost exceeds the single budget and escalation is allowed', () => {
    expect(getSessionAwareBudget(30, 'walk', 40, true)).toEqual({
      totalCost: 40,
      budget: 60,
      overBudget: false,
      isDoubleMove: true,
    });
  });

  it('still reports overBudget once totalCost exceeds even the doubled budget', () => {
    expect(getSessionAwareBudget(30, 'walk', 70, true)).toEqual({
      totalCost: 70,
      budget: 60,
      overBudget: true,
      isDoubleMove: true,
    });
  });

  it('escalation is exclusive on the boundary — exactly at the single budget does not escalate', () => {
    expect(getSessionAwareBudget(30, 'walk', 30, true)).toEqual({
      totalCost: 30,
      budget: 30,
      overBudget: false,
      isDoubleMove: false,
    });
  });
});
