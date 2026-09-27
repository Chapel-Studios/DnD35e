/**
 * actionChainSteps — composite id helpers for attack chat cards (poc.10 Story D, §10.8).
 * The attack card stores a single string identifying the acting actor/item/action triple
 * so button handlers (`data-action="retarget"`, and Story E's `data-action="apply-attack"`)
 * can resolve back to the live documents without duplicating actor/item/action data onto
 * the message flags.
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { ActionDataModel } from '@items/baseItem/actions/ActionDataModel.mjs';

const ACTION_CHAIN_ID_SEPARATOR = '|';

/** Builds `${actor.uuid}|${item.uuid}|${action._id}` — see module doc. */
function buildActionChainId(actor: ActorDnd35e, action: ActionDataModel): string {
  return [actor.uuid, action.item?.uuid ?? '', action._id].join(ACTION_CHAIN_ID_SEPARATOR);
}

/** Splits a chain id built by `buildActionChainId()` back into its parts, or null if malformed. */
function parseActionChainId(chainId: string): { actorUuid: string; itemUuid: string; actionId: string } | null {
  const [actorUuid, itemUuid, actionId] = chainId.split(ACTION_CHAIN_ID_SEPARATOR);
  if (!actorUuid || !itemUuid || !actionId) return null;
  return { actorUuid, itemUuid, actionId };
}

export { ACTION_CHAIN_ID_SEPARATOR, buildActionChainId, parseActionChainId };
