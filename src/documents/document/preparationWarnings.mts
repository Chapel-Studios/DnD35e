/**
 * Preparation Warnings — non-blocking diagnostics collected during data preparation.
 *
 * Surfaced in the sheet UI via a dismissible summary banner and a persistent "Warnings" tab.
 * Never thrown; a broken formula degrades gracefully (falls back to `null`/raw text - see
 * `FormulaData._finalizeResolvedValue()`) instead of blocking `prepareDerivedData()`.
 *
 * @module
 */

interface PreparationWarning {
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
  severity: 'warning' | 'error' = 'warning'
): void {
  if (!host?._preparationWarnings) return;
  host._preparationWarnings.push({
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
 * are deduped/no-op'd automatically.
 *
 * All copies share one `sourcePath`/`sourceUuid`, taken from whichever host has the
 * deepest ancestry chain (e.g. an AE's Actor → Item → Effect chain is more informative
 * than its target actor's chain alone) — so the origin is identifiable regardless of
 * which sheet the warning is viewed from.
 */
function pushPreparationWarningToHosts(
  hosts: Array<PreparationWarningHost | null | undefined>,
  field: string,
  message: string,
  severity: 'warning' | 'error' = 'warning'
): void {
  const validHosts = hosts.filter((host): host is PreparationWarningHost => !!host?._preparationWarnings);
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
