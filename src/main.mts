import './styles/core.scss';

import { Dnd35eSystemConfig } from '@constants/config/system.mjs';
import { registerEffects } from '@entities/activeEffects/registration.mjs';
import { registerActors } from '@entities/actors/registration.mjs';

import { registerItems } from './entities/items/index.mjs';
import { registerSettings } from './settings/index.mjs';

// globalThis.fa = foundry.applications;
// globalThis.fc = foundry.canvas;
// globalThis.fd = foundry.documents;
// globalThis.fh = foundry.helpers;
// globalThis.fu = foundry.utils;

CONFIG.dnd35e = Dnd35eSystemConfig;

// Register system settings (must happen during init)
Hooks.once('init', () => {
  registerSettings();

  game.dnd35e = {
    stores: {
      Item: {},
      ActiveEffect: {},
      // Actor: {},
    },
  };
});

registerItems();
registerActors();
registerEffects();
