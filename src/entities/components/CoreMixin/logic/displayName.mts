import { BaseDnd35eSystemData } from '@ec/CoreMixin/index.mjs';
import { buildDocumentDataMap } from '@helpers/formulae/index.mjs';

const getDisplayName = <TSystemData extends BaseDnd35eSystemData = BaseDnd35eSystemData> (documentName: string, systemData: TSystemData, conversionContext: any): string => {
  const nameFormula = systemData.nameFormula;
  if (!nameFormula?.formula) return documentName;
  return nameFormula.resolve(
    buildDocumentDataMap(conversionContext, conversionContext.actor),
    documentName
  );
};

export {
  getDisplayName,
};
