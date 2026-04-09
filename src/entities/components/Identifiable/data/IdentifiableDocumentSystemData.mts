/**
 * Flat identifiable system data matching {@link IdentifiableSchemaMixin}.
 */
interface IdentifiableDocumentSystemSource {
  isIdentifiable: boolean;
  isIdentified: boolean;
}

type IdentifiableDocumentSystemData = IdentifiableDocumentSystemSource;

export type {
  IdentifiableDocumentSystemData,
  IdentifiableDocumentSystemSource,
};
