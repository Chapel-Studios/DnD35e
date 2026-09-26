import type { Page } from '@playwright/test';

/**
 * Create a Combat on the given scene with one Combatant per token id, and mark it
 * `active` so `game.combat` resolves to it (see `Game#combat`'s `combats.find(c =>
 * c.isActive)` fallback — the sidebar's Combat tab may not be the active tab yet).
 *
 * Returns the created Combat's id and the created Combatants' ids, in the same order
 * as `tokenIds`.
 */
export async function createCombatForTokens (
  page: Page,
  sceneId: string,
  tokenIds: string[]
): Promise<{ combatId: string; combatantIds: string[] }> {
  return page.evaluate(async ({ sceneId, tokenIds }) => {
    const Combat = (globalThis as any).Combat;
    const combat = await Combat.create({ scene: sceneId });
    if (!combat) throw new Error('createCombatForTokens: Combat.create returned no document');
    await combat.activate();
    const combatants = await combat.createEmbeddedDocuments(
      'Combatant',
      tokenIds.map((tokenId: string) => ({ tokenId, sceneId }))
    );
    return {
      combatId: combat.id as string,
      combatantIds: combatants.map((c: any) => c.id as string),
    };
  }, { sceneId, tokenIds });
}

/** Advances the active combat (`game.combat`) from round 0 to round 1, turn 0 — fires `_onStartRound`/`_onStartTurn` for the first combatant for real. */
export async function startCombat (page: Page): Promise<void> {
  await page.evaluate(async () => {
    const combat = (globalThis as any).game.combat;
    if (!combat) throw new Error('startCombat: no active combat (game.combat is null)');
    await combat.startCombat();
  });
}

/** Advances the active combat to the next turn (fires `_onEndTurn`/`_onStartTurn` for real). */
export async function nextCombatTurn (page: Page): Promise<void> {
  await page.evaluate(async () => {
    const combat = (globalThis as any).game.combat;
    if (!combat) throw new Error('nextCombatTurn: no active combat (game.combat is null)');
    await combat.nextTurn();
  });
}

/** Reads a combatant's current `flags.dnd35e.actionEconomy`, applying the same defaults `getActionEconomy()` would. */
export async function getCombatantActionEconomy (page: Page, combatId: string, combatantId: string): Promise<{
  actions: { standard: number; move: number; minor: number; swift: number; aoo: number };
  bab: { main: number; off: number };
  used: Record<string, boolean>;
}> {
  return page.evaluate(({ combatId, combatantId }) => {
    const combat = (globalThis as any).game.combats.get(combatId);
    const combatant = combat?.combatants.get(combatantId);
    if (!combatant) throw new Error(`getCombatantActionEconomy: no combatant ${combatantId} on combat ${combatId}`);
    const stored = combatant.getFlag('dnd35e', 'actionEconomy') ?? {};
    return {
      actions: { standard: 1, move: 1, minor: 1, swift: 1, aoo: 0, ...stored.actions },
      bab: { main: 0, off: 0, ...stored.bab },
      used: { standard: false, move: false, minor: false, swift: false, standardAttackUsed: false, movedAfterAttack: false, chargedThisTurn: false, ...stored.used },
    };
  }, { combatId, combatantId });
}

/**
 * Disables core's animated "Turn Marker" overlay (a continuously re-rendering ring drawn
 * on the active combatant's own token every frame) for the world, if not already disabled.
 * That overlay's interactive hit area permanently occupies the active combatant's own
 * token while it spins, blocking Playwright's simulated clicks/drags against that token for
 * the whole duration of its turn.
 *
 * `combatTrackerConfig` is registered with `requiresReload: true` — writing it triggers an
 * immediate full page reload, destroying the current execution context (that's expected and
 * intentional here, not an error). Callers must re-establish game/scene state afterward
 * (`gotoGame` + `activateScene`) since this reloads the client from scratch. A no-op (no
 * reload) if the setting is already disabled, so it's safe to call once per test.
 */
export async function disableTurnMarkerAnimation (page: Page): Promise<void> {
  const alreadyDisabled = await page.evaluate(() => {
    const config = (globalThis as any).game.settings.get('core', 'combatTrackerConfig');
    return !config.turnMarker?.enabled;
  });
  if (alreadyDisabled) return;

  try {
    await page.evaluate(async () => {
      const config = (globalThis as any).game.settings.get('core', 'combatTrackerConfig');
      await (globalThis as any).game.settings.set('core', 'combatTrackerConfig', {
        ...config,
        turnMarker: { ...config.turnMarker, enabled: false },
      });
    });
  } catch {
    // Expected: setting this world config triggers an automatic full page reload,
    // destroying the execution context mid-`evaluate`. Callers re-navigate afterward.
  }
  await page.waitForLoadState('load');
}

/** Deletes the given Combat document (and its embedded Combatants along with it). */
export async function deleteCombat (page: Page, combatId: string): Promise<void> {
  await page.evaluate(async (id) => {
    const combat = (globalThis as any).game.combats.get(id);
    await combat?.delete();
  }, combatId);
}

/** Reads a combatant's current `flags.dnd35e.movementSession` category — `null` once the session is reset (e.g. after an Undo). */
export async function getCombatantMovementSessionCategory (page: Page, combatId: string, combatantId: string): Promise<string | null> {
  return page.evaluate(({ combatId, combatantId }) => {
    const combat = (globalThis as any).game.combats.get(combatId);
    const combatant = combat?.combatants.get(combatantId);
    if (!combatant) throw new Error(`getCombatantMovementSessionCategory: no combatant ${combatantId} on combat ${combatId}`);
    const stored = combatant.getFlag('dnd35e', 'movementSession');
    return stored?.category ?? null;
  }, { combatId, combatantId });
}

