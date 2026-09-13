import type { SelectOption } from '@vc/fields/formGroups/types.mjs';

const SIZES = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'] as const;
type Size = (typeof SIZES)[number];

const SIZE_SELECT_OPTIONS: SelectOption<Size>[] = SIZES.map(size => ({
  value: size,
  label: `dnd35e.SIZE.${size}`,
}));

const SIZE_MODIFIERS: Record<Size, number> = {
  colossal: -8,
  gargantuan: -4,
  huge: -2,
  large: -1,
  medium: 0,
  small: 1,
  tiny: 2,
  diminutive: 4,
  fine: 8,
};

/** D&D 3.5e size category -> Foundry token grid squares (width = height, tokens are always square). */
const SIZE_TOKEN_DIMENSIONS: Record<Size, number> = {
  fine: 0.5,
  diminutive: 0.5,
  tiny: 1,
  small: 1,
  medium: 1,
  large: 2,
  huge: 3,
  gargantuan: 4,
  colossal: 6,
};

/** D&D 3.5e size category -> natural reach, in grid squares (SRD Table 8-6). */
const SIZE_REACH: Record<Size, number> = {
  fine: 0,
  diminutive: 0,
  tiny: 0,
  small: 1,
  medium: 1,
  large: 2,
  huge: 3,
  gargantuan: 3,
  colossal: 4,
};

export {
  SIZE_MODIFIERS,
  SIZE_REACH,
  SIZE_SELECT_OPTIONS,
  SIZE_TOKEN_DIMENSIONS,
  SIZES,
};

export type {
  Size,
};
