import type { InjectionKey, ShallowRef } from 'vue';

type DocumentSheetChrome = {
  verticalTabHost: ShallowRef<HTMLElement | null>;
};

const DocumentSheetChromeSymbol: InjectionKey<DocumentSheetChrome> = Symbol('DocumentSheetChrome');

export {
  DocumentSheetChromeSymbol,
};

export type {
  DocumentSheetChrome,
};