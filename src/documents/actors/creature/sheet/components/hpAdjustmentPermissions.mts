import { resolveDocumentFieldOverride } from '@documents/document/sheet/stores/FieldOverridesStore.mjs';
import { gmOnlyEditability, gmOnlyVisibility } from '@vc/fields/formGroups/fieldPermissions.mjs';

import { HP_ADJUSTMENT_TYPE, HP_ADJUSTMENT_TYPES, type HpAdjustmentType } from './constants.mjs';

const HP_ADJUSTMENT_FIELDS = {
  [HP_ADJUSTMENT_TYPE.DAMAGE_ADJUSTMENT]: 'system.hp.current',
  [HP_ADJUSTMENT_TYPE.HEALING_ADJUSTMENT]: 'system.hp.current',
  [HP_ADJUSTMENT_TYPE.TEMPORARY_ADJUSTMENT]: 'system.hp.temp',
  [HP_ADJUSTMENT_TYPE.NONLETHAL_ADJUSTMENT]: 'system.hp.nonlethal',
} as const;

type HpAdjustmentPermissions = Record<HpAdjustmentType, { visible: boolean; editable: boolean }>;

type HpPermissionActor = {
  getFlag: (scope: string, key: string) => unknown;
  system?: unknown;
};

function getHpAdjustmentPermissions(
  actor: HpPermissionActor | null | undefined,
  isOwner: boolean,
  isGM = game.user.isGM
): HpAdjustmentPermissions {
  const permission = (type: HpAdjustmentType) => {
    if (!actor) return { visible: false, editable: false };
    if (isGM) return { visible: true, editable: true };
    if (!isOwner) return { visible: false, editable: false };
    const path = HP_ADJUSTMENT_FIELDS[type];
    const visible = resolveDocumentFieldOverride(actor, path, 'visibility') !== gmOnlyVisibility;
    return {
      visible,
      editable: visible && resolveDocumentFieldOverride(actor, path, 'editability') !== gmOnlyEditability,
    };
  };
  return {
    [HP_ADJUSTMENT_TYPE.DAMAGE_ADJUSTMENT]: permission(HP_ADJUSTMENT_TYPE.DAMAGE_ADJUSTMENT),
    [HP_ADJUSTMENT_TYPE.HEALING_ADJUSTMENT]: permission(HP_ADJUSTMENT_TYPE.HEALING_ADJUSTMENT),
    [HP_ADJUSTMENT_TYPE.TEMPORARY_ADJUSTMENT]: permission(HP_ADJUSTMENT_TYPE.TEMPORARY_ADJUSTMENT),
    [HP_ADJUSTMENT_TYPE.NONLETHAL_ADJUSTMENT]: permission(HP_ADJUSTMENT_TYPE.NONLETHAL_ADJUSTMENT),
  };
}

function isHpAdjustmentType(value: string | undefined): value is HpAdjustmentType {
  return HP_ADJUSTMENT_TYPES.some(type => type === value);
}

export { getHpAdjustmentPermissions, HP_ADJUSTMENT_FIELDS, isHpAdjustmentType };
export type { HpAdjustmentPermissions };
