/**
 * Persisted source shape for identifiable documents.
 * Currently empty — all identifiable state is derived at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface IdentifiableDocumentSystemSource {}

/**
 * Runtime identifiable properties added by {@link IdentifiableSchemaMixin}.
 * These are NOT persisted — isIdentifiable is a getter, isIdentified is derived.
 */
interface IdentifiableDocumentSystemData extends IdentifiableDocumentSystemSource {
  readonly isIdentifiable: boolean;
  isIdentified: boolean;
}

export type {
  IdentifiableDocumentSystemData,
  IdentifiableDocumentSystemSource,
};
