/**
 * Combat settings constants
 */

/**
 * Combat setting keys
 */
export const COMBAT_KEYS = {
  AUTOSIZE_WEAPONS: 'autosizeWeapons',
  AUTO_SCALE_ATTACKS_BAB: 'autoScaleAttacksBab',
  PARTY_MEMBER_DEATH_THRESHOLD: 'partyMemberDeathThreshold',
  STANDARD_ACTOR_DEATH_THRESHOLD: 'standardActorDeathThreshold',
  ALLOW_NO_AMMO: 'allowNoAmmo',
  USE_AUTO_AMMO_RECOVERY: 'useAutoAmmoRecovery',
  NO_AUTO_SPELLPOINTS_COST: 'noAutoSpellpointsCost',
  SPELLPOINT_COST_FORMULA: 'spellpointCostCustomFormula',
  SHOW_FULL_ATTACK_CHAT_CARD: 'showFullAttackChatCard',
  REPEAT_ANIMATIONS: 'repeatAnimations',
  AUTOMATE_FLANKING_THREAT: 'automate-flanking-threat',
  THREATENED_SHOW_SQUARES: 'threatened-show-squares',
  RANDOMIZE_HP: 'randomizeHp',
  ENFORCE_SINGLE_MATERIAL: 'enforceSingleMaterial',
} as const;

/**
 * Combat settings menu key
 */
export const COMBAT_MENU = 'combatConfig';
