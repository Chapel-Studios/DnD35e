type MaskedEditStrategy = 'playerSecretRoute' | 'deltaMirror';

type RouteMaskedFieldEditParams = {
  strategy: MaskedEditStrategy;
  isPlayMode: boolean;
  nextValue: unknown;
  sourceValue: unknown;
  maskValue: unknown;
};

type RouteMaskedFieldEditResult = {
  normalValue?: unknown;
  playerMaskValue?: unknown;
  usedFallback: boolean;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const routeMaskedFieldEdit = ({
  strategy,
  isPlayMode: isPlayMode,
  nextValue,
  sourceValue,
  maskValue,
}: RouteMaskedFieldEditParams): RouteMaskedFieldEditResult => {
  const isVisibleMaskedView = !game.user?.isGM || isPlayMode;
  if (strategy !== 'deltaMirror') {
    return isVisibleMaskedView
      ? { playerMaskValue: nextValue, usedFallback: false }
      : { normalValue: nextValue, usedFallback: false };
  }

  const nextNumeric = toFiniteNumber(nextValue);
  const sourceNumeric = toFiniteNumber(sourceValue);
  const maskNumeric = toFiniteNumber(maskValue);
  if (nextNumeric === undefined || sourceNumeric === undefined || maskNumeric === undefined) {
    return isVisibleMaskedView
      ? { playerMaskValue: nextValue, usedFallback: true }
      : { normalValue: nextValue, usedFallback: true };
  }

  if (isVisibleMaskedView) {
    const delta = nextNumeric - maskNumeric;
    return {
      normalValue: sourceNumeric + delta,
      playerMaskValue: nextNumeric,
      usedFallback: false,
    };
  }

  const delta = nextNumeric - sourceNumeric;
  const result: RouteMaskedFieldEditResult = {
    normalValue: nextNumeric,
    usedFallback: false,
    playerMaskValue: maskNumeric + delta,
  };

  return result;
};

export { routeMaskedFieldEdit, toFiniteNumber };
export type { RouteMaskedFieldEditParams, RouteMaskedFieldEditResult };