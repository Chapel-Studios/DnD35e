import type { ActiveEffectSystemSource, EffectChangeData } from '@common/documents/active-effect.mjs';
import type { BonusType } from '@constants/bonusTypes.mjs';
import type { DocumentSystemData } from '@ec/CoreMixin/index.mjs';
import type { EffectChangeTarget } from '@effects/BaseActiveEffect/data/constants.mjs';

type ActiveEffectTarget = 'actor' | 'item';

/**
 * Extended change data that includes the per-change target field.
 * Each change can independently target either the item or the actor.
 */
interface Dnd35eEffectChangeData extends EffectChangeData {
  target: EffectChangeTarget;
  isSystem: boolean;
  /** Optional bonus type for stacking resolution. Only set when stacking applies (Phase 2+). */
  bonusType?: BonusType | null;
  /** Optional formula-familiar condition for action-phase changes. Phase 8+. */
  condition?: string | null;
}

interface ActiveEffectSystemSourceDnd35e extends DocumentSystemData, Omit<ActiveEffectSystemSource, 'changes'> {
  target: ActiveEffectTarget;
  isHidden: boolean;
  changes: Dnd35eEffectChangeData[];
}

interface ActiveEffectSystemData extends ActiveEffectSystemSourceDnd35e {
}

export type {
  ActiveEffectSystemData,
  ActiveEffectSystemSourceDnd35e,
  ActiveEffectTarget,
  Dnd35eEffectChangeData,
};
