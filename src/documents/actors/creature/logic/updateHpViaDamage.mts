import type { HpData } from '../data/index.mjs';
import { updateTempHp } from './updateTempHp.mjs';

type UpdateHpViaDamageResult = {
  newHp: number;
  newTempHp: number;
};

const handleUpdateHpViaDamage = (
  hp: HpData,
  amount: number,
  updateObject: Record<string, unknown> = {}
): UpdateHpViaDamageResult => {
  if (amount <= 0) {
    return { newHp: hp.current, newTempHp: hp.temp };
  }

  let applicableDamage = amount;
  let newTempHp = hp.temp;

  if (hp.temp > 0) {
    const { newTempHp: updatedTempHp, remainingDamage } = updateTempHp(hp, -1 * amount, updateObject);
    // Overflow damage is whatever wasn't absorbed by temp HP
    applicableDamage = remainingDamage;
    newTempHp = updatedTempHp;
  }

  // HP is allowed to go negative — event checkers detect dying/death thresholds
  const newHp = hp.current - applicableDamage;
  updateObject['system.hp.current'] = newHp;

  return { newHp, newTempHp };
};

export type {
  UpdateHpViaDamageResult,
};

export {
  handleUpdateHpViaDamage,
};
