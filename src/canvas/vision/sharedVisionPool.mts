import { Creature } from '@actors/creature/index.mjs';
import type { TokenDnd35e } from '@canvas/token/TokenDnd35e.mjs';
import { DISPLAY_WORLD_KEYS } from '@settings/display/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import { getLowLightMultiplier } from './logic/lowLightVision.mjs';
import type {
  ActorSharedVisionScope,
  SharedVisionScope,
  SharedVisionSelectionMode,
  SharedVisionSourceContext,
} from './logic/sharedVisionScope.mjs';
import { resolveEffectiveVisionScope, resolveSharedVisionSource } from './logic/sharedVisionScope.mjs';

/** Per-actor override flag: `'default'` (follow the world setting) or an explicit scope. */
const SHARED_VISION_SCOPE_FLAG = 'sharedVisionScope';

/** Builds the shared-vision-source decision context for `token`, given current user/canvas state. */
const buildSharedVisionSourceContext = (token: TokenDnd35e): SharedVisionSourceContext => {
  const actor = token.actor;
  const actorScope = (actor?.getFlag(SYSTEM_ID, SHARED_VISION_SCOPE_FLAG) ?? 'default') as ActorSharedVisionScope;
  const worldScope = game.settings.get(SYSTEM_ID, DISPLAY_WORLD_KEYS.SHARED_VISION_SCOPE) as SharedVisionScope;
  const selectionMode = game.settings.get(SYSTEM_ID, DISPLAY_WORLD_KEYS.SHARED_VISION_MODE) as SharedVisionSelectionMode;

  return {
    tokenVisionEnabled: canvas.visibility?.tokenVision ?? false,
    hasSight: token.hasSight,
    isGM: game.user.isGM,
    controlled: token.controlled,
    hidden: token.document.hidden,
    hasOtherControlledWithSight: (canvas.tokens?.controlled ?? [])
      .some(other => other !== token && !other.document.hidden && other.hasSight),
    observerPermission: actor?.testUserPermission(game.user, 'OBSERVER') ?? false,
    owner: token.isOwner,
    isPartyMember: actor ? Boolean(foundry.utils.getProperty(actor, 'system.settings.isPartyMember')) : false,
    effectiveScope: resolveEffectiveVisionScope(actorScope, worldScope),
    selectionMode,
  };
};

/**
 * Whether `token` should count as an active vision source for the current user - Foundry's own
 * `Token#_isVisionSource()`, extended with dnd35e's shared-vision scope/mode. Called from
 * `TokenDnd35e#_isVisionSource()`.
 */
const isSharedVisionSource = (token: TokenDnd35e): boolean => resolveSharedVisionSource(buildSharedVisionSourceContext(token));

/**
 * Resolves the light-radius multiplier that should currently apply on the canvas for the
 * current user, based on which token(s) currently act as vision sources for them (see
 * `isSharedVisionSource`). Called from `TokenDnd35e`/`AmbientLightDnd35e#_getLightSourceData()`
 * to scale dim/bright radii.
 */
const getActiveLowLightMultiplier = (): number => {
  const tokens = canvas.tokens?.placeables ?? [];
  const multipliers = tokens
    .filter(token => resolveSharedVisionSource(buildSharedVisionSourceContext(token)))
    .map(token => (token.actor instanceof Creature ? getLowLightMultiplier(token.actor.system.bio.senses) : null))
    .filter((multiplier): multiplier is number => multiplier !== null);
  return multipliers.length > 0 ? Math.max(...multipliers) : 1;
};

/**
 * Re-runs light- and vision-source initialization for every placeable on the current canvas.
 * Needed after a `sharedVisionScope` flag/setting change (no selection change occurs), since
 * Foundry only re-evaluates `_isVisionSource()`/`_getLightSourceData()` for placeables that are
 * directly told to re-initialize - it doesn't watch actor flags or world settings for changes.
 * Selection changes don't need this: Foundry's own `Token#_onControl`/`_onRelease` already loop
 * `initializeVisionSource()` across every token on the layer.
 */
const reinitializeSharedVision = (): void => {
  for (const light of canvas?.lighting?.placeables ?? []) light.initializeLightSource();
  for (const token of canvas?.tokens?.placeables ?? []) {
    token.initializeLightSource();
    token.initializeVisionSource();
  }
};

/**
 * Broadcasts a canvas vision refresh to all connected clients (and refreshes locally) after a
 * `sharedVisionScope` flag/setting change. Mirrors D35E's `redrawCanvas` socket event.
 */
const broadcastVisionRefresh = (): void => {
  game.socket?.emit(`system.${SYSTEM_ID}`, { eventType: 'redrawCanvas' });
  reinitializeSharedVision();
  canvas?.perception?.update({ refreshVision: true, refreshOcclusion: true, refreshLighting: true });
};

export {
  broadcastVisionRefresh,
  getActiveLowLightMultiplier,
  isSharedVisionSource,
  reinitializeSharedVision,
  SHARED_VISION_SCOPE_FLAG,
};
