import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { ACTOR_SHEET_CLASS, VUE_APP_CLASS } from '@constants/cssClasses.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import type { VueApplicationConfiguration, VueRenderOptions } from './VueAppTypes.mjs';
import { useVueDocumentSheetMixin } from './VueDocumentSheetMixin.mjs';

const ActorSheetBase = foundry.applications.sheets.ActorSheetV2<ActorDnd35e, VueApplicationConfiguration<ActorDnd35e>, VueRenderOptions>;

abstract class VueActorSheet extends useVueDocumentSheetMixin(ActorSheetBase) {
  static override get DEFAULT_OPTIONS (): DeepPartial<DocumentSheetConfiguration<ActorDnd35e>> {
    return {
      classes: [SYSTEM_ID, VUE_APP_CLASS, ACTOR_SHEET_CLASS],
      actions: {},
      position: {
        width: 720,
        height: 680,
      },
      window: {
        resizable: true,
      },
    } as DeepPartial<VueApplicationConfiguration<ActorDnd35e>>;
  }

  protected override async _onDrop (event: DragEvent): Promise<void> {
    super._onDrop(event);
  }
}

export { VueActorSheet };
