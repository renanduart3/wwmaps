import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, cp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { postSchema } from '@atlas/contracts';
import { isPublished, readPosts } from '@atlas/content-store';
import { validatePost } from '@atlas/validator';
const samplePath = new URL('../content/posts/mercator-vs-equal-area/', import.meta.url);
const sample = postSchema.parse(JSON.parse(await readFile(new URL('post.json', samplePath), 'utf8')));
test('drafts and future posts are not public', () => {
  assert.equal(isPublished({ ...sample, status: 'draft' }), false);
  assert.equal(isPublished({ ...sample, publishedAt: '2099-01-01T00:00:00Z' }), false);
  assert.equal(isPublished(sample, new Date('2099-01-01')), true);
});
test('published content cannot silently disappear and edited numeric claims are rejected', async () => {
  const root = await mkdtemp(join(tmpdir(), 'atlas-test-'));
  try {
    const folder = join(root, sample.id);
    await cp(samplePath, folder, { recursive: true });
    await writeFile(join(folder, 'article.pt-BR.md'), '# Área\n\nCresce 999 vezes. [mercator-distortion]\n');
    assert.ok((await validatePost(folder)).some(e => e.includes('999')));
    await assert.rejects(readPosts(root, { validate: true }), /999/);
    await writeFile(join(folder, 'post.json'), '{ broken');
    await assert.rejects(readPosts(root));
  } finally { await rm(root, { recursive: true, force: true }); }
});
