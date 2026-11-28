import type { Container } from '@items/physical/container/Container.mjs';
import type { PhysicalItemLike } from '@items/physical/physicalItem/index.mjs';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearWorld, createActor, createItem, stowItemViaDrop } from './helpers/documents.mjs';
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
