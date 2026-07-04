import type { HpData } from '../data/CreatureSystemData.mjs';

type UpdateHPViaHealingResult = {
  newHp: number;
  newNonlethal: number;
};

const handleUpdateHpViaHealing = (
  hp: HpData,
  amount: number,
  updateObject: Record<string, unknown> = {}
): UpdateHPViaHealingResult => {
  if (amount <= 0) {
    return { newHp: hp.current, newNonlethal: hp.nonlethal };
  }
  
  const newHp = Math.min(hp.max, hp.current + amount); 
  updateObject['system.hp.current'] = newHp;
  const newNonlethal = Math.max(0, hp.nonlethal - amount);
  updateObject['system.hp.nonlethal'] = newNonlethal;
  return { newHp, newNonlethal };
};

export type {
  UpdateHPViaHealingResult,
};

export {
  handleUpdateHpViaHealing,
};
