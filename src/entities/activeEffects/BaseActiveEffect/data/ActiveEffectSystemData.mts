import type { ActiveEffectSystemSource } from '@common/documents/active-effect.mjs';
import type { BaseDnd35eSystemData } from '@ec/CoreMixin/index.mjs';

type ActiveEffectTarget = 'Actor' | 'Item';

interface Dnd35eActiveEffectSystemSource extends BaseDnd35eSystemData, ActiveEffectSystemSource {
  target: ActiveEffectTarget;
}

type ActiveEffectSystemData = Dnd35eActiveEffectSystemSource;

export type {
  ActiveEffectSystemData,
  ActiveEffectTarget,
  Dnd35eActiveEffectSystemSource,
};
