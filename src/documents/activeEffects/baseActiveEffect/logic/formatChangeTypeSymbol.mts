import { EFFECT_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';

/**
 * Compact glyph for a change's type, shown next to its value in effect-summary UI
 * (e.g. `HasActiveEffectsNotification`'s field tooltip, `SystemEffectRow`'s expanded
 * change list). Kept as a single shared helper so every read-only change display uses
 * the same symbol for the same type.
 */
function formatChangeTypeSymbol(type: string): string {
  switch (type) {
    case EFFECT_CHANGE_TYPE.ADD: return '+';
    case EFFECT_CHANGE_TYPE.MULTIPLY: return '×';
    case EFFECT_CHANGE_TYPE.OVERRIDE: return '=';
    case EFFECT_CHANGE_TYPE.UPGRADE: return '↑';
    case EFFECT_CHANGE_TYPE.DOWNGRADE: return '↓';
    default: return type;
  }
}

export { formatChangeTypeSymbol };
