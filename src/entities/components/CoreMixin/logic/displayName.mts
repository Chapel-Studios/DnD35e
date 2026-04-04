import { BaseDnd35eSystemData } from '@ec/CoreMixin/index.mjs';
import { buildDocumentDataMap } from '@helpers/formulae/index.mjs';

const getDisplayName = <TSystemData extends BaseDnd35eSystemData = BaseDnd35eSystemData> (documentName: string, systemData: TSystemData, conversionContext: any): string => {
  const nameFormula = systemData.nameFormula;
  if (!nameFormula?.formula) return documentName;

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

  return nameFormula.resolve(
    buildDocumentDataMap(conversionContext, additionalContexts),
    documentName,
    excluded
  );
};

export {
  getDisplayName,
};
