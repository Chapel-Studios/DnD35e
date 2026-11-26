import { Creature } from '@actors/creature/Creature.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Regression test for `Creature.useAction()`'s critical-preparation-issue gate — the
 * central entry point every invocation path (sheet, Token HUD, macros) funnels through.
 * Mirrors the same `hasCriticalPreparationIssue` gate `ActionDataModel.createActionChange()`
 * applies to the actor-side aggregation, so a caller reading `system.actions` straight off
 * the item (bypassing the actor stub) still can't execute a broken action.
 *
 * The gate returns before `useAction()` touches anything beyond `this.items`/the action
 * itself (no `PrepareActionContext`/lifecycle events/action-economy spend), so a bare
 * `Object.create(Creature.prototype)` fixture with a stubbed `items.get()` is sufficient —
 * no need to construct a real Actor/DataModel instance. A "healthy action still executes"
 * counterpart isn't included here: it would require stubbing the full execution pipeline
 * (canvas, combat, event emitter, action economy) well beyond this gate's own scope — that
 * end-to-end behavior belongs in E2E, not a unit test of this one early-return check.
 */
describe('Creature.useAction() critical-issue gate', () => {
  it('rejects a critically broken action before building any execution context', async () => {
    const action = { _id: 'atk1', hasCriticalPreparationIssue: true };
    const item = { system: { actions: [action] } };
    const creature = Object.create(Creature.prototype) as Creature;
    (creature as unknown as { items: { get: (id: string) => unknown } }).items = {
      get: (id: string) => (id === 'item1' ? item : undefined),
    };

    const result = await creature.useAction('item1', 'atk1');

    expect(result).toEqual({ cancelled: true, reason: 'actionHasCriticalIssue', warnings: [] });
  });
});

