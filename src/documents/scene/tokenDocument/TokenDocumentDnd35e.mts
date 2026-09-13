import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import {
  CHARGE_MOVEMENT_ACTION,
  CRAWL_MOVEMENT_ACTION,
  DOUBLE_MOVE_MOVEMENT_ACTION,
  DROP_PRONE_MOVEMENT_ACTION,
  FIVE_FOOT_STEP_MOVEMENT_ACTION,
  hasProneCondition,
  STAND_UP_MOVEMENT_ACTION,
  WALK_MOVEMENT_ACTION,
  WITHDRAW_MOVEMENT_ACTION,
} from '@canvas/token/logic/movementActionGating.mjs';
import { getMovementBudget } from '@canvas/token/logic/movementBudget.mjs';
import { isWithinReach } from '@canvas/token/logic/reach.mjs';
import type { TokenDnd35e } from '@canvas/token/TokenDnd35e.mjs';
import type { TokenMovementOperation } from '@client/documents/_types.mjs';
import type { DatabaseCreateCallbackOptions, DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import { PRONE_CONDITION_ID } from '@constants/conditions.mjs';
import { SIZE_REACH, SIZE_TOKEN_DIMENSIONS } from '@constants/sizes.mjs';
import type { ActionEconomyActionType } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import { markChargedThisTurn, refundAction, spendAction } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { MovementSession, MovementSessionCategory } from '@documents/combat/combatant/movementSession.mjs';
import { getMovementSession, resetMovementSession, setMovementSession } from '@documents/combat/combatant/movementSession.mjs';
import { useSettingsStore } from '@settings/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import { buildMoveActionCard, buildProneToggleCard, upsertMoveActionCard } from '@source/dice/index.mjs';
import type { MoveActionCardData, MoveActionCardFlags, ProneToggleCardFlags } from '@source/dice/rollMessages.mjs';
import { buildMoveActionCardContent, buildProneToggleCardContent } from '@source/dice/rollMessages.mjs';

import type { SceneDnd35e } from '../SceneDnd35e.mjs';

/** Full-round movement actions: always spend move + standard outright, regardless of distance covered, and never participate in the per-turn cumulative movement session. */
const FULL_ROUND_MOVEMENT_ACTIONS = new Set<string>([
  CHARGE_MOVEMENT_ACTION,
  WITHDRAW_MOVEMENT_ACTION,
  DOUBLE_MOVE_MOVEMENT_ACTION,
]);

/** Actions excluded from the ordinary cumulative movement session's cost accounting — full-round moves are tracked atomically (see `#reconcileFullRoundMove()`), and Drop Prone/Stand Up toggles aren't real movement at all (see `#handleProneToggle()`). */
const NON_SESSION_MOVEMENT_ACTIONS = new Set<string>([
  ...FULL_ROUND_MOVEMENT_ACTIONS,
  DROP_PRONE_MOVEMENT_ACTION,
  STAND_UP_MOVEMENT_ACTION,
]);

class TokenDocumentDnd35e<TParent extends SceneDnd35e | null = SceneDnd35e | null> extends TokenDocument<TParent> {
  /**
   * The `movement.id` of the last Drop Prone/Stand Up toggle processed by `_onUpdateMovement`.
   * Foundry's client-side movement pipeline can invoke `_onUpdateMovement` more than once for
   * the same physical drag (e.g. an optimistic/predicted local apply followed by the
   * server-confirmed update) — both invocations share the same `movement.id`. Without this
   * guard, both would race to call `actor.toggleStatusEffect()` before the first (unawaited)
   * call's ActiveEffect creation resolves, producing a duplicate Prone effect.
   */
  #lastProneToggleMovementId: string | null = null;

  protected override async _preCreate(
    data: this['_source'],
    options: DatabaseCreateCallbackOptions,
    user: foundry.documents.BaseUser
  ): Promise<boolean | void> {
    const result = await super._preCreate(data, options, user);
    if (result === false) return false;

    const actor = this.actor;
    const size = actor?.system?.size;
    if (size && size in SIZE_TOKEN_DIMENSIONS) {
      const dim = SIZE_TOKEN_DIMENSIONS[size];
      this.updateSource({ width: dim, height: dim });
    }
  }

  /**
   * Detects the `dropProne`/`standUp` custom movement actions (see
   * `movementActionGating.mts`) among the just-completed movement's waypoints and routes
   * them to `#handleProneToggle()` *instead of* `#consumeMovementActionEconomy()` — neither
   * action represents real ground covered or spends a tracked action/session budget (SRD:
   * Drop Prone is a free action, Standing Up doesn't move you), so letting them fall through
   * to the ordinary movement-session accounting produced a nonsensical "5 / 0" over-budget
   * card. Both actions are `teleport: true, measure: true` with a free (`0`) cost, so the
   * last completed waypoint's `.action` is the only signal available that one was used —
   * there's no dedicated "action selected" hook in Foundry's movement pipeline.
   */
  protected override _onUpdateMovement(
    movement: DeepReadonly<TokenMovementOperation>,
    operation: Partial<DatabaseUpdateOperation<TParent>>,
    user: User
  ): void {
    super._onUpdateMovement(movement, operation, user);

    const actor = this.actor;
    if (!actor) return;

    // Foundry's native movement Undo (Ctrl+Z / `TokenDocument#revertRecordedMovement`) snaps
    // the token back and marks the operation `isUndo: true` — `#handleProneToggle()`'s own
    // corrective revert (also routed through `revertRecordedMovement()`) sets the very same
    // flag, so this branch re-enters here too. That's harmless: `#reconcileProneToggle()` is a
    // no-op until `session.proneToggle` is actually set, which only happens *after*
    // `#handleProneToggle()`'s corrective revert completes. `operation` is typed as the generic
    // `DatabaseUpdateOperation` here, but Token updates always carry the richer
    // `EmbeddedTokenUpdateOperation` shape at runtime (see `scene.d.mts`), which does.
    if ((operation as { isUndo?: boolean }).isUndo) {
      void this.#reconcileUndoneMovement(actor);
      return;
    }

    // Only the most recently completed waypoint matters here — checking `.some()` over the
    // whole passed list would also match a stale waypoint carried over from a prior update.
    const lastAction = (movement.passed?.waypoints ?? []).at(-1)?.action;
    const droppedProne = lastAction === DROP_PRONE_MOVEMENT_ACTION;
    const stoodUp = lastAction === STAND_UP_MOVEMENT_ACTION;

    if (droppedProne || stoodUp) {
      // Foundry's client-side movement pipeline can invoke `_onUpdateMovement` more than once
      // for the same physical drag (e.g. an optimistic/predicted local apply followed by the
      // server-confirmed update) — both invocations share the same `movement.id`. Without this
      // guard, both would race to call `actor.toggleStatusEffect()` before the first
      // (unawaited) call's ActiveEffect creation resolves, producing a duplicate Prone effect.
      if (movement.id === this.#lastProneToggleMovementId) return;
      this.#lastProneToggleMovementId = movement.id;
      void this.#handleProneToggle(movement, actor, droppedProne);
      return;
    }

    void this.#consumeMovementActionEconomy(movement, actor);
  }

  /**
   * Toggles the Prone condition and reverts the confirming drag's own displacement through
   * Foundry's native recorded-movement undo (`revertRecordedMovement()`) — the same mechanism
   * Ctrl+Z and the Prone Toggle chat card's own Undo button already rely on (see
   * `chatCardActions.mts#onUndoProneToggle`). A manual `displace` snap-back layered *on top*
   * of the confirming drag (the old approach) left that drag's own `dropProne`/`standUp`
   * waypoint permanently recorded in `movementHistory` — the Ruler renders the whole recorded
   * path, so it kept showing a leftover ghost waypoint marker even after the token visually
   * returned to its original spot. Truncating the history via `revertRecordedMovement()`
   * removes that waypoint entirely instead of merely covering it up.
   *
   * The movement mode is switched separately (crawling while prone, walking again once back
   * on your feet) — `revertRecordedMovement()` is a fixed built-in that only ever restores
   * position/history fields, it has no room for extra data.
   *
   * Posts a compact, dedicated "Dropped Prone"/"Stood Up" card (distinct from the distance/
   * budget-based Move Action Spent card) and tracks the confirming drag's `movement.id` on
   * the movement session so `#reconcileProneToggle()` can revert the condition if Foundry's
   * native Undo (Ctrl+Z) later reverts that specific drag. Only posted/tracked during an
   * active encounter, matching `#consumeMovementActionEconomy()`'s own combat-only card
   * posting — outside combat the toggle still happens, just silently.
   */
  async #handleProneToggle(movement: DeepReadonly<TokenMovementOperation>, actor: ActorDnd35e, droppedProne: boolean): Promise<void> {
    const priorActive = hasProneCondition(actor);
    await actor.toggleStatusEffect(PRONE_CONDITION_ID, { active: droppedProne });

    const historyLengthBeforeRevert = canvas.tokens?.history.length ?? 0;

    await this.revertRecordedMovement(movement.id);
    await this.update({ movementAction: droppedProne ? CRAWL_MOVEMENT_ACTION : WALK_MOVEMENT_ACTION });

    // Both corrective updates above are themselves recorded as separate Ctrl+Z-able entries
    // (see `TokenLayer#storeHistory`) — left in place, a single Ctrl+Z press would only pop
    // the most recent of the two, and it'd take a *third* press to finally revert the
    // confirming drag itself. Truncating by length (rather than a fixed pop-count) is robust
    // to however many entries Foundry's movement pipeline actually pushed (e.g. a
    // duplicate optimistic/confirmed invocation) and never removes the confirming drag's own
    // (pre-existing) entry, so a single Ctrl+Z press reverts straight through to before the
    // toggle and correctly reports `isUndo` for `#reconcileProneToggle()` to act on.
    this.#discardProneToggleCorrectiveEntries(historyLengthBeforeRevert);

    // The Token HUD's movement-action picker snapshots `document.movementAction` only at its
    // own render time (see `TokenHUD#_getMovementActionChoices()`) — it doesn't reactively
    // refresh when the field changes elsewhere, so without this it kept showing the toggle's
    // own `dropProne`/`standUp` action as "active" even though the field above already moved
    // on to `crawl`/`walk`.
    if (canvas.tokens?.hud.rendered && canvas.tokens.hud.document === this) void canvas.tokens.hud.render();

    const combat = game.combat;
    if (!combat?.started) return;

    const tokenId = this.id;
    if (!tokenId) return;
    const combatant = combat.getCombatantsByToken(tokenId)[0] as CombatantDnd35e | undefined;
    if (!combatant) return;

    const messageId = await buildProneToggleCard(combatant, actor, droppedProne, priorActive, movement.id);
    const session = getMovementSession(combatant);
    await setMovementSession(combatant, { ...session, proneToggle: { movementId: movement.id, priorActive, messageId } });
  }

  /**
   * Truncates the tokens layer's own Ctrl+Z undo stack back to its length from before
   * `#handleProneToggle()`'s corrective updates (the `revertRecordedMovement()` call and the
   * movement-mode field update) began, discarding whatever they added. See the call site for
   * why length-based truncation is preferred over a fixed pop-count.
   */
  #discardProneToggleCorrectiveEntries(lengthBeforeRevert: number): void {
    const history = canvas.tokens?.history;
    if (history && history.length > lengthBeforeRevert) history.length = lengthBeforeRevert;
  }

  /**
   * Spends the move/standard action(s) a just-completed movement consumed (see
   * phase-10-basic-combat.md §10.6), posting the Move Action Spent chat card. Only runs
   * during an active encounter — outside combat there's no action economy to track.
   * Foundry's movement pipeline has no dedicated "which action was selected" field on
   * `movement` itself, so the movement action is read the same way `_onUpdateMovement()`
   * reads it to detect a Prone toggle: the last completed waypoint's `.action`. Drop
   * Prone/Stand Up never reach here at all — `_onUpdateMovement()` routes them to
   * `#handleProneToggle()` instead, since neither spends a tracked action/session budget.
   *
   * `displace` waypoints (the Prone-toggle revert's own `revertRecordedMovement()` call and
   * the Move Action Undo snap-back — see `snapTokenToPosition()`) never carry a real cost and
   * must never be accounted for here, or an Undo would look like a brand-new chargeable move.
   *
   * `charge`/`withdraw`/`doubleMove` are full-round actions: always spend a move + standard
   * action outright, in a single one-shot chat card, regardless of distance covered (see
   * `#performFullRoundMove()`). Everything else (`walk`/`run`/`crawl`/fly/swim/climb/burrow/
   * `fiveFootStep`) participates in the per-turn cumulative movement session (see
   * `#consumeSessionMovement()`/`movementSession.mts`), which accumulates cost across
   * multiple partial drags in the same turn and enforces that a 5-foot step and ordinary
   * movement are mutually exclusive for the whole turn.
   */
  async #consumeMovementActionEconomy(movement: DeepReadonly<TokenMovementOperation>, actor: ActorDnd35e): Promise<void> {
    const combat = game.combat;
    if (!combat?.started) return;

    const tokenId = this.id;
    if (!tokenId) return;
    const combatant = combat.getCombatantsByToken(tokenId)[0] as CombatantDnd35e | undefined;
    if (!combatant) return;

    const movementAction = (movement.passed?.waypoints ?? []).at(-1)?.action;
    if (!movementAction || movementAction === 'displace') return;

    const { measurement: { convertToLocalizedDistance } } = useSettingsStore();
    const cost = movement.passed?.cost ?? 0;
    const priorPosition = { x: movement.origin.x, y: movement.origin.y, elevation: movement.origin.elevation };

    if (FULL_ROUND_MOVEMENT_ACTIONS.has(movementAction)) {
      const budget = convertToLocalizedDistance(getMovementBudget(actor, movementAction));
      await this.#performFullRoundMove(combatant, actor, movementAction, cost, budget, priorPosition, movement.id);
      return;
    }

    await this.#consumeSessionMovement(combatant, actor, movementAction, cost, priorPosition);
  }

  /**
   * Charge/Withdraw/Double Move: always a full-round action (spends move + standard
   * outright), resolved immediately in its own one-shot chat card — unlike ordinary
   * movement, these aren't split across a turn's multiple partial drags, so there's no
   * cumulative session to track. If the actions aren't both available (e.g. already spent
   * elsewhere this turn), the move is flagged over-budget with no snap-back position (this
   * mirrors the "insufficient actions" case in `#consumeSessionMovement()` rather than
   * silently succeeding with nothing spent).
   *
   * `movementId` (the drag's `movement.id`) is stashed on the movement session purely so
   * Foundry's native movement Undo (Ctrl+Z) can later tell whether this specific drag got
   * reverted (see `#reconcileUndoneMovement()`) — full-round moves are otherwise untouched
   * by the session's cumulative-cost bookkeeping.
   */
  async #performFullRoundMove(
    combatant: CombatantDnd35e,
    actor: ActorDnd35e,
    movementAction: string,
    cost: number,
    budget: number,
    priorPosition: { x: number; y: number; elevation: number },
    movementId: string
  ): Promise<void> {
    const spent = await spendAction(combatant, ['move', 'standard']);
    if (!spent) {
      const data: MoveActionCardData = { spent: [], cost, budget, overBudget: true, overBudgetReason: 'insufficientActions' };
      await buildMoveActionCard(combatant, actor, movementAction, data, null);
      return;
    }

    const messageId = await buildMoveActionCard(combatant, actor, movementAction, { spent, cost, budget, overBudget: false }, priorPosition);
    const session = getMovementSession(combatant);
    await setMovementSession(combatant, { ...session, fullRoundMove: { movementId, spentTiers: spent, messageId } });

    if (movementAction !== CHARGE_MOVEMENT_ACTION) return;

    // dnd35e type-fix: `TokenDocument#object` reports the core `Token<this>` type, not the
    // registered `CONFIG.Token.objectClass` subclass (see CombatDnd35e's matching
    // Combatant cast) — same for `canvas.tokens.placeables`, which is core-typed too.
    const attackerToken = this.object as unknown as TokenDnd35e | null;
    const reach = SIZE_REACH[actor.system.size] ?? 1;
    const reachedTarget = attackerToken
      ? (canvas.tokens?.placeables ?? []).some((target) =>
        target.actor
          && target.document.disposition !== this.disposition
          && isWithinReach(attackerToken, target as unknown as TokenDnd35e, reach)
      )
      : false;
    if (reachedTarget) await markChargedThisTurn(combatant);
  }

  /**
   * Ordinary movement (walk/run/crawl/fly/swim/climb/burrow/fiveFootStep) accumulates into
   * the combatant's per-turn movement session (see `movementSession.mts`) instead of being
   * judged independently drag-by-drag. This is what fixes:
   * - A 5-foot step always reading a 0 budget (fixed 1-square allowance handled here, not
   *   via `movementBudget.mts`'s speed map) and never actually spending the move action.
   * - A completed 5-foot step failing to block a later ordinary move in the same turn (and
   *   vice versa) — SRD: the two are mutually exclusive for the whole round, regardless of
   *   remaining distance.
   * - Multiple partial drags in the same turn each posting their own independent chat card
   *   and budget check instead of one running total for the turn (see phase-10 report).
   * - A move silently "succeeding" with an empty `spent` list once the required action pool
   *   is already exhausted, rather than warning the player.
   *
   * Only the *new* delta of action tiers required by the updated cumulative cost is spent
   * (`spendAction()` is all-or-nothing for compound requests — re-requesting an
   * already-spent tier would spuriously fail).
   */
  async #consumeSessionMovement(
    combatant: CombatantDnd35e,
    actor: ActorDnd35e,
    movementAction: string,
    stepCost: number,
    priorPosition: { x: number; y: number; elevation: number }
  ): Promise<void> {
    if (stepCost <= 0) return; // a zero-length confirming drag has nothing to account for

    const { measurement: { convertToLocalizedDistance } } = useSettingsStore();
    const category: MovementSessionCategory = movementAction === FIVE_FOOT_STEP_MOVEMENT_ACTION ? 'step' : 'normal';
    const budget = category === 'step'
      ? convertToLocalizedDistance(1)
      : convertToLocalizedDistance(getMovementBudget(actor, movementAction));

    const session = getMovementSession(combatant);
    const mixedCategory = session.category !== null && session.category !== category;
    const cumulativeCost = session.cumulativeCost + stepCost;
    const firstOrigin = session.firstOrigin ?? priorPosition;

    let spentTiers = session.spentTiers;
    let overBudget = false;
    let overBudgetReason: MoveActionCardData['overBudgetReason'];

    if (mixedCategory) {
      overBudget = true;
      overBudgetReason = 'mixedMovement';
    } else if (category === 'step') {
      if (cumulativeCost > budget) {
        overBudget = true;
        overBudgetReason = 'fiveFootStep';
      } else if (!spentTiers.includes('move')) {
        const spent = await spendAction(combatant, ['move']);
        if (spent) spentTiers = [...spentTiers, ...spent];
        else {
          overBudget = true;
          overBudgetReason = 'insufficientActions';
        }
      }
    } else {
      const requiredTiers: ActionEconomyActionType[] =
        cumulativeCost <= budget ? ['move']
          : cumulativeCost <= budget * 2 ? ['move', 'standard']
            : [];
      if (requiredTiers.length === 0) {
        overBudget = true;
        overBudgetReason = 'doubleMove';
      } else {
        const missingTiers = requiredTiers.filter((tier) => !spentTiers.includes(tier));
        if (missingTiers.length > 0) {
          const spent = await spendAction(combatant, missingTiers);
          if (spent) spentTiers = [...spentTiers, ...spent];
          else {
            overBudget = true;
            overBudgetReason = 'insufficientActions';
          }
        }
      }
    }

    const updatedSession: MovementSession = {
      category: session.category ?? category,
      cumulativeCost,
      spentTiers,
      firstOrigin,
      messageId: session.messageId,
      lastMovementAction: movementAction,
      fullRoundMove: session.fullRoundMove,
      proneToggle: session.proneToggle,
    };

    // Once a session escalates to spending the standard action too, it's mechanically a
    // full-round Double Move (2x speed) rather than the single-move-action pace the drag's
    // own movement action implies — reflect that in the card's label and budget rather than
    // leaving both frozen at the original single-action values.
    const isDoubleMoveEscalation = category === 'normal' && spentTiers.includes('standard');
    const displayMovementAction = isDoubleMoveEscalation ? DOUBLE_MOVE_MOVEMENT_ACTION : movementAction;
    const displayBudget = isDoubleMoveEscalation ? budget * 2 : budget;

    const cardData: MoveActionCardData = { spent: spentTiers, cost: cumulativeCost, budget: displayBudget, overBudget, overBudgetReason };
    updatedSession.messageId = await upsertMoveActionCard(combatant, actor, displayMovementAction, cardData, firstOrigin, session.messageId);

    await setMovementSession(combatant, updatedSession);
  }

  /**
   * Reconciles the per-turn movement session/full-round tracking (see `movementSession.mts`)
   * against whatever's actually left standing after Foundry's native movement Undo (Ctrl+Z)
   * rolls the token back — that path bypasses `#consumeSessionMovement()`/`#performFullRoundMove()`
   * entirely (it snaps the token via a cost-free `displace` waypoint), so without this our
   * action economy and chat card(s) would keep reporting the pre-undo state forever.
   *
   * The Prone toggle, full-round moves (atomic, all-or-nothing), and the cumulative session
   * (partial, distance-based) are reconciled independently, since any combination could have
   * accumulated this turn before the drag that just got undone.
   */
  async #reconcileUndoneMovement(actor: ActorDnd35e): Promise<void> {
    const combat = game.combat;
    if (!combat?.started) return;

    const tokenId = this.id;
    if (!tokenId) return;
    const combatant = combat.getCombatantsByToken(tokenId)[0] as CombatantDnd35e | undefined;
    if (!combatant) return;

    await this.#reconcileProneToggle(combatant, actor);
    await this.#reconcileFullRoundMove(combatant);
    await this.#reconcileSessionMovement(combatant, actor);
  }

  /**
   * A Drop Prone/Stand Up toggle's confirming drag (see `#handleProneToggle()`) is atomic,
   * like a full-round move — reverted only once its own `movementId` (the drag that
   * triggered the toggle, not our own corrective snap-back's) is no longer present in
   * `movementHistory`. Foundry's native Undo pops one recorded update at a time, and our
   * corrective snap-back is a *separate* update from the confirming drag — so the first
   * Ctrl+Z press only reverts our snap-back (landing the token back at the confirming drag's
   * endpoint), and the Prone condition/card are only reverted by whichever *later* press
   * finally removes the confirming drag itself.
   */
  async #reconcileProneToggle(combatant: CombatantDnd35e, actor: ActorDnd35e): Promise<void> {
    const session = getMovementSession(combatant);
    const proneToggle = session.proneToggle;
    if (!proneToggle) return;

    const stillPresent = this.movementHistory.some((waypoint) => waypoint.movementId === proneToggle.movementId);
    if (stillPresent) return;

    if (hasProneCondition(actor) !== proneToggle.priorActive) {
      await actor.toggleStatusEffect(PRONE_CONDITION_ID, { active: proneToggle.priorActive });
    }
    await this.#markProneToggleCardUndone(combatant, proneToggle.messageId);
    await setMovementSession(combatant, { ...session, proneToggle: null });
  }

  /**
   * A full-round move (Charge/Withdraw/Double Move) is an atomic one-shot spend — either the
   * whole drag survived Undo or it didn't, there's no partial distance to recompute. Detected
   * via `movementId` presence in `movementHistory` rather than leftover cost, since undoing
   * back to a position still covered by an earlier ordinary move could leave a nonzero total
   * cost behind that has nothing to do with the full-round move itself.
   */
  async #reconcileFullRoundMove(combatant: CombatantDnd35e): Promise<void> {
    const session = getMovementSession(combatant);
    const fullRoundMove = session.fullRoundMove;
    if (!fullRoundMove) return;

    const stillPresent = this.movementHistory.some((waypoint) => waypoint.movementId === fullRoundMove.movementId);
    if (stillPresent) return;

    await refundAction(combatant, fullRoundMove.spentTiers);
    await this.#markMoveActionCardUndone(combatant, fullRoundMove.messageId);
    await setMovementSession(combatant, { ...session, fullRoundMove: null });
  }

  /**
   * Rather than trying to subtract the exact amount undone (Foundry doesn't hand this hook
   * the specific recorded segment being reverted, and repeated Ctrl+Z presses can walk back
   * through several of this turn's drags one at a time), the remaining cumulative cost is
   * re-derived from the combatant's own `movementHistory` — already rolled back by Foundry by
   * the time this runs, and expressed in the same scene distance-unit domain as the session's
   * `cumulativeCost` (see `TokenRulerDnd35e`'s matching use of native waypoint cost). Full-round
   * waypoints are excluded — they're accounted for separately by `#reconcileFullRoundMove()`
   * and never counted toward the ordinary session's budget. Drop Prone/Stand Up waypoints are
   * excluded too — they never participate in the session at all (see `#handleProneToggle()`).
   */
  async #reconcileSessionMovement(combatant: CombatantDnd35e, actor: ActorDnd35e): Promise<void> {
    const session = getMovementSession(combatant);
    if (session.spentTiers.length === 0 && session.cumulativeCost === 0) return; // nothing of ours to reconcile

    const remainingCost = this.movementHistory
      .filter((waypoint) => !NON_SESSION_MOVEMENT_ACTIONS.has(waypoint.action))
      .reduce((total, waypoint) => total + waypoint.cost, 0);

    if (remainingCost <= 0) {
      await refundAction(combatant, session.spentTiers);
      await resetMovementSession(combatant);
      await this.#markMoveActionCardUndone(combatant, session.messageId);
      return;
    }

    const category = session.category ?? 'normal';
    const { measurement: { convertToLocalizedDistance } } = useSettingsStore();
    const movementAction = session.lastMovementAction ?? WALK_MOVEMENT_ACTION;
    const budget = category === 'step'
      ? convertToLocalizedDistance(1)
      : convertToLocalizedDistance(getMovementBudget(actor, movementAction));

    const requiredTiers: ActionEconomyActionType[] = remainingCost <= budget ? ['move'] : ['move', 'standard'];
    const tiersToRefund = session.spentTiers.filter((tier) => !requiredTiers.includes(tier));
    if (tiersToRefund.length > 0) await refundAction(combatant, tiersToRefund);
    const spentTiers = session.spentTiers.filter((tier) => requiredTiers.includes(tier));

    const isDoubleMoveEscalation = category === 'normal' && spentTiers.includes('standard');
    const displayMovementAction = isDoubleMoveEscalation ? DOUBLE_MOVE_MOVEMENT_ACTION : movementAction;
    const displayBudget = isDoubleMoveEscalation ? budget * 2 : budget;

    const cardData: MoveActionCardData = { spent: spentTiers, cost: remainingCost, budget: displayBudget, overBudget: false };
    const messageId = await upsertMoveActionCard(combatant, actor, displayMovementAction, cardData, session.firstOrigin, session.messageId);

    await setMovementSession(combatant, { ...session, cumulativeCost: remainingCost, spentTiers, messageId });
  }

  /** Marks an existing Move Action card `undone` in place — no position snap-back needed here, Foundry's native Undo already repositioned the token. */
  async #markMoveActionCardUndone(combatant: CombatantDnd35e, messageId: string | null): Promise<void> {
    const message = messageId ? game.messages?.get(messageId) : undefined;
    if (!message) return;
    const flags = message.getFlag(SYSTEM_ID, 'moveActionCard') as MoveActionCardFlags | undefined;
    if (!flags || flags.undone) return;

    const updatedFlags: MoveActionCardFlags = { ...flags, undone: true };
    await message.update({
      content: buildMoveActionCardContent(combatant.name, updatedFlags),
      'flags.dnd35e.moveActionCard': updatedFlags,
    });
  }

  /** Marks an existing Drop Prone/Stand Up card `undone` in place — mirrors `#markMoveActionCardUndone()`, reading the distinct `proneToggleCard` flag key instead. */
  async #markProneToggleCardUndone(combatant: CombatantDnd35e, messageId: string | null): Promise<void> {
    const message = messageId ? game.messages?.get(messageId) : undefined;
    if (!message) return;
    const flags = message.getFlag(SYSTEM_ID, 'proneToggleCard') as ProneToggleCardFlags | undefined;
    if (!flags || flags.undone) return;

    const updatedFlags: ProneToggleCardFlags = { ...flags, undone: true };
    await message.update({
      content: buildProneToggleCardContent(combatant.name, updatedFlags),
      'flags.dnd35e.proneToggleCard': updatedFlags,
    });
  }
}

// Type-only override merged onto the class — base getter resolves through
// `Actor<this | null>`, which is Foundry's own `Actor`, not `ActorDnd35e`.
interface TokenDocumentDnd35e<TParent extends SceneDnd35e | null = SceneDnd35e | null> extends TokenDocument<TParent> {
  get actor(): ActorDnd35e<this | null> | null;
}

export { TokenDocumentDnd35e };
