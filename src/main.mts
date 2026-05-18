import './styles/core.scss';

import { SystemConfig } from '@constants/config/system.mjs';
import { registerEffects } from '@documents/activeEffects/registration.mjs';
import { registerActors } from '@documents/actors/registration.mjs';
import { preLocalizeConfig } from '@helpers/localization/preLocalizeConfig.mjs';

import { registerItems } from './documents/items/index.mjs';
import { registerSettings } from './settings/index.mjs';

// globalThis.fa = foundry.applications;
// globalThis.fc = foundry.canvas;
// globalThis.fd = foundry.documents;
// globalThis.fh = foundry.helpers;
// globalThis.fu = foundry.utils;

CONFIG.dnd35e = SystemConfig;

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

Hooks.once('i18nInit', () => {
  preLocalizeConfig(CONFIG.dnd35e as unknown as Record<string, unknown>);
});

registerItems();
registerActors();
registerEffects();
