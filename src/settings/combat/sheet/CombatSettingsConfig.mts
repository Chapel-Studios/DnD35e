/**
 * Vue-based Combat Settings Configuration Dialog
 */

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
  static SETTING_KEYS = Object.values(COMBAT_KEYS);

  /** Section configuration */
  static SECTIONS: SettingsSection[] = [
    {
      key: 'weapons',
      label: 'DND35E.Settings.Combat.Weapons',
      fields: [
        { key: COMBAT_KEYS.AUTOSIZE_WEAPONS, label: 'DND35E.Settings.AutosizeWeapons.Name', hint: 'DND35E.Settings.AutosizeWeapons.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.AUTO_SCALE_ATTACKS_BAB, label: 'DND35E.Settings.AutoScaleAttacksBab.Name', hint: 'DND35E.Settings.AutoScaleAttacksBab.Hint', type: 'boolean' },
      ],
    },
    {
      key: 'ammunition',
      label: 'DND35E.Settings.Combat.Ammunition',
      fields: [
        { key: COMBAT_KEYS.ALLOW_NO_AMMO, label: 'DND35E.Settings.AllowNoAmmo.Name', hint: 'DND35E.Settings.AllowNoAmmo.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.USE_AUTO_AMMO_RECOVERY, label: 'DND35E.Settings.UseAutoAmmoRecovery.Name', hint: 'DND35E.Settings.UseAutoAmmoRecovery.Hint', type: 'boolean' },
      ],
    },
    {
      key: 'spellpoints',
      label: 'DND35E.Settings.Combat.Spellpoints',
      fields: [
        { key: COMBAT_KEYS.NO_AUTO_SPELLPOINTS_COST, label: 'DND35E.Settings.NoAutoSpellpointsCost.Name', hint: 'DND35E.Settings.NoAutoSpellpointsCost.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.SPELLPOINT_COST_FORMULA, label: 'DND35E.Settings.SpellpointCostFormula.Name', hint: 'DND35E.Settings.SpellpointCostFormula.Hint', type: 'string' },
      ],
    },
    {
      key: 'automation',
      label: 'DND35E.Settings.Combat.Automation',
      fields: [
        { key: COMBAT_KEYS.SHOW_FULL_ATTACK_CHAT_CARD, label: 'DND35E.Settings.ShowFullAttackChatCard.Name', hint: 'DND35E.Settings.ShowFullAttackChatCard.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.REPEAT_ANIMATIONS, label: 'DND35E.Settings.RepeatAnimations.Name', hint: 'DND35E.Settings.RepeatAnimations.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.AUTOMATE_FLANKING_THREAT, label: 'DND35E.Settings.AutomateFlankingThreat.Name', hint: 'DND35E.Settings.AutomateFlankingThreat.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.THREATENED_SHOW_SQUARES, label: 'DND35E.Settings.ThreatenedShowSquares.Name', hint: 'DND35E.Settings.ThreatenedShowSquares.Hint', type: 'boolean' },
        { key: COMBAT_KEYS.RANDOMIZE_HP, label: 'DND35E.Settings.RandomizeHp.Name', hint: 'DND35E.Settings.RandomizeHp.Hint', type: 'boolean' },
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

      ui.notifications.info(game.i18n.localize('DND35E.Settings.ChangesSaved'));
      await this.close();
    } catch (error) {
      console.error('Failed to save combat settings:', error);
      ui.notifications.error(game.i18n.localize('DND35E.Settings.SaveError'));
    }
  }
}

export { CombatSettingsConfig };
