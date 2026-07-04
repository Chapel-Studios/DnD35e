import type { HpData } from '../data/CreatureSystemData.mjs';

type NonLethalCheckResult = {
  newNonLethal: number;
};

const handleNonLethalDamageUpdate = (
  hp: HpData,
  amount: number,
  updateObject: Record<string, unknown> = {}
): NonLethalCheckResult => {
  const newNonLethal = Math.max(0, hp.nonlethal + amount);
  updateObject['system.hp.nonlethal'] = newNonLethal;
  return { newNonLethal };
};

export type {
  NonLethalCheckResult,
};

export {
  handleNonLethalDamageUpdate,
};
