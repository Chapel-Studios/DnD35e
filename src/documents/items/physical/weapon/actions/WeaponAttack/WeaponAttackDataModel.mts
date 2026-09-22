import { getWieldModeStrTerm, wieldModeToBabHand } from '@actors/baseActor/ActorDnd35e.mjs';
import { applyChargedAE, applyDefensiveFightingAE } from '@actors/creature/logic/combatConditionAEs.mjs';
import type { TokenDnd35e } from '@canvas/token/TokenDnd35e.mjs';
import { DAMAGE_TYPE_SLASHING } from '@constants/attacks/damageTypes.mjs';
import { DAMAGE_TYPES } from '@constants/index.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import type { FormulaData } from '@helpers/formulae/index.mjs';
import { ActionDataModel } from '@items/baseItem/actions/ActionDataModel.mjs';
import { ACTION_TYPE } from '@items/baseItem/actions/constants.mjs';
import { getTwoWeaponFightingPenalty } from '@items/physical/weapon/logic/twoWeaponFighting.mjs';
import type { AttackCardFlags, AttackCardTargetRow, RollModifier } from '@source/dice/index.mjs';
import {
  buildActionChainId,
  buildAttackCard,
  D20Roll,
  D20RollDialogConfig,
} from '@source/dice/index.mjs';

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
      initialFormula: '1d20',
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

  // `requiresEquipped` is enforced only as HUD-entry eligibility (tokenHudActions.mts) — the
  // sheet's Actions tab intentionally allows firing this action regardless of equip state
  // (§10.11), so execution itself never re-gates on it here.
  protected override _canExecute(context: UseWeaponAttackContext): WeaponAttackActionResult {
    return super._canExecute(context);
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
    const item = this.item;
    if (!item) {
      return { cancelled: true, reason: 'noItem', warnings: [] };
    }

    const { actor } = context;
    const target = context.target?.[0] ?? null;
    const weaponName = this.name.resolvedValue ?? item.name;

    const attackerToken = canvas.tokens?.placeables.find(t => t.actor?.id === actor.id) as TokenDnd35e | undefined;
    const targetToken = target
      ? canvas.tokens?.placeables.find(t => t.actor?.id === target.id) as TokenDnd35e | undefined
      : undefined;
    const combatant = game.combat?.combatants.find(c => c.actor?.id === actor.id) as CombatantDnd35e | undefined;

    const weaponNonLethalDefault = this.properties?.has(WEAPON_PROPERTY.NON_LETHAL) ?? false;
    const nonLethalNoPenalty = this.properties?.has(WEAPON_PROPERTY.NON_LETHAL_NO_PENALTY) ?? false;
    const combatModifiers = createCombatModifiers(actor, attackerToken, targetToken, combatant, weaponNonLethalDefault);

    const dialogResult = await D20RollDialogConfig.roll({
      title: game.i18n.format('dnd35e.ROLL.RollAttackTitle', { weapon: weaponName }),
      baseLabel: weaponName,
      baseTotal: 0, // preview only — the real total comes from the already-resolved attackFormula below
      situationalModifier: '0',
      damageBonus: '',
      combatModifiers,
      rollMode: game.settings.get('core', 'messageMode') as string,
      actorName: actor.name,
      actorImage: actor.img ?? '',
      actor,
      hand: context.hand === 'both' ? undefined : context.hand,
      wieldMode: context.wieldMode,
    });
    if (!dialogResult) return { cancelled: true, reason: 'dialogCancelled', warnings: [] };

    // The dialog's own hand/wield-mode selections are authoritative from here on —
    // `context.hand`/`context.wieldMode` were only the pre-dialog auto-detected defaults.
    // `dialogResult.hand` (Main/Off select) takes priority when shown; two-handed hides
    // it entirely, so wield mode alone decides the pool in that case.
    const finalWieldMode = dialogResult.wieldMode ?? context.wieldMode;
    const finalHand: 'main' | 'off' | 'both' = dialogResult.hand ?? wieldModeToBabHand(finalWieldMode);

    // Non-lethal switch penalty (§10.3): only applies when the final checked state deviates
    // from the weapon's own default, waived entirely by `nonLethalNoPenalty` — kept out of
    // the toggle's own `value` (see the dialog build above) and applied here instead.
    const isNonLethal = dialogResult.combatModifiers?.find(m => m.id === 'nonLethal')?.checked ?? weaponNonLethalDefault;
    const nonLethalPenalty = isNonLethal !== weaponNonLethalDefault && !nonLethalNoPenalty ? -4 : 0;
    // Proficient inverts the usual checked-applies-value shape (§10.7) — unchecked applies the −4.
    const isProficient = dialogResult.combatModifiers?.find(m => m.id === 'proficient')?.checked ?? false;
    const proficiencyPenalty = isProficient ? 0 : -4;
    const twfPenalty = getTwoWeaponFightingPenalty(item, finalHand);
    // BAB/ability mod (§10.7) — never baked into the authored `attackFormula` (defaults to
    // bare `1d20`), so they're appended live here just like the damage formula's STR term.
    const abilityMod = actor.system.abilities[context.attackAbility].mod;

    // Short-duration self-AEs (§10.7) — read back later by the Roll Defense Dialog (Story E)
    // when this same creature becomes a target before its next turn.
    if (dialogResult.combatModifiers?.find(m => m.id === 'charge')?.checked) await applyChargedAE(actor);
    if (dialogResult.combatModifiers?.find(m => m.id === 'defensiveFighting')?.checked) await applyDefensiveFightingAE(actor);

    // `combatModifierSum()` (D20RollDialogApp.vue) already folded every checked toggle's
    // `value` (except proficient/nonLethal, both `value: 0`) into `situationalModifier`.
    const flatPenalty = context.availableBab + abilityMod + twfPenalty + nonLethalPenalty + proficiencyPenalty;
    const baseAttackFormula = this.attackFormula.resolvedValue || '1d20';
    const attackFormula = appendFlatTerms(baseAttackFormula, flatPenalty, dialogResult.situationalModifier);

    const modifierList: RollModifier[] = (dialogResult.combatModifiers ?? [])
      .filter(m => m.checked && m.value !== 0)
      .map(m => ({ label: m.label, value: m.value }));
    if (context.availableBab !== 0) modifierList.push({ label: game.i18n.localize('dnd35e.COMBAT.BaseAttackBonus'), value: context.availableBab });
    // Ability mod always shown (even 0) for bookkeeping — the attack card should always
    // disclose which ability the roll used, not just when it happens to be non-zero.
    const abilityAbbr = game.i18n.localize(`dnd35e.ABILITY.${context.attackAbility}.abbr`);
    modifierList.push({ label: game.i18n.format('dnd35e.COMBAT.AbilityModifier', { ability: abilityAbbr }), value: abilityMod });
    if (twfPenalty !== 0) modifierList.push({ label: game.i18n.localize('dnd35e.COMBAT.TwoWeaponFighting'), value: twfPenalty });
    if (nonLethalPenalty !== 0) modifierList.push({ label: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.NonLethal.Label'), value: nonLethalPenalty });
    if (proficiencyPenalty !== 0) modifierList.push({ label: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.Proficient.Label'), value: proficiencyPenalty });

    const attackRoll = new D20Roll(attackFormula, {}, { situationalModifiers: modifierList });
    await attackRoll.evaluate();

    // Wield-mode STR term (§10.3): melee always gets it; a ranged/thrown weapon only gets
    // it when it carries the `rangedUsesStr` property (true bows/crossbows don't).
    const properties = this.properties as Set<string> | undefined;
    const includeStrTerm = this.type === ACTION_TYPE.MELEE_WEAPON_ATTACK || (properties?.has('rangedUsesStr') ?? false);
    const strTerm = includeStrTerm ? getWieldModeStrTerm(finalWieldMode) : '';
    const resolvedDamageFormula = `${this.damageFormula.resolvedValue || '0'}${strTerm}`;
    const damageBonusTerm = dialogResult.damageBonus ? ` + ${dialogResult.damageBonus}` : '';

    const targetRows: AttackCardTargetRow[] = (context.target ?? []).map(t => ({
      actorUuid: t.uuid,
      targetName: t.name,
      resolved: false,
    }));

    const attackCardFlags: AttackCardFlags = {
      actionChainId: buildActionChainId(actor, this),
      attackerName: actor.name,
      attackerImage: actor.img ?? '',
      weaponName,
      hand: finalHand,
      nonLethal: isNonLethal,
      resolvedDamageFormula,
      damageBonusTerm,
      critRange: this.critRange,
      critMultiplier: this.critMultiplier,
      targets: targetRows,
      actionEconomySpent: null,
      modifierList,
    };

    const attackMessage = await buildAttackCard(actor, attackRoll, modifierList, attackCardFlags, dialogResult.rollMode);

    return {
      cancelled: false,
      reason: '',
      warnings: [],
      attackTotal: attackRoll.total,
      nonLethal: isNonLethal,
      finalHand,
      attackMessage,
    };
  }
}
interface WeaponAttackDataModel extends ActionDataModel<WeaponAttackActionResult>,
  Omit<WeaponAttackSourceData, 'attackFormula' | 'damageFormula' | 'name'> {}

export { WeaponAttackDataModel };
