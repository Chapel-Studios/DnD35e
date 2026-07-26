import type { BrowserContext } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { activateScene, deleteTokens, placeToken, releaseAllTokens } from './helpers/canvas.mjs';
import { clearWorld, createActor } from './helpers/documents.mjs';
import { gotoGame, loginAs } from './helpers/session.mjs';
import { getSystemSetting, setSystemSetting } from './helpers/setSystemSetting.mjs';

/**
 * End-to-end coverage for the shared-vision-scope wiring (`sharedVisionPool.mts` /
 * `sharedVisionScope.mts`) that the pure-logic unit tests (`sharedVisionScope.test.mts`)
 * can't reach: a real player session, with nothing controlled, actually gets a `partyMembers`
 * -scoped observed actor's token counted as a vision source (`TokenDnd35e#_isVisionSource`),
 * while a per-actor `sharedVisionScope: 'none'` override blocks pooling even though the actor
 * would otherwise qualify under the same world scope.
 */
const SHARED_VISION_SCOPE_KEY = 'sharedVisionScope';
const SHARED_VISION_MODE_KEY = 'sharedVisionMode';

test.describe('Shared vision scope', () => {
  let playerContext: BrowserContext;
  const tokenIds: string[] = [];
  let originalScope: unknown;
  let originalMode: unknown;

  test.beforeEach(async ({ browser, page }) => {
    playerContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    await gotoGame(page);
    originalScope = await getSystemSetting(page, SHARED_VISION_SCOPE_KEY);
    originalMode = await getSystemSetting(page, SHARED_VISION_MODE_KEY);
    await setSystemSetting(page, SHARED_VISION_SCOPE_KEY, 'partyMembers');
    await setSystemSetting(page, SHARED_VISION_MODE_KEY, 'passiveWhenUnselected');
  });

  test.afterEach(async ({ page }) => {
    await releaseAllTokens(page).catch(() => {});
    await deleteTokens(page, tokenIds).catch(() => {});
    tokenIds.length = 0;
    await setSystemSetting(page, SHARED_VISION_SCOPE_KEY, originalScope);
    await setSystemSetting(page, SHARED_VISION_MODE_KEY, originalMode);
    await clearWorld(page);
    await playerContext.close();
  });

  test('a passive player pools vision from a partyMembers-scoped observed actor, but not from a none-scoped one', async ({ page }) => {
    await activateScene(page, 'Test Scene');

    const playerId = await page.evaluate(() => {
      const player = (globalThis as any).game.users.find((u: any) => String(u?.name).toLowerCase() === 'player');
      if (!player?.id) throw new Error('Shared vision scope spec: no "player" user in the snapshot world');
      return player.id as string;
    });

    // World scope defaults to `partyMembers`; this actor's own flag stays `default` (inherits it).
    const partyActorUuid = await createActor(page, 'character', {
      name: 'Party Ally',
      system: { settings: { isPartyMember: true } },
      ownership: { default: 0, [playerId]: 2 }, // OBSERVER
    });
    // Also flagged as a party member, but its own override blocks pooling regardless of scope.
    const noneActorUuid = await createActor(page, 'character', {
      name: 'Solo NPC',
      system: { settings: { isPartyMember: true } },
      ownership: { default: 0, [playerId]: 2 }, // OBSERVER
      flags: { dnd35e: { sharedVisionScope: 'none' } },
    });

    const partyTokenId = await placeToken(page, partyActorUuid, { x: 200, y: 200 });
    const noneTokenId = await placeToken(page, noneActorUuid, { x: 400, y: 400 });
    tokenIds.push(partyTokenId, noneTokenId);

    const playerPage = await loginAs(playerContext, 'player');
    await activateScene(playerPage, 'Test Scene');
    await playerPage.evaluate(() => (globalThis as any).canvas.tokens.releaseAll());

    const isVisionSource = (id: string) => playerPage.evaluate((tokenId) => {
      const placeable = (globalThis as any).canvas.tokens.get(tokenId);
      return (placeable as any)._isVisionSource() as boolean;
    }, id);

    await expect.poll(() => isVisionSource(partyTokenId)).toBe(true);
    await expect.poll(() => isVisionSource(noneTokenId)).toBe(false);
  });
});
