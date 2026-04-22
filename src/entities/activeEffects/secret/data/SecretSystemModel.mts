import { ActiveEffectSystemModelBase } from '@effects/BaseActiveEffect/data/ActiveEffectSystemModelBase.mjs';
import { requiredBooleanField } from '@helpers/fieldBuilders.mjs';

import type { SecretSystemData } from './SecretSystemData.mjs';

/** Default priority for GM-created Secret MASK changes. */
const SECRET_MASK_PRIORITY = 10;

/** Priority for Player Edit Secret MASK changes — wins over regular secrets. */
const PLAYER_EDIT_MASK_PRIORITY = 3001;

/**
 * Secret active effect system model — masks item/actor field values from non-GM users.
 *
 * Secrets always live on a parent item — their familiar context is derived from
 * that parent at runtime (see {@link ActiveEffectConfigStore.resolveTargetContext}).
 * No static `targetContexts` declaration needed.
 */
class SecretSystemModel extends ActiveEffectSystemModelBase {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.EFFECT.Secret'];

  static override defineSchema (): Record<string, any> {
    const superSchema = super.defineSchema();
    return foundry.utils.mergeObject(superSchema, {
      isPlayerEditSecret: requiredBooleanField(false),
    });
  }

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

export { PLAYER_EDIT_MASK_PRIORITY, SECRET_MASK_PRIORITY, SecretSystemModel };
