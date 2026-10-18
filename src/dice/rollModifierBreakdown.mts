/**
 * Builds a roll dialog/chat-card `RollModifier[]` breakdown from a document's own
 * per-effect stacking history (`effectOverrides`) — the same data source
 * `HasActiveEffectsNotification` shows on the sheet. Shared by saves/initiative (`Creature.mts`),
 * the Roll Defense dialog's AC breakdown (`buildRollDefenseDialogData.mts`), and weapon
 * attack/damage formula bonuses (`WeaponAttackDataModel.mts`).
 *
 * @module
 */
import type { Override } from '@helpers/stacking.mjs';
import { formatBonusTypeLabel, parseNumericChangeValue, STACK_RESULT_IGNORED } from '@helpers/stacking.mjs';

import { extractFlatModifier } from './d20Formula.mjs';
import type { RollModifier } from './types.mjs';

/** Any Actor or Item — both track `effectOverrides` history from the same AE stacking pipeline. */
interface EffectOverrideHost {
  effectOverrides: Record<string, Override[]>;
}

const ignoredFallbackLabel = (): string => game.i18n.localize('dnd35e.EFFECT.StackResult.Ignored');

/**
 * Falls back to a single `{ fallbackLabel, fallbackValue }` entry when the field carries no
 * overrides at all (e.g. a save with no contributing AEs) — mirrors `rollSave()`'s original
 * inline logic. Otherwise returns EVERY override (applied AND ignored), same stacking-history
 * detail `HasActiveEffectsNotification` shows on the sheet: bonus type tag, and ignored entries
 * flagged with their rejection reason (`stackReason`) so callers can render them struck-through
 * rather than silently dropping "what lost" information.
 */
function buildOverridesModifierList(document: EffectOverrideHost, fieldPath: string, fallbackLabel: string, fallbackValue: number): RollModifier[] {
  const overrides = document.effectOverrides[fieldPath] ?? [];
  if (overrides.length === 0) return [{ label: fallbackLabel, value: fallbackValue }];
  return overrides.map((override) => {
    const isIgnored = override.stackResult === STACK_RESULT_IGNORED;
    return {
      label: override.effectName,
      value: parseNumericChangeValue(override.value),
      bonusTypeLabel: formatBonusTypeLabel(override.bonusType),
      ...(isIgnored ? { isIgnored: true, ignoredReason: override.stackReason ?? ignoredFallbackLabel() } : {}),
    };
  });
}

/**
 * Builds a single-entry `RollModifier[]` for an already-resolved situational-modifier-style
 * formula (dice preserved) — shared by roll-dialog preview tooltips and the attack card's
 * damage-preview breakdown. Carries the raw `formula` text when the term has dice (a flat
 * number alone can't represent e.g. `1d6+5`); empty on a blank, or zero-flat non-dice, term.
 */
function buildSituationalModifierEntry(resolvedFormula: string, label: string): RollModifier[] {
  const trimmed = resolvedFormula.trim();
  if (!trimmed) return [];
  const { flat, hasDice } = extractFlatModifier(trimmed);
  if (!hasDice && flat === 0) return [];
  return [{ label, value: flat, ...(hasDice ? { formula: trimmed } : {}) }];
}

/**
 * Toggles the baked Dex AC line's ignored state against a Flat-Footed-style checkbox: the
 * real line (always present — see `Creature._buildDefenseChanges()`'s `forcedIgnoreReason`)
 * already shows applied or struck-through/ignored to match the defender's real condition.
 * Checking the box as an override when the defender isn't really denied Dex marks that same
 * line ignored for this roll; unchecking it when the defender IS really denied Dex clears the
 * ignored flag (e.g. an Uncanny-Dodge-style override for one roll). No-op when the checkbox
 * already agrees with the real condition. Shared by the Roll Defense Dialog's live AC preview
 * and the resolution card's final AC breakdown (poc.10 Story E) so both always show identical
 * breakdown fidelity — this is the project's standard going forward for every roll
 * dialog/chat card pair.
 */
function reconcileFlatFootedDexEntry(
  modifierList: RollModifier[],
  flatFootedChecked: boolean,
  defenderDenyDexToAC: boolean
): RollModifier[] {
  if (flatFootedChecked === defenderDenyDexToAC) return modifierList;
  const dexLabel = game.i18n.localize('dnd35e.ABILITY.dex.label');
  const flatFootedReason = game.i18n.localize('dnd35e.COMBAT.CombatModifiers.FlatFooted.Label');
  return modifierList.map((mod) => (mod.label === dexLabel
    ? (flatFootedChecked
      ? { ...mod, isIgnored: true, ignoredReason: flatFootedReason }
      : { ...mod, isIgnored: false, ignoredReason: undefined })
    : mod));
}

/**
 * Toggles a named baked-condition AC line (Charged/Total Defense/Defensive Fighting — their
 * flat SRD bonus is already applied via a real condition AE once truly active, see
 * `conditions.mts`'s `acAdjustment`, and therefore already shows in `modifierList`) in/out
 * against a Combat Status checkbox that may disagree with the real condition for this one
 * roll, same reconciliation shape as `reconcileFlatFootedDexEntry` but for a fixed value
 * instead of the defender's Dex mod. No-op (same list, `delta: 0`) once the checkbox already
 * agrees with the real condition — checking it when not really active adds a new line +
 * `delta: value`; unchecking it when really active removes the existing line +
 * `delta: -value`, so the numeric total and the displayed breakdown never drift apart.
 */
function reconcileBakedConditionEntry(
  modifierList: RollModifier[],
  label: string,
  checked: boolean,
  realConditionActive: boolean,
  value: number
): { modifierList: RollModifier[]; delta: number } {
  if (checked === realConditionActive) return { modifierList, delta: 0 };
  return checked
    ? { modifierList: [...modifierList, { label, value }], delta: value }
    : { modifierList: modifierList.filter((mod) => mod.label !== label), delta: -value };
}

export { buildOverridesModifierList, buildSituationalModifierEntry, reconcileBakedConditionEntry, reconcileFlatFootedDexEntry };
