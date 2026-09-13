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
import {
  createCombatForTokens,
  deleteCombat,
  disableTurnMarkerAnimation,
  getCombatantActionEconomy,
  getCombatantMovementSessionCategory,
  startCombat,
} from './helpers/combat.mjs';
import { clearWorld, createActor } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { openTokenHud, selectMovementAction } from './helpers/tokenHud.mjs';

/**
 * End-to-end coverage for poc.10 Story B's movement/action-economy integration
 * (`TokenDocumentDnd35e#_onUpdateMovement` → `combatantActionEconomy.mts`/
 * `movementSession.mts` → `rollMessages.mts`'s Move Action Spent card → its Undo button —
 * see phase-10-basic-combat.md §10.6). Previously covered only by unit tests against the
 * pure-logic modules in isolation; this spec drives the real HUD/canvas/chat integration.
 */
test.describe('Move action economy', () => {
  const tokenIds: string[] = [];
  let combatId: string | null = null;

  test.afterEach(async ({ page }) => {
    await releaseAllTokens(page).catch(() => {});
    if (combatId) await deleteCombat(page, combatId).catch(() => {});
    combatId = null;
    await deleteTokens(page, tokenIds).catch(() => {});
    tokenIds.length = 0;
    await clearWorld(page);
  });

  test('walking within budget spends only the move action; exceeding it escalates to move+standard; Undo reverts the whole session', async ({ page }) => {
    test.setTimeout(120_000);

    await gotoGame(page);
    await activateScene(page, 'Test Scene');
    // Core's animated Turn Marker overlay blocks canvas interactions against the active
    // combatant's own token for the whole duration of its turn — disabling it may reload
    // the page, so re-establish game/scene state afterward.
    await disableTurnMarkerAnimation(page);
    await gotoGame(page);
    const sceneId = await activateScene(page, 'Test Scene');
    const { distance } = await getGridInfo(page);

    // Budget = 2 squares' worth of feet — a 1-square drag stays within it, a 4-square total
    // exceeds it but stays within double (escalating the session to a Double Move).
    const actorUuid = await createActor(page, 'character', {
      name: 'Move Economy Fighter',
      system: { speed: { land: distance * 2 } },
    });
    const tokenId = await placeToken(page, actorUuid, { x: 300, y: 300 });
    tokenIds.push(tokenId);
    await controlToken(page, tokenId);
    await panToPoint(page, { x: 300, y: 300 });
    await page.evaluate(() => (globalThis as any).game.togglePause(false, true));

    const { combatId: cId, combatantIds } = await createCombatForTokens(page, sceneId, [tokenId]);
    combatId = cId;
    await startCombat(page);
    const combatantId = combatantIds[0];

    // Core Foundry auto-pans the camera to the active combatant when a turn starts, which
    // can race with the next right-click if the pan animation is still in flight — settle
    // it by re-centering on the token's own (already-correct) position. Starting combat
    // (Flat-Footed AE create/delete triggers a full token redraw) can also drop control —
    // re-control before interacting with the canvas again.
    await panToPoint(page, await getTokenPosition(page, tokenId));
    await controlToken(page, tokenId);

    const { size: gridSize } = await getGridInfo(page);
    const originalPosition = await getTokenPosition(page, tokenId);

    // --- First drag: 1 square, within budget — spends the move action only. The token's
    // `movementAction` field defaults to unset until explicitly chosen via the HUD, so this
    // first drag needs the HUD selection too (subsequent drags keep the field as 'walk').
    await openTokenHud(page, tokenId);
    await selectMovementAction(page, tokenId, 'walk');
    await page.evaluate(() => (globalThis as any).canvas?.tokens?.hud?.close());
    await controlToken(page, tokenId);
    await dragTokenByOffset(page, tokenId, { dx: gridSize, dy: 0 });
    const debugInfo = await page.evaluate((id) => {
      const canvas = (globalThis as any).canvas;
      const placeable = canvas.tokens.get(id);
      return {
        movementAction: placeable.document.movementAction,
        controlled: placeable.controlled,
        position: { x: placeable.document.x, y: placeable.document.y },
        historyLength: canvas.tokens.history.length,
      };
    }, tokenId);
    console.log('DEBUG post-drag:', JSON.stringify(debugInfo, null, 2));
    await expect.poll(async () => (await getCombatantActionEconomy(page, combatId!, combatantId)).actions).toEqual(
      expect.objectContaining({ move: false, standard: true })
    );
    console.log('DEBUG card count after drag 1:', await page.locator('.message .move-action-card').count());

    const card = page.locator('.message .move-action-card').last();
    await expect(card).toBeVisible();
    await expect(card.locator('.spent-action')).toHaveCount(1);
    const undoButton = card.locator('[data-action="undo-move-action"]');
    await expect(undoButton).toBeVisible();

    // --- Second drag: another square (cumulative = budget exactly) — no new tier spent,
    // the same card is updated in place rather than a new one posted.
    await dragTokenByOffset(page, tokenId, { dx: gridSize, dy: 0 });
    console.log('DEBUG card count after drag 2:', await page.locator('.message .move-action-card').count());
    await expect(page.locator('.message .move-action-card')).toHaveCount(1);
    await expect(card.locator('.spent-action')).toHaveCount(1);

    // --- Third drag: two more squares (cumulative = 2x budget) — escalates to spending the
    // standard action too (a Double Move), still updating the same session card.
    await dragTokenByOffset(page, tokenId, { dx: 2 * gridSize, dy: 0 });
    await expect.poll(async () => (await getCombatantActionEconomy(page, combatId!, combatantId)).actions).toEqual(
      expect.objectContaining({ move: false, standard: false })
    );
    await expect(page.locator('.message .move-action-card')).toHaveCount(1);
    await expect(card.locator('.spent-action')).toHaveCount(2);
    await expect(card).not.toHaveClass(/is-undone/);

    // --- Undo: refunds both actions, snaps the token back to its very first origin (not
    // just the last drag's start), resets the movement session, and marks the card undone.
    await undoButton.click();
    await expect.poll(async () => (await getCombatantActionEconomy(page, combatId!, combatantId)).actions).toEqual(
      expect.objectContaining({ move: true, standard: true })
    );
    await expect.poll(async () => getCombatantMovementSessionCategory(page, combatId!, combatantId)).toBeNull();
    await expect(card).toHaveClass(/is-undone/);
    await expect(card.locator('[data-action="undo-move-action"]')).toHaveCount(0);
    await expect(card.locator('.undone-label')).toBeVisible();

    await expect.poll(async () => (await getTokenPosition(page, tokenId)).x, { timeout: 5000 }).toBeCloseTo(originalPosition.x, 0);
    await expect.poll(async () => (await getTokenPosition(page, tokenId)).y, { timeout: 5000 }).toBeCloseTo(originalPosition.y, 0);
  });

  test('fiveFootStep/withdraw/charge/doubleMove only appear in the movement-action palette during an active/started combat', async ({ page }) => {
    test.setTimeout(60_000);

    await gotoGame(page);
    await activateScene(page, 'Test Scene');
    await disableTurnMarkerAnimation(page);
    await gotoGame(page);
    const sceneId = await activateScene(page, 'Test Scene');

    const actorUuid = await createActor(page, 'character', { name: 'Combat-Only Actions Fighter', system: { speed: { land: 30 } } });
    const tokenId = await placeToken(page, actorUuid, { x: 300, y: 300 });
    tokenIds.push(tokenId);
    await controlToken(page, tokenId);
    await panToPoint(page, { x: 300, y: 300 });
    await page.evaluate(() => (globalThis as any).game.togglePause(false, true));

    const combatOnlyActions = ['fiveFootStep', 'withdraw', 'charge', 'doubleMove'];
    await openTokenHud(page, tokenId);
    const hud = page.locator('#token-hud');
    await hud.locator('button[data-action="togglePalette"][data-palette="movementActions"]').click();
    const paletteList = hud.locator('.palette-list[data-palette="movementActions"]');
    await paletteList.waitFor({ state: 'visible' });
    for (const action of combatOnlyActions) {
      await expect(paletteList.locator(`a[data-movement-action="${action}"]`)).toHaveCount(0);
    }

    const { combatId: cId, combatantIds } = await createCombatForTokens(page, sceneId, [tokenId]);
    combatId = cId;
    await startCombat(page);
    void combatantIds;

    // Core Foundry auto-pans the camera to the active combatant when a turn starts, which
    // can race with the next right-click if the pan animation is still in flight — settle
    // it by re-centering on the token's own (already-correct) position. Starting combat
    // (Flat-Footed AE create/delete triggers a full token redraw) can also drop control —
    // re-control before interacting with the canvas again.
    await panToPoint(page, await getTokenPosition(page, tokenId));
    await controlToken(page, tokenId);

    await openTokenHud(page, tokenId);
    await hud.locator('button[data-action="togglePalette"][data-palette="movementActions"]').click();
    await paletteList.waitFor({ state: 'visible' });
    for (const action of combatOnlyActions) {
      await expect(paletteList.locator(`a[data-movement-action="${action}"]`)).toHaveCount(1);
    }
  });
});
