/**
 * Vue-based Display Settings Configuration Dialog
 */

import type { VueSettingsRenderOptions } from '@vueApps/index.mjs';
import { useVueSettingsMixin } from '@vueApps/index.mjs';
import type { App, Component } from 'vue';
import { createApp } from 'vue';

import { GenericSettingsApp, type SettingsSection } from '../../core/index.mjs';
import { SYSTEM_ID } from '../../shared.mjs';
import { DISPLAY_KEYS } from '../constants.mjs';

// Foundry global UI reference
declare const ui: typeof foundry.ui;

const { ApplicationV2 } = foundry.applications.api;

// Create the base class with Vue mixin
const VueSettingsBase = useVueSettingsMixin<typeof ApplicationV2, Record<string, unknown>>(ApplicationV2);

/**
 * Vue-based application for configuring display settings.
 */
class DisplaySettingsConfig extends VueSettingsBase {
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
        title: 'dnd35e.SETTINGS.Display.Title',
        icon: 'fas fa-display',
        resizable: true,
      },
    },
    { inplace: false }
  );

  /** Settings keys managed by this config */
  static SETTING_KEYS = Object.values(DISPLAY_KEYS);

  /** Section configuration */
  static SECTIONS: SettingsSection[] = [
    {
      key: 'general',
      label: 'dnd35e.SETTINGS.Display.General',
      fields: [
        {
          key: DISPLAY_KEYS.UNITS,
          label: 'dnd35e.SETTINGS.Units.Name',
          hint: 'dnd35e.SETTINGS.Units.Hint',
          type: 'string',
          choices: [
            { value: 'imperial', label: 'dnd35e.SETTINGS.Units.Imperial' },
            { value: 'metric', label: 'dnd35e.SETTINGS.Units.Metric' },
          ],
        },
      ],
    },
    // {
    //   key: 'interface',
    //   label: 'dnd35e.SETTINGS.Display.Interface',
    //   fields: [
    //     { key: DISPLAY_KEYS.CUSTOM_SKIN, label: 'dnd35e.SETTINGS.CustomSkin.Name', hint: 'dnd35e.SETTINGS.CustomSkin.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.COLORBLIND_COLORS, label: 'dnd35e.SETTINGS.ColorblindColors.Name', hint: 'dnd35e.SETTINGS.ColorblindColors.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.TRANSPARENT_SIDEBAR, label: 'dnd35e.SETTINGS.TransparentSidebar.Name', hint: 'dnd35e.SETTINGS.TransparentSidebar.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.HIDE_PLAYERS_LIST, label: 'dnd35e.SETTINGS.HidePlayersList.Name', hint: 'dnd35e.SETTINGS.HidePlayersList.Hint', type: 'boolean' },
    //   ],
    // },
    // {
    //   key: 'partyHud',
    //   label: 'dnd35e.SETTINGS.Display.PartyHud',
    //   fields: [
    //     {
    //       key: DISPLAY_KEYS.SHOW_PARTY_HUD,
    //       label: 'dnd35e.SETTINGS.ShowPartyHud.Name',
    //       hint: 'dnd35e.SETTINGS.ShowPartyHud.Hint',
    //       type: 'string',
    //       choices: [
    //         { value: 'none', label: 'dnd35e.SETTINGS.ShowPartyHud.None' },
    //         { value: 'gm', label: 'dnd35e.SETTINGS.ShowPartyHud.GM' },
    //         { value: 'all', label: 'dnd35e.SETTINGS.ShowPartyHud.All' },
    //       ],
    //     },
    //     { key: DISPLAY_KEYS.SHOW_PARTY_HUD_TOKEN_IMAGE, label: 'dnd35e.SETTINGS.ShowPartyHudTokenImage.Name', hint: 'dnd35e.SETTINGS.ShowPartyHudTokenImage.Hint', type: 'boolean' },
    //   ],
    // },
    // {
    //   key: 'chatCards',
    //   label: 'dnd35e.SETTINGS.Display.ChatCards',
    //   fields: [
    //     { key: DISPLAY_KEYS.AUTO_COLLAPSE_ITEM_CARDS, label: 'dnd35e.SETTINGS.AutoCollapseItemCards.Name', hint: 'dnd35e.SETTINGS.AutoCollapseItemCards.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.CLASS_FEATURES_IN_TABS, label: 'dnd35e.SETTINGS.ClassFeaturesInTabs.Name', hint: 'dnd35e.SETTINGS.ClassFeaturesInTabs.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.HIDE_SPELL_DESCRIPTIONS, label: 'dnd35e.SETTINGS.HideSpellDescriptions.Name', hint: 'dnd35e.SETTINGS.HideSpellDescriptions.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.HIDE_SPELL_DESCRIPTIONS_IF_HAS_ACTION, label: 'dnd35e.SETTINGS.HideSpellDescIfHasAction.Name', hint: 'dnd35e.SETTINGS.HideSpellDescIfHasAction.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.SAVE_ATTACK_WINDOW, label: 'dnd35e.SETTINGS.SaveAttackWindow.Name', hint: 'dnd35e.SETTINGS.SaveAttackWindow.Hint', type: 'boolean' },
    //   ],
    // },
    // {
    //   key: 'playerPermissions',
    //   label: 'dnd35e.SETTINGS.Display.PlayerPermissions',
    //   fields: [
    //     { key: DISPLAY_KEYS.PLAYERS_NO_DAMAGE_DETAILS, label: 'dnd35e.SETTINGS.PlayersNoDamageDetails.Name', hint: 'dnd35e.SETTINGS.PlayersNoDamageDetails.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.PLAYERS_NO_DC_DETAILS, label: 'dnd35e.SETTINGS.PlayersNoDCDetails.Name', hint: 'dnd35e.SETTINGS.PlayersNoDCDetails.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.ALLOW_PLAYERS_APPLY_ACTIONS, label: 'dnd35e.SETTINGS.AllowPlayersApplyActions.Name', hint: 'dnd35e.SETTINGS.AllowPlayersApplyActions.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.PLAYERS_SHOW_CONTEXT_NOTES, label: 'dnd35e.SETTINGS.PlayersShowContextNotes.Name', hint: 'dnd35e.SETTINGS.PlayersShowContextNotes.Hint', type: 'boolean' },
    //   ],
    // },
    // {
    //   key: 'tokenVision',
    //   label: 'dnd35e.SETTINGS.Display.TokenVision',
    //   fields: [
    //     { key: DISPLAY_KEYS.GLOBAL_DISABLE_TOKEN_LIGHT, label: 'dnd35e.SETTINGS.GlobalDisableTokenLight.Name', hint: 'dnd35e.SETTINGS.GlobalDisableTokenLight.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.GLOBAL_DISABLE_TOKEN_VISION, label: 'dnd35e.SETTINGS.GlobalDisableTokenVision.Name', hint: 'dnd35e.SETTINGS.GlobalDisableTokenVision.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.HIDE_TOKEN_CONDITIONS, label: 'dnd35e.SETTINGS.HideTokenConditions.Name', hint: 'dnd35e.SETTINGS.HideTokenConditions.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.CORE_EFFECTS, label: 'dnd35e.SETTINGS.CoreEffects.Name', hint: 'dnd35e.SETTINGS.CoreEffects.Hint', type: 'boolean' },
    //     {
    //       key: DISPLAY_KEYS.SHARED_VISION_MODE,
    //       label: 'dnd35e.SETTINGS.SharedVisionMode.Name',
    //       hint: 'dnd35e.SETTINGS.SharedVisionMode.Hint',
    //       type: 'string',
    //       choices: [
    //         { value: 'none', label: 'dnd35e.SETTINGS.SharedVisionMode.None' },
    //         { value: 'party', label: 'dnd35e.SETTINGS.SharedVisionMode.Party' },
    //         { value: 'controlled', label: 'dnd35e.SETTINGS.SharedVisionMode.Controlled' },
    //       ],
    //     },
    //   ],
    // },
    // {
    //   key: 'items',
    //   label: 'dnd35e.SETTINGS.Display.Items',
    //   fields: [
    //     { key: DISPLAY_KEYS.CHANGE_SCROLL_ICON, label: 'dnd35e.SETTINGS.ChangeScrollIcon.Name', hint: 'dnd35e.SETTINGS.ChangeScrollIcon.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.BUY_CHAT, label: 'dnd35e.SETTINGS.BuyChat.Name', hint: 'dnd35e.SETTINGS.BuyChat.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.CLEAR_INVENTORY, label: 'dnd35e.SETTINGS.ClearInventory.Name', hint: 'dnd35e.SETTINGS.ClearInventory.Hint', type: 'boolean' },
    //   ],
    // },
  ];

  constructor(...args: any[]) {
    super(...args);

    // Load current settings values
    const data: Record<string, unknown> = {};
    for (const key of DisplaySettingsConfig.SETTING_KEYS) {
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
      sections: DisplaySettingsConfig.SECTIONS,
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
      for (const key of DisplaySettingsConfig.SETTING_KEYS) {
        if (key in data) {
          await game.settings.set(SYSTEM_ID, key, data[key]);
        }
      }

      ui.notifications.info(game.i18n.localize('dnd35e.SETTINGS.ChangesSaved'));
      await this.close();
    } catch (error) {
      console.error('Failed to save display settings:', error);
      ui.notifications.error(game.i18n.localize('dnd35e.SETTINGS.SaveError'));
    }
  }
}

export { DisplaySettingsConfig };
