import type { ActiveEffectSource } from '@common/documents/active-effect.mjs';
import type { Dnd35eDocumentFlags } from '@ec/CoreMixin/index.mjs';
import { DnD35eActiveEffect } from '@effects/BaseActiveEffect/DnD35eActiveEffect.mjs';
import { LogHelper } from '@helpers/index.mjs';
import { COMBAT_KEYS } from '@settings/combat/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import type { MaterialSystemData, MaterialSystemSource } from './data/index.mjs';
import { MATERIAL_SUBTYPE_STANDARD } from './data/index.mjs';
import type { MaterialEffectType } from './materialEffectType.mjs';
import { materialEffectType } from './materialEffectType.mjs';

type MaterialSource = ActiveEffectSource<MaterialEffectType, MaterialSystemSource>;

interface MaterialEffectFlags {
  // Add material-specific flags here as needed
}

class Material extends DnD35eActiveEffect {
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

/**
 * Validates whether a new Material AE should be allowed on its parent.
 * Returns false to block creation when the enforce-single-material setting is on
 * and the parent already has a standard Material AE.
 */
function validateSingleMaterial(document: ActiveEffect): false | void {
  if (document.type !== materialEffectType || !document.parent) return;

  const systemData = document.system as Record<string, unknown>;
  if (systemData?.materialSubtype !== MATERIAL_SUBTYPE_STANDARD) return;

  const existingStandard = [...(document.parent.effects ?? [])].find(
    (e: ActiveEffect) =>
      e.type === materialEffectType
      && (e.system as Record<string, unknown>)?.materialSubtype === MATERIAL_SUBTYPE_STANDARD
  );
  if (!existingStandard) return;

  const enforce = game.settings.get(SYSTEM_ID, COMBAT_KEYS.ENFORCE_SINGLE_MATERIAL) as boolean;
  if (enforce) {
    foundry.ui.notifications?.error('dnd35e.EFFECT.EnforceSingleMaterialError', { localize: true });
    return false;
  }
  LogHelper.warn('Multiple standard Material effects on a single item. This may cause unexpected stacking behavior.');
}

export {
  Material,
  materialEffectType,
  validateSingleMaterial,
};

export type {
  MaterialEffectFlags,
  MaterialEffectType,
  MaterialSource,
  MaterialType,
};
