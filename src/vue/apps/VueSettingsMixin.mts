/**
 * Vue mixin for ApplicationV2-based settings configuration dialogs.
 * Extends VueAppBaseMixin with reactive data management for settings forms.
 */

import { SettingsStoreSymbol, useSettingsStore } from '@settings/shared/sheet/settingsStore.mjs';
import type { App } from 'vue';
import { createApp, reactive } from 'vue';

import { useVueAppBaseMixin, type VueAppBaseMembers, type VueBaseRenderOptions } from './VueAppBaseMixin.mjs';

/**
 * Render options for Vue settings applications
 */
interface VueSettingsRenderOptions extends VueBaseRenderOptions {
  /** Whether the application is editable */
  isEditable?: boolean;
}

/**
 * Reactive context passed to Vue settings components
 */
interface VueSettingsContext<TData = object> {
  /** The settings data */
  data: TData;
  /** Whether the form is editable */
  isEditable: boolean;
  /** Render options */
  renderOptions?: VueSettingsRenderOptions;
  close: () => void;
}

/**
 * Interface describing members added by VueSettingsMixin.
 * Used for explicit typing instead of ReturnType inference.
 */
interface VueSettingsMembers<TData extends object = object> extends VueAppBaseMembers {
  /** Shared reactive context passed into Vue */
  context: VueSettingsContext<TData>;
  /** The reactive data object */
  reactiveData: TData;
}

/**
 * Vue mixin for ApplicationV2 settings dialogs
 * Adds reactive data management on top of base Vue lifecycle
 */
function useVueSettingsMixin<
  TBase extends AbstractConstructorOf<foundry.applications.api.ApplicationV2>,
  TData extends object = object
>(base: TBase) {
  const VueAppBase = useVueAppBaseMixin(base);

  abstract class VueSettingsApp extends VueAppBase {
    /** Shared reactive context passed into Vue */
    protected context!: VueSettingsContext<TData>;

    /** The reactive data object */
    protected reactiveData!: TData;

    constructor(...args: any[]) {
      super(...args);

      // Initialize reactive context - subclasses should set reactiveData
      this.context = reactive({
        data: {} as TData,
        isEditable: true,
        close: () => this.close(),
      }) as VueSettingsContext<TData>;
    }

    /**
     * Initialize the reactive data.
     * Subclasses should call this in their constructor or _prepareContext.
     */
    protected initializeReactiveData(data: TData): void {
      this.reactiveData = reactive(data) as TData;
      this.context.data = this.reactiveData;
    }

    /**
     * Get the current data from the reactive context.
     * Useful for form submission.
     */
    protected getData(): TData {
      return this.reactiveData;
    }

    /**
     * Update a value in the reactive data.
     * @param path - Dot-notation path to the value
     * @param value - New value
     */
    protected updateData(path: string, value: unknown): void {
      foundry.utils.setProperty(this.reactiveData as object, path, value);
    }

    /**
     * Create the Vue app instance with settings context
     */
    protected override _createVueApp(renderOptions: VueSettingsRenderOptions): App {
      const contextData: VueSettingsContext<TData> = {
        ...this.context,
        renderOptions,
      };

      return createApp(this.vueComponent, {
        context: contextData,
      })
        .provide(SettingsStoreSymbol, useSettingsStore());
    }

    /**
     * Override _replaceHTML to make the method visible to subclasses.
     * This bridges the mixin chain for TypeScript's static analysis.
     */
    protected override async _replaceHTML(
      result: object,
      content: HTMLElement,
      options: VueSettingsRenderOptions
    ): Promise<void> {
      await super._replaceHTML(result, content, options);
    }
  }

  return VueSettingsApp;
}

/**
 * Type for classes created by useVueSettingsMixin.
 * Combines base ApplicationV2 with settings-specific members.
 */
type VueSettingsMixin<
  TBase extends AbstractConstructorOf<foundry.applications.api.ApplicationV2>,
  TData extends object = object
> = TBase & AbstractConstructorOf<VueSettingsMembers<TData>>;

export { useVueSettingsMixin };
export type { 
  VueSettingsContext,
  VueSettingsMembers,
  VueSettingsMixin,
  VueSettingsRenderOptions,
};
