/**
 * Chat message assembly for D20-based rolls. The card template is precompiled from raw
 * `.hbs` source at module load (same pattern as `TokenRulerDnd35e`'s waypoint label) rather
 * than fetched via Foundry's async `renderTemplate()` — the Vue migration removed the
 * static `.hbs`-over-HTTP pipeline, so `.hbs` files are only ever imported via `?raw` and
 * compiled in-memory.
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { ChatMessageSource } from '@common/documents/chat-message.mjs';
import type { ActionEconomyType } from '@constants/actionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { useSettingsStore } from '@settings/index.mjs';

import type { D20Roll } from './D20Roll.mjs';
import actionSpentCardTemplateSource from './templates/action-spent-card.hbs?raw';
import actionWarningCardTemplateSource from './templates/action-warning-card.hbs?raw';
import modifierBreakdownTemplateSource from './templates/modifier-breakdown.hbs?raw';
import moveActionCardTemplateSource from './templates/move-action-card.hbs?raw';
import proneToggleCardTemplateSource from './templates/prone-toggle-card.hbs?raw';
import saveRollCardTemplateSource from './templates/save-roll-card.hbs?raw';
import type { RollModifier } from './types.mjs';

const saveRollCardTemplate = Handlebars.compile(saveRollCardTemplateSource, { preventIndent: true });
const modifierBreakdownTemplate = Handlebars.compile(modifierBreakdownTemplateSource, { preventIndent: true });
const moveActionCardTemplate = Handlebars.compile(moveActionCardTemplateSource, { preventIndent: true });
const proneToggleCardTemplate = Handlebars.compile(proneToggleCardTemplateSource, { preventIndent: true });
const actionWarningCardTemplate = Handlebars.compile(actionWarningCardTemplateSource, { preventIndent: true });
const actionSpentCardTemplate = Handlebars.compile(actionSpentCardTemplateSource, { preventIndent: true });

/** Options for `buildSaveCard()` beyond the roll and its modifier breakdown. */
interface BuildSaveCardOptions {
  /** Speaking actor's display name. */
  actorName: string;
  actorImage: string;
  /** Already-localized save name, e.g. "Fortitude". */
  saveLabel: string;
  /** Optional DC — when provided, the card shows a pass/fail indicator. */
  dc?: number;
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/**
 * Build the HTML content for a saving throw chat card: header, die face + total, natural
 * 1/20 callouts, and a collapsible dice/modifier breakdown. Our own `.roll-result` header
 * (not Foundry's default `.dice-roll` formula/total rows, which would duplicate the total
 * already shown above) is the `data-action="expandRoll"` click target, so only the raw die
 * faces are pulled in via `Roll#getTooltip()`. The modifier breakdown is appended after the
 * die faces (see `appendModifierBreakdown()`) so both expand/collapse together. An optional
 * pass/fail indicator is shown when `opts.dc` is set.
 */
async function buildSaveCard(roll: D20Roll, modifierList: RollModifier[], opts: BuildSaveCardOptions): Promise<string> {
  const dieResult = roll.naturalResult ?? 0;
  const total = roll.total ?? 0;
  const passed = opts.dc === undefined ? null : total >= opts.dc;
  const modifierBreakdownHtml = modifierBreakdownTemplate({
    modifiers: modifierList.map(modifier => ({ label: modifier.label, signed: formatSigned(modifier.value) })),
  });
  const diceRollHtml = appendModifierBreakdown(await roll.getTooltip(), modifierBreakdownHtml);

  return saveRollCardTemplate({
    actorImage: opts.actorImage,
    actorName: opts.actorName,
    resultLabel: game.i18n.localize('dnd35e.ROLL.Result'),
    saveLabel: opts.saveLabel,
    rollFormula: roll.formula,
    dieResult,
    total,
    isFumble: roll.isFumble,
    isCriticalThreat: roll.isCriticalThreat(),
    diceRollHtml,
    showResult: opts.dc !== undefined,
    passed,
  });
}

/**
 * Build the HTML content for an initiative roll chat card. Initiative has no DC/pass-fail
 * concept, so this is a thin wrapper around `buildSaveCard()`'s pipeline (same header/die
 * face/modifier-breakdown template) with `saveLabel` set to "Initiative" and no `dc`.
 */
async function buildInitiativeCard(roll: D20Roll, modifierList: RollModifier[], opts: { actorName: string; actorImage: string }): Promise<string> {
  return buildSaveCard(roll, modifierList, {
    actorName: opts.actorName,
    actorImage: opts.actorImage,
    saveLabel: game.i18n.localize('dnd35e.ROLL.Initiative'),
  });
}

/** Data a caller computes about the move — everything `buildMoveActionCard()` needs beyond the combatant/actor/action themselves. */
interface MoveActionCardData {
  spent: ActionEconomyType[];
  /** Already converted to the scene's localized distance units (ft/m) — see `movement.passed.cost`. */
  cost: number;
  /** Already converted to the scene's localized distance units — see `TokenRulerDnd35e#getLocalizedBudget()`. */
  budget: number;
  overBudget: boolean;
  /**
   * Which over-budget message to show — distinct from the generic "moved further than
   * allowed" message for a 5-foot step (fixed 1-square allowance), mixing a 5-foot step
   * with other movement in the same turn, exceeding a session already escalated to a
   * full-round Double Move, or running out of actions to cover a move that would
   * otherwise be affordable. Defaults to `'distance'` (the original generic message)
   * when omitted.
   */
  overBudgetReason?: 'distance' | 'fiveFootStep' | 'mixedMovement' | 'doubleMove' | 'insufficientActions';
}

/** Persisted in `message.flags.dnd35e.moveActionCard` — everything needed to re-render the card after Undo, without re-deriving anything from the (possibly since-changed) combatant/actor. */
interface MoveActionCardFlags extends MoveActionCardData {
  combatantId: string;
  movementActionLabel: string;
  priorPosition: { x: number; y: number; elevation: number } | null;
  undone: boolean;
  /**
   * Whether this card belongs to the per-turn cumulative movement session (walk/run/crawl/
   * 5-foot-step — see `movementSession.mts`) rather than a one-shot full-round move (charge/
   * withdraw/double move). Undo needs this to know whether to also reset the combatant's
   * movement session (allowing fresh movement this turn) alongside refunding the action(s).
   */
  isSessionCard: boolean;
}

const OVER_BUDGET_MESSAGE_KEYS: Record<NonNullable<MoveActionCardData['overBudgetReason']>, string> = {
  distance: 'dnd35e.ROLL.MOVE_ACTION_CARD.OverBudget',
  fiveFootStep: 'dnd35e.ROLL.MOVE_ACTION_CARD.OverBudgetFiveFootStep',
  mixedMovement: 'dnd35e.ROLL.MOVE_ACTION_CARD.OverBudgetMixedMovement',
  doubleMove: 'dnd35e.ROLL.MOVE_ACTION_CARD.OverBudgetDoubleMove',
  insufficientActions: 'dnd35e.ROLL.MOVE_ACTION_CARD.OverBudgetInsufficientActions',
};

/** Shared by the initial post and the Undo click handler's re-render — see chatCardActions.mts. */
function buildMoveActionCardContent(combatantName: string, flags: MoveActionCardFlags): string {
  const { measurement: { distanceDisplayShortLabel } } = useSettingsStore();
  return moveActionCardTemplate({
    combatantName,
    movementActionLabel: flags.movementActionLabel,
    cost: flags.cost,
    budget: flags.budget,
    distanceUnit: distanceDisplayShortLabel.value,
    overBudget: flags.overBudget,
    overBudgetMessage: flags.overBudget
      ? game.i18n.localize(OVER_BUDGET_MESSAGE_KEYS[flags.overBudgetReason ?? 'distance'])
      : '',
    showUndo: flags.spent.length > 0,
    undone: flags.undone,
    spentLabels: flags.spent.map((action) =>
      game.i18n.localize(action === 'move' ? 'dnd35e.ROLL.MOVE_ACTION_CARD.MoveAction' : 'dnd35e.ROLL.MOVE_ACTION_CARD.StandardAction')
    ),
  });
}

/**
 * Posts the Move Action Spent card (see phase-10-basic-combat.md §10.6) whenever
 * `TokenDocumentDnd35e#_onUpdateMovement` spends a move/standard action from movement, or
 * flags an over-budget move that spent nothing. `priorPosition` is only stored when
 * something was actually spent — the `overBudget` branch never committed a move, so
 * there's nothing to undo. Returns the created message's id, so callers tracking a
 * one-shot full-round move (Charge/Withdraw/Double Move) can later locate and mark it
 * undone if Foundry's native movement Undo reverts that drag.
 */
async function buildMoveActionCard(
  combatant: CombatantDnd35e,
  actor: ActorDnd35e,
  movementAction: string,
  data: MoveActionCardData,
  priorPosition: { x: number; y: number; elevation: number } | null
): Promise<string | null> {
  const movementActionLabel = game.i18n.localize(CONFIG.Token.movement.actions[movementAction]?.label ?? movementAction);
  const flags: MoveActionCardFlags = {
    ...data,
    combatantId: combatant.id,
    movementActionLabel,
    priorPosition: data.spent.length > 0 ? priorPosition : null,
    undone: false,
    isSessionCard: false,
  };

  // Cast needed: same ambient schema-required-fields mismatch documented at
  // `Creature#rollSave()`'s `roll.toMessage()` call — `ChatMessage.create()`'s data param
  // resolves to a fully-required `SourceFromSchema<ChatMessageSchema>` shape at compile time,
  // even though Foundry fills in every other field (`_id`, `type`, `system`, etc.) at runtime.
  // Direct cast isn't enough here (unlike `roll.toMessage()`'s `DeepPartial<...>` param) since
  // `ChatMessage.create()`'s param type doesn't sufficiently overlap our partial literal.
  const message = await ChatMessage.create({
    content: buildMoveActionCardContent(combatant.name, flags),
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: { dnd35e: { moveActionCard: flags } },
  } as unknown as ChatMessageSource);
  return message?.id ?? null;
}

/**
 * Session-aware variant of `buildMoveActionCard()` used by the per-turn cumulative movement
 * session (5-foot step / walk / run / crawl — see `movementSession.mts`): updates the same
 * chat message in place across multiple partial drags in the same turn instead of always
 * posting a new one, so a player moving in several increments only ever sees a single,
 * running "Move Action Spent" card for that turn. Returns the (possibly newly-created)
 * message's id, to be stored back on the movement session.
 */
async function upsertMoveActionCard(
  combatant: CombatantDnd35e,
  actor: ActorDnd35e,
  movementAction: string,
  data: MoveActionCardData,
  firstOrigin: { x: number; y: number; elevation: number } | null,
  existingMessageId: string | null
): Promise<string | null> {
  const movementActionLabel = game.i18n.localize(CONFIG.Token.movement.actions[movementAction]?.label ?? movementAction);
  const flags: MoveActionCardFlags = {
    ...data,
    combatantId: combatant.id,
    movementActionLabel,
    priorPosition: data.spent.length > 0 ? firstOrigin : null,
    undone: false,
    isSessionCard: true,
  };

  const existingMessage = existingMessageId ? game.messages?.get(existingMessageId) : undefined;
  if (existingMessage) {
    await existingMessage.update({
      content: buildMoveActionCardContent(combatant.name, flags),
      'flags.dnd35e.moveActionCard': flags,
    });
    return existingMessage.id;
  }

  // See `buildMoveActionCard()`'s comment above for why this cast is needed.
  const created = (await ChatMessage.create({
    content: buildMoveActionCardContent(combatant.name, flags),
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: { dnd35e: { moveActionCard: flags } },
  } as unknown as ChatMessageSource)) as ChatMessage | undefined;
  return created?.id ?? null;
}

/** Persisted in `message.flags.dnd35e.proneToggleCard` — everything needed to re-render the card, or revert the Prone condition, after Undo (button click or Foundry's native Ctrl+Z). */
interface ProneToggleCardFlags {
  combatantId: string;
  /** `true` for Drop Prone, `false` for Stand Up — determines the card's label. */
  droppedProne: boolean;
  /** Whether the actor had the Prone condition *before* this toggle — restored on Undo, independent of whatever the session/live actor state looks like by the time Undo happens. */
  priorActive: boolean;
  /** The confirming drag's `movement.id` — lets the card's Undo button call `TokenDocument#revertRecordedMovement()` directly, Foundry's own recorded-movement undo, instead of a manual revert. */
  movementId: string;
  undone: boolean;
}

/** Shared by the initial post and both Undo paths' re-render — see chatCardActions.mts and TokenDocumentDnd35e#reconcileProneToggle. */
function buildProneToggleCardContent(combatantName: string, flags: ProneToggleCardFlags): string {
  return proneToggleCardTemplate({
    combatantName,
    label: game.i18n.localize(
      flags.droppedProne ? 'dnd35e.ROLL.PRONE_TOGGLE_CARD.DroppedProne' : 'dnd35e.ROLL.PRONE_TOGGLE_CARD.StoodUp'
    ),
    undone: flags.undone,
  });
}

/**
 * Posts the compact Drop Prone/Stand Up card (distinct from `buildMoveActionCard()`'s
 * distance/budget card — the confirming drag that triggers this toggle isn't real movement,
 * so a "cost / budget" line would be meaningless here). Returns the created message's id so
 * `TokenDocumentDnd35e` can track it on the movement session for both Undo paths.
 */
async function buildProneToggleCard(
  combatant: CombatantDnd35e,
  actor: ActorDnd35e,
  droppedProne: boolean,
  priorActive: boolean,
  movementId: string
): Promise<string | null> {
  const flags: ProneToggleCardFlags = {
    combatantId: combatant.id,
    droppedProne,
    priorActive,
    movementId,
    undone: false,
  };

  // See `buildMoveActionCard()`'s comment above for why this cast is needed.
  const message = await ChatMessage.create({
    content: buildProneToggleCardContent(combatant.name, flags),
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: { dnd35e: { proneToggleCard: flags } },
  } as unknown as ChatMessageSource);
  return message?.id ?? null;
}

/**
 * Posts a standalone warning card when an item's automatic action-economy spend
 * (equip/unequip/stow/retrieve) fails for lack of the required action — nothing was
 * actually consumed, so unlike `buildMoveActionCard()` there's no `spent`/Undo bookkeeping.
 */
async function buildActionEconomyWarningCard(combatant: CombatantDnd35e, actor: ActorDnd35e, warningMessage: string): Promise<void> {
  // See `buildMoveActionCard()`'s comment above for why this cast is needed.
  await ChatMessage.create({
    content: actionWarningCardTemplate({ combatantName: combatant.name, warningMessage }),
    speaker: ChatMessage.getSpeaker({ actor }),
  } as unknown as ChatMessageSource);
}

/** Localized labels for the action-economy tiers an item's automatic spend can consume — `standard`/`minor`/`fullRound`/`aoo` aren't currently reachable by equip/stow, but are included so a future caller doesn't silently render the raw tier key. */
const ITEM_ACTION_TIER_LABEL_KEYS: Partial<Record<ActionEconomyType, string>> = {
  free: 'dnd35e.ROLL.ITEM_ACTION_SPENT_CARD.FreeAction',
  move: 'dnd35e.ROLL.ITEM_ACTION_SPENT_CARD.MoveAction',
  standard: 'dnd35e.ROLL.MOVE_ACTION_CARD.StandardAction',
};

/** Persisted in `message.flags.dnd35e.itemActionSpentCard` — everything needed to re-render the card, or revert the item's equip/stow state, after Undo. */
interface ItemActionSpentCardFlags {
  combatantId: string;
  /** Already-localized "Equipped {item}"/"Stowed {item}" etc. label — see ITEM_ACTION_SPENT_CARD keys. */
  actionLabel: string;
  spent: ActionEconomyType[];
  itemUuid: string;
  /** Which field to restore, and to what value, on Undo — distinct shapes since equip and stow touch different `system` fields. */
  revert: { kind: 'equip'; priorSlotIds: string[] } | { kind: 'stow'; priorContainerUuid: string | null };
  undone: boolean;
}

/** Shared by the initial post and the Undo click handler's re-render — see chatCardActions.mts. */
function buildItemActionSpentCardContent(combatantName: string, flags: ItemActionSpentCardFlags): string {
  return actionSpentCardTemplate({
    combatantName,
    actionLabel: flags.actionLabel,
    spentLabels: flags.spent.map((tier) => game.i18n.localize(ITEM_ACTION_TIER_LABEL_KEYS[tier] ?? tier)),
    undone: flags.undone,
  });
}

/**
 * Posts the Action Spent card for a successful equip/unequip/stow/retrieve action-economy
 * spend (see `equippableItem/events/equipped.mts` and `physicalItem/events/stowed.mts`) —
 * the announcement half of the same mechanic `buildActionEconomyWarningCard()` covers for
 * the failure case. Includes an Undo button that refunds the spent action(s) and reverts
 * the item's equip/stow state (see `revert` in `ItemActionSpentCardFlags`).
 */
async function buildItemActionSpentCard(
  combatant: CombatantDnd35e,
  actor: ActorDnd35e,
  actionLabel: string,
  spent: ActionEconomyType[],
  revertData: Pick<ItemActionSpentCardFlags, 'itemUuid' | 'revert'>
): Promise<string | null> {
  const flags: ItemActionSpentCardFlags = {
    ...revertData,
    combatantId: combatant.id,
    actionLabel,
    spent,
    undone: false,
  };

  // See `buildMoveActionCard()`'s comment above for why this cast is needed.
  const message = await ChatMessage.create({
    content: buildItemActionSpentCardContent(combatant.name, flags),
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: { dnd35e: { itemActionSpentCard: flags } },
  } as unknown as ChatMessageSource);
  return message?.id ?? null;
}

/**
 * Append the modifier breakdown as the last child of `.dice-tooltip > .wrapper` (see
 * `Roll#getTooltip()`/`templates/dice/tooltip.hbs`), after the individual die-face rows.
 * Falls back to leaving `diceTooltipHtml` untouched if there's no wrapper to append to (e.g.
 * a private roll, where `getTooltip()` returns an empty string).
 */
function appendModifierBreakdown(diceTooltipHtml: string, modifierBreakdownHtml: string): string {
  const wrapperCloseAtEnd = /<\/div>\s*<\/div>\s*$/;
  if (!wrapperCloseAtEnd.test(diceTooltipHtml)) return diceTooltipHtml;
  return diceTooltipHtml.replace(wrapperCloseAtEnd, match => modifierBreakdownHtml + match);
}

export {
  buildActionEconomyWarningCard,
  buildInitiativeCard,
  buildItemActionSpentCard,
  buildItemActionSpentCardContent,
  buildMoveActionCard,
  buildMoveActionCardContent,
  buildProneToggleCard,
  buildProneToggleCardContent,
  buildSaveCard,
  upsertMoveActionCard,
};
export type {
  ItemActionSpentCardFlags,
  MoveActionCardData,
  MoveActionCardFlags,
  ProneToggleCardFlags,
};
