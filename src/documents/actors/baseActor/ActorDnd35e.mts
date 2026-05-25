import type { ActorType } from '@actors/actorTypes.mjs';
import { ACTOR_TYPES_LOCALIZED } from '@actors/actorTypes.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import type EmbeddedCollection from '@common/abstract/embedded-collection.mjs';
import type { EffectChangeData } from '@common/documents/active-effect.mjs';
import { DocumentLifeCycle, DocumentMixin } from '@documents/document/DocumentDnd35e.mjs';
import type { ActiveEffectDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import { resolveActiveEffectChange } from '@effects/baseActiveEffect/logic/resolveChangeValue.mjs';
import { DocumentEventEmitter } from '@helpers/DocumentEventEmitter.mjs';
import { LogHelper } from '@helpers/LogHelper.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/itemTypes.mjs';
import type { TokenDocumentDnd35e } from '@scene/tokenDocument/TokenDocumentDnd35e.mjs';

import type { ActorSystemData } from './index.mjs';

// Apply mixin at runtime but cast to preserve generic parameter compatibility.
// TypeScript mixins erase generics; this cast is safe because the mixin only adds
// methods/properties and doesn't alter the constructor signature's generic behavior.
const ActorDocumentBase = DocumentMixin(Actor) as unknown as typeof Actor;

interface AppliedActorEffectChange extends EffectChangeDataDnd35e {
  effect: ActiveEffectDnd35e;
}

// ─── Domain event payload interfaces ─────────────────────────────────────────

/** Payload for the `takeDamage` actor event. */
interface TakeDamagePayload {
  amount: number;
  damageType: string;
  source?: string;
  attackerId?: string;
}

/** Payload for the `dying` actor event (HP dropped to ≤ 0, above death threshold). */
interface DyingPayload {
  previousHp: number;
  currentHp: number;
  cause?: string;
  attackerId?: string;
}

/** Payload for the `death` actor event (HP dropped to death threshold). */
interface DeathPayload {
  previousHp: number;
  currentHp: number;
  cause?: string;
  attackerId?: string;
  damage?: number;
}

/** Payload for the `revealSecret` actor event (Secret AE disabled). */
interface RevealSecretPayload {
  secretAeId: string;
  field: string;
  previousValue: unknown;
  revealedValue: unknown;
}


class ActorDnd35e<
  TToken extends TokenDocumentDnd35e | null = TokenDocumentDnd35e | null,
  TActorType extends ActorType = ActorType,
  TSystemData extends ActorSystemData = ActorSystemData
> extends ActorDocumentBase<TToken> {
  declare readonly effects: EmbeddedCollection<ActiveEffectDnd35e<this>>;
  declare readonly items: EmbeddedCollection<ItemDnd35e<ItemType, this>>;
  declare type: TActorType;
  declare system: TSystemData;

  get localizedType (): string {
    return ACTOR_TYPES_LOCALIZED[this.type as ActorType] ?? 'dnd35e.COMMON.Actor';
  }

  /**
   * Static registry of lifecycle event names for this class.
   * Subclasses extend via spread:
   *   `static override readonly LifeCycle = { ...ActorDnd35e.LifeCycle, myEvent: 'myEvent' } as const`
   *
   * Usage: `actor.events.on(ActorDnd35e.LifeCycle.takeDamage, handler)`
   */
  static readonly LifeCycle = {
    ...DocumentLifeCycle,
    /** Damage applied to actor HP. Payload: {@link TakeDamagePayload} */
    takeDamage: 'takeDamage',
    /** Actor HP dropped to ≤ 0 but above the death threshold. Payload: {@link DyingPayload} */
    dying: 'dying',
    /** Actor HP dropped to the world death threshold. Payload: {@link DeathPayload} */
    death: 'death',
    /** Secret AE disabled — true value revealed. Payload: {@link RevealSecretPayload} */
    revealSecret: 'revealSecret',
  } as const;

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
    for ( const effect of this.allApplicableEffects() ) {
      if ( !effect.active ) continue;
      for ( const change of effect.system.changes ) {
        // Only apply actor-targeted changes (default to actor for backwards compatibility with base Foundry effects)
        const changeTarget = change.target ?? EFFECT_CHANGE_TARGET.ACTOR;
        if ( !change.key || (change.phase !== phase) || (changeTarget !== EFFECT_CHANGE_TARGET.ACTOR) ) continue;
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
    changes.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    ActiveEffect._shimChanges(changes as EffectChangeData[]);

    // Apply all changes
    const overrides: Record<string, unknown> = {};
    const replacementData = this.getRollData();
    for ( const change of changes ) {
      const EffectClass = change.effect.constructor as typeof ActiveEffect;
      const result = ActiveEffect.CHANGE_TYPES[change.type].handler?.(this, change as EffectChangeData)
        ?? EffectClass.applyChange(this, change as EffectChangeData, { replacementData });
      if ( foundry.utils.isPlainObject(result) ) Object.assign(overrides, result as Record<string, unknown>);
    }

    // Expand the set of final overrides
    foundry.utils.mergeObject(this.overrides, foundry.utils.expandObject(overrides));
  }

  /**
   * Override to iterate all applicable effects from actor and transferred item effects.
   */
  override *allApplicableEffects(): Generator<ActiveEffectDnd35e<this | ItemDnd35e<ItemType, this>>, void, void> {
    for ( const effect of this.effects ) {
      yield effect;
    }
    for ( const item of this.items ) {
      for ( const effect of item.effects ) {
        if ( effect.transfer ) yield effect;
      }
    }
  }
}

// ─── Well-known event registrations ──────────────────────────────────────────

DocumentEventEmitter.registerEventType(ActorDnd35e.LifeCycle.takeDamage, {
  label: 'dnd35e.EVENTS.takeDamage.label',
  description: 'dnd35e.EVENTS.takeDamage.description',
  appliesTo: ['Actor'],
});
DocumentEventEmitter.registerEventType(ActorDnd35e.LifeCycle.dying, {
  label: 'dnd35e.EVENTS.dying.label',
  description: 'dnd35e.EVENTS.dying.description',
  appliesTo: ['Actor'],
});
DocumentEventEmitter.registerEventType(ActorDnd35e.LifeCycle.death, {
  label: 'dnd35e.EVENTS.death.label',
  description: 'dnd35e.EVENTS.death.description',
  appliesTo: ['Actor'],
});
DocumentEventEmitter.registerEventType(ActorDnd35e.LifeCycle.revealSecret, {
  label: 'dnd35e.EVENTS.revealSecret.label',
  description: 'dnd35e.EVENTS.revealSecret.description',
  appliesTo: ['Actor'],
});

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
export type { DeathPayload, DyingPayload, RevealSecretPayload, TakeDamagePayload };
