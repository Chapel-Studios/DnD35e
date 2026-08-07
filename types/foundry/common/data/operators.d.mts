/**
 * Sentinel value used in a schema field update payload to force deletion of a single key
 * from a `TypedObjectField` (or similar keyed field), replacing the legacy `{-=key: null}`
 * string-prefix deletion convention, which is deprecated since v14 for these fields.
 *
 * @example
 * ```js
 * document.update({ "system.detectionModes": { feelTremor: new foundry.data.operators.ForcedDeletion() } });
 * ```
 */
export class ForcedDeletion {}
