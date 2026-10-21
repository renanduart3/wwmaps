interface Context {
  request: Request;
  env: { ASSETS: { fetch(request: Request): Promise<Response> } };
}
interface Entry { title: string; summary: string; tags: string[]; url: string; language: string }
export async function onRequestGet({ request, env }: Context): Promise<Response> {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim();
  if (query.length > 160) return Response.json({ error: 'Query too long' }, { status: 400 });
  if (!query) return Response.json({ results: [] });
  const feed = await env.ASSETS.fetch(new Request(new URL('/ai-feed.json', url)));
  if (!feed.ok) return Response.json({ error: 'Content unavailable' }, { status: 503 });
  const { entries } = await feed.json() as { entries: Entry[] };
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const results = entries.filter(p => normalize(`${p.title} ${p.summary} ${p.tags.join(' ')}`).includes(normalize(query)))
    .slice(0, 20).map(({ title, summary, url, language }) => ({ title, summary, url, language }));
  return Response.json({ results }, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
