import { buildPrototypeTokenDefaults } from '@actors/creature/logic/buildPrototypeTokenDefaults.mjs';
import { describe, expect, it } from 'vitest';

describe('buildPrototypeTokenDefaults', () => {
  it('links the token to its actor', () => {
    expect(buildPrototypeTokenDefaults('Duder', 'medium').actorLink).toBe(true);
  });

  it('defaults to friendly disposition', () => {
    expect(buildPrototypeTokenDefaults('Duder', 'medium').disposition).toBe(CONST.TOKEN_DISPOSITIONS.FRIENDLY);
  });

  it('shows HP bar on owner hover, name on owner', () => {
    const defaults = buildPrototypeTokenDefaults('Duder', 'medium');
    expect(defaults.displayBars).toBe(CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER);
    expect(defaults.displayName).toBe(CONST.TOKEN_DISPLAY_MODES.OWNER);
  });

  it('tracks HP on bar1', () => {
    expect(buildPrototypeTokenDefaults('Duder', 'medium').bar1).toEqual({ attribute: 'hp' });
  });

  it('carries the actor\'s name through', () => {
    expect(buildPrototypeTokenDefaults('Duder, the 4th', 'medium').name).toBe('Duder, the 4th');
  });

  it('enables basic vision with no detection modes when there are no senses', () => {
    expect(buildPrototypeTokenDefaults('Duder', 'medium').sight).toEqual({ enabled: true, visionMode: 'basic', range: 0 });
    expect(buildPrototypeTokenDefaults('Duder', 'medium').detectionModes).toEqual({});
  });

  it('derives sight and detectionModes from the actor\'s senses', () => {
    const defaults = buildPrototypeTokenDefaults('Duder', 'medium', [{ type: 'darkvision', distance: 60 }]);
    expect(defaults.sight).toEqual({ enabled: true, visionMode: 'darkvision', range: 60 });
    expect(defaults.detectionModes).toEqual({ basicSight: { range: 60 } });
  });

  it('derives width/height from the actor\'s size', () => {
    expect(buildPrototypeTokenDefaults('Duder', 'medium')).toMatchObject({ width: 1, height: 1 });
    expect(buildPrototypeTokenDefaults('Duder', 'large')).toMatchObject({ width: 2, height: 2 });
    expect(buildPrototypeTokenDefaults('Duder', 'fine')).toMatchObject({ width: 0.5, height: 0.5 });
  });
});

