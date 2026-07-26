import type { Page } from '@playwright/test';

import { canvasPointToClient, getTokenPosition } from './canvas.mjs';

/**
 * Right-click the given token to bind/open its Token HUD (`templates/hud/token-hud.hbs`,
 * `#token-hud`), waiting for it to render. Explicitly closes any already-open HUD first —
 * `PlaceableObject#_onClickRight` toggles bind/close on repeated right-clicks of the same
 * token, so calling this twice in a row without closing first would close the HUD instead
 * of re-opening it.
 */
export async function openTokenHud (page: Page, tokenId: string): Promise<void> {
  await page.evaluate(() => {
    (globalThis as any).canvas?.tokens?.hud?.close();
  });
  const center = await getTokenPosition(page, tokenId);
  const client = await canvasPointToClient(page, center);
  await page.mouse.click(client.x, client.y, { button: 'right' });
  await page.locator('#token-hud').waitFor({ state: 'visible' });
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
