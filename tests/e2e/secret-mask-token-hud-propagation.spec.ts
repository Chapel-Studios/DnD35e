import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { activateScene, deleteTokens, panToPoint, placeToken, releaseAllTokens } from './helpers/canvas.mjs';
import { clearWorld, createActiveEffect, createActor } from './helpers/documents.mjs';
import { gotoGame, loginAs } from './helpers/session.mjs';
import { openTokenHud } from './helpers/tokenHud.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

/**
 * poc.10 Story I (HUD extension): a GM-managed Secret AE on a Character masks `name`,
 * `system.hp.current`/`system.hp.max`, and `system.init` — this proves the masked values
 * actually land on the token (nameplate, canvas HP bar, Token HUD compact widget), the
 * Roll Initiative dialog (masked display, true mechanical roll underneath), and the
 * Initiative chat card (per-viewer name).
 *
 * Deliberately non-combat values (name/HP-at-rest/init modifier), not a live combat
 * workflow (attack/resolution/DR) — this proves the masking plumbing lands correctly in
 * each surface before Story J builds combat-specific secrecy on top of it.
 */

const TRUE_NAME = 'Real Secret Fighter';
const MASKED_NAME = 'Mysterious Figure';
/** `max` is derived (recomputed from level/HD/CON) and read dynamically post-creation
 * instead — see `MaskedFighter.trueHpMax`. */
const TRUE_HP_CURRENT = 50;
const MASKED_HP = { current: 30, max: 40 };
const MASKED_INIT = 2;

interface MaskedFighter {
  actorUuid: string;
  tokenId: string;
  trueInit: number;
  /** `system.hp.max` is a derived field (recomputed from level/HD/CON), not settable
   * directly at creation — read the real post-prep value rather than assuming the
   * creation-time number survived. */
  trueHpMax: number;
}

/** Creates a Character with full ownership (so the player session can also roll for it),
 * masks name/HP/init via one Secret AE, and places a linked token on the active scene. */
async function setupMaskedFighter (page: Page): Promise<MaskedFighter> {
  const actorUuid = await createActor(page, 'character', {
    name: TRUE_NAME,
    ownership: { default: 3 },
    system: { hp: { current: TRUE_HP_CURRENT } },
  });

  await createActiveEffect(page, actorUuid, {
    name: 'GM Secrets',
    type: 'secret',
    img: 'icons/svg/eye.svg',
    disabled: false,
    changes: [
      { key: 'name', value: MASKED_NAME, type: 'mask', target: 'actor', priority: 10, phase: 'initial' },
      { key: 'system.hp.current', value: MASKED_HP.current, type: 'mask', target: 'actor', priority: 10, phase: 'initial' },
      { key: 'system.hp.max', value: MASKED_HP.max, type: 'mask', target: 'actor', priority: 10, phase: 'initial' },
      { key: 'system.init', value: MASKED_INIT, type: 'mask', target: 'actor', priority: 10, phase: 'initial' },
    ],
  });

  const { trueInit, trueHpMax } = await page.evaluate(async (uuid) => {
    const actor = await (globalThis as any).fromUuid(uuid);
    return { trueInit: actor.system.init as number, trueHpMax: actor.system.hp.max as number };
  }, actorUuid);

  const tokenId = await placeToken(page, actorUuid, { x: 300, y: 300 });

  return { actorUuid, tokenId, trueInit, trueHpMax };
}

/**
 * Reads the token document's viewer-aware name + native canvas HP bar (`getBarAttribute`) —
 * the same call returns true values for a GM session and masked values for a non-GM
 * session, by construction. The Token HUD's compact widget has its own, separately
 * mask-aware computation (`TokenHudDnd35e._prepareContext()`), but it's covered by
 * `token-hud-permissions.test.mts` instead: that widget is an HP-adjustment control with no
 * actual current-value display in its default (non-`useDefaultHpBar`) configuration, so
 * there's no E2E-observable surface to assert on, and a direct out-of-lifecycle
 * `_prepareContext()` call from here proved to unreliably crash core's own
 * `_getMovementActionChoices()`, which needs fuller render context than a bare call provides.
 */
async function readTokenMaskedSurfaces (page: Page, tokenId: string): Promise<{
  name: string;
  bar: { value: number; max: number | undefined };
}> {
  return page.evaluate((id) => {
    const canvas = (globalThis as any).canvas;
    const placeable = canvas.tokens.get(id);
    if (!placeable) throw new Error(`readTokenMaskedSurfaces: no placeable for token ${id}`);
    const doc = placeable.document;
    const bar = doc.getBarAttribute('bar1');

    return {
      name: doc.name as string,
      bar: { value: bar.value as number, max: bar.max as number | undefined },
    };
  }, tokenId);
}

/**
 * Fires `actor.rollInitiativeCheck()` without awaiting it inline (it blocks on the dialog),
 * stashing the pending promise on `globalThis` under a unique key so a later `page.evaluate`
 * can retrieve the resolved `D20Roll`. Interacts with the dialog exactly like a real user:
 * reads the displayed base total, then clicks Roll.
 */
async function rollInitiativeViaDialog (
  page: Page,
  actorUuid: string
): Promise<{ displayedTotal: number; roll: { total: number; naturalResult: number } }> {
  const globalKey = `__initRoll_${Math.random().toString(36).slice(2)}`;
  const errorKey = `${globalKey}_error`;
  await page.evaluate(({ uuid, key, errKey }) => {
    (globalThis as any).fromUuid(uuid).then((actor: any) => {
      const promise = actor.rollInitiativeCheck();
      (globalThis as any)[key] = promise;
      promise.catch((err: any) => { (globalThis as any)[errKey] = err?.message ?? String(err); });
    }).catch((err: any) => { (globalThis as any)[errKey] = err?.message ?? String(err); });
  }, { uuid: actorUuid, key: globalKey, errKey: errorKey });

  const dialog = page.locator('.initiative-roll-dialog');
  // Race dialog visibility against an early rejection surfacing on globalThis, so a real
  // failure fails fast with a message instead of a blind 60s test timeout.
  await expect.poll(async () => {
    const err = await page.evaluate((k) => (globalThis as any)[k], errorKey);
    if (err) throw new Error(`rollInitiativeCheck() rejected before the dialog opened: ${err}`);
    return await dialog.isVisible();
  }, { timeout: 15_000 }).toBe(true);
  await dismissOverlays(page);

  const displayedTotalText = await dialog.locator('.base-row .value').innerText();
  const displayedTotal = Number(displayedTotalText.trim());

  await dialog.locator('.roll-btn').click();

  const roll = await page.evaluate(async (key) => {
    // Poll until the stashed promise exists (the fromUuid().then() above may not have
    // settled the assignment yet by the time this runs).
    for (let i = 0; i < 50 && !(globalThis as any)[key]; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    const result = await (globalThis as any)[key];
    delete (globalThis as any)[key];
    return { total: result.total as number, naturalResult: result.naturalResult as number };
  }, globalKey);

  return { displayedTotal, roll };
}

test.describe('Secret AE masking propagates to tokens, HUD, Roll Initiative dialog, and the Initiative chat card', () => {
  let playerContext: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    playerContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  });

  test.afterEach(async ({ page }) => {
    await releaseAllTokens(page).catch(() => {});
    await clearWorld(page);
    await playerContext.close();
  });

  test('GM sees true name/HP on the token; player sees the masked values', async ({ page }) => {
    test.setTimeout(100_000);
    await gotoGame(page);
    await activateScene(page, 'Test Scene');
    await page.evaluate(() => (globalThis as any).game.togglePause(false, true));
    const { tokenId, trueHpMax } = await setupMaskedFighter(page);

    const gmView = await readTokenMaskedSurfaces(page, tokenId);
    expect(gmView.name).toBe(TRUE_NAME);
    expect(gmView.bar).toMatchObject({ value: TRUE_HP_CURRENT, max: trueHpMax });

    const playerPage = await loginAs(playerContext, 'player');
    await activateScene(playerPage, 'Test Scene');
    await playerPage.waitForFunction((id) => {
      const doc = (globalThis as any).canvas?.tokens?.get(id)?.document;
      // Wait for the synced token's actor data to be fully prepared, not just for the
      // placeable to exist — `getBarAttribute()` can return null for a beat right after
      // a fresh player session's canvas first syncs the token.
      return !!doc?.getBarAttribute('bar1');
    }, tokenId);

    const playerView = await readTokenMaskedSurfaces(playerPage, tokenId);
    expect(playerView.name).toBe(MASKED_NAME);
    expect(playerView.bar).toMatchObject({ value: MASKED_HP.current, max: MASKED_HP.max });

    await deleteTokens(page, [tokenId]);
  });

  test('Roll Initiative dialog shows the masked modifier to the player and the true modifier to the GM, but the actual roll always uses the true value', async ({ page }) => {
    // Two full dialog round-trips (GM then a fresh player login+session) comfortably
    // exceeds the 60s default — bump rather than trim real interaction/assertion steps.
    test.setTimeout(150_000);
    await gotoGame(page);
    await activateScene(page, 'Test Scene');
    await page.evaluate(() => (globalThis as any).game.togglePause(false, true));
    const { actorUuid, tokenId, trueInit } = await setupMaskedFighter(page);

    const gmRoll = await rollInitiativeViaDialog(page, actorUuid);
    expect(gmRoll.displayedTotal).toBe(trueInit);
    expect(gmRoll.roll.total - gmRoll.roll.naturalResult).toBe(trueInit);

    const playerPage = await loginAs(playerContext, 'player');
    await activateScene(playerPage, 'Test Scene');
    await playerPage.waitForFunction((id) => !!(globalThis as any).canvas?.tokens?.get(id), tokenId);
    await playerPage.evaluate(() => (globalThis as any).game.togglePause(false, true));

    const playerRoll = await rollInitiativeViaDialog(playerPage, actorUuid);
    expect(playerRoll.displayedTotal).toBe(MASKED_INIT);
    // The dialog showed a masked number, but the mechanical roll must still have used the
    // true modifier underneath — masking must never change what actually happens.
    expect(playerRoll.roll.total - playerRoll.roll.naturalResult).toBe(trueInit);

    await deleteTokens(page, [tokenId]);
  });

  test('Initiative chat card shows the correct actor name per viewer', async ({ page }) => {
    test.setTimeout(100_000);
    await gotoGame(page);
    await activateScene(page, 'Test Scene');
    await page.evaluate(() => (globalThis as any).game.togglePause(false, true));
    const { actorUuid, tokenId } = await setupMaskedFighter(page);

    // Roll as the GM so the message exists; the card's displayed name is re-resolved per
    // viewing client afterward (wireSaveRollCardButton), not baked in at roll time.
    await page.evaluate(async (uuid) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      await actor.rollInitiativeCheck({ skipDialog: true });
    }, actorUuid);

    const messageId = await page.evaluate(() => {
      const message = (globalThis as any).game.messages.contents.find(
        (m: any) => typeof m.content === 'string' && m.content.includes('save-roll-card')
      );
      return message?.id ?? null;
    });
    expect(messageId).not.toBeNull();

    const gmCardName = page.locator(`.message[data-message-id="${messageId}"] .save-roll-card .value[data-actor-uuid]`).first();
    await expect(gmCardName).toContainText(TRUE_NAME);

    const playerPage = await loginAs(playerContext, 'player');
    const playerCardName = playerPage.locator(`.message[data-message-id="${messageId}"] .save-roll-card .value[data-actor-uuid]`).first();
    await expect(playerCardName).toContainText(MASKED_NAME);

    await deleteTokens(page, [tokenId]);
  });

  test('GM can toggle a token into Play preview mode via the Token HUD, seeing exactly what a non-GM viewer sees', async ({ page }) => {
    test.setTimeout(100_000);
    await gotoGame(page);
    await activateScene(page, 'Test Scene');
    await page.evaluate(() => (globalThis as any).game.togglePause(false, true));
    const { tokenId, trueHpMax } = await setupMaskedFighter(page);

    // Default (no flag set) — GM sees true values, same as before this toggle existed.
    const trueView = await readTokenMaskedSurfaces(page, tokenId);
    expect(trueView.name).toBe(TRUE_NAME);
    expect(trueView.bar).toMatchObject({ value: TRUE_HP_CURRENT, max: trueHpMax });

    // The HUD's left control bar renders to the left of the token in screen space — pan
    // the token into open canvas space first, or a token placed near the scene edge can
    // render its HUD buttons off-screen (see `panToPoint`'s own doc comment).
    await panToPoint(page, { x: 300, y: 300 });
    await openTokenHud(page, tokenId);
    await page.locator('#token-hud [data-action="toggleGmViewMode"]').click();
    await expect.poll(async () => page.evaluate((id) => {
      const doc = (globalThis as any).canvas.tokens.get(id)?.document;
      return doc?.getFlag('dnd35e', 'gmViewMode') ?? null;
    }, tokenId)).toBe('play');

    const previewView = await readTokenMaskedSurfaces(page, tokenId);
    expect(previewView.name).toBe(MASKED_NAME);
    expect(previewView.bar).toMatchObject({ value: MASKED_HP.current, max: MASKED_HP.max });

    // Toggle back — the GM's own preview choice must be reversible, not one-way.
    await openTokenHud(page, tokenId);
    await page.locator('#token-hud [data-action="toggleGmViewMode"]').click();
    await expect.poll(async () => page.evaluate((id) => {
      const doc = (globalThis as any).canvas.tokens.get(id)?.document;
      return doc?.getFlag('dnd35e', 'gmViewMode') ?? null;
    }, tokenId)).toBe('true');

    const revertedView = await readTokenMaskedSurfaces(page, tokenId);
    expect(revertedView.name).toBe(TRUE_NAME);

    await deleteTokens(page, [tokenId]);
  });

  test('A token\'s own custom name is an explicit override and always wins over an actor name mask, for every viewer', async ({ page }) => {
    // A fresh player login+session comfortably exceeds the 60s default — bump rather
    // than trim real interaction/assertion steps (same reasoning as the other tests here).
    test.setTimeout(100_000);
    const CUSTOM_TOKEN_NAME = 'Custom Label';
    await gotoGame(page);
    await activateScene(page, 'Test Scene');
    const { tokenId } = await setupMaskedFighter(page);

    // Customizing the placed token's own name (distinct from the actor's true name) is a
    // deliberate per-instance override — it must beat the mask for every viewer, not just
    // the GM, since it was never "pulling from the sheet" in the first place.
    await page.evaluate(async ({ id, name }) => {
      const doc = (globalThis as any).canvas.tokens.get(id)?.document;
      await doc.update({ name });
    }, { id: tokenId, name: CUSTOM_TOKEN_NAME });

    const gmView = await readTokenMaskedSurfaces(page, tokenId);
    expect(gmView.name).toBe(CUSTOM_TOKEN_NAME);

    const playerPage = await loginAs(playerContext, 'player');
    await activateScene(playerPage, 'Test Scene');
    await playerPage.waitForFunction((id) => !!(globalThis as any).canvas?.tokens?.get(id), tokenId);

    const playerView = await readTokenMaskedSurfaces(playerPage, tokenId);
    expect(playerView.name).toBe(CUSTOM_TOKEN_NAME);

    await deleteTokens(page, [tokenId]);
  });
});
