import './styles/core.scss';

import { SystemConfig } from '@constants/config/system.mjs';
import { registerEffects } from '@documents/activeEffects/registration.mjs';
import { registerActors } from '@documents/actors/registration.mjs';
import { preLocalizeConfig } from '@helpers/localization/preLocalizeConfig.mjs';

import { registerItems } from './documents/items/index.mjs';
import { registerSettings } from './settings/index.mjs';

declare const ui: typeof foundry.ui;

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

// In dev builds, warn when pack compilation was skipped because Foundry was open.
// The compile-packs Vite plugin writes build-warnings.json when any pack fails to compile.
Hooks.once('ready', async () => {
  const resp = await fetch(`systems/${game.system.id}/build-warnings.json`).catch(() => null);
  if (!resp?.ok) return;
  const data: { stalePacks?: string[] } = await resp.json().catch(() => ({}));
  if (data.stalePacks?.length) {
    ui.notifications.warn(
      `[dnd35e dev] Stale packs (Foundry was open during last build): ${data.stalePacks.join(', ')}. `
      + 'Close Foundry and run <code>npm run build:dev</code> to recompile.',
      { permanent: true }
    );
  }
});

registerItems();
registerActors();
registerEffects();
