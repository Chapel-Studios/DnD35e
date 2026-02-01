import Actor from "@client/documents/actor.mjs";
import { TokenDocumentDnd35e } from "@scene/token-document/TokenDocumentDnd35e.mjs";

interface ActorDnd35e<TParent extends TokenDocumentDnd35e | null = TokenDocumentDnd35e | null> extends Actor<TParent> {

}

export { ActorDnd35e };
