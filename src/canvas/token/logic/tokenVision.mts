import type { SenseEntrySource } from '@actors/creature/data/CreatureSystemData.mjs';
import { DARKVISION, TREMORSENSE } from '@constants/senses.mjs';
import { useSettingsStore } from '@settings/index.mjs';

interface TokenVisionFromSenses {
  sight: { visionMode: string; range: number };
  detectionModes: Record<string, { range: number, enabled: boolean }>;
}

/**
 * Maps D&D 3.5e senses (darkvision, low-light vision, tremorsense) to Foundry's token
 * `sight`/`detectionModes` shape. See "Vision System" in poc/phase-09-basic-tokens.md §9.5.
 *
 * `detectionModes` is a keyed record (`TypedObjectField` in Foundry v14 core), not an array —
 * see the note on `BaseToken`'s schema in `types/foundry/common/documents/token.d.mts`.
 *
 * Priority when multiple sight-affecting senses are present: darkvision > low-light > basic.
 * Low-light vision does NOT use Foundry's `lightAmplification` visionMode — that's a per-token
 * brightness re-shade (dim→bright, bright→brightest), not RAW's "see twice as far" rule. RAW
 * accuracy is instead achieved at the light-source level via `_getLightSourceData()` overrides
 * on `TokenDnd35e`/`AmbientLightDnd35e` (see `src/canvas/vision/logic/lowLightVision.mts`),
 * which literally double a light's dim/bright radii for observers with low-light vision. Using
 * `lightAmplification` here as well would double-apply the effect (wider *and* brighter). So
 * low-light vision maps to plain `'basic'` sight — it never sets `sight.range` or a `basicSight`
 * detection mode; Foundry's own default (range 0) already covers it.
 * Blindsight/scent/trapSense are not mapped here — deferred (see WISHLIST.md).
 *
 * `sense.distance` is stored in squares (canonical unit). Foundry's `sight.range`/
 * `detectionModes[...].range` are expressed in the scene's configured grid distance units
 * (ft or m — `registerScenes()` defaults every new scene's grid to match the world's
 * measurement setting), so the stored squares value must be converted before being used
 * here, the same way `TokenRulerDnd35e#getLocalizedBudget` converts movement budget squares.
 */
const buildTokenVisionFromSenses = (senses: SenseEntrySource[]): TokenVisionFromSenses => {
  const darkvision = senses.find(sense => sense.type === DARKVISION);
  const tremorsense = senses.find(sense => sense.type === TREMORSENSE);
  const { measurement: { convertToLocalizedDistance } } = useSettingsStore();

  const sight = darkvision
    ? { visionMode: 'darkvision', range: convertToLocalizedDistance(darkvision.distance) }
    : { visionMode: 'basic', range: 0 };

  const detectionModes: Record<string, { range: number, enabled: boolean }> = {};
  if (darkvision) detectionModes.basicSight = { range: convertToLocalizedDistance(darkvision.distance), enabled: true };
  if (tremorsense) detectionModes.feelTremor = { range: convertToLocalizedDistance(tremorsense.distance), enabled: true };

  return { sight, detectionModes };
};

export { buildTokenVisionFromSenses };
export type { TokenVisionFromSenses };
