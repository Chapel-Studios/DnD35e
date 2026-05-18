import type { ActiveEffectSystemData, ActiveEffectSystemSourceDnd35e } from '@effects/BaseActiveEffect/data/ActiveEffectSystemData.mjs';

/**
 * Secret active effect system data — masks field values from non-GM users.
 * `isPlayerEditSecret` marks secrets auto-created by player edits on masked fields.
 */
interface SecretSystemSource extends ActiveEffectSystemSourceDnd35e {
  isPlayerEditSecret: boolean;
}

interface SecretSystemData extends ActiveEffectSystemData {
  isPlayerEditSecret: boolean;
}

export type {
  SecretSystemData,
  SecretSystemSource,
};
