import { access, readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { briefSchema, claimSchema, datumSchema, postSchema, sourceSchema } from '@atlas/contracts';
import type { Brief, Evidence, Datum } from '@atlas/contracts';

const exists = async (path: string) => access(path).then(() => true, () => false);
const json = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, 'utf8'));
export function validateNumbers(text: string, data: Datum[]): string[] {
  const allowed = new Set(data.flatMap(d => [String(d.value), String(d.value).replace('.', ',')]));
  return [...text.matchAll(/(?<![\p{L}\d])\d+(?:[.,]\d+)?(?![\p{L}\d])/gu)]
    .filter(match => !allowed.has(match[0])).map(match => `Number ${match[0]} is absent from data.json`);
}

export function validateEvidenceReferences(brief: Evidence): string[] {
  const errors: string[] = [];
  const sources = new Set(brief.sources.map(s => s.id));
  const claims = new Set(brief.claims.map(c => c.id));
  const data = new Set(brief.data.map(d => d.id));
  if (sources.size !== brief.sources.length) errors.push('Duplicate source ID');
  if (claims.size !== brief.claims.length) errors.push('Duplicate claim ID');
  if (data.size !== brief.data.length) errors.push('Duplicate data ID');
  for (const claim of brief.claims) {
    for (const id of claim.sourceIds) if (!sources.has(id)) errors.push(`Claim ${claim.id}: missing source ${id}`);
    for (const id of claim.dataIds) if (!data.has(id)) errors.push(`Claim ${claim.id}: missing data ${id}`);
  }
  for (const datum of brief.data) for (const id of datum.sourceIds) if (!sources.has(id)) errors.push(`Datum ${datum.id}: missing source ${id}`);
  return errors;
}

export function validateBriefReferences(brief: Brief): string[] {
  const errors = validateEvidenceReferences(brief);
  const claims = new Set(brief.claims.map(c => c.id));
  for (const lang of brief.languages) for (const p of brief.translations[lang]!.paragraphs) for (const id of p.claimIds) if (!claims.has(id)) errors.push(`${lang}: missing claim ${id}`);
  const editorialText = [brief.angle, brief.visual.title, brief.visual.subtitle, ...brief.claims.map(c => c.text), ...brief.languages.flatMap(lang => {
    const t = brief.translations[lang]!;
    return [t.title, t.summary, t.insight, t.instagramHook, ...t.paragraphs.map(p => p.text)];
  })];
  for (const text of editorialText) errors.push(...validateNumbers(text, brief.data));
  return errors;
}

export async function validatePost(dir: string): Promise<string[]> {
  const errors: string[] = [];
  const required = ['post.json', 'research-summary.json', 'claims.json', 'sources.json', 'data.json', 'image-prompt.json', 'assets/cover.webp', 'assets/instagram-4x5.png', 'assets/map.svg'];
  for (const path of required) if (!await exists(join(dir, path))) errors.push(`Missing ${path}`);
  if (errors.length) return errors;
  let post;
  try { post = postSchema.parse(await json(join(dir, 'post.json'))); }
  catch (e) { return [`Invalid post.json: ${String(e)}`]; }
  let sources, claims, data;
  try {
    sources = sourceSchema.array().min(1).parse(await json(join(dir, 'sources.json')));
    claims = claimSchema.array().min(1).parse(await json(join(dir, 'claims.json')));
    data = datumSchema.array().parse(await json(join(dir, 'data.json')));
  } catch (e) { return [`Invalid evidence: ${String(e)}`]; }
  const sourceIds = new Set(sources.map(s => s.id));
  const dataIds = new Set(data.map(d => d.id));
  const claimIds = new Set(claims.map(c => c.id));
  if (sourceIds.size !== sources.length || claimIds.size !== claims.length || dataIds.size !== data.length) errors.push('Duplicate evidence IDs');
  for (const c of claims) {
    for (const id of c.sourceIds) if (!sourceIds.has(id)) errors.push(`Claim ${c.id}: missing source ${id}`);
    for (const id of c.dataIds) if (!dataIds.has(id)) errors.push(`Claim ${c.id}: missing data ${id}`);
  }
  for (const d of data) for (const id of d.sourceIds) if (!sourceIds.has(id)) errors.push(`Datum ${d.id}: missing source ${id}`);
  for (const lang of post.languages) {
    if (!post.translations[lang] || !post.seo[lang]) errors.push(`Missing metadata for ${lang}`);
    for (const file of [`article.${lang}.md`, `instagram.${lang}.txt`]) {
      const path = join(dir, file);
      if (!await exists(path) || !(await readFile(path, 'utf8')).trim()) { errors.push(`Missing or empty ${file}`); continue; }
      const content = await readFile(path, 'utf8');
      const editorial = content.split(/^## (?:Fontes|Sources)|^(?:Fontes|Sources):/m)[0].replace(/https?:\/\/\S+/g, '').replace(/\[[a-z0-9-]+\]/g, '');
      errors.push(...validateNumbers(editorial, data).map(e => `${file}: ${e}`));
      if (file.endsWith('.md')) {
        const citations = [...content.split(/^## (?:Fontes|Sources)/m)[0].matchAll(/\[([a-z0-9-]+)\](?!\()/g)].map(m => m[1]);
        if (!citations.length) errors.push(`${file}: missing claim citations`);
        for (const id of citations) if (!claimIds.has(id)) errors.push(`${file}: unknown claim ${id}`);
      }
    }
    errors.push(...validateNumbers(JSON.stringify({ translation: post.translations[lang], seo: post.seo[lang] }).replace(/"slug":"[^"]*"/g, ''), data));
  }
  for (const asset of [post.visualization.primaryAsset, post.visualization.supportingAsset]) {
    const path = resolve(dir, asset);
    if (!path.startsWith(resolve(dir) + sep) || !await exists(path)) errors.push(`Invalid asset ${asset}`);
  }
  const summary = await json(join(dir, 'research-summary.json'));
  if (!summary || typeof summary !== 'object' || !('mainInsight' in summary)) errors.push('Invalid research-summary.json');
  if (post.status === 'published' && (!summary || typeof summary !== 'object' || !('reviewed' in summary) || summary.reviewed !== true)) errors.push('Published post requires research-summary.json reviewed: true');
  const prompt = await json(join(dir, 'image-prompt.json')) as { prompt?: unknown };
  if (typeof prompt?.prompt !== 'string' || !prompt.prompt.trim()) errors.push('Invalid image prompt');
  for (const asset of ['assets/cover.webp', 'assets/instagram-4x5.png', 'assets/map.svg']) if (!(await readFile(join(dir, asset))).length) errors.push(`Empty ${asset}`);
  return errors;
}

export { briefSchema };
