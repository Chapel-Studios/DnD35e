import type { ActiveEffectSystemSource, EffectChangeData } from '@common/documents/active-effect.mjs';
import type { BonusType } from '@constants/bonusTypes.mjs';
import type { BaseDnd35eSystemData } from '@ec/CoreMixin/index.mjs';
import type { EffectChangeTarget, EffectChangeTargetField } from '@effects/BaseActiveEffect/data/constants.mjs';

type ActiveEffectTarget = 'actor' | 'item';

/**
 * Extended change data that includes the per-change target field.
 * Each change can independently target either the item or the actor.
 */
interface Dnd35eEffectChangeData extends EffectChangeData {
  target: EffectChangeTarget;
  /** Which sub-field of a Dnd35eField compound this change targets: 'value' or 'unidentifiedValue'. */
  targetField: EffectChangeTargetField;
  isSystem: boolean;
  /** Optional bonus type for stacking resolution. Only set when stacking applies (Phase 2+). */
  bonusType?: BonusType;
  /** Optional formula-familiar condition for action-phase changes. Phase 8+. */
  condition?: string;
}

interface Dnd35eActiveEffectSystemSource extends BaseDnd35eSystemData, Omit<ActiveEffectSystemSource, 'changes'> {
  target: ActiveEffectTarget;
  isHidden: boolean;
  changes: Dnd35eEffectChangeData[];
}

interface ActiveEffectSystemData extends Dnd35eActiveEffectSystemSource {
}

export type {
  ActiveEffectSystemData,
  ActiveEffectTarget,
  Dnd35eActiveEffectSystemSource,
  Dnd35eEffectChangeData,
};
