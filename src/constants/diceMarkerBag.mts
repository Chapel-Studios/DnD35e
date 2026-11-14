/**
 * Generic key=value marker bag encoded as a single Foundry dice-flavor string — the shared
 * "stash multiple independent, composable annotations in one flavor slot, read back later"
 * primitive behind every reserved dice-flavor marker in this system (crit override, damage
 * type, and any future dimension).
 *
 * Why a bag, not one reserved constant per concern: Foundry's `Die` term has exactly one
 * string field (`.flavor`, the `[...]` bracket tag) available for carrying anything beyond
 * its numeric dice data — there's no second structural channel at the term level, and a
 * formula-resolution pipeline that only ever produces plain strings (`FormulaData.
 * resolveSource()`, used for every field in the system, not just dice formulas) has no other
 * place to smuggle metadata through either. Two independent escape hatches that each invented
 * their own single reserved string (e.g. a crit-override marker and a damage-type marker)
 * can't compose when nested (`$critMultiply($typed(fire, 1d6))` vs.
 * `$typed(fire, $critMultiply(1d6))`) — whichever resolves outermost overwrites the other's
 * marker outright. A shared bag fixes this: each escape hatch upserts only its own key via
 * `withMarkerField()`, so nesting either order converges on the same combined bag.
 *
 * Encoding: `__dnd35e_marker__key1=value1;key2=value2__`. Keys/values are restricted to
 * `isSafeMarkerToken()`'s character set — this system's own marker vocabulary (crit override
 * tokens, `DAMAGE_TYPES` localization keys) never contains `;`/`=`/whitespace, so a value
 * outside that set is rejected rather than silently mis-parsed, instead of being escaped.
 *
 * Used by `d20Formula.mts`'s `mergeDiceGroupMarker()` (the per-dice-group writer) and the
 * domain-specific reader wrappers in `critDiceMarkers.mts`/`typedDamageMarkers.mts`. Plain
 * display labels (a weapon or AE name, stamped by `flavorDamageDiceBySource()`'s final pass)
 * are never bags — `parseMarkerBag()` returns `null` for any flavor that isn't one, which
 * callers must treat as "no marker present", not an error.
 *
 * @module
 */
const MARKER_BAG_PREFIX = '__dnd35e_marker__';
const MARKER_BAG_SUFFIX = '__';
const SAFE_TOKEN_REGEX = /^[\p{L}\p{N}_.]+$/u;

/** Whether `token` is safe to store as a marker-bag key or value — see module doc. */
function isSafeMarkerToken(token: string): boolean {
  return SAFE_TOKEN_REGEX.test(token);
}

/**
 * Parses a flavor string into its key→value bag. Returns `null` when `flavor` isn't a marker
 * bag at all (absent, or a plain display label) — including when it's malformed (unexpected
 * shape, unsafe token), since a hand-authored flavor string should never masquerade as one.
 */
function parseMarkerBag(flavor: string | undefined): Record<string, string> | null {
  if (!flavor || !flavor.startsWith(MARKER_BAG_PREFIX) || !flavor.endsWith(MARKER_BAG_SUFFIX)) return null;
  const inner = flavor.slice(MARKER_BAG_PREFIX.length, -MARKER_BAG_SUFFIX.length);
  if (!inner) return {};

  const bag: Record<string, string> = {};
  for (const pair of inner.split(';')) {
    const eq = pair.indexOf('=');
    if (eq === -1) return null;
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    if (!isSafeMarkerToken(key) || !isSafeMarkerToken(value)) return null;
    bag[key] = value;
  }
  return bag;
}

/**
 * Encodes a key→value bag as a flavor string. Throws on an unsafe key/value — this only ever
 * receives this system's own controlled vocabulary (crit override tokens, `DamageType`
 * constants), never free-form user text, so an unsafe token here is a programming error, not
 * a runtime condition to handle gracefully.
 */
function buildMarkerBag(bag: Record<string, string>): string {
  const pairs = Object.entries(bag).map(([key, value]) => {
    if (!isSafeMarkerToken(key) || !isSafeMarkerToken(value)) {
      throw new Error(`Invalid dice marker token: "${key}=${value}"`);
    }
    return `${key}=${value}`;
  });
  return `${MARKER_BAG_PREFIX}${pairs.join(';')}${MARKER_BAG_SUFFIX}`;
}

/**
 * Upserts a single key into whatever marker bag (if any) `existingFlavor` already carries —
 * the composability primitive described in the module doc. A non-bag existing flavor (this
 * dice group was never marked) starts a fresh bag with just this one key.
 */
function withMarkerField(existingFlavor: string | undefined, key: string, value: string): string {
  const bag = parseMarkerBag(existingFlavor) ?? {};
  return buildMarkerBag({ ...bag, [key]: value });
}

/**
 * Strips every embedded marker-bag `[...]` flavor tag from a resolved formula string, leaving
 * any other bracket content untouched. For display-only contexts that show a raw resolved
 * formula directly (e.g. a weapon's own damage text) without going through the dice-group
 * attribution pipeline (`d20Formula.mts`'s `attributeDamageDiceGroups()`/
 * `flavorDamageDiceBySource()`, which read and replace these markers deliberately) — those
 * contexts would otherwise show the literal internal marker text (e.g.
 * `1d6[__dnd35e_marker__type=dnd35e.DAMAGE_TYPES.Fire__]`) to the player.
 */
function stripMarkerFlavors(formula: string): string {
  return formula.replace(/\[([^\]]*)\]/g, (whole, inner: string) => (parseMarkerBag(inner) ? '' : whole));
}

export { buildMarkerBag, parseMarkerBag, stripMarkerFlavors, withMarkerField };
