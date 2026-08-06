import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/index.mjs';
import type { CurrencyData } from '@fields/index.mjs';

type BuildContainmentChangesInput = {
  existingChanges: EffectChangeDataDnd35e[];
  contributedWeight: number;
  contributedPrice?: CurrencyData;
  contributedCount: number;
};

const buildChange = (
  key: string,
  value: number,
  condition?: string
): EffectChangeDataDnd35e => ({
  key,
  type: 'add',
  value,
  phase: 'final',
  priority: 5,
  target: 'item',
  isSystem: true,
  condition: condition ?? null,
});

const buildContainmentChanges = ({
  existingChanges,
  contributedWeight,
  contributedPrice,
  contributedCount,
}: BuildContainmentChangesInput): EffectChangeDataDnd35e[] => {
  const changes: EffectChangeDataDnd35e[] = [
    ...existingChanges.filter(c => !c.isSystem),
  ];
  changes.push(buildChange(
    'system.contentsWeight',
    contributedWeight
  ));
  changes.push(buildChange(
    'system.weight',
    contributedWeight,
    '!#item.contentsAreWeightless'
  ));
  changes.push(buildChange(
    'system.contentsCount',
    contributedCount
  ));
  if (contributedPrice && contributedPrice.srdEquivalent > 0) {
    changes.push(buildChange('system.contentsValue', contributedPrice.srdEquivalent));
  }
  return changes;
};

export type { BuildContainmentChangesInput };

export { buildContainmentChanges };
