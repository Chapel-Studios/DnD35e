#!/usr/bin/env node
/**
 * validate-packs.mjs
 *
 * Validates JSON content under `packs/_source/<pack>/` before the Vite build compiles it
 * into LevelDB. Catches malformed `_id`s, missing required fields, duplicate `_id`s within
 * a pack, and broken in-pack folder references — the kinds of errors that would otherwise
 * silently corrupt the compiled pack or fail opaquely inside `compilePack`.
 *
 * Approach: lightweight structural validation via AJV (`additionalProperties: true`).
 * We check the high-value fields (`_id`, `name`, content-type-specific arrays, folder refs)
 * and let Foundry's own loaders handle deeper schema correctness on world boot.
 *
 * Exit codes:
 *   0 — all packs valid
 *   1 — one or more validation errors
 */

import Ajv from 'ajv';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'system.json');
const sourceRoot = path.join(repoRoot, 'packs', '_source');

const ID_PATTERN = '^[A-Za-z0-9]{16}$';

// ────────────────────────────────────────────────────────────────────────────
// Schemas (per pack `type` from system.json)
// ────────────────────────────────────────────────────────────────────────────

const baseDocSchema = {
  type: 'object',
  required: ['_id', 'name'],
  properties: {
    _id: { type: 'string', pattern: ID_PATTERN },
    name: { type: 'string', minLength: 1 },
    folder: { type: ['string', 'null'], pattern: ID_PATTERN, nullable: true },
  },
  additionalProperties: true,
};

const folderDocSchema = {
  type: 'object',
  required: ['_id', 'name', 'type'],
  properties: {
    _id: { type: 'string', pattern: ID_PATTERN },
    name: { type: 'string', minLength: 1 },
    type: { type: 'string', minLength: 1 },
    folder: { type: ['string', 'null'] },
  },
  additionalProperties: true,
};

const journalPageSchema = {
  type: 'object',
  required: ['_id', 'name', 'type'],
  properties: {
    _id: { type: 'string', pattern: ID_PATTERN },
    name: { type: 'string', minLength: 1 },
    type: { type: 'string', minLength: 1 },
  },
  additionalProperties: true,
};

const journalEntrySchema = {
  ...baseDocSchema,
  required: [...baseDocSchema.required, 'pages'],
  properties: {
    ...baseDocSchema.properties,
    pages: { type: 'array', items: journalPageSchema },
  },
};

const activeEffectSchema = {
  ...baseDocSchema,
  properties: {
    ...baseDocSchema.properties,
    changes: { type: 'array' },    // optional: Foundry omits the field when empty
    transfer: { type: 'boolean' },
  },
};

const macroSchema = {
  ...baseDocSchema,
  required: [...baseDocSchema.required, 'type', 'command'],
  properties: {
    ...baseDocSchema.properties,
    type: { enum: ['script', 'chat'] },
    command: { type: 'string' },
  },
};

const itemSchema = {
  ...baseDocSchema,
  required: [...baseDocSchema.required, 'type'],
  properties: {
    ...baseDocSchema.properties,
    type: { type: 'string', minLength: 1 },
  },
};

const schemaByPackType = {
  JournalEntry: journalEntrySchema,
  ActiveEffect: activeEffectSchema,
  Macro: macroSchema,
  Item: itemSchema,
  Actor: itemSchema, // same shape for our purposes (requires type)
};

// ────────────────────────────────────────────────────────────────────────────
// Validator
// ────────────────────────────────────────────────────────────────────────────

const ajv = new Ajv({ allErrors: true, strict: false });

function isFolderFile (filePath) {
  return path.basename(filePath).startsWith('_Folder');
}

async function findJsonFiles (dir) {
  const out = [];
  if (!(await fs.pathExists(dir))) return out;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await findJsonFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
      out.push(full);
    }
  }
  return out;
}

async function validatePack (pack, errors) {
  const srcDir = path.join(sourceRoot, pack.name);
  const files = await findJsonFiles(srcDir);
  if (files.length === 0) return;

  const contentSchema = schemaByPackType[pack.type];
  if (!contentSchema) {
    errors.push(`[${pack.name}] No validator registered for pack type "${pack.type}"`);
    return;
  }

  const validateContent = ajv.compile(contentSchema);
  const validateFolder = ajv.compile(folderDocSchema);

  const idsSeen = new Map(); // _id → relPath (first seen)
  const folderIds = new Set();
  const folderParentRefs = []; // { folderId, parentId, file }
  const docFolderRefs = []; // { docId, parentId, file }

  for (const file of files) {
    const relPath = path.relative(repoRoot, file);
    let doc;
    try {
      doc = await fs.readJson(file);
    } catch (e) {
      errors.push(`[${pack.name}] ${relPath}: failed to parse JSON — ${e.message}`);
      continue;
    }

    const isFolder = isFolderFile(file);
    const validator = isFolder ? validateFolder : validateContent;
    if (!validator(doc)) {
      for (const err of validator.errors ?? []) {
        errors.push(`[${pack.name}] ${relPath}${err.instancePath}: ${err.message}`);
      }
      continue;
    }

    // Duplicate-_id check (within pack)
    if (doc._id) {
      if (idsSeen.has(doc._id)) {
        errors.push(`[${pack.name}] ${relPath}: duplicate _id "${doc._id}" (also in ${idsSeen.get(doc._id)})`);
      } else {
        idsSeen.set(doc._id, relPath);
      }
    }

    if (isFolder) {
      // Folder.type must match pack content type
      if (doc.type !== pack.type) {
        errors.push(`[${pack.name}] ${relPath}: folder type "${doc.type}" does not match pack content type "${pack.type}"`);
      }
      folderIds.add(doc._id);
      if (doc.folder) {
        folderParentRefs.push({ folderId: doc._id, parentId: doc.folder, file: relPath });
      }
    } else if (doc.folder) {
      docFolderRefs.push({ docId: doc._id, parentId: doc.folder, file: relPath });
    }
  }

  // Cross-doc: folder references must resolve to a folder in the same pack
  for (const ref of folderParentRefs) {
    if (!folderIds.has(ref.parentId)) {
      errors.push(`[${pack.name}] ${ref.file}: folder._id "${ref.folderId}" references unknown parent folder "${ref.parentId}"`);
    }
  }
  for (const ref of docFolderRefs) {
    if (!folderIds.has(ref.parentId)) {
      errors.push(`[${pack.name}] ${ref.file}: doc "${ref.docId}" references unknown folder "${ref.parentId}"`);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Entry
// ────────────────────────────────────────────────────────────────────────────

async function main () {
  if (!(await fs.pathExists(manifestPath))) {
    console.error(`❌ system.json not found at ${manifestPath} — run \`npm run build:system-json\` first.`);
    process.exit(1);
  }

  const manifest = await fs.readJson(manifestPath);
  const packs = Array.isArray(manifest.packs) ? manifest.packs : [];
  if (packs.length === 0) {
    console.log('ℹ️  No packs declared in system.json — nothing to validate.');
    return;
  }

  const errors = [];
  let totalFiles = 0;

  for (const pack of packs) {
    const before = errors.length;
    const srcDir = path.join(sourceRoot, pack.name);
    const files = await findJsonFiles(srcDir);
    totalFiles += files.length;
    if (files.length === 0) {
      console.log(`  · ${pack.name} (${pack.type}): empty, skipped`);
      continue;
    }
    await validatePack(pack, errors);
    const added = errors.length - before;
    const status = added === 0 ? '✓' : `✗ ${added} error(s)`;
    console.log(`  ${added === 0 ? '✓' : '✗'} ${pack.name} (${pack.type}): ${files.length} file(s) ${status === '✓' ? 'ok' : `— ${status}`}`);
  }

  if (errors.length > 0) {
    console.error(`\n❌ validate:packs failed with ${errors.length} error(s):`);
    for (const e of errors) console.error(`   ${e}`);
    process.exit(1);
  }

  console.log(`\n✅ validate:packs passed (${totalFiles} file(s) across ${packs.length} pack(s))`);
}

main().catch((err) => {
  console.error('❌ validate-packs crashed:', err);
  process.exit(1);
});
