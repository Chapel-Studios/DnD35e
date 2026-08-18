/**
 * CombatDnd35e — client-side Combat document subclass.
 *
 * poc.10 Story A:
 * - `_onStartRound()` auto-applies Flat-Footed to every combatant's actor on combat's
 *   actual first round, silently (no chat card — the condition's own token status icon is
 *   sufficient). Story B adds `_onStartTurn()` (action economy reset) to this same class
 *   additively.
 * - `rollInitiative()` bypasses Foundry's built-in formula-based initiative entirely (this
 *   codebase has no `getRollData()`/`@attr` bridge — see WISHLIST.md) and instead calls
 *   `Creature.rollInitiativeCheck()` per combatant, which opens the D20 roll dialog, evaluates a
 *   `D20Roll`, posts a chat card, and sets `combatant.update({ initiative })` itself. The
 *   tracker's per-row roll button always calls this with a single id (dialog shown); the
 *   "Roll All"/"Roll NPCs" buttons call it with multiple ids at once — showing a modal per
 *   combatant in that case would be unusable, so bulk rolls skip the dialog.
 *
 * Foundry v14's real client-side `Combat` class calls `_onStartRound`/`_onStartTurn` with a
 * `context` parameter at runtime even though the bundled `.d.mts` was stale on this (patched
 * locally in `types/foundry/client/documents/combat.d.mts` — see phase-10-basic-combat.md §10.1).
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { Creature } from '@actors/creature/index.mjs';
import type { CombatRoundEventContext, CombatTurnEventContext } from '@client/_types.mjs';
import type { RollInitiativeOptions } from '@client/documents/combat.mjs';
import { FLAT_FOOTED_CONDITION_ID } from '@constants/conditions.mjs';

class CombatDnd35e extends foundry.documents.Combat {
  protected override async _onStartRound(context: CombatRoundEventContext): Promise<void> {
    await super._onStartRound(context);
    if (context.round !== 1) return; // only combat's actual first round applies Flat-Footed (Story A)
    const applications = this.combatants.map((combatant) =>
      (combatant.actor as ActorDnd35e | undefined)?.toggleStatusEffect(FLAT_FOOTED_CONDITION_ID, { active: true })
    );
    await Promise.all(applications);
  }

  // Param typed against core's own `Combatant<this>` (not `CombatantDnd35e`) — the base
  // class's declared signature only parameterizes the parent slot, not the token-document
  // slot `CombatantDnd35e` narrows, so a narrower param type fails the override check.
  protected override async _onStartTurn(combatant: foundry.documents.Combatant<this>, context: CombatTurnEventContext): Promise<void> {
    await super._onStartTurn(combatant, context);
    if (context.round !== 1) return; // Flat-Footed end at start of the first turn of the combat
    await (combatant.actor as ActorDnd35e | undefined)?.toggleStatusEffect(FLAT_FOOTED_CONDITION_ID, { active: false });
  }

  override async rollInitiative(ids: string | string[], _options?: RollInitiativeOptions): Promise<this> {
    const idList = Array.isArray(ids) ? ids : [ids];
    // Rolling several combatants at once (Roll All/Roll NPCs) would otherwise pop a modal
    // dialog per combatant in sequence — skip the dialog for bulk rolls, keep it for the
    // tracker's single-row roll button.
    const skipDialog = idList.length > 1;
    for (const id of idList) {
      const combatant = this.combatants.get(id);
      const actor = combatant?.actor as ActorDnd35e | undefined;
      if (actor instanceof Creature) {
        await actor.rollInitiativeCheck({ skipDialog });
      }
    }

    return this;
  }
}

export { CombatDnd35e };
