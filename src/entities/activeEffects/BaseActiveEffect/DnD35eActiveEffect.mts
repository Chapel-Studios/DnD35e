type DnD35eActiveEffectFlags<T extends object = Record<string, unknown>> = Record<string, Record<string, unknown>> & {
  dnd35e: T;
};

abstract class DnD35eActiveEffect extends foundry.documents.ActiveEffect {
  declare flags: DnD35eActiveEffectFlags;
}

export { DnD35eActiveEffect };
export type { DnD35eActiveEffectFlags };
