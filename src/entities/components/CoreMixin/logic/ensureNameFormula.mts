import type { ActiveEffectSystemData } from '@effects/BaseActiveEffect/index.mjs';
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
  const system = document.system as ItemSystemData | ActiveEffectSystemData | undefined;
  if (!system?.nameFormula?.value?.formula && document.name) {
    const iDoc = document as unknown as { isIdentifiable?: boolean };
    updateData.system.nameFormula = {
      value: FormulaData.toSource(document.name, {
        resolvedValue: document.name,
      }),
      unidentifiedValue: iDoc.isIdentifiable
        ? FormulaData.toSource(document.name, {
          resolvedValue: document.name,
        })
        : null,
    };
    // updateData.system.derivedName = document.name;
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
