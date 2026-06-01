import type { SelectOption } from '@vc/fields/formGroups/types.mjs';

// ─── Individual axis values ──────────────────────────────────────────────────
// Named constants for direct comparison: `if (law === LAWFUL) …`
const LAWFUL  = 'lawful'  as const;
const NEUTRAL = 'neutral' as const;
const CHAOTIC = 'chaotic' as const;

const GOOD = 'good' as const;
const EVIL = 'evil' as const;

// ─── Axis tuples & types ─────────────────────────────────────────────────────
const LAW_AXES = [LAWFUL, NEUTRAL, CHAOTIC] as const;
type LawAxis = (typeof LAW_AXES)[number];

const MORAL_AXES = [GOOD, NEUTRAL, EVIL] as const;
type MoralAxis = (typeof MORAL_AXES)[number];

// Compile-time check: NEUTRAL must remain valid for both axes.
const _neutralCheck: LawAxis & MoralAxis = NEUTRAL;
void _neutralCheck;

const ALIGNMENT_I18N = {
  trueNeutral: 'dnd35e.CREATURE.alignment.trueNeutral',
  law:   (axis: LawAxis)   => `dnd35e.CREATURE.alignment.law.${axis}`   as const,
  moral: (axis: MoralAxis) => `dnd35e.CREATURE.alignment.moral.${axis}` as const,
} as const;

const LAW_AXIS_SELECT_OPTIONS: SelectOption<LawAxis>[] = LAW_AXES.map(value => ({
  value,
  label: ALIGNMENT_I18N.law(value),
}));

const MORAL_AXIS_SELECT_OPTIONS: SelectOption<MoralAxis>[] = MORAL_AXES.map(value => ({
  value,
  label: ALIGNMENT_I18N.moral(value),
}));

export {
  ALIGNMENT_I18N,
  CHAOTIC,
  EVIL,
  GOOD,
  LAW_AXES,
  LAW_AXIS_SELECT_OPTIONS,
  LAWFUL,
  MORAL_AXES,
  MORAL_AXIS_SELECT_OPTIONS,
  NEUTRAL,
};

export type {
  LawAxis,
  MoralAxis,
};
