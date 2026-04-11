/**
 * Display settings constants
 */

/**
 * Display setting keys (World-scoped)
 */
export const DISPLAY_WORLD_KEYS = {
  UNITS: 'units',
  PLAYERS_NO_DAMAGE_DETAILS: 'playersNoDamageDetails',
  PLAYERS_NO_DC_DETAILS: 'playersNoDCDetails',
  ALLOW_PLAYERS_APPLY_ACTIONS: 'allowPlayersApplyActions',
  PLAYERS_SHOW_CONTEXT_NOTES: 'playersShowContextNotes',
  GLOBAL_DISABLE_TOKEN_LIGHT: 'globalDisableTokenLight',
  GLOBAL_DISABLE_TOKEN_VISION: 'globalDisableTokenVision',
  HIDE_TOKEN_CONDITIONS: 'hideTokenConditions',
  CORE_EFFECTS: 'coreEffects',
  SHARED_VISION_MODE: 'sharedVisionMode',
  CHANGE_SCROLL_ICON: 'changeScrollIcon',
  BUY_CHAT: 'buyChat',
  CLEAR_INVENTORY: 'clearInventory',
} as const;

/**
 * Display setting keys (Client-scoped)
 */
export const DISPLAY_CLIENT_KEYS = {
  SHOW_PARTY_HUD: 'showPartyHud',
  SHOW_PARTY_HUD_TOKEN_IMAGE: 'showPartyHudTokenImage',
  CUSTOM_SKIN: 'customSkin',
  COLORBLIND_COLORS: 'colorblindColors',
  AUTO_COLLAPSE_ITEM_CARDS: 'autoCollapseItemCards',
  CLASS_FEATURES_IN_TABS: 'classFeaturesInTabs',
  HIDE_SPELL_DESCRIPTIONS: 'hideSpells',
  HIDE_SPELL_DESCRIPTIONS_IF_HAS_ACTION: 'hideSpellDescriptionsIfHasAction',
  TRANSPARENT_SIDEBAR: 'transparentSidebarWhenUsingTheme',
  SAVE_ATTACK_WINDOW: 'saveAttackWindow',
  HIDE_PLAYERS_LIST: 'hidePlayersList',
} as const;

/**
 * Combined display setting keys
 */
export const DISPLAY_KEYS = {
  ...DISPLAY_WORLD_KEYS,
  ...DISPLAY_CLIENT_KEYS,
} as const;

/**
 * Display settings menu key
 */
export const DISPLAY_MENU = 'displayConfig';

/**
 * Unit choices
 */
export const UNIT_CHOICES = {
  imperial: 'dnd35e.SETTINGS.Units.Imperial',
  metric: 'dnd35e.SETTINGS.Units.Metric',
} as const;

/**
 * Party HUD choices
 */
export const PARTY_HUD_CHOICES = {
  full: 'dnd35e.SETTINGS.PartyHud.Full',
  narrow: 'dnd35e.SETTINGS.PartyHud.Narrow',
  none: 'dnd35e.SETTINGS.PartyHud.None',
} as const;

/**
 * Shared vision mode choices
 */
export const SHARED_VISION_MODE_CHOICES = {
  '0': 'dnd35e.SETTINGS.SharedVision.WithoutSelection',
  '1': 'dnd35e.SETTINGS.SharedVision.WithSelection',
} as const;
