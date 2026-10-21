import { resolve } from 'node:path';
import { readPosts } from '@atlas/content-store';
export { postUrl } from '@atlas/content-store';
export type { Post as SitePost } from '@atlas/contracts';
export const contentRoot = resolve(import.meta.dirname, '../../../../content/posts');
export const getPosts = () => readPosts(contentRoot, { drafts: import.meta.env.DEV });
export const getPublicPosts = () => readPosts(contentRoot);
