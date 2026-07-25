/**
 * Display settings registration
 */

// Foundry global UI reference
declare const ui: typeof foundry.ui;

import { SYSTEM_ID } from '../shared.mjs';
import {
  DISPLAY_CLIENT_KEYS,
  DISPLAY_MENU,
  DISPLAY_WORLD_KEYS,
  PARTY_HUD_CHOICES,
  SHARED_VISION_MODE_CHOICES,
  UNIT_CHOICES,
} from './constants.mjs';
import { DisplaySettingsConfig } from './sheet/index.mjs';

/**
 * Register display settings (world-scoped)
 */
function registerDisplayWorldSettings(): void {
  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.UNITS, {
    name: 'dnd35e.SETTINGS.Units.Name',
    hint: 'dnd35e.SETTINGS.Units.Hint',
    scope: 'world',
    config: false,
    type: String,
    default: 'imperial',
    choices: UNIT_CHOICES,
    // onChange: () => {
    //   // Re-render sheets to update unit display
    //   for (const actor of game.actors ?? []) {
    //     if (actor.type === 'character' && actor.sheet?.rendered) {
    //       actor.sheet.render();
    //     }
    //   }
    // },
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.PLAYERS_NO_DAMAGE_DETAILS, {
    name: 'dnd35e.SETTINGS.PlayersNoDamageDetails.Name',
    hint: 'dnd35e.SETTINGS.PlayersNoDamageDetails.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.PLAYERS_NO_DC_DETAILS, {
    name: 'dnd35e.SETTINGS.PlayersNoDCDetails.Name',
    hint: 'dnd35e.SETTINGS.PlayersNoDCDetails.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.ALLOW_PLAYERS_APPLY_ACTIONS, {
    name: 'dnd35e.SETTINGS.AllowPlayersApplyActions.Name',
    hint: 'dnd35e.SETTINGS.AllowPlayersApplyActions.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.PLAYERS_SHOW_CONTEXT_NOTES, {
    name: 'dnd35e.SETTINGS.PlayersShowContextNotes.Name',
    hint: 'dnd35e.SETTINGS.PlayersShowContextNotes.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  // Token & Vision World Settings
  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.GLOBAL_DISABLE_TOKEN_LIGHT, {
    name: 'dnd35e.SETTINGS.GlobalDisableTokenLight.Name',
    hint: 'dnd35e.SETTINGS.GlobalDisableTokenLight.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.DISABLE_TOKEN_AUTO_SYNC, {
    name: 'dnd35e.SETTINGS.DisableTokenAutoSync.Name',
    hint: 'dnd35e.SETTINGS.DisableTokenAutoSync.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.HIDE_TOKEN_CONDITIONS, {
    name: 'dnd35e.SETTINGS.HideTokenConditions.Name',
    hint: 'dnd35e.SETTINGS.HideTokenConditions.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.CORE_EFFECTS, {
    name: 'dnd35e.SETTINGS.CoreEffects.Name',
    hint: 'dnd35e.SETTINGS.CoreEffects.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
    onChange: () => {
      window.location.reload();
    },
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.SHARED_VISION_MODE, {
    name: 'dnd35e.SETTINGS.SharedVisionMode.Name',
    hint: 'dnd35e.SETTINGS.SharedVisionMode.Hint',
    scope: 'world',
    config: false,
    type: String,
    default: 'withoutSelection',
    choices: SHARED_VISION_MODE_CHOICES,
    onChange: () => {
      game.socket?.emit(`system.${SYSTEM_ID}`, { eventType: 'redrawCanvas' });
      canvas?.perception?.update({ refreshVision: true, refreshOcclusion: true });
    },
  });

  // Items & Shopping
  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.CHANGE_SCROLL_ICON, {
    name: 'dnd35e.SETTINGS.ChangeScrollIcon.Name',
    hint: 'dnd35e.SETTINGS.ChangeScrollIcon.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.BUY_CHAT, {
    name: 'dnd35e.SETTINGS.BuyChat.Name',
    hint: 'dnd35e.SETTINGS.BuyChat.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_WORLD_KEYS.CLEAR_INVENTORY, {
    name: 'dnd35e.SETTINGS.ClearInventory.Name',
    hint: 'dnd35e.SETTINGS.ClearInventory.Hint',
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
    name: 'dnd35e.SETTINGS.PartyHud.Name',
    hint: 'dnd35e.SETTINGS.PartyHud.Hint',
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
    name: 'dnd35e.SETTINGS.PartyHudTokenImage.Name',
    hint: 'dnd35e.SETTINGS.PartyHudTokenImage.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: true,
    onChange: () => {
      ui.nav?.render();
    },
  });

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.CUSTOM_SKIN, {
    name: 'dnd35e.SETTINGS.CustomSkin.Name',
    hint: 'dnd35e.SETTINGS.CustomSkin.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: true,
    onChange: (value: unknown) => {
      document.body.classList.toggle('dnd35e-custom-skin', value as boolean);
    },
  });

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.COLORBLIND_COLORS, {
    name: 'dnd35e.SETTINGS.ColorblindColors.Name',
    hint: 'dnd35e.SETTINGS.ColorblindColors.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
    onChange: (value: unknown) => {
      document.body.classList.toggle('color-blind', value as boolean);
    },
  });

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.TRANSPARENT_SIDEBAR, {
    name: 'dnd35e.SETTINGS.TransparentSidebar.Name',
    hint: 'dnd35e.SETTINGS.TransparentSidebar.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
    onChange: (value: unknown) => {
      document.body.classList.toggle('transparent-sidebar', value as boolean);
    },
  });

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.AUTO_COLLAPSE_ITEM_CARDS, {
    name: 'dnd35e.SETTINGS.AutoCollapseItemCards.Name',
    hint: 'dnd35e.SETTINGS.AutoCollapseItemCards.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
    onChange: () => {
      ui.chat?.render();
    },
  });

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.CLASS_FEATURES_IN_TABS, {
    name: 'dnd35e.SETTINGS.ClassFeaturesInTabs.Name',
    hint: 'dnd35e.SETTINGS.ClassFeaturesInTabs.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.HIDE_SPELL_DESCRIPTIONS, {
    name: 'dnd35e.SETTINGS.HideSpellDescriptions.Name',
    hint: 'dnd35e.SETTINGS.HideSpellDescriptions.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.HIDE_SPELL_DESCRIPTIONS_IF_HAS_ACTION, {
    name: 'dnd35e.SETTINGS.HideSpellDescriptionsIfHasAction.Name',
    hint: 'dnd35e.SETTINGS.HideSpellDescriptionsIfHasAction.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
    onChange: () => {
      ui.chat?.render();
    },
  });

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.SAVE_ATTACK_WINDOW, {
    name: 'dnd35e.SETTINGS.SaveAttackWindow.Name',
    hint: 'dnd35e.SETTINGS.SaveAttackWindow.Hint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, DISPLAY_CLIENT_KEYS.HIDE_PLAYERS_LIST, {
    name: 'dnd35e.SETTINGS.HidePlayersList.Name',
    hint: 'dnd35e.SETTINGS.HidePlayersList.Hint',
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
 * Register the Display settings menu button
 */
function registerDisplayMenu(): void {
  game.settings.registerMenu(SYSTEM_ID, DISPLAY_MENU, {
    name: 'dnd35e.SETTINGS.Display.Name',
    label: 'dnd35e.SETTINGS.Display.Label',
    hint: 'dnd35e.SETTINGS.Display.Hint',
    icon: 'fas fa-display',
    type: DisplaySettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: false, // Client-side settings, available to all users
  });
}

/**
 * Register all display settings
 */
function registerDisplaySettings(): void {
  registerDisplayMenu();
  registerDisplayWorldSettings();
  registerDisplayClientSettings();
}

export {
  registerDisplayClientSettings,
  registerDisplaySettings,
  registerDisplayWorldSettings,
};
