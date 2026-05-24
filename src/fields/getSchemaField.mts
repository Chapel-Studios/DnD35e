/**
 * Look up a schema field on a document by its dotted path.
 *
 * Only `system.*` paths resolve to a schema field. Any other path returns
 * `undefined`, so call sites can use this unconditionally when they don't
 * know which subtree the path targets.
 *
 * @param document - The document whose `system` DataModel will be inspected.
 * @param fieldPath - Dotted path, e.g. `"system.hp.max"`.
 */
export function getSchemaField(
  document: { system?: unknown } | null | undefined,
  fieldPath: string
): foundry.data.fields.DataField | undefined {
  if (!fieldPath.startsWith('system.')) return undefined;
  const systemPath = fieldPath.replace(/^system\./, '');
  const systemModel = document?.system as foundry.abstract.DataModel | undefined;
  // SchemaField.getField() is a public Foundry runtime method but not yet reflected in
  // the FoundryVTT TypeScript stubs. Cast through `any` to access it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schema: { getField?: (path: string) => foundry.data.fields.DataField | undefined } | undefined =
    (systemModel?.constructor as any)?.schema ?? (systemModel as any)?.schema;
  return schema?.getField?.(systemPath);
}
