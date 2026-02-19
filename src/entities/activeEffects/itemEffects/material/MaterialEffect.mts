import { DnD35eActiveEffectFlags } from '@effects/BaseActiveEffect/index.mjs';
import { ItemEffect } from '@itemEffects/index.mjs';

type MaterialEffectFlags = any;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const priceDifferenceKeys = [
  'price',
  'resalePrice',
  'brokenResalePrice',
] as const;

class MaterialEffect extends ItemEffect {
  declare flags: DnD35eActiveEffectFlags<MaterialEffectFlags>;

  override get isTemporary () {
    return false;
  }

  override get type () {
    return 'material';
  }
}

export { MaterialEffect };
export type { MaterialEffectFlags };
