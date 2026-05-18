/**
 * Builds the system-managed `EffectChangeDataDnd35e[]` a Material AE applies to its
 * parent item based on the material's Details-tab fields (price diff, magic equivalency,
 * hardness, bonus HP, DR types). User-authored changes (`isSystem === false`) are
 * preserved verbatim; existing system changes are consulted only to preserve the
 * user-chosen change `type` (ADD/UPGRADE/etc.) when the underlying field is non-zero.
 *
 * @module
 */

import type { EffectPhases } from '@common/documents/active-effect.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import type { EffectChangeTarget, EffectChangeType } from '@effects/baseActiveEffect/data/constants.mjs';
import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import type { PriceData } from '@fields/PriceData.mjs';

import type { MaterialSubtype } from './materialTypes.mjs';
import { MATERIAL_SUBTYPE_BONUS_MAP } from './materialTypes.mjs';

/** Minimal shape of `PriceData` consumed by the builder. */
type PriceLike = Pick<PriceData, 'isEmpty'>;

export type BuildMaterialChangesInput = {
  materialSubtype: MaterialSubtype;
  price: PriceLike;
  magicEquivalency: number;
  hardness: number;
  bonusHp: number;
  damageReductionTypes: ReadonlySet<string> | readonly string[];
  /** The full current `changes` array on the AE system data. */
  existingChanges: readonly EffectChangeDataDnd35e[];
};

const buildChange = (
  materialSubtype: MaterialSubtype,
  key: string,
  value: string | number | PriceData,
  type: EffectChangeType,
  phase: EffectPhases = 'final',
  priority = 10,
  target: EffectChangeTarget = EFFECT_CHANGE_TARGET.ITEM
): EffectChangeDataDnd35e => ({
  key,
  type,
  value,
  phase,
  priority,
  target,
  effect: null,
  isSystem: true,
  bonusType: MATERIAL_SUBTYPE_BONUS_MAP[materialSubtype],
});

/**
 * Pick the change `type` for a system change on `key`: if the user already
 * customised the type on a prior system change for the same key, preserve it;
 * otherwise fall back to `defaultType`.
 */
const pickType = (
  existingChanges: readonly EffectChangeDataDnd35e[],
  key: string,
  defaultType: EffectChangeType
): EffectChangeType => {
  const existing = existingChanges.find(c => c.key === key && c.isSystem);
  return existing ? existing.type : defaultType;
};

/**
 * Build the system-managed AE change list for a Material AE. Preserves all
 * non-system (user-authored) changes verbatim, then appends one change per
 * non-zero/non-empty Details-tab field.
 */
export const buildMaterialChanges = (input: BuildMaterialChangesInput): EffectChangeDataDnd35e[] => {
  const {
    materialSubtype,
    price,
    magicEquivalency,
    hardness,
    bonusHp,
    damageReductionTypes,
    existingChanges,
  } = input;

  const changes: EffectChangeDataDnd35e[] = [
    ...existingChanges.filter(change => !change.isSystem),
  ];

  if (!price.isEmpty) {
    changes.push(buildChange(
      materialSubtype,
      'system.price',
      price as unknown as PriceData,
      pickType(existingChanges, 'system.price', EFFECT_CHANGE_TYPE.ADD)
    ));
  }
  if (magicEquivalency !== 0) {
    changes.push(buildChange(
      materialSubtype,
      'system.magicEquivalency',
      magicEquivalency,
      pickType(existingChanges, 'system.magicEquivalency', EFFECT_CHANGE_TYPE.UPGRADE)
    ));
  }
  if (hardness !== 0) {
    changes.push(buildChange(
      materialSubtype,
      'system.hardness',
      hardness,
      pickType(existingChanges, 'system.hardness', EFFECT_CHANGE_TYPE.ADD)
    ));
  }
  if (bonusHp !== 0) {
    changes.push(buildChange(
      materialSubtype,
      'system.hp.max',
      bonusHp,
      pickType(existingChanges, 'system.hp.max', EFFECT_CHANGE_TYPE.ADD)
    ));
  }
  for (const drType of damageReductionTypes) {
    changes.push(buildChange(
      materialSubtype,
      'system.damageReductionTypes',
      drType,
      pickType(existingChanges, 'system.damageReductionTypes', EFFECT_CHANGE_TYPE.ADD)
    ));
  }

  return changes;
};
