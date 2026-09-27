import type { RenderModeStore } from '@documents/document/sheet/stores/RenderModeStore.mjs';
import type { ActionEditorStore, ActionEditorStoreCreatorParams } from '@items/baseItem/actions/ActionEditorStore.mjs';
import { useActionEditorStoreCreator } from '@items/baseItem/actions/ActionEditorStore.mjs';
import type { ActionChainLinkModel } from '@items/baseItem/actions/ActionSourceData.mjs';
import type { ActionType } from '@items/baseItem/actions/constants.mjs';
import { ACTION_TYPE } from '@items/baseItem/actions/constants.mjs';
import type { WeaponAction } from '@items/baseItem/actions/types.mjs';
import type { ItemDocumentActions, ItemDocumentGetters, ItemSheetStoreUtils } from '@items/baseItem/index.mjs';
import type { EquippableDocumentStore } from '@items/physical/equippableItem/index.mjs';
import { useEquippableItemStore } from '@items/physical/equippableItem/index.mjs';
import type {
  EquippableItemActions, EquippableItemGetters, EquippableItemStoreUtils } from '@items/physical/equippableItem/sheet/EquippableItemStore.mjs';
import { physicalItemEffectsTab } from '@items/physical/physicalItem/sheet/tabs/index.mjs';
import { WEAPON_SUBTYPE_LOCALIZED, WEAPON_TYPE_LOCALIZED } from '@items/physical/weapon/data/constants.mjs';
import type { Weapon } from '@items/physical/weapon/index.mjs';
import type { SelectOption } from '@vc/fields/formGroups/types.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';

import { weaponActionsTab, weaponDetailsTab } from './tabs/index.mjs';

interface UseWeaponStoreOptions {
  /** Set false for row-scoped stores so they don't clobber a standalone sheet's registry entry (or vice versa). */
  registerGlobally?: boolean;
  /** See `useDocumentSheetStore`'s option of the same name. */
  renderModeStore?: RenderModeStore;
}

const actionTypeOptions: SelectOption<ActionType>[] = [
  { value: ACTION_TYPE.MELEE, label: 'dnd35e.WEAPON.ACTIONS.Type.melee_weapon_attack' },
  { value: ACTION_TYPE.RANGED, label: 'dnd35e.WEAPON.ACTIONS.Type.ranged_weapon_attack' },
];

const useWeaponStore = (context: VueApplicationContext<Weapon>, options: UseWeaponStoreOptions = {}): WeaponStore => {
  const equippableStore = useEquippableItemStore<Weapon>(context, {
    defaultTabs: [weaponDetailsTab, weaponActionsTab, physicalItemEffectsTab],
    defaultActiveTab: 'details',
    renderModeStore: options.renderModeStore,
  });
  const document = equippableStore._storeUtils.document;
  
  const documentGetters = {
    ...equippableStore.documentGetters,
    weaponType: computed(() => game.i18n.localize(WEAPON_TYPE_LOCALIZED[document.value.system.weaponType])),
    weaponSubtype: computed(() => game.i18n.localize(WEAPON_SUBTYPE_LOCALIZED[document.value.system.weaponSubtype])),
    topLevelActions: computed(() => document.value.system.actions.filter((action) => action.isTopLevel)),
    getAction: (actionId: string) => document.value.system.actions.find((action) => action._id === actionId),
  };

  // Any edit made through the Actions tab detaches the edited entry from the auto-sync
  // merge (§10.4's "editing it is exactly how it becomes permanent") — weaponActionSync.mts
  // only ever seeds/prunes entries still `isSystemCreated === true`.
  // const updateActionField = async (actionId: string, field: string, value: unknown): Promise<boolean> => {
  //   const actions = document.value.system.actions;
  //   if (!actions.some((action) => action._id === actionId)) return false;
  //   const updatedActions = actions.map((action) =>
  //     action._id === actionId ? { ...action, [field]: value, isSystemCreated: false } : action
  //   );
  //   return await equippableStore._storeUtils.updateDocument({ system: { actions: updatedActions } }, { diff: false });
  // };

  // const updateChainLinkField = async (parentActionId: string, chainIndex: number, field: string, value: unknown): Promise<boolean> => {
  //   const actions = document.value.system.actions;
  //   const parentIndex = actions.findIndex((action) => action._id === parentActionId);
  //   if (parentIndex === -1 || !actions[parentIndex].chain[chainIndex]) return false;

  //   const updatedParent = {
  //     ...actions[parentIndex],
  //     isSystemCreated: false,
  //     chain: actions[parentIndex].chain.map((link: ActionChainLinkModel, index: number) =>
  //       index === chainIndex ? { ...link, [field]: value } : link
  //     ),
  //   };
  //   const updatedActions = actions.map((action, index) => (index === parentIndex ? updatedParent : action));
  //   return await equippableStore._storeUtils.updateDocument({ system: { actions: updatedActions } }, { diff: false });
  // };

  // "Add to chain" only ever creates a brand-new, dedicated sub-action (never links to an
  // already-existing one) — keeps this authoring step free of cycle-detection concerns.
  const addChainLink = async (parentActionId: string, subActionType: WeaponAction['type']): Promise<boolean> => {
    const actions = document.value.system.actions;
    const parentIndex = actions.findIndex((action) => action._id === parentActionId);
    if (parentIndex === -1) return false;

    const newSubActionId = foundry.utils.randomID();
    const newSubAction = {
      _id: newSubActionId,
      type: subActionType,
      // name: game.i18n.localize('dnd35e.WEAPON.ACTIONS.NewSubActionName'),
      isSystemCreated: false,
      isTopLevel: false,
    };
    const updatedParent = {
      ...actions[parentIndex],
      isSystemCreated: false,
      chain: [
        ...actions[parentIndex].chain,
        { trigger: 'onSuccess', actionId: newSubActionId },
      ],
    };
    const updatedActions = actions.map((action, index) => (index === parentIndex ? updatedParent : action));
    updatedActions.push(newSubAction as unknown as WeaponAction);
    return await equippableStore._storeUtils.updateDocument({ system: { actions: updatedActions } }, { diff: false });
  };

  // Removing a chain link also cascade-deletes the sub-action it points to (and any of
  // ITS OWN chained sub-actions) — "add to chain" never links to a shared/pre-existing
  // action, so nothing else can be referencing it.
  const removeChainLink = async (parentActionId: string, linkActionId: string): Promise<boolean> => {
    const actions = document.value.system.actions;
    const parentIndex = actions.findIndex((action) => action._id === parentActionId);
    if (parentIndex === -1) return false;
    const link = actions[parentIndex].chain
      .find((link: ActionChainLinkModel) => link.actionId === linkActionId);
    if (!link) return false;

    const idsToRemove = new Set<string>();
    const collectDescendants = (actionId: string): void => {
      if (idsToRemove.has(actionId)) return;
      idsToRemove.add(actionId);
      const action: WeaponAction | undefined = actions.find((a) => a._id === actionId);
      for (const childLink of action?.chain ?? []) {
        collectDescendants(childLink.actionId);
      }
    };
    collectDescendants(link.actionId);

    const updatedParent = {
      ...actions[parentIndex],
      isSystemCreated: false,
      chain: actions[parentIndex].chain.filter((link: ActionChainLinkModel) => link.actionId !== linkActionId),
    };
    const updatedActions = actions
      .map((action, index) => (index === parentIndex ? updatedParent : action))
      .filter((action) => !idsToRemove.has(action._id));
    return await equippableStore._storeUtils.updateDocument({ system: { actions: updatedActions } }, { diff: false });
  };

  const updateAction = async (updatedAction: WeaponAction, remove?: boolean) => {
    const updatedActions = document.value.system.actions
      .filter((a) => !remove || a._id !== updatedAction._id)
      .map((a) => (a._id === updatedAction._id ? updatedAction : a));
    return await equippableStore._storeUtils
      .updateDocument({ system: { actions: updatedActions } }, { diff: false });
  };

  const updateLink = async (actionId: string, link: ActionChainLinkModel, remove?: boolean) => {
    const topLevelAction: WeaponAction | undefined = document.value.system.actions.find((action) => action._id === actionId);
    if (!topLevelAction) return false;
    if (remove) {
      return await removeChainLink(actionId, link.actionId);
    }
    return await updateAction({
      ...topLevelAction,
      chain: [
        ...topLevelAction.chain.filter(l => l.actionId !== link.actionId),
        link,
      ],
    } as WeaponAction);
  };
  
  const documentActions = {
    ...equippableStore.documentActions,
    updateAction,
    updateLink,
  };

  const actionEditorStoreParams: ActionEditorStoreCreatorParams<WeaponAction> = {
    actions: computed(() => document.value.system.actions),
    actionTypeOptions,
    updateAction,
    updateLink,
    addChainLink,
  };
  const createActionEditorStore = useActionEditorStoreCreator(actionEditorStoreParams);

  const _storeUtils = {
    ...equippableStore._storeUtils,
    createActionEditorStore,
  };

  const store: WeaponStore = {
    ...equippableStore,
    documentGetters,
    documentActions,
    _storeUtils,
  };

  if (options.registerGlobally ?? true) {
    game.dnd35e.stores[document.value.documentName][context.document.uuid] = store;
  }

  return store;
};

interface WeaponGetters extends EquippableItemGetters {
  weaponType: ComputedRef<string>;
  weaponSubtype: ComputedRef<string>;
  topLevelActions: ComputedRef<WeaponAction[]>;
}

interface WeaponActions extends EquippableItemActions {
  updateAction: (updatedAction: WeaponAction) => Promise<boolean>;
  updateLink: (actionId: string, link: ActionChainLinkModel, remove?: boolean) => Promise<boolean>;
}

interface WeaponUtils extends EquippableItemStoreUtils {
  createActionEditorStore: (actionId: string, link?: Ref<ActionChainLinkModel>, chainOwnerActionId?: string) => ActionEditorStore;
}

type WeaponStore = EquippableDocumentStore<Weapon> & {
  documentGetters: WeaponGetters & ItemDocumentGetters;
  documentActions: WeaponActions & ItemDocumentActions<Weapon>;
  _storeUtils: WeaponUtils & ItemSheetStoreUtils<Weapon>;
};

export { useWeaponStore };
export type { UseWeaponStoreOptions, WeaponGetters, WeaponStore };
