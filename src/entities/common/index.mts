import { register as registerTemplate } from './templates/index.mjs';
import { register as registerComponents } from './components/index.mjs';

export const registerCommon = () => {
  registerTemplate();
  registerComponents();
};
