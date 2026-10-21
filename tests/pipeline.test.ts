import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { briefSchema } from '@atlas/contracts';
import { validateBriefReferences, validatePost } from '@atlas/validator';
import { createPost } from '@atlas/content-engine';

const root = resolve(import.meta.dirname, '..');
const briefPath = join(root, 'briefs', 'mercator.json');

test('sample brief has traceable claims and no unsupported numbers', async () => {
  const brief = briefSchema.parse(JSON.parse(await readFile(briefPath, 'utf8')));
  assert.deepEqual(validateBriefReferences(brief), []);
  assert.match(createPost(brief).translations['pt-BR']!.slug, /^[a-z0-9-]+$/);
});

test('rejects an unsourced claim and an invented number', async () => {
  const brief = briefSchema.parse(JSON.parse(await readFile(briefPath, 'utf8')));
  brief.claims[0].sourceIds = ['missing'];
  brief.translations['pt-BR']!.summary = 'A área aumenta 23 vezes.';
  const errors = validateBriefReferences(brief);
  assert.ok(errors.some(e => e.includes('missing source')));
  assert.ok(errors.some(e => e.includes('Number 23')));
});

test('generated sample package is complete', async () => {
  assert.deepEqual(await validatePost(join(root, 'content', 'posts', 'mercator-vs-equal-area')), []);
});
