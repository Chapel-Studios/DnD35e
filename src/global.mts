import { CanvasDnd35e } from './canvas/CanvasDnd35e.mjs';
import { RegionDocumentDnd35e } from './scene/region-document/RegionDocumentDnd35e.mjs';
import { SceneDnd35e } from './scene/SceneDnd35e.mjs';
import { TokenDocumentDnd35e } from './scene/token-document/index.mjs';
import { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import type { documents, Game } from '@client/_module.mjs';
import type CompendiumDirectory from '@client/applications/sidebar/tabs/compendium-directory.mjs';
import type Hotbar from '@client/applications/ui/hotbar.mjs';
import type EffectsCanvasGroup from '@client/canvas/groups/effects.mjs';
import type Config from '@client/config.mjs';

interface GameDnd35e extends Game<
  ActorDnd35e<null>,
  fd.collections.Actors<ActorDnd35e<null>>,
  documents.ChatMessage,
  documents.Combat,
  ItemDnd35e<null>,
  documents.Macro,
  SceneDnd35e,
  documents.User
> {

};

type ThisConfig = Config<
  documents.AmbientLightDocument<SceneDnd35e | null>,
  documents.ActiveEffect<ActorDnd35e | ItemDnd35e | null>,
  ActorDnd35e,
  documents.ActorDelta<TokenDocumentDnd35e | null>,
  fa.sidebar.tabs.ChatLog,
  documents.ChatMessage,
  documents.Combat,
  documents.Combatant<documents.Combat | null, TokenDocumentDnd35e | null>,
  fa.sidebar.tabs.CombatTracker<documents.Combat | null>,
  CompendiumDirectory,
  Hotbar<documents.Macro>,
  ItemDnd35e,
  documents.Macro,
  documents.MeasuredTemplateDocument<SceneDnd35e | null>,
  RegionDocumentDnd35e,
  documents.RegionBehavior<RegionDocumentDnd35e | null>,
  documents.TileDocument<SceneDnd35e | null>,
  TokenDocumentDnd35e,
  documents.WallDocument<SceneDnd35e | null>,
  SceneDnd35e,
  documents.User,
  EffectsCanvasGroup
>;

declare global {
  interface ConfigDnd35e extends ThisConfig {
    Dnd35e: {
      VERSION: string;
      item: {
        documentClasses: Record<string, new (...args: any[]) => ItemDnd35e>;
      },
    };
  }
  const CONFIG: ConfigDnd35e;
  const canvas: CanvasDnd35e;

  namespace globalThis {
    const game: GameDnd35e;
    export import fa = foundry.applications;
    // export import fav1 = foundry.appv1;
    export import fc = foundry.canvas;
    export import fd = foundry.documents;
    export import fh = foundry.helpers;
    export import fu = foundry.utils;
  }
}
