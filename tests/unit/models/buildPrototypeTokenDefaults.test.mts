import { buildPrototypeTokenDefaults } from '@actors/creature/logic/buildPrototypeTokenDefaults.mjs';
import { describe, expect, it } from 'vitest';

describe('buildPrototypeTokenDefaults', () => {
  it('links the token to its actor', () => {
    expect(buildPrototypeTokenDefaults().actorLink).toBe(true);
  });

  it('defaults to friendly disposition', () => {
    expect(buildPrototypeTokenDefaults().disposition).toBe(CONST.TOKEN_DISPOSITIONS.FRIENDLY);
  });

  it('shows HP bar on owner hover, name on owner', () => {
    const defaults = buildPrototypeTokenDefaults();
    expect(defaults.displayBars).toBe(CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER);
    expect(defaults.displayName).toBe(CONST.TOKEN_DISPLAY_MODES.OWNER);
  });

  it('tracks HP on bar1', () => {
    expect(buildPrototypeTokenDefaults().bar1).toEqual({ attribute: 'hp' });
  });

  it('enables basic vision so a freshly-placed token is not blind', () => {
    expect(buildPrototypeTokenDefaults().sight).toEqual({ enabled: true, visionMode: 'basic' });
  });
});
