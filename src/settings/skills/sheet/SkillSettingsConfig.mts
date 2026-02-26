/**
 * Vue-based Skill Settings Configuration Dialog
 */

import type { VueSettingsRenderOptions } from '@vueApps/index.mjs';
import { useVueSettingsMixin } from '@vueApps/index.mjs';
import type { Component } from 'vue';

import { SYSTEM_ID } from '../../shared.mjs';
import { DEFAULT_SKILL_SETTINGS, SKILLS_KEY, type SkillSettings } from '../constants.mjs';
import SkillSettingsApp from './SkillSettingsApp.vue';

// Foundry global UI reference
declare const ui: typeof foundry.ui;

const { ApplicationV2 } = foundry.applications.api;

// Create the base class with Vue mixin
const VueSettingsBase = useVueSettingsMixin<typeof ApplicationV2, SkillSettings>(ApplicationV2);

/**
 * Vue-based application for configuring skill visibility and custom skills.
 */
class SkillSettingsConfig extends VueSettingsBase {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: 'dnd35e-skill-config',
      tag: 'div',
      classes: ['dnd35e', 'vueApp', 'settings-config'],
      position: {
        width: 720,
        height: 500,
      },
      window: {
        title: 'DND35E.Settings.SkillSettings.Title',
        icon: 'fas fa-book-open',
        resizable: true,
      },
    },
    { inplace: false }
  );

  constructor(...args: any[]) {
    super(...args);

    // Load current settings and initialize reactive data
    const currentConfig = game.settings.get(SYSTEM_ID, SKILLS_KEY) as SkillSettings;
    const mergedConfig = foundry.utils.mergeObject(
      foundry.utils.deepClone(DEFAULT_SKILL_SETTINGS),
      currentConfig
    ) as SkillSettings;

    this.initializeReactiveData(mergedConfig);
  }

  /** The Vue component to render */
  protected override get vueComponent(): Component {
    return SkillSettingsApp;
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
      await game.settings.set(SYSTEM_ID, SKILLS_KEY, data);

      ui.notifications.info(game.i18n.localize('DND35E.Settings.ChangesSaved'));
      await this.close();
    } catch (error) {
      console.error('Failed to save skill settings:', error);
      ui.notifications.error(game.i18n.localize('DND35E.Settings.SaveError'));
    }
  }

  /**
   * Handle reset - restore default values
   */
  async #onReset(): Promise<void> {
    // @ts-expect-error - DialogV2.confirm typing issues
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('DND35E.Settings.ResetConfirm.Title') },
      content: `<p>${game.i18n.localize('DND35E.Settings.ResetConfirm.Content')}</p>`,
      yes: {
        label: game.i18n.localize('DND35E.Settings.Reset'),
        icon: 'fas fa-undo',
      },
      no: {
        label: game.i18n.localize('Cancel'),
      },
    });

    if (!confirmed) return;

    const defaults = foundry.utils.deepClone(DEFAULT_SKILL_SETTINGS);
    this.initializeReactiveData(defaults);
    this.render();
  }
}

export { SkillSettingsConfig };
