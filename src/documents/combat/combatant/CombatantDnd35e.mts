import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { TokenDocumentDnd35e } from '@documents/scene/tokenDocument/index.mjs';

import type { CombatDnd35e } from '../CombatDnd35e.mjs';
import type { CombatantActionEconomy } from './combatantActionEconomy.mjs';
import { getActionEconomy } from './combatantActionEconomy.mjs';

/**
 * CombatantDnd35e — client-side Combatant document subclass.
 *
 * @module
 */
class CombatantDnd35e<
  TParent extends CombatDnd35e | null = CombatDnd35e | null,
> extends foundry.documents.Combatant<TParent, TokenDocumentDnd35e | null> {
  get actionEconomy(): CombatantActionEconomy {
    return getActionEconomy(this);
  }
}

// Type-only override merged onto the class — base getter resolves through
// `TTokenDocument['actor']`, which is Foundry's own `Actor`, not `ActorDnd35e`.
interface CombatantDnd35e<TParent extends CombatDnd35e | null = CombatDnd35e | null>
  extends foundry.documents.Combatant<TParent, TokenDocumentDnd35e | null>
{
  get actor(): ActorDnd35e | null;
}

export { CombatantDnd35e };
