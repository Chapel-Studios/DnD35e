import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { EffectChangeData } from '@common/documents/active-effect.mjs';
import type { ActiveEffectDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import type { ChangeHistory, Override, StackingChange } from '@helpers/stacking.mjs';
import {
  parseNumericChangeValue,
  resolveActiveEffectChanges,
  STACK_RESULT_APPLIED,
  STACK_RESULT_IGNORED,
} from '@helpers/stacking.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';

/**
 * A resolved active effect change, ready for stacking + application. Produced by each
 * document's own gathering loop (target/phase filtering, `resolveActiveEffectChange`
 * deep-clone) - this module is only concerned with stacking resolution and applying
 * the winning changes.
 */
interface ResolvedEffectChange extends EffectChangeDataDnd35e {
  /**
   * The real ActiveEffect this change came from, or the Item/Actor that live-computed it
   * with no backing AE document (e.g. carried-weight/equipped-status contributions - see
   * `ItemDnd35e.getContributedActorChanges()`; or an actor's own derived conditions like
   * encumbrance - see `ActorDnd35e.getSelfContributedChanges()`). Always set by the
   * gathering loop, so every change always has SOME attributable source document for
   * override history.
   */
  effect: ActiveEffectDnd35e | ItemDnd35e | ActorDnd35e;
}

/**
 * Minimal shape required of a document to receive stacked AE changes.
 *
 * Named `effectOverrides` (not `overrides`) because core `Actor#overrides` is already
 * typed as `ActorOverrides` (a deep-partial-value shape) - this system uses a richer
 * per-field `Override[]` history instead, so both ActorDnd35e and ItemDnd35e expose it
 * under this distinct name.
 */
interface StackableChangeTarget {
  effectOverrides: Record<string, Override[]>;
  // `object` (not `Record<string, unknown>`) to match both core `Item#getRollData()`
  // and `Actor#getRollData()` signatures.
  getRollData(): object;
}

/**
 * Resolve bonus-type stacking for a set of already-gathered, same-phase, same-target
 * changes, then apply the winners to `document` and record rich `Override` metadata
 * (source effect, stack result, rejection reason) for every field touched - both
 * winners and stacking losers.
 *
 * Shared by `ActorDnd35e.applyActiveEffects()` and `ItemDnd35e.applyActiveEffects()` so
 * both document types resolve stacking (and record override history) identically.
 *
 * @param document - The Actor or Item receiving the changes. Its `overrides` is mutated.
 * @param changes - Pre-filtered, pre-cloned changes (see each caller's gathering loop).
 */
function applyStackedActiveEffectChanges<TDocument extends StackableChangeTarget>(
  document: TDocument,
  changes: ResolvedEffectChange[]
): void {
  const ActiveEffect = foundry.documents.ActiveEffect;
  // TODO in v16, remove this shim, it's for backwards compatibility with core's legacy `ActiveEffect.applyChange()` signature
  ActiveEffect._shimChanges(changes as unknown as EffectChangeData[]);

  const stackingChanges: StackingChange[] = changes.map((change, index) => {
    const numericValue = parseNumericChangeValue(change.value);
    const bonusType = change.bonusType || undefined;
    const effectName = change.label
      ?? (change.effect instanceof ActiveEffect
        ? change.effect.system.label
        : undefined)
      ?? change.effect.name
      ?? 'Unknown Effect';

    return {
      index,
      field: change.key,
      bonusType,
      value: numericValue,
      source: effectName,
      effectId: change.effect instanceof ActiveEffect
        ? (change.effect.id
          ?? undefined)
        : undefined,
    };
  });

  // Resolve stacking — only numeric, typed changes participate
  const numericStackable = stackingChanges.filter(sc => !isNaN(sc.value) && sc.bonusType !== undefined);
  const { winners, history } = resolveActiveEffectChanges(numericStackable);
  const winnerIndices = new Set(winners.map(w => w.changeIndex));
  const historyByIndex = new Map<number, ChangeHistory>();
  for (const h of history) historyByIndex.set(h.changeIndex, h);
  const winnerByIndex = new Map(winners.map(w => [w.changeIndex, w]));

  // Apply winning changes + all non-stackable changes (untyped or non-numeric)
  const replacementData = document.getRollData() as Record<string, unknown>;
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const sc = stackingChanges[i];
    const isStackable = !isNaN(sc.value) && sc.bonusType !== undefined;
    const isWinner = winnerIndices.has(i);
    const effectName = change.label
      ?? (change.effect instanceof ActiveEffect
        ? change.effect.system.label
        : undefined)
      ?? change.effect.name
      ?? 'Unknown Effect';

    if (isStackable && !isWinner) {
      // Stacking loser — record in overrides but don't apply
      const historyEntry = historyByIndex.get(i);
      document.effectOverrides[change.key] = [
        ...(document.effectOverrides[change.key] ?? []),
        {
          fieldPath: change.key,
          value: change.value,
          effectName,
          type: change.type,
          bonusType: sc.bonusType,
          stackResult: STACK_RESULT_IGNORED,
          stackReason: historyEntry?.rejection ?? 'stacking resolution',
        },
      ];
      continue;
    }

    // Apply the change (winner or non-stackable).
    // `document as never` sidesteps the generic `TDocument` not being known to
    // satisfy core's `Actor | Item` handler signature - both ActorDnd35e and
    // ItemDnd35e are Foundry documents at runtime.
    // Note: this always uses the base `ActiveEffect.applyChange` (not `change.effect`'s
    // own constructor) - no subclass overrides it, and `change.effect` may now be an
    // `ItemDnd35e` (no `applyChange` of its own) for live item-contributed changes.
    const result = (ActiveEffect.CHANGE_TYPES[change.type].handler?.(document as never, change as unknown as EffectChangeData)
      ?? ActiveEffect.applyChange(document as never, change as unknown as EffectChangeData, { replacementData })
      ?? {}) as Record<string, unknown>;

    for (const fieldPath of Object.keys(result)) {
      const winner = isStackable ? winnerByIndex.get(i) : undefined;
      document.effectOverrides[fieldPath] = [
        ...(document.effectOverrides[fieldPath] ?? []),
        {
          fieldPath,
          value: change.value,
          effectName,
          type: change.type,
          bonusType: sc.bonusType,
          stackResult: isStackable ? STACK_RESULT_APPLIED : undefined,
          stackReason: winner?.reason,
        },
      ];
    }
  }
}

export {
  applyStackedActiveEffectChanges,
};

export type {
  ResolvedEffectChange,
  StackableChangeTarget,
};
