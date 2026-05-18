import { secretEffectType } from '@effects/secret/secretEffectType.mjs';

/**
 * Minimal effect shape needed for identifiable state derivation.
 *
 * Mirrors the `IdentifiableEffect` constraint on `IdentifiableDocumentMixin`,
 * intentionally local to this module so unit tests can construct fixtures
 * without importing the mixin.
 */
interface IdentifiableEffectLike {
  type: string;
  active: boolean;
}

interface IdentifiableState {
  /** Whether this document has any Secret AEs (even disabled ones). */
  isIdentifiable: boolean;
  /** Whether all Secret AEs are disabled or absent. */
  isIdentified: boolean;
}

/**
 * Pure derivation of identifiable state from an effects collection.
 *
 * - `isIdentifiable` = there is at least one Secret AE attached (active or not).
 * - `isIdentified`   = none of the Secret AEs are currently active.
 *
 * Non-secret effects are ignored entirely. Used by `IdentifiableDocumentMixin`
 * inside `prepareDerivedData`; extracted as a pure helper so the logic can be
 * unit tested without mounting a Foundry document.
 */
const deriveIdentifiableState = (effects: Iterable<IdentifiableEffectLike>): IdentifiableState => {
  const secrets = [...effects].filter(e => e.type === secretEffectType);
  return {
    isIdentifiable: secrets.length > 0,
    isIdentified: !secrets.some(e => e.active),
  };
};

export {
  deriveIdentifiableState,
};

export type {
  IdentifiableEffectLike,
  IdentifiableState,
};
