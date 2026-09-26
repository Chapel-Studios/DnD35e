import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import { detectWieldedHand, getWeaponAttackActionAbilityModTerm, getWieldModeMismatchReason } from '@actors/baseActor/logic/wieldMode.mjs';
import { Creature } from '@actors/creature/index.mjs';
import { applyChargedAE, applyDefensiveFightingAE } from '@actors/creature/logic/combatConditionAEs.mjs';
import { DAMAGE_TYPE_SLASHING } from '@constants/attacks/damageTypes.mjs';
import type { WieldedHand } from '@constants/equipmentSlots.mjs';
import { BOTH_HANDS_EQUIP_SLOT, MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT } from '@constants/equipmentSlots.mjs';
import { DAMAGE_TYPES, SIZE_MODIFIERS, STR } from '@constants/index.mjs';
import { canUseHandAttack, getActionEconomy, getHandBab, markMovedAfterAttack, spendAction, spendHandBab } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { CombatDnd35e } from '@documents/combat/CombatDnd35e.mjs';
import { getActorToken } from '@documents/token/logic/getActorToken.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import type { DocumentContext } from '@helpers/formulae/index.mjs';
import { FormulaData } from '@helpers/formulae/index.mjs';
import { ActionDataModel } from '@items/baseItem/actions/ActionDataModel.mjs';
import { ACTION_TYPE } from '@items/baseItem/actions/constants.mjs';
import { getTwoWeaponFightingPenalty } from '@items/physical/weapon/logic/twoWeaponFighting.mjs';
import type { AttackCardFlags, AttackCardTargetRow, RollModifier } from '@source/dice/index.mjs';
import {
  appendAttackCardWarnings,
  buildActionChainId,
  buildAttackCard,
  D20Roll,
  extractFlatModifier,
  flavorTerm,
} from '@source/dice/index.mjs';
import { MeleeAttackRollDialogConfig } from '@source/rollDialogs/MeleeAttackRollDialog/MeleeAttackRollDialogConfig.mjs';
import { RangedAttackRollDialogConfig } from '@source/rollDialogs/RangedAttackRollDialog/RangedAttackRollDialogConfig.mjs';
import type { AttackRollDialogResult, WeaponAttackRollDialogData } from '@source/rollDialogs/WeaponAttackRollDialog/types.mjs';
import { markRaw } from 'vue';

import type { Weapon } from '../../Weapon.mjs';
import { createCombatModifiers } from './combatModifiers.mjs';
import { WEAPON_PROPERTIES, WEAPON_PROPERTY } from './constants.mjs';
import type { WeaponAttackActionResult } from './types.mjs';
import type { UseWeaponAttackContext } from './types.mjs';
import type { WeaponAttackSourceData } from './WeaponAttackSourceData.mjs';

const {
  fields: {
    BooleanField,
    NumberField,
    StringField,
    SetField,
  },
} = foundry.data;

/** Appends signed flat-number terms onto a resolved formula string, skipping any zero term. */
function appendFlatTerms(baseFormula: string, ...terms: number[]): string {
  return terms.reduce((formula, term) => {
    if (term === 0) return formula;
    return `${formula}${term >= 0 ? ' + ' : ' - '}${Math.abs(term)}`;
  }, baseFormula);
}

/**
 * Appends a single resolved formula-bonus term (a plain number or dice notation, e.g. `1d4` —
 * left unrolled by `FormulaData`, see `FormulaData._finalizeResolvedValue`) onto a base formula,
 * prefixed with the correct sign. Skips blank/zero terms.
 */
function appendFormulaTerm(baseFormula: string, term: string): string {
  const trimmed = term.trim();
  if (!trimmed || trimmed === '0') return baseFormula;
  const negative = trimmed.startsWith('-');
  const unsigned = negative || trimmed.startsWith('+') ? trimmed.slice(1).trim() : trimmed;
  return `${baseFormula} ${negative ? '-' : '+'} ${unsigned}`;
}

  interface FormulaContext {
    actor: ACTORS_DND35E;
    item: Weapon;
    thisAttack: WeaponAttackDataModel;
    target: ACTORS_DND35E | null;
    // Aliases mirroring the schema fields' own `contexts` declarations (`aliases: ['self']`/
    // `['item', 'weapon']`) — ad hoc `FormulaData.resolveSource()` calls (e.g. the STR damage
    // term) build their own context map and need these present under the same names the
    // formula text actually references (`#self...`), or resolution silently returns `null`.
    self: ACTORS_DND35E;
    weapon: Weapon;
    // Satisfies `FormulaData.resolve()`'s `Record<string, DocumentContext>` param — a named
    // interface needs its own index signature to be assignable to one, unlike a fresh object literal.
    [key: string]: DocumentContext;
  }

abstract class WeaponAttackDataModel extends ActionDataModel<WeaponAttackActionResult> {
  declare attackFormula: FormulaData;
  declare damageFormula: FormulaData;

  isTargetRequired = true;

  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();
    // No `hand` field, no `defaultSlotId` field — both determined live at execution
    // time (wield mode / Attack Roll Dialog hand select), not authored per-action.
    schema.requiresEquipped = new BooleanField({ required: true, initial: true });
    schema.attackFormula = new FormulaField({
      expectedType: 'string',
      contexts: [
        { contextName: 'Actor', resolvePath: 'item.actor', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['self'] },
        { contextName: 'Item', resolvePath: 'item', documentType: 'Item', fallbackSubtypes: ['weapon'], aliases: ['item', 'weapon'] },
      ],
      // Bonus term ONLY (e.g. an extra dice bonus feat) — `_buildAttackFormula()` always
      // prepends its own literal `1d20` base die separately, so this must default to no bonus,
      // never a second `1d20`.
      initialFormula: '0',
    });
    schema.damageFormula = new FormulaField({
      expectedType: 'string',
      contexts: [
        { contextName: 'Actor', resolvePath: 'item.actor', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['self'] },
        { contextName: 'Item', resolvePath: 'item', documentType: 'Item', fallbackSubtypes: ['weapon'], aliases: ['item', 'weapon'] },
      ],
      initialFormula: '$scaleDamage(1d4)',
    });
    schema.damageType = new StringField({ choices: [...DAMAGE_TYPES], initial: DAMAGE_TYPE_SLASHING, required: true });
    schema.critRange = new NumberField({ required: true, initial: 20, integer: true, min: 2, max: 20 });
    schema.critMultiplier = new NumberField({ required: true, initial: 2, integer: true });
    // Weapon Properties (§10.4) — finesse/reach/threatensAdjacent/thrown/nonLethal/nonLethalNoPenalty.
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
    const combat = game.combat;
    const combatant = context.actorToken
      ? combat?.getCombatantsByToken(context.actorToken.id)[0] as CombatantDnd35e<CombatDnd35e> | undefined
      : undefined;

    if (combat?.started && combatant && !context.isFree && context.availableBab <= 0) {
      warnings.push(game.i18n.localize('dnd35e.COMBAT.WieldMode.InsufficientBab'));
    }

    const mismatchKey = getWieldModeMismatchReason(context.actor, item, context.wieldedHand);
    if (mismatchKey) warnings.push(game.i18n.localize(mismatchKey));

    return warnings;
  }

  // `requiresEquipped` is enforced only as HUD-entry eligibility (tokenHudActions.mts) — the
  // sheet's Actions tab intentionally allows firing this action regardless of equip state
  // (§10.11), so execution itself never re-gates on it here.
  protected override _canExecute(context: UseWeaponAttackContext): WeaponAttackActionResult {
    const combat = game.combat;
    const combatant = context.actorToken
      ? combat?.getCombatantsByToken(context.actorToken.id)[0] as CombatantDnd35e<CombatDnd35e> | undefined
      : undefined;

    if (
      combat?.started
      && combatant
      && !context.isFree
      && context.wieldedHand
      && !canUseHandAttack(combatant, context.wieldedHand)
    ) {
      ui.notifications.warn(game.i18n.localize('dnd35e.COMBAT.NoActionAvailable'));
      return {
        cancelled: true,
        reason: 'noActionAvailable',
        warnings: [],
      };
    }
    return super._canExecute(context);
  }

  private async _resolveAttackRollDialog(
    context: UseWeaponAttackContext,
    item: Weapon,
    targetToken: TokenDnd35e | undefined,
    weaponNonLethalDefault: boolean,
    expectedToHitBonus: number,
    expectedDamageBonus: number,
    resolvedName: string | null,
    baseTotalByHand: Record<WieldedHand, number>
  ): Promise<AttackRollDialogResult | null> {
    const combatModifierToggles = createCombatModifiers(context.actor, targetToken, weaponNonLethalDefault);
    
    const rollAttackToHit = game.i18n.localize('dnd35e.ROLL.RollAttackToHit');
    const title = resolvedName
      ?? game.i18n.format('dnd35e.ROLL.RollAttackTitle', { weapon: this.item?.name });

    const dialogData: WeaponAttackRollDialogData = {
      title,
      baseLabel: rollAttackToHit,
      baseTotal: expectedToHitBonus,
      damageLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.DamagePreview'),
      damageTotal: expectedDamageBonus,
      attackSituationalModifier: context.attackSituationalModifier ?? '',
      damageSituationalModifier: context.damageSituationalModifier ?? '',
      combatModifierToggles,
      rollMode: game.settings.get('core', 'messageMode'),
      actor: context.actor,
      target: context.target,
      wieldModeFromEquippedSlots: context.wieldedHand,
      handBab: context.handBab,
      baseTotalByHand,
      // poc.10 Story D: additional FormulaFamiliar contexts (`#item`/`#thisAttack`) for the
      // dialog's situational modifier fields, mirroring `_executeCheck()`'s own `formulaContext`.
      // Documents/DataModels must never be wrapped in Vue's reactive() proxy (see repo memory).
      item: markRaw(item),
      thisAttack: markRaw(this),
    };

    return this.type === ACTION_TYPE.MELEE
      ? await MeleeAttackRollDialogConfig.roll(dialogData)
      : await RangedAttackRollDialogConfig.roll(dialogData);
  }

  /** Resolves `this.name`'s FormulaFamiliar formula against `formulaContext`, falling back to the item's own name when blank/unresolved. */
  private _resolveAttackName(formulaContext: FormulaContext, item: Weapon): { resolvedName: string | null; attackName: string } {
    const resolved = this.name.resolve(formulaContext);
    const resolvedName = typeof resolved === 'string' ? resolved : null;
    return { resolvedName, attackName: resolvedName ?? item.name };
  }

  /**
   * Pre-dialog expected-to-hit bonus (§10.7) — BAB + ability mod + TWF penalty, before any
   * dialog-side situational modifiers or combat-modifier toggles. Used only to seed the
   * dialog's base-total preview row; the real formula is assembled post-dialog by
   * `_buildAttackFormula()`. `baseTotalByHand` mirrors this same computation for every hand
   * so the dialog can show a live-updating preview as the player changes Wield Mode.
   */
  private _computeExpectedToHitBonus(
    context: UseWeaponAttackContext,
    item: Weapon
  ): { abilityMod: number; sizeMod: number; expectedToHitBonus: number; baseTotalByHand: Record<WieldedHand, number> } {
    const abilityMod = context.actor.system.abilities[context.attackAbility].mod;
    const sizeMod = SIZE_MODIFIERS[context.actor.system.size] ?? 0;
    const flatBonus = (hand: WieldedHand): number =>
      context.handBab[hand] + abilityMod + sizeMod + getTwoWeaponFightingPenalty(item, hand);
    const baseTotalByHand: Record<WieldedHand, number> = {
      [MAIN_HAND_EQUIP_SLOT]: flatBonus(MAIN_HAND_EQUIP_SLOT),
      [OFF_HAND_EQUIP_SLOT]: flatBonus(OFF_HAND_EQUIP_SLOT),
      [BOTH_HANDS_EQUIP_SLOT]: flatBonus(BOTH_HANDS_EQUIP_SLOT),
    };
    return {
      abilityMod,
      sizeMod,
      expectedToHitBonus: baseTotalByHand[context.wieldedHand],
      baseTotalByHand,
    };
  }

  /**
   * Applies dialog-derived combat-modifier toggle effects (§10.7) — non-lethal/proficiency
   * penalties, plus any short-duration self-AEs (charge/defensive fighting) read back later
   * by the Roll Defense Dialog (Story E) when this same creature becomes a target before its
   * next turn.
   */
  private async _applyCombatModifierEffects(
    actor: ACTORS_DND35E,
    dialogResult: AttackRollDialogResult,
    weaponNonLethalDefault: boolean,
    nonLethalNoPenalty: boolean
  ): Promise<{ isNonLethal: boolean; nonLethalPenalty: number; proficiencyPenalty: number }> {
    // Non-lethal switch penalty (§10.3): only applies when the final checked state deviates
    // from the weapon's own default, waived entirely by `nonLethalNoPenalty`.
    const isNonLethal = dialogResult.combatModifiers?.find(m => m.id === 'nonLethal')?.checked ?? weaponNonLethalDefault;
    const nonLethalPenalty = isNonLethal !== weaponNonLethalDefault && !nonLethalNoPenalty ? -4 : 0;
    // Proficient inverts the usual checked-applies-value shape (§10.7) — unchecked applies the −4.
    const isProficient = dialogResult.combatModifiers?.find(m => m.id === 'proficient')?.checked ?? false;
    const proficiencyPenalty = isProficient ? 0 : -4;

    if (dialogResult.combatModifiers?.find(m => m.id === 'charge')?.checked) await applyChargedAE(actor);
    if (dialogResult.combatModifiers?.find(m => m.id === 'defensiveFighting')?.checked) await applyDefensiveFightingAE(actor);

    return { isNonLethal, nonLethalPenalty, proficiencyPenalty };
  }

  /**
   * Composes the real attack-roll formula (§10.7) — `1d20` flavor-tagged with the attack's
   * name, plus every FLAT-only contribution (BAB/ability/TWF/non-lethal/proficiency penalties,
   * the weapon's own `attackFormula` bonus, and the dialog's attack situational modifier)
   * condensed into a single signed term (e.g. `1d20 - 10`, never a chain like `1d20 - 3 + -7`)
   * — only genuine dice sub-formulas (`1d4`, etc.) stay appended as their own flavor-tagged
   * term. Also builds the flat/dice-only `displayAttackFormula` (no flavor tags — the roll's
   * total-row preview text) and the modifier-breakdown list shown on the attack card.
   */
  private _buildAttackFormula(
    formulaContext: FormulaContext,
    attackName: string,
    context: UseWeaponAttackContext,
    dialogResult: AttackRollDialogResult,
    abilityMod: number,
    sizeMod: number,
    twfPenalty: number,
    nonLethalPenalty: number,
    proficiencyPenalty: number
  ): { attackFormula: string; displayAttackFormula: string; modifierList: RollModifier[] } {
    const resolvedAttackBonus = this.attackFormula.resolve(formulaContext);
    const attackFormulaResolved = typeof resolvedAttackBonus === 'string' ? resolvedAttackBonus : '0';
    const { flat: attackFormulaFlat, hasDice: attackFormulaHasDice } = extractFlatModifier(attackFormulaResolved);

    const situationalLabel = game.i18n.localize('dnd35e.ROLL.AttackSituationalModifier');
    const { flat: flatAttackSituational, hasDice: attackSituationalHasDice } = extractFlatModifier(dialogResult.attackSituationalModifier);

    const flatPenalty = context.availableBab + abilityMod + sizeMod + twfPenalty + nonLethalPenalty + proficiencyPenalty
      + (attackFormulaHasDice ? 0 : attackFormulaFlat)
      + (attackSituationalHasDice ? 0 : flatAttackSituational);
    let baseAttackFormula = appendFlatTerms('1d20', flatPenalty);
    if (attackFormulaHasDice) baseAttackFormula = appendFormulaTerm(baseAttackFormula, attackFormulaResolved);

    const attackBonusTerm = attackSituationalHasDice
      ? ` + ${flavorTerm(dialogResult.attackSituationalModifier.trim(), situationalLabel)}`
      : '';
    const plainAttackBonusTerm = attackSituationalHasDice
      ? ` + ${dialogResult.attackSituationalModifier.trim()}`
      : '';

    // Flavor only the bare `1d20` (not the whole compound expression via `flavorTerm()`'s
    // parenthesization), which would turn `roll.terms[0]` into a `ParentheticalTerm` and
    // break `D20Roll`'s natural 1/20 detection (fumbles, critical threats, eager confirmation).
    const attackFormula = `${baseAttackFormula.replace(/^1d20/, `1d20[${attackName}]`)}${attackBonusTerm}`;
    const displayAttackFormula = `${baseAttackFormula}${plainAttackBonusTerm}`;

    const modifierList: RollModifier[] = (dialogResult.combatModifiers ?? [])
      .filter(m => m.checked && m.value !== 0)
      .map(m => ({ label: m.label, value: m.value }));
    if (context.availableBab !== 0) modifierList.push({ label: game.i18n.localize('dnd35e.COMBAT.BaseAttackBonus'), value: context.availableBab });
    // Ability mod always shown (even 0) for bookkeeping — the attack card should always
    // disclose which ability the roll used, not just when it happens to be non-zero.
    const abilityAbbr = game.i18n.localize(`dnd35e.ABILITY.${context.attackAbility}.abbr`);
    modifierList.push({ label: game.i18n.format('dnd35e.COMBAT.AbilityModifier', { ability: abilityAbbr }), value: abilityMod });
    if (sizeMod !== 0) modifierList.push({ label: game.i18n.localize('dnd35e.COMBAT.SizeModifier'), value: sizeMod });
    if (twfPenalty !== 0) modifierList.push({ label: game.i18n.localize('dnd35e.COMBAT.TwoWeaponFighting'), value: twfPenalty });
    if (nonLethalPenalty !== 0) modifierList.push({ label: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.NonLethal.Label'), value: nonLethalPenalty });
    if (proficiencyPenalty !== 0) modifierList.push({ label: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.Proficient.Label'), value: proficiencyPenalty });
    if (flatAttackSituational !== 0) modifierList.push({ label: situationalLabel, value: flatAttackSituational });

    return { attackFormula, displayAttackFormula, modifierList };
  }

  /**
   * The unrolled base damage formula (§10.7) — the weapon's own resolved damage dice plus the
   * wield-mode STR term (melee always, ranged only when the weapon carries `rangedUsesStr`).
   * `getWeaponAttackActionAbilityModTerm()` returns raw FormulaFamiliar text (e.g.
   * `$floor(#self.abilities.str.mod * 1.5)`), so it's resolved here against `formulaContext`
   * before display — it must never reach the dialog preview/attack card as literal syntax.
   * Depends only on `context.wieldedHand`/`context.damageAbility`, not `attackAbility` (finesse
   * swaps only the attack roll's ability, never damage's — see `UseWeaponAttackContext`) nor
   * the dialog result, so it's usable both pre-dialog (damage box preview) and post-dialog
   * (`_buildDamageSnapshot`).
   */
  private _computeDamageFormula(context: UseWeaponAttackContext, formulaContext: FormulaContext): string {
    const properties = this.properties as Set<string> | undefined;
    const includeStrTerm = this.type === ACTION_TYPE.MELEE
      || (properties?.has('rangedUsesStr') ?? false);
    const rawStrTerm = includeStrTerm
      ? getWeaponAttackActionAbilityModTerm(context.wieldedHand, context.damageAbility)
      : '';
    const strTerm = rawStrTerm
      ? FormulaData.resolveSource(FormulaData.toSource(rawStrTerm, { expectedType: 'string' }), formulaContext, '')
      : '';
    return `${this.damageFormula.resolvedValue || '0'}${typeof strTerm === 'string' ? strTerm : String(strTerm)}`;
  }

  /**
   * Pre-dialog expected-damage bonus — flat portion only (dice terms excluded, see
   * `resolveFormulaNumber`'s doc) of `_computeDamageFormula()`. Used only to seed the
   * dialog's damage-box preview row; the real formula (dice included) is assembled
   * post-dialog by `_buildDamageSnapshot()`.
   */
  private _computeExpectedDamageBonus(context: UseWeaponAttackContext, formulaContext: FormulaContext): number {
    return extractFlatModifier(this._computeDamageFormula(context, formulaContext)).flat;
  }

  /**
   * Snapshots the unrolled damage formula (§10.7) — the wield-mode STR term (melee always,
   * ranged only when the weapon carries `rangedUsesStr`) plus the dialog's damage situational
   * modifier — actually rolled later by Story E's `continue()`.
   */
  private _buildDamageSnapshot(context: UseWeaponAttackContext, formulaContext: FormulaContext, dialogResult: AttackRollDialogResult): { resolvedDamageFormula: string; damageBonusTerm: string } {
    const resolvedDamageFormula = this._computeDamageFormula(context, formulaContext);
    const trimmedDamageSituational = dialogResult.damageSituationalModifier?.trim() ?? '';
    const { flat: flatDamageSituational, hasDice: damageSituationalHasDice } = extractFlatModifier(trimmedDamageSituational);
    const damageBonusTerm = damageSituationalHasDice
      ? ` + ${trimmedDamageSituational}`
      : flatDamageSituational !== 0
        ? (flatDamageSituational >= 0 ? ` + ${flatDamageSituational}` : ` - ${Math.abs(flatDamageSituational)}`)
        : '';
    return { resolvedDamageFormula, damageBonusTerm };
  }

  /**
   * The real attack-roll pipeline (poc.10 Story D, §10.7). Shared by every weapon attack
   * subtype — `MeleeWeaponAttack`/`RangedWeaponAttack` never override this; they only
   * override `_canExecute()` for their own reach/range validation. Hit/miss resolution
   * and damage rolling are deliberately **not** decided here — that's Story E's
   * GM-gated Roll Defense Dialog / `continue()` — this method's job stops at posting
   * the attack card with a raw total and an unrolled damage-formula snapshot.
   */
  protected override async _executeCheck(context: UseWeaponAttackContext): Promise<WeaponAttackActionResult> {
    const defaultResult = { cancelled: true, reason: '', warnings: [] };
    const item = this.item;
    if (!item) {
      defaultResult.reason = 'noItem';
      return defaultResult;
    }

    const { actor } = context;
    const target = context.target?.[0] ?? null;
    const formulaContext: FormulaContext = {
      actor,
      item,
      thisAttack: this,
      target,
      self: actor,
      weapon: item,
    };

    const { resolvedName, attackName } = this._resolveAttackName(formulaContext, item);

    const targetToken = context.targetToken;

    const weaponNonLethalDefault = this.properties?.has(WEAPON_PROPERTY.NON_LETHAL) ?? false;
    const nonLethalNoPenalty = this.properties?.has(WEAPON_PROPERTY.NON_LETHAL_NO_PENALTY) ?? false;

    const { abilityMod, sizeMod, expectedToHitBonus, baseTotalByHand } = this._computeExpectedToHitBonus(context, item);
    const expectedDamageBonus = this._computeExpectedDamageBonus(context, formulaContext);
    const dialogResult: AttackRollDialogResult | null = await this._resolveAttackRollDialog(
      context,
      item,
      targetToken,
      weaponNonLethalDefault,
      expectedToHitBonus,
      expectedDamageBonus,
      resolvedName,
      baseTotalByHand
    );

    if (!dialogResult) {
      defaultResult.reason = 'dialogCancelled';
      return defaultResult;
    }

    // The dialog's Wield Mode selection is authoritative from here on — `context.wieldedHand`
    // was only the pre-dialog auto-detected default used to seed the dialog and gate availability.
    context.wieldedHand = dialogResult.wieldMode;
    // An override must re-pull from the actually-chosen hand's own snapshotted pool before the
    // real formula is built, or the roll (not just the preview) silently uses the wrong hand's BAB.
    context.availableBab = context.handBab[context.wieldedHand];
    const twfPenalty = getTwoWeaponFightingPenalty(item, context.wieldedHand);

    const {
      isNonLethal,
      nonLethalPenalty,
      proficiencyPenalty,
    } = await this._applyCombatModifierEffects(
      actor,
      dialogResult,
      weaponNonLethalDefault,
      nonLethalNoPenalty
    );

    const { attackFormula, displayAttackFormula, modifierList } = this._buildAttackFormula(
      formulaContext,
      attackName,
      context,
      dialogResult,
      abilityMod,
      sizeMod,
      twfPenalty,
      nonLethalPenalty,
      proficiencyPenalty
    );

    const attackRoll = new D20Roll(attackFormula, {}, { situationalModifiers: modifierList, displayFormula: displayAttackFormula });
    await attackRoll.evaluate();

    // SRD critical confirmation (§10.7) — rolled eagerly the instant a threat is detected;
    // Story E owns the AC comparison that turns this into an actual confirmed critical.
    const critConfirmRoll = attackRoll.isCriticalThreat(this.critRange) ? await attackRoll.rollConfirmation() : null;

    const { resolvedDamageFormula, damageBonusTerm } = this._buildDamageSnapshot(context, formulaContext, dialogResult);

    const targetRows: AttackCardTargetRow[] = (context.target ?? []).map(t => ({
      actorUuid: t.uuid,
      targetImage: t.img ?? '',
      resolved: false,
    }));

    const attackCardFlags: AttackCardFlags = {
      actionChainId: buildActionChainId(actor, this),
      attackerImage: actor.img ?? '',
      weaponName: attackName,
      hand: context.wieldedHand,
      nonLethal: isNonLethal,
      resolvedDamageFormula,
      damageBonusTerm,
      critRange: this.critRange,
      critMultiplier: this.critMultiplier,
      critConfirmTotal: critConfirmRoll?.total ?? null,
      targets: targetRows,
      actionEconomySpent: null,
      modifierList,
      warnings: this._buildWieldModeWarnings(context, item),
    };

    const attackMessage = await buildAttackCard(actor, attackRoll, modifierList, attackCardFlags, dialogResult.rollMode, critConfirmRoll);

    return {
      cancelled: false,
      reason: '',
      warnings: [],
      attackTotal: attackRoll.total,
      nonLethal: isNonLethal,
      finalHand: context.wieldedHand,
      attackMessage,
    };
  }

  protected async _postExecute(context: UseWeaponAttackContext, result: WeaponAttackActionResult): Promise<void> {
    // Pre-check warnings (`_canExecute()`, e.g. `noTargets`/`tooManyTargets`, already localized
    // at the push site) are merged onto `result.warnings` by `executeAction()` only after
    // `_executeCheck()` has already built and posted the attack card — patch them in now that
    // the merged list is known.
    if (result.attackMessage) await appendAttackCardWarnings(result.attackMessage, result.warnings);

    // Spend AFTER execution, not before — a cancelled dialog never costs an action. The
    // attack card (if one was posted) already exists by now, so its `actionEconomySpent`
    // flag is patched in here rather than known ahead of time inside `executeAction()`. WieldedHand
    // BAB is only ever spent for weapon attacks — non-weapon actions have no `hand`. Uses the
    // dialog's final resolved hand (`result.finalHand`), not the pre-dialog auto-detected
    // `hand` used only for the availability gate above — the two can differ.
    const combat = game.combat;
    const combatant = context.actorToken
      ? (combat?.getCombatantsByToken(context.actorToken.id)[0] as CombatantDnd35e<CombatDnd35e> | undefined) ?? null
      : null;
    if (combat?.started && combatant && !result.cancelled && !context.isFree) {
      const standardSpent = await spendAction(combatant, ['standard']);
      const spentHand = result.finalHand ?? context.wieldedHand;
      if (spentHand) {
        const babSpent = 5;
        await spendHandBab(combatant, spentHand, babSpent);
        if (result.attackMessage) {
          await result.attackMessage.update({
            'flags.dnd35e.attackCard.actionEconomySpent': { standardActionSpent: standardSpent !== null, hand: spentHand, babSpent },
          });
        }
      }

      // SRD: a charge permits only this one melee attack — reuses the existing "moved after
      // attack" gate rather than a second bespoke flag.
      if (getActionEconomy(combatant).used.chargedThisTurn) {
        await markMovedAfterAttack(combatant);
      }
    }
  }

  public static PrepareActionContext(
    actor: ACTORS_DND35E,
    item: Weapon,
    target: ACTORS_DND35E[],
    isFree?: boolean,
    targetToken?: TokenDnd35e,
    actorToken?: TokenDnd35e
  ): UseWeaponAttackContext | null {
    if (
      !actor
      || !(actor instanceof Creature)
      || !item
    ) return null;

    const hand = detectWieldedHand(actor, item);
    // A caller with a concrete acting token (e.g. the Token HUD) must win over this
    // fallback \u2014 ambiguous for a linked actor with multiple placed tokens.
    const resolvedActorToken = actorToken ?? getActorToken(actor);
    const combatant = resolvedActorToken
      ? (game.combat?.getCombatantsByToken(resolvedActorToken.id)[0] as CombatantDnd35e<CombatDnd35e> | undefined) ?? null
      : null;
    if (!hand) return null;

    // No active combatant (no encounter, or actor not yet added to one) — full BAB for every
    // hand, mirrors the Token HUD's own "not in combat" fallback (tokenHudActions.mts).
    const handBab: Record<WieldedHand, number> = combatant
      ? {
        [MAIN_HAND_EQUIP_SLOT]: getHandBab(combatant, MAIN_HAND_EQUIP_SLOT),
        [OFF_HAND_EQUIP_SLOT]: getHandBab(combatant, OFF_HAND_EQUIP_SLOT),
        [BOTH_HANDS_EQUIP_SLOT]: getHandBab(combatant, BOTH_HANDS_EQUIP_SLOT),
      }
      : {
        [MAIN_HAND_EQUIP_SLOT]: actor.system.bab,
        [OFF_HAND_EQUIP_SLOT]: actor.system.bab,
        [BOTH_HANDS_EQUIP_SLOT]: actor.system.bab,
      };

    return {
      actor,
      target,
      targetToken,
      actorToken: resolvedActorToken,
      wieldedHand: hand,
      attackAbility: STR,
      damageAbility: STR,
      isFree: !!isFree,
      availableBab: handBab[hand],
      handBab,
      attackSituationalModifier: '',
      damageSituationalModifier: '',
    };
  }
}

interface WeaponAttackDataModel extends ActionDataModel<WeaponAttackActionResult>,
  Omit<WeaponAttackSourceData, 'attackFormula' | 'damageFormula' | 'name'> {}

export { WeaponAttackDataModel };
