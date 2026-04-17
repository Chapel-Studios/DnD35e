import { ActiveEffectSystemModelBase } from '@effects/BaseActiveEffect/index.mjs';

/**
 * Secret active effect system model — masks item/actor field values from non-GM users.
 * No additional schema fields in MVP; uses MASK change mode for field masking.
 */
class SecretSystemModel extends ActiveEffectSystemModelBase {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.EFFECT.Secret'];
}

export { SecretSystemModel };
