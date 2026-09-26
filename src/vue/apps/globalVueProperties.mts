/**
 * Registers instance properties available in every Vue template mounted by the system,
 * without requiring each component to import or redeclare them.
 *
 * Installed once per app in {@link useVueAppBaseMixin} — covers every document sheet,
 * dialog, settings app, and HUD/tracker override in the system.
 *
 * Only usable from `<template>`. `<script setup>` code does not have access to
 * `globalProperties` and must still call `game.i18n.localize()` directly.
 */

import type { App } from 'vue';

declare module 'vue' {
  interface ComponentCustomProperties {
    localize: (key: string) => string;
  }
}

function installGlobalVueProperties (app: App): void {
  app.config.globalProperties.localize = (key: string): string => game.i18n.localize(key);
}

export { installGlobalVueProperties };
