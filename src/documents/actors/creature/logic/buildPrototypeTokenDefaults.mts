interface PrototypeTokenDefaults {
  actorLink: boolean;
  disposition: number;
  displayBars: number;
  displayName: number;
  bar1: { attribute: string };
  sight: { enabled: boolean; visionMode: string };
}

/**
 * Prototype token defaults shared by all creature-type actors (characters, NPCs,
 * etc.): linked token, friendly disposition, owner-hover HP bar, and basic vision
 * enabled so a freshly-placed token isn't blind. See `Creature._preCreate()`.
 */
const buildPrototypeTokenDefaults = (): PrototypeTokenDefaults => ({
  actorLink: true,
  disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
  displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
  displayName: CONST.TOKEN_DISPLAY_MODES.OWNER,
  bar1: { attribute: 'hp' },
  sight: { enabled: true, visionMode: 'basic' },
});

export { buildPrototypeTokenDefaults };
export type { PrototypeTokenDefaults };
