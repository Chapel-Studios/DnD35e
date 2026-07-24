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
