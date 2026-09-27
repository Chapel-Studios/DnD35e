import { type ActionEconomyType,MOVE_ACTION } from '@constants/actionEconomy.mjs';
import { spendAction } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { DROP_PRONE_MOVEMENT_ACTION, STAND_UP_MOVEMENT_ACTION } from '@documents/token/logic/movementActionGating.mjs';
import { applyProneToggle } from '@documents/token/logic/proneToggle.mjs';
import type { TokenDocumentDnd35e } from '@scene/index.mjs';
import { buildProneToggleCard } from '@source/dice/index.mjs';

import type { Creature } from '../Creature.mjs';

const DROP_OR_STAND_ACTIONS = [
  DROP_PRONE_MOVEMENT_ACTION,
  STAND_UP_MOVEMENT_ACTION,
] as const;

type DropOrStandAction = typeof DROP_OR_STAND_ACTIONS[number];

const performStandUpOrDropProne = async (
  actor: Creature,
  token: TokenDocumentDnd35e,
  action: DropOrStandAction
): Promise<boolean> => {
  if (!actor) return false;

  const droppedProne = action === DROP_PRONE_MOVEMENT_ACTION;
  const combat = game.combat;
  const tokenId = token.id;
  const combatant = combat?.started && tokenId
    ? (combat.getCombatantsByToken(tokenId)[0] as CombatantDnd35e | undefined)
    : undefined;

  // Standing up is a move action (SRD); dropping prone is free. Spend before toggling
  // so a combatant with no move action left can't stand up at all.
  let spentTiers: ActionEconomyType[] = [];
  if (!droppedProne && combatant) {
    const spent = await spendAction(combatant, [MOVE_ACTION]);
    if (!spent) {
      ui.notifications.warn(game.i18n.localize('dnd35e.COMBAT.NoActionAvailable'));
      return false;
    }
    spentTiers = spent;
  }

  await applyProneToggle(actor, token, droppedProne);
  if (combatant) await buildProneToggleCard(combatant, actor, droppedProne, !droppedProne, spentTiers);
  return true;
};

export { performStandUpOrDropProne };
