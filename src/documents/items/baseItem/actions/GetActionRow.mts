import MeleeAttackActionEditor from '@items/physical/weapon/sheet/components/MeleeAttackActionEditor.vue';
import RangedAttackActionEditor from '@items/physical/weapon/sheet/components/RangedAttackActionEditor.vue';

import type { ActionType } from './constants.mjs';
import { ACTION_TYPE } from './constants.mjs';

const RowLookup: Record<ActionType, any> = {
  [ACTION_TYPE.MELEE]: MeleeAttackActionEditor,
  [ACTION_TYPE.RANGED]: RangedAttackActionEditor,
  // [ACTION_TYPE.SPELL_CAST]: ActionAccordionRow,
};

const getActionRow = (actionType: ActionType) => {
  return RowLookup[actionType];
};

export { getActionRow };
