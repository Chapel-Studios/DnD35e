/**
 * Registration for the Combat/Combatant document classes.
 *
 * @module
 */
import { SYSTEM_ID } from '@settings/shared.mjs';

import { CombatantConfigDnd35e } from './combatant/CombatantConfigDnd35e.mjs';
import { CombatantDnd35e } from './combatant/CombatantDnd35e.mjs';
import { CombatDnd35e } from './CombatDnd35e.mjs';
import { CombatTrackerDnd35e } from './CombatTrackerDnd35e.mjs';

export const registerCombat = () => {
  foundry.helpers.Hooks.once('init', () => {
    CONFIG.Combat.documentClass = CombatDnd35e;
    CONFIG.Combatant.documentClass = CombatantDnd35e;
    CONFIG.ui.combat = CombatTrackerDnd35e;

    // Combatant has no subtypes, so no `types` option is needed (see `DocumentSheetConfig.registerSheet`).
    foundry.applications.apps.DocumentSheetConfig.registerSheet(foundry.documents.Combatant, SYSTEM_ID, CombatantConfigDnd35e, {
      makeDefault: true,
    });
  });
};
