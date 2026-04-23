/**
 * Vue-based Health Settings Configuration Dialog
 */

import { SETTINGS_CONFIG_CLASS, VUE_APP_CLASS } from '@constants/cssClasses.mjs';
import type { VueSettingsRenderOptions } from '@vueApps/index.mjs';
import { useVueSettingsMixin } from '@vueApps/index.mjs';
import type { Component } from 'vue';

import { SYSTEM_ID } from '../../shared.mjs';
import { DEFAULT_HEALTH_CONFIG, HEALTH_KEY, type HealthConfig } from '../constants.mjs';
import HealthSettingsApp from './HealthSettingsApp.vue';

// Foundry global UI reference
declare const ui: typeof foundry.ui;

const { ApplicationV2 } = foundry.applications.api;

// Create the base class with Vue mixin
const VueSettingsBase = useVueSettingsMixin<typeof ApplicationV2, HealthConfig>(ApplicationV2);

/**
 * Vue-based application for configuring health/HP settings.
 * Handles hit die computation, wounds & vigor variant, etc.
 */
class HealthSettingsConfig extends VueSettingsBase {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: 'dnd35e-health-config',
      tag: 'div',
      classes: [SYSTEM_ID, VUE_APP_CLASS, SETTINGS_CONFIG_CLASS],
      position: {
        width: 560,
        height: 500,
      },
      window: {
        title: 'dnd35e.SETTINGS.Health.Title',
        icon: 'fas fa-heart-pulse',
        resizable: true,
      },
    },
    { inplace: false }
  );

  constructor(...args: any[]) {
    super(...args);

    // Load current settings and initialize reactive data
    const currentConfig = game.settings.get(SYSTEM_ID, HEALTH_KEY) as HealthConfig;
    const mergedConfig = foundry.utils.mergeObject(
      foundry.utils.deepClone(DEFAULT_HEALTH_CONFIG),
      currentConfig
    ) as HealthConfig;

    this.initializeReactiveData(mergedConfig);
  }

  /** The Vue component to render */
  protected override get vueComponent(): Component {
    return HealthSettingsApp;
  }

  /**
   * Override _replaceHTML to set up event handlers on the Vue app
   */
  protected override async _replaceHTML(
    result: object,
    content: HTMLElement,
    options: VueSettingsRenderOptions
  ): Promise<void> {
    await super._replaceHTML(result, content, options);

    // Set up event listeners on the mounted app
    if (this.vueApp && this.vueRoot) {
      this.vueRoot.addEventListener('submit', () => this.#onSave());
      this.vueRoot.addEventListener('reset', () => this.#onReset());
    }
  }

  /**
   * Handle form submission - save settings
   */
  async #onSave(): Promise<void> {
    const data = this.getData();

    try {
      await game.settings.set(SYSTEM_ID, HEALTH_KEY, data);

      ui.notifications.info(game.i18n.localize('dnd35e.SETTINGS.ChangesSaved'));
      await this.close();
    } catch (error) {
      console.error('Failed to save health settings:', error);
      ui.notifications.error(game.i18n.localize('dnd35e.SETTINGS.SaveError'));
    }
  }

  /**
   * Handle reset - restore default values
   */
  async #onReset(): Promise<void> {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('dnd35e.SETTINGS.ResetConfirm.Title') },
      content: `<p>${game.i18n.localize('dnd35e.SETTINGS.ResetConfirm.Content')}</p>`,
      yes: {
        label: game.i18n.localize('dnd35e.SETTINGS.Reset'),
        icon: 'fas fa-undo',
      },
      no: {
        label: game.i18n.localize('Cancel'),
      },
    });

    if (!confirmed) return;

    const defaults = foundry.utils.deepClone(DEFAULT_HEALTH_CONFIG);
    this.initializeReactiveData(defaults);
    this.render();
  }
}

export { HealthSettingsConfig };
