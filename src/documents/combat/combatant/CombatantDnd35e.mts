import type { TokenDocumentDnd35e } from '@documents/scene/tokenDocument/index.mjs';

import type { CombatDnd35e } from '../CombatDnd35e.mjs';

/**
 * CombatantDnd35e — client-side Combatant document subclass.
 *
 * poc.10 Story A: registered so `CONFIG.Combatant.documentClass` can be swapped in ahead of
 * Story B, which adds the `actionEconomy` convenience accessor (delegates to
 * `combatantActionEconomy.mts`) once that module exists. No members yet — this class is
 * currently just a registration point.
 *
 * Parameterized with `CombatDnd35e`/`TokenDocumentDnd35e` (rather than the default core
 * `Combat`/`TokenDocument`) to match the `TCombatant` binding in `global.mts`'s `ThisConfig`.
 *
 * @module
 */
class CombatantDnd35e extends foundry.documents.Combatant<CombatDnd35e | null, TokenDocumentDnd35e | null> {
  
}

export { CombatantDnd35e };
