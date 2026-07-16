import type { ActiveEffectSystemSource, EffectChangeData } from '@common/documents/active-effect.mjs';
import type { BonusType } from '@constants/bonusTypes.mjs';
import type { DocumentSystemData } from '@documents/document/index.mjs';
import type { Dnd35eDocType } from '@documents/types.mjs';
import type { EffectChangeTarget } from '@effects/baseActiveEffect/data/constants.mjs';

type ActiveEffectTarget = 'actor' | 'item';

/**
 * Extended change data that includes the per-change target field.
 * Each change can independently target either the item or the actor.
 */
interface EffectChangeDataDnd35e extends EffectChangeData {
  target: EffectChangeTarget;
  isSystem: boolean;
  /** Optional bonus type for stacking resolution. Only set when stacking applies (Phase 2+). */
  bonusType?: BonusType | null;
  /** Optional formula-familiar condition for action-phase changes. Phase 8+. */
  condition?: string 
    | null 
    | ((target: Dnd35eDocType) => boolean);
}

interface ActiveEffectSystemSourceDnd35e extends DocumentSystemData, Omit<ActiveEffectSystemSource, 'changes'> {
  target: ActiveEffectTarget;
  isHidden: boolean;
  changes: EffectChangeDataDnd35e[];
}

interface ActiveEffectSystemData extends ActiveEffectSystemSourceDnd35e {
}

export type {
  ActiveEffectSystemData,
  ActiveEffectSystemSourceDnd35e,
  ActiveEffectTarget,
  EffectChangeDataDnd35e,
};
