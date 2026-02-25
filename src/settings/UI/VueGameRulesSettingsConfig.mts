/**
 * Vue-based Game Rules Settings Configuration Dialog
 */

import { SETTINGS, SYSTEM_ID } from '@settings/constants/index.mjs';
import { GenericSettingsApp, type SettingsSection } from '@vc/Settings/index.mjs';
import { useVueSettingsMixin, type VueSettingsRenderOptions } from '@vueApps/index.mjs';
import type { App, Component } from 'vue';
import { createApp } from 'vue';

// Foundry global UI reference
declare const ui: typeof foundry.ui;

const { ApplicationV2 } = foundry.applications.api;

// Create the base class with Vue mixin
const VueSettingsBase = useVueSettingsMixin<typeof ApplicationV2, Record<string, unknown>>(ApplicationV2);

/**
 * Vue-based application for configuring game rules settings.
 */
class VueGameRulesSettingsConfig extends VueSettingsBase {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: 'dnd35e-game-rules-config',
      tag: 'div',
      classes: ['dnd35e', 'vueApp', 'settings-config'],
      position: {
        width: 540,
        height: 'auto',
      },
      window: {
        title: 'DND35E.Settings.GameRules.Title',
        icon: 'fas fa-list-check',
        resizable: true,
      },
    },
    { inplace: false }
  );

  /** Settings keys managed by this config */
  static SETTING_KEYS = [
    SETTINGS.DIAGONAL_MOVEMENT,
    SETTINGS.MEASURE_STYLE,
    SETTINGS.EXPERIENCE_RATE,
    SETTINGS.DISABLE_EXPERIENCE_TRACKING,
    SETTINGS.USE_FRACTIONAL_BASE_BONUSES,
    SETTINGS.ALLOW_BACKGROUND_SKILLS,
    SETTINGS.PSIONICS_ARE_DIFFERENT,
  ] as const;

  /** Section configuration */
  static SECTIONS: SettingsSection[] = [
    {
      key: 'movement',
      label: 'DND35E.Settings.GameRules.Movement',
      fields: [
        {
          key: SETTINGS.DIAGONAL_MOVEMENT,
          label: 'DND35E.Settings.DiagonalMovement.Name',
          hint: 'DND35E.Settings.DiagonalMovement.Hint',
          type: 'string',
          choices: [
            { value: '555', label: 'DND35E.Settings.DiagonalMovement.555' },
            { value: '5105', label: 'DND35E.Settings.DiagonalMovement.5105' },
            { value: 'EUCL', label: 'DND35E.Settings.DiagonalMovement.EUCL' },
          ],
        },
        {
          key: SETTINGS.MEASURE_STYLE,
          label: 'DND35E.Settings.MeasureStyle.Name',
          hint: 'DND35E.Settings.MeasureStyle.Hint',
          type: 'string',
          choices: [
            { value: 'center', label: 'DND35E.Settings.MeasureStyle.Center' },
            { value: 'gridSpaces', label: 'DND35E.Settings.MeasureStyle.GridSpaces' },
          ],
        },
      ],
    },
    {
      key: 'experience',
      label: 'DND35E.Settings.GameRules.Experience',
      fields: [
        {
          key: SETTINGS.EXPERIENCE_RATE,
          label: 'DND35E.Settings.ExperienceRate.Name',
          hint: 'DND35E.Settings.ExperienceRate.Hint',
          type: 'string',
          choices: [
            { value: 'slow', label: 'DND35E.Settings.ExperienceRate.Slow' },
            { value: 'medium', label: 'DND35E.Settings.ExperienceRate.Medium' },
            { value: 'fast', label: 'DND35E.Settings.ExperienceRate.Fast' },
          ],
        },
        { key: SETTINGS.DISABLE_EXPERIENCE_TRACKING, label: 'DND35E.Settings.DisableExperienceTracking.Name', hint: 'DND35E.Settings.DisableExperienceTracking.Hint', type: 'boolean' },
      ],
    },
    {
      key: 'optionalRules',
      label: 'DND35E.Settings.GameRules.OptionalRules',
      fields: [
        { key: SETTINGS.USE_FRACTIONAL_BASE_BONUSES, label: 'DND35E.Settings.UseFractionalBaseBonuses.Name', hint: 'DND35E.Settings.UseFractionalBaseBonuses.Hint', type: 'boolean' },
        { key: SETTINGS.ALLOW_BACKGROUND_SKILLS, label: 'DND35E.Settings.AllowBackgroundSkills.Name', hint: 'DND35E.Settings.AllowBackgroundSkills.Hint', type: 'boolean' },
        { key: SETTINGS.PSIONICS_ARE_DIFFERENT, label: 'DND35E.Settings.PsionicsAreDifferent.Name', hint: 'DND35E.Settings.PsionicsAreDifferent.Hint', type: 'boolean' },
      ],
    },
  ];

  constructor(...args: any[]) {
    super(...args);

    // Load current settings values
    const data: Record<string, unknown> = {};
    for (const key of VueGameRulesSettingsConfig.SETTING_KEYS) {
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
      sections: VueGameRulesSettingsConfig.SECTIONS,
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
      for (const key of VueGameRulesSettingsConfig.SETTING_KEYS) {
        if (key in data) {
          await game.settings.set(SYSTEM_ID, key, data[key]);
        }
      }

      ui.notifications.info(game.i18n.localize('DND35E.Settings.ChangesSaved'));
      await this.close();
    } catch (error) {
      console.error('Failed to save game rules settings:', error);
      ui.notifications.error(game.i18n.localize('DND35E.Settings.SaveError'));
    }
  }
}

export { VueGameRulesSettingsConfig };
