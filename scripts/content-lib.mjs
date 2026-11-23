import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = process.cwd();

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function makeValidator(schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

export async function validatePoem(poem, fileName = '') {
  const schema = await readJson(path.join(root, 'schemas', 'poem.schema.json'));
  const validate = makeValidator(schema);
  const errors = [];
  if (!validate(poem)) {
    errors.push(...validate.errors.map((error) => `${error.instancePath || '/'} ${error.message}`));
  }
  if (fileName && poem.id !== path.basename(fileName, '.json')) {
    errors.push(`id "${poem.id}" must match file name "${fileName}"`);
  }
  const verseIds = new Set();
  const chapterIds = new Set();
  for (const chapter of poem.chapters ?? []) {
    if (chapterIds.has(chapter.id)) errors.push(`duplicate chapter id: ${chapter.id}`);
    chapterIds.add(chapter.id);
  }
  (poem.verses ?? []).forEach((verse, index) => {
    if (verseIds.has(verse.id)) errors.push(`duplicate verse id: ${verse.id}`);
    verseIds.add(verse.id);
    if (verse.number !== index + 1) errors.push(`verse ${verse.id}: expected number ${index + 1}, got ${verse.number}`);
    if (verse.text !== `${verse.first_hemistich}\n${verse.second_hemistich}`) {
      errors.push(`verse ${verse.id}: text must equal both hemistichs separated by one newline`);
    }
    if (verse.chapter_id && !chapterIds.has(verse.chapter_id)) errors.push(`verse ${verse.id}: unknown chapter ${verse.chapter_id}`);
  });
  return errors;
}

export async function poemEntries() {
  const directory = path.join(root, 'docs', 'poems');
  const files = (await readdir(directory)).filter((file) => file.endsWith('.json')).sort();
  const entries = [];
  const errors = [];
  for (const file of files) {
    const raw = await readFile(path.join(directory, file));
    let poem;
    try {
      poem = JSON.parse(raw.toString('utf8'));
    } catch (error) {
      errors.push(`${file}: invalid JSON: ${error.message}`);
      continue;
    }
    errors.push(...(await validatePoem(poem, file)).map((error) => `${file}: ${error}`));
    entries.push({
      id: poem.id,
      title: poem.title,
      author: poem.author,
      science: poem.science,
      verse_count: poem.verses.length,
      path: `poems/${file}`,
      revision: poem.revision,
      sha256: sha256(raw),
      is_complete: poem.is_complete
    });
  }
  const ids = entries.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) errors.push('duplicate poem id in catalog');
  if (errors.length) throw new Error(errors.join('\n'));
  return entries;
}

export async function buildManifest(now = new Date()) {
  const poems = await poemEntries();
  const manifestPath = path.join(root, 'docs', 'manifest.json');
  let previous;
  try {
    previous = await readJson(manifestPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const unchanged = previous && JSON.stringify(previous.poems) === JSON.stringify(poems);
  return {
    schema_version: 1,
    catalog_version: unchanged ? previous.catalog_version : (previous?.catalog_version ?? 0) + 1,
    updated_at: unchanged ? previous.updated_at : now.toISOString(),
    poems
  };
}

export async function validateManifest(manifest) {
  const schema = await readJson(path.join(root, 'schemas', 'manifest.schema.json'));
  const validate = makeValidator(schema);
  if (!validate(manifest)) {
    return validate.errors.map((error) => `${error.instancePath || '/'} ${error.message}`);
  }
  const expected = await poemEntries();
  return JSON.stringify(manifest.poems) === JSON.stringify(expected)
    ? []
    : ['manifest.json is stale; run npm run manifest'];
}
