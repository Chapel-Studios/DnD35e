/**
 * Vue mixin for DocumentSheetV2-based applications.
 * Extends VueAppBaseMixin with document-specific features like header buttons, edit mode, and identified view.
 */

import type { ApplicationRenderContext, ApplicationRenderOptions } from '@client/applications/_types.mjs';
import type { DocumentSheetV2 } from '@client/applications/api/_module.mjs';
import type { DocumentSheetStore } from '@ec/CoreMixin/sheet/DocumentSheetStore.mjs';
import { RenderModeStoreSymbol, useRenderModeStore } from '@ec/CoreMixin/sheet/stores/index.mjs';
import type { RenderModeStore } from '@ec/CoreMixin/sheet/stores/RenderModeStore.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import type { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';
import { EDIT, PLAY } from '@helpers/formulae/types.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import type { App } from 'vue';
import { createApp } from 'vue';

import type { VueAppBaseMembers } from './VueAppBaseMixin.mjs';
import { useVueAppBaseMixin } from './VueAppBaseMixin.mjs';
import type { SheetState, VueApplicationConfiguration, VueApplicationContext, VueApplicationContextTransfer, VueRenderOptions } from './VueAppTypes.mjs';

/**
 * Interface describing members added by VueDocumentSheetMixin.
 * Used for explicit typing instead of ReturnType inference.
 */
interface VueDocumentSheetMembers<TDocument extends ItemDnd35e | DnD35eActiveEffect> extends VueAppBaseMembers {
  /** Application options with document reference */
  options: VueApplicationConfiguration<TDocument>;
  /** Shared reactive context passed into Vue */
  context: VueApplicationContext<TDocument>;
  /** Shared reactive state for header controls */
  sheetState: SheetState;
  /** Whether the sheet can be configured */
  readonly canConfigureSheet: boolean;
  /** Whether the sheet is editable */
  readonly isEditable: boolean;
}

const useVueDocumentSheetMixin = <TBase extends AbstractConstructorOf<DocumentSheetV2>, TDocument extends ItemDnd35e | DnD35eActiveEffect> (base: TBase) => {
  const VueAppBase = useVueAppBaseMixin(base);

  abstract class VueDocumentSheet extends VueAppBase {
    declare options: VueApplicationConfiguration<TDocument>;
    #document!: TDocument;

    /** Shared reactive context passed into Vue */
    protected context!: VueApplicationContext<TDocument>;

    /** Shared reactive state for header controls */
    // protected sheetState!: SheetState;

    protected renderModeStore!: RenderModeStore;

    constructor (...args: any[]) {
      super(...args);
      const options = args[0] as VueApplicationConfiguration<TDocument>;
      this.#document = options.document;

      // Create shared reactive state for header controls.
      // GMs land in Edit Mode, players land in Play Mode.
      const doc = this.#document as { effects?: Iterable<{ type?: string }> };
      const hasSecrets = !!doc.effects && [...doc.effects].some(effect => effect.type === secretEffectType);
      const initialMode = game.user.isGM
        ? EDIT
        : PLAY;

      this.renderModeStore = useRenderModeStore(
        this.#document.testUserPermission(game.user, 'OWNER'),
        hasSecrets,
        initialMode
      );

      this.context = {
        document: this.#document,
        appConfigOptions: options,
        close: async () => { await this.close(); },
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
     * Create the Vue app instance with document context
     */
    protected override _createVueApp (renderOptions: VueRenderOptions): App {
      const context: VueApplicationContext<TDocument> = {
        ...this.context,
        renderOptions,
      };
      
      const app = createApp(this.vueComponent, {
        context,
      });
      app.provide(RenderModeStoreSymbol, this.renderModeStore);

      return app;
    }

    /**
     * Update document context before base _replaceHTML handles mounting.
     */
    protected override async _replaceHTML (
      result: VueApplicationContextTransfer<TDocument>,
      content: HTMLElement,
      options: VueRenderOptions
    ): Promise<void> {
      // Update context with current document state — use this.document (live getter) not this.#document (stale snapshot)
      const doc = this.document as TDocument;
      result.document = doc;
      result.appConfigOptions = this.options;
      result.store = game.dnd35e.stores[doc.documentName]?.[doc.id] as DocumentSheetStore<TDocument> | undefined;

      // Let base handle Vue mounting
      await super._replaceHTML(result, content, options);
    }

    /**
     * Called after rendering. Adds header buttons to the window header.
     */
    protected override async _onRender (
      context: ApplicationRenderContext,
      options: ApplicationRenderOptions
    ): Promise<void> {
      await super._onRender(context, options);
      const liveDoc = this.document as unknown as { effects?: Iterable<{ type?: string }> };
      const hasSecrets = !!liveDoc.effects && [...liveDoc.effects].some(effect => effect.type === secretEffectType);
      this.renderModeStore.setHasSecrets(hasSecrets);
      this.#syncWindowTitle();
      const header = this.element?.querySelector('.window-header');
      if (header) {
        this.renderModeStore.setHeaderElement(header, this.isEditable);
      }
    }

    #syncWindowTitle (): void {
      const title = this.title ?? '';
      const titleElement = this.element?.querySelector('.window-title');
      if (titleElement instanceof HTMLElement) {
        titleElement.textContent = title;
      }
    }

    override async render (options?: boolean | DeepPartial<VueRenderOptions> | undefined): Promise<this> {
      return super.render(options);
    }

    override async close (options?: foundry.applications.ApplicationClosingOptions): Promise<foundry.applications.api.ApplicationV2> {
      delete game.dnd35e.stores[this.#document.documentName]?.[this.#document.id];
      return super.close(options);
    }
  }

  return VueDocumentSheet;
};

/**
 * Type for classes created by useVueDocumentSheetMixin.
 * Combines base DocumentSheetV2 with document-specific members.
 */
type VueDocumentSheetMixin<
  TBase extends AbstractConstructorOf<DocumentSheetV2>,
  TDocument extends ItemDnd35e | DnD35eActiveEffect
> = TBase & AbstractConstructorOf<VueDocumentSheetMembers<TDocument>>;

export {
  useVueDocumentSheetMixin,
};
export type {
  VueDocumentSheetMembers,
  VueDocumentSheetMixin,
};