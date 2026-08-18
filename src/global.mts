import { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type { documents, Game } from '@client/_module.mjs';
import type CompendiumDirectory from '@client/applications/sidebar/tabs/compendium-directory.mjs';
import type Hotbar from '@client/applications/ui/hotbar.mjs';
import type EffectsCanvasGroup from '@client/canvas/groups/effects.mjs';
import type Config from '@client/config.mjs';
import { ActiveEffectDnd35e } from '@documents/activeEffects/index.mjs';
import type { DocumentSheetStore } from '@documents/document/index.mjs';
import type { ActiveEffectConfigStore } from '@effects/baseActiveEffect/index.mjs';
import type { ItemSheetStore } from '@items/baseItem/index.mjs';
import { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/itemTypes.mjs';

import type { CanvasDnd35e } from './canvas/CanvasDnd35e.mjs';
import { CombatantDnd35e } from './documents/combat/combatant/CombatantDnd35e.mjs';
import { CombatDnd35e } from './documents/combat/CombatDnd35e.mjs';
import { RegionDocumentDnd35e } from './documents/scene/regionDocument/RegionDocumentDnd35e.mjs';
import { SceneDnd35e } from './documents/scene/SceneDnd35e.mjs';
import type { TokenDocumentDnd35e } from './documents/scene/tokenDocument/index.mjs';

type GameDnd35e = Game<
  ActorDnd35e<null>,
  fd.collections.Actors<ActorDnd35e<null>>,
  documents.ChatMessage,
  CombatDnd35e,
  ItemDnd35e<ItemType, null>,
  documents.Macro,
  SceneDnd35e,
  documents.User
> & {
  dnd35e: {
    stores: {
      Actor: Record<string, DocumentSheetStore<any>>;
      Item: Record<string, ItemSheetStore<any>>;
      ActiveEffect: Record<string, ActiveEffectConfigStore>;
    };
  }
};

type ThisConfig = Config<
  documents.AmbientLightDocument<SceneDnd35e | null>,
  // dnd35e type-fix: use the concrete `ActiveEffectDnd35e` class directly rather than
  // `documents.ActiveEffect<ActorDnd35e | ItemDnd35e | null>` — ActiveEffectDnd35e's own
  // "parent" is fixed to a core `Actor | Item` union (see ActiveEffectDnd35e.mts), so
  // parameterizing the ambient core type with dnd35e's ActorDnd35e/ItemDnd35e here would
  // not match what ActiveEffectDnd35e actually reports.
  ActiveEffectDnd35e,
  ActorDnd35e,
  documents.ActorDelta<TokenDocumentDnd35e | null>,
  fa.sidebar.tabs.ChatLog,
  documents.ChatMessage,
  CombatDnd35e,
  CombatantDnd35e,
  fa.sidebar.tabs.CombatTracker<CombatDnd35e | null>,
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
    dnd35e: {
      VERSION: string;
      item: {
        enums: {
          sizes: Record<string, { label: string }>;
          weaponTypes: Record<string, { label: string }>;
        };
        documentClasses: Record<string, new (...args: any[]) => ItemDnd35e>;
      },
      activeEffect: {
        documentClasses: Record<string, new (...args: any[]) => ActiveEffectDnd35e>;
      },
      gameRules: {
        damageReductionTypes: Record<string, { label: string }>;
        availableLanguageOptions: Record<string, { label: string }>;
      },
      actor: {
        documentClasses: Record<string, new (...args: any[]) => ActorDnd35e>;
      }
    };
  }
  const CONFIG: ConfigDnd35e;
  const canvas: CanvasDnd35e;

  namespace globalThis {
    const game: GameDnd35e;
    export import fa = foundry.applications;
    export import fc = foundry.canvas;
    export import fd = foundry.documents;
    export import fh = foundry.helpers;
    export import fu = foundry.utils;
  }
}

/** Augment Foundry's change type registry with system-registered change types. */
declare module '@common/constants.mjs' {
  interface SystemActiveEffectChangeTypes {
    MASK: 'mask';
  }
}
