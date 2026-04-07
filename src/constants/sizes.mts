import { SelectOption } from '@vc/Fields/FormGroups/types.mjs';

const SIZES = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'] as const;
type Size = (typeof SIZES)[number];

const SIZE_SELECT_OPTIONS: SelectOption[] = SIZES.map(size => ({
  value: size,
  label: `D35E.Size.${size}`,
}));

export {
  SIZE_SELECT_OPTIONS,
  SIZES,
};

export type {
  Size,
};
