import { DnD35eActiveEffect } from '@effects/BaseActiveEffect/DnD35eActiveEffect.mjs';

import type { SecretSystemData } from './data/index.mjs';
import type { SecretEffectType } from './secretEffectType.mjs';
import { secretEffectType } from './secretEffectType.mjs';

/**
 * Secret active effect — masks item/actor field values from non-GM users.
 * Uses MASK change mode entries to define which fields are masked and with what values.
 * An item with active (non-disabled) Secret AEs is considered unidentified.
 */
class Secret extends DnD35eActiveEffect {
  declare type: SecretEffectType;
  declare system: SecretSystemData;

  override get transfer (): boolean {
    return false;
  }

  override get isTemporary () {
    return false;
  }

  get localizedType (): string {
    return game.i18n.localize('dnd35e.EFFECT.Secret.Type');
  }
}

type SecretType = Secret;

export {
  Secret,
  secretEffectType,
};

export type {
  SecretEffectType,
  SecretType,
};
