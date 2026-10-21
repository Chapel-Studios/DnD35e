import type { DocumentContext, FamiliarSchema, FormulaDataSource } from '@helpers/formulae/index.mjs';
import { FormulaData } from '@helpers/formulae/index.mjs';
import type { ActionChainLinkModel } from '@items/baseItem/actions/ActionSourceData.mjs';
import type { SelectOption } from '@vc/fields/index.mjs';
import type { Ref } from 'vue';
import type { ComputedRef } from 'vue';
import { computed, ref } from 'vue';

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
  /**
   * Raw (pre-AE, `_source`) counterpart of `action`, keyed the same way. Used by
   * formula-field getters (e.g. `nameFormulaSourceText`) so the edit-mode formula
   * editor can show the true authored text instead of the AE-merged prepared value.
   * Undefined when the action isn't found in `_source` (shouldn't normally happen).
   */
  sourceAction: ComputedRef<Record<string, unknown> | undefined>;
  /**
   * This action's numeric index within `system.actions` — the path shape AE changes and
   * `effectOverrides` history actually key on (distinct from `getFieldPath`'s `_id`-based
   * path, which only needs to be a stable string key for field-permission flags). -1 when
   * the action can't be found (shouldn't normally happen).
   */
  actionIndex: ComputedRef<number>;
  updateAction: (updatedAction: T) => Promise<boolean>;
  addChainLink: (parentActionId: string, subActionType: T['type']) => Promise<boolean>;
  displaySettings: ActionEditorDisplaySettings;
  linkSettings?: LinkSettings;
  actionTypeOptions: SelectOption<ActionType>[];
  createActionEditorStore: (actionId: string, link?: Ref<ActionChainLinkModel>, chainOwnerActionId?: string) => ActionEditorStore;
}

interface ActionEditorStoreCreatorParams<T extends ActionDataModel> {
  actions: Ref<T[]>;
  /** Parallel `_source`-based array (see `ActionEditorStoreParams.sourceAction`). */
  sourceActions: Ref<Record<string, unknown>[]>;
  actionTypeOptions: SelectOption<ActionType>[];
  updateLink: (actionId: string, link: ActionChainLinkModel, remove?: boolean) => Promise<boolean>;
  updateAction: (updatedAction: T, remove?: boolean) => Promise<boolean>;
  addChainLink: (parentActionId: string, subActionType: T['type']) => Promise<boolean>;
}

const useActionEditorStoreCreator = <T extends ActionDataModel>(creatorParams: ActionEditorStoreCreatorParams<T>): (actionId: string, link?: Ref<ActionChainLinkModel>, chainOwnerActionId?: string) => ActionEditorStore => {
  const {
    actions,
    sourceActions,
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
    const initialAction = actions.value.find((a) => a._id === actionId);
    if (!initialAction) throw new Error(`Action with ID ${actionId} not found`);

    const linkSettings = getLinkSettings(updateLink, link, chainOwnerActionId);

    const displaySettings = getDisplaySettings(actionId);
    const actionStoreParams: ActionEditorStoreParams<T> = {
      // Computed re-lookup, not a one-time snapshot: `actions.value` gets fresh
      // ActionDataModel instances on every document update, so a static ref would go
      // stale after the first edit (a later edit would then spread the old field values
      // back). Not a deep `ref()` either — that throws a Proxy invariant violation when
      // the FormulaFamiliar walker reads `.schema` (a non-configurable data property) —
      // see foundry-document-non-reactive-props memory.
      action: computed(() => actions.value.find((a) => a._id === actionId) ?? initialAction),
      sourceAction: computed(() => sourceActions.value.find((a) => a._id === actionId)),
      actionIndex: computed(() => actions.value.findIndex((a) => a._id === actionId)),
      updateAction,
      addChainLink,
      displaySettings,
      linkSettings,
      actionTypeOptions,
      createActionEditorStore,
    };
    
    return createActionStore(initialAction.type, actionStoreParams);
  };

  return createActionEditorStore;
};

const useActionEditorStore = <T extends ActionDataModel>({
  action,
  sourceAction,
  actionIndex,
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
    actionId: computed(() => action.value._id),
    // Group field path for this action as a whole (poc-overrides) — set a visibility/
    // editability override here to cascade it down to every one of this action's own
    // field paths (all `getFieldPath()`-built, so they already share this prefix).
    actionFieldPath: computed(() => `system.actions.${action.value._id}`),
    // See `nameContexts` above for the context-name -> document mapping.
    displayName: computed(() => {
      // Static resolveSource(), not the instance .resolve() — an AE targeting this 
      // field replaces it with a plain POJO via core's setProperty(), which has no
      // .resolve() method.
      const resolved = FormulaData.resolveSource(action.value.name as unknown as FormulaDataSource, { ...nameContexts.value });
      return (typeof resolved === 'string' ? resolved : null)
        ?? action.value.name.resolvedValue
        ?? action.value._id;
    }),
    nameFormulaData: computed(() => action.value.name),
    // True authored formula text (pre-AE) — shown instead of `nameFormulaData.formula`
    // (the AE-merged prepared value) when the formula editor is in edit mode.
    nameFormulaSourceText: computed(() => (sourceAction.value as { name?: FormulaDataSource } | undefined)?.name?.formula),
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
    chainOwnerFieldPath: computed(() => linkSettings
      ? `system.actions.${linkSettings.parentActionId}.chain`
      : undefined),
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
    // See `ActionEditorStoreParams.actionIndex` doc — used for `effectOverrides`/AE lookups,
    // NOT field-permission flags (those use `getFieldPath`'s `_id`-based path).
    getOverrideFieldPath: (field: string) => `system.actions.${actionIndex.value}.${field}`,
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
  /** See `ActionEditorStoreParams.actionIndex` doc. */
  getOverrideFieldPath: (field: string) => string;
  updateActionField: (field: string, value: unknown) => Promise<boolean>;
  // updateChain: (link: ActionChainLinkModel, remove?: boolean) => Promise<boolean>;
  updateLink: (link: ActionChainLinkModel, remove?: boolean) => Promise<boolean>;
  createActionEditorStore: (actionId: string, link?: Ref<ActionChainLinkModel>, chainOwnerActionId?: string) => ActionEditorStore;
  updateTrigger: (trigger: ActionTrigger) => Promise<boolean>;
  addChainLink: (subActionType: ActionType) => Promise<boolean>;
}

interface ActionEditorStoreGetters {
  actionId: ComputedRef<string>;
  actionFieldPath: ComputedRef<string>;
  nameFormulaData: ComputedRef<FormulaDataSource>;
  nameFormulaSourceText: ComputedRef<string | undefined>;
  familiarContexts: ComputedRef<FamiliarSchema>;
  displayName: ComputedRef<string>;
  localizedActionTypeLabel: ComputedRef<string>;
  isSystemCreated: ComputedRef<boolean>;
  isActionEditorOpen: ComputedRef<boolean>;
  activationCost: ComputedRef<string>;
  provokes: ComputedRef<boolean>;
  maxTargets: ComputedRef<number | null>;
  chain: ComputedRef<ActionChainLinkModel[]>;
  chainOwnerFieldPath: ComputedRef<string | undefined>;
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
