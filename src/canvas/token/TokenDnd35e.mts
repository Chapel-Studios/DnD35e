import type TokenLayer from '@client/canvas/layers/tokens.mjs';
import type { TokenDocumentDnd35e } from '@scene/tokenDocument/TokenDocumentDnd35e.mjs';

class TokenDnd35e<TDocument extends TokenDocumentDnd35e = TokenDocumentDnd35e>
  extends foundry.canvas.placeables.Token<TDocument>
{
  declare readonly layer: TokenLayer<this>;
}

export { TokenDnd35e };
