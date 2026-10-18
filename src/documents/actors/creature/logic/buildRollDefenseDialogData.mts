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
import type { RollModifier } from '@source/dice/index.mjs';
import { buildOverridesModifierList } from '@source/dice/index.mjs';
import type { RollDefenseDialogData } from '@source/rollDialogs/RollDefenseDialog/types.mjs';
import { COVERED_STATES } from '@source/rollDialogs/RollDefenseDialog/types.mjs';
import { markRaw } from 'vue';

import { createDefenseCombatModifiers } from './defenseCombatModifiers.mjs';

/**
 * Attacker's already-computed expected-damage preview, handed in by the caller (the attack
 * card's `expectedDamageFormula`/`expectedDamageModifierList` flags) rather than recomputed
 * here \u2014 keeps this module decoupled from `attackRollCard.mts`'s `AttackCardFlags` shape.
 */
interface AttackerDamagePreview {
  label: string;
  formula: string;
  modifierList: RollModifier[];
}

function buildRollDefenseDialogData(
  target: ActionParticipant,
  attacker: ActionParticipant,
  damagePreview: AttackerDamagePreview
): RollDefenseDialogData {
  const targetActor = participantActor(target);
  const attackerActor = participantActor(attacker);
  const resolvedAttackerToken = participantToken(attacker) ?? undefined;

  const acLabel = game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.armorClass.label');
  const touchAcLabel = game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.touchAC.label');
  const baseModifierListByMode = {
    normal: buildOverridesModifierList(targetActor, 'system.defense.armorClass', acLabel, targetActor.system.defense.armorClass),
    touch: buildOverridesModifierList(targetActor, 'system.defense.touchAC', touchAcLabel, targetActor.system.defense.touchAC),
  };

  return {
    title: game.i18n.localize('dnd35e.COMBAT.RollDefenseTitle'),
    baseLabel: acLabel,
    baseTotal: targetActor.system.defense.armorClass,
    baseModifierList: baseModifierListByMode.normal,
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
    baseModifierListByMode,
    defenderDenyDexToAC: targetActor.system.defense.denyDexToAC,
    defenderDexMod: targetActor.system.abilities.dex.mod,
    damageLabel: damagePreview.label,
    damageTotalFormula: damagePreview.formula,
    damageModifierList: damagePreview.modifierList,
  };
}

export { buildRollDefenseDialogData };

