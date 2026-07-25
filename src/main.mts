import './styles/core.scss';

import { reinitializeSharedVision } from '@canvas/vision/sharedVisionPool.mjs';
import { SystemConfig } from '@constants/config/system.mjs';
import { registerEffects } from '@documents/activeEffects/registration.mjs';
import { registerActors } from '@documents/actors/registration.mjs';
import { registerScenes } from '@documents/scene/registration.mjs';
import { preLocalizeConfig } from '@helpers/localization/preLocalizeConfig.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

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
      Actor: {},
      Item: {},
      ActiveEffect: {},
    },
  };
});

Hooks.once('i18nInit', () => {
  preLocalizeConfig(CONFIG.dnd35e as unknown as Record<string, unknown>);
});

// In dev builds, warn when pack compilation was skipped because Foundry was open.
// The compile-packs Vite plugin writes build-warnings.json when any pack fails to compile.
Hooks.once('ready', async () => {
  // Cross-client canvas vision refresh broadcast (D35E `redrawCanvas` socket event parity).
  // Needed because Foundry's core perception pipeline doesn't watch actor flags/world settings
  // for changes - e.g. shared-vision scope edits (see `sharedVisionPool.mts`).
  game.socket.on(`system.${SYSTEM_ID}`, (data: { eventType?: string }) => {
    if (data?.eventType === 'redrawCanvas') {
      reinitializeSharedVision();
      canvas?.perception?.update({ refreshVision: true, refreshOcclusion: true, refreshLighting: true });
    }
  });

  // Low-light vision's light-radius doubling (`TokenDnd35e`/`AmbientLightDnd35e#_getLightSourceData()`)
  // depends on which token(s) currently act as vision sources for the user (see
  // `getActiveLowLightMultiplier()`). `_getLightSourceData()` is only actually re-evaluated by
  // `PlaceableObject#initializeLightSource()` (called on the placeable itself) - NOT by
  // `canvas.perception.update({ initializeLighting: true })`, which just re-initializes each
  // already-registered `LightSource` from its existing cached data
  // (`EffectsCanvasGroup#initializeLightSources()` calls `source.initialize()`, not
  // `placeable.initializeLightSource()`). So without directly re-initializing every light/token
  // placeable here, the 2x radius would only ever apply after some *other* trigger re-initializes
  // them individually (e.g. moving or re-configuring a light/token). Vision-*source* membership
  // doesn't need this on selection change - Foundry's own `Token#_onControl`/`_onRelease` already
  // loop `initializeVisionSource()` across the whole layer - but light sources aren't re-looped
  // the same way, hence this hook.
  Hooks.on('controlToken', () => {
    reinitializeSharedVision();
  });

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
registerScenes();
