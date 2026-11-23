import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validatePoem, sha256 } from '../scripts/content-lib.mjs';

const validVerse = (number, id = `verse-${number}`) => ({
  id,
  number,
  first_hemistich: `الشطر الأول ${number}`,
  second_hemistich: `الشطر الثاني ${number}`,
  text: `الشطر الأول ${number}\nالشطر الثاني ${number}`
});

const poem = () => ({
  schema_version: 1,
  id: 'test-poem',
  title: 'اختبار',
  author: 'اختبار',
  science: 'اختبار',
  source: { name: 'اختبار' },
  is_complete: false,
  revision: 1,
  chapters: [],
  verses: [validVerse(1), validVerse(2)]
});

test('accepts a valid poem and preserves diacritics', async () => {
  const value = poem();
  value.verses[0].first_hemistich = 'بِسْمِ اللَّهِ';
  value.verses[0].text = 'بِسْمِ اللَّهِ\nالشطر الثاني 1';
  assert.deepEqual(await validatePoem(value, 'test-poem.json'), []);
  assert.equal(value.verses[0].first_hemistich, 'بِسْمِ اللَّهِ');
});

test('rejects duplicate stable ids and broken numbering', async () => {
  const value = poem();
  value.verses[1].id = value.verses[0].id;
  value.verses[1].number = 3;
  const errors = await validatePoem(value);
  assert.ok(errors.some((error) => error.includes('duplicate verse id')));
  assert.ok(errors.some((error) => error.includes('expected number 2')));
});

test('allows insertion without changing an existing verse id', async () => {
  const value = poem();
  const recordedId = value.verses[1].id;
  value.verses.splice(1, 0, validVerse(2, 'inserted-verse'));
  value.verses.forEach((verse, index) => { verse.number = index + 1; });
  assert.equal(value.verses[2].id, recordedId);
  assert.deepEqual(await validatePoem(value), []);
});

test('hashes exact bytes', () => {
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
