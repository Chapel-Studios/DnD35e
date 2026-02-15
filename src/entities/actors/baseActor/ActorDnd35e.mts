import Actor from '@client/documents/actor.mjs';
import EmbeddedCollection from '@common/abstract/embedded-collection.mjs';
import { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';
import { ItemDnd35e } from '@items/baseItem/index.mjs';
import { ItemType } from '@items/itemTypes.mjs';
import { TokenDocumentDnd35e } from '@scene/token-document/TokenDocumentDnd35e.mjs';

class ActorDnd35e<TParent extends TokenDocumentDnd35e | null = TokenDocumentDnd35e | null> extends Actor<TParent> {
  declare readonly effects: EmbeddedCollection<DnD35eActiveEffect<this>>;
  declare readonly items: EmbeddedCollection<ItemDnd35e<ItemType, this>>;

  // Probably not needed...
  // override *allApplicableEffects(): Generator<DnD35eActiveEffect<this | ItemDnd35e<ItemType, this>>, void, void> {
  //   for ( const effect of this.effects ) {
  //     yield effect;
  //   }
  //   for ( const item of this.items ) {
  //     for ( const effect of item.effects ) {
  //       if ( effect.transfer ) yield effect;
  //     }
  //   }
  // }
}

export { ActorDnd35e };
