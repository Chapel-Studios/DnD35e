import type { HpData } from '../data/CreatureSystemData.mjs';

type TempHpCheckResult = {
  newTempHp: number;
  remainingDamage: number;
};

const updateTempHp = (
  hp: HpData,
  amount: number,
  updateObject: Record<string, unknown> = {}
): TempHpCheckResult => {
  const newTempHp = Math.max(0, hp.temp + amount);
  updateObject['system.hp.temp'] = newTempHp;
  const remainingDamage = Math.max(0, amount - hp.temp);
  return { newTempHp, remainingDamage };
};

export type {
  TempHpCheckResult,
};

export {
  updateTempHp,
};