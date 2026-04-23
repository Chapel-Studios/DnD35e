/**
 * Vue-based Combat Settings Configuration Dialog
 */

import { SETTINGS_CONFIG_CLASS, VUE_APP_CLASS } from '@constants/cssClasses.mjs';
import { useVueSettingsMixin, type VueSettingsRenderOptions } from '@vueApps/index.mjs';
import type { App, Component } from 'vue';
import { createApp } from 'vue';

import { GenericSettingsApp, type SettingsSection } from '../../core/index.mjs';
import { SYSTEM_ID } from '../../shared.mjs';
import { COMBAT_KEYS } from '../constants.mjs';

// Foundry global UI reference
declare const ui: typeof foundry.ui;

const { ApplicationV2 } = foundry.applications.api;

// Create the base class with Vue mixin
const VueSettingsBase = useVueSettingsMixin<typeof ApplicationV2, Record<string, unknown>>(ApplicationV2);

/**
 * Vue-based application for configuring combat settings.
 */
class CombatSettingsConfig extends VueSettingsBase {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: 'dnd35e-combat-config',
      tag: 'div',
      classes: [SYSTEM_ID, VUE_APP_CLASS, SETTINGS_CONFIG_CLASS],
      position: {
        width: 540,
        height: 'auto',
      },
      window: {
        title: 'dnd35e.SETTINGS.Combat.Title',
        icon: 'fas fa-swords',
        resizable: true,
      },
    },
    { inplace: false }
  );

  /** Settings keys managed by this config */
  static SETTING_KEYS = Object.values(COMBAT_KEYS);

  /** Section configuration */
  static SECTIONS: SettingsSection[] = [
    {
      key: 'weapons',
      label: 'dnd35e.SETTINGS.Combat.Weapons',
      fields: [
        { key: COMBAT_KEYS.AUTOSIZE_WEAPONS, label: 'dnd35e.SETTINGS.AutosizeWeapons.Name', hint: 'dnd35e.SETTINGS.AutosizeWeapons.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.AUTO_SCALE_ATTACKS_BAB, label: 'dnd35e.SETTINGS.AutoScaleAttacksBab.Name', hint: 'dnd35e.SETTINGS.AutoScaleAttacksBab.Hint', type: 'boolean' },
      ],
    },
    {
      key: 'ammunition',
      label: 'dnd35e.SETTINGS.Combat.Ammunition',
      fields: [
        { key: COMBAT_KEYS.ALLOW_NO_AMMO, label: 'dnd35e.SETTINGS.AllowNoAmmo.Name', hint: 'dnd35e.SETTINGS.AllowNoAmmo.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.USE_AUTO_AMMO_RECOVERY, label: 'dnd35e.SETTINGS.UseAutoAmmoRecovery.Name', hint: 'dnd35e.SETTINGS.UseAutoAmmoRecovery.Hint', type: 'boolean' },
      ],
    },
    {
      key: 'spellpoints',
      label: 'dnd35e.SETTINGS.Combat.Spellpoints',
      fields: [
        { key: COMBAT_KEYS.NO_AUTO_SPELLPOINTS_COST, label: 'dnd35e.SETTINGS.NoAutoSpellpointsCost.Name', hint: 'dnd35e.SETTINGS.NoAutoSpellpointsCost.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.SPELLPOINT_COST_FORMULA, label: 'dnd35e.SETTINGS.SpellpointCostFormula.Name', hint: 'dnd35e.SETTINGS.SpellpointCostFormula.Hint', type: 'string' },
      ],
    },
    {
      key: 'automation',
      label: 'dnd35e.SETTINGS.Combat.Automation',
      fields: [
        { key: COMBAT_KEYS.SHOW_FULL_ATTACK_CHAT_CARD, label: 'dnd35e.SETTINGS.ShowFullAttackChatCard.Name', hint: 'dnd35e.SETTINGS.ShowFullAttackChatCard.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.REPEAT_ANIMATIONS, label: 'dnd35e.SETTINGS.RepeatAnimations.Name', hint: 'dnd35e.SETTINGS.RepeatAnimations.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.AUTOMATE_FLANKING_THREAT, label: 'dnd35e.SETTINGS.AutomateFlankingThreat.Name', hint: 'dnd35e.SETTINGS.AutomateFlankingThreat.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.THREATENED_SHOW_SQUARES, label: 'dnd35e.SETTINGS.ThreatenedShowSquares.Name', hint: 'dnd35e.SETTINGS.ThreatenedShowSquares.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.RANDOMIZE_HP, label: 'dnd35e.SETTINGS.RandomizeHp.Name', hint: 'dnd35e.SETTINGS.RandomizeHp.Hint', type: 'boolean' },
      ],
    },
  ];

  constructor(...args: any[]) {
    super(...args);

    // Load current settings values
    const data: Record<string, unknown> = {};
    for (const key of CombatSettingsConfig.SETTING_KEYS) {
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
      sections: CombatSettingsConfig.SECTIONS,
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
      for (const key of CombatSettingsConfig.SETTING_KEYS) {
        if (key in data) {
          await game.settings.set(SYSTEM_ID, key, data[key]);
        }
      }

      ui.notifications.info(game.i18n.localize('dnd35e.SETTINGS.ChangesSaved'));
      await this.close();
    } catch (error) {
      console.error('Failed to save combat settings:', error);
      ui.notifications.error(game.i18n.localize('dnd35e.SETTINGS.SaveError'));
    }
  }
}

export { CombatSettingsConfig };
