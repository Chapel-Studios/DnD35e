/**
 * Vue mixin for ApplicationV2-based Promise-resolving dialogs (confirm/prompt-style),
 * as opposed to VueSettingsMixin's persistent settings-form apps.
 *
 * The Vue component receives `context.data` (reactive — bind directly with v-model) plus
 * `context.resolve(result)` / `context.cancel()`. Both close the dialog; closing via the
 * window's own close button (or any other path that skips resolve/cancel) settles the
 * promise with `null` instead of leaving callers hanging.
 */

import type { App } from 'vue';
import { createApp, reactive } from 'vue';

import { useVueAppBaseMixin, type VueAppBaseMembers, type VueBaseRenderOptions } from './VueAppBaseMixin.mjs';

/** Reactive context passed to Vue dialog components. */
interface VueDialogContext<TData extends object = object, TResult = unknown> {
  /** The reactive input data (e.g. dialog field values) — bind directly with v-model. */
  data: TData;
  renderOptions?: VueBaseRenderOptions;
  /** Resolve the dialog's result promise with `result` and close the dialog. */
  resolve: (result: TResult) => void;
  /** Resolve the dialog's result promise with `null` and close the dialog. */
  cancel: () => void;
}

/** Interface describing members added by VueDialogMixin. */
interface VueDialogMembers<TData extends object = object, TResult = unknown> extends VueAppBaseMembers {
  context: VueDialogContext<TData, TResult>;
  reactiveData: TData;
  /** Resolves once the dialog is settled via `context.resolve()`, `context.cancel()`, or close. */
  resultPromise: Promise<TResult | null>;
}

function useVueDialogMixin<
  TBase extends AbstractConstructorOf<foundry.applications.api.ApplicationV2>,
  TData extends object = object,
  TResult = unknown
>(base: TBase) {
  const VueAppBase = useVueAppBaseMixin(base);

  abstract class VueDialogApp extends VueAppBase {
    protected context!: VueDialogContext<TData, TResult>;
    protected reactiveData!: TData;
    protected resultPromise: Promise<TResult | null>;

    #resolvePromise!: (value: TResult | null) => void;
    #settled = false;

    constructor(...args: any[]) {
      super(...args);

      this.resultPromise = new Promise<TResult | null>((resolve) => {
        this.#resolvePromise = resolve;
      });

      this.context = reactive({
        data: {} as TData,
        resolve: (result: TResult) => this.#settle(result),
        cancel: () => this.#settle(null),
      }) as VueDialogContext<TData, TResult>;
    }

    /**
     * Initialize the reactive input data. Subclasses call this in their constructor.
     */
    protected initializeReactiveData(data: TData): void {
      this.reactiveData = reactive(data) as TData;
      this.context.data = this.reactiveData;
    }

    #settle(result: TResult | null, isClosing = false): void {
      if (this.#settled) return;
      this.#settled = true;
      this.#resolvePromise(result);
      if (!isClosing) {
        void this.close(undefined, true);
      }
    }

    protected override _createVueApp(renderOptions: VueBaseRenderOptions): App {
      const contextData: VueDialogContext<TData, TResult> = { ...this.context, renderOptions };
      return createApp(this.vueComponent, { context: contextData });
    }

    override async close(
      options?: foundry.applications.ApplicationClosingOptions,
      isSettling = false
    ): Promise<foundry.applications.api.ApplicationV2> {
      if (!isSettling) {
        // Window closed (e.g. X button) without an explicit resolve/cancel — settle with null.
        this.#settle(null, true);
      }
      return super.close(options);
    }
  }

  return VueDialogApp;
}

type VueDialogMixin<
  TBase extends AbstractConstructorOf<foundry.applications.api.ApplicationV2>,
  TData extends object = object,
  TResult = unknown
> = TBase & AbstractConstructorOf<VueDialogMembers<TData, TResult>>;

export { useVueDialogMixin };
export type {
  VueDialogContext,
  VueDialogMembers,
  VueDialogMixin,
};
