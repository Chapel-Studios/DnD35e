/**
 * Tracks per-document dismissal of the preparation-warnings banner for the current
 * browser session (module-level, not persisted to the document). Keyed by document
 * uuid so dismissal survives Vue remounts and sheet close/reopen within the same
 * session, but a signature check still ensures a genuinely new warning is never
 * silently hidden by a stale dismissal.
 *
 * @module
 */

import type { PreparationWarning } from '@documents/document/preparationWarnings.mjs';

const dismissedSignatures = new Map<string, string>();

/** Stable identity for a warning set - order-independent, ignores message text so a
 * re-worded warning for the same field/source doesn't defeat the dismissal. */
const buildSignature = (warnings: PreparationWarning[]): string =>
  warnings
    .map((warning) => `${warning.sourceUuid}:${warning.field}`)
    .sort()
    .join('|');

const isPreparationWarningsDismissed = (uuid: string, warnings: PreparationWarning[]): boolean =>
  dismissedSignatures.get(uuid) === buildSignature(warnings);

const dismissPreparationWarnings = (uuid: string, warnings: PreparationWarning[]): void => {
  dismissedSignatures.set(uuid, buildSignature(warnings));
};

export { dismissPreparationWarnings, isPreparationWarningsDismissed };
