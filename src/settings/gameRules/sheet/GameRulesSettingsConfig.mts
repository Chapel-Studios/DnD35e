/**
 * Vue-based Game Rules Settings Configuration Dialog
 */

import { SETTINGS_CONFIG_CLASS, VUE_APP_CLASS } from '@constants/cssClasses.mjs';
import { useVueSettingsMixin, type VueSettingsRenderOptions } from '@vueApps/index.mjs';
import type { App, Component } from 'vue';
import { createApp } from 'vue';

import type { SettingsSection } from '../../core/index.mjs';
import { SYSTEM_ID } from '../../shared.mjs';
import { GAME_RULES_KEYS } from '../constants.mjs';
import GameRulesSettingsApp from './GameRulesSettingsApp.vue';

// Foundry global UI reference
declare const ui: typeof foundry.ui;

const { ApplicationV2 } = foundry.applications.api;

// Create the base class with Vue mixin
const VueSettingsBase = useVueSettingsMixin<typeof ApplicationV2, Record<string, unknown>>(ApplicationV2);

/**
 * Vue-based application for configuring game rules settings.
 */
class GameRulesSettingsConfig extends VueSettingsBase {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: 'dnd35e-game-rules-config',
      tag: 'div',
      classes: [SYSTEM_ID, VUE_APP_CLASS, SETTINGS_CONFIG_CLASS],
      position: {
        width: 540,
        height: 'auto',
      },
      window: {
        title: 'dnd35e.SETTINGS.GameRules.Title',
        icon: 'fas fa-list-check',
        resizable: true,
      },
    },
    { inplace: false }
  );

  /** Settings keys managed by this config */
  static SETTING_KEYS = Object.values(GAME_RULES_KEYS);

  /** Section configuration */
  static SECTIONS: SettingsSection[] = [
    // {
    //   key: 'movement',
    //   label: 'dnd35e.SETTINGS.GameRules.Movement',
    //   fields: [
    //     {
    //       key: GAME_RULES_KEYS.DIAGONAL_MOVEMENT,
    //       label: 'dnd35e.SETTINGS.DiagonalMovement.Name',
    //       hint: 'dnd35e.SETTINGS.DiagonalMovement.Hint',
    //       type: 'string',
    //       choices: [
    //         { value: '555', label: 'dnd35e.SETTINGS.DiagonalMovement.555' },
    //         { value: '5105', label: 'dnd35e.SETTINGS.DiagonalMovement.5105' },
    //         { value: 'EUCL', label: 'dnd35e.SETTINGS.DiagonalMovement.EUCL' },
    //       ],
    //     },
    //     {
    //       key: GAME_RULES_KEYS.MEASURE_STYLE,
    //       label: 'dnd35e.SETTINGS.MeasureStyle.Name',
    //       hint: 'dnd35e.SETTINGS.MeasureStyle.Hint',
    //       type: 'string',
    //       choices: [
    //         { value: 'center', label: 'dnd35e.SETTINGS.MeasureStyle.Center' },
    //         { value: 'gridSpaces', label: 'dnd35e.SETTINGS.MeasureStyle.GridSpaces' },
    //       ],
    //     },
    //   ],
    // },
    // {
    //   key: 'experience',
    //   label: 'dnd35e.SETTINGS.GameRules.Experience',
    //   fields: [
    //     {
    //       key: GAME_RULES_KEYS.EXPERIENCE_RATE,
    //       label: 'dnd35e.SETTINGS.ExperienceRate.Name',
    //       hint: 'dnd35e.SETTINGS.ExperienceRate.Hint',
    //       type: 'string',
    //       choices: [
    //         { value: 'slow', label: 'dnd35e.SETTINGS.ExperienceRate.Slow' },
    //         { value: 'medium', label: 'dnd35e.SETTINGS.ExperienceRate.Medium' },
    //         { value: 'fast', label: 'dnd35e.SETTINGS.ExperienceRate.Fast' },
    //       ],
    //     },
    //     { key: GAME_RULES_KEYS.DISABLE_EXPERIENCE_TRACKING, label: 'dnd35e.SETTINGS.DisableExperienceTracking.Name', hint: 'dnd35e.SETTINGS.DisableExperienceTracking.Hint', type: 'boolean' },
    //   ],
    // },
    {
      key: 'optionalRules',
      label: 'dnd35e.SETTINGS.GameRules.OptionalRules',
      fields: [
        // { key: GAME_RULES_KEYS.USE_FRACTIONAL_BASE_BONUSES, label: 'dnd35e.SETTINGS.UseFractionalBaseBonuses.Name', hint: 'dnd35e.SETTINGS.UseFractionalBaseBonuses.Hint', type: 'boolean' },
        // { key: GAME_RULES_KEYS.ALLOW_BACKGROUND_SKILLS, label: 'dnd35e.SETTINGS.AllowBackgroundSkills.Name', hint: 'dnd35e.SETTINGS.AllowBackgroundSkills.Hint', type: 'boolean' },
        // { key: GAME_RULES_KEYS.PSIONICS_ARE_DIFFERENT, label: 'dnd35e.SETTINGS.PsionicsAreDifferent.Name', hint: 'dnd35e.SETTINGS.PsionicsAreDifferent.Hint', type: 'boolean' },
      ],
    },
    // {
    //   key: 'vision',
    //   label: 'dnd35e.SETTINGS.GameRules.Vision',
    //   fields: [
    //     {
    //       key: GAME_RULES_KEYS.LOW_LIGHT_VISION_MODE,
    //       label: 'dnd35e.SETTINGS.LowLightVisionMode.Name',
    //       hint: 'dnd35e.SETTINGS.LowLightVisionMode.Hint',
    //       type: 'string',
    //       choices: [
    //         { value: 'dim', label: 'dnd35e.SETTINGS.LowLightVisionMode.Dim' },
    //         { value: 'bright', label: 'dnd35e.SETTINGS.LowLightVisionMode.Bright' },
    //       ],
    //     },
    //   ],
    // },
    // {
    //   key: 'sheets',
    //   label: 'dnd35e.SETTINGS.GameRules.Sheets',
    //   fields: [
    //     { key: GAME_RULES_KEYS.USE_COMBAT_CHARACTER_SHEET, label: 'dnd35e.SETTINGS.UseCombatCharacterSheet.Name', hint: 'dnd35e.SETTINGS.UseCombatCharacterSheet.Hint', type: 'boolean' },
    //   ],
    // },
  ];

  constructor(...args: any[]) {
    super(...args);

    // Load current settings values
    const data: Record<string, unknown> = {};
    for (const key of GameRulesSettingsConfig.SETTING_KEYS) {
      data[key] = game.settings.get(SYSTEM_ID, key);
    }
    this.initializeReactiveData(data);
  }

  protected override get vueComponent(): Component {
    return GameRulesSettingsApp;
  }

  protected override _createVueApp(renderOptions: VueSettingsRenderOptions): App {
    return createApp(this.vueComponent, {
      context: {
        ...this.context,
        renderOptions,
      },
      sections: GameRulesSettingsConfig.SECTIONS,
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
      for (const key of GameRulesSettingsConfig.SETTING_KEYS) {
        if (key in data) {
          await game.settings.set(SYSTEM_ID, key, data[key]);
        }
      }

      ui.notifications.info(game.i18n.localize('dnd35e.SETTINGS.ChangesSaved'));
      await this.close();
    } catch (error) {
      console.error('Failed to save game rules settings:', error);
      ui.notifications.error(game.i18n.localize('dnd35e.SETTINGS.SaveError'));
    }
  }
}

export { GameRulesSettingsConfig };
