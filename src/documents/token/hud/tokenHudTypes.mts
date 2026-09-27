import type { BottomHudBarProps } from './components/BottomHudBar.vue';
import type { LeftHudBarProps } from './components/LeftHudBar.vue';
import type { RightHudBarProps } from './components/RightHudBar.vue';

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

interface MiddleHudBarProps {
  useDefaultHpBar: boolean;
  displayBar1: boolean;
  bar1Value: string | number | null;
  bar1Editable: boolean;
  displayBar2: boolean;
  bar2Value: string | number | null;
  bar2Editable: boolean;
}

interface TokenHudContext {
  id: string;
  _id: string;
  leftHudContext: LeftHudBarProps;
  rightHudContext: RightHudBarProps;
  bottomHudContext: BottomHudBarProps;
  middleHudContext: MiddleHudBarProps;
}

export type {
  MiddleHudBarProps,
  TokenHudCombatManeuverRow,
  TokenHudContext,
  TokenHudLevelRow,
  TokenHudMovementActionRow,
  TokenHudStatusEffectRow,
  TokenHudWeaponActionRow,
};
