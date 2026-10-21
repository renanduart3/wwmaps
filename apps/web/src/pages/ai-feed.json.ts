import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getPublicPosts, contentRoot, postUrl } from '../lib/posts';
import {getPublicVisualPosts,visualPostUrl} from '../lib/visual-posts';
export async function GET() {
  const entries = [];
  for (const post of await getPublicPosts()) for (const language of post.languages) {
    entries.push({
      id: post.id, language, ...post.translations[language], url: postUrl(post, language),
      category: post.category, tags: post.tags, publishedAt: post.publishedAt,
      contentType: post.contentType, mapType: post.mapType, geographicScope: post.geographicScope, commercialPurpose: post.commercialPurpose,
      sources: JSON.parse(await readFile(join(contentRoot, post.id, 'sources.json'), 'utf8')),
      body: await readFile(join(contentRoot, post.id, `article.${language}.md`), 'utf8')
    });
  }
  for(const post of await getPublicVisualPosts())for(const language of post.languages){
    const copy=post.translations[language]!;
    entries.push({id:post.id,language,title:copy.title,summary:copy.subtitle,url:visualPostUrl(post,language),category:post.category,tags:post.tags,publishedAt:post.publishAt,contentType:'visual-post',mapType:post.visual.kind,geographicScope:'editorial',commercialPurpose:[],sources:post.sources,body:copy.body});
  }
  return Response.json({ schemaVersion: 1, entries });
}
