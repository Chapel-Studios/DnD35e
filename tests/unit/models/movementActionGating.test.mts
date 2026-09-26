import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { PRONE_CONDITION_ID } from '@constants/conditions.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import {
  canSelectChargeMovementAction,
  canSelectCrawlMovementAction,
  canSelectDoubleMoveMovementAction,
  canSelectDropProneMovementAction,
  canSelectFiveFootStepMovementAction,
  canSelectGroundMovementAction,
  canSelectSpeedGatedMovementAction,
  canSelectStandUpMovementAction,
  canSelectWithdrawMovementAction,
  DISABLED_MOVEMENT_ACTIONS,
  hasProneCondition,
  isFiveFootStepAffordable,
  isFullRoundMoveAffordable,
  isMovementActionAffordable,
  isRunAffordable,
  SPEED_GATED_ACTIONS,
} from '@documents/token/logic/movementActionGating.mjs';
import { afterEach, describe, expect, it } from 'vitest';

const actorWithSpeed = (speed: Partial<Record<string, number>>): ActorDnd35e =>
  ({ system: { speed } }) as unknown as ActorDnd35e;

const actorWithProne = (prone: boolean): ActorDnd35e =>
  ({ id: 'actor1', statuses: prone ? new Set([PRONE_CONDITION_ID]) : new Set() }) as unknown as ActorDnd35e;

/** Fake CombatantDnd35e exposing only what movementActionGating.mts's affordability
 * predicates read: the plain `actionEconomy` shape (bypassing the real getter, since no
 * real Combatant is instantiated) and `getFlag` for `getMovementSession()`. */
const buildFakeCombatant = (
  actions: { move: boolean; standard: boolean },
  movementSessionCategory: 'step' | 'normal' | null = null
): CombatantDnd35e => ({
  actionEconomy: { actions: { standard: actions.standard, move: actions.move, minor: true, aoo: 0 } },
  getFlag: (_scope: string, key: string) => (key === 'movementSession' ? { category: movementSessionCategory } : undefined),
} as unknown as CombatantDnd35e);

/** Stubs `game.combat` for the affordability/`isInActiveCombat` predicates that read it. Cleared in `afterEach` — per `tests/setup.mts`'s "only stub what tests actually call" philosophy, `game.combat` is not part of the global setup. */
const stubCombat = (started: boolean, combatant?: CombatantDnd35e): void => {
  (globalThis as any).game.combat = {
    started,
    getCombatantsByActor: () => (combatant ? [combatant] : []),
  };
};

describe('canSelectSpeedGatedMovementAction', () => {
  it('returns true when the actor has positive fly/swim/burrow/climb/land speed', () => {
    const actor = actorWithSpeed({ fly: 60, swim: 20, burrow: 10, climb: 15, land: 30 });
    expect(canSelectSpeedGatedMovementAction(actor, 'fly')).toBe(true);
    expect(canSelectSpeedGatedMovementAction(actor, 'swim')).toBe(true);
    expect(canSelectSpeedGatedMovementAction(actor, 'burrow')).toBe(true);
    expect(canSelectSpeedGatedMovementAction(actor, 'climb')).toBe(true);
    expect(canSelectSpeedGatedMovementAction(actor, 'run')).toBe(true);
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

  it('returns false for actions with no speed gate mapping (e.g. walk)', () => {
    const actor = actorWithSpeed({ land: 30 });
    expect(canSelectSpeedGatedMovementAction(actor, 'walk')).toBe(false);
  });
});

describe('DISABLED_MOVEMENT_ACTIONS', () => {
  it('never overlaps with a speed-gated action (a disabled action should never accidentally get speed-gated instead)', () => {
    for (const action of DISABLED_MOVEMENT_ACTIONS) {
      expect(Object.keys(SPEED_GATED_ACTIONS)).not.toContain(action);
    }
  });

  it('canSelectSpeedGatedMovementAction returns false for every disabled action, even if the actor happens to have a same-named speed field', () => {
    for (const action of DISABLED_MOVEMENT_ACTIONS) {
      const actor = actorWithSpeed({ [action]: 30 });
      expect(canSelectSpeedGatedMovementAction(actor, action)).toBe(false);
    }
  });
});

describe('Prone gating (hasProneCondition / crawl / ground / dropProne / standUp)', () => {
  it('hasProneCondition reads actor.statuses, defaulting to false for null/undefined', () => {
    expect(hasProneCondition(actorWithProne(true))).toBe(true);
    expect(hasProneCondition(actorWithProne(false))).toBe(false);
    expect(hasProneCondition(null)).toBe(false);
    expect(hasProneCondition(undefined)).toBe(false);
  });

  it('crawl is only selectable while Prone; walk/run are blocked while Prone', () => {
    const prone = actorWithProne(true);
    const standing = actorWithProne(false);
    expect(canSelectCrawlMovementAction(prone)).toBe(true);
    expect(canSelectCrawlMovementAction(standing)).toBe(false);
    expect(canSelectGroundMovementAction(prone)).toBe(false);
    expect(canSelectGroundMovementAction(standing)).toBe(true);
  });

  it('dropProne is only selectable while standing; standUp is only selectable while Prone', () => {
    const prone = actorWithProne(true);
    const standing = actorWithProne(false);
    expect(canSelectDropProneMovementAction(standing)).toBe(true);
    expect(canSelectDropProneMovementAction(prone)).toBe(false);
    expect(canSelectStandUpMovementAction(prone)).toBe(true);
    expect(canSelectStandUpMovementAction(standing)).toBe(false);
  });
});

describe('Combat-only structural gating (fiveFootStep / withdraw / charge / doubleMove)', () => {
  afterEach(() => {
    delete (globalThis as any).game.combat;
  });

  it('are hidden outside an active/started combat', () => {
    stubCombat(false);
    expect(canSelectFiveFootStepMovementAction()).toBe(false);
    expect(canSelectWithdrawMovementAction()).toBe(false);
    expect(canSelectChargeMovementAction()).toBe(false);
    expect(canSelectDoubleMoveMovementAction()).toBe(false);
  });

  it('are offered once combat has started, regardless of the combatant\'s remaining action economy', () => {
    stubCombat(true);
    expect(canSelectFiveFootStepMovementAction()).toBe(true);
    expect(canSelectWithdrawMovementAction()).toBe(true);
    expect(canSelectChargeMovementAction()).toBe(true);
    expect(canSelectDoubleMoveMovementAction()).toBe(true);
  });

  it('are hidden when no combat exists at all (game.combat undefined)', () => {
    expect(canSelectFiveFootStepMovementAction()).toBe(false);
  });
});

describe('Affordability predicates (isFiveFootStepAffordable / isRunAffordable / isFullRoundMoveAffordable)', () => {
  afterEach(() => {
    delete (globalThis as any).game.combat;
  });

  it('treat an actor with no tracked combatant as always affordable (not yet in combat)', () => {
    stubCombat(true, undefined);
    const actor = actorWithProne(false);
    expect(isFiveFootStepAffordable(actor)).toBe(true);
    expect(isRunAffordable(actor)).toBe(true);
    expect(isFullRoundMoveAffordable(actor)).toBe(true);
  });

  it('isFiveFootStepAffordable is true only while nothing has moved yet this turn (session category null)', () => {
    const actor = actorWithProne(false);
    stubCombat(true, buildFakeCombatant({ move: true, standard: true }, null));
    expect(isFiveFootStepAffordable(actor)).toBe(true);

    stubCombat(true, buildFakeCombatant({ move: true, standard: true }, 'normal'));
    expect(isFiveFootStepAffordable(actor)).toBe(false);
  });

  it('isRunAffordable requires the move action unspent and a non-"step" session category', () => {
    const actor = actorWithProne(false);
    stubCombat(true, buildFakeCombatant({ move: true, standard: true }, null));
    expect(isRunAffordable(actor)).toBe(true);

    stubCombat(true, buildFakeCombatant({ move: false, standard: true }, null));
    expect(isRunAffordable(actor)).toBe(false);

    stubCombat(true, buildFakeCombatant({ move: true, standard: true }, 'step'));
    expect(isRunAffordable(actor)).toBe(false);
  });

  it('isFullRoundMoveAffordable requires both move and standard unspent and a non-"step" session category', () => {
    const actor = actorWithProne(false);
    stubCombat(true, buildFakeCombatant({ move: true, standard: true }, null));
    expect(isFullRoundMoveAffordable(actor)).toBe(true);

    stubCombat(true, buildFakeCombatant({ move: true, standard: false }, null));
    expect(isFullRoundMoveAffordable(actor)).toBe(false);

    stubCombat(true, buildFakeCombatant({ move: false, standard: true }, null));
    expect(isFullRoundMoveAffordable(actor)).toBe(false);

    stubCombat(true, buildFakeCombatant({ move: true, standard: true }, 'step'));
    expect(isFullRoundMoveAffordable(actor)).toBe(false);
  });

  it('isMovementActionAffordable dispatches per-action, defaulting to true for actions with no affordability predicate (e.g. walk)', () => {
    const actor = actorWithProne(false);
    stubCombat(true, buildFakeCombatant({ move: false, standard: false }, null));
    expect(isMovementActionAffordable(actor, 'walk')).toBe(true);
    expect(isMovementActionAffordable(actor, 'run')).toBe(false);
    expect(isMovementActionAffordable(actor, 'withdraw')).toBe(false);
    expect(isMovementActionAffordable(actor, 'charge')).toBe(false);
    expect(isMovementActionAffordable(actor, 'doubleMove')).toBe(false);
  });
});
