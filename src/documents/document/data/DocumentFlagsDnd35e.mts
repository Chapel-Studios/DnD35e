import type { FieldOverrides } from '@vc/fields/formGroups/fieldPermissions.mjs';

/**
 * Base flags structure shared across all D&D 3.5e documents.
 * Use this as the base for Items, Actors, and ActiveEffects.
 */
interface Dnd35eBaseFlags {
  [key: string]: unknown;
  /** Per-field visibility/editability overrides set by GMs */
  fieldOverrides?: FieldOverrides;
}

/**
 * Generic document flags type that includes dnd35e namespace with optional extensions.
 * @template T - Additional dnd35e-specific flags to include
 */
type DocumentFlagsDnd35e<T extends object = object> = Record<string, Record<string, unknown>> & {
  dnd35e: Dnd35eBaseFlags & T;
};


export type {
  Dnd35eBaseFlags,
  DocumentFlagsDnd35e,
};
