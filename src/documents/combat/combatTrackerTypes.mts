/**
 * Flat, plain-data render-context shapes for `CombatTrackerDnd35e`'s Vue-owned tracker.
 * Deliberately excludes Foundry Document instances — everything here is safe to wrap in
 * Vue's `reactive()` (Documents use private class fields that break when proxied).
 *
 * @module
 */
import type { CombatantActionEconomy } from './combatant/combatantActionEconomy.mjs';

interface CombatTrackerCombatSummary {
  id: string;
  name: string;
  label: number;
  active: boolean;
}

interface CombatTrackerEffect {
  img: string;
  name: string;
}

interface CombatTrackerTurn {
  id: string;
  name: string;
  img: string;
  css: string;
  hidden: boolean;
  isDefeated: boolean;
  isOwner: boolean;
  canPing: boolean;
  initiative: number | string | null;
  resource: string | number | null;
  effects: { icons: CombatTrackerEffect[]; tooltip: string };
  actionEconomy: CombatantActionEconomy | null;
}

interface CombatTrackerContext {
  isGM: boolean;
  hasCombat: boolean;
  combatName: string | null;
  combatRound: number;
  combatTurnsLength: number;
  combats: CombatTrackerCombatSummary[];
  control: boolean;
  css: string;
  currentIndex: number;
  displayCycle: boolean;
  initiativeIcon: { icon: string; hover: string };
  nextId: string | undefined;
  previousId: string | undefined;
  turns: CombatTrackerTurn[];
  hasDecimals: boolean;
}

export type { CombatTrackerCombatSummary, CombatTrackerContext, CombatTrackerEffect, CombatTrackerTurn };
