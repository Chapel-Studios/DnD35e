import './styles/core.scss';

import { registerEffects } from '@entities/activeEffects/registration.mjs';
import { registerActors } from '@entities/actors/registration.mjs';

import { registerItems } from './entities/items/index.mjs';
import { registerSettings } from './settings/index.mjs';

// globalThis.fa = foundry.applications;
// globalThis.fc = foundry.canvas;
// globalThis.fd = foundry.documents;
// globalThis.fh = foundry.helpers;
// globalThis.fu = foundry.utils;

// TODO: move this to a more appropriate location, such as a system-specific initialization file
CONFIG.dnd35e = {
  VERSION: '13.0.0-dev.1',
  item: {
    documentClasses: {
    },
  },
  activeEffect: {
    documentClasses: {
    },
  },
  actor: {
    documentClasses: {
    },
  },
};

// Register system settings (must happen during init)
Hooks.once('init', () => {
  registerSettings();

  game.dnd35e = {
    stores: {
      items: {},
      effects: {},
    },
  };
});

registerItems();
registerActors();
registerEffects();
