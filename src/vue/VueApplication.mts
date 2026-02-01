import type { ApplicationRenderOptions } from "@client/applications/_module.mjs";
import ApplicationV2 from "@client/applications/api/application.mjs";
import type { DocumentSheetConfiguration } from "@client/applications/api/document-sheet.mjs";
import { object } from "@client/applications/handlebars.mjs";
import type { CompendiumDocument } from "@client/documents/_module.mjs";
import type { ClientDocument } from "@client/documents/abstract/client-document.mjs";
import type { CompendiumCollection } from "@client/documents/collections/_module.mjs";
import { ItemDnd35e } from "@items/baseItem/index.mjs";
import { App, Component, createApp, reactive } from "vue";

interface VueApplicationContext<TDocument extends ItemDnd35e> {
  document: TDocument;
  appConfigOptions: VueApplicationConfiguration<TDocument>;
  app: VueApplication<TDocument>;
}

interface VueRenderOptions extends ApplicationRenderOptions {
  isEditable?: boolean;
};

interface VueSheetContext {
  document: any;
  editable: boolean;
  renderOptions: VueRenderOptions;
}

interface VueApplicationConfiguration<TDocument extends ItemDnd35e = ItemDnd35e> extends DocumentSheetConfiguration {
  document: TDocument;
  isEditable?: boolean;
}

abstract class VueApplication<TDocument extends ItemDnd35e> extends foundry.applications.api.ApplicationV2<VueApplicationConfiguration<TDocument>> {
  constructor(options: VueApplicationConfiguration<TDocument>, ...args:any[]) {
    // TODO: in v13 foundry still calls applications using the app v1 signature. this will be phased out in v15, come back and clear this out too.
    options = new.target._migrateConstructorParams(options, args) as VueApplicationConfiguration<TDocument>;
    super(options);
    this.#document = options.document;
    this.context = {
      document: this.#document,
      appConfigOptions: options,
      app: this,
    };
  }
 /**
   * The Document instance associated with the application
   * @type {ClientDocument}
   */
  get document() {
    return this.#document;
  }

  static get documentClass() { return Item; }

  #document: TDocument;

  /** The Vue component class to mount */
  // static vueComponent: Component;
  protected abstract get vueComponent(): Component;

  /** Persistent Vue app instance */
  protected vueApp: App | null = null;

  /** Persistent mount node */
  protected vueRoot: HTMLElement | null = null;

  /** Shared reactive context passed into Vue */
  protected context: VueApplicationContext<TDocument>;
  // private _frame: HTMLElement | null = null;

  get id(): string {
    return `dnd35e-${this.document.type}-sheet-${this.document.id}`;
  }

  static get DEFAULT_OPTIONS(): DeepPartial<VueApplicationConfiguration<ItemDnd35e>> {
    return {
      classes: ["dnd35e", "sheet"],
      tag: "form",
      viewPermission: foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED,
      editPermission: foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
      canCreate: false,
      sheetConfig: true,
      actions: {
        configureSheet: (event: PointerEvent) => this.prototype._onConfigureSheet(event),
        copyUuid: {
          handler: (event: PointerEvent) => this.prototype._onCopyUuid(event),
          buttons: [0, 2]
        },
        // editImage: (event: PointerEvent) => this.prototype._onEditImage(event),
        importDocument: (event: PointerEvent) => this.prototype._onImportDocument(event)
      },
      position: {
        width: 560,
        height: 650
      },
      window: {
        controls: [
          {
            icon: "fa-solid fa-gear",
            label: "SHEETS.ConfigureSheet",
            action: "configureSheet",
            visible: this.prototype.canConfigureSheet
          },
        ]
      },
    };
  }

  get canConfigureSheet() {
    if ( !this.options?.sheetConfig || !this.isEditable ) return false;
    const document = this.#document;
    return !!document.collection?.has(document.id) && !document.flags.core?.sheetLock;
  }

  // DocumentSheetV2 implementation
  get isVisible() {
    return this.document.testUserPermission(game.user, this.options.viewPermission as foundry.CONST.DocumentOwnershipLevel);
  }
  
  get isEditable() {
    if (this.options?.isEditable === false) return false;
    
    if ( this.document.pack ) {
      const pack = game.packs.get(this.document.pack);
      if ( pack?.locked ) return false;
    }
    return this.document.testUserPermission(game.user, this.options.editPermission as foundry.CONST.DocumentOwnershipLevel);
  }

  protected _onConfigureSheet(event: PointerEvent): void {
    event.stopPropagation(); // Don't trigger other events
    if ( event.detail > 1 ) return; // Ignore repeated clicks

    const docSheetConfigWidth = Number(foundry.applications.apps.DocumentSheetConfig.DEFAULT_OPTIONS.position?.width) || 0;
    const positionWidth = Number(this.position.width) || 0;
    new foundry.applications.apps.DocumentSheetConfig({
      document: this.document,
      position: {
        top: this.position.top + 40,
        left: this.position.left + ((positionWidth - docSheetConfigWidth) / 2)
      }
    } as Partial<DocumentSheetConfiguration>).render({ force: true });
  }

  protected _onCopyUuid(event: PointerEvent): void {
    event.preventDefault(); // Don't open context menu
    event.stopPropagation(); // Don't trigger other events
    if ( event.detail > 1 ) return; // Ignore repeated clicks
    const id = event.button === 2 ? this.document.id : this.document.uuid;
    const type = event.button === 2 ? "id" : "uuid";
    const label = game.i18n.localize(this.document.type);
    game.clipboard.copyPlainText(id);
    foundry.ui.notifications.info("DOCUMENT.IdCopiedClipboard", {format: {label, type, id}});
  }

  // protected _onEditImage(event: PointerEvent, target: HTMLElement): void {
  //   if ( target.nodeName !== "IMG" ) {
  //     throw new Error("The editImage action is available only for IMG elements.");
  //   }
  //   const attr = target.dataset.edit || '';
  //   const current = foundry.utils.getProperty(this.document._source, attr) || '';
  //   const defaultArtwork = this.document.constructor.getDefaultArtwork?.(this.document._source) ?? {};
  //   const defaultImage = foundry.utils.getProperty(defaultArtwork, attr);
  //   const fp = new foundry.applications.apps.FilePicker.implementation({
  //     current,
  //     type: "image",
  //     redirectToRoot: defaultImage ? [defaultImage] : [],
  //     callback: path => {
  //       target.src = path;
  //       if ( this.options.form.submitOnChange ) {
  //         const submit = new Event("submit", {cancelable: true});
  //         this.form.dispatchEvent(submit);
  //       }
  //     },
  //     position: {
  //       top: this.position.top + 40,
  //       left: this.position.left + 10
  //     }
  //   });
  //   await fp.browse();
  // }

  protected async _onImportDocument(event: PointerEvent) {
    await this.close();
    const { documentName, collection, id } = this.document as unknown as ClientDocument;
    return game.collections.get(documentName)?.importFromCompendium(collection! as CompendiumCollection<CompendiumDocument>, id);
  }

  // End DocumentSheetV2 implementation


  /**
   * super._renderHTML() is abstract we must implement this.
   * Foundry calls this to get HTML for .window-content.
   * We return a stable wrapper that Foundry will NOT replace again.
   */
  protected override async _renderHTML(
    context: any,
    options: ApplicationRenderOptions
  ): Promise<HTMLElement> {
    return context
  }

  protected _createVueApp(context: object): App {
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
  protected override async _replaceHTML(
    result: any,
    content: HTMLElement,
    options: VueRenderOptions
  ): Promise<void> {
    this.context.document = this.#document;
    this.context.appConfigOptions = this.options;

    let root = content.querySelector<HTMLElement>(".vue-root");
    if (!root) {
      root = document.createElement("div");
      root.classList.add("vue-root");

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

  override async render(options?: boolean | DeepPartial<VueRenderOptions> | undefined): Promise<this> {
    return super.render(options);
  }

  override async close(options?: fa.ApplicationClosingOptions): Promise<ApplicationV2> {
    try {
      this.vueApp?.unmount();
    }
    finally {
      this.vueApp = null;
      this.vueRoot = null;
    }
    return super.close(options);
  }

  static _migrateConstructorParams(first: VueApplicationConfiguration<ItemDnd35e>, rest: any[]) {
    if ( (first instanceof Object) && (first.document instanceof foundry.abstract.Document) ) {
      return first;
    }

    // Probably using V1 constructor args, but make sure the first is in fact a Document.
    if ( !(first instanceof foundry.abstract.Document) ) {
      throw new Error("A DocumentSheetV2 application must be provided a Document instance.");
    }

    // Warn, create a new partial configuration object, and recover at least some of the other options.
    const message = [
      `DocumentSheet V1 arguments passed to a ${this.name} constructor`,
      "the first argument must be an options object with a document property."
    ].join(": ");
    foundry.utils.logCompatibilityWarning(message, {since: 13, until: 15});
    const options: any = {document: first};
    const legacyOptions = rest[1] instanceof Object ? rest[1] : {};
    if ( typeof legacyOptions.title === "string" ) options.window = {title: legacyOptions.title};
    const positionKeys = ["top", "left", "width", "height", "scale", "zIndex"];
    options.position = positionKeys.reduce((position:any, key) => {
      if ( legacyOptions[key] !== undefined ) position[key] = legacyOptions[key];
      return position;
    }, {});

    return options as VueApplicationConfiguration<ItemDnd35e>;
  }
}

export {
  VueApplication,
};

export type {
  VueApplicationConfiguration,
  VueSheetContext,
}
