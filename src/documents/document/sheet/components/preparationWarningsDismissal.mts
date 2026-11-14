/**
 * Tracks per-document dismissal of the preparation-warnings banner for the current
 * browser session (module-level, not persisted to the document). Keyed by document
 * uuid so dismissal survives Vue remounts and sheet close/reopen within the same
 * session, but identity/revision checks still ensure a genuinely new warning is never
 * silently hidden by a stale dismissal.
 *
 * @module
 */

import { getPreparationWarningBannerState, preparationWarningKey } from '@documents/document/preparationWarningPreferences.mjs';
import type { PreparationWarning } from '@documents/document/preparationWarnings.mjs';
import { shallowReactive } from 'vue';

const dismissedSignatures = shallowReactive(new Map<string, ReadonlySet<string>>());

/** Stable identities for banner warnings - ignores message text so a
 * re-worded warning for the same field/source doesn't defeat the dismissal. */
const buildSignatures = (warnings: PreparationWarning[]): string[] =>
  warnings.flatMap((warning) => {
    const state = getPreparationWarningBannerState(warning);
    if (!state.banner) return [];
    return [JSON.stringify([
      warning.sourceUuid,
      preparationWarningKey(warning),
      state.revision,
    ])];
  });

const isPreparationWarningsDismissed = (uuid: string, warnings: PreparationWarning[]): boolean =>
  buildSignatures(warnings).every(signature => dismissedSignatures.get(uuid)?.has(signature));

const dismissPreparationWarnings = (uuid: string, warnings: PreparationWarning[]): void => {
  dismissedSignatures.set(uuid, new Set([
    ...dismissedSignatures.get(uuid) ?? [],
    ...buildSignatures(warnings),
  ]));
};

export { dismissPreparationWarnings, isPreparationWarningsDismissed };
