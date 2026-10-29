import type { RollMode } from '@common/constants.mjs';
import { DEX, STR } from '@constants/abilities.mjs';
import type { WieldedHand } from '@constants/equipmentSlots.mjs';
import { BOTH_HANDS_EQUIP_SLOT } from '@constants/equipmentSlots.mjs';
import type { Size } from '@constants/sizes.mjs';
import { SIZE_REACH } from '@constants/sizes.mjs';
import { isWithinReach } from '@documents/token/logic/reach.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import { ACTION_TYPE, ACTION_TYPES } from '@items/baseItem/actions/constants.mjs';
import { participantActor, participantName, participantToken } from '@items/baseItem/actions/logic/actionParticipant.mjs';
import type { ActionResult } from '@items/baseItem/actions/types.mjs';
import { MeleeAttackRollDialogConfig } from '@source/rollDialogs/MeleeAttackRollDialog/MeleeAttackRollDialogConfig.mjs';
import { buildAttackerSelfAlias } from '@source/rollDialogs/WeaponAttackRollDialog/formulaContexts.mjs';
import type { WeaponAttackRollDialogData, WeaponAttackRollDialogResult, WeaponDamageRollBreakdownData, WeaponRollBreakdownData } from '@source/rollDialogs/WeaponAttackRollDialog/types.mjs';

import { createMeleeCombatModifiers } from '../WeaponAttack/combatModifiers.mjs';
import type { WeaponAttackActionResult } from '../WeaponAttack/types.mjs';
import type { UseWeaponAttackContext } from '../WeaponAttack/types.mjs';
import type { FormulaContext } from '../WeaponAttack/WeaponAttackDataModel.mjs';
import { WeaponAttackDataModel } from '../WeaponAttack/WeaponAttackDataModel.mjs';
import { MELEE_WEAPON_PROPERTIES, MELEE_WEAPON_PROPERTY } from './constants.mjs';
import type { MeleeAttackData, MeleeAttackSourceData } from './MeleeAttackSourceData.mjs';

const {
  fields: {
    NumberField,
    StringField,
    SetField,
  },
} = foundry.data;

class MeleeWeaponAttack extends WeaponAttackDataModel {
  declare readonly _source: MeleeAttackSourceData;
  declare properties: MeleeAttackData['properties'];

  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();
    schema.type = new StringField({
      required: true,
      blank: false,
      choices: [...ACTION_TYPES],
      initial: ACTION_TYPE.MELEE,
      validate: (value: unknown) => value === ACTION_TYPE.MELEE,
    });
    // Same contexts as the base `name` field - only the default text differs.
    schema.name.initial = () => ({
      formula: '#self.name $l(dnd35e.WEAPON.ACTIONS.Type.melee_weapon_attack)',
      resolvedValue: null,
      expectedType: 'string',
    });
    // Total effective reach in squares while the `reach` property is active - only
    // meaningful in combination with it (see `_validateMeleeReach()`). Static `initial`
    // fallback of 1 (Medium's un-doubled reach) is only ever used if a caller creates
    // this DataModel directly without going through `weaponActionSync.mts`, which seeds
    // the real default (double the wielding actor's size-based reach) at creation time
    // - stays editable afterward for homebrew weapons with more than double reach.
    schema.reachLength = new NumberField({
      required: true,
      initial: 1,
      min: 0,
    });
    // Weapon Properties (§10.4) — finesse/reach/threatensAdjacent/nonLethal/nonLethalNoPenalty.
    schema.properties = new SetField(new StringField({ choices: [...MELEE_WEAPON_PROPERTIES] }));
    
    return schema;
  }

  protected override _canExecute(context: UseWeaponAttackContext): WeaponAttackActionResult {
    const superResult = super._canExecute(context);
    if (superResult.cancelled) return superResult;

    const reachResult = this._validateMeleeReach(context);
    superResult.warnings.push(...reachResult.warnings);
    if (reachResult.cancelled) {
      superResult.cancelled = true;
      superResult.reason = reachResult.reason;
    }

    return superResult;
  }

  protected override async _executeCheck(context: UseWeaponAttackContext): Promise<WeaponAttackActionResult> {
    // todo: this requires a feat too, all light weapons are finesse weapons as well,
    // this needs to autocheck in the ui when the attack is auto created for light weapons
    context.attackAbility = this.properties?.has(MELEE_WEAPON_PROPERTY.FINESSE)
      ? DEX
      : STR;
    const superResult = await super._executeCheck(context);
    if (superResult.cancelled) return superResult;

    return superResult;
  }

  protected override _getDamageAbilityWieldModifier(hand: WieldedHand): number {
    return hand === BOTH_HANDS_EQUIP_SLOT
      ? 1.5
      : super._getDamageAbilityWieldModifier(hand);
  }

  protected override async _resolveAttackRollDialog(
    context: UseWeaponAttackContext,
    formulaContext: FormulaContext,
    targetToken: TokenDnd35e | undefined,
    attackRoll: WeaponRollBreakdownData,
    damageRoll: WeaponDamageRollBreakdownData,
    resolvedName: string | null,
    weaponNonLethalDefault: boolean,
    nonLethalNoPenalty: boolean
  ): Promise<WeaponAttackRollDialogResult | null> {
    const combatModifierToggles = createMeleeCombatModifiers(context.actor, targetToken, weaponNonLethalDefault, nonLethalNoPenalty, this.item);
    
    // const rollAttackToHit = game.i18n.localize('dnd35e.ROLL.RollAttackToHit');
    const title = resolvedName
      ?? game.i18n.format('dnd35e.ROLL.RollAttackTitle', { weapon: this.item?.name });

    const dialogData: WeaponAttackRollDialogData = {
      title,
      rollMode: game.settings.get('core', 'messageMode') as RollMode,
      actor: participantActor(context.actor),
      target: context.target?.map(participantActor) || null,
      targetToken: targetToken ?? null,
      wieldedHand: context.wieldedHand,
      handBab: context.handBab,
      attackRoll,
      damageRoll,
      combatModifierToggles,
    };

    const formulaContexts = FormulaData.buildFamiliarSchema(formulaContext, [], buildAttackerSelfAlias());
    if (formulaContexts.target) {
      formulaContexts.target = { ...formulaContexts.target, display: game.i18n.localize('dnd35e.ROLL.Defender') };
    }
    return await MeleeAttackRollDialogConfig.roll(dialogData, formulaContext, formulaContexts);
  }
  
  /**
   * Melee reach validation (§10.5/§10.10) — only applies to actions with no `range`
   * block (ranged/thrown actions use range increments instead, handled by Story D/F).
   * Self-contained: no dependency on the Attack Roll Dialog. Only reports/blocks on
   * reach when both sides resolve to an actual placed token — a token-less participant
   * (§10.7 fallback) has no position to check, so that target is silently assumed to be
   * in reach rather than blocked or warned about.
   */
  private _validateMeleeReach(context: UseWeaponAttackContext): ActionResult {
    const result: ActionResult = { cancelled: false, warnings: [], reason: 'success' };

    const attackerToken = participantToken(context.actor);
    const attackerActor = participantActor(context.actor);
    const hasReach = this.properties?.has(MELEE_WEAPON_PROPERTY.REACH) ?? false;
    const threatensAdjacent = this.properties?.has(MELEE_WEAPON_PROPERTY.THREATENS_ADJACENT) ?? false;
    const baseReach = SIZE_REACH[attackerActor.system.size as Size] ?? 1;
    // `reachLength` is authored as the weapon's total effective reach (defaults to
    // double the wielder's size at creation - see weaponActionSync.mts - but stays
    // editable for homebrew reach weapons longer than the standard double).
    const effectiveReach = hasReach ? this.reachLength : baseReach;

    for (const targetParticipant of context.target ?? []) {
      const targetToken = participantToken(targetParticipant);
      if (!attackerToken || !targetToken) continue;

      if (!isWithinReach(attackerToken, targetToken, effectiveReach)) {
        ui.notifications.warn(game.i18n.format('dnd35e.COMBAT.TargetOutOfReach', { target: participantName(targetParticipant) }));
        result.cancelled = true;
        result.reason = 'outOfReach';
        return result;
      }
      if (hasReach && !threatensAdjacent && isWithinReach(attackerToken, targetToken, baseReach)) {
        ui.notifications.warn(game.i18n.format('dnd35e.COMBAT.TargetTooCloseForReach', { target: participantName(targetParticipant) }));
        result.cancelled = true;
        result.reason = 'reachDeadZone';
        return result;
      }
    }

    return result;
  }
}
interface MeleeWeaponAttack extends WeaponAttackDataModel,
  MeleeAttackData {}

export {
  MeleeWeaponAttack,
};