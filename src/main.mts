import { registerHandlebarsHelpers } from '@helpers/handlebars/helpers.mjs';
import { registerItems } from './entities/items/index.mjs';
import './styles/core.scss';

globalThis.fa = foundry.applications;
globalThis.fc = foundry.canvas;
globalThis.fd = foundry.documents;
globalThis.fh = foundry.helpers;
globalThis.fu = foundry.utils;

// TODO: move this to a more appropriate location, such as a system-specific initialization file
CONFIG.Dnd35e = {
  VERSION: '13.0.0-dev.1',
  item: {
    documentClasses: {
    },
  },
  activeEffect: {
    documentClasses: {
    },
  },
};

registerItems();
registerHandlebarsHelpers();
