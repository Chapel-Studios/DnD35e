import type { TokenDocumentDnd35e } from '@scene/tokenDocument/TokenDocumentDnd35e.mjs';

/**
 * Per-token GM preview toggle (poc.10 Story I HUD extension, added after review). A GM can
 * flip a specific token's `flags.dnd35e.gmViewMode` between `'true'` (see the real values,
 * the default) and `'play'` (preview exactly what a non-GM viewer sees) via the Token HUD's
 * new toggle button. Mirrors the sheet's Play/True view-mode concept, but scoped per-token
 * rather than per-open-window, and deliberately simple: every masked surface (nameplate, HP
 * bar, HUD compact widget, Roll Initiative dialog, Initiative chat card) reads this flag
 * fresh whenever it renders/evaluates — there is no live cross-surface reactivity, so an
 * already-open dialog or already-posted card can fall out of sync with a later toggle. That
 * tradeoff is accepted; a uniform live-update mechanism is tracked as a post-release
 * wishlist item rather than built here.
 *
 * Non-GM viewers always resolve to `'play'` regardless of this flag — the flag only ever
 * changes what the *GM* sees, never anyone else's actual access.
 */
const GM_VIEW_MODE_FLAG = 'gmViewMode';

type GmViewMode = 'play' | 'true';

/**
 * Resolves the effective GM view mode for the given token from the *current* client's
 * perspective. A non-GM user always gets `'play'`. A GM with no token in scope (e.g. no
 * acting token resolved at all) defaults to `'true'` — the pre-existing, always-true
 * behavior - rather than treating "no token" as "preview mode".
 */
function getTokenGmViewMode (token: TokenDocumentDnd35e | null | undefined): GmViewMode {
  if (!game.user?.isGM) return 'play';
  if (!token) return 'true';
  // Only an explicit 'play' flips the default — anything else (unset, a stale/unexpected
  // value) falls back to 'true' rather than relying on `??`, which only guards against
  // null/undefined and not other falsy sentinels a caller's `getFlag()` might return.
  return token.getFlag('dnd35e', GM_VIEW_MODE_FLAG) === 'play' ? 'play' : 'true';
}

/** Flips the token's stored GM view mode; a no-op for non-GM callers. */
async function toggleTokenGmViewMode (token: TokenDocumentDnd35e): Promise<void> {
  if (!game.user?.isGM) return;
  const current = getTokenGmViewMode(token);
  await token.setFlag('dnd35e', GM_VIEW_MODE_FLAG, current === 'true' ? 'play' : 'true');
}

export { getTokenGmViewMode, GM_VIEW_MODE_FLAG, toggleTokenGmViewMode };
export type { GmViewMode };
