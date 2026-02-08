import Actor from '@client/documents/actor.mjs';
import { TokenDocumentDnd35e } from '@scene/token-document/TokenDocumentDnd35e.mjs';

type ActorDnd35e<TParent extends TokenDocumentDnd35e | null = TokenDocumentDnd35e | null> = Actor<TParent>;

export type { ActorDnd35e };
