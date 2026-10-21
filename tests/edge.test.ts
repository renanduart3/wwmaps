import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../apps/web/functions/api/search.js';
test('Pages API searches public feed with accent-insensitive queries', async () => {
  const result = await onRequestGet({
    request: new Request('https://atlas.test/api/search?q=projecao'),
    env: { ASSETS: { fetch: async request => {
      assert.equal(new URL(request.url).pathname, '/ai-feed.json');
      return Response.json({ entries: [{ title: 'Projeção', summary: 'Mapas', tags: [], url: '/pt-br/mapas/teste/', language: 'pt-BR', body: 'not returned' }] });
    } } }
  });
  const body = await result.json();
  assert.equal(body.results.length, 1);
  assert.equal(body.results[0].body, undefined);
});
test('Pages API limits input and handles missing feed', async () => {
  const env = { ASSETS: { fetch: async () => new Response('', { status: 404 }) } };
  assert.equal((await onRequestGet({ request: new Request(`https://atlas.test/api/search?q=${'x'.repeat(161)}`), env })).status, 400);
  assert.equal((await onRequestGet({ request: new Request('https://atlas.test/api/search?q=x'), env })).status, 503);
});
