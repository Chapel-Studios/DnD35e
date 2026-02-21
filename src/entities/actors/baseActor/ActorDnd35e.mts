import Actor from '@client/documents/actor.mjs';
import EmbeddedCollection from '@common/abstract/embedded-collection.mjs';
import type { EffectChangeData } from '@common/documents/active-effect.mjs';
import type { DnD35eActiveEffect, Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/index.mjs';
import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE } from '@effects/BaseActiveEffect/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/itemTypes.mjs';
import { TokenDocumentDnd35e } from '@scene/token-document/TokenDocumentDnd35e.mjs';

interface AppliedActorEffectChange extends Dnd35eEffectChangeData {
  effect: DnD35eActiveEffect;
}

class ActorDnd35e<TParent extends TokenDocumentDnd35e | null = TokenDocumentDnd35e | null> extends Actor<TParent> {
  declare readonly effects: EmbeddedCollection<DnD35eActiveEffect<this>>;
  declare readonly items: EmbeddedCollection<ItemDnd35e<ItemType, this>>;

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
        const copy = foundry.utils.deepClone(change) as AppliedActorEffectChange;
        copy.effect = effect as DnD35eActiveEffect;
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
   * Override to properly type the generator for our effect types.
   */
  override *allApplicableEffects(): Generator<DnD35eActiveEffect<this | ItemDnd35e<ItemType, this>>, void, void> {
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

export { ActorDnd35e };
