// I'm 99% sure this needs to move to a global place so it can be consumed by
// both NPC's / Monsters and items. but Character doesn't need it.
// But for now, I'm just putting it here in the Creature base class


/** Payload for the `revealSecret` actor event (Secret AE disabled). */
interface RevealSecretPayload {
  secretAeId: string;
  field: string;
  previousValue: unknown;
  revealedValue: unknown;
}

export type { RevealSecretPayload };
