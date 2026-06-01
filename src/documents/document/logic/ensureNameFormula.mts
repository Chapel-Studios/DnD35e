import type { ActorSystemData } from '@actors/baseActor/index.mjs';
import type { ActiveEffectSystemData } from '@effects/baseActiveEffect/index.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import type { ItemSystemData } from '@items/baseItem/index.mjs';

type NameFormulaDocument = {
  name: string | null;
  system?: unknown;
  updateSource: (data: object) => void;
};

/**
 * Hook-friendly version: ensures a document's nameFormula is populated on creation.
 * Uses updateSource to properly set the pending creation data.
 * Intended for use in preCreate hooks.
 */
const ensureNameFormulaOnCreate = (document: NameFormulaDocument): void => {
  // When foundry creates a new document, it only provides the name field and leaves system empty.
  // This means that if we want to support name formulas on newly created documents,
  // we need to populate the nameFormula field based on the provided name.
  const updateData: Record<string, Record<string, unknown>> = {
    system: {},
  };
  let hasUpdate = false;
  const system = document.system as ActorSystemData | ActiveEffectSystemData | ItemSystemData | undefined;
  if (!system?.nameFormula?.formula && document.name) {
    updateData.system.nameFormula = FormulaData.toSource(document.name, {
      resolvedValue: document.name,
    });
    hasUpdate = true;
  }
  
  if (hasUpdate) {
    document.updateSource(updateData);
  }
};

export {
  ensureNameFormulaOnCreate,
};

export type {
  NameFormulaDocument,
};
