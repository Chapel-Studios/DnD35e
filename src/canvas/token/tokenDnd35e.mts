import type TokenLayer from '@client/canvas/layers/tokens.mjs';
import { TokenDocumentDnd35e } from '@scene/token-document/TokenDocumentDnd35e.mjs';

class tokenDnd35e<TDocument extends TokenDocumentDnd35e = TokenDocumentDnd35e> extends fc.placeables.Token<TDocument> {
  declare readonly layer: TokenLayer<this>;
}

export { tokenDnd35e };
