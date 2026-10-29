import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import type { WieldedHand } from '@constants/equipmentSlots.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import type { RollModifier, WeaponDamageRollModifier } from '@source/dice/types.mjs';

import type { RollBreakdownData, RollDialogContext, RollDialogData, RollDialogResult } from '../RollDialog/types.mjs';

interface ModifierToggle {
  id: string;
  group: string;
  label: string;
  tooltip: string;
  checked: boolean;
  wasAutoDetected: boolean;
}

interface WeaponAttackModifierToggle extends ModifierToggle {
  group: 'attackType' | 'combatStatus';
  createRollModifiers: (checked: boolean, hand: WieldedHand) => {
    attackModifiers: RollModifier[];
    damageModifiers: WeaponDamageRollModifier[];
  };
}

interface WeaponRollBreakdownData extends Omit<RollBreakdownData, 'immutableModifiers'> {
  immutableModifiersByHand: Record<WieldedHand, RollModifier[]>;
}

interface WeaponDamageRollBreakdownData extends WeaponRollBreakdownData {
  immutableModifiersByHand: Record<WieldedHand, WeaponDamageRollModifier[]>;
}

interface WeaponAttackRollDialogData extends RollDialogData {
  target: ACTORS_DND35E[] | null;
  targetToken?: TokenDnd35e | null;
  attackRoll: WeaponRollBreakdownData;
  damageRoll: WeaponDamageRollBreakdownData;
  combatModifierToggles: WeaponAttackModifierToggle[];
  wieldedHand: WieldedHand;
  handBab: Record<WieldedHand, number>;
}

interface WeaponAttackRollDialogResult extends RollDialogResult {
  wieldMode: WieldedHand;
  attackModifiers: RollModifier[];
  damageModifiers: WeaponDamageRollModifier[];
  /** Choices with non-numeric consequences, including zero-penalty nonlethal attacks. */
  combatModifiers: Pick<ModifierToggle, 'id' | 'checked'>[];
}

type AttackRollDialogResult = WeaponAttackRollDialogResult;
type WeaponAttackRollDialogContext = RollDialogContext<WeaponAttackRollDialogData, WeaponAttackRollDialogResult>;

export type {
  AttackRollDialogResult,
  ModifierToggle,
  WeaponAttackModifierToggle,
  WeaponAttackRollDialogContext,
  WeaponAttackRollDialogData,
  WeaponAttackRollDialogResult,
  WeaponDamageRollBreakdownData,
  WeaponRollBreakdownData,
};
