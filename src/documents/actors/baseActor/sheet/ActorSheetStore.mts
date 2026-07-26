import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type { ConditionDefinition } from '@constants/conditions.mjs';
import { CONDITIONS } from '@constants/conditions.mjs';
import type { DocumentSheetStore, SheetTab } from '@documents/document/index.mjs';
import { useDocumentSheetStore } from '@documents/document/index.mjs';
import type { EffectDocumentActions, EffectDocumentGetters, EffectDocumentUtils } from '@documents/document/logic/index.mjs';
import { useEffectDocumentActions } from '@documents/document/logic/index.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/index.mjs';
import { FINAL_EFFECT_CHANGE_PHASE } from '@effects/baseActiveEffect/data/index.mjs';
import type { ActiveEffectDnd35e } from '@effects/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import { PHYSICAL_ITEM_TYPES } from '@items/itemTypes.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

interface UseActorSheetStoreOptions {
  defaultTabs?: SheetTab[];
  defaultActiveTab?: string;
}

/** A single row of the condition-toggle grid (Actor Effects tab). */
interface ConditionRow {
  id: string;
  label: string;
  icon: string;
  active: boolean;
}

/** A real ActiveEffect owned by an equipped/carried item, transferred onto this actor. */
interface TransferredEffectRow {
  effect: ActiveEffectDnd35e;
  sourceItemName: string;
}

/** The actor's own live, no-backing-document change (e.g. Creature's encumbrance penalty). */
interface SelfContributedEffectRow {
  label: string;
  icon: string;
  /** The concrete changes this row summarizes - shown expanded in place of a real AE sheet,
   * since there's no backing document to open one for. */
  changes: EffectChangeDataDnd35e[];
}

/**
 * Top of the actor inheritance chain. Builds the base document store internally
 * and adds actor-level named getters/behaviors.
 */
const useActorSheetStore = <TDocument extends ActorDnd35e>(
  context: VueApplicationContext<TDocument>,
  options?: UseActorSheetStoreOptions
): ActorDocumentStore<TDocument> => {
  const baseStore = useDocumentSheetStore(context, options);
  baseStore._storeUtils.setGetFreshDocument(async (uuid: string) => {
    // `game.actors.get(id)` would only ever resolve the base world Actor - an unlinked
    // token's synthetic Actor shares the base Actor's `.id` but has a distinct `.uuid`
    // (built from its TokenDocument parent), so it must be resolved via `fromUuid`.
    const doc = await foundry.utils.fromUuid(uuid);
    return (doc ?? null) as TDocument | null;
  });

  const { getViewAwareFieldValue } = baseStore.documentGetters;
  const document = baseStore._storeUtils.document;

  // Shared with `ItemSheetStore` - see `useEffectDocumentActions` doc comment.
  const { getters: effectGetters, actions: effectActions, utils: effectUtils } = useEffectDocumentActions(document);

  // Every SRD condition, always shown, so the Actor Effects tab's condition grid
  // can toggle any of them via `Actor#toggleStatusEffect()` regardless of whether
  // it's currently active.
  const conditions = computed<ConditionRow[]>(() =>
    Object.values(CONDITIONS as Record<string, ConditionDefinition>).map((condition) => ({
      id: condition.id,
      label: condition.label,
      icon: condition.icon,
      active: document.value.statuses?.has(condition.id) ?? false,
    }))
  );

  // Real ActiveEffect documents that live on an owned item but transfer their changes
  // onto this actor (`effect.transfer === true`) - these apply during `applyActiveEffects()`
  // via `allApplicableEffectsDnd35e()` but are never part of `actor.effects`, so without
  // this they'd be invisible on the character sheet entirely. Shown read-only here -
  // editing/deleting still happens from the source item's own Effects tab.
  const transferredEffects = computed<TransferredEffectRow[]>(() => {
    const isGM = game.user.isGM;
    const rows: TransferredEffectRow[] = [];
    for (const item of document.value.items) {
      for (const effect of item.effects as unknown as Iterable<ActiveEffectDnd35e>) {
        if (!effect.transfer) continue;
        if (!isGM && effect.system.isHidden) continue;
        rows.push({ effect, sourceItemName: item.name });
      }
    }
    return rows;
  });

  // Live, no-backing-document change this actor contributes to itself (see
  // `ActorDnd35e.getSelfContributedChanges()`) - currently only Creature's encumbrance
  // penalty produces one, but this reads generically off the base method so any future
  // self-contributed source surfaces here automatically. `null` when nothing applies
  // (base actors, or a Creature that isn't currently encumbered).
  const selfContributedEffect = computed<SelfContributedEffectRow | null>(() => {
    const changes = document.value.getSelfContributedChanges(FINAL_EFFECT_CHANGE_PHASE);
    const label = changes[0]?.label;
    return label ? { label, icon: 'icons/svg/downgrade.svg', changes } : null;
  });

  const documentGetters = {
    ...baseStore.documentGetters,
    ...effectGetters,
    landSpeed: computed(() => getViewAwareFieldValue<number>('system.speed.land') ?? 0),

    items: computed(() => [...baseStore._storeUtils.document.value.items]),
    physicalItems: computed(() => [...baseStore._storeUtils.document.value.items]
      .filter((item) => PHYSICAL_ITEM_TYPES.has(item.type)) as unknown[] as PHYSICAL_ITEMS[]
    ),

    conditions,
    transferredEffects,
    selfContributedEffect,
  };

  const documentActions = {
    ...baseStore.documentActions,
    ...effectActions,
    toggleCondition: async (conditionId: string): Promise<void> => {
      await document.value.toggleStatusEffect(conditionId);
    },
  };

  const storeUtils = {
    ...baseStore._storeUtils,
    ...effectUtils,
  };

  const store: ActorDocumentStore<TDocument> = {
    ...baseStore,
    documentGetters,
    documentActions,
    _storeUtils: storeUtils,
  };

  return store;
};

interface ActorGetters {
  landSpeed: ComputedRef<number>;
  items: ComputedRef<ItemDnd35e[]>;
  physicalItems: ComputedRef<PHYSICAL_ITEMS[]>;
  conditions: ComputedRef<ConditionRow[]>;
  transferredEffects: ComputedRef<TransferredEffectRow[]>;
  selfContributedEffect: ComputedRef<SelfContributedEffectRow | null>;
}

interface ActorActions {
  toggleCondition: (conditionId: string) => Promise<void>;
}

type ActorStoreUtils = Record<string, unknown>;

interface ActorStore {
  documentGetters: ActorGetters;
  documentActions: ActorActions;
  _storeUtils: ActorStoreUtils;
}

type ActorDocumentStore<TDocument extends ActorDnd35e = ActorDnd35e> =
  DocumentSheetStore<TDocument> & {
    documentGetters: DocumentSheetStore<TDocument>['documentGetters'] & ActorGetters & EffectDocumentGetters;
    documentActions: DocumentSheetStore<TDocument>['documentActions'] & ActorActions & EffectDocumentActions;
    _storeUtils: DocumentSheetStore<TDocument>['_storeUtils'] & EffectDocumentUtils;
  };

export { useActorSheetStore };
export type {
  ActorActions,
  ActorDocumentStore,
  ActorGetters,
  ActorStore,
  ActorStoreUtils,
  ConditionRow,
  SelfContributedEffectRow,
  TransferredEffectRow,
  UseActorSheetStoreOptions,
};
