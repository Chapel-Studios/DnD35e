import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { Dnd35eActiveEffectConfig } from '@effects/BaseActiveEffect/sheet/Dnd35eActiveEffectConfig.mjs';
import type { Secret } from '@effects/secret/Secret.mjs';

import SecretSheetVue from './SecretSheet.vue';

type SecretSheetConfig = DocumentSheetConfiguration<Secret>;
type SecretSheetRenderContext = {
  document: Secret;
};

class SecretSheet extends Dnd35eActiveEffectConfig {
  get vueComponent () {
    return SecretSheetVue;
  }
}

export {
  SecretSheet,
};

export type {
  SecretSheetConfig,
  SecretSheetRenderContext,
};
