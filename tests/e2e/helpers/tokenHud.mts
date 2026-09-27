import type { Page } from '@playwright/test';

import { canvasPointToClient, getTokenPosition } from './canvas.mjs';

/**
 * Right-click the given token to bind/open its Token HUD (`templates/hud/token-hud.hbs`,
 * `#token-hud`), waiting for it to render. Explicitly closes any already-open HUD first —
 * `PlaceableObject#_onClickRight` toggles bind/close on repeated right-clicks of the same
 * token, so calling this twice in a row without closing first would close the HUD instead
 * of re-opening it.
 *
 * Falls back to binding the HUD directly (`canvas.tokens.hud.bind()` — the same call
 * `PlaceableObject#_onClickRight2` ultimately makes) if the simulated right-click doesn't
 * land after a couple of tries. Core's animated "Turn Marker" overlay (a continuously
 * re-rendering ring drawn on the *active combatant's own token* every frame once combat
 * has started) can permanently occupy that token's PIXI hit area, so a synthesized click
 * against the active combatant's own token never reaches `Token#_onClickRight2` at all.
 * The fallback only replaces this HUD-opening setup step, not any of the actual
 * interactions under test (drags, palette clicks, Undo button).
 */
export async function openTokenHud (page: Page, tokenId: string): Promise<void> {
  await page.evaluate(() => {
    (globalThis as any).canvas?.tokens?.hud?.close();
  });
  const hud = page.locator('#token-hud');
  for (let attempt = 0; attempt < 2; attempt++) {
    const center = await getTokenPosition(page, tokenId);
    const client = await canvasPointToClient(page, center);
    await page.mouse.click(client.x, client.y, { button: 'right' });
    try {
      await hud.waitFor({ state: 'visible', timeout: 3000 });
      return;
    } catch {
      // retry, then fall back below
    }
  }
  await page.evaluate((id) => {
    const placeable = (globalThis as any).canvas.tokens.get(id);
    return (globalThis as any).canvas.tokens.hud.bind(placeable);
  }, tokenId);
  await hud.waitFor({ state: 'visible' });
}

/**
 * Select a movement action from the Token HUD's movement-action palette — the same DOM
 * path a real user drives: expand the palette (if not already expanded from a prior
 * selection — Foundry doesn't auto-close it after picking an entry) and click the action
 * entry. Polls the token document's `movementAction` field (which
 * `TokenHUD#onSelectMovementAction` sets via `document.update()`) to ensure the selection
 * round-trips before the caller proceeds to drag.
 *
 * The HUD closes after every completed movement update (Foundry redraws the token
 * placeable, detaching the HUD's bound object) — callers must re-open the HUD
 * (`openTokenHud`) before each call to this function that follows a completed drag,
 * not just once at the start of a multi-step flow.
 */
export async function selectMovementAction (page: Page, tokenId: string, actionId: string): Promise<void> {
  const hud = page.locator('#token-hud');
  const paletteList = hud.locator('.palette-list[data-palette="movementActions"]');
  if (!(await paletteList.isVisible())) {
    await hud.locator('button[data-action="togglePalette"][data-palette="movementActions"]').click();
    await paletteList.waitFor({ state: 'visible' });
  }
  await hud.locator(`a[data-action="movementAction"][data-movement-action="${actionId}"]`).click();
  await page.waitForFunction(
    ({ id, action }) => (globalThis as any).canvas?.tokens?.get(id)?.document?.movementAction === action,
    { id: tokenId, action: actionId }
  );
}

/**
 * Click a movement-action palette entry WITHOUT polling for `document.movementAction` to
 * become that literal id — used for the `dropProne`/`standUp` entries, which
 * `TokenHudDnd35e#onMovementAction` intercepts and routes to a direct Prone toggle instead
 * of core's default "stage this as the pending mode" behavior (see `proneToggle.mts`); the
 * field ends up set to `crawl`/`walk` afterward, never to `dropProne`/`standUp` itself.
 * Ordinary movement modes should keep using `selectMovementAction` above.
 */
export async function clickMovementAction (page: Page, actionId: string): Promise<void> {
  const hud = page.locator('#token-hud');
  const paletteList = hud.locator('.palette-list[data-palette="movementActions"]');
  if (!(await paletteList.isVisible())) {
    await hud.locator('button[data-action="togglePalette"][data-palette="movementActions"]').click();
    await paletteList.waitFor({ state: 'visible' });
  }
  await hud.locator(`a[data-action="movementAction"][data-movement-action="${actionId}"]`).click();
}
