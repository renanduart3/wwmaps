#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { postSchema, evidenceSchema } from '@atlas/contracts';
import { slugify } from '@atlas/content-engine';
import { contentCommand } from './content-commands.js';
import { validateEvidenceReferences, validatePost } from '@atlas/validator';
import { readPosts } from '@atlas/content-store';
import { aiCommand } from './ai-commands.js';

const root = resolve(import.meta.dirname, '../../..');
const postsRoot = join(root, 'content', 'posts');
const args = process.argv.slice(2);
const command = args[0];
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const writeJson = (path: string, data: unknown) => writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf8');

async function validate(path: string) {
  const dir = resolve(path);
  const errors = await validatePost(dir);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Valid: ${dir}`);
}

async function publish(path: string) {
  const dir = resolve(path);
  await validate(dir);
  const review = JSON.parse(await readFile(join(dir, 'research-summary.json'), 'utf8'));
  if (review.reviewed !== true) throw new Error('Review the sources, copy and visual first, then set research-summary.json reviewed to true.');
  const postPath = join(dir, 'post.json');
  const post = postSchema.parse(JSON.parse(await readFile(postPath, 'utf8')));
  if (post.status === 'published') { console.log('Already published'); return; }
  post.status = 'published';
  post.publishedAt = new Date().toISOString();
  await writeJson(postPath, post);
  console.log(`Marked published: ${post.id}. Run npm run build to prepare Cloudflare Pages output.`);
}

async function createTopic(topic: string) {
  if (!slugify(topic)) throw new Error('Topic must contain letters or numbers');
  const path = join(root, 'briefs', 'queue', `${slugify(topic)}.json`);
  await mkdir(join(root, 'briefs', 'queue'), { recursive: true });
  await writeFile(path, JSON.stringify({
    topic, angle: '', languages: ['pt-BR'], distribution: ['site', 'instagram'],
    sources: [], claims: [], data: [],
    visualizationType: 'projection-comparison'
  }, null, 2) + '\n', { flag: 'wx' });
  console.log(`Brief template: ${path}`);
}

async function main() {
  switch (command) {
    case 'content': await contentCommand(root,args.slice(1)); break;
    case 'ai': await aiCommand(root, args.slice(1)); break;
    case 'run': case 'generate': {
      throw new Error('Automatic image rendering is disabled. Use content:analyze and content:prompts; generate images externally.');
    }
    case 'research': {
      const path = flag('--brief');
      if (!path) throw new Error('Usage: atlas research --brief <file>');
      const brief = evidenceSchema.parse(JSON.parse(await readFile(resolve(path), 'utf8')));
      const errors = validateEvidenceReferences(brief);
      if (errors.length) throw new Error(errors.join('\n'));
      console.log(JSON.stringify({ topic: brief.topic, sources: brief.sources, claims: brief.claims, data: brief.data }, null, 2));
      break;
    }
    case 'validate': {
      if (args.includes('--all')) {
        const posts = await readPosts(postsRoot, { drafts: true, validate: true });
        console.log(`Valid: ${posts.length} post(s)`); break;
      }
      const path = flag('--post'); if (!path) throw new Error('Usage: atlas validate --post <dir>');
      await validate(path); break;
    }
    case 'publish': {
      const path = flag('--post'); if (!path) throw new Error('Usage: atlas publish --post <dir>');
      await publish(path); break;
    }
    case 'create-topic': {
      const topic = args.slice(1).join(' ').trim(); if (!topic) throw new Error('Usage: atlas create-topic <topic>');
      await createTopic(topic); break;
    }
    case 'build-web': execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }); break;
    default: console.log('Content: content analyze --input <list> --style <style>, content prompts --post <id> | --all, content check. Legacy utilities: ai doctor/draft, research, validate, publish, create-topic. Automatic editorial image rendering is disabled.');
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
