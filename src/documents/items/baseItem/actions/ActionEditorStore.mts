import type { DocumentContext, FamiliarSchema, FormulaDataSource } from '@helpers/formulae/index.mjs';
import { FormulaData } from '@helpers/formulae/index.mjs';
import type { ActionChainLinkModel } from '@items/baseItem/actions/ActionSourceData.mjs';
import type { SelectOption } from '@vc/fields/index.mjs';
import type { Ref } from 'vue';
import type { ComputedRef } from 'vue';
import { computed, ref, shallowRef } from 'vue';

import type { ActionDataModel } from './ActionDataModel.mjs';
import type { ActionTrigger, ActionType } from './constants.mjs';
import { createActionStore } from './CreateActionStore.mjs';

const ActionEditorStoreSymbol = Symbol('actionEditor');

interface LinkSettings {
  parentActionId: string;
  link: Ref<ActionChainLinkModel>;
  updateLink: (actionId: string, link: ActionChainLinkModel, remove?: boolean) => Promise<boolean>;
}

interface ActionEditorDisplaySettings {
  isActionEditorOpen: ComputedRef<boolean>;
  toggleActionEditorDisplay: (isOpen: boolean) => void;
}

interface ActionEditorStoreParams<T extends ActionDataModel> {
  action: Ref<T>;
  updateAction: (updatedAction: T) => Promise<boolean>;
  addChainLink: (parentActionId: string, subActionType: T['type']) => Promise<boolean>;
  displaySettings: ActionEditorDisplaySettings;
  linkSettings?: LinkSettings;
  actionTypeOptions: SelectOption<ActionType>[];
  createActionEditorStore: (actionId: string, link?: Ref<ActionChainLinkModel>) => ActionEditorStore;
}

interface ActionEditorStoreCreatorParams<T extends ActionDataModel> {
  actions: Ref<T[]>;
  actionTypeOptions: SelectOption<ActionType>[];
  updateLink: (actionId: string, link: ActionChainLinkModel, remove?: boolean) => Promise<boolean>;
  updateAction: (updatedAction: T, remove?: boolean) => Promise<boolean>;
  addChainLink: (parentActionId: string, subActionType: T['type']) => Promise<boolean>;
}

const useActionEditorStoreCreator = <T extends ActionDataModel>(creatorParams: ActionEditorStoreCreatorParams<T>): (actionId: string, link?: Ref<ActionChainLinkModel>) => ActionEditorStore => {
  const {
    actions,
    actionTypeOptions,
    updateLink,
    updateAction,
    addChainLink,
  } = creatorParams;
  const activeActionEditors = ref<Set<string>>(new Set());
  const getIsActionEditorOpen = (actionId: string) => computed(() => activeActionEditors.value.has(actionId));
  const getActionEditorToggler = (actionId: string) => () => {
    if (activeActionEditors.value.has(actionId)) {
      activeActionEditors.value.delete(actionId);
    } else {
      activeActionEditors.value.add(actionId);
    }
  };

  const getDisplaySettings = (actionId: string): ActionEditorDisplaySettings => ({
    isActionEditorOpen: getIsActionEditorOpen(actionId),
    toggleActionEditorDisplay: getActionEditorToggler(actionId),
  });

  const getLinkSettings = (
    updateLink: (actionId: string, link: ActionChainLinkModel, remove?: boolean) => Promise<boolean>,
    link?: Ref<ActionChainLinkModel>,
    chainOwnerActionId?: string
  ): LinkSettings | undefined => {
    if (!link || !chainOwnerActionId) return undefined;
    return {
      parentActionId: chainOwnerActionId,
      link: ref(link),
      updateLink,
    };
  };

  const createActionEditorStore = (actionId: string, link?: Ref<ActionChainLinkModel>, chainOwnerActionId?: string): ActionEditorStore => {
    const action = actions.value.find((a) => a._id === actionId);
    if (!action) throw new Error(`Action with ID ${actionId} not found`);

    const linkSettings = getLinkSettings(updateLink, link, chainOwnerActionId);

    const displaySettings = getDisplaySettings(actionId);
    const actionStoreParams: ActionEditorStoreParams<T> = {
      // shallowRef, not ref: a deep-reactive proxy around an ActionDataModel throws a
      // Proxy invariant violation when the FormulaFamiliar walker reads `.schema`
      // (a non-configurable data property) — see foundry-document-non-reactive-props memory.
      action: shallowRef(action) as Ref<T>,
      updateAction,
      addChainLink,
      displaySettings,
      linkSettings,
      actionTypeOptions,
      createActionEditorStore,
    };
    
    return createActionStore(action.type, actionStoreParams);
  };

  return createActionEditorStore;
};

const useActionEditorStore = <T extends ActionDataModel>({
  action,
  updateAction,
  addChainLink,
  displaySettings,
  linkSettings,
  actionTypeOptions,
  createActionEditorStore,
}: ActionEditorStoreParams<T>): ActionEditorStore => {
  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  // `resolve()`/`buildFamiliarSchema()` context-name keys must match the `name` field's
  // declared context aliases exactly (case-sensitive) - `self`/`weapon` for the Item,
  // `actor` for the Actor, `thisAttack` for the action's own DataModel
  // (e.g. `#thisAttack.reachLength`).
  const nameContexts = computed((): Record<string, DocumentContext> => ({
    self: action.value.item!,
    weapon: action.value.item!,
    actor: action.value.item!.actor!,
    thisAttack: action.value,
  }));

  const familiarContexts = computed((): FamiliarSchema => FormulaData.buildFamiliarSchema(nameContexts.value));

  const getters = {
    // See `nameContexts` above for the context-name -> document mapping.
    displayName: computed(() => action.value.name.resolve({ ...nameContexts.value })
      ?? action.value.name.resolvedValue
      ?? action.value._id),
    nameFormulaData: computed(() => action.value.name),
    // Explicit `contexts` for the `name` field's FormulaFormGroup `#` autocomplete
    // dropdown \u2014 same keys/roles as the `resolve()` call above (`self`/`weapon`/`actor`/
    // `thisAttack`), so `thisAttack.*` fields show up alongside the weapon/actor ones.
    // Without this, FormulaFormGroup falls back to the weapon-level document schema,
    // which knows nothing about the action's own `thisAttack` context.
    familiarContexts,
    actionType: computed(() => action.value.type),
    localizedActionTypeLabel: computed(() => {
      return localize(`dnd35e.WEAPON.ACTIONS.Type.${action.value.type}`);
    }),
    isSystemCreated: computed(() => action.value.isSystemCreated),
    isActionEditorOpen: computed(() => displaySettings.isActionEditorOpen.value),
    activationCost: computed(() => action.value.activationCost),
    provokes: computed(() => action.value.provokes),
    maxTargets: computed(() => action.value.maxTargets),
    chain: computed(() => [...action.value.chain]),
    link: linkSettings?.link,
    isLink: !!linkSettings?.link.value,

    actionTypeOptions: [...actionTypeOptions],
    trigger: computed(() => linkSettings?.link?.value.trigger),
  };

  const actions = {
    toggleActionEditor: () => {
      displaySettings.toggleActionEditorDisplay(!displaySettings.isActionEditorOpen.value);
    },
    getFieldPath: (field: string) => `system.actions.${action.value._id}.${field}`,
    updateActionField: (field: string, value: unknown) => {
      const updatedAction = {
        ...action.value,
        isSystemCreated: false,
        [field]: value,
      };
      return updateAction(updatedAction);
    },
    addChainLink: async (subActionType: ActionType) => {
      return addChainLink(action.value._id, subActionType);
    },
    // updateChain: (link: ActionChainLinkModel, remove = false) => {
    //   const updatedChain = [
    //     ...action.value.chain.filter(l => l.actionId !== link.actionId),
    //     ...(remove ? [] : [link]),
    //   ];
    //   const updatedAction = {
    //     ...action.value,
    //     isSystemCreated: false,
    //     chain: updatedChain,
    //   };
    //   return updateAction(updatedAction);
    // },
    updateLink: async (link: ActionChainLinkModel, remove = false) => {
      return linkSettings?.updateLink?.(action.value._id, link, remove)
        ?? Promise.resolve(false);
    },
    updateTrigger: (trigger: ActionTrigger) => {
      if (!linkSettings || !linkSettings.parentActionId) return Promise.resolve(false);
      return linkSettings.updateLink(linkSettings.parentActionId, {
        actionId: action.value._id,
        trigger,
      });
    },
    createActionEditorStore,
  };

  return {
    getters,
    actions,
  };
};

interface ActionEditorStoreActions {
  toggleActionEditor: () => void;
  getFieldPath: (field: string) => string;
  updateActionField: (field: string, value: unknown) => Promise<boolean>;
  // updateChain: (link: ActionChainLinkModel, remove?: boolean) => Promise<boolean>;
  updateLink: (link: ActionChainLinkModel, remove?: boolean) => Promise<boolean>;
  createActionEditorStore: (actionId: string, link?: Ref<ActionChainLinkModel>) => ActionEditorStore;
  updateTrigger: (trigger: ActionTrigger) => Promise<boolean>;
  addChainLink: (subActionType: ActionType) => Promise<boolean>;
}

interface ActionEditorStoreGetters {
  nameFormulaData: ComputedRef<FormulaDataSource>;
  familiarContexts: ComputedRef<FamiliarSchema>;
  displayName: ComputedRef<string>;
  localizedActionTypeLabel: ComputedRef<string>;
  isSystemCreated: ComputedRef<boolean>;
  isActionEditorOpen: ComputedRef<boolean>;
  activationCost: ComputedRef<string>;
  provokes: ComputedRef<boolean>;
  maxTargets: ComputedRef<number | null>;
  chain: ComputedRef<ActionChainLinkModel[]>;
  actionType: ComputedRef<ActionType>;
  isLink: boolean;
  link?: Ref<ActionChainLinkModel>;
  actionTypeOptions: SelectOption<ActionType>[];
}

interface ActionEditorStore {
  getters: ActionEditorStoreGetters;
  actions: ActionEditorStoreActions;
}

export type {
  ActionEditorDisplaySettings,
  ActionEditorStore,
  ActionEditorStoreActions,
  ActionEditorStoreCreatorParams,
  ActionEditorStoreGetters,
  ActionEditorStoreParams,
  LinkSettings,
};
export {
  ActionEditorStoreSymbol,
  useActionEditorStore,
  useActionEditorStoreCreator,
};
