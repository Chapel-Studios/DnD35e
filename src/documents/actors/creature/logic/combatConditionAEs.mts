/**
 * combatConditionAEs — poc.10 Story D, §10.7. Thin wrappers around `Actor#toggleStatusEffect()`
 * for the Charge/Defensive Fighting attack-dialog toggles. No bespoke "short duration AE"
 * machinery is needed — `CHARGED_CONDITION_ID`/`DEFENSIVE_FIGHTING_CONDITION_ID`'s AC changes
 * already live on the `CONDITIONS` registry (see `constants/conditions.mts`), the same
 * mechanism Prone/Flat-Footed use. "Short duration" is enforced by `CombatDnd35e#_onStartTurn()`
 * clearing both at the start of the affected actor's own next turn, mirroring how Flat-Footed
 * is cleared at the start of round 1's first turn.
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { CHARGED_CONDITION_ID, DEFENSIVE_FIGHTING_CONDITION_ID } from '@constants/conditions.mjs';

/** Applies the Charge combat state (-2 AC until the actor's next turn) — see module doc. */
async function applyChargedAE(actor: ActorDnd35e): Promise<void> {
  await actor.toggleStatusEffect(CHARGED_CONDITION_ID, { active: true });
}

/** Applies the Defensive Fighting combat state (+2 AC until the actor's next turn) — see module doc. */
async function applyDefensiveFightingAE(actor: ActorDnd35e): Promise<void> {
  await actor.toggleStatusEffect(DEFENSIVE_FIGHTING_CONDITION_ID, { active: true });
}

export { applyChargedAE, applyDefensiveFightingAE };
