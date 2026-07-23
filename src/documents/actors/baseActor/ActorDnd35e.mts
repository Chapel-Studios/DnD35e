import type { ActorType } from '@actors/actorTypes.mjs';
import { ACTOR_TYPES_LOCALIZED } from '@actors/actorTypes.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import type { DatabaseCreateCallbackOptions } from '@common/abstract/_types.mjs';
import type EmbeddedCollection from '@common/abstract/embedded-collection.mjs';
import { DocumentMixin } from '@documents/document/DocumentDnd35e.mjs';
import { DocumentLifeCycle } from '@documents/document/events/DocumentLifeCycle.mjs';
import { ensureNameFormulaOnCreate, type NameFormulaDocument } from '@documents/document/logic/index.mjs';
import type { ActiveEffectDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE, SYSTEM_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import { applyStackedActiveEffectChanges, type ResolvedEffectChange } from '@effects/baseActiveEffect/logic/applyStackedChanges.mjs';
import { resolveActiveEffectChange } from '@effects/baseActiveEffect/logic/resolveChangeValue.mjs';
import { DocumentEventEmitter } from '@helpers/documentEvents/DocumentEventEmitter.mjs';
import { LogHelper } from '@helpers/LogHelper.mjs';
import type { Override } from '@helpers/stacking.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/itemTypes.mjs';
import type { TokenDocumentDnd35e } from '@scene/tokenDocument/TokenDocumentDnd35e.mjs';

import type { ActorSystemData } from './index.mjs';

// Apply mixin at runtime but cast to preserve generic parameter compatibility.
// TypeScript mixins erase generics; this cast is safe because the mixin only adds
// methods/properties and doesn't alter the constructor signature's generic behavior.
const ActorDocumentBase = DocumentMixin(Actor) as unknown as typeof Actor;

type AppliedActorEffectChange = ResolvedEffectChange;

class ActorDnd35e<
  TToken extends TokenDocumentDnd35e | null = TokenDocumentDnd35e | null,
  TActorType extends ActorType = ActorType,
  TSystemData extends ActorSystemData = ActorSystemData
> extends ActorDocumentBase<TToken> {
  declare readonly effects: EmbeddedCollection<ActiveEffectDnd35e>;
  declare readonly items: EmbeddedCollection<ItemDnd35e<ItemType, this>>;
  declare type: TActorType;
  declare system: TSystemData;
  declare events: DocumentEventEmitter<this>;
  /**
   * Field-path -> contributing-effect history, mirroring ItemDnd35e's `effectOverrides`
   * shape. Populated by the shared stacking engine in `applyActiveEffects()` (see
   * `applyStackedActiveEffectChanges`). Deliberately named differently from core's own
   * `overrides: ActorOverrides` (a deep-partial-value shape) - that core property is left
   * untouched since nothing in this system reads it, and reusing its name would conflict
   * with core's declared type.
   */
  effectOverrides: Record<string, Override[]> = {};

  get localizedType (): string {
    return ACTOR_TYPES_LOCALIZED[this.type as ActorType] ?? 'dnd35e.COMMON.Actor';
  }

  override prepareBaseData (): void {
    super.prepareBaseData();
    this.effectOverrides = {};
  }

  /**
   * Override to filter out item-targeted changes from transferred effects.
   * Effects can have both item and actor targeted changes - we only apply actor-targeted changes here.
   * @param phase - The effect application phase ('initial' or 'final')
   */
  override applyActiveEffects(phase: string): void {
    const ActiveEffect = foundry.documents.ActiveEffect;
    if ( !(phase in ActiveEffect.CHANGE_PHASES) ) {
      const error = new Error(`"${phase}" is not a registered ActiveEffect application phase.`);
      Hooks.onError('ActorDnd35e#applyActiveEffects', error, { log: 'error' });
      return;
    }
    if ( this._completedActiveEffectPhases.has(phase) ) {
      const error = new Error(`ActiveEffect application phase "${phase}" has already completed and cannot be run again in this Actor's data-preparation cycle.`);
      Hooks.onError('ActorDnd35e#applyActiveEffects', error, { log: 'error' });
      return;
    }
    this._completedActiveEffectPhases.add(phase);

    // Organize non-disabled effects by their application priority
    const changes: AppliedActorEffectChange[] = [];
    for ( const effect of this.allApplicableEffectsDnd35e() ) {
      if ( !effect.active ) continue;
      for ( const change of effect.system.changes ) {
        // Only apply actor-targeted changes (default to actor for backwards compatibility with base Foundry effects)
        const changeTarget = change.target ?? EFFECT_CHANGE_TARGET.ACTOR;
        if (
          !change.key
          || (change.phase !== phase)
          || (changeTarget !== EFFECT_CHANGE_TARGET.ACTOR)
          // MASK changes are not applied via stacking — Secret AEs' masked values are
          // read directly by maskMap.mts to build the actor's masks dictionary.
          || (change.type === SYSTEM_CHANGE_TYPE.MASK)
        ) continue;
        const copy = foundry.utils.deepClone(resolveActiveEffectChange(effect, change)) as AppliedActorEffectChange;
        copy.effect = effect as ActiveEffectDnd35e;
        copy.type ??= EFFECT_CHANGE_TYPE.ADD;
        copy.priority ??= 0;
        changes.push(copy);
      }
      if ( phase === 'initial' ) {
        for ( const statusId of effect.statuses ) this.statuses.add(statusId);
      }
    }

    // Items can also contribute actor-targeted changes with no backing AE document at
    // all (e.g. carried-weight, equipped-status) - see `ItemDnd35e.getContributedActorChanges()`.
    // Already phase-filtered by the item; no `resolveActiveEffectChange()` needed since
    // these values are computed live, not read from a stored AE.
    for ( const item of this.items ) {
      for ( const change of item.getContributedActorChanges(phase) ) {
        if ( !change.key ) continue;
        const copy = foundry.utils.deepClone(change) as AppliedActorEffectChange;
        copy.effect = item;
        copy.type ??= EFFECT_CHANGE_TYPE.ADD;
        copy.priority ??= 0;
        changes.push(copy);
      }
    }

    // The actor can also contribute changes derived from its own data with no backing
    // AE document at all (e.g. Creature's encumbrance penalties) - see
    // `getSelfContributedChanges()`. Already phase-filtered by the override; no
    // `resolveActiveEffectChange()` needed since these values are computed live, not
    // read from a stored AE.
    for ( const change of this.getSelfContributedChanges(phase) ) {
      if ( !change.key ) continue;
      const copy = foundry.utils.deepClone(change) as AppliedActorEffectChange;
      copy.effect = this;
      copy.type ??= EFFECT_CHANGE_TYPE.ADD;
      copy.priority ??= 0;
      changes.push(copy);
    }
    changes.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    // Resolve bonus-type stacking and apply the winners, recording Override
    // history for every field touched (shared with ItemDnd35e.applyActiveEffects).
    applyStackedActiveEffectChanges(this, changes);
  }

  /**
   * Live, self-targeted changes this actor contributes with no backing ActiveEffect
   * document at all - e.g. Creature's encumbrance penalties (max Dex bonus, armor check
   * penalty, land speed downgrade). Recomputed fresh from this actor's own current
   * system data on every call (called from `applyActiveEffects()` each preparation
   * cycle) - never persisted, so there is no document to create, toggle, or delete.
   * Base implementation returns none; overridden by subclasses that need this.
   */
  getSelfContributedChanges(_phase: string): EffectChangeDataDnd35e[] {
    return [];
  }

  /**
   * Iterate all applicable effects from actor and transferred item effects.
   *
   * NOTE: This is deliberately NOT named `allApplicableEffects` and does NOT use
   * `override`. Even with core `Actor.allApplicableEffects()` fixed upstream to use a
   * non-recursive `ActiveEffect<Actor | Item>` return type (see actor.d.mts), an
   * override here would still narrow the return type to reference `this`/`ActiveEffectDnd35e<...>`
   * recursively, forcing TypeScript to re-prove `Character` satisfies core `Actor` as
   * part of checking the override itself — a circular self-reference. Using an
   * unrelated method name sidesteps the override covariance check entirely.
   * `applyActiveEffects()` below is already a full `override` that replaces core's
   * effect-application pipeline, so core never calls its own `allApplicableEffects()`
   * internally for us — this rename does not change runtime behavior.
   */
  *allApplicableEffectsDnd35e(): Generator<ActiveEffectDnd35e, void, void> {
    for ( const effect of this.effects ) {
      yield effect;
    }
    for ( const item of this.items ) {
      for ( const effect of item.effects ) {
        if ( effect.transfer ) yield effect;
      }
    }
  }

  // LifeCycle-------------------------------------------------------------------
  static readonly LifeCycle = {
    // This sadly doesn't properly inherit this from the Mixin
    ...DocumentLifeCycle,
  } as const;

  protected override async _preCreate (
    data: this['_source'],
    options: DatabaseCreateCallbackOptions,
    user: foundry.documents.BaseUser
  ): Promise<boolean | void> {
    const result = await super._preCreate(data, options, user);
    if (result === false) return false;
    await ensureNameFormulaOnCreate(this as unknown as NameFormulaDocument, options);
  }
}

const ActorProxyDnd35e = new Proxy(ActorDnd35e, {
  construct (
    _target,
    args: [source: PreCreate<foundry.documents.ActorSource>, context?: DocumentConstructionContext<ActorDnd35e | null>]
  ) {
    const [source] = args;
    const type = source?.type;
    const ActorClass = CONFIG.dnd35e.actor.documentClasses[type] as unknown as typeof ActorDnd35e;
    if (!ActorClass) {
      LogHelper.error(`Actor type ${type} does not exist or is not properly supported for ActorProxyDnd35e`);
    }
    return new ActorClass(...args);
  },
});

export { ActorDnd35e, ActorProxyDnd35e };
