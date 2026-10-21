import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { z } from 'zod';
import { evidenceSchema, briefSchema, postSchema, visualPostSchema, editorialSchema, dashboardSchema, visualCollectionSchema, productCollectionSchema, editorialPlanSchema, categories, mapCapabilities, contentTypeSchema, commercialPurposeSchema } from '@atlas/contracts';
const dir = resolve(import.meta.dirname, '../schemas');
await mkdir(dir, { recursive: true });
for (const [name, schema] of Object.entries({ evidence: evidenceSchema, brief: briefSchema, post: postSchema, 'visual-post':visualPostSchema, editorial: editorialSchema, dashboard: dashboardSchema, visuals: visualCollectionSchema, products: productCollectionSchema, 'editorial-plan': editorialPlanSchema })) {
  await writeFile(join(dir, `${name}.schema.json`), JSON.stringify(z.toJSONSchema(schema, { io: 'input' }), null, 2) + '\n');
}
await writeFile(join(dir, 'editorial-catalog.json'), JSON.stringify({ categories, contentTypes:contentTypeSchema.options, commercialPurposes:commercialPurposeSchema.options, mapCapabilities },null,2)+'\n');
console.log('JSON schemas exported. Zod runtime refinements remain authoritative.');
