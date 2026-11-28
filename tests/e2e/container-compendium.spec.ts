import type { Container } from '@items/physical/container/Container.mjs';
import type { PhysicalItemLike } from '@items/physical/physicalItem/index.mjs';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearWorld, createActor, createItem, stowItemViaDrop, updateDocument } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

const packs: string[] = [];

async function createPack (page: Page, label: string): Promise<string> {
  const id = await page.evaluate(async label => {
    const create = foundry.documents.collections.CompendiumCollection.createCompendium;
    // Core accepts creation metadata; the declaration requires the fully-populated metadata.
    const pack = await create.call(foundry.documents.collections.CompendiumCollection,
      { label, type: 'Item' } as Parameters<typeof create>[0]);
    if (!pack) throw new Error('Could not create container test compendium');
    await pack.configure({ locked: false });
    return pack.collection;
  }, label);
  packs.push(id);
  return id;
}

async function exportItem (page: Page, uuid: string, packId: string): Promise<string | null> {
  return page.evaluate(async ({ uuid, packId }) => {
    const item = await fromUuid<PhysicalItemLike>(uuid);
    const pack = game.packs.get(packId);
    if (!item || !pack) throw new Error('Missing container export fixture');
    const copied = await pack.importDocument(item as Parameters<typeof pack.importDocument>[0]);
    return copied?.uuid ?? null;
  }, { uuid, packId });
}

async function readContents (page: Page, uuid: string) {
  return page.evaluate(async uuid => {
    const container = await fromUuid<Container>(uuid);
    if (!container) throw new Error(`Missing container ${uuid}`);
    const contents = await container.getContents();
    return contents.map(item => ({
      uuid: item.uuid, pack: item.pack, containerUuid: item.system.containerUuid,
      quantity: item.system.quantity, folder: item._source.folder,
    }));
  }, uuid);
}

async function readItemSystem (page: Page, uuid: string) {
  return page.evaluate(async uuid => {
    const item = await fromUuid<PhysicalItemLike>(uuid);
    if (!item) throw new Error(`Missing template ${uuid}`);
    return item.toObject().system;
  }, uuid);
}

async function readRollups (page: Page, uuids: string[], probeUuid: string) {
  return page.evaluate(async ({ uuids, probeUuid }) => {
    const probe = await fromUuid<PhysicalItemLike>(probeUuid);
    if (!probe) throw new Error('Missing capacity probe');
    return Promise.all(uuids.map(async uuid => {
      const bag = await fromUuid<Container>(uuid);
      if (!bag) throw new Error(`Missing rollup fixture ${uuid}`);
      return {
        count: bag.system.contentsCount, weight: bag.system.contentsWeight,
        value: bag.system.contentsValue.srdEquivalent, acceptsProbe: bag.canAddItemToContents(probe),
      };
    }));
  }, { uuids, probeUuid });
}

async function answerCopyDialog (page: Page, answer: 'yes' | 'no'): Promise<void> {
  const button = page.locator(`.dialog button[data-action="${answer}"]`);
  await expect(button).toBeVisible();
  await button.click();
}

test.afterEach(async ({ page }) => {
  await closeAllSheets(page);
  await clearWorld(page);
  for (const id of packs.splice(0)) {
    await page.evaluate(async id => {
      const pack = game.packs.get(id);
      if (!pack) throw new Error(`Missing test pack during cleanup: ${id}`);
      await pack.configure({ locked: false });
      await pack.deleteCompendium();
    }, id);
  }
});

test('GM references locked compendium ammunition in world and pack bags without modifying the template', async ({ page }) => {
  await gotoGame(page);
  const sourcePack = await createPack(page, 'Container source templates');
  const destinationPack = await createPack(page, 'Container destination templates');
  const ammo = await createItem(page, 'ammo', { name: 'Twenty arrows', system: { quantity: 20, weight: 0.1 } });
  const template = (await exportItem(page, ammo, sourcePack))!;
  const worldBag = await createItem(page, 'container', { name: 'World quiver' });
  const packBag = (await exportItem(page, worldBag, destinationPack))!;
  const originalSystem = await readItemSystem(page, template);
  await page.evaluate(async id => { await game.packs.get(id)!.configure({ locked: true }); }, sourcePack);
  await stowItemViaDrop(page, template, worldBag);
  await stowItemViaDrop(page, template, packBag);
  await expect.poll(() => readContents(page, worldBag)).toEqual([
    expect.objectContaining({ uuid: template, quantity: 20 }),
  ]);
  expect(await readContents(page, packBag)).toEqual([
    expect.objectContaining({ uuid: template, quantity: 20 }),
  ]);
  await page.evaluate(({ sourcePack, template }) => {
    const pack = game.packs.get(sourcePack);
    if (!pack) throw new Error('Missing source pack for cold-cache inventory test');
    pack.clear();
    if (fromUuidSync(template) instanceof Item) throw new Error('Source template is still cached');
  }, { sourcePack, template });
  const sheet = page.locator(await openDocumentSheet(page, worldBag));
  await dismissOverlays(page);
  await sheet.locator('[data-tab="inventory"]').click();
  const row = sheet.locator(`.inventory-row[data-container-uuid="${template}"]`);
  await expect(row).toBeVisible();
  await expect(row.locator('.destroy-item-btn')).toHaveCount(0);
  await row.locator('.carry-toggle').click();
  await expect.poll(() => readContents(page, worldBag)).toEqual([]);
  expect(await readContents(page, packBag)).toHaveLength(1);
  expect(await readItemSystem(page, template)).toEqual(originalSystem);
});

test('GM drops a container template into a cold-cache compendium inventory target', async ({ page }) => {
  await gotoGame(page);
  const packId = await createPack(page, 'Cold-cache container targets');
  const source = await createItem(page, 'container', { name: 'Nested bag' });
  const template = (await exportItem(page, source, packId))!;
  const originalSystem = await readItemSystem(page, template);
  const target = await createItem(page, 'container', { name: 'Target bag' });
  const packBag = (await exportItem(page, target, packId))!;
  const root = await createItem(page, 'container', { name: 'World root' });
  await stowItemViaDrop(page, packBag, root);
  const sheet = page.locator(await openDocumentSheet(page, root));
  await dismissOverlays(page);
  await sheet.locator('[data-tab="inventory"]').click();
  await sheet.locator(`.inventory-row[data-container-uuid="${packBag}"] .container-expand-btn`).click();
  const zone = sheet.locator('.contained-item-row .inventory-drop-zone');
  await expect(zone).toBeVisible();
  await page.evaluate(({ packId, packBag }) => {
    const pack = game.packs.get(packId);
    if (!pack) throw new Error('Missing destination pack for cold-cache drop test');
    pack.clear();
    if (fromUuidSync(packBag) instanceof Item) throw new Error('Target container is still cached');
  }, { packId, packBag });

  await zone.evaluate((element, uuid) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', JSON.stringify({ type: 'Item', uuid }));
    element.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }));
  }, template);

  await expect(sheet.locator(`.inventory-row[data-container-uuid="${template}"]`)).toBeVisible();
  await expect.poll(() => readContents(page, packBag)).toEqual([
    expect.objectContaining({ uuid: template }),
  ]);
  expect(await readItemSystem(page, template)).toEqual(originalSystem);
});

test('GM edits a cold-cache pack source and every referencing bag and ancestor receives current contributions', async ({ page }) => {
  await gotoGame(page);
  const pack = await createPack(page, 'Live source contributions');
  const ammo = await createItem(page, 'ammo', {
    name: 'Template arrows',
    system: { quantity: 20, weight: 0.1, price: { stacks: [{ coinId: 'srd_gp', count: 1 }] } },
  });
  const template = (await exportItem(page, ammo, pack))!;
  const direct = await createItem(page, 'container', { name: 'Direct reference' });
  const inner = await createItem(page, 'container', { name: 'Pack inner', system: { weight: 1 } });
  const innerTemplate = (await exportItem(page, inner, pack))!;
  const root = await createItem(page, 'container', { name: 'World root', system: { weight: 2 } });
  const outer = await createItem(page, 'container', { name: 'Shared ancestor' });
  const probe = await createItem(page, 'ammo', { name: 'Probe', system: { weight: 1 } });
  await stowItemViaDrop(page, template, direct);
  const dormant = (await exportItem(page, direct, pack))!;
  await stowItemViaDrop(page, template, innerTemplate);
  await stowItemViaDrop(page, innerTemplate, root);
  await stowItemViaDrop(page, root, outer);
  await stowItemViaDrop(page, direct, outer);
  await updateDocument(page, outer, { system: { maxContentWeight: 9.5 } });
  const uuids = [direct, innerTemplate, root, outer];
  const state = () => readRollups(page, uuids, probe);
  await expect.poll(state).toEqual([
    { count: 20, weight: 2, value: 20, acceptsProbe: true },
    { count: 20, weight: 2, value: 20, acceptsProbe: true },
    { count: 1, weight: 3, value: 20, acceptsProbe: true },
    { count: 2, weight: 7, value: 40, acceptsProbe: true },
  ]);
  const original = await readItemSystem(page, template);
  await closeAllSheets(page);
  await gotoGame(page);
  await expect.poll(state).toEqual([
    { count: 20, weight: 2, value: 20, acceptsProbe: true },
    { count: 20, weight: 2, value: 20, acceptsProbe: true },
    { count: 1, weight: 3, value: 20, acceptsProbe: true },
    { count: 2, weight: 7, value: 40, acceptsProbe: true },
  ]);
  await page.evaluate(uuid => {
    if (fromUuidSync(uuid) instanceof Item) throw new Error('Dormant pack target was unexpectedly loaded');
  }, dormant);
  await page.evaluate(({ pack, template, innerTemplate }) => {
    game.packs.get(pack)!.clear();
    if (fromUuidSync(template) instanceof Item || fromUuidSync(innerTemplate) instanceof Item) {
      throw new Error('Contribution fixtures were not evicted');
    }
  }, { pack, template, innerTemplate });
  await updateDocument(page, template, { system: { quantity: 30 } });
  await expect.poll(state).toEqual([
    { count: 30, weight: 3, value: 30, acceptsProbe: true },
    { count: 30, weight: 3, value: 30, acceptsProbe: true },
    { count: 1, weight: 4, value: 30, acceptsProbe: true },
    { count: 2, weight: 9, value: 60, acceptsProbe: false },
  ]);
  await expect.poll(() => readRollups(page, [dormant], probe)).toEqual([
    { count: 30, weight: 3, value: 30, acceptsProbe: true },
  ]);
  await updateDocument(page, template, { system: {
    weight: 0.2, price: { stacks: [{ coinId: 'srd_gp', count: 2 }] },
  } });
  await expect.poll(state).toEqual([
    { count: 30, weight: 6, value: 60, acceptsProbe: true },
    { count: 30, weight: 6, value: 60, acceptsProbe: true },
    { count: 1, weight: 7, value: 60, acceptsProbe: true },
    { count: 2, weight: 15, value: 120, acceptsProbe: false },
  ]);
  await expect.poll(() => readRollups(page, [dormant], probe)).toEqual([
    { count: 30, weight: 6, value: 60, acceptsProbe: true },
  ]);
  const current = await readItemSystem(page, template);
  const unchangedData = (data: typeof original) => Object.fromEntries(
    Object.entries(data).filter(([key]) => !['quantity', 'weight', 'price'].includes(key))
  );
  expect(unchangedData(current)).toEqual(unchangedData(original));
});

test('GM edits referenced currency settings, preserves locked targets, and removes update subscriptions with membership', async ({ page }) => {
  await gotoGame(page);
  const pack = await createPack(page, 'Currency source contributions');
  const destinationPack = await createPack(page, 'Currency destination contributions');
  const currency = await createItem(page, 'container', {
    name: 'Currency template', system: {
      weight: 1, allowsCurrency: true, containedCurrency: { stacks: [{ coinId: 'srd_gp', count: 50 }] },
    },
  });
  const template = (await exportItem(page, currency, pack))!;
  const direct = await createItem(page, 'container', { name: 'Currency direct' });
  const inner = await createItem(page, 'container', { name: 'Currency pack parent', system: { weight: 2 } });
  const innerTemplate = (await exportItem(page, inner, destinationPack))!;
  const root = await createItem(page, 'container', { name: 'Currency world ancestor' });
  const probe = await createItem(page, 'ammo', { name: 'Currency probe', system: { weight: 1 } });
  await stowItemViaDrop(page, template, direct);
  await stowItemViaDrop(page, template, innerTemplate);
  await stowItemViaDrop(page, innerTemplate, root);
  await updateDocument(page, root, { system: { maxContentWeight: 4.5 } });
  const state = () => readRollups(page, [direct, innerTemplate, root], probe);
  const enabled = [
    { count: 1, weight: 2, value: 50, acceptsProbe: true },
    { count: 1, weight: 2, value: 50, acceptsProbe: true },
    { count: 1, weight: 4, value: 50, acceptsProbe: false },
  ];
  const disabled = [
    { count: 1, weight: 1, value: 0, acceptsProbe: true },
    { count: 1, weight: 1, value: 0, acceptsProbe: true },
    { count: 1, weight: 3, value: 0, acceptsProbe: true },
  ];
  await expect.poll(state).toEqual(enabled);
  await updateDocument(page, template, { system: { allowsCurrency: false } });
  await expect.poll(state).toEqual(disabled);
  await updateDocument(page, template, { system: { containerType: 'purse' } });
  await expect.poll(state).toEqual(enabled);
  expect(await page.evaluate(async uuid => {
    const bag = await fromUuid<Container>(uuid);
    if (!bag) throw new Error('Missing currency source');
    return bag.system.containedCurrency.stacks;
  }, template)).toEqual([{ coinId: 'srd_gp', count: 50 }]);
  await updateDocument(page, template, { system: { containerType: 'bag', allowsCurrency: true } });
  await expect.poll(state).toEqual(enabled);

  await page.evaluate(async id => { await game.packs.get(id)!.configure({ locked: true }); }, destinationPack);
  const reported = page.waitForEvent('console', message =>
    message.type() === 'error' && message.text().includes(`Could not refresh ${innerTemplate}`));
  await updateDocument(page, template, { system: { allowsCurrency: false } });
  await reported;
  await expect.poll(state).toEqual([disabled[0], enabled[1], enabled[2]]);
  await expect(page.locator('#notifications .notification.error').first()).toBeVisible();
  await page.evaluate(async id => { await game.packs.get(id)!.configure({ locked: false }); }, destinationPack);
  await updateDocument(page, template, { system: { allowsCurrency: true } });
  await expect.poll(state).toEqual(enabled);
  await updateDocument(page, template, { system: { containedCurrency: { stacks: [{ coinId: 'srd_gp', count: 100 }] } } });
  await expect.poll(state).toEqual([
    { count: 1, weight: 3, value: 100, acceptsProbe: true },
    { count: 1, weight: 3, value: 100, acceptsProbe: true },
    { count: 1, weight: 5, value: 100, acceptsProbe: false },
  ]);

  await page.evaluate(async ({ direct, template }) => {
    const bag = await fromUuid<Container>(direct);
    const effect = bag?.effects.find(effect => effect.type === 'containment' && effect.system.sourceItemUuid === template);
    if (!bag || !effect) throw new Error('Missing reference to remove');
    await bag.deleteEmbeddedDocuments('ActiveEffect', [effect.id]);
  }, { direct, template });
  await updateDocument(page, template, { system: { allowsCurrency: false } });
  await expect.poll(state).toEqual([
    { count: 0, weight: 0, value: 0, acceptsProbe: true }, disabled[1], disabled[2],
  ]);
  expect(await readContents(page, direct)).toEqual([]);
});

test('GM imports a stocked nested compendium bag into world and actor inventories with independent contents', async ({ page }) => {
  await gotoGame(page);
  const pack = await createPack(page, 'Stocked container templates');
  const ammo = await createItem(page, 'ammo', { name: 'Arrows', system: { quantity: 20, weight: 0.1 } });
  const arrows = (await exportItem(page, ammo, pack))!;
  const inner = await createItem(page, 'container', { name: 'Inner quiver' });
  const innerTemplate = (await exportItem(page, inner, pack))!;
  await stowItemViaDrop(page, arrows, innerTemplate);
  const outer = await createItem(page, 'container', { name: 'Stocked bag' });
  const outerTemplate = (await exportItem(page, outer, pack))!;
  await stowItemViaDrop(page, innerTemplate, outerTemplate);
  await page.evaluate(async id => { await game.packs.get(id)!.configure({ locked: true }); }, pack);

  const worldImports = await page.evaluate(async ({ pack, uuid }) => {
    const id = uuid.split('.').at(-1)!;
    const source = game.packs.get(pack)! as Parameters<typeof game.items.importFromCompendium>[0];
    const item = await game.items.importFromCompendium(source, id, {}, { keepId: false });
    if (!item) throw new Error('Stocked world import returned no root');
    const replaced = await game.items.importFromCompendium(source, id);
    if (!replaced) throw new Error('Stocked world replacement returned no root');
    return [item.uuid!, replaced.uuid!];
  }, { pack, uuid: outerTemplate });
  const actor = await createActor(page, 'character', { name: 'Container owner' });
  const actorBag = await createItem(page, 'container', { name: 'Carrier bag' });
  const destination = await page.evaluate(async ({ actor, actorBag }) => {
    const owner = await fromUuid<foundry.documents.Actor>(actor);
    const bag = await fromUuid(actorBag);
    if (!owner || !bag) throw new Error('Missing actor destination fixture');
    const [created] = await owner.createEmbeddedDocuments('Item', [bag.toObject()]);
    return created.uuid!;
  }, { actor, actorBag });
  await stowItemViaDrop(page, outerTemplate, destination);
  const [actorRoot] = await readContents(page, destination);
  for (const root of [...worldImports, actorRoot.uuid!]) {
    const [child] = await readContents(page, root);
    expect(child.uuid).not.toBe(innerTemplate);
    expect(child.containerUuid).toBe(root);
    const [copiedArrows] = await readContents(page, child.uuid!);
    expect(copiedArrows.uuid).not.toBe(arrows);
    expect(copiedArrows.containerUuid).toBe(child.uuid);
    expect(copiedArrows.quantity).toBe(20);
    expect(copiedArrows.pack).toBeNull();
  }
  expect((await readContents(page, outerTemplate))[0].uuid).toBe(innerTemplate);
  expect((await readContents(page, innerTemplate))[0].uuid).toBe(arrows);
});

test('GM cancels or confirms stocked world-container exports, including replacement, without changing originals', async ({ page }) => {
  await gotoGame(page);
  const pack = await createPack(page, 'World container export destination');
  const bag = await createItem(page, 'container', { name: 'Export bag' });
  const ammo = await createItem(page, 'ammo', { name: 'World arrows', system: { quantity: 20 } });
  await stowItemViaDrop(page, ammo, bag);

  const cancelled = exportItem(page, bag, pack);
  await answerCopyDialog(page, 'no');
  expect(await cancelled).toBeNull();
  expect(await page.evaluate(id => game.packs.get(id)!.index.size, pack)).toBe(0);

  const accepted = exportItem(page, bag, pack);
  await answerCopyDialog(page, 'yes');
  const exported = (await accepted)!;
  const [firstCopy] = await readContents(page, exported);
  expect(firstCopy.uuid).toMatch(/^Compendium\./);
  expect(firstCopy.uuid).not.toBe(ammo);
  expect(firstCopy.containerUuid).toBeNull();
  expect((await readContents(page, bag))[0].uuid).toBe(ammo);

  const replacement = exportItem(page, bag, pack);
  await answerCopyDialog(page, 'yes');
  expect(await replacement).toBe(exported);
  const [secondCopy] = await readContents(page, exported);
  expect(secondCopy.uuid).not.toBe(firstCopy.uuid);
  expect(await page.evaluate(async uuid => !!await fromUuid(uuid), firstCopy.uuid!)).toBe(true);
  expect((await readContents(page, bag))[0].uuid).toBe(ammo);
});

test('GM adds a stocked world bag to a compendium bag only after confirming independent copies', async ({ page }) => {
  await gotoGame(page);
  const pack = await createPack(page, 'Container drop destination');
  const empty = await createItem(page, 'container', { name: 'Destination bag' });
  const destination = (await exportItem(page, empty, pack))!;
  const worldBag = await createItem(page, 'container', { name: 'Stocked world bag' });
  const ammo = await createItem(page, 'ammo', { name: 'World arrows', system: { quantity: 20 } });
  await stowItemViaDrop(page, ammo, worldBag);
  const originalSystem = await readItemSystem(page, ammo);

  const cancelled = stowItemViaDrop(page, worldBag, destination);
  await answerCopyDialog(page, 'no');
  await cancelled;
  expect(await readContents(page, destination)).toEqual([]);

  const accepted = stowItemViaDrop(page, worldBag, destination);
  await answerCopyDialog(page, 'yes');
  await accepted;
  const [copiedBag] = await readContents(page, destination);
  expect(copiedBag.uuid).not.toBe(worldBag);
  expect(copiedBag.pack).toBe(pack);
  const [copiedAmmo] = await readContents(page, copiedBag.uuid!);
  expect(copiedAmmo.uuid).not.toBe(ammo);
  expect(copiedAmmo.pack).toBe(pack);
  expect(copiedAmmo.quantity).toBe(20);
  expect(await readItemSystem(page, ammo)).toEqual(originalSystem);
  expect((await readContents(page, worldBag))[0].uuid).toBe(ammo);
});
