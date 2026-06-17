import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import { ACTOR_SHEET_CLASS } from '@constants/cssClasses.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import { VueActorSheet } from '@vueApps/VueActorSheet.mjs';
import type { VueApplicationConfiguration } from '@vueApps/VueAppTypes.mjs';

/**
 * Base system sheet for all actor types.
 * Sits between VueActorSheet (Foundry integration) and type-specific layers.
 * Mirrors ItemSheetDnd35e in the item hierarchy.
 */
abstract class ActorSheetDnd35e extends VueActorSheet {
  static override get DEFAULT_OPTIONS (): DeepPartial<VueApplicationConfiguration<ActorDnd35e>> {
    return {
      classes: [SYSTEM_ID, ACTOR_SHEET_CLASS],
      position: {
        width: 1050,
        height: 840,
      },
    } as DeepPartial<VueApplicationConfiguration<ActorDnd35e>>;
  }

  override get title (): string {
    return this.document?.name ?? '';
  }
}

export { ActorSheetDnd35e };
