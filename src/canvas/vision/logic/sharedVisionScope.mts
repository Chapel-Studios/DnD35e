/**
 * Shared-vision scope resolution (replaces the old per-user `visionPermission` grant grid).
 *
 * A single `SharedVisionScope` enum drives both the world default and any per-actor override:
 * - `none`: this actor never contributes to the shared-vision pool.
 * - `owned`: contributes to the pool for users who own it (the default).
 * - `partyMembers`: contributes to the pool for any observing user, when the actor is flagged
 *   `system.settings.isPartyMember` (e.g. a GM-piloted party ally).
 *
 * The pool itself only ever *widens* Foundry's own permission model - OBSERVER permission is
 * always required (see `resolveSharedVisionSource`'s `observerPermission` check) - it never
 * bypasses it.
 */

type SharedVisionScope = 'none' | 'owned' | 'partyMembers';
type ActorSharedVisionScope = 'default' | SharedVisionScope;
type SharedVisionSelectionMode = 'passiveWhenUnselected' | 'alwaysShared';

/** Resolves an actor's effective sharing scope: its own override, or the world default. */
const resolveEffectiveVisionScope = (
  actorScope: ActorSharedVisionScope,
  worldScope: SharedVisionScope
): SharedVisionScope => (actorScope === 'default' ? worldScope : actorScope);

interface SharedVisionSourceContext {
  /** Whether Foundry's canvas-wide token vision is enabled at all (`canvas.visibility.tokenVision`). */
  tokenVisionEnabled: boolean;
  /** Whether this token has sight enabled (`Token#hasSight`). */
  hasSight: boolean;
  /** Whether the viewing user is a GM. */
  isGM: boolean;
  /** Whether this specific token is currently controlled/selected by the viewing user. */
  controlled: boolean;
  /** Whether this token is hidden (only visible to the GM). */
  hidden: boolean;
  /** Whether the viewing user has some *other* controlled token with sight (Foundry's own "nothing else selected" fallback rule). */
  hasOtherControlledWithSight: boolean;
  /** Whether the viewing user has at least OBSERVER permission on this token's actor. */
  observerPermission: boolean;
  /** Whether the viewing user owns this token's actor. */
  owner: boolean;
  /** Whether this token's actor is flagged as a party member (`system.settings.isPartyMember`). */
  isPartyMember: boolean;
  /** This token's already-resolved effective scope (actor override, or the world default). */
  effectiveScope: SharedVisionScope;
  /** The world's selection-interaction mode. */
  selectionMode: SharedVisionSelectionMode;
}

/**
 * Resolves whether a token should count as an active vision source for the current user.
 * Extends Foundry's own stock `Token#_isVisionSource()` rule - controlled token(s) always win;
 * otherwise, an observed token with sight only contributes while nothing else is controlled -
 * with dnd35e's shared-vision scope (`none`/`owned`/`partyMembers`) and an `alwaysShared` mode
 * that keeps the pool additive even while something's selected.
 */
const resolveSharedVisionSource = (ctx: SharedVisionSourceContext): boolean => {
  if (!ctx.tokenVisionEnabled || !ctx.hasSight) return false;
  if (ctx.hidden && !ctx.isGM) return false;
  if (ctx.controlled) return true;
  if (ctx.isGM) return false;
  if (!ctx.observerPermission) return false;
  if (ctx.effectiveScope === 'none') return false;

  const scopeMatches = ctx.effectiveScope === 'owned' ? ctx.owner : ctx.isPartyMember;
  if (!scopeMatches) return false;

  return ctx.selectionMode === 'alwaysShared' || !ctx.hasOtherControlledWithSight;
};

export { resolveEffectiveVisionScope, resolveSharedVisionSource };
export type {
  ActorSharedVisionScope,
  SharedVisionScope,
  SharedVisionSelectionMode,
  SharedVisionSourceContext,
};
