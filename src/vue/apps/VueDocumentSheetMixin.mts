/**
 * Vue mixin for DocumentSheetV2-based applications.
 * Extends VueAppBaseMixin with document-specific features like header buttons, edit mode, and identified view.
 */

import type { ApplicationRenderContext, ApplicationRenderOptions } from '@client/applications/_types.mjs';
import type { DocumentSheetV2 } from '@client/applications/api/_module.mjs';
import type { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { App } from 'vue';
import { createApp, reactive } from 'vue';

import type { VueAppBaseMembers } from './VueAppBaseMixin.mjs';
import { useVueAppBaseMixin } from './VueAppBaseMixin.mjs';
import type { SheetState, VueApplicationConfiguration, VueApplicationContext, VueRenderOptions } from './VueAppTypes.mjs';

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

  abstract class VueApp extends VueAppBase {
    declare options: VueApplicationConfiguration<TDocument>;
    #document!: TDocument;

    /** Shared reactive context passed into Vue */
    protected context!: VueApplicationContext<TDocument>;

    /** Shared reactive state for header controls */
    protected sheetState!: SheetState;

    constructor (...args: any[]) {
      super(...args);
      const options = args[0] as VueApplicationConfiguration<TDocument>;
      this.#document = options.document;

      // Create shared reactive state for header controls
      this.sheetState = reactive<SheetState>({
        editMode: false,
        editorViewMode: 'identified',
      });

      this.context = {
        document: this.#document,
        appConfigOptions: options,
        isEditable: this.isEditable,
        sheetState: this.sheetState,
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
     * Render header buttons directly in the window header bar.
     * Called from _onRender to add/update buttons.
     * @param refreshTooltipFor - Which button triggered the update (to refresh its tooltip)
     */
    protected _renderHeaderButtons (refreshTooltipFor?: 'editMode' | 'identifiedView'): void {
      const header = this.element?.querySelector('.window-header');
      if (!header) return;

      // Edit mode toggle button
      this._renderEditModeButton(header, refreshTooltipFor === 'editMode');

      // Identified view toggle button
      this._renderIdentifiedViewButton(header, refreshTooltipFor === 'identifiedView');
    }

    /**
     * Render or update the edit mode toggle button in the header.
     */
    protected _renderEditModeButton (header: Element, refreshTooltip = false): void {
      const existingBtn = header.querySelector('.edit-mode-btn') as HTMLButtonElement | null;

      if (this.isEditable && !existingBtn) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.classList.add('header-control', 'icon', 'edit-mode-btn');
        btn.dataset.action = 'toggleEditMode';
        btn.dataset.tooltip = game.i18n.localize(this.sheetState.editMode ? 'D35E.SheetModeEdit' : 'D35E.SheetModePlay');
        btn.dataset.tooltipDirection = 'DOWN';
        btn.setAttribute('aria-label', btn.dataset.tooltip);
        btn.innerHTML = `<i class="${this.sheetState.editMode ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock'}" inert></i>`;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._onToggleEditMode();
        });
        btn.addEventListener('dblclick', e => e.stopPropagation());
        btn.addEventListener('pointerdown', e => e.stopPropagation());
        header.prepend(btn);
      } else if (this.isEditable && existingBtn) {
        // Update existing button
        const icon = existingBtn.querySelector('i');
        if (icon) {
          icon.className = this.sheetState.editMode ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock';
        }
        existingBtn.dataset.tooltip = game.i18n.localize(this.sheetState.editMode ? 'D35E.SheetModeEdit' : 'D35E.SheetModePlay');
        existingBtn.setAttribute('aria-label', existingBtn.dataset.tooltip);
        // Refresh tooltip if this button was clicked
        if (refreshTooltip) {
          game.tooltip.deactivate();
          game.tooltip.activate(existingBtn, { text: existingBtn.dataset.tooltip, direction: 'DOWN' });
        }
      } else if (!this.isEditable && existingBtn) {
        existingBtn.remove();
      }
    }

    /**
     * Render or update the identified view toggle button in the header.
     */
    protected _renderIdentifiedViewButton (header: Element, refreshTooltip = false): void {
      const doc = this.#document as ItemDnd35e;
      const isIdentifiable = (doc.system as { isIdentifiable?: boolean })?.isIdentifiable;
      const shouldShow = isIdentifiable && (game.user.isGM || this.isEditable);
      const existingBtn = header.querySelector('.identified-view-btn') as HTMLButtonElement | null;

      if (shouldShow && !existingBtn) {
        const isShowingIdentified = this.sheetState.editorViewMode === 'identified';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.classList.add('header-control', 'icon', 'identified-view-btn');
        btn.dataset.action = 'toggleIdentifiedView';
        btn.dataset.tooltip = game.i18n.localize(isShowingIdentified ? 'D35E.Identified' : 'D35E.Unidentified');
        btn.dataset.tooltipDirection = 'DOWN';
        btn.setAttribute('aria-label', btn.dataset.tooltip);
        btn.innerHTML = `<i class="${isShowingIdentified ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'}" inert></i>`;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._onToggleIdentifiedView();
        });
        btn.addEventListener('dblclick', e => e.stopPropagation());
        btn.addEventListener('pointerdown', e => e.stopPropagation());
        header.prepend(btn);
      } else if (shouldShow && existingBtn) {
        // Update existing button
        const isShowingIdentified = this.sheetState.editorViewMode === 'identified';
        const icon = existingBtn.querySelector('i');
        if (icon) {
          icon.className = isShowingIdentified ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
        }
        existingBtn.dataset.tooltip = game.i18n.localize(isShowingIdentified ? 'D35E.Identified' : 'D35E.Unidentified');
        existingBtn.setAttribute('aria-label', existingBtn.dataset.tooltip);
        // Refresh tooltip if this button was clicked
        if (refreshTooltip) {
          game.tooltip.deactivate();
          game.tooltip.activate(existingBtn, { text: existingBtn.dataset.tooltip, direction: 'DOWN' });
        }
      } else if (!shouldShow && existingBtn) {
        existingBtn.remove();
      }
    }

    /**
     * Toggle edit mode and update header button.
     */
    protected _onToggleEditMode (): void {
      this.sheetState.editMode = !this.sheetState.editMode;
      this._renderHeaderButtons('editMode');
    }

    /**
     * Toggle identified/unidentified view and update header button.
     */
    protected _onToggleIdentifiedView (): void {
      this.sheetState.editorViewMode = this.sheetState.editorViewMode === 'identified' ? 'unidentified' : 'identified';
      this._renderHeaderButtons('identifiedView');
    }

    /**
     * Create the Vue app instance with document context
     */
    protected override _createVueApp (renderOptions: VueRenderOptions): App {
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
     * Update document context before base _replaceHTML handles mounting.
     */
    protected override async _replaceHTML (
      result: object,
      content: HTMLElement,
      options: VueRenderOptions
    ): Promise<void> {
      // Update context with current document state
      this.context.document = this.#document;
      this.context.appConfigOptions = this.options;

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
      this._renderHeaderButtons();
    }

    override async render (options?: boolean | DeepPartial<VueRenderOptions> | undefined): Promise<this> {
      return super.render(options);
    }
  }

  return VueApp;
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