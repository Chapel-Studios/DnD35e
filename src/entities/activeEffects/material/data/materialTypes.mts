import type { BonusType } from '@constants/bonusTypes.mjs';
import { BONUS_TYPE_BROKEN, BONUS_TYPE_MASTERWORK, BONUS_TYPE_MATERIAL } from '@constants/bonusTypes.mjs';

/**
 * Material subtypes determine how the material's bonus type stacks.
 * - 'standard': normal material bonuses (highest-wins per field, bonusType: 'material')
 * - 'broken': penalties from a broken item (always apply, bonusType: 'broken')
 * - 'masterwork': masterwork quality bonus (highest-wins, bonusType: 'masterwork')
 */
const MATERIAL_SUBTYPE_STANDARD = 'standard' as const;
const MATERIAL_SUBTYPE_BROKEN = 'broken' as const;
const MATERIAL_SUBTYPE_MASTERWORK = 'masterwork' as const;

const MATERIAL_SUBTYPES = [MATERIAL_SUBTYPE_STANDARD, MATERIAL_SUBTYPE_BROKEN, MATERIAL_SUBTYPE_MASTERWORK] as const;
type MaterialSubtype = (typeof MATERIAL_SUBTYPES)[number];

const MATERIAL_SUBTYPE_BONUS_MAP: Record<MaterialSubtype, BonusType> = {
  [MATERIAL_SUBTYPE_STANDARD]: BONUS_TYPE_MATERIAL,
  [MATERIAL_SUBTYPE_BROKEN]: BONUS_TYPE_BROKEN,
  [MATERIAL_SUBTYPE_MASTERWORK]: BONUS_TYPE_MASTERWORK,
} as const;

export { MATERIAL_SUBTYPE_BONUS_MAP, MATERIAL_SUBTYPE_BROKEN, MATERIAL_SUBTYPE_MASTERWORK, MATERIAL_SUBTYPE_STANDARD, MATERIAL_SUBTYPES };
export type { MaterialSubtype };
