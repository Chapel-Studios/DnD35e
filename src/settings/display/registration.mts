/**
 * Display settings registration
 */

// Foundry global UI reference
declare const ui: typeof foundry.ui;

import { SYSTEM_ID } from '../shared.mjs';
import {
  DISPLAY_CLIENT_KEYS,
  DISPLAY_WORLD_KEYS,
  PARTY_HUD_CHOICES,
  SHARED_VISION_MODE_CHOICES,
  UNIT_CHOICES,
} from './constants.mjs';

/**
 * Register display settings (world-scoped)
 */
function registerDisplayWorldSettings(): void {
  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.UNITS, {
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

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.PLAYERS_NO_DAMAGE_DETAILS, {
    name: 'DND35E.Settings.PlayersNoDamageDetails.Name',
    hint: 'DND35E.Settings.PlayersNoDamageDetails.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.PLAYERS_NO_DC_DETAILS, {
    name: 'DND35E.Settings.PlayersNoDCDetails.Name',
    hint: 'DND35E.Settings.PlayersNoDCDetails.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.ALLOW_PLAYERS_APPLY_ACTIONS, {
    name: 'DND35E.Settings.AllowPlayersApplyActions.Name',
    hint: 'DND35E.Settings.AllowPlayersApplyActions.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.PLAYERS_SHOW_CONTEXT_NOTES, {
    name: 'DND35E.Settings.PlayersShowContextNotes.Name',
    hint: 'DND35E.Settings.PlayersShowContextNotes.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  // Token & Vision World Settings
  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.GLOBAL_DISABLE_TOKEN_LIGHT, {
    name: 'DND35E.Settings.GlobalDisableTokenLight.Name',
    hint: 'DND35E.Settings.GlobalDisableTokenLight.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.GLOBAL_DISABLE_TOKEN_VISION, {
    name: 'DND35E.Settings.GlobalDisableTokenVision.Name',
    hint: 'DND35E.Settings.GlobalDisableTokenVision.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.HIDE_TOKEN_CONDITIONS, {
    name: 'DND35E.Settings.HideTokenConditions.Name',
    hint: 'DND35E.Settings.HideTokenConditions.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.CORE_EFFECTS, {
    name: 'DND35E.Settings.CoreEffects.Name',
    hint: 'DND35E.Settings.CoreEffects.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
    onChange: () => {
      window.location.reload();
    },
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.SHARED_VISION_MODE, {
    name: 'DND35E.Settings.SharedVisionMode.Name',
    hint: 'DND35E.Settings.SharedVisionMode.Hint',
    scope: 'world',
    config: false,
    type: String,
    default: '0',
    choices: SHARED_VISION_MODE_CHOICES,
    onChange: () => {
      game.socket?.emit(`system.${SYSTEM_ID}`, { eventType: 'redrawCanvas' });
    },
  });

  // Items & Shopping
  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.CHANGE_SCROLL_ICON, {
    name: 'DND35E.Settings.ChangeScrollIcon.Name',
    hint: 'DND35E.Settings.ChangeScrollIcon.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.BUY_CHAT, {
    name: 'DND35E.Settings.BuyChat.Name',
    hint: 'DND35E.Settings.BuyChat.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.CLEAR_INVENTORY, {
    name: 'DND35E.Settings.ClearInventory.Name',
    hint: 'DND35E.Settings.ClearInventory.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });
}

/**
 * Register display settings (client-scoped)
 */
function registerDisplayClientSettings(): void {
  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.SHOW_PARTY_HUD, {
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

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.SHOW_PARTY_HUD_TOKEN_IMAGE, {
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

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.CUSTOM_SKIN, {
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

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.COLORBLIND_COLORS, {
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

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.TRANSPARENT_SIDEBAR, {
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

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.AUTO_COLLAPSE_ITEM_CARDS, {
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

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.CLASS_FEATURES_IN_TABS, {
    name: 'DND35E.Settings.ClassFeaturesInTabs.Name',
    hint: 'DND35E.Settings.ClassFeaturesInTabs.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.HIDE_SPELL_DESCRIPTIONS, {
    name: 'DND35E.Settings.HideSpellDescriptions.Name',
    hint: 'DND35E.Settings.HideSpellDescriptions.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.HIDE_SPELL_DESCRIPTIONS_IF_HAS_ACTION, {
    name: 'DND35E.Settings.HideSpellDescriptionsIfHasAction.Name',
    hint: 'DND35E.Settings.HideSpellDescriptionsIfHasAction.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
    onChange: () => {
      ui.chat?.render();
    },
  });

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.SAVE_ATTACK_WINDOW, {
    name: 'DND35E.Settings.SaveAttackWindow.Name',
    hint: 'DND35E.Settings.SaveAttackWindow.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.HIDE_PLAYERS_LIST, {
    name: 'DND35E.Settings.HidePlayersList.Name',
    hint: 'DND35E.Settings.HidePlayersList.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
    onChange: (value: unknown) => {
      document.body.classList.toggle('no-players-list', value as boolean);
    },
  });
}

/**
 * Register all display settings
 */
function registerDisplaySettings(): void {
  registerDisplayWorldSettings();
  registerDisplayClientSettings();
}

export {
  registerDisplayClientSettings,
  registerDisplaySettings,
  registerDisplayWorldSettings,
};
