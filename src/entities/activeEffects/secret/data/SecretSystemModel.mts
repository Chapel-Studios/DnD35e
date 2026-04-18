import { ActiveEffectSystemModelBase } from '@effects/BaseActiveEffect/data/ActiveEffectSystemModelBase.mjs';

import type { SecretSystemData } from './SecretSystemData.mjs';

/**
 * Secret active effect system model — masks item/actor field values from non-GM users.
 * No additional schema fields in MVP; uses MASK change mode for field masking.
 *
 * Secrets always live on a parent item — their familiar context is derived from
 * that parent at runtime (see {@link ActiveEffectConfigStore.resolveTargetContext}).
 * No static `targetContexts` declaration needed.
 */
class SecretSystemModel extends ActiveEffectSystemModelBase {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.EFFECT.Secret'];

  /**
   * Secret AEs are always hidden from non-GM users.
   * This is intrinsic to the type — not toggleable.
   */
  override prepareBaseData (): void {
    super.prepareBaseData();
    this.isHidden = true;
  }
}

interface SecretSystemModel extends SecretSystemData {}

export { SecretSystemModel };
