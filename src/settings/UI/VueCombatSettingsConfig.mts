/**
 * Vue-based Combat Settings Configuration Dialog
 */

import { SETTINGS, SYSTEM_ID } from '@settings/constants/index.mjs';
import type { SettingsSection } from '@vc/Settings/index.mjs';
import { GenericSettingsApp } from '@vc/Settings/index.mjs';
import { useVueSettingsMixin, type VueSettingsRenderOptions } from '@vueApps/index.mjs';
import type { App, Component } from 'vue';
import { createApp } from 'vue';


// Foundry global UI reference
declare const ui: typeof foundry.ui;

const { ApplicationV2 } = foundry.applications.api;

// Create the base class with Vue mixin
const VueSettingsBase = useVueSettingsMixin<typeof ApplicationV2, Record<string, unknown>>(ApplicationV2);

/**
 * Vue-based application for configuring combat settings.
 */
class VueCombatSettingsConfig extends VueSettingsBase {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: 'dnd35e-combat-config',
      tag: 'div',
      classes: ['dnd35e', 'vueApp', 'settings-config'],
      position: {
        width: 540,
        height: 'auto',
      },
      window: {
        title: 'DND35E.Settings.Combat.Title',
        icon: 'fas fa-swords',
        resizable: true,
      },
    },
    { inplace: false }
  );

  /** Settings keys managed by this config */
  static SETTING_KEYS = [
    SETTINGS.AUTOSIZE_WEAPONS,
    SETTINGS.AUTO_SCALE_ATTACKS_BAB,
    SETTINGS.ALLOW_NO_AMMO,
    SETTINGS.USE_AUTO_AMMO_RECOVERY,
    SETTINGS.NO_AUTO_SPELLPOINTS_COST,
    SETTINGS.SPELLPOINT_COST_FORMULA,
    SETTINGS.LOW_LIGHT_VISION_MODE,
  ] as const;

  /** Section configuration */
  static SECTIONS: SettingsSection[] = [
    {
      key: 'weapons',
      label: 'DND35E.Settings.Combat.Weapons',
      fields: [
        { key: SETTINGS.AUTOSIZE_WEAPONS, label: 'DND35E.Settings.AutosizeWeapons.Name', hint: 'DND35E.Settings.AutosizeWeapons.Hint', type: 'boolean' },
        { key: SETTINGS.AUTO_SCALE_ATTACKS_BAB, label: 'DND35E.Settings.AutoScaleAttacksBab.Name', hint: 'DND35E.Settings.AutoScaleAttacksBab.Hint', type: 'boolean' },
      ],
    },
    {
      key: 'ammunition',
      label: 'DND35E.Settings.Combat.Ammunition',
      fields: [
        { key: SETTINGS.ALLOW_NO_AMMO, label: 'DND35E.Settings.AllowNoAmmo.Name', hint: 'DND35E.Settings.AllowNoAmmo.Hint', type: 'boolean' },
        { key: SETTINGS.USE_AUTO_AMMO_RECOVERY, label: 'DND35E.Settings.UseAutoAmmoRecovery.Name', hint: 'DND35E.Settings.UseAutoAmmoRecovery.Hint', type: 'boolean' },
      ],
    },
    {
      key: 'spellpoints',
      label: 'DND35E.Settings.Combat.Spellpoints',
      fields: [
        { key: SETTINGS.NO_AUTO_SPELLPOINTS_COST, label: 'DND35E.Settings.NoAutoSpellpointsCost.Name', hint: 'DND35E.Settings.NoAutoSpellpointsCost.Hint', type: 'boolean' },
        { key: SETTINGS.SPELLPOINT_COST_FORMULA, label: 'DND35E.Settings.SpellpointCostFormula.Name', hint: 'DND35E.Settings.SpellpointCostFormula.Hint', type: 'string' },
      ],
    },
    {
      key: 'vision',
      label: 'DND35E.Settings.Combat.Vision',
      fields: [
        {
          key: SETTINGS.LOW_LIGHT_VISION_MODE,
          label: 'DND35E.Settings.LowLightVisionMode.Name',
          hint: 'DND35E.Settings.LowLightVisionMode.Hint',
          type: 'string',
          choices: [
            { value: 'dim', label: 'DND35E.Settings.LowLightVisionMode.Dim' },
            { value: 'bright', label: 'DND35E.Settings.LowLightVisionMode.Bright' },
          ],
        },
      ],
    },
  ];

  constructor(...args: any[]) {
    super(...args);

    // Load current settings values
    const data: Record<string, unknown> = {};
    for (const key of VueCombatSettingsConfig.SETTING_KEYS) {
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
      sections: VueCombatSettingsConfig.SECTIONS,
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
      for (const key of VueCombatSettingsConfig.SETTING_KEYS) {
        if (key in data) {
          await game.settings.set(SYSTEM_ID, key, data[key]);
        }
      }

      ui.notifications.info(game.i18n.localize('DND35E.Settings.ChangesSaved'));
      await this.close();
    } catch (error) {
      console.error('Failed to save combat settings:', error);
      ui.notifications.error(game.i18n.localize('DND35E.Settings.SaveError'));
    }
  }
}

export { VueCombatSettingsConfig };
