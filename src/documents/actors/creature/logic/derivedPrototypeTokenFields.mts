import { buildTokenVisionFromSenses } from '@canvas/token/logic/tokenVision.mjs';
import type { Size } from '@constants/sizes.mjs';
import { SIZE_TOKEN_DIMENSIONS } from '@constants/sizes.mjs';

import type { SenseEntrySource } from '../data/CreatureSystemData.mjs';

/** Detection mode keys this system manages automatically; any other key is left untouched (e.g. a GM-added `seeInvisibility`). */
const MANAGED_DETECTION_MODE_KEYS = ['basicSight', 'feelTremor'] as const;

interface DerivedPrototypeTokenFields {
  name: string;
  width: number;
  height: number;
  sight: { enabled: boolean; visionMode: string; range: number };
  detectionModes: Record<string, { range: number }>;
}

interface PrototypeTokenSightSource {
  enabled?: boolean;
  visionMode?: string;
  range?: number | null;
}

interface PrototypeTokenSource {
  name?: string;
  width?: number;
  height?: number;
  sight?: PrototypeTokenSightSource;
  detectionModes?: Record<string, { range: number }>;
}

/**
 * Derives the token fields this system keeps in sync with a creature's current name,
 * size, and senses: display name (mirroring `Actor#name`, which already reflects any
 * name-formula resolution — see `documents/document/logic/ensureNameFormula.mts` /
 * `formulaRegistrationHelpers.mts`), token dimensions (from `system.size`), and vision
 * (`sight`/`detectionModes`, from `system.bio.senses` via `buildTokenVisionFromSenses()`).
 * Pure — used both for the one-time `_preCreate()` seed (`buildPrototypeTokenDefaults()`)
 * and the continuous `Creature.prepareDerivedData()` sync.
 */
const buildDerivedPrototypeTokenFields = (name: string, size: Size, senses: SenseEntrySource[]): DerivedPrototypeTokenFields => {
  const vision = buildTokenVisionFromSenses(senses);
  const dimensions = SIZE_TOKEN_DIMENSIONS[size] ?? 1;

  return {
    name,
    width: dimensions,
    height: dimensions,
    sight: { enabled: true, ...vision.sight },
    detectionModes: vision.detectionModes,
  };
};

/**
 * Diffs a freshly-derived set of token fields against what's currently persisted on
 * `prototypeToken` (source data, not the live in-memory instance), returning a partial
 * update payload for `actor.update({ prototypeToken: ... })`, or `null` if already in sync.
 *
 * `detectionModes` is merged surgically: only `MANAGED_DETECTION_MODE_KEYS` are ever
 * added, changed, or removed (via Foundry's `-=key` deletion syntax) — any other key a
 * GM added directly (e.g. `seeInvisibility`) is left untouched.
 */
const diffDerivedPrototypeTokenFields = (
  current: PrototypeTokenSource,
  derived: DerivedPrototypeTokenFields
): Record<string, unknown> | null => {
  const update: Record<string, unknown> = {};

  if (current.name !== derived.name) update.name = derived.name;
  if (current.width !== derived.width) update.width = derived.width;
  if (current.height !== derived.height) update.height = derived.height;

  const currentSight = current.sight ?? {};
  if (
    currentSight.enabled !== derived.sight.enabled
    || currentSight.visionMode !== derived.sight.visionMode
    || currentSight.range !== derived.sight.range
  ) {
    update.sight = derived.sight;
  }

  const detectionModesUpdate: Record<string, unknown> = {};
  let detectionModesChanged = false;
  for (const key of MANAGED_DETECTION_MODE_KEYS) {
    const currentEntry = current.detectionModes?.[key];
    const derivedEntry = derived.detectionModes[key];
    if (derivedEntry) {
      if (!currentEntry || currentEntry.range !== derivedEntry.range) {
        detectionModesUpdate[key] = derivedEntry;
        detectionModesChanged = true;
      }
    } else if (currentEntry) {
      detectionModesUpdate[`-=${key}`] = null;
      detectionModesChanged = true;
    }
  }
  if (detectionModesChanged) update.detectionModes = detectionModesUpdate;

  return Object.keys(update).length > 0 ? update : null;
};

export { buildDerivedPrototypeTokenFields, diffDerivedPrototypeTokenFields };
export type { DerivedPrototypeTokenFields, PrototypeTokenSource };
