import type { Page } from '@playwright/test';

/**
 * Ensure the named scene is the active/viewed scene, activating it if it
 * isn't already, then wait for `canvas.ready === true`.
 *
 * Returns the scene's id.
 */
export async function activateScene (page: Page, sceneName: string): Promise<string> {
  const sceneId = await page.evaluate(async (name) => {
    const g = (globalThis as any).game;
    const scene = g.scenes.find((s: any) => s.name === name);
    if (!scene) throw new Error(`activateScene: no scene named "${name}"`);
    if (!scene.isView) await scene.activate();
    return scene.id as string;
  }, sceneName);
  await page.waitForFunction(
    () => (globalThis as any).canvas?.ready === true,
    null,
    { timeout: 30_000 }
  );
  return sceneId;
}

/**
 * Place a token linked to the given actor at scene coordinates on the
 * currently-viewed scene, via `Actor#getTokenDocument` + embedded creation
 * (not drag-and-drop). Optional `light` overrides the actor's prototype
 * token light config (e.g. `{ dim: 40, bright: 20 }`).
 *
 * Returns the created TokenDocument's id.
 */
export async function placeToken (
  page: Page,
  actorUuid: string,
  data: { x: number; y: number; light?: Record<string, unknown> }
): Promise<string> {
  const tokenId = await page.evaluate(async ({ actorUuid, data }) => {
    const fromUuid = (globalThis as any).fromUuid;
    const canvas = (globalThis as any).canvas;
    const actor = await fromUuid(actorUuid);
    if (!actor) throw new Error(`placeToken: actor not found at ${actorUuid}`);
    const scene = canvas?.scene;
    if (!scene) throw new Error('placeToken: no active/viewed scene');
    const tokenDoc = await actor.getTokenDocument({
      x: data.x,
      y: data.y,
      ...(data.light ? { light: data.light } : {}),
    });
    const [created] = await scene.createEmbeddedDocuments('Token', [tokenDoc.toObject()]);
    if (!created?.id) throw new Error('placeToken: createEmbeddedDocuments returned no token');
    return created.id as string;
  }, { actorUuid, data });
  return tokenId;
}

/**
 * Select (control) the given token placeable on the currently-viewed scene,
 * releasing any other controlled tokens first.
 */
export async function controlToken (page: Page, tokenId: string): Promise<void> {
  await page.evaluate((id) => {
    const canvas = (globalThis as any).canvas;
    canvas?.tokens?.releaseAll();
    const placeable = canvas?.tokens?.get(id);
    if (!placeable) throw new Error(`controlToken: no placeable for token ${id}`);
    placeable.control({ releaseOthers: true });
  }, tokenId);
}

/**
 * Release all controlled tokens on the currently-viewed scene.
 */
export async function releaseAllTokens (page: Page): Promise<void> {
  await page.evaluate(() => {
    (globalThis as any).canvas?.tokens?.releaseAll();
  });
}

/**
 * Read the currently-initialized light source radius (post low-light
 * scaling, in pixels) for the given token placeable.
 */
export async function getTokenLightData (
  page: Page,
  tokenId: string
): Promise<{ dim: number; bright: number }> {
  return page.evaluate((id) => {
    const canvas = (globalThis as any).canvas;
    const placeable = canvas?.tokens?.get(id);
    if (!placeable) throw new Error(`getTokenLightData: no placeable for token ${id}`);
    const source = placeable.light;
    if (!source) throw new Error(`getTokenLightData: token ${id} has no active light source`);
    return { dim: source.data.dim as number, bright: source.data.bright as number };
  }, tokenId);
}

/**
 * Delete embedded Token placeables from the currently-viewed scene.
 * Use in `afterEach` for specs that place tokens, alongside `clearWorld` for
 * the underlying actors.
 */
export async function deleteTokens (page: Page, tokenIds: string[]): Promise<void> {
  if (tokenIds.length === 0) return;
  await page.evaluate(async (ids) => {
    const canvas = (globalThis as any).canvas;
    const scene = canvas?.scene;
    if (!scene) return;
    const existing = ids.filter((id: string) => scene.tokens.get(id));
    if (existing.length > 0) await scene.deleteEmbeddedDocuments('Token', existing);
  }, tokenIds);
}
