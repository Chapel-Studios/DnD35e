import type { ActiveEffectSystemSource, EffectChangeData } from '@common/documents/active-effect.mjs';
import type { BaseDnd35eSystemData } from '@ec/CoreMixin/index.mjs';
import type { EffectChangeTarget, EffectChangeTargetField } from '@effects/BaseActiveEffect/index.mjs';

type ActiveEffectTarget = 'Actor' | 'Item';

/**
 * Extended change data that includes the per-change target field.
 * Each change can independently target either the item or the actor.
 */
interface Dnd35eEffectChangeData extends EffectChangeData {
  target: EffectChangeTarget;
  /** Which sub-field of a Dnd35eField compound this change targets: 'value' or 'unidentifiedValue'. */
  targetField: EffectChangeTargetField;
  isSystem: boolean;
}

interface Dnd35eActiveEffectSystemSource extends BaseDnd35eSystemData, Omit<ActiveEffectSystemSource, 'changes'> {
  target: ActiveEffectTarget;
  changes: Dnd35eEffectChangeData[];
}

type ActiveEffectSystemData = Dnd35eActiveEffectSystemSource;

export type {
  ActiveEffectSystemData,
  ActiveEffectTarget,
  Dnd35eActiveEffectSystemSource,
  Dnd35eEffectChangeData,
};
