import { nameToFormulaData } from '@helpers/formulae/index.mjs';

/**
 * Hook-friendly version: ensures a document's nameFormula is populated on creation.
 * Uses updateSource to properly set the pending creation data.
 * Intended for use in preCreate hooks.
 */
const ensureNameFormulaOnCreate = (document: {
  name: string;
  system: Record<string, any>;
  updateSource: (data: Record<string, unknown>) => void;
}): void => {
  // When foundry creates a new document, it only provides the name field and leaves system empty.
  // This means that if we want to support name formulas on newly created documents,
  // we need to populate the nameFormula field based on the provided name.
  const updateData: Record<string, Record<string, unknown>> = {
    system: {},
  };
  let hasUpdate = false;
  if (!document.system?.nameFormula && document.name) {
    updateData.system.nameFormula = nameToFormulaData(document.name);
    updateData.system.derivedName = document.name;
    hasUpdate = true;
  }
  // While I normally prefer to keep unidentified document logic contained within the unidentified item mixin,
  // as this is called by the global preCreate hook, we're better off to register it in 1 place and handle both here.
  if (document.system?.unidentifiedNameFormula !== undefined) {
    updateData.system.unidentifiedNameFormula = nameToFormulaData(document.name);
    updateData.system.unidentifiedDerivedName = document.name;
    hasUpdate = true;
  }
  
  if (hasUpdate) {
    document.updateSource(updateData);
  }
};

export {
  ensureNameFormulaOnCreate,
};
