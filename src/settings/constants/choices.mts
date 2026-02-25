/**
 * Choice objects for select-type settings
 */

const DIAGONAL_MOVEMENT_CHOICES = {
  '555': 'DND35E.Settings.DiagonalMovement.PHB',
  '5105': 'DND35E.Settings.DiagonalMovement.DMG',
} as const;

const EXPERIENCE_RATE_CHOICES = {
  slow: 'DND35E.Settings.ExperienceRate.Slow',
  medium: 'DND35E.Settings.ExperienceRate.Medium',
  fast: 'DND35E.Settings.ExperienceRate.Fast',
} as const;

const UNIT_CHOICES = {
  imperial: 'DND35E.Settings.Units.Imperial',
  metric: 'DND35E.Settings.Units.Metric',
} as const;

const PARTY_HUD_CHOICES = {
  full: 'DND35E.Settings.PartyHud.Full',
  narrow: 'DND35E.Settings.PartyHud.Narrow',
  none: 'DND35E.Settings.PartyHud.None',
} as const;

export const choices = {
  DIAGONAL_MOVEMENT: DIAGONAL_MOVEMENT_CHOICES,
  EXPERIENCE_RATE: EXPERIENCE_RATE_CHOICES,
  UNIT: UNIT_CHOICES,
  PARTY_HUD: PARTY_HUD_CHOICES,
} as const;

export type ChoiceTypes = {
  DiagonalMovement: typeof DIAGONAL_MOVEMENT_CHOICES;
  ExperienceRate: typeof EXPERIENCE_RATE_CHOICES;
  Unit: typeof UNIT_CHOICES;
  PartyHud: typeof PARTY_HUD_CHOICES;
};
