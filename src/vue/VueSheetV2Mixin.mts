import { createApp, reactive } from "vue";
import type { App, Component } from "vue";

export function VueSheetV2Mixin<BaseT extends AbstractConstructorOf<fa.api.ApplicationV2> & {
// export function VueSheetV2Mixin<BaseT extends AbstractConstructorOf<fa.api.DocumentSheetV2> & {
  DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration>;
}>(Base: BaseT) {
  abstract class VueSheetV2 extends Base {
    vueApp: App | null = null;
    vueRoot: HTMLElement | null = null;
    context: any;

    static get vueComponent(): Component { throw new Error("Not implemented"); }

    private handleFirstRender(
      result: any,
      content: HTMLElement,
      options: fa.ApplicationRenderOptions
    ) {
      const Component = (this as any).constructor.vueComponent;

      // Create a persistent mount node
      this.vueRoot = document.createElement("div");
      this.vueRoot.classList.add("vue-root");

      // Insert into Foundry's content
      content.appendChild(this.vueRoot);

      // Create Vue app
      this.vueApp = createApp(Component, {
        context: { ...result, renderOptions: options },
      });

      // Mount Vue into the stable root
      this.vueApp.mount(this.vueRoot);
      return;
    }

    protected override async _replaceHTML(
      result: any,
      content: HTMLElement,
      options: fa.ApplicationRenderOptions,
    ): Promise<void> {
      // if (options.isFirstRender) {
      //   this.handleFirstRender(result, content, options);
      // }

      // // Subsequent renders: Foundry replaced `.window-content`
      // // but we keep our vueRoot alive and reattach it
      // if (this.vueRoot) {
      //   content.appendChild(this.vueRoot);
      // }

      // // Update props on the existing Vue instance
      // const instance = this.vueApp?._instance;
      // if (instance?.proxy) {
      //   Object.assign(instance.proxy.$props, {
      //     context: { ...result, renderOptions: options },
      //   });
      // }
      // else debugger;

      if (!this.vueApp) {
        const root = content.querySelector(".vue-root");
        const Component = (this as any).constructor.vueComponent;
        this.vueApp = createApp(Component, { context: this.context });
        this.vueApp.mount(root)
      } else {
        Object.assign(this.context.renderOptions, options);
      }
    }

    declare _vueUpdateHookAttached: boolean;

    protected override async _renderHTML(
        context: any,
    ) {
      if (!this.context) { 
        this.context = reactive(context);
      }
      else {
        Object.assign(this.context, context);
      }

      return `<div class="vue-wrapper"><div class="vue-root"></div></div>`;
    }


    protected override async _onClose(options: fa.ApplicationClosingOptions) {
      if (this.vueApp) {
        this.vueApp.unmount();
        this.vueApp = null;
        this.vueRoot = null;
      }
      super._onClose(options);
    }
  };

  return VueSheetV2;
};

