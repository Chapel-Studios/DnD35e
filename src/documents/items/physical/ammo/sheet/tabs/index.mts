import type { SheetTab } from '@documents/document/index.mjs';
import { defaultDetailsTab } from '@documents/document/index.mjs';

import AmmoDetails from './AmmoDetails.vue';

const ammoDetailsTab: SheetTab = {
  ...defaultDetailsTab,
  component: AmmoDetails,
};

export {
  ammoDetailsTab,
};
