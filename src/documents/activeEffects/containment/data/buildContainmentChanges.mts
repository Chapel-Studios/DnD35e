import type { Dnd35eDocType } from '@documents/types.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/index.mjs';
import type { CurrencyData } from '@fields/index.mjs';
import { Container } from '@items/physical/container/Container.mjs';

type BuildContainmentChangesInput = {
  existingChanges: EffectChangeDataDnd35e[];
  contributedWeight: number;
  contributedPrice?: CurrencyData;
  contributedCount: number;
};

const buildChange = (
  key: string,
  value: number | CurrencyData,
  condition?: (target: Dnd35eDocType) => boolean
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
    (target): target is Container => 
      target instanceof Container
      && !((target as Container).system.contentsAreWeightless)
  ));
  changes.push(buildChange(
    'system.contentsCount',
    contributedCount
  ));
  if (contributedPrice && contributedPrice.srdEquivalent > 0) {
    changes.push(buildChange('system.contentsValue', contributedPrice));
  }
  return changes;
};

export type { BuildContainmentChangesInput };

export { buildContainmentChanges };
