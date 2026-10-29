import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import { getActorToken } from '@documents/token/logic/getActorToken.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';

/**
 * Whoever/whatever is acting or being targeted in the action chain — a placed `Token`
 * when one is known/resolvable (preferred, since only a token has a position/name-display
 * identity), otherwise the bare `Actor` (§10.7 token-preference policy). Every shell method
 * (`executeAction()`/`continueAction()`) resolves this once via `resolveActionParticipant()`
 * — leaf actions never re-derive it.
 */
type ActionParticipant = ACTORS_DND35E | TokenDnd35e;

function isTokenParticipant(participant: ActionParticipant): participant is TokenDnd35e {
  return participant instanceof foundry.canvas.placeables.Token;
}

/** Unwraps a participant down to its `Actor` — the only shape most game-rule logic needs. */
function participantActor(participant: ActionParticipant): ACTORS_DND35E {
  return isTokenParticipant(participant) ? participant.actor as ACTORS_DND35E : participant;
}

/** The participant's placed token, if it has one — `null` for an actor-only (no-token) participant. */
function participantToken(participant: ActionParticipant): TokenDnd35e | null {
  return isTokenParticipant(participant) ? participant : null;
}

/** Display name — falls back to the actor's own name when no token is known (§10.7). */
function participantName(participant: ActionParticipant): string {
  const actor = participantActor(participant);
  return participantToken(participant)?.name ?? actor.token?.name ?? actor.name;
}

/**
 * Resolves the best available `ActionParticipant` for an actor (§10.7 token-preference
 * policy): an explicitly-known token always wins (e.g. the Token HUD's own token); otherwise
 * prefer its combatant token on the active encounter, then its first placed token on the
 * active scene (`getActorToken()`), and finally fall back to the bare actor when it has no
 * token anywhere. Callers needing position data (reach, etc.) must treat a token-less
 * participant as "assume it's fine" rather than blocking — see `MeleeWeaponAttack._validateMeleeReach()`.
 */
function resolveActionParticipant(actor: ACTORS_DND35E, explicitToken?: TokenDnd35e | null): ActionParticipant {
  if (explicitToken) return explicitToken;
  const combat = game.combat;
  if (combat?.started) {
    const combatantToken = combat.combatants.find(c => c.actor?.uuid === actor.uuid)?.token?.object as TokenDnd35e | undefined;
    if (combatantToken) return combatantToken;
  }
  return getActorToken(actor) ?? actor;
}

export {
  isTokenParticipant,
  participantActor,
  participantName,
  participantToken,
  resolveActionParticipant,
};
export type { ActionParticipant };
