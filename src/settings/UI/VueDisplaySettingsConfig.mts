/**
 * Vue-based Display Settings Configuration Dialog
 */

import { SETTINGS, SYSTEM_ID } from '@settings/constants/index.mjs';
import GenericSettingsApp from '@vc/Settings/GenericSettingsApp.vue';
import type { SettingsSection } from '@vc/Settings/index.mjs';
import type { VueSettingsRenderOptions } from '@vueApps/index.mjs';
import { useVueSettingsMixin } from '@vueApps/index.mjs';
import type { App, Component } from 'vue';
import { createApp } from 'vue';


// Foundry global UI reference
declare const ui: typeof foundry.ui;

const { ApplicationV2 } = foundry.applications.api;

// Create the base class with Vue mixin
const VueSettingsBase = useVueSettingsMixin<typeof ApplicationV2, Record<string, unknown>>(ApplicationV2);

/**
 * Vue-based application for configuring display settings.
 */
class VueDisplaySettingsConfig extends VueSettingsBase {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: 'dnd35e-display-config',
      tag: 'div',
      classes: ['dnd35e', 'vueApp', 'settings-config'],
      position: {
        width: 540,
        height: 'auto',
      },
      window: {
        title: 'DND35E.Settings.Display.Title',
        icon: 'fas fa-display',
        resizable: true,
      },
    },
    { inplace: false }
  );

  /** Settings keys managed by this config */
  static SETTING_KEYS = [
    SETTINGS.UNITS,
    SETTINGS.CUSTOM_SKIN,
    SETTINGS.COLORBLIND_COLORS,
    SETTINGS.TRANSPARENT_SIDEBAR,
    SETTINGS.SHOW_PARTY_HUD,
    SETTINGS.SHOW_PARTY_HUD_TOKEN_IMAGE,
    SETTINGS.AUTO_COLLAPSE_ITEM_CARDS,
    SETTINGS.CLASS_FEATURES_IN_TABS,
    SETTINGS.HIDE_SPELL_DESCRIPTIONS,
  ] as const;

  /** Section configuration */
  static SECTIONS: SettingsSection[] = [
    {
      key: 'general',
      label: 'DND35E.Settings.Display.General',
      fields: [
        {
          key: SETTINGS.UNITS,
          label: 'DND35E.Settings.Units.Name',
          hint: 'DND35E.Settings.Units.Hint',
          type: 'string',
          choices: [
            { value: 'imperial', label: 'DND35E.Settings.Units.Imperial' },
            { value: 'metric', label: 'DND35E.Settings.Units.Metric' },
          ],
        },
      ],
    },
    {
      key: 'interface',
      label: 'DND35E.Settings.Display.Interface',
      fields: [
        { key: SETTINGS.CUSTOM_SKIN, label: 'DND35E.Settings.CustomSkin.Name', hint: 'DND35E.Settings.CustomSkin.Hint', type: 'boolean' },
        { key: SETTINGS.COLORBLIND_COLORS, label: 'DND35E.Settings.ColorblindColors.Name', hint: 'DND35E.Settings.ColorblindColors.Hint', type: 'boolean' },
        { key: SETTINGS.TRANSPARENT_SIDEBAR, label: 'DND35E.Settings.TransparentSidebar.Name', hint: 'DND35E.Settings.TransparentSidebar.Hint', type: 'boolean' },
      ],
    },
    {
      key: 'partyHud',
      label: 'DND35E.Settings.Display.PartyHud',
      fields: [
        {
          key: SETTINGS.SHOW_PARTY_HUD,
          label: 'DND35E.Settings.ShowPartyHud.Name',
          hint: 'DND35E.Settings.ShowPartyHud.Hint',
          type: 'string',
          choices: [
            { value: 'none', label: 'DND35E.Settings.ShowPartyHud.None' },
            { value: 'gm', label: 'DND35E.Settings.ShowPartyHud.GM' },
            { value: 'all', label: 'DND35E.Settings.ShowPartyHud.All' },
          ],
        },
        { key: SETTINGS.SHOW_PARTY_HUD_TOKEN_IMAGE, label: 'DND35E.Settings.ShowPartyHudTokenImage.Name', hint: 'DND35E.Settings.ShowPartyHudTokenImage.Hint', type: 'boolean' },
      ],
    },
    {
      key: 'chatCards',
      label: 'DND35E.Settings.Display.ChatCards',
      fields: [
        { key: SETTINGS.AUTO_COLLAPSE_ITEM_CARDS, label: 'DND35E.Settings.AutoCollapseItemCards.Name', hint: 'DND35E.Settings.AutoCollapseItemCards.Hint', type: 'boolean' },
        { key: SETTINGS.CLASS_FEATURES_IN_TABS, label: 'DND35E.Settings.ClassFeaturesInTabs.Name', hint: 'DND35E.Settings.ClassFeaturesInTabs.Hint', type: 'boolean' },
        { key: SETTINGS.HIDE_SPELL_DESCRIPTIONS, label: 'DND35E.Settings.HideSpellDescriptions.Name', hint: 'DND35E.Settings.HideSpellDescriptions.Hint', type: 'boolean' },
      ],
    },
  ];

  constructor(...args: any[]) {
    super(...args);

    // Load current settings values
    const data: Record<string, unknown> = {};
    for (const key of VueDisplaySettingsConfig.SETTING_KEYS) {
      data[key] = game.settings.get(SYSTEM_ID, key);
    }
    this.initializeReactiveData(data);
  }

  protected override get vueComponent(): Component {
    return GenericSettingsApp;
  }

  protected override _createVueApp(renderOptions: VueSettingsRenderOptions): App {
    return createApp(this.vueComponent, {
      context: {
        ...this.context,
        renderOptions,
      },
      sections: VueDisplaySettingsConfig.SECTIONS,
      onUpdateData: (path: string, value: unknown) => {
        this.updateData(path, value);
      },
    });
  }

  protected override async _replaceHTML(
    result: object,
    content: HTMLElement,
    options: VueSettingsRenderOptions
  ): Promise<void> {
    await super._replaceHTML(result, content, options);

    if (this.vueApp && this.vueRoot) {
      this.vueRoot.addEventListener('submit', () => this.#onSave());
    }
  }

  async #onSave(): Promise<void> {
    const data = this.getData();

    try {
      for (const key of VueDisplaySettingsConfig.SETTING_KEYS) {
        if (key in data) {
          await game.settings.set(SYSTEM_ID, key, data[key]);
        }
      }

      ui.notifications.info(game.i18n.localize('DND35E.Settings.ChangesSaved'));
      await this.close();
    } catch (error) {
      console.error('Failed to save display settings:', error);
      ui.notifications.error(game.i18n.localize('DND35E.Settings.SaveError'));
    }
  }
}

export { VueDisplaySettingsConfig };
