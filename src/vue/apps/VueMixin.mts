import type { ApplicationRenderContext, ApplicationRenderOptions } from '@client/applications/_types.mjs';
import type { ApplicationV2, DocumentSheetV2 } from '@client/applications/api/_module.mjs';
import type { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import type { App, Component } from 'vue';
import { createApp, reactive } from 'vue';

import type { SheetState, VueApplicationConfiguration, VueApplicationContext, VueRenderOptions } from './VueAppTypes.mjs';


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

    /**
     * Called after rendering. Adds header buttons to the window header.
     */
    protected override async _onRender (
      context: ApplicationRenderContext,
      options: ApplicationRenderOptions,
    ): Promise<void> {
      await super._onRender(context, options);
      this._renderHeaderButtons();
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

