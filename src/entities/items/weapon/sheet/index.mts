import WeaponSummary from './components/WeaponSummary.vue';
import {
  WeaponDetails,
  weaponDetailsTab,
} from './tabs/index.mjs';
import type {
  WeaponSheetConfig,
  WeaponSheetRenderContext,
} from './WeaponSheet.mjs';
import { WeaponSheet } from './WeaponSheet.mjs';
import WeaponSheetVue from './WeaponSheet.vue';
import type { WeaponStore } from './WeaponStore.mjs';
import { useWeaponStore } from './WeaponStore.mjs';

export {
  useWeaponStore,
  WeaponDetails,
  weaponDetailsTab,
  WeaponSheet,
  WeaponSheetVue,
  WeaponSummary,
};

export type {
  WeaponSheetConfig,
  WeaponSheetRenderContext,
  WeaponStore,
};
