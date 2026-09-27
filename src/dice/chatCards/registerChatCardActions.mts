/**
 * Delegated click handlers for interactive chat-card buttons (`data-action="..."`).
 * Foundry has no per-button-type hook — every card's button is wired via its own
 * `wireXCardButton()` helper (see each card's own folder), and this single
 * `renderChatMessageHTML` registration calls each of them in turn. Foundry's own
 * `expandRoll` toggle (used by save-roll-card.hbs) needs no registration here — it's
 * core's built-in behavior, not one of ours.
 *
 * @module
 */
import { wireItemActionSpentCardButton } from './actionSpentCard/actionSpentCard.mjs';
import { wireAttackRollCardButton } from './attackRollCard/attackRollCard.mjs';
import { wireMoveActionCardButton } from './moveActionCard/moveActionCard.mjs';
import { wireProneToggleCardButton } from './proneToggleCard/proneToggleCard.mjs';

function registerChatCardActions(): void {
  // dnd35e type-fix: `renderChatMessageHTML` has no typed overload in Hooks.on() (see
  // hooks.d.mts) — it falls through to the generic `HookParameters<string, unknown[]>`
  // signature, so the callback's params arrive untyped and are cast per the documented
  // real signature (see foundry-hooks-cheatsheet.md).
  Hooks.on('renderChatMessageHTML', (rawMessage: unknown, rawHtml: unknown) => {
    const message = rawMessage as ChatMessage;
    const html = rawHtml as HTMLElement;

    wireMoveActionCardButton(message, html);
    wireProneToggleCardButton(message, html);
    wireItemActionSpentCardButton(message, html);
    wireAttackRollCardButton(message, html);
  });
}

export { registerChatCardActions };
