import { Creature } from '@actors/creature/index.mjs';

import { getLowLightMultiplier, resolveLowLightMultiplier } from './logic/lowLightVision.mjs';

/**
 * Resolves the light-radius multiplier that should currently apply on the canvas for the
 * current user, based on which token(s) they're observing through right now (their controlled
 * selection, falling back to all owned tokens). See `resolveLowLightMultiplier` for the rule.
 * Called from `TokenDnd35e`/`AmbientLightDnd35e#_getLightSourceData()` to scale dim/bright radii.
 */
const getActiveLowLightMultiplier = (): number => {
  const tokens = canvas.tokens?.placeables ?? [];
  const observers = tokens
    .filter(token => token.actor?.testUserPermission(game.user, 'OBSERVER'))
    .map(token => ({
      controlled: token.controlled,
      owner: token.isOwner,
      lowLightMultiplier: token.actor instanceof Creature
        ? getLowLightMultiplier(token.actor.system.bio.senses)
        : null,
    }));
  return resolveLowLightMultiplier(observers);
};

export { getActiveLowLightMultiplier };
