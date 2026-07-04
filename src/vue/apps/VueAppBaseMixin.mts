/**
 * Base Vue mixin for ApplicationV2 applications.
 * Provides common Vue lifecycle management (mounting, rendering, cleanup).
 *
 * This base mixin is extended by:
 * - VueSettingsMixin: For settings dialogs and simple ApplicationV2 apps
 * - VueDocumentSheetMixin: For DocumentSheetV2-based apps (items, effects, actors)
 */

import type { ApplicationRenderContext, ApplicationRenderOptions } from '@client/applications/_types.mjs';
import { SettingsStoreSymbol, useSettingsStore } from '@settings/shared/sheet/settingsStore.mjs';
import type { App, Component } from 'vue';

import type { VueApplicationContextTransfer } from './VueAppTypes.mjs';

/**
 * Base render options for Vue applications
 */
interface VueBaseRenderOptions extends ApplicationRenderOptions {
  /** Whether the application is editable */
  isEditable?: boolean;
}

/**
 * Interface describing members added by VueAppBaseMixin.
 * Used for explicit typing instead of ReturnType inference.
 */
interface VueAppBaseMembers {
  /** The Vue component class to mount */
  readonly vueComponent: Component;
  /** Persistent Vue app instance */
  vueApp: App | null;
  /** Persistent mount node */
  vueRoot: HTMLElement | null;
}

/**
 * Base Vue mixin for ApplicationV2
 * Handles Vue app lifecycle: creation, mounting, unmounting
 */
function useVueAppBaseMixin<
  TBase extends AbstractConstructorOf<foundry.applications.api.ApplicationV2>
>(base: TBase) {
  abstract class VueAppBase extends base {
    /** The Vue component class to mount */
    protected abstract get vueComponent(): Component;

    /** Persistent Vue app instance */
    protected vueApp: App | null = null;

    /** Persistent mount node */
    protected vueRoot: HTMLElement | null = null;

    /**
     * Create the Vue app instance.
     * Subclasses should override to provide their specific context/props.
     */
    protected abstract _createVueApp(renderOptions: VueBaseRenderOptions): App;

    /**
     * Foundry calls this to get HTML for .window-content.
     * We return the context and do actual rendering in _replaceHTML.
     * This allows Vue to control the entire contents of .window-content for proper reactivity.
     */
    protected override async _renderHTML(
      context: ApplicationRenderContext,
      _options: ApplicationRenderOptions
    ): Promise<object> {
      return context;
    }

    /**
     * Foundry calls this after getting HTML.
     * We mount Vue here, creating or reusing the root element.
     */
    protected override async _replaceHTML(
      { store, ...context }: VueApplicationContextTransfer<any>,
      content: HTMLElement,
      options: VueBaseRenderOptions
    ): Promise<void> {
      // Find or create the Vue root element
      let root = content.querySelector<HTMLElement>('.vue-root');
      if (!root) {
        root = document.createElement('div');
        root.classList.add('vue-root');
        content.replaceChildren(root);
      }

      this.vueRoot = root;

      // First render: create and mount Vue
      if (!this.vueApp) {
        this.vueApp = this._createVueApp(options);
        this.vueApp.provide(SettingsStoreSymbol, useSettingsStore());
        this.vueApp.mount(this.vueRoot);
      }
      else {
        store?._storeUtils.refreshContext(context);
      }
    }

    /**
     * Cleanup Vue app on close
     */
    override async close(
      options?: foundry.applications.ApplicationClosingOptions
    ): Promise<foundry.applications.api.ApplicationV2> {
      try {
        this.vueApp?.unmount();
      } finally {
        this.vueApp = null;
        this.vueRoot = null;
      }
      return super.close(options);
    }
  }

  return VueAppBase;
}

/**
 * Type for classes created by useVueAppBaseMixin.
 * Combines base ApplicationV2 with Vue-specific members.
 */
type VueAppBaseMixin<
  TBase extends AbstractConstructorOf<foundry.applications.api.ApplicationV2>
> = TBase & AbstractConstructorOf<VueAppBaseMembers>;

export { useVueAppBaseMixin };
export type {
  VueAppBaseMembers,
  VueAppBaseMixin,
  VueBaseRenderOptions,
};
