import type { ApplicationRenderOptions } from '@client/applications/_module.mjs';
import ApplicationV2 from '@client/applications/api/application.mjs';
import type { DocumentSheetConfiguration, DocumentSheetRenderOptions } from '@client/applications/api/document-sheet.mjs';
import { ItemDnd35e } from '@items/baseItem/index.mjs';
import { App, Component, createApp } from 'vue';

interface VueRenderOptions extends DocumentSheetRenderOptions {
  isEditable?: boolean;
}

interface VueApplicationConfiguration<TDocument extends ItemDnd35e = ItemDnd35e> extends
  DocumentSheetConfiguration<TDocument>
{
  document: TDocument;
  isEditable?: boolean;
}

interface VueRenderOptions extends ApplicationRenderOptions {
  isEditable?: boolean;
}

interface VueApplicationConfiguration<TDocument extends ItemDnd35e = ItemDnd35e> extends
  DocumentSheetConfiguration<TDocument>
{
  document: TDocument;
  isEditable?: boolean;
}

abstract class VueItemSheet<TDocument extends ItemDnd35e> extends foundry.applications.sheets.ItemSheetV2<TDocument, VueApplicationConfiguration<TDocument>, VueRenderOptions> {
  constructor (options: VueApplicationConfiguration<TDocument>) {
    super(options);
    this.#document = options.document;
    this.context = {
      document: this.#document,
      appConfigOptions: options,
      app: this,
    };
  }

  static get documentClass () { return Item; }

  #document: TDocument;
  /** The Vue component class to mount */
  protected abstract get vueComponent(): Component;

  /** Persistent Vue app instance */
  protected vueApp: App | null = null;

  /** Persistent mount node */
  protected vueRoot: HTMLElement | null = null;

  /** Shared reactive context passed into Vue */
  // eslint-disable-next-line no-use-before-define
  protected context: VueApplicationContext<TDocument>;

  override get id (): string {
    return `dnd35e-${this.#document.type}-sheet-${this.#document.id}`;
  }

  static override get DEFAULT_OPTIONS (): DeepPartial<DocumentSheetConfiguration<ItemDnd35e>> {
    return {
      classes: ['dnd35e', 'vueApp'],
      actions: {},
      position: {
        width: 560,
        height: 650,
      },
      window: {
      },
    } as DeepPartial<VueApplicationConfiguration<ItemDnd35e>>;
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
   * We return a stable wrapper that Foundry will NOT replace again.
   */
  protected override async _renderHTML (
    context: any,
    _options: ApplicationRenderOptions,
  ): Promise<HTMLElement> {
    return context;
  }

  protected _createVueApp (context: object): App {
    return createApp(this.vueComponent, {
      context: {
        ...this.context,
        isEditable: this.isEditable,
        ...context,
      },
    });
  }

  /**
   * Foundry calls this after replacing .window-content.
   * We reattach our persistent vueRoot and update reactive context.
   */
  protected override async _replaceHTML (
    result: any,
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
      this.vueApp = this._createVueApp({
        ...result,
        isEditable: options.isEditable,
      });
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

interface VueApplicationContext<TDocument extends ItemDnd35e> {
  document: TDocument;
  appConfigOptions: VueApplicationConfiguration<TDocument>;
  app: VueItemSheet<TDocument>;
}

export {
  VueItemSheet,
};

export type {
  VueApplicationContext,
  VueApplicationConfiguration,
  VueRenderOptions,
};
