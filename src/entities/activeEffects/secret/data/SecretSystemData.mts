import type { ActiveEffectSystemData, Dnd35eActiveEffectSystemSource } from '@effects/BaseActiveEffect/data/ActiveEffectSystemData.mjs';

/**
 * Secret active effect system data — masks field values from non-GM users.
 * `isPlayerEditSecret` marks secrets auto-created by player edits on masked fields.
 */
interface SecretSystemSource extends Dnd35eActiveEffectSystemSource {
  isPlayerEditSecret: boolean;
}

interface SecretSystemData extends ActiveEffectSystemData {
  isPlayerEditSecret: boolean;
}

export type {
  SecretSystemData,
  SecretSystemSource,
};
