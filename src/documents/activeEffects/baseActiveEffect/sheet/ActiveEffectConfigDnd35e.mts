import { VueActiveEffectConfig } from '@vueApps/VueActiveEffectConfig.mjs';

import type { EffectChangeDataDnd35e } from '../data/ActiveEffectSystemData.mjs';


abstract class ActiveEffectConfigDnd35e extends VueActiveEffectConfig {

  override async close(
    options?: foundry.applications.ApplicationClosingOptions
  ): Promise<foundry.applications.api.ApplicationV2> {
    const changes: EffectChangeDataDnd35e[] = this.document.system?.changes ?? [];
    const emptyIndices: number[] = [];
    const incompleteIndices: number[] = [];

    for (let i = 0; i < changes.length; i++) {
      const c = changes[i];
      if (c.isSystem) continue;
      const keyBlank = !c.key?.trim();
      const valueBlank = !c.value || (typeof c.value === 'string' && !c.value.trim());

      if (keyBlank && valueBlank) {
        emptyIndices.push(i);
      } else if (keyBlank) {
        incompleteIndices.push(i);
      }
    }

    const toRemove = [...emptyIndices];

    if (incompleteIndices.length > 0) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize('EFFECT.TABS.changes') },
        content: `<p>${game.i18n.localize('dnd35e.EFFECT.IncompleteChangesWarning')}</p>`,
        yes: { label: game.i18n.localize('dnd35e.COMMON.Discard') },
        no: { label: game.i18n.localize('Cancel') },
      });

      if (!confirmed) return this as unknown as foundry.applications.api.ApplicationV2;
      toRemove.push(...incompleteIndices);
    }

    if (toRemove.length > 0) {
      // Remove highest indices first to avoid shifting
      const sorted = [...toRemove].sort((a, b) => b - a);
      const updatedChanges = [...changes];
      for (const idx of sorted) updatedChanges.splice(idx, 1);
      await this.document.update({ system: { changes: updatedChanges } }, { diff: false });
    }

    return super.close(options);
  }
}

export {
  ActiveEffectConfigDnd35e,
};
