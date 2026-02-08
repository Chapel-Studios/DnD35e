import TokenDocument from '@client/documents/token.mjs';
import { SceneDnd35e } from '../SceneDnd35e.mjs';

type TokenDocumentDnd35e<TParent extends SceneDnd35e | null = SceneDnd35e | null> = TokenDocument<TParent>;

export type { TokenDocumentDnd35e };
