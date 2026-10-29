/**
 * Builds the Roll Defense Dialog's input data (poc.10 Story E, §10.7) — called from
 * `WeaponAttackDataModel#_continue()`'s `'damage'` case, once per clicked target row.
 * `target` is the defender (the base `RollDialogData.actor`); `attacker` is surfaced
 * separately for the dialog's secondary header slot.
 *
 * @module
 */
import type { RollMode } from '@common/constants.mjs';
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
  const defenseRollByMode = {
    normal: {
      label: acLabel,
      immutableModifiers: [{
        label: acLabel,
        value: targetActor.system.defense.armorClass,
        breakdown: buildOverridesModifierList(targetActor, 'system.defense.armorClass'),
      }],
    },
    touch: {
      label: touchAcLabel,
      immutableModifiers: [{
        label: touchAcLabel,
        value: targetActor.system.defense.touchAC,
        breakdown: buildOverridesModifierList(targetActor, 'system.defense.touchAC'),
      }],
    },
  };

  return {
    title: game.i18n.localize('dnd35e.COMBAT.RollDefenseTitle'),
    rollMode: game.settings.get('core', 'messageMode') as RollMode,
    actor: targetActor,
    attacker: markRaw(attackerActor),
    attackerToken: resolvedAttackerToken ? markRaw(resolvedAttackerToken) : null,
    combatModifierToggles: createDefenseCombatModifiers(targetActor),
    // Pre-filled from the target's base concealment (set by buffs/conditions like Blur or
    // Displacement via AE, mirrors D35E's `attributes.concealment.total`) — still editable/
    // stackable through the FormulaFamiliar field, and `evaluateDefense()` re-applies this same
    // base value via `Math.max()` so it's never lost even if the field is cleared.
    concealment: targetActor.system.defense.concealment > 0 ? String(targetActor.system.defense.concealment) : '',
    covered: COVERED_STATES.NONE,
    situationalModifier: '',
    checkMode: 'normal',
    defenseRollByMode,
    defenderDenyDexToAC: targetActor.system.defense.denyDexToAC,
    defenderDexMod: targetActor.system.abilities.dex.mod,
    damageLabel: damagePreview.label,
    damageTotalFormula: damagePreview.formula,
    damageModifierList: damagePreview.modifierList,
  };
}

export { buildRollDefenseDialogData };
