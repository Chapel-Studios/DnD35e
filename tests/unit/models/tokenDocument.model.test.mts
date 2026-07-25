import { TokenDocumentDnd35e } from '@scene/tokenDocument/TokenDocumentDnd35e.mjs';
import { describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for TokenDocumentDnd35e._preCreate() size-derived token dimensions.
 *
 * Uses Object.create to bypass the real constructor (which chains through the
 * core TokenDocument/Document machinery) and invoke _preCreate() directly with
 * a fake `actor` and a spy on `updateSource`.
 */
describe('TokenDocumentDnd35e._preCreate size derivation', () => {
  const buildToken = (size: string | null) => {
    const token = Object.create(TokenDocumentDnd35e.prototype) as TokenDocumentDnd35e;
    (token as unknown as { actor: unknown }).actor = size ? { system: { size } } : null;
    (token as unknown as { updateSource: unknown }).updateSource = vi.fn();
    return token;
  };

  it.each([
    ['fine', 0.5],
    ['diminutive', 0.5],
    ['tiny', 1],
    ['small', 1],
    ['medium', 1],
    ['large', 2],
    ['huge', 3],
    ['gargantuan', 4],
    ['colossal', 6],
  ])('%s size maps to %s grid square(s)', async (size, expectedDimension) => {
    const token = buildToken(size);
    await (token as unknown as { _preCreate: (...args: unknown[]) => Promise<void> })._preCreate({}, {}, {});

    expect(token.updateSource).toHaveBeenCalledWith({ width: expectedDimension, height: expectedDimension });
  });

  it('does not set dimensions when the token has no linked actor', async () => {
    const token = buildToken(null);
    await (token as unknown as { _preCreate: (...args: unknown[]) => Promise<void> })._preCreate({}, {}, {});

    expect(token.updateSource).not.toHaveBeenCalled();
  });
});
