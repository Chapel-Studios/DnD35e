import { CurrencyData } from '../CurrencyData.mjs';

const multiplyCurrency = (value: CurrencyData, factor: number): CurrencyData => {
  const stacks = value.stacks
    .map(s => ({ coinId: s.coinId, count: Math.round(s.count * factor) }))
    .filter(s => s.count > 0);
  return CurrencyData.fromStacks(stacks);
};

const addCurrency = (value1: CurrencyData, value2: CurrencyData): CurrencyData => {
  // Clone each stack (not just the array) so mutating `existing.count` below never
  // aliases into value1's original stack objects.
  const stacks = value1.stacks.map(s => ({ ...s }));
  for (const s of value2.stacks) {
    const existing = stacks.find(st => st.coinId === s.coinId);
    if (existing) {
      existing.count += s.count;
    } else {
      stacks.push({ ...s });
    }
  }
  const filteredStacks = stacks.filter(s => s.count > 0);
  return CurrencyData.fromStacks(filteredStacks);
};

export {
  addCurrency,
  multiplyCurrency,
};
