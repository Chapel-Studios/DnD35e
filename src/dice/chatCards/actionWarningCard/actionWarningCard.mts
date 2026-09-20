/**
 * Standalone warning card posted when an item's automatic action-economy spend
 * (equip/unequip/stow/retrieve) fails for lack of the required action — nothing was
 * actually consumed, so unlike the other cards there's no flags/Undo bookkeeping.
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { ChatMessageSource } from '@common/documents/chat-message.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';

import actionWarningCardTemplateSource from './action-warning-card.hbs?raw';

const actionWarningCardTemplate = Handlebars.compile(actionWarningCardTemplateSource, { preventIndent: true });

async function buildActionEconomyWarningCard(combatant: CombatantDnd35e, actor: ActorDnd35e, warningMessage: string): Promise<void> {
  await ChatMessage.create({
    content: actionWarningCardTemplate({ combatantName: combatant.name, warningMessage }),
    speaker: ChatMessage.getSpeaker({ actor }),
  } as unknown as ChatMessageSource);
}

export { buildActionEconomyWarningCard };
