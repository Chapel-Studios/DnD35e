import { resolveDocumentFieldOverride } from '@documents/document/sheet/stores/FieldOverridesStore.mjs';
import { gmOnlyEditability, gmOnlyVisibility } from '@vc/fields/formGroups/fieldPermissions.mjs';

const CONCEALMENT_FIELD = 'system.defense.concealment';

function getConcealmentPermissions(
  actor: { getFlag: (scope: string, key: string) => unknown; system?: unknown } | null | undefined,
  isOwner: boolean
) {
  if (!actor) return { visible: false, editable: false };
  if (game.user.isGM) return { visible: true, editable: true };
  if (!isOwner) return { visible: false, editable: false };
  const visible = resolveDocumentFieldOverride(actor, CONCEALMENT_FIELD, 'visibility') !== gmOnlyVisibility;
  const editable = visible && resolveDocumentFieldOverride(actor, CONCEALMENT_FIELD, 'editability') !== gmOnlyEditability;
  return { visible, editable };
}

export { CONCEALMENT_FIELD, getConcealmentPermissions };
