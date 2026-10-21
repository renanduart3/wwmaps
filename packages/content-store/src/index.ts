import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { postSchema, type Post, type Language } from '@atlas/contracts';
import { validatePost } from '@atlas/validator';
export * from './visual-posts.js';

export function isPublished(post: Post, now = new Date()): boolean {
  return post.status === 'published' && !!post.publishedAt && Date.parse(post.publishedAt) <= now.getTime();
}
export const postUrl = (post: Post, lang: Language = post.languages[0]) => {
  const translation = post.translations[lang];
  if (!translation) throw new Error(`${post.id}: translation ${lang} is missing`);
  return `/${lang === 'en' ? 'en/maps' : 'pt-br/mapas'}/${translation.slug}/`;
};
export async function readPosts(root: string, options: { drafts?: boolean; validate?: boolean } = {}): Promise<Post[]> {
  let dirs;
  try { dirs = await readdir(root, { withFileTypes: true }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  const posts: Post[] = [];
  const routes = new Set<string>();
  for (const dir of dirs) {
    if (!dir.isDirectory() || dir.name.startsWith('.')) continue;
    const path = join(root, dir.name);
    const post = postSchema.parse(JSON.parse(await readFile(join(path, 'post.json'), 'utf8')));
    if (post.id !== dir.name) throw new Error(`Post ID differs from folder name: ${dir.name}`);
    if (!options.drafts && !isPublished(post)) continue;
    if (options.validate) {
      const errors = await validatePost(path);
      if (errors.length) throw new Error(`${post.id}:\n${errors.join('\n')}`);
    }
    for (const lang of post.languages) {
      const route = postUrl(post, lang);
      if (routes.has(route)) throw new Error(`Duplicate post route: ${route}`);
      routes.add(route);
    }
    posts.push(post);
  }
  return posts.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '') || a.id.localeCompare(b.id));
}
