import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { DatabaseCreateCallbackOptions } from '@common/abstract/_types.mjs';
import { SIZE_TOKEN_DIMENSIONS } from '@constants/sizes.mjs';

import type { SceneDnd35e } from '../SceneDnd35e.mjs';

class TokenDocumentDnd35e<TParent extends SceneDnd35e | null = SceneDnd35e | null> extends TokenDocument<TParent> {
  protected override async _preCreate(
    data: this['_source'],
    options: DatabaseCreateCallbackOptions,
    user: foundry.documents.BaseUser
  ): Promise<boolean | void> {
    const result = await super._preCreate(data, options, user);
    if (result === false) return false;

    const actor = this.actor as ActorDnd35e | null;
    const size = actor?.system?.size;
    if (size && size in SIZE_TOKEN_DIMENSIONS) {
      const dim = SIZE_TOKEN_DIMENSIONS[size];
      this.updateSource({ width: dim, height: dim });
    }
  }
}

export { TokenDocumentDnd35e };
