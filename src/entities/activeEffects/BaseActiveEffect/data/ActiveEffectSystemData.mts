import { ActiveEffectSystemSource } from '@common/documents/active-effect.mjs';
import { BaseDnd35eSystemData } from '@ec/CoreMixin/index.mjs';

type ActiveEffectTarget = 'Actor' | 'Item';

interface Dnd35eActiveEffectSystemSource extends BaseDnd35eSystemData, ActiveEffectSystemSource {
  target: ActiveEffectTarget;
}

type ActiveEffectSystemData = Dnd35eActiveEffectSystemSource;

export type {
  ActiveEffectTarget,
  ActiveEffectSystemData,
  Dnd35eActiveEffectSystemSource,
};
