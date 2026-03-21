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
        title: 'DND35E.Settings.Display.Title',
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
      label: 'DND35E.Settings.Display.General',
      fields: [
        {
          key: DISPLAY_KEYS.UNITS,
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
    // {
    //   key: 'interface',
    //   label: 'DND35E.Settings.Display.Interface',
    //   fields: [
    //     { key: DISPLAY_KEYS.CUSTOM_SKIN, label: 'DND35E.Settings.CustomSkin.Name', hint: 'DND35E.Settings.CustomSkin.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.COLORBLIND_COLORS, label: 'DND35E.Settings.ColorblindColors.Name', hint: 'DND35E.Settings.ColorblindColors.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.TRANSPARENT_SIDEBAR, label: 'DND35E.Settings.TransparentSidebar.Name', hint: 'DND35E.Settings.TransparentSidebar.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.HIDE_PLAYERS_LIST, label: 'DND35E.Settings.HidePlayersList.Name', hint: 'DND35E.Settings.HidePlayersList.Hint', type: 'boolean' },
    //   ],
    // },
    // {
    //   key: 'partyHud',
    //   label: 'DND35E.Settings.Display.PartyHud',
    //   fields: [
    //     {
    //       key: DISPLAY_KEYS.SHOW_PARTY_HUD,
    //       label: 'DND35E.Settings.ShowPartyHud.Name',
    //       hint: 'DND35E.Settings.ShowPartyHud.Hint',
    //       type: 'string',
    //       choices: [
    //         { value: 'none', label: 'DND35E.Settings.ShowPartyHud.None' },
    //         { value: 'gm', label: 'DND35E.Settings.ShowPartyHud.GM' },
    //         { value: 'all', label: 'DND35E.Settings.ShowPartyHud.All' },
    //       ],
    //     },
    //     { key: DISPLAY_KEYS.SHOW_PARTY_HUD_TOKEN_IMAGE, label: 'DND35E.Settings.ShowPartyHudTokenImage.Name', hint: 'DND35E.Settings.ShowPartyHudTokenImage.Hint', type: 'boolean' },
    //   ],
    // },
    // {
    //   key: 'chatCards',
    //   label: 'DND35E.Settings.Display.ChatCards',
    //   fields: [
    //     { key: DISPLAY_KEYS.AUTO_COLLAPSE_ITEM_CARDS, label: 'DND35E.Settings.AutoCollapseItemCards.Name', hint: 'DND35E.Settings.AutoCollapseItemCards.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.CLASS_FEATURES_IN_TABS, label: 'DND35E.Settings.ClassFeaturesInTabs.Name', hint: 'DND35E.Settings.ClassFeaturesInTabs.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.HIDE_SPELL_DESCRIPTIONS, label: 'DND35E.Settings.HideSpellDescriptions.Name', hint: 'DND35E.Settings.HideSpellDescriptions.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.HIDE_SPELL_DESCRIPTIONS_IF_HAS_ACTION, label: 'DND35E.Settings.HideSpellDescIfHasAction.Name', hint: 'DND35E.Settings.HideSpellDescIfHasAction.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.SAVE_ATTACK_WINDOW, label: 'DND35E.Settings.SaveAttackWindow.Name', hint: 'DND35E.Settings.SaveAttackWindow.Hint', type: 'boolean' },
    //   ],
    // },
    // {
    //   key: 'playerPermissions',
    //   label: 'DND35E.Settings.Display.PlayerPermissions',
    //   fields: [
    //     { key: DISPLAY_KEYS.PLAYERS_NO_DAMAGE_DETAILS, label: 'DND35E.Settings.PlayersNoDamageDetails.Name', hint: 'DND35E.Settings.PlayersNoDamageDetails.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.PLAYERS_NO_DC_DETAILS, label: 'DND35E.Settings.PlayersNoDCDetails.Name', hint: 'DND35E.Settings.PlayersNoDCDetails.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.ALLOW_PLAYERS_APPLY_ACTIONS, label: 'DND35E.Settings.AllowPlayersApplyActions.Name', hint: 'DND35E.Settings.AllowPlayersApplyActions.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.PLAYERS_SHOW_CONTEXT_NOTES, label: 'DND35E.Settings.PlayersShowContextNotes.Name', hint: 'DND35E.Settings.PlayersShowContextNotes.Hint', type: 'boolean' },
    //   ],
    // },
    // {
    //   key: 'tokenVision',
    //   label: 'DND35E.Settings.Display.TokenVision',
    //   fields: [
    //     { key: DISPLAY_KEYS.GLOBAL_DISABLE_TOKEN_LIGHT, label: 'DND35E.Settings.GlobalDisableTokenLight.Name', hint: 'DND35E.Settings.GlobalDisableTokenLight.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.GLOBAL_DISABLE_TOKEN_VISION, label: 'DND35E.Settings.GlobalDisableTokenVision.Name', hint: 'DND35E.Settings.GlobalDisableTokenVision.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.HIDE_TOKEN_CONDITIONS, label: 'DND35E.Settings.HideTokenConditions.Name', hint: 'DND35E.Settings.HideTokenConditions.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.CORE_EFFECTS, label: 'DND35E.Settings.CoreEffects.Name', hint: 'DND35E.Settings.CoreEffects.Hint', type: 'boolean' },
    //     {
    //       key: DISPLAY_KEYS.SHARED_VISION_MODE,
    //       label: 'DND35E.Settings.SharedVisionMode.Name',
    //       hint: 'DND35E.Settings.SharedVisionMode.Hint',
    //       type: 'string',
    //       choices: [
    //         { value: 'none', label: 'DND35E.Settings.SharedVisionMode.None' },
    //         { value: 'party', label: 'DND35E.Settings.SharedVisionMode.Party' },
    //         { value: 'controlled', label: 'DND35E.Settings.SharedVisionMode.Controlled' },
    //       ],
    //     },
    //   ],
    // },
    // {
    //   key: 'items',
    //   label: 'DND35E.Settings.Display.Items',
    //   fields: [
    //     { key: DISPLAY_KEYS.CHANGE_SCROLL_ICON, label: 'DND35E.Settings.ChangeScrollIcon.Name', hint: 'DND35E.Settings.ChangeScrollIcon.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.BUY_CHAT, label: 'DND35E.Settings.BuyChat.Name', hint: 'DND35E.Settings.BuyChat.Hint', type: 'boolean' },
    //     { key: DISPLAY_KEYS.CLEAR_INVENTORY, label: 'DND35E.Settings.ClearInventory.Name', hint: 'DND35E.Settings.ClearInventory.Hint', type: 'boolean' },
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

      ui.notifications.info(game.i18n.localize('DND35E.Settings.ChangesSaved'));
      await this.close();
    } catch (error) {
      console.error('Failed to save display settings:', error);
      ui.notifications.error(game.i18n.localize('DND35E.Settings.SaveError'));
    }
  }
}

export { DisplaySettingsConfig };
