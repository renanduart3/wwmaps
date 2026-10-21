import type { Brief, Post } from '@atlas/contracts';
import { resolveVisualStyle } from '@atlas/contracts';

export function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
}

export function createPost(brief: Brief): Post {
  const translations: Post['translations'] = {};
  const seo: Post['seo'] = {};
  for (const lang of brief.languages) {
    const t = brief.translations[lang]!;
    translations[lang] = { title: t.title, slug: slugify(t.title), summary: t.summary };
    seo[lang] = { title: t.title, description: t.summary.slice(0, 160) };
  }
  return {
    id: slugify(brief.topic), status: 'draft', publishedAt: null, category: brief.category,
    contentType: brief.contentType, mapType: brief.mapType, geographicScope: brief.geographicScope, commercialPurpose: brief.commercialPurpose,
    tags: brief.tags, languages: brief.languages, distribution: brief.distribution,
    translations, seo,
    visualization: { type: 'projection-comparison', mode: resolveVisualStyle(brief).mode, primaryAsset: './assets/instagram-4x5.png', supportingAsset: './assets/map.svg' },
    monetization: { type: 'none', cta: null }
  };
}

export function article(brief: Brief, lang: 'pt-BR' | 'en'): string {
  const t = brief.translations[lang]!;
  const label = lang === 'pt-BR' ? { method: 'Metodologia', sources: 'Fontes', summary: 'Em resumo' } : { method: 'Methodology', sources: 'Sources', summary: 'In brief' };
  const paragraphs = t.paragraphs.map(p => `${p.text}\n\n${p.claimIds.map(id => `[${id}]`).join(' ')}`).join('\n\n');
  const sources = brief.sources.map(s => `- [${s.id}] [${s.title}](${s.url}) — ${s.publisher}; ${s.accessedAt}`).join('\n');
  return `# ${t.title}\n\n> ${t.summary}\n\n## ${label.summary}\n\n${t.insight} ${brief.claims.map(c => `[${c.id}]`).join(' ')}\n\n${paragraphs}\n\n## ${label.method}\n\n${lang === 'pt-BR' ? 'O texto utiliza as afirmações e fontes registradas no pacote editorial. Geometria generalizada Natural Earth 1:110m em Mercator e Gall–Peters; polos de Mercator recortados em ±85,05°. Painéis ajustados separadamente: não compare áreas por pixels entre eles. Não utilizar para medições precisas.' : 'The text uses the claims and sources recorded in the editorial package. Generalized Natural Earth 1:110m geometry in Mercator and Gall–Peters; Mercator poles clipped at ±85.05°. Panels fitted independently: do not compare pixel areas between them. Not for precise measurement.'}\n\n## ${label.sources}\n\n${sources}\n`;
}

export function caption(brief: Brief, lang: 'pt-BR' | 'en'): string {
  const t = brief.translations[lang]!;
  const sourceLine = brief.sources.map(s => `${s.publisher}: ${s.url}`).join('\n');
  return `${t.instagramHook}\n\n${t.summary}\n\n${t.insight}\n\n${lang === 'pt-BR' ? 'Fontes' : 'Sources'}:\n${sourceLine}\n\n${brief.tags.map(tag => '#' + slugify(tag).replaceAll('-', '')).join(' ')}\n`;
}
