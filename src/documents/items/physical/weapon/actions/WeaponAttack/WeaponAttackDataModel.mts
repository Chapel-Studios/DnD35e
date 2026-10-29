import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import { detectWieldedHand, getWieldModeMismatchReason } from '@actors/baseActor/logic/wieldMode.mjs';
import { Creature } from '@actors/creature/index.mjs';
import { buildRollDefenseDialogData } from '@actors/creature/logic/buildRollDefenseDialogData.mjs';
import { applyChargedAE, applyDefensiveFightingAE } from '@actors/creature/logic/combatConditionAEs.mjs';
import { DAMAGE_TYPE_SLASHING } from '@constants/attacks/damageTypes.mjs';
import type { WieldedHand } from '@constants/equipmentSlots.mjs';
import { BOTH_HANDS_EQUIP_SLOT, MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT, WIELD_HANDS } from '@constants/equipmentSlots.mjs';
import { DAMAGE_TYPES, SIZE_MODIFIERS, STR } from '@constants/index.mjs';
import { canUseHandAttack, getActionEconomy, getHandBab, isCombatEconomyActive, markMovedAfterAttack, setTwoWeaponFightingChoice, spendAttackAction, spendHandBab } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { CombatDnd35e } from '@documents/combat/CombatDnd35e.mjs';
import type { TokenDocumentDnd35e } from '@documents/scene/tokenDocument/TokenDocumentDnd35e.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import { EFFECT_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import type { DocumentContext } from '@helpers/formulae/index.mjs';
import { FormulaData } from '@helpers/formulae/index.mjs';
import type { FormulaContextDeclaration } from '@helpers/formulae/types.mjs';
import { buildDocumentDataMap } from '@helpers/formulae/utils.mjs';
import { formatBonusTypeLabel, parseNumericChangeValue, STACK_RESULT_IGNORED } from '@helpers/stacking.mjs';
import { ActionDataModel } from '@items/baseItem/actions/ActionDataModel.mjs';
import type { ActionParticipant } from '@items/baseItem/actions/logic/actionParticipant.mjs';
import { participantActor, participantToken } from '@items/baseItem/actions/logic/actionParticipant.mjs';
import { COMBAT_KEYS } from '@settings/combat/constants.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import { syncMovementCardSpend } from '@source/dice/chatCards/moveActionCard/moveActionCard.mjs';
import { evaluateDefense } from '@source/dice/chatCards/resolutionCard/evaluateDefense.mjs';
import type { AttackCardFlags, AttackCardTargetRow, ResolutionCardData, RollModifier } from '@source/dice/index.mjs';
import { appendAttackCardWarnings, buildActionChainId, buildAttackCard, buildOverridesModifierList, buildResolutionCard, D20Roll, DamageRoll, extractFlatModifier, flavorDamageDiceBySource, groupDamageDiceBySource, markTargetRowResolved } from '@source/dice/index.mjs';
import { buildModifiersD20Formula, buildModifiersDamageFormula, getModifiersFormula } from '@source/dice/rollModifiers.mjs';
import type { WeaponDamageRollModifier } from '@source/dice/types.mjs';
import { RollDefenseDialogConfig } from '@source/rollDialogs/RollDefenseDialog/RollDefenseDialogConfig.mjs';
import type { AttackRollDialogResult, WeaponDamageRollBreakdownData, WeaponRollBreakdownData } from '@source/rollDialogs/WeaponAttackRollDialog/types.mjs';

import type { Weapon } from '../../Weapon.mjs';
import { WEAPON_PROPERTIES, WEAPON_PROPERTY } from './constants.mjs';
import type { UseWeaponAttackContext, WeaponAttackActionResult } from './types.mjs';
import type { WeaponAttackData, WeaponAttackSourceData } from './WeaponAttackSourceData.mjs';

const { BooleanField, NumberField, StringField, SetField } = foundry.data.fields;

export interface FormulaContext {
  actor: ACTORS_DND35E;
  item: Weapon;
  thisAttack: WeaponAttackDataModel;
  target: ACTORS_DND35E | null;
  self: ACTORS_DND35E;
  weapon: Weapon;
  [key: string]: DocumentContext;
}

abstract class WeaponAttackDataModel extends ActionDataModel<WeaponAttackActionResult> {
  declare readonly _source: WeaponAttackSourceData;
  isTargetRequired = true;
  
  // General
  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();
    schema.requiresEquipped = new BooleanField({ required: true, initial: true });
    const contexts: FormulaContextDeclaration[] = [
      { contextName: 'Actor', resolvePath: 'item.actor', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['self'] },
      { contextName: 'Item', resolvePath: 'item', documentType: 'Item', fallbackSubtypes: ['weapon'], aliases: ['item', 'weapon'] },
    ];
    schema.attackFormula = new FormulaField({ expectedType: 'rollFormula', contexts, initialFormula: '0' });
    schema.damageFormula = new FormulaField({ expectedType: 'rollFormula', contexts, initialFormula: '$scaleDamage(1d4)' });
    schema.damageType = new StringField({ choices: [...DAMAGE_TYPES], initial: DAMAGE_TYPE_SLASHING, required: true });
    schema.critRange = new NumberField({ required: true, initial: 20, integer: true, min: 2, max: 20 });
    schema.critMultiplier = new NumberField({ required: true, initial: 2, integer: true });
    schema.properties = new SetField(new StringField({ choices: [...WEAPON_PROPERTIES] }));
    return schema;
  }

  override get item(): Weapon | undefined {
    return super.item as Weapon | undefined;
  }

  /**
   * Rule-violation notices for the attack card (poc.10 §10.7 follow-up) — surfaced even though
   * the dialog already let the override through, so the GM notices a RAW-illegal Wield Mode or
   * an exhausted BAB pool even if the acting player missed/ignored the dialog's live preview.
   */
  private _buildWieldModeWarnings(context: UseWeaponAttackContext, item: Weapon): string[] {
    const warnings: string[] = [];
    if (isCombatEconomyActive(this.getCombatant(context)) && !context.isFree && context.availableBab <= 0) {
      warnings.push(game.i18n.localize('dnd35e.COMBAT.WieldMode.InsufficientBab'));
    }
    const mismatch = getWieldModeMismatchReason(participantActor(context.actor), item, context.wieldedHand);
    if (mismatch) warnings.push(game.i18n.localize(mismatch));
    return warnings;
  }

  // `requiresEquipped` is enforced only as HUD-entry eligibility (tokenHudActions.mts) — the
  // sheet's Actions tab intentionally allows firing this action regardless of equip state
  // (§10.11), so execution itself never re-gates on it here.
  // Can execute
  protected override _canExecute(context: UseWeaponAttackContext): WeaponAttackActionResult {
    const combatant = this.getCombatant(context);
    
    if (
      !!combatant
      && isCombatEconomyActive(combatant)
      && !context.isFree
      && !canUseHandAttack(combatant, context.wieldedHand)
    ) {
      ui.notifications.warn(game.i18n.localize('dnd35e.COMBAT.NoActionAvailable'));
      return {
        cancelled: true, // todo: this should be based on a user setting to warn / block or silently allow this
        reason: 'noActionAvailable',
        warnings: [],
      };
    }

    return super._canExecute(context);
  }

  protected async _resolveAttackRollDialog(
    _context: UseWeaponAttackContext,
    _formulaContext: FormulaContext,
    _targetToken: TokenDnd35e | undefined,
    _attackRoll: WeaponRollBreakdownData,
    _damageRoll: WeaponDamageRollBreakdownData,
    _resolvedName: string | null,
    _weaponNonLethalDefault: boolean,
    _nonLethalNoPenalty: boolean
  ): Promise<AttackRollDialogResult | null> {
    return null;
  }

  private _formulaPath(field: 'attackFormula' | 'damageFormula'): string {
    const index = this.item?.system.actions.findIndex(action => action._id === this._id) ?? -1;
    return `system.actions.${index}.${field}.formula`;
  }

  private _resolveFormula(field: 'attackFormula' | 'damageFormula', context: FormulaContext): string {
    const resolved = FormulaData.resolveSource<string>(this[field], context);
    if (resolved === null) throw new Error(`Unable to resolve ${field} for action ${this._id}`);
    return resolved || '0';
  }

  private _buildFormulaBreakdown(field: 'attackFormula' | 'damageFormula', context: FormulaContext, label: string, resolved: string) {
    const path = this._formulaPath(field);
    const overrides = (context.item.effectOverrides[path] ?? []).map(override => {
      const value = FormulaData.resolveSource<string>(
        FormulaData.toSource(String(override.value), { expectedType: 'rollFormula' }), context
      );
      if (value === null) throw new Error(`Unable to resolve ${field} history for action ${this._id}`);
      return { ...override, value };
    });
    const diceOverrides = overrides.filter(override => override.stackResult !== STACK_RESULT_IGNORED)
      .map(override => ({ effectName: override.effectName, value: String(override.value) }));
    const source = FormulaData.resolveSource<string>(this._source[field], context);
    if (source === null) throw new Error(`Unable to resolve source ${field} for action ${this._id}`);
    const baseFlat = extractFlatModifier(source || '0').flat;
    return {
      diceOverrides,
      breakdown: [
        ...groupDamageDiceBySource(resolved, label, diceOverrides).map(entry => ({ ...entry, value: 0 })),
        ...(baseFlat ? [{ label, value: baseFlat }] : []),
        ...buildOverridesModifierList({ effectOverrides: { [path]: overrides } }, path),
        ...overrides.filter(override => override.stackResult !== STACK_RESULT_IGNORED && Number.isNaN(parseNumericChangeValue(override.value)))
          .map(override => ({
            label: override.effectName,
            value: extractFlatModifier(override.value).flat * (override.type === EFFECT_CHANGE_TYPE.SUBTRACT ? -1 : 1),
            bonusTypeLabel: formatBonusTypeLabel(override.bonusType),
          })).filter(entry => entry.value !== 0),
        ...overrides.filter(override => override.stackResult === STACK_RESULT_IGNORED && Number.isNaN(parseNumericChangeValue(override.value)))
          .map(override => ({
            label: override.effectName, value: 0, formula: String(override.value), isIgnored: true,
            ignoredReason: override.stackReason ?? game.i18n.localize('dnd35e.EFFECT.StackResult.Ignored'),
          })),
      ],
    };
  }

  private _buildAttackData(context: UseWeaponAttackContext, formulaContext: FormulaContext, attackName: string): WeaponRollBreakdownData {
    const actor = participantActor(context.actor);

    const resolved = this._resolveFormula('attackFormula', formulaContext);
    const { flat, hasDice } = extractFlatModifier(resolved);
    const weaponBonus: RollModifier = {
      id: 'weaponAttack',
      label: attackName,
      value: flat,
      ...(hasDice ? { formula: resolved } : {}),
      breakdown: this._buildFormulaBreakdown('attackFormula', formulaContext, attackName, resolved).breakdown,
    };

    const ability = game.i18n.localize(`dnd35e.ABILITY.${context.attackAbility}.abbr`);
    const modifiersForHand = (hand: WieldedHand): RollModifier[] => [
      { id: 'bab', label: game.i18n.localize('dnd35e.COMBAT.BaseAttackBonus'), value: context.handBab[hand] },
      { id: 'ability', label: game.i18n.format('dnd35e.COMBAT.AbilityModifier', { ability }), value: actor.system.abilities[context.attackAbility].mod },
      ...(SIZE_MODIFIERS[actor.system.size] ? [{ id: 'size', label: game.i18n.localize('dnd35e.COMBAT.SizeModifier'), value: SIZE_MODIFIERS[actor.system.size] }] : []),
      weaponBonus,
    ];

    return {
      label: game.i18n.localize('dnd35e.ROLL.RollAttackToHit'),
      situationalModifier: context.attackSituationalModifier,
      immutableModifiersByHand: {
        mainHand: modifiersForHand(MAIN_HAND_EQUIP_SLOT),
        offHand: modifiersForHand(OFF_HAND_EQUIP_SLOT),
        bothHands: modifiersForHand(BOTH_HANDS_EQUIP_SLOT),
      },
    };
  }

  protected _getDamageAbilityWieldModifier(hand: WieldedHand): number {
    return hand === OFF_HAND_EQUIP_SLOT ? 0.5 : 1;
  }

  protected _usesDamageAbility(): boolean {
    return true;
  }

  private _buildDamageData(context: UseWeaponAttackContext, formulaContext: FormulaContext): WeaponDamageRollBreakdownData {
    const resolved = this._resolveFormula('damageFormula', formulaContext);
    const label = formulaContext.item.name;
    const { diceOverrides, breakdown } = this._buildFormulaBreakdown('damageFormula', formulaContext, label, resolved);
    const { formula, exemptDiceIndices } = flavorDamageDiceBySource(resolved, label, diceOverrides);
    const flat = extractFlatModifier(resolved).flat;
    const weaponDamage: WeaponDamageRollModifier = {
      id: 'weaponDamage', label, value: flat, formula, exemptDiceIndices,
      breakdown,
    };
    const modifiersForHand = (hand: WieldedHand): WeaponDamageRollModifier[] => {
      if (!this._usesDamageAbility()) return [weaponDamage];
      const multiplier = this._getDamageAbilityWieldModifier(hand);
      const ability = game.i18n.localize(`dnd35e.ABILITY.${context.damageAbility}.abbr`);
      const abilityLabel = game.i18n.format('dnd35e.COMBAT.AbilityModifier', { ability });
      const abilityValue = Math.floor(formulaContext.actor.system.abilities[context.damageAbility].mod * multiplier);

      return [
        weaponDamage,
        {
          id: 'damageAbility',
          label: multiplier === 1
            ? abilityLabel
            : `${abilityLabel} x${multiplier}`,
          value: abilityValue,
        },
      ];
    };

    return {
      label: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.ExpectedDamage'),
      situationalModifier: context.damageSituationalModifier,
      immutableModifiersByHand: {
        mainHand: modifiersForHand(MAIN_HAND_EQUIP_SLOT),
        offHand: modifiersForHand(OFF_HAND_EQUIP_SLOT),
        bothHands: modifiersForHand(BOTH_HANDS_EQUIP_SLOT),
      },
    };
  }

  protected override async _executeCheck(context: UseWeaponAttackContext): Promise<WeaponAttackActionResult> {
    const cancelled: WeaponAttackActionResult = { cancelled: true, reason: '', warnings: [] };
    
    const item = this.item;
    if (!item) return { ...cancelled, reason: 'noItem' };

    const actor = participantActor(context.actor);
    const targetParticipant = context.target?.[0];
    const formulaContext: FormulaContext = {
      actor,
      item,
      thisAttack: this,
      target: targetParticipant
        ? participantActor(targetParticipant)
        : null,
      self: actor,
      weapon: item,
    };

    const resolvedName = FormulaData.resolveSource<string>(this.name, formulaContext);
    const attackName = resolvedName ?? item.name;
    const nonLethalDefault = this.properties?.has(WEAPON_PROPERTY.NON_LETHAL) ?? false;
    const targetToken = targetParticipant
      ? participantToken(targetParticipant)
        ?? undefined
      : undefined;
    
    const dialog = await this._resolveAttackRollDialog(
      context,
      formulaContext,
      targetToken,
      this._buildAttackData(context, formulaContext, attackName),
      this._buildDamageData(context, formulaContext),
      resolvedName,
      nonLethalDefault,
      this.properties?.has(WEAPON_PROPERTY.NON_LETHAL_NO_PENALTY)
        ?? false
    );
    if (!dialog) return { ...cancelled, reason: 'dialogCancelled' };

    context.wieldedHand = dialog.wieldMode;
    context.availableBab = context.handBab[dialog.wieldMode];

    const chosen = (id: string) => dialog.combatModifiers
      .find(mod => mod.id === id)
      ?.checked;

    const isNonLethal = chosen('nonLethal')
      ?? nonLethalDefault;
    if (chosen('charge')) await applyChargedAE(actor);
    if (chosen('defensiveFighting')) await applyDefensiveFightingAE(actor);
    
    const combatant = this.getCombatant(context);
    if (combatant && chosen('twoWeaponFighting') !== undefined) {
      await setTwoWeaponFightingChoice(combatant, chosen('twoWeaponFighting')!);
    }

    const { formula, displayFormula } = buildModifiersD20Formula(dialog.attackModifiers, attackName);
    
    const attackRoll = new D20Roll(
      formula,
      {},
      {
        situationalModifiers: dialog.attackModifiers,
        displayFormula,
      }
    );
    await attackRoll.evaluate();

    const critConfirmRoll = attackRoll.isCriticalThreat(this.critRange)
      ? await attackRoll.rollConfirmation()
      : null;

    const damage = buildModifiersDamageFormula(dialog.damageModifiers);

    const targetRows: AttackCardTargetRow[] = (context.target ?? []).map(participant => {
      const target = participantActor(participant);
      const token = participantToken(participant) ?? target.getActiveTokens()[0] as TokenDnd35e | undefined;
      return { actorUuid: target.uuid, tokenUuid: token?.document.uuid ?? null, targetImage: target.img ?? '', resolved: false, hit: null };
    });
    const flags: AttackCardFlags = {
      actionChainId: buildActionChainId(actor, this),
      attackerTokenUuid: participantToken(context.actor)?.document.uuid ?? null,
      attackerImage: actor.img ?? '',
      weaponName: attackName,
      hand: dialog.wieldMode,
      nonLethal: isNonLethal,
      damageModifiers: dialog.damageModifiers,
      resolvedDamageFormula: damage.formula,
      damageExemptDiceIndices: damage.exemptDiceIndices,
      damageBonusTerm: '',
      damageModifierList: dialog.damageModifiers,
      expectedDamageModifierList: dialog.damageModifiers,
      expectedDamageFormula: getModifiersFormula(dialog.damageModifiers),
      critRange: this.critRange,
      critMultiplier: this.critMultiplier,
      critConfirmTotal: critConfirmRoll?.total ?? null,
      damageType: this.damageType,
      targets: targetRows,
      actionEconomySpent: null,
      modifierList: dialog.attackModifiers,
      warnings: this._buildWieldModeWarnings(context, item),
    };
    const attackMessage = await buildAttackCard(
      actor,
      attackRoll,
      dialog.attackModifiers,
      flags,
      dialog.rollMode,
      critConfirmRoll
    );

    return {
      cancelled: false,
      reason: '',
      warnings: [],
      attackTotal: attackRoll.total,
      nonLethal: isNonLethal,
      finalHand: dialog.wieldMode,
      twoWeaponFighting: chosen('twoWeaponFighting')
        ?? false,
      attackMessage,
    };
  }

  protected async _postExecute(context: UseWeaponAttackContext, result: WeaponAttackActionResult): Promise<void> {
    if (result.attackMessage) await appendAttackCardWarnings(result.attackMessage, result.warnings);
    const combatant = this.getCombatant(context);
    if (!isCombatEconomyActive(combatant) || result.cancelled || context.isFree) return;
    const charged = getActionEconomy(combatant!).used.chargedThisTurn;
    const actionSpent = charged ? { standardActionSpent: false } : await spendAttackAction(combatant!);
    if (!actionSpent) {
      const warning = game.i18n.localize('dnd35e.COMBAT.NoActionAvailable');
      ui.notifications.warn(warning);
      if (result.attackMessage) await appendAttackCardWarnings(result.attackMessage, [warning]);
      return;
    }
    await syncMovementCardSpend(combatant!);
    const spentHand = charged || !result.twoWeaponFighting
      ? BOTH_HANDS_EQUIP_SLOT
      : result.finalHand ?? context.wieldedHand;
    const babSpent = charged ? participantActor(context.actor).system.bab : 5;
    await spendHandBab(combatant!, spentHand, babSpent);
    if (result.attackMessage) {
      await result.attackMessage.update({
        'flags.dnd35e.attackCard.actionEconomySpent': { ...actionSpent, hand: spentHand, babSpent },
      });
    }
    if (charged) await markMovedAfterAttack(combatant!);
  }

  override async _continue(_stepId: string, message: ChatMessage, targetId: string): Promise<WeaponAttackActionResult> {
    const cancelled: WeaponAttackActionResult = { cancelled: true, reason: '', warnings: [] };
    const flags = message.getFlag(SYSTEM_ID, 'attackCard') as AttackCardFlags | undefined;
    if (!flags) return { ...cancelled, reason: 'noAttackCard' };
    const targetActor = foundry.utils.fromUuidSync(targetId) as ACTORS_DND35E | null;
    const attackerActor = this.item?.actor as ACTORS_DND35E | undefined;
    if (!targetActor || !attackerActor) return { ...cancelled, reason: 'missingActorOrTarget' };
    const playerSelfDefense = !!game.settings.get(SYSTEM_ID, COMBAT_KEYS.PLAYER_SELF_DEFENSE);
    if (!(game.user?.isGM || (playerSelfDefense && targetActor.isOwner))) {
      ui.notifications.warn(game.i18n.localize('dnd35e.COMBAT.NotYourTurnToDefend'));
      return { ...cancelled, reason: 'notPermitted' };
    }
    const targetRow = flags.targets.find(row => row.actorUuid === targetId);
    const attackerToken = flags.attackerTokenUuid
      ? (foundry.utils.fromUuidSync(flags.attackerTokenUuid) as TokenDocumentDnd35e | null)?.object as TokenDnd35e | undefined
      : undefined;
    const targetToken = targetRow?.tokenUuid
      ? (foundry.utils.fromUuidSync(targetRow.tokenUuid) as TokenDocumentDnd35e | null)?.object as TokenDnd35e | undefined
      : undefined;
    const attacker: ActionParticipant = attackerToken ?? attackerActor;
    const target: ActionParticipant = targetToken ?? targetActor;
    const damageModifiers = flags.damageModifiers;
    const dialogData = buildRollDefenseDialogData(target, attacker, {
      label: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.ExpectedDamage'),
      formula: damageModifiers ? getModifiersFormula(damageModifiers) : flags.expectedDamageFormula,
      modifierList: damageModifiers ?? flags.expectedDamageModifierList,
    });
    const formulaContext = buildDocumentDataMap(dialogData.actor, { attacker: dialogData.attacker });
    const schema = FormulaData.buildFamiliarSchema(formulaContext, [], {
      term: 'defender', label: game.i18n.localize('dnd35e.Formula.Context.Defender'),
    });
    const dialog = await RollDefenseDialogConfig.roll(dialogData, formulaContext, schema);
    if (!dialog) return { ...cancelled, reason: 'dialogCancelled' };
    const attackRoll = message.rolls[0] as D20Roll | undefined;
    const evaluation = await evaluateDefense(
      attackRoll?.total ?? 0, attackRoll?.isCriticalThreat(flags.critRange) ?? false, flags.critConfirmTotal, dialog
    );
    let damageRoll: DamageRoll | null = null;
    if (evaluation.hit) {
      const damage = damageModifiers ? buildModifiersDamageFormula(damageModifiers) : {
        formula: `${flags.resolvedDamageFormula}${flags.damageBonusTerm}`, exemptDiceIndices: flags.damageExemptDiceIndices,
      };
      damageRoll = new DamageRoll(damage.formula);
      await damageRoll.evaluateCritical(evaluation.criticalHit ? flags.critMultiplier : 1, damage.exemptDiceIndices);
    }
    const resolutionData: ResolutionCardData = {
      ...evaluation, attackName: flags.weaponName, checkMode: dialog.checkMode,
      damageType: flags.damageType, nonLethal: flags.nonLethal, applyHalfDamage: dialog.applyHalfDamage,
      actionEconomySpent: flags.actionEconomySpent, damageModifierList: damageModifiers ?? flags.damageModifierList,
    };
    await buildResolutionCard(attacker, target, resolutionData, damageRoll);
    await markTargetRowResolved(message, flags, targetId, evaluation.hit);
    
    return {
      cancelled: false,
      reason: '',
      warnings: [],
      hit: evaluation.hit,
      criticalHit: evaluation.criticalHit,
    };
  }

  public static PrepareActionContext(attacker: ActionParticipant, item: Weapon, targets: ActionParticipant[], isFree?: boolean): UseWeaponAttackContext | null {
    const actor = participantActor(attacker);
    if (!actor || !(actor instanceof Creature) || !item) return null;
    const hand = detectWieldedHand(actor, item);
    if (!hand) return null;
    const token = participantToken(attacker);
    const combatant = token ? game.combat?.getCombatantsByToken(token.id)[0] as CombatantDnd35e<CombatDnd35e> | undefined : undefined;
    const handBab = {
      [MAIN_HAND_EQUIP_SLOT]: actor.system.bab,
      [OFF_HAND_EQUIP_SLOT]: actor.system.bab,
      [BOTH_HANDS_EQUIP_SLOT]: actor.system.bab,
    };
    if (isCombatEconomyActive(combatant)) {
      for (const wieldedHand of WIELD_HANDS) handBab[wieldedHand] = getHandBab(combatant!, wieldedHand);
    }
    return {
      actor: attacker, target: targets, wieldedHand: hand, isFree: !!isFree, availableBab: handBab[hand], handBab,
      attackSituationalModifier: '', damageSituationalModifier: '', attackAbility: STR, damageAbility: STR,
    };
  }
}

interface WeaponAttackDataModel extends ActionDataModel<WeaponAttackActionResult>, WeaponAttackData {}

export { WeaponAttackDataModel };
