import type { PreferredContextAlias } from '@helpers/formulae/types.mjs';

function buildAttackerSelfAlias(): PreferredContextAlias {
  return { term: 'attacker', label: game.i18n.localize('dnd35e.Formula.Context.Attacker') };
}

export { buildAttackerSelfAlias };
