import type { SelectOption } from '@vc/fields/index.mjs';

const BAG_CONTAINER = 'bag';
const QUIVER_CONTAINER = 'quiver';
const PURSE_CONTAINER = 'purse';
const CONTAINER_TYPES = new Set([
  BAG_CONTAINER,
  QUIVER_CONTAINER,
  PURSE_CONTAINER,
] as const);
type ContainerTypeOption = SetElement<typeof CONTAINER_TYPES>;
const CONTAINER_TYPE: Record<string, ContainerTypeOption> = {
  BAG: BAG_CONTAINER,
  QUIVER: QUIVER_CONTAINER,
  PURSE: PURSE_CONTAINER,
};
const CONTAINER_TYPE_LOCALIZED: Record<ContainerTypeOption, string> = {
  [BAG_CONTAINER]: 'dnd35e.CONTAINER.Bag',
  [QUIVER_CONTAINER]: 'dnd35e.CONTAINER.Quiver',
  [PURSE_CONTAINER]: 'dnd35e.CONTAINER.Purse',
} as const;
const ContainerTypeSelectOptions = Object.entries(CONTAINER_TYPE_LOCALIZED)
  .map(([value, label]) => ({ value, label } as SelectOption<ContainerTypeOption>));

export {
  CONTAINER_TYPE,
  CONTAINER_TYPE_LOCALIZED,
  CONTAINER_TYPES,
  ContainerTypeSelectOptions,
};

export type { ContainerTypeOption };
