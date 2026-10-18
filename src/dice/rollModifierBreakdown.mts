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

export { buildOverridesModifierList, buildSituationalModifierEntry };
