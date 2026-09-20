import type { AbilityKey } from '@constants/abilities.mjs';
import type { WeaponEquipSlot } from '@constants/equipmentSlots.mjs';
import type { UseActionContext } from '@items/baseItem/actions/types.mjs';

interface UseWeaponAttackContext extends UseActionContext {
  /** Main/off/both — which hand(s) this attack draws BAB from (§10.7's wield-mode detection). */
  equippedSlots: WeaponEquipSlot[];
  attackAbility: AbilityKey;
  availableBab: number;
}

export type { UseWeaponAttackContext };
