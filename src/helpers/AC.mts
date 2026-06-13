import type { Creature } from '@actors/creature/Creature.mjs';
import { SIZE_MODIFIERS } from '@constants/sizes.mjs';

export const calculateTouchAC = (character: Creature, denyDex = false): number => {
  const dexModifier = denyDex
    ? 0
    : Math.min(character.system.abilities.dex.mod, character.maxDexModifier ?? Infinity);
  const sizeModifier = SIZE_MODIFIERS[character.system.size] ?? 0;

  return 10 + dexModifier + sizeModifier;
};

export const calculateStandardAC = (character: Creature, denyDex = false): number => {
  const armorBonus = character.armorBonus;
  const shieldBonus = character.shieldBonus;

  return calculateTouchAC(character, denyDex) + armorBonus + shieldBonus;
};