import { ActiveEffectSource } from '@common/documents/active-effect.mjs';
import { Dnd35eDocumentMixin } from '@ec/CoreMixin/Dnd35eDocument.mjs';
import type { Dnd35eDocumentFlags } from '@ec/CoreMixin/index.mjs';
import {
  IdentifiableDocumentMixin,
  IdentifiableDocumentSourceProps,
} from '@ec/Identifiable/index.mjs';
import { DnD35eActiveEffect } from '@effects/BaseActiveEffect/index.mjs';

import type { MaterialSystemData, MaterialSystemSource } from './data/index.mjs';

const materialEffectType = 'material';
type MaterialEffectType = typeof materialEffectType;

type MaterialSource = ActiveEffectSource<MaterialEffectType, MaterialSystemSource>
  & Omit<IdentifiableDocumentSourceProps, 'system'>;

interface MaterialEffectFlags {
  // Add material-specific flags here as needed
}

/** Pre-composed: DnD35eActiveEffect → Dnd35eDocumentMixin → IdentifiableDocumentMixin */
const IdentifiableEffectBase = IdentifiableDocumentMixin(Dnd35eDocumentMixin(DnD35eActiveEffect));

class Material extends IdentifiableEffectBase {
  declare type: MaterialEffectType;
  declare system: MaterialSystemData;
  declare flags: Dnd35eDocumentFlags<MaterialEffectFlags>;

  override get transfer (): boolean {
    return false;
  }

  override get isTemporary () {
    return false;
  }

  override prepareBaseData (): void {
    super.prepareBaseData();
  }

  override get localizedType (): string {
    return game.i18n.localize('dnd35e.COMMON.Material');
  }
}

type MaterialType = Material;

export {
  Material,
  materialEffectType,
};

export type {
  MaterialEffectFlags,
  MaterialEffectType,
  MaterialSource,
  MaterialType,
};
