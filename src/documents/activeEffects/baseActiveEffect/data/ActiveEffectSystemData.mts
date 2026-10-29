import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { ActiveEffectSystemSource, EffectChangeData } from '@common/documents/active-effect.mjs';
import type { BonusType } from '@constants/bonusTypes.mjs';
import type { DocumentSystemData } from '@documents/document/index.mjs';
import type { EffectChangeTarget } from '@effects/baseActiveEffect/data/constants.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';

import type { ActiveEffectDnd35e } from '../index.mjs';

type ActiveEffectTarget = 'actor' | 'item';

/**
 * Extended change data that includes the per-change target field.
 *
 * `effect` is omitted from core's `EffectChangeData` (which pins it to
 * `BaseActiveEffect | null`) rather than inherited, since the runtime shape
 * (`EffectChangeDataDnd35e` below) needs to widen it to also allow an `ItemDnd35e`/`ActorDnd35e`
 * for live, document-less item/actor contributions - a type TS won't allow as a covariant
 * override of a property inherited from a base interface. Authored/source `changes`
 * never carry an `effect` reference anyway; it's populated only at runtime by each
 * document's gathering loop (`ActorDnd35e.applyActiveEffects()`/`ItemDnd35e.applyActiveEffects()`).
 */
interface EffectChangeSourceDnd35e extends Omit<EffectChangeData, 'effect'> {
  /**
   * Stable per-row identifier (not a Foundry document id) — see `ActiveEffectSystemModel`'s
   * `changes` schema. Optional here since runtime-synthesized changes (item/actor
   * self-contributed changes built on the fly, e.g. `Creature.mts`/`PhysicalItem.mts`)
   * aren't stored rows and never need one; the schema always populates it for real ones.
   */
  id?: string;
  target: EffectChangeTarget;
  isSystem: boolean;
  label?: string;
  /** Optional bonus type for stacking resolution. Only set when stacking applies (poc Phase 2+). */
  bonusType?: BonusType | null;
  /** Optional formula-familiar condition for action-phase changes. poc Phase 8+. Must round-trip through the database, so string-form (FormulaFamiliar boolean grammar) only — no function form. */
  condition?: string | null;
  /**
   * Excludes this change from the Actor Effects tab's self-contributed-changes list
   * (`ActorSheetStore.selfContributedEffects`) without affecting `effectOverrides`/tooltip
   * attribution elsewhere. For baseline formula components (e.g. base AC, ability mod into
   * a save/AC) that aren't meaningfully "effects" on their own - unlike `isHidden`, which
   * hides a change everywhere.
   */
  hideFromEffectsTab?: boolean;
  /**
   * Authors a pre-decided stacking-ignored result directly, bypassing bonus-type
   * comparison entirely (`applyStackedActiveEffectChanges()`) — the change is recorded in
   * `effectOverrides` with `stackResult: 'ignored'`/this string as `stackReason`, but its
   * `value` is never applied to the document. For a condition-gated formula component
   * (e.g. Dex denied to AC by Flat-Footed) that should still show in the breakdown/sheet's
   * `HasActiveEffectsNotification` struck-through with a reason, rather than silently
   * vanishing — `resolveActiveEffectChanges()`'s real stacking engine has no concept of
   * "this bonus type always loses to a condition", only "two same-typed bonuses competing".
   */
  forcedIgnoreReason?: string;
}

interface ActiveEffectSystemSourceDnd35e extends DocumentSystemData, Omit<ActiveEffectSystemSource, 'changes'> {
  target: ActiveEffectTarget;
  isHidden: boolean;
  label?: string;
  /** See `ActiveEffectSystemModel.defineSchema()`'s `deleteOnExpiry` field doc comment. */
  deleteOnExpiry: boolean;
  changes: EffectChangeSourceDnd35e[];
}

interface EffectChangeDataDnd35e extends EffectChangeSourceDnd35e {
  /**
   * The document attributed as this change's source, for stacking-loser/winner override
   * history and tooltip attribution. Usually the real `ActiveEffect` the change was read
   * from - but items and actors can also contribute changes live with no backing AE
   * document at all: items for e.g. carried-weight/equipped-status (see
   * `ItemDnd35e.getContributedActorChanges()`), and actors for self-derived conditions
   * like encumbrance penalties (see `ActorDnd35e.getSelfContributedChanges()`).
   */
  effect?: ActiveEffectDnd35e<any> | ItemDnd35e | ActorDnd35e;
}

interface ActiveEffectSystemData extends Omit<ActiveEffectSystemSourceDnd35e, 'changes'> {
  changes: EffectChangeDataDnd35e[];
}

export type {
  ActiveEffectSystemData,
  ActiveEffectSystemSourceDnd35e,
  ActiveEffectTarget,
  EffectChangeDataDnd35e,
};
