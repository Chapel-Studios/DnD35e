import type { fields as fieldsType } from '@common/data/_module.mjs';
const { fields } = foundry.data;

const ORDER_ALIGNMENTS = ['lawful', 'neutral', 'chaotic'] as const;
type OrderAlignments = (typeof ORDER_ALIGNMENTS)[number];
const MORAL_ALIGNMENTS = ['good', 'neutral', 'evil'] as const;
type MoralAlignments = (typeof MORAL_ALIGNMENTS)[number];
const ALIGNMENTS = [...(new Set([...ORDER_ALIGNMENTS, ...MORAL_ALIGNMENTS]))] as const;
type Alignments = (typeof ALIGNMENTS)[number];

const getFullAlignment = (order: OrderAlignments, moral: MoralAlignments): string => {
  if (order === 'neutral' && moral === 'neutral') return 'true neutral';
  return `${order} ${moral}`;
};

type Alignment = {
    alignment: Alignments;
};

type AlignmentSchema = {
    alignment: fieldsType.StringField<Alignments, Alignments, false, true, true>;
};

const defineAlignmentSchema = (): AlignmentSchema => ({
  alignment: new fields.StringField<Alignments, Alignments, false, true, true>({ choices: ALIGNMENTS, required: false }),
});

export { type Alignment, type AlignmentSchema, defineAlignmentSchema, ORDER_ALIGNMENTS, MORAL_ALIGNMENTS, ALIGNMENTS, type OrderAlignments, type MoralAlignments, type Alignments, getFullAlignment };
