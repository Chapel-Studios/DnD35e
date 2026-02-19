import type { ApplicationRenderContext, ApplicationRenderOptions } from '@client/applications/_types.mjs';
import type { ApplicationV2, DocumentSheetV2 } from '@client/applications/api/_module.mjs';
import type { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import type { App, Component } from 'vue';
import { createApp } from 'vue';

import type { VueApplicationConfiguration, VueApplicationContext, VueRenderOptions } from './index.mjs';


const useVueMixin = <TBase extends AbstractConstructorOf<DocumentSheetV2>, TDocument extends ItemDnd35e | DnD35eActiveEffect> (base: TBase) => {
  abstract class VueApp extends base {
    declare options: VueApplicationConfiguration<TDocument>;
    #document!: TDocument;
    /** The Vue component class to mount */
    protected abstract get vueComponent(): Component;

    /** Persistent Vue app instance */
    protected vueApp: App | null = null;

    /** Persistent mount node */
    protected vueRoot: HTMLElement | null = null;

    /** Shared reactive context passed into Vue */
    protected context!: VueApplicationContext<TDocument>;

    constructor (...args: any[]) {
      super(...args);
      const options = args[0] as VueApplicationConfiguration<TDocument>;
      this.#document = options.document;
      this.context = {
        document: this.#document,
        appConfigOptions: options,
        isEditable: this.isEditable,
      };
    }

    static get documentClass () { return Item; }

    override get id (): string {
      return `dnd35e-${this.#document.type}-sheet-${this.#document.id}`;
    }

    get canConfigureSheet () {
      if (!this.options?.sheetConfig || !this.isEditable) return false;
      const document = this.#document;
      return !!document.collection?.has(document.id) && !document.flags.core?.sheetLock;
    }

    // DocumentSheetV2 implementation
    override get isEditable () {
      return (this.options?.isEditable === false)
        ? false
        : super.isEditable;
    }

    /**
     * super._renderHTML() is abstract we must implement this.
     * Foundry calls this to get HTML for .window-content.
     * We should be returning an HTMLElement here, but instead we return the context and do the actual rendering in _replaceHTML.
     * This is because Vue needs to control the entire contents of .window-content to properly manage reactivity.
     * If we return an HTMLElement here and then try to mount Vue onto it in _replaceHTML, Vue will not be able to properly manage the DOM and we will lose reactivity.
     */
    protected override async _renderHTML (
      context: ApplicationRenderContext,
      _options: ApplicationRenderOptions,
    ): Promise<object> {
      return context;
    }

    protected _createVueApp (renderOptions: VueRenderOptions): App {
      const context: VueApplicationContext<TDocument> = {
        ...this.context,
        isEditable: this.isEditable,
        renderOptions,
      };
      return createApp(this.vueComponent, {
        context,
      });
    }

    /**
     * Foundry calls this after replacing .window-content.
     * We reattach our persistent vueRoot and update reactive context.
     */
    protected override async _replaceHTML (
      _result: any,
      content: HTMLElement,
      options: VueRenderOptions,
    ): Promise<void> {
      this.context.document = this.#document;
      this.context.appConfigOptions = this.options;

      let root = content.querySelector<HTMLElement>('.vue-root');
      if (!root) {
        root = document.createElement('div');
        root.classList.add('vue-root');

        content.replaceChildren(root);
      }

      this.vueRoot = root;

      // // First render: create context + mount Vue
      if (!this.vueApp) {
        this.vueApp = this._createVueApp(options);
        this.vueApp.mount(this.vueRoot);
      }
    }

    override async render (options?: boolean | DeepPartial<VueRenderOptions> | undefined): Promise<this> {
      return super.render(options);
    }

    override async close (options?: fa.ApplicationClosingOptions): Promise<ApplicationV2> {
      try {
        this.vueApp?.unmount();
      } finally {
        this.vueApp = null;
        this.vueRoot = null;
      }
      return super.close(options);
    }
  }

  return VueApp;
};

type VueMixin<TBase extends ConstructorOf<DocumentSheetV2>, TDocument extends ItemDnd35e | DnD35eActiveEffect> = ReturnType<typeof useVueMixin<TBase, TDocument>>;

export {
  useVueMixin,
};
export type {
  VueMixin,
};

