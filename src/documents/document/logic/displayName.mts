import type { DocumentSystemData } from '@documents/document/index.mjs';
import type { FormulaDataSource } from '@helpers/formulae/FormulaData.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import { buildDocumentDataMap } from '@helpers/formulae/utils.mjs';

type FormulaLikeSource = Partial<FormulaDataSource> & {
  formula?: unknown;
  resolvedValue?: unknown;
  expectedType?: unknown;
};

type NameFormulaCarrier = {
  nameFormula?: FormulaDataSource | null;
};

const getEffectiveNameFormulaSource = <TSystemData extends NameFormulaCarrier = NameFormulaCarrier> (
  documentName: string,
  systemData: TSystemData,
  conversionContext: any
): FormulaDataSource | null => {
  const masks = (conversionContext as { _masks?: Record<string, unknown>; isIdentified?: boolean } | null)?._masks;
  const isIdentified = (conversionContext as { isIdentified?: boolean } | null)?.isIdentified;

  if (!masks || isIdentified !== false) {
    return systemData.nameFormula ?? null;
  }

  const directMask = masks['system.nameFormula'] as FormulaLikeSource | undefined;
  if (directMask && typeof directMask === 'object') {
    const directFormula = typeof directMask.formula === 'string' ? directMask.formula : null;
    const directResolved = typeof directMask.resolvedValue === 'string' ? directMask.resolvedValue : null;
    if (directFormula || directResolved) {
      return FormulaData.toSource(directFormula ?? directResolved ?? documentName, {
        resolvedValue: directResolved,
        expectedType: 'string',
      });
    }
  }

  const formulaMask = typeof masks['system.nameFormula.formula'] === 'string'
    ? masks['system.nameFormula.formula']
    : null;
  const resolvedMask = typeof masks['system.nameFormula.resolvedValue'] === 'string'
    ? masks['system.nameFormula.resolvedValue']
    : null;
  const nameMask = typeof masks.name === 'string'
    ? masks.name
    : null;

  const effectiveFormula = formulaMask ?? resolvedMask ?? nameMask;
  if (effectiveFormula) {
    return FormulaData.toSource(effectiveFormula, {
      resolvedValue: resolvedMask,
      expectedType: 'string',
    });
  }

  return systemData.nameFormula ?? null;
};

const getDisplayName = <TSystemData extends DocumentSystemData = DocumentSystemData> (documentName: string, systemData: TSystemData, conversionContext: any): string => {
  const identifiedFormula = getEffectiveNameFormulaSource(documentName, systemData, conversionContext);
  if (!identifiedFormula?.formula) return documentName;

  // Build explicit context map from the nameFormula field's context declarations
  const additionalContexts: Record<string, any> = {};
  const nameFormulaField = conversionContext.system?.schema?.fields?.nameFormula;
  const declarations = nameFormulaField?.formulaContexts ?? [];
  if (declarations.length) {
    for (const decl of declarations) {
      if (!decl.resolvePath) continue; // Runtime-provided context, skip auto-resolution
      let current: any = conversionContext;
      for (const segment of decl.resolvePath.split('.')) {
        if (!current) break;
        current = current[segment];
      }
      if (current?.documentName) {
        additionalContexts[decl.contextName] = current;
      }
    }
  }

  const excluded = nameFormulaField?.excludedFields ?? [];

  return FormulaData.resolveSource(identifiedFormula, buildDocumentDataMap(conversionContext, additionalContexts), documentName, excluded);
};

export {
  getDisplayName,
  getEffectiveNameFormulaSource,
};
