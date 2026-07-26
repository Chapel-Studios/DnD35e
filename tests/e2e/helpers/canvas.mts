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

/** Pixel size (`grid.size`) and feet-per-square (`grid.distance`) of the active scene's grid. */
export async function getGridInfo (page: Page): Promise<{ size: number; distance: number }> {
  return page.evaluate(() => {
    const canvas = (globalThis as any).canvas;
    return { size: canvas.grid.size as number, distance: canvas.grid.distance as number };
  });
}

/**
 * Instantly (no animation) recenter the canvas camera on the given world point, at
 * 100% zoom. Needed before any test converts a canvas-space point to a client point
 * for real mouse interaction — the default camera position after `activateScene` is
 * centered on the *scene's* midpoint, not any particular token, so a token placed at
 * an arbitrary world coordinate may render off-screen or right underneath a fixed UI
 * toolbar rather than in open canvas space.
 */
export async function panToPoint (page: Page, point: { x: number; y: number }): Promise<void> {
  await page.evaluate((p) => {
    (globalThis as any).canvas.pan({ x: p.x, y: p.y, scale: 1 });
  }, point);
}

/** Current canvas-space (world) center point of the given token placeable. */
export async function getTokenPosition (page: Page, tokenId: string): Promise<{ x: number; y: number }> {
  return page.evaluate((id) => {
    const canvas = (globalThis as any).canvas;
    const placeable = canvas?.tokens?.get(id);
    if (!placeable) throw new Error(`getTokenPosition: no placeable for token ${id}`);
    return { x: placeable.center.x as number, y: placeable.center.y as number };
  }, tokenId);
}

/**
 * Convert a canvas-space (world) point into client (viewport) pixel coordinates
 * suitable for `page.mouse`, via Foundry's own `Canvas#clientCoordinatesFromCanvas`.
 */
export async function canvasPointToClient (page: Page, point: { x: number; y: number }): Promise<{ x: number; y: number }> {
  return page.evaluate((p) => {
    const canvas = (globalThis as any).canvas;
    return canvas.clientCoordinatesFromCanvas(p) as { x: number; y: number };
  }, point);
}

/**
 * Simulate a real left-click-drag of the given token by a canvas-space pixel offset,
 * starting from its current center. Used to confirm a movement-action HUD selection
 * (see `tokenHud.mts`) — Foundry only applies a `movementAction` to a completed waypoint
 * once an actual mouse-driven drag confirms the move, even for zero-cost custom actions
 * like `dropProne`/`standUp` (there's no "instant action" hook).
 */
export async function dragTokenByOffset (
  page: Page,
  tokenId: string,
  offset: { dx: number; dy: number }
): Promise<void> {
  const origin = await getTokenPosition(page, tokenId);
  const destination = { x: origin.x + offset.dx, y: origin.y + offset.dy };
  const start = await canvasPointToClient(page, origin);
  const end = await canvasPointToClient(page, destination);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // Foundry's MouseInteractionManager#handlePointerMove throttles pointermove handling to
  // canvas.app.ticker.elapsedMS per event, and only checks the drag-resistance distance
  // (10px default) on calls that pass that throttle. Under a slow/headless renderer,
  // ticker.elapsedMS can be large enough that a multi-step interpolated move (many small
  // sub-threshold deltas) gets entirely throttled away before any single event's delta
  // exceeds the resistance threshold, so the drag never starts. A single jump straight to
  // the destination guarantees the one pointermove event carries the full offset.
  await page.mouse.move(end.x, end.y);
  await page.mouse.up();
}
