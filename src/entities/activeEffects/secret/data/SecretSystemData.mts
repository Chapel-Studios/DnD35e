import type { ActiveEffectSystemData, Dnd35eActiveEffectSystemSource } from '@effects/BaseActiveEffect/index.mjs';

/**
 * Secret active effect system data — masks field values from non-GM users.
 * No additional fields; pure base AE schema.
 * will eventually add hooks for revealing secrets.
 */
interface SecretSystemSource extends Dnd35eActiveEffectSystemSource {
}

interface SecretSystemData extends ActiveEffectSystemData {
}

export type {
  SecretSystemData,
  SecretSystemSource,
};
