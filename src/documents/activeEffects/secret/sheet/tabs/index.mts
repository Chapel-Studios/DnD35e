import type { SheetTab } from '@documents/document/index.mjs';

import SecretMasks from './SecretMasks.vue';

const secretMasksTab: SheetTab = {
  id: 'masks',
  label: 'dnd35e.EFFECT.Secret.MasksTab',
  component: SecretMasks,
  order: 10,
  icon: 'fa-solid fa-mask',
};

export {
  secretMasksTab,
};
