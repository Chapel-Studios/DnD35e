import type { EffectChangeType } from '@effects/BaseActiveEffect/index.mjs';

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
 * Stacking Rules:
 * - 'untyped' bonus type: ALWAYS stack (sum all untyped values)
 * - All other named types: HIGHEST-WINS per field per type (only highest value applies)
 * - Penalties: ALWAYS apply (never suppressed by stacking)
 *
 * Note: 'dodge' bonus type stacking is added in Phase 10 (Feats system).
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
  /** Is this a penalty? (always apply) */
  isPenalty?: boolean;
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
    const groupKey = `${change.field}:${change.bonusType ?? 'undefined'}`;

    if (!applicationsMap.has(groupKey)) {
      applicationsMap.set(groupKey, []);
    }

    // Convert to ChangeApplication form
    const application: ChangeApplication = {
      changeIndex: change.index,
      value: change.value,
      bonusType: change.bonusType,
      source: change.source,
      reason: 'other', // Will be set by stacking rules
    };

    applicationsMap.get(groupKey)!.push(application);
  }

  // Apply stacking rules per group
  const winners: ChangeApplication[] = [];

  for (const [groupKey, applications] of applicationsMap) {
    // Parse the groupKey
    const [field, bonusTypeStr] = groupKey.split(':');
    const bonusType = bonusTypeStr === 'undefined'
      ? undefined
      : (bonusTypeStr as BonusType);

    // Check for penalties
    const isPenaltyGroup = applications.some((a) => {
      const originalChange = changes.find((c) => c.index === a.changeIndex);
      return originalChange?.isPenalty;
    });

    // Rule 1: Penalties always apply
    if (isPenaltyGroup) {
      for (const app of applications) {
        const originalChange = changes.find((c) => c.index === app.changeIndex);
        if (originalChange?.isPenalty && originalChange.value !== 0) {
          winners.push({
            ...app,
            reason: 'penalty',
          });
        }
        history.push({
          changeIndex: app.changeIndex,
          field,
          bonusType,
          source: app.source,
          value: app.value,
          applied: originalChange?.isPenalty ?? false,
          rejection: originalChange?.isPenalty ? undefined : 'not a penalty',
        });
      }
      continue;
    }

    // Rule 2: Untyped bonuses always stack (sum all)
    if (bonusType === undefined) {
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

    // Rule 3: Named types use highest-wins
    // (In Phase 2: 'material' | 'broken' | 'masterwork')
    // Phase 10 adds 'dodge' which stacks instead of highest-wins
    const highest = applications.reduce((max, app) => {
      return app.value > max.value ? app : max;
    });

    winners.push({
      ...highest,
      reason: 'highest',
    });

    // Record all in history
    for (const app of applications) {
      if (app.changeIndex === highest.changeIndex) {
        history.push({
          changeIndex: app.changeIndex,
          field,
          bonusType,
          source: app.source,
          value: app.value,
          applied: true,
        });
      } else {
        history.push({
          changeIndex: app.changeIndex,
          field,
          bonusType,
          source: app.source,
          value: app.value,
          applied: false,
          rejection: `${bonusType} type, lower value (${app.value} < ${highest.value})`,
        });
      }
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
