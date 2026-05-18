import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { ActiveEffectConfigDnd35e } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigDnd35e.mjs';
import type { Secret } from '@effects/secret/Secret.mjs';

import SecretSheetVue from './SecretSheet.vue';

type SecretSheetConfig = DocumentSheetConfiguration<Secret>;
type SecretSheetRenderContext = {
  document: Secret;
};

class SecretSheet extends ActiveEffectConfigDnd35e {
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
