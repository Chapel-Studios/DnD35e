import { useSettingsStore } from '@settings/index.mjs';

/**
 * dnd35e's default scene grid, matched to the world's measurement display setting so
 * a newly created scene feels natural immediately: 5ft squares for imperial worlds,
 * or 1.5m squares for metric worlds (the SRD's official metric conversion — 1 square
 * = 5ft = 1.5m). `movementBudget.mts`/`TokenRulerDnd35e` localize the actor's stored
 * (always-feet) speed via this same ratio, so ruler cost-vs-budget comparisons line
 * up numerically as long as a scene's grid matches its world's setting. GMs can still
 * override per-scene afterward (e.g. a non-standard grid) — this only fills in a
 * default when the creator didn't already specify one, so it never clobbers explicit
 * choices (e.g. duplicating an existing scene).
 */
const GRID_DISTANCE_BY_UNIT_OF_MEASURE: Record<'imperial' | 'metric', number> = {
  imperial: 5,
  metric: 1.5,
};

export const registerScenes = () => {
  foundry.helpers.Hooks.once('init', () => {
    foundry.helpers.Hooks.on('preCreateScene', (scene, data) => {
      const grid = (data as { grid?: { distance?: number; units?: string } }).grid;
      const needsDistance = grid?.distance === undefined;
      const needsUnits = grid?.units === undefined || grid.units === '';
      if (!needsDistance && !needsUnits) return;

      const { measurement: { unitOfMeasure, distanceDisplayShortLabel } } = useSettingsStore();
      const updates: Record<string, unknown> = {};
      if (needsDistance) updates['grid.distance'] = GRID_DISTANCE_BY_UNIT_OF_MEASURE[unitOfMeasure.value];
      if (needsUnits) updates['grid.units'] = distanceDisplayShortLabel.value;
      scene.updateSource(updates);
    });
  });
};
