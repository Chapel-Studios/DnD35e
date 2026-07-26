export type {
  ResolvedEffectChange,
  StackableChangeTarget,
} from './applyStackedChanges.mjs';
export {
  applyStackedActiveEffectChanges,
} from './applyStackedChanges.mjs';
export {
  getEffectContexts,
  resolveActiveEffectChange,
  resolveActiveEffectChangeValue,
  resolveMaskedActiveEffectChangeValue,
} from './resolveChangeValue.mjs';
export type {
  EffectCategory,
} from './resolveEffectCategory.mjs';
export {
  CONDITION_CATEGORY_ID,
  CONDITION_CATEGORY_LABEL,
  resolveEffectCategory,
} from './resolveEffectCategory.mjs';
