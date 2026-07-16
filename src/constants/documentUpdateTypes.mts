const HP_ADJUSTMENT_UPDATE = 'hpAdjustment';
const EQUIP_STATUS_UPDATE = 'equipStatusUpdate';
const UNKNOWN_UPDATE = 'unknownUpdate';

const DocumentUpdateTypes = [
  HP_ADJUSTMENT_UPDATE,
  EQUIP_STATUS_UPDATE,
  UNKNOWN_UPDATE,
];

type DocumentUpdateType = (typeof DocumentUpdateTypes)[number];

const DOCUMENT_UPDATE_TYPES = {
  HP_ADJUSTMENT_UPDATE,
  EQUIP_STATUS_UPDATE,
  UNKNOWN_UPDATE,
} as const;

export type {
  DocumentUpdateType,
};

export {
  DOCUMENT_UPDATE_TYPES,
  DocumentUpdateTypes,
  EQUIP_STATUS_UPDATE,
  HP_ADJUSTMENT_UPDATE,
};
