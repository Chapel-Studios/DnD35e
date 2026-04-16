import type { SelectOption } from '@vc/Fields/FormGroups/types.mjs';

const SIZES = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'] as const;
type Size = (typeof SIZES)[number];

const SIZE_SELECT_OPTIONS: SelectOption<Size>[] = SIZES.map(size => ({
  value: size,
  label: `dnd35e.SIZE.${size}`,
}));

export {
  SIZE_SELECT_OPTIONS,
  SIZES,
};

export type {
  Size,
};
