import { expect, test } from '@playwright/test';

import {
  activateScene,
  controlToken,
  deleteTokens,
  dragTokenByOffset,
  getGridInfo,
  getTokenPosition,
  panToPoint,
  placeToken,
  releaseAllTokens,
} from './helpers/canvas.mjs';
import { clearWorld, createActor } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { clickMovementAction, openTokenHud, selectMovementAction } from './helpers/tokenHud.mjs';

/**
 * End-to-end coverage for the `dropProne`/`crawl`/`standUp` custom `CONFIG.Token.
 * movement.actions` entries (see `movementActionGating.mts`), driven entirely through
 * the real Token HUD — no `page.evaluate` shortcuts for the interactions under test.
 *
 * `dropProne`/`standUp` are instant clicks (`TokenHudDnd35e#onMovementAction` intercepts
 * and calls `applyProneToggle()` directly, see `proneToggle.mts`) — no confirming drag,
 * no snap-back. `crawl` is ordinary movement and still requires a real canvas drag.
 */
test.describe('Prone movement actions (Drop Prone / Crawl / Stand Up)', () => {
  const tokenIds: string[] = [];

  test.afterEach(async ({ page }) => {
    await releaseAllTokens(page).catch(() => {});
    await deleteTokens(page, tokenIds).catch(() => {});
    tokenIds.length = 0;
    await clearWorld(page);
  });

  test('GM uses the movement-action HUD to drop prone, crawl 5ft via a canvas drag, and click to stand back up', async ({ page }) => {
    test.setTimeout(60_000);

    await gotoGame(page);
    await activateScene(page, 'Test Scene');

    const actorUuid = await createActor(page, 'character', {
      name: 'Prone Test Fighter',
      system: { speed: { land: 6 } },
    });
    const tokenId = await placeToken(page, actorUuid, { x: 300, y: 300 });
    tokenIds.push(tokenId);
    await controlToken(page, tokenId);
    await panToPoint(page, { x: 300, y: 300 });
    await page.evaluate(() => (globalThis as any).game.togglePause(false, true));

    const { size: gridSize } = await getGridInfo(page);
    const isProne = () => page.evaluate(async (uuid) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      return actor.statuses.has('prone') as boolean;
    }, actorUuid);
    // Regression guard: toggling Prone must never create a duplicate Prone ActiveEffect.
    // Counts embedded effects whose `statuses` set includes 'prone', not just whether the
    // actor is prone at all.
    const countProneEffects = () => page.evaluate(async (uuid) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      return actor.effects.filter((effect: any) => effect.statuses?.has('prone')).length as number;
    }, actorUuid);

    // The HUD closes after every completed document update (Foundry redraws the token
    // placeable, which detaches the HUD's bound object) — a real user re-opens the HUD
    // (right-click) before picking the next action, so each step below does the same.
    await openTokenHud(page, tokenId);

    // --- Drop Prone: instant click, no drag ---
    await clickMovementAction(page, 'dropProne');

    await expect.poll(isProne).toBe(true);
    await expect.poll(countProneEffects).toBe(1);

    // --- Crawl 5ft: select via HUD, drag exactly one grid square (ordinary movement,
    // unaffected by the Prone-toggle refactor) ---
    await openTokenHud(page, tokenId);
    await selectMovementAction(page, tokenId, 'crawl');
    const before = await getTokenPosition(page, tokenId);
    await dragTokenByOffset(page, tokenId, { dx: gridSize, dy: 0 });
    // The document update lands asynchronously after the drag's mouseup, so poll for it
    // rather than reading position immediately.
    await expect.poll(async () => (await getTokenPosition(page, tokenId)).x, { timeout: 5000 })
      .toBeCloseTo(before.x + gridSize, 0);

    // --- Stand Up: instant click, no drag ---
    await openTokenHud(page, tokenId);
    await clickMovementAction(page, 'standUp');

    await expect.poll(isProne).toBe(false);
    await expect.poll(countProneEffects).toBe(0);
  });
});
