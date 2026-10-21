import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { draftEditorial, localEndpoint } from '@atlas/ai';
import { briefSchema } from '@atlas/contracts';
const sample = briefSchema.parse(JSON.parse(await readFile(new URL('../briefs/mercator.json', import.meta.url), 'utf8')));
const config = { model: 'qwen3:8b', effort: 'off' };

function transport(editorial: unknown, inspect?: (body: Record<string, unknown>) => void): typeof fetch {
  return async (input, init) => {
    if (String(input).endsWith('/api/show')) return Response.json({ thinking: { values: [true, false] } });
    const body = JSON.parse(String(init?.body));
    inspect?.(body);
    return Response.json({ message: { content: JSON.stringify(editorial) }, done_reason: 'stop' });
  };
}
test('Ollama request is structured, preserves evidence and returns an unreviewed draft', async () => {
  const result = await draftEditorial(sample, config, transport({ translations: sample.translations, visual: sample.visual }, body => {
    assert.equal(body.think, false);
    assert.equal(body.stream, false);
    assert.equal(typeof body.format, 'object');
  }));
  assert.deepEqual(result.brief.sources, sample.sources);
  assert.deepEqual(result.brief.data, sample.data);
  assert.equal(result.provenance.reviewed, false);
});
test('rejects hallucinated numbers and unknown citations after inference', async () => {
  const translations = structuredClone(sample.translations);
  translations['pt-BR']!.paragraphs[0] = { text: 'A região cresce 999 vezes.', claimIds: ['invented-claim'] };
  await assert.rejects(draftEditorial(sample, config, transport({ translations, visual: sample.visual })), /AI draft rejected/);
});
test('rejects invalid structured output and unsupported thinking controls', async () => {
  await assert.rejects(draftEditorial(sample, config, transport({ sources: [] })));
  await assert.rejects(draftEditorial(sample, { ...config, effort: 'high' }, transport({})), /supports think/);
});
test('local inference cannot silently send evidence to a cloud endpoint', () => {
  assert.throws(() => localEndpoint('https://example.com', '/api/chat'), /loopback/);
  assert.throws(() => localEndpoint('http://localhost.evil.example', '/api/chat'), /loopback/);
});
