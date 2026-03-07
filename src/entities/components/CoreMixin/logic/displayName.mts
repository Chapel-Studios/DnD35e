import { BaseDnd35eSystemData } from '@ec/CoreMixin/index.mjs';
import { buildDocumentDataMap, resolveFormulaField } from '@helpers/formulae/index.mjs';

const getDisplayName = <TSystemData extends BaseDnd35eSystemData = BaseDnd35eSystemData> (documentName: string, systemData: TSystemData, conversionContext: any): string => {
  return resolveFormulaField(
    systemData.nameFormula,
    buildDocumentDataMap(conversionContext, conversionContext.actor),
    documentName
  );
};

export {
  getDisplayName,
};
