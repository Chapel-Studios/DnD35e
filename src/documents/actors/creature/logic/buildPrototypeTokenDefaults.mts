import type { Size } from '@constants/sizes.mjs';

import type { SenseEntrySource } from '../data/CreatureSystemData.mjs';
import { buildDerivedPrototypeTokenFields } from './derivedPrototypeTokenFields.mjs';

interface PrototypeTokenDefaults {
  actorLink: boolean;
  disposition: number;
  displayBars: number;
  displayName: number;
  bar1: { attribute: string };
  name: string;
  width: number;
  height: number;
  sight: { enabled: boolean; visionMode: string; range: number };
  detectionModes: Record<string, { range: number }>;
}

/**
 * Prototype token defaults shared by all creature-type actors (characters, NPCs,
 * etc.): linked token, friendly disposition, owner-hover HP bar, and name/size/vision
 * derived from `Actor#name`/`system.size`/`system.bio.senses` via
 * `buildDerivedPrototypeTokenFields()` (falls back to medium/basic vision when there's
 * no size/senses yet). See `Creature._preCreate()`. This is a one-time seed at creation
 * only — ongoing sync as name/size/senses change afterward is handled separately by
 * `Creature.prepareDerivedData()`.
 */
const buildPrototypeTokenDefaults = (name: string, size: Size, senses: SenseEntrySource[] = []): PrototypeTokenDefaults => ({
  actorLink: true,
  disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
  displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
  displayName: CONST.TOKEN_DISPLAY_MODES.OWNER,
  bar1: { attribute: 'hp' },
  ...buildDerivedPrototypeTokenFields(name, size, senses),
});

export { buildPrototypeTokenDefaults };
export type { PrototypeTokenDefaults };
