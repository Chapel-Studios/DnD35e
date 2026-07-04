const HP_ADJUSTMENT_UPDATE = 'hpAdjustment';
const UNKNOWN_UPDATE = 'unknownUpdate';

const DocumentUpdateTypes = [
  HP_ADJUSTMENT_UPDATE,
  UNKNOWN_UPDATE,
];

type DocumentUpdateType = (typeof DocumentUpdateTypes)[number];

const DOCUMENT_UPDATE_TYPES = {
  HP_ADJUSTMENT_UPDATE,
  UNKNOWN_UPDATE,
} as const;

export type {
  DocumentUpdateType,
};

export {
  DOCUMENT_UPDATE_TYPES,
  DocumentUpdateTypes,
  HP_ADJUSTMENT_UPDATE,
};
