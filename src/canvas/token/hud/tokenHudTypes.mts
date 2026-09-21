/**
 * Flat, plain-data render-context shapes for `TokenHudDnd35e`'s Vue-owned HUD. Deliberately
 * excludes Foundry Document instances and any function-bearing CONFIG objects — everything
 * here is safe to wrap in Vue's `reactive()` (same rationale as combatTrackerTypes.mts).
 *
 * @module
 */
interface TokenHudStatusEffectRow {
  id: string;
  title: string;
  src: string;
  cssClass: string;
}

interface TokenHudMovementActionRow {
  id: string;
  label: string;
  icon?: string;
  img?: string;
  cssClass: string;
}

interface TokenHudLevelRow {
  id: string;
  name: string;
  cssClass: string;
}

interface TokenHudWeaponActionRow {
  itemId: string;
  actionId: string;
  label: string;
  img: string;
  enabled: boolean;
}

interface TokenHudCombatManeuverRow {
  id: string;
  label: string;
  enabled: boolean;
}

interface TokenHudContext {
  /** Satisfies core's `PlaceableHUDContext` return-type contract (`_prepareContext()`'s declared return type) — the bound TokenDocument's id, unused by our template. */
  _id: string;
  id: string;
  isGM: boolean;
  isGamePaused: boolean;
  hidden: boolean;
  locked: boolean;
  elevation: number;
  elevationDisabled: boolean;
  canConfigure: boolean;
  canToggleCombat: boolean;
  combatActive: boolean;
  targeted: boolean;
  displayBar1: boolean;
  bar1Value: string | number | null;
  bar1Editable: boolean;
  displayBar2: boolean;
  bar2Value: string | number | null;
  bar2Editable: boolean;
  statusEffectsIcon: string;
  statusEffects: TokenHudStatusEffectRow[];
  movementActionIcon: string | undefined;
  movementActionImg: string | undefined;
  movementActions: TokenHudMovementActionRow[];
  levels: TokenHudLevelRow[];
  canChangeLevel: boolean;
  weaponActions: TokenHudWeaponActionRow[];
  combatManeuvers: TokenHudCombatManeuverRow[];
}

export type {
  TokenHudCombatManeuverRow,
  TokenHudContext,
  TokenHudLevelRow,
  TokenHudMovementActionRow,
  TokenHudStatusEffectRow,
  TokenHudWeaponActionRow,
};
