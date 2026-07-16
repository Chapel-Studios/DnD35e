import type { CoinStack } from '@settings/index.mjs';

import type { CurrencyData } from '../CurrencyData.mjs';
import { CurrencyField } from '../CurrencyField.mjs';

const multiplyCurrency = (value: CurrencyData, factor: number): { stacks: CoinStack[]; srdEquivalent: number } => {
  const stacks = value.stacks
    .map(s => ({ coinId: s.coinId, count: Math.round(s.count * factor) }))
    .filter(s => s.count > 0);
  return CurrencyField._withGpValue(stacks);
};

export { multiplyCurrency };