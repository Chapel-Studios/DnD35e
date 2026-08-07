import type { EffectChangeType } from '@effects/baseActiveEffect/index.mjs';

const STACK_RESULT_APPLIED = 'applied' as const;
const STACK_RESULT_IGNORED = 'ignored' as const;

type StackResult = typeof STACK_RESULT_APPLIED | typeof STACK_RESULT_IGNORED;

interface Override {
  fieldPath: string;
  value: unknown;
  effectName: string;
  type: EffectChangeType;
  bonusType?: BonusType;
  stackResult?: StackResult;
  stackReason?: string;
}

/**
 * Parse a change value into a numeric value for stacking resolution.
 * Returns NaN for values that cannot be meaningfully stacked (formulas, objects, etc.).
 */
function parseNumericChangeValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;
  const trimmed = value.trim();
  if (trimmed === '') return NaN;
  return Number(trimmed);
}

/**
 * Bonus type stacking resolution engine.
 *
 * The stacking engine is the foundational system for resolving which bonuses
 * apply when multiple Active Effects modify the same field.
 *
 * Stacking Rules (D&D 3.5 SRD — "Stacking", glossary):
 *   "In most cases, modifiers to a given check or roll stack if they come from
 *    different sources and have different types (or no type at all), but do not
 *    stack if they have the same type or come from the same source.
 *    If the modifiers to a particular roll do not stack, only the best bonus and
 *    worst penalty applies."
 *
 * Per (field, bonusType) group:
 * - Stacking types: sum ALL values (bonuses and penalties together).
 *   Currently: 'untyped' (default type — also accepts `undefined`, normalized to untyped).
 *   Project policy (per community expert consultation, RAW + common interpretation):
 *   dodge, circumstance, and racial bonuses also stack (both bonuses and penalties).
 *   Add each to STACKING_BONUS_TYPES when the phase that introduces the type lands.
 * - Non-stacking named types: keep the BEST bonus (highest positive value) AND the
 *   WORST penalty (lowest negative value). Both winners apply; other entries are
 *   rejected as "lower bonus" / "less severe penalty".
 *
 * Bonus vs penalty is derived from value sign (`< 0` is a penalty), matching the
 * SRD's positive-bonus / negative-penalty convention.
 *
 * History Tracking:
 * Every resolved bonus is tracked with metadata: which changes were applied, which were
 * ignored, and why. This history is used by:
 * 1. Item/Actor `overrides` field enrichment (why does this field have this value?)
 * 2. Chat cards (which bonuses contributed to this roll?)
 *
 * Dual-Stack Resolution (Masks):
 * When masked effects exist (e.g., hidden +2 enhancement the player doesn't know about),
 * the engine can resolve TWO independent stacks:
 * - Real stack: includes ALL changes (used for actual die roll)
 * - Masked stack: excludes specified effect IDs (used for player-visible chat card)
 *
 * These can produce different winners when the same bonus type has both masked and
 * visible sources.
 *
 * Implementation Pattern:
 * Call resolveActiveEffectChanges(changes, penalties) to get real stack.
 * Call again with excludeEffectIds to get masked stack for display.
 */

import type { BonusType } from '@constants/bonusTypes.mjs';
import { BONUS_TYPE_UNTYPED } from '@constants/bonusTypes.mjs';

/**
 * Result of stacking resolution: which changes win, and detailed history.
 */
interface ResolvedChanges {
  /** Changes that won stacking resolution and will be applied */
  winners: ChangeApplication[];
  /** Detailed history of all changes: applied and ignored with reasons */
  history: ChangeHistory[];
}

/**
 * A change that was applied due to stacking resolution.
 */
interface ChangeApplication {
  /** Index of this change in the original changes array */
  changeIndex: number;
  /** The change value (after sum for stacking types) */
  value: number;
  /** The bonus type (determines stacking behavior) */
  bonusType: BonusType | undefined;
  /** Human-readable source of this change (e.g., "Material (Steel)") */
  source: string;
  /** Why this change was applied (highest, untyped stack, dodge stack, penalty) */
  reason: 'highest' | 'untyped-stack' | 'dodge-stack' | 'penalty' | 'other';
}

/**
 * Complete history record: what happened to each change.
 */
interface ChangeHistory {
  /** Index of this change in the original changes array */
  changeIndex: number;
  /** The target field (e.g., 'system.hardness') */
  field: string;
  /** The bonus type (determines stacking behavior) */
  bonusType: BonusType | undefined;
  /** Human-readable source of this change */
  source: string;
  /** Value of the change */
  value: number;
  /** Whether this change was applied */
  applied: boolean;
  /** If not applied, the reason it was rejected */
  rejection?: string;
}

/**
 * A single AE change to be resolved.
 */
interface StackingChange {
  /** Index in original array (used for tracking) */
  index: number;
  /** Target field path (e.g., 'system.hardness') */
  field: string;
  /** Bonus type for stacking */
  bonusType: BonusType | undefined;
  /** Numeric value of the change */
  value: number;
  /** Human-readable source (e.g., effect name) */
  source: string;
  /** Optional: effect ID for masking (dual-stack exclusion) */
  effectId?: string;
}

/**
 * Bonus types whose group sums all values (bonuses + penalties together) instead
 * of applying best-bonus + worst-penalty.
 *
 * Current: 'untyped' (the default type when no other applies).
 *
 * Future additions (project policy, add when the phase that introduces the type lands):
 * - 'dodge'        — alpha Phase 4 (Feats / Fighting Defensively). RAW: dodge bonuses stack.
 * - 'circumstance' — community-expert consensus that circumstance bonuses and
 *                    penalties stack with one another (not the literal SRD default of
 *                    "highest wins", but the broadly-accepted table interpretation).
 * - 'racial'       — edge case (one creature rarely has multiple racial bonuses to the
 *                    same thing) but treated as stacking when overlap occurs.
 *
 * Note: `undefined` is normalized to BONUS_TYPE_UNTYPED at grouping time, so callers
 * may pass either; both land in the same group.
 */
const STACKING_BONUS_TYPES: ReadonlySet<BonusType> = new Set<BonusType>([
  BONUS_TYPE_UNTYPED,
]);

function isStackingType(bonusType: BonusType): boolean {
  return STACKING_BONUS_TYPES.has(bonusType);
}

/**
 * Resolve which changes apply given bonus type stacking rules.
 *
 * @param changes - Array of changes to resolve
 * @param excludeEffectIds - Optional: exclude these effect IDs from resolution (for masked stacks)
 * @returns Winners and complete history
 *
 * @example
 * const changes = [
 *   { index: 0, field: 'system.hardness', bonusType: 'material', value: 10, source: 'Steel' },
 *   { index: 1, field: 'system.hardness', bonusType: 'material', value: 8, source: 'Iron' }
 * ];
 * const result = resolveActiveEffectChanges(changes);
 * // result.winners = [{ value: 10, source: 'Steel', reason: 'highest' }]
 * // result.history = [applied: true, applied: false (rejected: 'material type, lower value')]
 */
function resolveActiveEffectChanges(
  changes: StackingChange[],
  excludeEffectIds?: Set<string>
): ResolvedChanges {
  const history: ChangeHistory[] = [];
  const applicationsMap = new Map<string, ChangeApplication[]>(); // Key: "${field}:${bonusType}"

  // Filter out excluded effects
  const effectiveChanges = changes.filter(
    (c) => !excludeEffectIds || !c.effectId || !excludeEffectIds.has(c.effectId)
  );

  // Group changes by field and bonus type
  for (const change of effectiveChanges) {
    // Defensive: skip non-numeric values (callers should pre-filter via
    // parseNumericChangeValue, but a NaN here would break the reduce loops below).
    if (Number.isNaN(change.value)) continue;

    // Normalize undefined → BONUS_TYPE_UNTYPED so both conventions land in the same group.
    const bonusType: BonusType = change.bonusType ?? BONUS_TYPE_UNTYPED;
    const groupKey = `${change.field}:${bonusType}`;

    if (!applicationsMap.has(groupKey)) {
      applicationsMap.set(groupKey, []);
    }

    // Convert to ChangeApplication form
    const application: ChangeApplication = {
      changeIndex: change.index,
      value: change.value,
      bonusType,
      source: change.source,
      reason: 'other', // Will be set by stacking rules
    };

    applicationsMap.get(groupKey)!.push(application);
  }

  // Apply stacking rules per group
  const winners: ChangeApplication[] = [];

  for (const [groupKey, applications] of applicationsMap) {
    // Parse the groupKey
    const colonIdx = groupKey.indexOf(':');
    const field = groupKey.slice(0, colonIdx);
    const bonusType = groupKey.slice(colonIdx + 1) as BonusType;

    // Rule 1: Stacking types (untyped, dodge in alpha Phase 4+) sum ALL values
    if (isStackingType(bonusType)) {
      const sum = applications.reduce((acc, a) => acc + a.value, 0);
      if (sum !== 0) {
        winners.push({
          ...applications[0],
          value: sum,
          reason: 'untyped-stack',
        });
      }
      // Mark all as applied/summed in history
      for (const app of applications) {
        history.push({
          changeIndex: app.changeIndex,
          field,
          bonusType,
          source: app.source,
          value: app.value,
          applied: true,
        });
      }
      continue;
    }

    // Rule 2: Non-stacking named types — best bonus + worst penalty both apply
    // (SRD: "only the best bonus and worst penalty applies")
    const bonuses = applications.filter((a) => a.value > 0);
    const penalties = applications.filter((a) => a.value < 0);

    let bonusWinner: ChangeApplication | undefined;
    let penaltyWinner: ChangeApplication | undefined;

    if (bonuses.length > 0) {
      bonusWinner = bonuses.reduce((max, a) => (a.value > max.value ? a : max));
      winners.push({ ...bonusWinner, reason: 'highest' });
    }
    if (penalties.length > 0) {
      penaltyWinner = penalties.reduce((min, a) => (a.value < min.value ? a : min));
      winners.push({ ...penaltyWinner, reason: 'penalty' });
    }

    // Record history for every application in the group
    for (const app of applications) {
      const isBonusWinner = bonusWinner !== undefined && app.changeIndex === bonusWinner.changeIndex;
      const isPenaltyWinner = penaltyWinner !== undefined && app.changeIndex === penaltyWinner.changeIndex;

      if (isBonusWinner || isPenaltyWinner) {
        history.push({
          changeIndex: app.changeIndex,
          field,
          bonusType,
          source: app.source,
          value: app.value,
          applied: true,
        });
        continue;
      }

      let rejection: string;
      if (app.value > 0) {
        rejection = `${bonusType} type, lower bonus (${app.value} < ${bonusWinner!.value})`;
      }
      else if (app.value < 0) {
        rejection = `${bonusType} type, less severe penalty (${app.value} > ${penaltyWinner!.value})`;
      }
      else {
        rejection = `${bonusType} type, zero value`;
      }

      history.push({
        changeIndex: app.changeIndex,
        field,
        bonusType,
        source: app.source,
        value: app.value,
        applied: false,
        rejection,
      });
    }
  }

  // Add non-grouped changes that weren't processed (e.g., excluded by mask)
  const processedIndices = new Set(history.map((h) => h.changeIndex));
  for (const change of changes) {
    if (!processedIndices.has(change.index)) {
      history.push({
        changeIndex: change.index,
        field: change.field,
        bonusType: change.bonusType,
        source: change.source,
        value: change.value,
        applied: false,
        rejection: 'excluded by mask filter',
      });
    }
  }

  return { winners, history };
}

export {
  parseNumericChangeValue,
  resolveActiveEffectChanges,
  STACK_RESULT_APPLIED,
  STACK_RESULT_IGNORED,
};

export type {
  ChangeApplication,
  ChangeHistory,
  Override,
  ResolvedChanges,
  StackingChange,
  StackResult,
};
