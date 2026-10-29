/**
 * Preparation Warnings — non-blocking diagnostics collected during data preparation.
 *
 * All diagnostics remain on the "Warnings" tab. Banner prominence is independent of
 * technical severity and can be overridden by a GM on the source document.
 * Never thrown; a broken formula degrades gracefully (falls back to `null`/raw text - see
 * `FormulaData._finalizeResolvedValue()`) instead of blocking `prepareDerivedData()`.
 *
 * @module
 */

interface PreparationWarning {
  /** Stable producer/rule identity, independent of message text and array order. */
  id?: string;
  /** Omitted by legacy producers, which retain their existing banner behavior. */
  defaultBanner?: boolean;
  /** Field path the warning concerns, e.g. `"system.hp.value"` or an AE change's `key`. */
  field: string;
  message: string;
  severity: 'warning' | 'error';
  /** Uuid of the document the warning was pushed onto (e.g. the ActiveEffect itself). */
  sourceUuid: string;
  /** Human-readable ancestor chain from the root document down to the one the warning
   * originated on, e.g. `["Aragorn", "Longsword +1", "Strength Bonus"]`. */
  sourcePath: string[];
}

/**
 * Minimal shape any document carrying `_preparationWarnings` satisfies. `parent` is
 * deliberately `unknown` (not `PreparationWarningHost | null`) — a real Foundry Document's
 * actual `.parent` points to core classes (e.g. `Actor`/`TokenDocument`) that don't declare
 * `_preparationWarnings`, so a recursive `PreparationWarningHost` type here would make
 * `ActorDnd35e`/`ItemDnd35e` themselves fail structural assignability. `buildSourcePath`
 * duck-types the walk instead of relying on this interface for ancestor nodes.
 */
interface PreparationWarningHost {
  _preparationWarnings: PreparationWarning[];
  name?: string;
  /** Foundry Documents type this as `DocumentUUID | null`, not `string | undefined`. */
  uuid?: string | null;
  parent?: unknown;
}

/** Walks `host.parent` up to the root, collecting document names along the way. */
function buildSourcePath(host: PreparationWarningHost): string[] {
  const path: string[] = [];
  let current: unknown = host;
  while (current && typeof current === 'object') {
    const node = current as { name?: string; parent?: unknown };
    if (node.name) path.unshift(node.name);
    current = node.parent;
  }
  return path;
}

/** Push a warning onto a document's `_preparationWarnings`. No-op if the host isn't ready yet. */
function pushPreparationWarning(
  host: PreparationWarningHost | null | undefined,
  field: string,
  message: string,
  severity: 'warning' | 'error' = 'warning',
  options: Pick<PreparationWarning, 'id' | 'defaultBanner'> = {}
): void {
  if (!host?._preparationWarnings) return;
  host._preparationWarnings.push({
    ...options,
    field,
    message,
    severity,
    sourceUuid: host.uuid ?? '',
    sourcePath: buildSourcePath(host),
  });
}

/**
 * Push the same warning onto multiple hosts at once — e.g. both the AE change's own
 * `ActiveEffect` (so it's visible while authoring the change) and the actor/item the
 * change actually targets (where the broken field lives). Duplicate/undefined hosts
 * are deduped/no-op'd automatically. An entry may itself be an array (e.g. an item-owned
 * effect applying an actor-targeted change needs both the actor AND the owning item
 * warned at once) — `.flat()` collapses one level of nesting before filtering, so callers
 * can pass a `PreparationWarningHost | PreparationWarningHost[]` "warnHost" straight
 * through without pre-flattening it themselves.
 *
 * All copies share one `sourcePath`/`sourceUuid`, taken from whichever host has the
 * deepest ancestry chain (e.g. an AE's Actor → Item → Effect chain is more informative
 * than its target actor's chain alone) — so the origin is identifiable regardless of
 * which sheet the warning is viewed from.
 */
function pushPreparationWarningToHosts(
  hosts: Array<PreparationWarningHost | PreparationWarningHost[] | null | undefined>,
  field: string,
  message: string,
  severity: 'warning' | 'error' = 'warning'
): void {
  const validHosts = hosts.flat().filter((host): host is PreparationWarningHost => !!host?._preparationWarnings);
  if (validHosts.length === 0) return;

  const origin = validHosts.reduce((deepest, host) =>
    (buildSourcePath(host).length > buildSourcePath(deepest).length ? host : deepest)
  );
  const sourceUuid = origin.uuid ?? '';
  const sourcePath = buildSourcePath(origin);

  const seen = new Set<PreparationWarningHost>();
  for (const host of validHosts) {
    if (seen.has(host)) continue;
    seen.add(host);
    host._preparationWarnings.push({ field, message, severity, sourceUuid, sourcePath });
  }
}

export { pushPreparationWarning, pushPreparationWarningToHosts };
export type { PreparationWarning, PreparationWarningHost };
