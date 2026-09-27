/**
 * Builds the Roll Defense Dialog's input data (poc.10 Story E, §10.7) — called from
 * `WeaponAttackDataModel#_continue()`'s `'damage'` case, once per clicked target row.
 * `target` is the defender (the base `RollDialogData.actor`); `attacker` is surfaced
 * separately for the dialog's secondary header slot.
 *
 * @module
 */
import type { ActionParticipant } from '@items/baseItem/actions/logic/actionParticipant.mjs';
import { participantActor, participantToken } from '@items/baseItem/actions/logic/actionParticipant.mjs';
import type { RollDefenseDialogData } from '@source/rollDialogs/RollDefenseDialog/types.mjs';
import { COVERED_STATES } from '@source/rollDialogs/RollDefenseDialog/types.mjs';
import { markRaw } from 'vue';

import { createDefenseCombatModifiers } from './defenseCombatModifiers.mjs';

function buildRollDefenseDialogData(
  target: ActionParticipant,
  attacker: ActionParticipant
): RollDefenseDialogData {
  const targetActor = participantActor(target);
  const attackerActor = participantActor(attacker);
  const resolvedAttackerToken = participantToken(attacker) ?? undefined;

  return {
    title: game.i18n.localize('dnd35e.COMBAT.RollDefenseTitle'),
    baseLabel: game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.armorClass.label'),
    baseTotal: targetActor.system.defense.armorClass,
    rollMode: game.settings.get('core', 'rollMode') as string,
    actor: targetActor,
    attacker: markRaw(attackerActor),
    attackerToken: resolvedAttackerToken ? markRaw(resolvedAttackerToken) : null,
    combatModifierToggles: createDefenseCombatModifiers(targetActor),
    concealment: '',
    covered: COVERED_STATES.NONE,
    situationalModifier: '',
    checkMode: 'normal',
    baseTotalByMode: {
      normal: targetActor.system.defense.armorClass,
      touch: targetActor.system.defense.touchAC,
    },
  };
}

export { buildRollDefenseDialogData };
