/**
 * Display settings registration
 */

// Foundry global UI reference
declare const ui: typeof foundry.ui;

import { PARTY_HUD_CHOICES, SETTINGS, SYSTEM_ID, UNIT_CHOICES } from '../constants/index.mjs';

/**
 * Register display settings (client-scoped)
 */
function registerDisplaySettings(): void {
  game.settings.register(SYSTEM_ID, SETTINGS.UNITS, {
    name: 'DND35E.Settings.Units.Name',
    hint: 'DND35E.Settings.Units.Hint',
    scope: 'world',
    config: false,
    type: String,
    default: 'imperial',
    choices: UNIT_CHOICES,
    onChange: () => {
      // Re-render sheets to update unit display
      for (const actor of game.actors ?? []) {
        if (actor.type === 'character' && actor.sheet?.rendered) {
          actor.sheet.render();
        }
      }
    },
  });

  game.settings.register(SYSTEM_ID, SETTINGS.SHOW_PARTY_HUD, {
    name: 'DND35E.Settings.PartyHud.Name',
    hint: 'DND35E.Settings.PartyHud.Hint',
    scope: 'client',
    config: false,
    type: String,
    default: 'none',
    choices: PARTY_HUD_CHOICES,
    onChange: () => {
      ui.nav?.render();
    },
  });

  game.settings.register(SYSTEM_ID, SETTINGS.SHOW_PARTY_HUD_TOKEN_IMAGE, {
    name: 'DND35E.Settings.PartyHudTokenImage.Name',
    hint: 'DND35E.Settings.PartyHudTokenImage.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: true,
    onChange: () => {
      ui.nav?.render();
    },
  });

  game.settings.register(SYSTEM_ID, SETTINGS.CUSTOM_SKIN, {
    name: 'DND35E.Settings.CustomSkin.Name',
    hint: 'DND35E.Settings.CustomSkin.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: true,
    onChange: (value: unknown) => {
      document.body.classList.toggle('dnd35e-custom-skin', value as boolean);
    },
  });

  game.settings.register(SYSTEM_ID, SETTINGS.COLORBLIND_COLORS, {
    name: 'DND35E.Settings.ColorblindColors.Name',
    hint: 'DND35E.Settings.ColorblindColors.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
    onChange: (value: unknown) => {
      document.body.classList.toggle('color-blind', value as boolean);
    },
  });

  game.settings.register(SYSTEM_ID, SETTINGS.TRANSPARENT_SIDEBAR, {
    name: 'DND35E.Settings.TransparentSidebar.Name',
    hint: 'DND35E.Settings.TransparentSidebar.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
    onChange: (value: unknown) => {
      document.body.classList.toggle('transparent-sidebar', value as boolean);
    },
  });

  game.settings.register(SYSTEM_ID, SETTINGS.AUTO_COLLAPSE_ITEM_CARDS, {
    name: 'DND35E.Settings.AutoCollapseItemCards.Name',
    hint: 'DND35E.Settings.AutoCollapseItemCards.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
    onChange: () => {
      ui.chat?.render();
    },
  });

  game.settings.register(SYSTEM_ID, SETTINGS.CLASS_FEATURES_IN_TABS, {
    name: 'DND35E.Settings.ClassFeaturesInTabs.Name',
    hint: 'DND35E.Settings.ClassFeaturesInTabs.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, SETTINGS.HIDE_SPELL_DESCRIPTIONS, {
    name: 'DND35E.Settings.HideSpellDescriptions.Name',
    hint: 'DND35E.Settings.HideSpellDescriptions.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
  });
}

export {
  registerDisplaySettings,
};
