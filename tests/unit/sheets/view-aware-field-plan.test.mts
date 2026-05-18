import { resolveViewAwareFieldPlan, type ViewAwareModes } from '@documents/document/sheet/viewAwareFieldPlan.mjs';
import { describe, expect, it } from 'vitest';

const modes = (overrides: Partial<ViewAwareModes> = {}): ViewAwareModes => ({
  isEditMode: false,
  isPlayMode: false,
  isTrueMode: false,
  isGM: false,
  ...overrides,
});

describe('resolveViewAwareFieldPlan', () => {
  describe('GM mode handling', () => {
    it('GM in edit mode reads from source, no mask check', () => {
      const plan = resolveViewAwareFieldPlan(modes({ isGM: true, isEditMode: true }));
      expect(plan.readMode).toBe('source');
      expect(plan.checkMasks).toBe(false);
    });

    it('GM in true mode reads from source, no mask check', () => {
      const plan = resolveViewAwareFieldPlan(modes({ isGM: true, isTrueMode: true }));
      expect(plan.readMode).toBe('source');
      expect(plan.checkMasks).toBe(false);
    });

    it('GM in play mode reads from derived, checks masks', () => {
      const plan = resolveViewAwareFieldPlan(modes({ isGM: true, isPlayMode: true }));
      expect(plan.readMode).toBe('derived');
      expect(plan.checkMasks).toBe(true);
    });
  });

  describe('non-GM mode handling', () => {
    it('player in edit mode reads from derived, checks masks (Player Edit Secrets)', () => {
      const plan = resolveViewAwareFieldPlan(modes({ isGM: false, isEditMode: true }));
      expect(plan.readMode).toBe('derived');
      expect(plan.checkMasks).toBe(true);
    });

    it('player in play mode reads from derived, checks masks', () => {
      const plan = resolveViewAwareFieldPlan(modes({ isGM: false, isPlayMode: true }));
      expect(plan.readMode).toBe('derived');
      expect(plan.checkMasks).toBe(true);
    });

    it('non-GM never reaches true mode (sanity: no mode set)', () => {
      const plan = resolveViewAwareFieldPlan(modes({ isGM: false }));
      expect(plan.readMode).toBe('derived');
      expect(plan.checkMasks).toBe(false);
    });
  });

  describe('getFromSource override', () => {
    it('forces source reads for GM in play mode', () => {
      const plan = resolveViewAwareFieldPlan(modes({ isGM: true, isPlayMode: true }), true);
      expect(plan.readMode).toBe('source');
      // Mask check is independent of the source-force flag
      expect(plan.checkMasks).toBe(true);
    });

    it('forces source reads for player in edit mode', () => {
      const plan = resolveViewAwareFieldPlan(modes({ isGM: false, isEditMode: true }), true);
      expect(plan.readMode).toBe('source');
      expect(plan.checkMasks).toBe(true);
    });

    it('explicit false does not force source when GM is editing (still derived from rules)', () => {
      // GM in edit mode → source from rule 1, regardless of explicit flag
      const plan = resolveViewAwareFieldPlan(modes({ isGM: true, isEditMode: true }), false);
      expect(plan.readMode).toBe('source');
    });
  });

  describe('mask-check independence', () => {
    it('mask check depends on play-mode or non-GM-edit-mode, not on read source', () => {
      // Player in edit + getFromSource=true → source read but masks still consulted
      const plan = resolveViewAwareFieldPlan(modes({ isGM: false, isEditMode: true }), true);
      expect(plan.readMode).toBe('source');
      expect(plan.checkMasks).toBe(true);
    });

    it('GM in true mode does not check masks even though it is not edit mode', () => {
      const plan = resolveViewAwareFieldPlan(modes({ isGM: true, isTrueMode: true }));
      expect(plan.checkMasks).toBe(false);
    });
  });
});
