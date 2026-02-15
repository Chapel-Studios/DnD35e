import { replaceDataAttribute } from '@helpers/formulae/index.mjs';
import { BaseDnd35eSystemData } from '@ec/CoreMixin/index.mjs';

const getDisplayName = <TSystemData extends BaseDnd35eSystemData = BaseDnd35eSystemData> (documentName: string, systemData: TSystemData, conversionContext: any): string => {
  return systemData.isNameFromFormula
    ? replaceDataAttribute(systemData.nameFormula, conversionContext)
    : documentName;
};

export {
  getDisplayName,
};
