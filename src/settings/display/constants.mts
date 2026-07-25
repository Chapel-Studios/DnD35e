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
  DISABLE_TOKEN_AUTO_SYNC: 'disableTokenAutoSync',
  HIDE_TOKEN_CONDITIONS: 'hideTokenConditions',
  CORE_EFFECTS: 'coreEffects',
  SHARED_VISION_SCOPE: 'sharedVisionScope',
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
 * Shared vision scope choices — who the shared-vision pool draws from (see
 * `canvas/vision/sharedVisionPool.mts`). Used for both the world default and the per-actor
 * `flags.dnd35e.sharedVisionScope` override:
 * - `none`: never contributes to the shared-vision pool.
 * - `owned` (default): contributes to the pool for users who own the actor.
 * - `partyMembers`: contributes to the pool for any observing user, when the actor is flagged
 *   `system.settings.isPartyMember`.
 */
export const SHARED_VISION_SCOPE_CHOICES = {
  none: 'dnd35e.SETTINGS.SharedVisionScope.None',
  owned: 'dnd35e.SETTINGS.SharedVisionScope.Owned',
  partyMembers: 'dnd35e.SETTINGS.SharedVisionScope.PartyMembers',
} as const;

/**
 * Shared vision selection-interaction mode choices — controls whether the shared-vision pool
 * (per `sharedVisionScope`) applies alongside a controlled/selected token, or only when nothing
 * is selected (see `canvas/vision/sharedVisionPool.mts`):
 * - `passiveWhenUnselected` (default): selecting a token shows only that token's own vision;
 *   the shared pool only applies when nothing is selected.
 * - `alwaysShared`: the shared pool always applies, additively, even while something's selected.
 */
export const SHARED_VISION_MODE_CHOICES = {
  passiveWhenUnselected: 'dnd35e.SETTINGS.SharedVision.PassiveWhenUnselected',
  alwaysShared: 'dnd35e.SETTINGS.SharedVision.AlwaysShared',
} as const;
