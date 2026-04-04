import { IdentifiableDocumentSystemData } from '@ec/Identifiable/index.mjs';
import { ActiveEffectSystemData } from '@effects/BaseActiveEffect/index.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import { ItemSystemData } from '@items/baseItem/index.mjs';

type PossibleNameFormulaDocument = ActiveEffect<Actor<TokenDocument<Scene | null>
 | null> | Item<Actor<TokenDocument<Scene | null> | null> | null> | null>;

/**
 * Hook-friendly version: ensures a document's nameFormula is populated on creation.
 * Uses updateSource to properly set the pending creation data.
 * Intended for use in preCreate hooks.
 */
const ensureNameFormulaOnCreate = (document: PossibleNameFormulaDocument): void => {
  // When foundry creates a new document, it only provides the name field and leaves system empty.
  // This means that if we want to support name formulas on newly created documents,
  // we need to populate the nameFormula field based on the provided name.
  const updateData: Record<string, Record<string, unknown>> = {
    system: {},
  };
  let hasUpdate = false;
  const system = document.system as ItemSystemData | ActiveEffectSystemData | undefined;
  if (!system?.nameFormula?.value?.formula && document.name) {
    const iSystem = system as unknown as IdentifiableDocumentSystemData | undefined;
    updateData.system.nameFormula = {
      value: FormulaData.toSource(document.name, {
        resolvedValue: document.name,
      }),
      unidentifiedValue: iSystem?.isIdentifiable
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
  PossibleNameFormulaDocument,
};
