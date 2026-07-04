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
  const remainingDamage = newTempHp !== 0
    ? 0
    : Math.max(0, (amount * -1) - hp.temp) ; // Damage is always thought of as a positive number.
  return { newTempHp, remainingDamage };
};

export type {
  TempHpCheckResult,
};

export {
  updateTempHp,
};