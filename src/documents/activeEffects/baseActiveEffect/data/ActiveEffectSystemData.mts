import type { ActiveEffectSystemSource, EffectChangeData } from '@common/documents/active-effect.mjs';
import type { BonusType } from '@constants/bonusTypes.mjs';
import type { DocumentSystemData } from '@documents/document/index.mjs';
import type { Dnd35eDocType } from '@documents/types.mjs';
import type { EffectChangeTarget } from '@effects/baseActiveEffect/data/constants.mjs';

import type { ActiveEffectDnd35e } from '../index.mjs';

type ActiveEffectTarget = 'actor' | 'item';

/**
 * Extended change data that includes the per-change target field.
 * Each change can independently target either the item or the actor.
 */
interface EffectChangeSourceDnd35e extends EffectChangeData {
  target: EffectChangeTarget;
  isSystem: boolean;
  label?: string;
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
  label?: string;
  changes: EffectChangeSourceDnd35e[];
}

interface EffectChangeDataDnd35e extends EffectChangeSourceDnd35e {
  effect?: ActiveEffectDnd35e<any>;
}

interface ActiveEffectSystemData extends Omit<ActiveEffectSystemSourceDnd35e, 'changes'> {
  changes: EffectChangeDataDnd35e[];
}

export type {
  ActiveEffectSystemData,
  ActiveEffectSystemSourceDnd35e,
  ActiveEffectTarget,
  EffectChangeDataDnd35e,
};
