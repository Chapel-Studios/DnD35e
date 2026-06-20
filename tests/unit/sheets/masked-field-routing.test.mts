import { MASKED_EDIT_STRATEGY } from '@constants/fields.mjs';
import { routeMaskedFieldEdit } from '@documents/document/sheet/maskedFieldRouting.mjs';
import { describe, expect, it } from 'vitest';

describe('routeMaskedFieldEdit', () => {
  const setIsGM = (isGM: boolean): void => {
    (game.user as { isGM: boolean }).isGM = isGM;
  };

  it('playerSecretRoute strategy for non-GM routes only to player mask', () => {
    setIsGM(false);
    const result = routeMaskedFieldEdit({
      strategy: MASKED_EDIT_STRATEGY.PLAYER_SECRET_ROUTE,
      isPlayMode: true,
      nextValue: 12,
      sourceValue: 30,
      maskValue: 18,
    });

    expect(result).toEqual({
      playerMaskValue: 12,
      usedFallback: false,
    });
  });

  it('playerSecretRoute strategy for GM routes to normal field value', () => {
    setIsGM(true);
    const result = routeMaskedFieldEdit({
      strategy: MASKED_EDIT_STRATEGY.PLAYER_SECRET_ROUTE,
      isPlayMode: false,
      nextValue: 40,
      sourceValue: 30,
      maskValue: 18,
    });

    expect(result).toEqual({
      normalValue: 40,
      usedFallback: false,
    });
  });

  it('deltaMirror strategy for non-GM preserves hidden offset while updating visible value', () => {
    setIsGM(false);
    const result = routeMaskedFieldEdit({
      strategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR,
      isPlayMode: true,
      nextValue: 12,
      sourceValue: 30,
      maskValue: 18,
    });

    // delta = 12 - 18 = -6; true/source becomes 24 while visible becomes 12.
    expect(result).toEqual({
      normalValue: 24,
      playerMaskValue: 12,
      usedFallback: false,
    });
  });

  it('deltaMirror strategy for GM edit-mode mirrors delta into visible mask value', () => {
    setIsGM(true);
    const result = routeMaskedFieldEdit({
      strategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR,
      isPlayMode: false,
      nextValue: 36,
      sourceValue: 30,
      maskValue: 18,
    });

    // delta = +6; visible mask also shifts by +6.
    expect(result).toEqual({
      normalValue: 36,
      playerMaskValue: 24,
      usedFallback: false,
    });
  });

  it('deltaMirror strategy for GM true-mode mirrors the same source-view delta into visible mask value', () => {
    setIsGM(true);
    const result = routeMaskedFieldEdit({
      strategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR,
      isPlayMode: false,
      nextValue: 36,
      sourceValue: 30,
      maskValue: 18,
    });

    expect(result).toEqual({
      normalValue: 36,
      playerMaskValue: 24,
      usedFallback: false,
    });
  });

  it('deltaMirror strategy for GM play-mode force-edit mirrors the visible masked value like a player edit', () => {
    setIsGM(true);
    const result = routeMaskedFieldEdit({
      strategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR,
      isPlayMode: true,
      nextValue: 24,
      sourceValue: 30,
      maskValue: 18,
    });

    // GM is editing the visible masked value in play mode, so the hidden offset is preserved.
    expect(result).toEqual({
      normalValue: 36,
      playerMaskValue: 24,
      usedFallback: false,
    });
  });

  it('deltaMirror strategy falls back to default routing for non-numeric inputs', () => {
    setIsGM(false);
    const result = routeMaskedFieldEdit({
      strategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR,
      isPlayMode: true,
      nextValue: 'abc',
      sourceValue: 30,
      maskValue: 18,
    });

    expect(result).toEqual({
      playerMaskValue: 'abc',
      usedFallback: true,
    });
  });
});