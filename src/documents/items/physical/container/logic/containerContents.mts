import { containmentEffectType } from '@effects/containment/containmentEffectType.mjs';
import { containerItemType, PHYSICAL_ITEM_TYPES, type PhysicalItemType } from '@items/itemTypes.mjs';
import type { PhysicalItemLike } from '@items/physical/physicalItem/index.mjs';

export type ContainerCopyOptions = {
  fromCompendium?: boolean;
  containerCopiesConfirmed?: boolean;
};

type CopyDestination = ContainerCopyOptions & {
  parent?: { uuid: string | null; pack?: string | null } | null;
  pack?: string | null;
  keepId?: boolean;
};

type ContentsNode = {
  source: Record<string, unknown>;
  children: { effect: Record<string, unknown>; item: PhysicalItemLike; node: ContentsNode }[];
};

export function containmentError (key: string, data: Record<string, string | number | boolean | null | undefined> = {}): never {
  const message = game.i18n.format(`dnd35e.CONTAINER.warnings.${key}`, data);
  ui.notifications.error(message);
  throw new Error(message);
}

async function readContents (
  source: Record<string, unknown>,
  ancestors: Set<string>,
  forbiddenUuid?: string
): Promise<ContentsNode> {
  const node: ContentsNode = { source, children: [] };
  if (source.type !== containerItemType) return node;
  const effects = source.effects;
  if (!Array.isArray(effects)) return node;
  for (const effect of effects) {
    if (!effect || typeof effect !== 'object' || effect.type !== containmentEffectType) continue;
    const uuid = foundry.utils.getProperty(effect, 'system.sourceItemUuid');
    if (typeof uuid !== 'string' || !uuid) containmentError('missingContents', { uuid: String(uuid ?? '') });
    if (uuid === forbiddenUuid || ancestors.has(uuid)) containmentError('cyclicContents');
    const item = await fromUuid<PhysicalItemLike>(uuid);
    if (!item || !PHYSICAL_ITEM_TYPES.has(item.type as PhysicalItemType)) {
      containmentError('missingContents', { uuid });
    }
    const child = await readContents(item.toObject() as Record<string, unknown>, new Set([...ancestors, uuid]), forbiddenUuid);
    node.children.push({ effect: effect as Record<string, unknown>, item, node: child });
  }
  return node;
}

export async function validateContainerInsertion (item: PhysicalItemLike, targetUuid: string): Promise<void> {
  if (item.uuid === targetUuid) containmentError('cyclicContents');
  await readContents(item.toObject() as Record<string, unknown>, new Set([item.uuid]), targetUuid);
}

export function requireWritableContainerPack (packId: string): void {
  const pack = game.packs.get(packId);
  if (!pack || pack.locked) containmentError('lockedDestination', { pack: packId });
}

export async function confirmWorldContentsCopy (packId: string): Promise<boolean> {
  requireWritableContainerPack(packId);
  return foundry.applications.api.DialogV2.confirm({
    window: { title: 'dnd35e.CONTAINER.copyContentsTitle' },
    content: game.i18n.format('dnd35e.CONTAINER.copyContentsContent', {
      pack: game.packs.get(packId)!.title,
    }),
  });
}

/**
 * Prepare complete, independent contents before the root is persisted. Undefined
 * means ordinary creation; null means the user cancelled the whole operation.
 */
export async function prepareContainerContents (
  sources: Record<string, unknown>[],
  destination: CopyDestination
): Promise<{ sources: Record<string, unknown>[]; rootCount: number } | null | undefined> {
  if (!sources.some(source => source.type === containerItemType)) return undefined;
  if (destination.parent && !destination.parent.uuid) containmentError('missingDestination');
  const pack = destination.pack ?? destination.parent?.pack;
  const uuidFor = (id: string): string => destination.parent
    ? `${destination.parent.uuid}.Item.${id}`
    : pack
      ? `Compendium.${pack}.Item.${id}`
      : `Item.${id}`;
  const plans: { node: ContentsNode; instantiate: boolean }[] = [];
  let needsPreparation = false;
  let hasWorldCopies = false;
  for (const source of sources) {
    const cloned = foundry.utils.deepClone(source);
    const sourceUuid = foundry.utils.getProperty(source, '_stats.compendiumSource');
    const instantiate = !!destination.parent || (!pack && (
      !!destination.fromCompendium || typeof sourceUuid === 'string'
    ));
    if (!destination.parent && destination.keepId && !('folder' in cloned) && typeof source._id === 'string') {
      const existing = pack
        ? await game.packs.get(pack)?.getDocument(source._id)
        : game.items.get(source._id);
      if (existing) cloned.folder = existing.toObject().folder;
    }
    const ancestors = new Set(typeof sourceUuid === 'string' ? [sourceUuid] : []);
    if (destination.keepId && typeof source._id === 'string') ancestors.add(uuidFor(source._id));
    const node = await readContents(cloned, ancestors);
    plans.push({ node, instantiate });
    hasWorldCopies ||= !!pack && !destination.parent && node.children.some(child => !child.item.pack);
    needsPreparation ||= node.children.some(child => instantiate || (!!pack && !child.item.pack))
      || (!!(instantiate || pack) && !!foundry.utils.getProperty(source, 'system.containerUuid'));
  }
  if (!needsPreparation) return undefined;
  if (pack && !destination.parent) {
    requireWritableContainerPack(pack);
    if (hasWorldCopies && !destination.containerCopiesConfirmed && !await confirmWorldContentsCopy(pack)) return null;
  }

  const roots = plans.map(({ node }) => node.source);
  const contents: Record<string, unknown>[] = [];
  const expand = (node: ContentsNode, uuid: string, instantiate: boolean, folder: unknown, carried: unknown): void => {
    for (const { effect, item, node: child } of node.children) {
      if (!instantiate && item.pack) continue;
      const id = foundry.utils.randomID();
      const childUuid = uuidFor(id);
      child.source._id = id;
      child.source.folder = destination.parent ? null : folder ?? null;
      child.source.ownership = foundry.utils.deepClone(node.source.ownership);
      foundry.utils.setProperty(child.source, 'system.containerUuid', pack && !destination.parent ? null : uuid);
      foundry.utils.setProperty(child.source, 'system.isCarried', carried);
      if (foundry.utils.hasProperty(child.source, 'system.equippedSlotIds')) {
        foundry.utils.setProperty(child.source, 'system.equippedSlotIds', []);
      }
      foundry.utils.setProperty(effect, 'system.sourceItemUuid', childUuid);
      effect.name = `item-contribution-${id}`;
      contents.push(child.source);
      expand(child, childUuid, instantiate, folder, carried);
    }
  };
  for (const { node, instantiate } of plans) {
    const id = destination.keepId && typeof node.source._id === 'string'
      ? node.source._id
      : foundry.utils.randomID();
    node.source._id = id;
    if (PHYSICAL_ITEM_TYPES.has(node.source.type as PhysicalItemType) && (instantiate || pack)) {
      foundry.utils.setProperty(node.source, 'system.containerUuid', null);
    }
    expand(node, uuidFor(id), instantiate, node.source.folder, foundry.utils.getProperty(node.source, 'system.isCarried'));
  }
  return { sources: [...roots, ...contents], rootCount: roots.length };
}
