/**
 * combatConditionAEs — poc.10 Story D/E, §10.7. Thin wrappers around `Actor#toggleStatusEffect()`
 * for the Charge/Defensive Fighting/Total Defense combat-state toggles. `CHARGED_CONDITION_ID`/
 * `DEFENSIVE_FIGHTING_CONDITION_ID`/`TOTAL_DEFENSE_CONDITION_ID`'s AC changes live on the
 * `CONDITIONS` registry (see `constants/conditions.mts`), same as Prone/Flat-Footed. "Until your
 * next turn" is enforced by each condition's own native `duration: { value: 1, units: 'turns' }` —
 * Foundry's built-in `ActiveEffectRegistry` flags it `duration.expired` at the start of that
 * actor's own next turn with no custom hook; `ActiveEffectDnd35e#_onUpdate()` then self-deletes
 * the effect (opted in via `system.deleteOnExpiry: true`, set on every condition in
 * `conditions.mts`) so a later re-toggle isn't blocked by a stale expired-but-undeleted effect
 * (`CONFIG.ActiveEffect.expiryAction` itself stays at core's global default — see that method's
 * doc comment for why it can't be flipped to 'delete' wholesale).
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { CHARGED_CONDITION_ID, DEFENSIVE_FIGHTING_CONDITION_ID, TOTAL_DEFENSE_CONDITION_ID } from '@constants/conditions.mjs';

/** Applies the Charge combat state (-2 AC until the actor's next turn) — see module doc. */
async function applyChargedAE(actor: ActorDnd35e): Promise<void> {
  await actor.toggleStatusEffect(CHARGED_CONDITION_ID, { active: true });
}

/** Applies the Defensive Fighting combat state (+2 AC until the actor's next turn) — see module doc. */
async function applyDefensiveFightingAE(actor: ActorDnd35e): Promise<void> {
  await actor.toggleStatusEffect(DEFENSIVE_FIGHTING_CONDITION_ID, { active: true });
}

/** Applies the Total Defense combat state (+4 AC until the actor's next turn) — see module doc. */
async function applyTotalDefenseAE(actor: ActorDnd35e): Promise<void> {
  await actor.toggleStatusEffect(TOTAL_DEFENSE_CONDITION_ID, { active: true });
}

export { applyChargedAE, applyDefensiveFightingAE, applyTotalDefenseAE };

