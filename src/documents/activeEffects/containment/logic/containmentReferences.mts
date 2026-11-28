import type { Containment } from '@effects/containment/Containment.mjs';
import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import type { Container } from '@items/physical/container/Container.mjs';
import { requireWritableContainerPack } from '@items/physical/container/logic/containerContents.mjs';

import { findContainmentAeByItemUuid, hasContainmentContributionChanges, removeContainmentReference, syncContainmentAe } from './containmentAe.mjs';

type Reference = { sourceUuid: string; containerUuid: string };
const references = new Map<string, Reference>();
const queuedSources = new Set<string>();
let subscriptions: { hook: string; id: number }[] = [];
let pending = Promise.resolve();

function unregister (uuid: string): void {
  references.delete(uuid);
  if (references.size) return;
  for (const { hook, id } of subscriptions) Hooks.off(hook, id);
  subscriptions = [];
}

function enqueue (task: () => Promise<void>): void {
  // Serialize cascades; hooks fired by an AE write enqueue the next level rather than awaiting it.
  pending = pending.then(task).catch((error: unknown) => {
    Hooks.onError('Containment#syncReferences', error instanceof Error ? error : new Error(String(error)), {
      log: 'error', notify: 'error',
    });
  });
}

async function refreshReferences (
  sourceUuid: string,
  deletedSource?: PHYSICAL_ITEMS,
  deletedReferences?: [string, Reference][]
): Promise<void> {
  const entries = deletedReferences ?? [...references].filter(([, reference]) => reference.sourceUuid === sourceUuid);
  if (!entries.length) return;
  const source = deletedSource ?? await fromUuid<PHYSICAL_ITEMS>(sourceUuid);
  if (!deletedSource && !entries.some(([uuid]) => references.get(uuid)?.sourceUuid === sourceUuid)) return;
  if (!source) throw new Error(`Missing containment source ${sourceUuid}`);
  const failures: Error[] = [];
  for (const [uuid, reference] of entries) {
    if (!deletedSource && !references.has(uuid)) continue;
    try {
      const container = await fromUuid<Container>(reference.containerUuid);
      if (!deletedSource && references.get(uuid)?.sourceUuid !== sourceUuid) continue;
      if (!container) {
        if (!references.has(uuid)) continue;
        throw new Error(`Missing referencing container ${reference.containerUuid}`);
      }
      if (!findContainmentAeByItemUuid(container, sourceUuid)) continue;
      if (deletedSource) {
        if (container.pack) requireWritableContainerPack(container.pack);
        await removeContainmentReference(source, container);
      } else await syncContainmentAe(source, container);
    } catch (error: unknown) {
      failures.push(new Error(`Could not refresh ${reference.containerUuid}: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
  if (failures.length) throw new AggregateError(failures, failures.map(error => error.message).join('\n'));
}

function enqueueRefresh (sourceUuid: string): void {
  if (!queuedSources.has(sourceUuid) && [...references.values()].some(reference => reference.sourceUuid === sourceUuid)) {
    queuedSources.add(sourceUuid);
    enqueue(async () => {
      queuedSources.delete(sourceUuid);
      await refreshReferences(sourceUuid);
    });
  }
}

function subscribe (): void {
  const updateItem = Hooks.on('updateItem', (item, changed, _options, userId) => {
    if (userId === game.user.id && item.pack && hasContainmentContributionChanges(item.type, changed)) {
      enqueueRefresh(item.uuid);
    }
  });
  const effectChanged = (effect: foundry.documents.ActiveEffect, userId: string): void => {
    const parent = effect.parent;
    if (userId === game.user.id && parent?.documentName === 'Item' && parent.pack) {
      enqueueRefresh(parent.uuid);
    }
  };
  subscriptions = [
    { hook: 'updateItem', id: updateItem },
    { hook: 'createActiveEffect', id: Hooks.on('createActiveEffect', (effect, _options, userId) => {
      effectChanged(effect, userId);
    }) },
    { hook: 'updateActiveEffect', id: Hooks.on('updateActiveEffect', (effect, _changed, _options, userId) => {
      if (effect instanceof foundry.documents.ActiveEffect && typeof userId === 'string') {
        effectChanged(effect, userId);
      }
    }) },
    { hook: 'deleteActiveEffect', id: Hooks.on('deleteActiveEffect', (effect, _options, userId) => {
      if (effect.uuid) unregister(effect.uuid);
      effectChanged(effect, userId);
    }) },
    { hook: 'deleteItem', id: Hooks.on('deleteItem', (item, _options, userId) => {
      for (const [uuid, reference] of references) {
        if (reference.containerUuid === item.uuid) unregister(uuid);
      }
      const deletedReferences = [...references].filter(([, reference]) => reference.sourceUuid === item.uuid);
      for (const [uuid] of deletedReferences) unregister(uuid);
      if (item.pack && userId === game.user.id) {
        enqueue(() => refreshReferences(item.uuid, item as PHYSICAL_ITEMS, deletedReferences));
      }
    }) },
  ];
}

/** UUID-only registrations survive pack cache eviction without retaining source documents. */
export function registerContainmentReference (effect: Containment): { cancel: () => void } {
  const uuid = effect.uuid;
  const containerUuid = effect.parent?.uuid;
  const sourceUuid = effect.system.sourceItemUuid;
  if (!uuid || !containerUuid || !sourceUuid) {
    throw new Error('Containment reference requires persisted source, container, and effect UUIDs');
  }
  const reference: Reference = {
    sourceUuid,
    containerUuid,
  };
  references.set(uuid, reference);
  if (!subscriptions.length) subscribe();
  if (game.user?.isGM) enqueueRefresh(sourceUuid);
  return { cancel: () => {
    if (references.get(uuid) === reference) unregister(uuid);
  } };
}
