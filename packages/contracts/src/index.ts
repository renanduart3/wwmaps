import { z } from 'zod';
import { categorySchema, contentTypeSchema, geographicScopeSchema, commercialPurposeSchema } from './taxonomy.js';
import { visualModeSchema } from './visual-style.js';
export * from './visual-style.js';
export * from './visual-post.js';
export * from './taxonomy.js';
export { dashboardSchema, visualCollectionSchema, productCollectionSchema } from './dashboard.js';
export type { DashboardData } from './dashboard.js';

export const languageSchema = z.enum(['pt-BR', 'en']);
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const sourceSchema = z.object({
  id: slugSchema,
  title: z.string().min(1),
  url: z.url().refine(url => /^https?:\/\//.test(url), 'Use an HTTP(S) source URL'),
  accessedAt: z.iso.date(),
  publisher: z.string().min(1)
});
export const claimSchema = z.object({
  id: slugSchema,
  text: z.string().min(1),
  sourceIds: z.array(z.string()).min(1),
  dataIds: z.array(z.string()).default([])
});
export const datumSchema = z.object({
  id: slugSchema,
  label: z.string().min(1),
  value: z.number().finite(),
  unit: z.string().min(1),
  sourceIds: z.array(z.string()).min(1)
});
export const translationSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(300),
  insight: z.string().min(1),
  paragraphs: z.array(z.object({ text: z.string().min(1), claimIds: z.array(slugSchema).min(1) })).min(1),
  instagramHook: z.string().min(1)
});
export const visualSchema = z.object({
  mode: visualModeSchema.optional(),
  characters: z.enum(['none', 'guide']).default('none'),
  title: z.string().min(1).max(32),
  subtitle: z.string().min(1).max(65),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#7132df')
});
export const evidenceSchema = z.object({
  topic: z.string().min(1),
  angle: z.string().min(1),
  audience: z.string().default('general'),
  sensitiveContent: z.boolean().default(false),
  category: categorySchema.default('geography'),
  contentType: contentTypeSchema.default('map-analysis'),
  mapType: z.literal('projection-comparison', { error: 'Studio currently supports only projection-comparison. Plan other map types with editorial-plan.schema.json.' }).default('projection-comparison'),
  geographicScope: geographicScopeSchema.default('world'),
  commercialPurpose: z.array(commercialPurposeSchema).min(1).default(['audience-growth']),
  tags: z.array(slugSchema).default([]),
  languages: z.array(languageSchema).min(1).default(['en', 'pt-BR']),
  distribution: z.array(z.enum(['site', 'instagram'])).min(1).default(['site', 'instagram']),
  visualizationType: z.literal('projection-comparison').default('projection-comparison'),
  sources: z.array(sourceSchema).min(1),
  claims: z.array(claimSchema).min(1),
  data: z.array(datumSchema).default([])
});
export const editorialSchema = z.object({
  translations: z.partialRecord(languageSchema, translationSchema),
  visual: visualSchema
}).strict();
export const briefSchema = evidenceSchema.extend({
  translations: editorialSchema.shape.translations,
  visual: visualSchema
}).superRefine((brief, ctx) => {
  for (const language of brief.languages) if (!brief.translations[language]) ctx.addIssue({ code: 'custom', message: `Missing translation: ${language}` });
});
export const postSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.enum(['draft', 'published']),
  publishedAt: z.iso.datetime().nullable(),
  category: categorySchema,
  contentType: contentTypeSchema.default('map-analysis'),
  mapType: z.literal('projection-comparison').default('projection-comparison'),
  geographicScope: geographicScopeSchema.default('world'),
  commercialPurpose: z.array(commercialPurposeSchema).min(1).default(['audience-growth']),
  tags: z.array(slugSchema),
  languages: z.array(languageSchema).min(1),
  distribution: z.array(z.enum(['site', 'instagram'])).min(1),
  translations: z.partialRecord(languageSchema, z.object({ title: z.string().min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), summary: z.string().min(1) })),
  visualization: z.object({ type: z.literal('projection-comparison'), mode: visualModeSchema.optional(), primaryAsset: z.string(), supportingAsset: z.string() }),
  seo: z.partialRecord(languageSchema, z.object({ title: z.string().min(1), description: z.string().min(1) })),
  monetization: z.object({ type: z.literal('none'), cta: z.null() })
}).superRefine((post, ctx) => {
  for (const lang of post.languages) {
    if (!post.translations[lang] || !post.seo[lang]) ctx.addIssue({ code: 'custom', message: `Missing metadata: ${lang}` });
  }
  if (post.status === 'published' && !post.publishedAt) ctx.addIssue({ code: 'custom', message: 'Published posts need publishedAt' });
  if (new Set(post.languages).size !== post.languages.length) ctx.addIssue({ code: 'custom', message: 'Duplicate language' });
});
export type Brief = z.infer<typeof briefSchema>;
export type Post = z.infer<typeof postSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type Datum = z.infer<typeof datumSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Language = z.infer<typeof languageSchema>;
