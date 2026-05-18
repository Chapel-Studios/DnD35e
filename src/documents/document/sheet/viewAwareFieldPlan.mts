/**
 * Pure decision helper for `getViewAwareFieldValue`. Extracted so unit tests can verify
 * the read-mode + mask-check logic without instantiating a document, sheet store, or any
 * Vue reactivity. Same extraction pattern as
 * {@link ./stores/cascadeFieldOverride.mts cascadeFieldOverride} and
 * {@link @documents/identifiable/deriveIdentifiableState.mts deriveIdentifiableState}.
 *
 * @module
 */

export type ViewAwareReadMode = 'source' | 'derived';

export type ViewAwareFieldPlan = {
  /**
   * Which underlying path the consumer should read first.
   * - `'source'` → read from `_source.<fieldPath>` (raw, unmodified data)
   * - `'derived'` → read from `<fieldPath>` (post-prepare data with effects applied)
   */
  readMode: ViewAwareReadMode;
  /**
   * Whether to consult `_masks[fieldPath]` before reading. When `true` and a mask exists
   * for the path, the mask value should be returned instead of the source/derived value.
   */
  checkMasks: boolean;
};

export type ViewAwareModes = {
  isEditMode: boolean;
  isPlayMode: boolean;
  isTrueMode: boolean;
  isGM: boolean;
};

/**
 * Decide how a view-aware field read should be resolved for the given mode state.
 *
 * Rules (matching the impl that lives in `DocumentSheetStore.getViewAwareFieldValue`):
 *
 * 1. **GM in Edit or True Mode** → read from `_source` directly, never via masks. GMs
 *    authoring or auditing see truth.
 * 2. **Play Mode (any user)** → check masks first; if present, return normalized mask.
 *    Then read from derived data.
 * 3. **Non-GM in Edit Mode** → check masks first (so player edits route through Player
 *    Edit Secrets instead of revealing GM truth). Then read from derived data.
 * 4. **Caller explicit `getFromSource = true`** → always read from `_source`, regardless
 *    of other modes.
 *
 * @param modes - the four mode booleans
 * @param getFromSource - explicit caller override; forces `readMode: 'source'`
 */
export const resolveViewAwareFieldPlan = (
  modes: ViewAwareModes,
  getFromSource = false
): ViewAwareFieldPlan => {
  const { isEditMode, isPlayMode, isTrueMode, isGM } = modes;

  // Rule 1 + 4: GMs editing or viewing true mode see source. Caller can force-source too.
  const sourceForced = (isEditMode || isTrueMode) && isGM;
  const useSource = getFromSource || sourceForced;

  // Rules 2 + 3: masks apply in play mode and in non-GM edit mode.
  const checkMasks = isPlayMode || (!isGM && isEditMode);

  return {
    readMode: useSource ? 'source' : 'derived',
    checkMasks,
  };
};
