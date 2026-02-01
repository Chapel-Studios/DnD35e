import { type ItemDnd35e } from "./baseItem/ItemDnd35e.mjs";
const documentClasses = new Map<string, ItemDnd35e>();
export function registerItemType<TItem extends ItemDnd35e>(type: string, cls: TItem) {
  documentClasses.set(type, cls);
}
export function getItemClass(type: string) {
  return documentClasses.get(type);
}
export function listItemTypes(): string[] {
  return [...documentClasses.keys()];
}