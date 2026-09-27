import type { DealDamagePayload } from './dealDamage.mjs';

const UNDO_DEAL_DAMAGE_EVENT = 'undoDealDamage';

/**
 * Emitted when a Resolution card's Undo button reverses a prior `dealDamage` (poc.10
 * §10.7) — same payload shape, so a subscriber that reacted to the original event (e.g. a
 * future life-drain effect) can reverse its own reaction identically.
 */
type UndoDealDamagePayload = DealDamagePayload;

export { UNDO_DEAL_DAMAGE_EVENT };
export type { UndoDealDamagePayload };
