/**
 * Vue-based Currency Settings Configuration Dialog
 */

import { SETTINGS_CONFIG_CLASS, VUE_APP_CLASS } from '@constants/cssClasses.mjs';
import { useVueSettingsMixin, type VueSettingsRenderOptions } from '@vueApps/VueSettingsMixin.mjs';
import type { Component } from 'vue';

import { SYSTEM_ID } from '../../shared.mjs';
import { CURRENCY_KEY, type CurrencyConfig,DEFAULT_CURRENCY_CONFIG } from '../constants.mjs';
import CurrencySettingsApp from './CurrencySettingsApp.vue';

const { ApplicationV2 } = foundry.applications.api;

// Create the base class with Vue mixin
const VueSettingsBase = useVueSettingsMixin<typeof ApplicationV2, CurrencyConfig>(ApplicationV2);

/**
 * Vue-based application for configuring custom currencies.
 */
class CurrencySettingsConfig extends VueSettingsBase {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: 'dnd35e-currency-config',
      tag: 'form',
      classes: [SYSTEM_ID, VUE_APP_CLASS, SETTINGS_CONFIG_CLASS],
      position: {
        width: 640,
        height: 'auto',
      },
      window: {
        title: 'dnd35e.SETTINGS.CurrencyConfig.Title',
        icon: 'fas fa-coins',
        resizable: true,
      },
      form: 'form',
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: false,
    },
    { inplace: false }
  );

  constructor(...args: any[]) {
    super(...args);

    // Load current settings and initialize reactive data
    const currentConfig = game.settings.get(SYSTEM_ID, CURRENCY_KEY) as CurrencyConfig;
    const mergedConfig = foundry.utils.mergeObject(
      foundry.utils.deepClone(DEFAULT_CURRENCY_CONFIG),
      currentConfig
    ) as CurrencyConfig;

    this.initializeReactiveData(mergedConfig);
  }

  /** The Vue component to render */
  protected override get vueComponent(): Component {
    return CurrencySettingsApp;
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
      // this.vueRoot.addEventListener('reset', () => this.#onReset());
    }
  }

  /**
   * Handle form submission - save settings
   */
  async #onSave(): Promise<void> {
    // const data = this.getData();

    // try {
    //   await game.settings.set(SYSTEM_ID, CURRENCY_KEY, data);

    //   ui.notifications.info(game.i18n.localize('dnd35e.SETTINGS.ChangesSaved'));
    // } catch (error) {
    //   console.error('Failed to save currency settings:', error);
    //   ui.notifications.error(game.i18n.localize('dnd35e.SETTINGS.SaveError'));
    // }
    await this.close();
  }

  // /**
  //  * Handle reset - restore default values
  //  */
  // async #onReset(): Promise<void> {
  //   // @ts-expect-error - DialogV2.confirm typing issues

  //   // Self-heal: Remove all custom coins, enable all SRD coins, set defaults
  //   const srdCoinages = foundry.utils.deepClone(DEFAULT_CURRENCY_CONFIG.coinages).map(c => ({ ...c, enabled: true }));
  //   const defaults = {
  //     coinages: srdCoinages,
  //     defaultDisplayCoin: 'srd_gp',
  //     rollUpTargetCoin: 'srd_gp',
  //   };
  //   this.initializeReactiveData(defaults);
  //   this.render();
  // }
}

export { CurrencySettingsConfig };
