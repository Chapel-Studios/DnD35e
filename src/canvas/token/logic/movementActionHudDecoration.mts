/**
 * movementActionHudDecoration — decorates the already-rendered movement-action HUD picker
 * via a `renderTokenHUD` hook, since Foundry's `TokenHUD#_getMovementActionChoices()` has no
 * "disabled but visible"/badge concept of its own — `canSelect` only controls DOM presence.
 * Two independent decorations share this hook:
 * - Greys out (doesn't hide) entries the combatant currently can't afford, distinct from
 *   `canSelect` hiding entries that don't structurally apply at all (see the comment on
 *   `canSelectFiveFootStepMovementAction()` in movementActionGating.mts).
 * - Adds a caution badge to `provokes: true` entries while combat is active (§10.10).
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type TokenHUD from '@client/applications/hud/token-hud.mjs';

import type { Dnd35eMovementActionConfig } from './movementActionGating.mjs';
import { isMovementActionAffordable } from './movementActionGating.mjs';

const UNAFFORDABLE_CLASS = 'dnd35e-movement-action-unaffordable';
const PROVOKES_BADGE_CLASS = 'dnd35e-movement-action-provokes-badge';

/** Greys out (adds `UNAFFORDABLE_CLASS` + a tooltip to) each rendered movement-action entry the bound actor can't currently afford. */
function decorateMovementActionChoices(hud: TokenHUD, element: HTMLElement): void {
  const actor = hud.actor as ActorDnd35e | undefined;
  const entries = element.querySelectorAll<HTMLAnchorElement>(
    '.palette-list[data-palette="movementActions"] a[data-action="movementAction"]'
  );
  for (const entry of entries) {
    const action = entry.dataset.movementAction;
    if (!action) continue;
    const affordable = isMovementActionAffordable(actor, action);
    entry.classList.toggle(UNAFFORDABLE_CLASS, !affordable);
    entry.toggleAttribute('aria-disabled', !affordable);
    if (affordable) delete entry.dataset.tooltipText;
    else entry.dataset.tooltipText = game.i18n.localize('dnd35e.TOKEN.MOVEMENT.ActionUnaffordable');
  }
}

/** Blocks clicks on greyed-out entries — registered once on `document` rather than per-render, since the HUD's root element persists across re-renders. */
function onMovementActionClickCapture(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest(`.${UNAFFORDABLE_CLASS}`)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

/** Adds a caution badge to each rendered movement-action entry whose config sets `provokes: true`, only while combat is active — outside combat, nothing provokes. */
function decorateMovementActionProvokes(element: HTMLElement): void {
  const inCombat = game.combat?.started ?? false;
  const entries = element.querySelectorAll<HTMLAnchorElement>(
    '.palette-list[data-palette="movementActions"] a[data-action="movementAction"]'
  );
  for (const entry of entries) {
    entry.querySelector(`.${PROVOKES_BADGE_CLASS}`)?.remove();
    const action = entry.dataset.movementAction;
    if (!action) continue;
    const config = CONFIG.Token.movement.actions[action] as Dnd35eMovementActionConfig | undefined;
    if (!inCombat || !config?.provokes) continue;

    const badge = document.createElement('i');
    badge.className = `fa-solid fa-triangle-exclamation ${PROVOKES_BADGE_CLASS}`;
    badge.dataset.tooltip = '';
    badge.dataset.tooltipText = game.i18n.localize('dnd35e.TOKEN.MOVEMENT.Provokes');
    entry.append(badge);
  }
}

function registerMovementActionHudDecoration(): void {
  Hooks.on('renderTokenHUD', (hud: TokenHUD, element: HTMLElement) => {
    decorateMovementActionChoices(hud, element);
    decorateMovementActionProvokes(element);
  });
  document.addEventListener('click', onMovementActionClickCapture, true);
}

export { registerMovementActionHudDecoration };
