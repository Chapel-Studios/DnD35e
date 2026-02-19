import { SheetTab } from '@ec/CoreMixin/index.mjs';
import { Description, NameConfig } from '@items/baseItem/index.mjs';


const defaultDescriptionTab: SheetTab = {
  id: 'description',
  label: 'D35E.Description',
  component: () => Description,
  order: 10,
};

const defaultNameConfigTab: SheetTab = {
  id: 'name-config',
  label: 'D35E.Name',
  component: () => NameConfig,
  order: 20,
};

export {
  defaultDescriptionTab,
  defaultNameConfigTab,
};
