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
import { openTokenHud, selectMovementAction } from './helpers/tokenHud.mjs';

/**
 * End-to-end coverage for the `dropProne`/`crawl`/`standUp` custom `CONFIG.Token.
 * movement.actions` entries (see `movementActionGating.mts`), driven entirely through
 * the real Token HUD and real mouse drags on the canvas — no `page.evaluate` shortcuts
 * for the interactions under test. This is the regression guard for a bug where
 * `dropProne`/`standUp` (originally `measure: false`) silently blocked dragging
 * entirely: no ruler, no waypoint, no visible response.
 *
 * The full flow (Drop Prone → Crawl 5ft → Stand Up), including the snap-back-to-origin
 * and auto movement-action switch behavior in `TokenDocumentDnd35e#_onUpdateMovement`,
 * was manually verified in a live Foundry session before this test was re-enabled.
 */
test.describe('Prone movement actions (Drop Prone / Crawl / Stand Up)', () => {
  const tokenIds: string[] = [];

  test.afterEach(async ({ page }) => {
    await releaseAllTokens(page).catch(() => {});
    await deleteTokens(page, tokenIds).catch(() => {});
    tokenIds.length = 0;
    await clearWorld(page);
  });

  test('GM uses the movement-action HUD and canvas drags to drop prone, crawl 5ft, and stand back up', async ({ page }) => {
    // Three full HUD reopen → select → drag cycles against a real (non-headless-optimized)
    // Foundry instance comfortably exceeds the default 60s test timeout.
    test.setTimeout(120_000);

    await gotoGame(page);
    await activateScene(page, 'Test Scene');

    const actorUuid = await createActor(page, 'character', {
      name: 'Prone Test Fighter',
      system: { speed: { land: 30 } },
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
    // Regression guard: `_onUpdateMovement`'s snap-back follow-up update must not cause
    // `actor.toggleStatusEffect('prone', ...)` to run twice and create a duplicate Prone
    // ActiveEffect. Counts embedded effects whose `statuses` set includes 'prone', not
    // just whether the actor is prone at all.
    const countProneEffects = () => page.evaluate(async (uuid) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      return actor.effects.filter((effect: any) => effect.statuses?.has('prone')).length as number;
    }, actorUuid);

    // The HUD closes after every completed movement update (Foundry redraws the token
    // placeable on update, which detaches the HUD's bound object) — this is true even for
    // the plain `crawl`/`standUp` moves here, not just the dropProne/standUp snap-back's
    // extra follow-up update. A real user re-opens the HUD (right-click) before picking
    // the next action, so each step below does the same.
    await openTokenHud(page, tokenId);

    // --- Drop Prone: select via HUD, confirm with a one-grid-square drag. Foundry snaps drag
    // destinations to the grid by default, so a sub-half-cell nudge rounds back to the origin
    // cell (net zero displacement, no waypoint recorded) — a full square guarantees it snaps to
    // an adjacent cell so the drag actually registers as movement.
    await selectMovementAction(page, tokenId, 'dropProne');
    await dragTokenByOffset(page, tokenId, { dx: gridSize, dy: 0 });

    await expect.poll(isProne).toBe(true);
    await expect.poll(countProneEffects).toBe(1);

    // --- Crawl 5ft: select via HUD, drag exactly one grid square ---
    await openTokenHud(page, tokenId);
    await selectMovementAction(page, tokenId, 'crawl');
    const before = await getTokenPosition(page, tokenId);
    await dragTokenByOffset(page, tokenId, { dx: gridSize, dy: 0 });
    // The document update lands asynchronously after the drag's mouseup, so poll for it
    // rather than reading position immediately.
    await expect.poll(async () => (await getTokenPosition(page, tokenId)).x, { timeout: 5000 })
      .toBeCloseTo(before.x + gridSize, 0);

    // --- Stand Up: select via HUD, confirm with a one-grid-square drag ---
    await openTokenHud(page, tokenId);
    await selectMovementAction(page, tokenId, 'standUp');
    await dragTokenByOffset(page, tokenId, { dx: gridSize, dy: 0 });

    await expect.poll(isProne).toBe(false);
    await expect.poll(countProneEffects).toBe(0);
  });
});
