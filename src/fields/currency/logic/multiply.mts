import type { CoinStack } from '@settings/index.mjs';

import { CurrencyData } from '../CurrencyData.mjs';

const multiplyCurrency = (value: CurrencyData, factor: number): { stacks: CoinStack[]; srdEquivalent: number } => {
  const stacks = value.stacks
    .map(s => ({ coinId: s.coinId, count: Math.round(s.count * factor) }))
    .filter(s => s.count > 0);
  return { stacks, srdEquivalent: CurrencyData.computeGpValue(stacks) };
};

export { multiplyCurrency };