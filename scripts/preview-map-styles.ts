import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { briefSchema } from '@atlas/contracts';
import { renderAssets } from '@atlas/renderer';
import { createImagePrompt } from '@atlas/prompts';

const root = resolve(import.meta.dirname, '..');
const source = JSON.parse(await readFile(join(root, 'briefs/mercator.json'), 'utf8'));
for (const mode of ['playful-editorial', 'analytical-editorial'] as const) {
  const brief = briefSchema.parse({ ...source, visual: { ...source.visual, mode, characters: mode === 'playful-editorial' ? 'guide' : 'none' } });
  const dir = join(root, 'output/style-previews', mode);
  await mkdir(dir, { recursive: true });
  await renderAssets(brief, dir);
  await writeFile(join(dir, 'image-prompt.json'), JSON.stringify(createImagePrompt(brief), null, 2) + '\n');
  console.log(`Style preview (not published): ${dir}`);
}
