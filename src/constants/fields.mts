const PLAYER_SECRET_ROUTE = 'playerSecretRoute';
const DELTA_MIRROR = 'deltaMirror';

const MASKED_EDIT_STRATEGIES = [
  PLAYER_SECRET_ROUTE,
  DELTA_MIRROR,
] as const;

const MASKED_EDIT_STRATEGY = {
  PLAYER_SECRET_ROUTE,
  DELTA_MIRROR,
} as const;

type MaskedEditStrategy = (typeof MASKED_EDIT_STRATEGIES)[number];

export {
  DELTA_MIRROR,
  MASKED_EDIT_STRATEGIES,
  MASKED_EDIT_STRATEGY,
  PLAYER_SECRET_ROUTE,
};
export type {
  MaskedEditStrategy,
};
