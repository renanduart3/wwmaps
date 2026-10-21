import { z } from 'zod';
import { categorySchema } from './taxonomy.js';
export const rawDownloadSchema=z.object({path:z.string().min(1),sha256:z.string().regex(/^[a-f0-9]{64}$/),url:z.url(),retrievedAt:z.iso.datetime(),lastUpdated:z.string().nullable()});
export const seriesReviewSchema=z.object({status:z.enum(['pending','approved','rejected']),reviewer:z.string().optional(),reviewedAt:z.iso.datetime().optional()}).superRefine((r,ctx)=>{if(r.status==='approved'&&(!r.reviewer||!r.reviewedAt))ctx.addIssue({code:'custom',message:'Approved series require reviewer and date'});});
export const indicatorProvenanceSchema=z.object({
  provider:z.literal('World Bank'),sourceId:z.literal('2'),indicatorCode:z.string(),originalUnit:z.string(),divisor:z.number().positive(),
  attribution:z.string().min(1),license:z.object({id:z.literal('CC-BY-4.0'),url:z.url(),evidenceUrl:z.url()}),
  definition:z.object({en:z.string().min(1),'pt-BR':z.string().min(1)}),limitations:z.object({en:z.string().min(1),'pt-BR':z.string().min(1)}),
  sourceNote:z.string(),sourceOrganization:z.string(),metadataFiles:z.array(rawDownloadSchema).min(1),files:z.array(rawDownloadSchema).min(1),
  recordRefs:z.record(z.string(),z.array(z.object({file:z.string(),index:z.number().int().nonnegative()}).nullable())),
  seriesReview:z.record(z.string(),seriesReviewSchema)
});
export const dashboardSchema = z.object({
  mode: z.enum(['mock','official-candidate','official']),
  notice: z.string().min(20),
  years: z.array(z.number().int()).min(2),
  countries: z.array(z.object({ id: z.string().regex(/^\d{3}$/), iso3: z.string().length(3), iso2:z.string().length(2).optional(), name: z.string().min(1),mapAvailable:z.boolean().optional() })).min(1),
  indicators: z.array(z.object({
    id: z.string().regex(/^[a-z]+$/), label: z.string().min(1), category: categorySchema, unit: z.string().min(1),
    source: z.object({ name: z.string(), url: z.url(), code: z.string(), api: z.url() }),
    values: z.record(z.string(), z.array(z.number().nonnegative().nullable())),
    originalValues:z.record(z.string(),z.array(z.number().nonnegative().nullable())).optional(),
    provenance:indicatorProvenanceSchema.optional()
  })).min(1),
  importManifest:z.object({id:z.string(),retrievedAt:z.iso.datetime(),countryFiles:z.array(rawDownloadSchema).min(1),mappingPackage:z.string(),countryMapping:z.record(z.string(),z.object({iso3:z.string(),iso2:z.string()}))}).optional()
}).superRefine((data, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (data.years.some((y,i) => i > 0 && y <= data.years[i-1])) issue('Years must be unique and ascending');
  if (new Set(data.countries.map(c=>c.id)).size !== data.countries.length) issue('Duplicate country ID');
  if (new Set(data.countries.map(c=>c.iso3)).size !== data.countries.length) issue('Duplicate ISO3');
  if (new Set(data.indicators.map(i=>i.id)).size !== data.indicators.length) issue('Duplicate indicator ID');
  for (const metric of data.indicators) for (const [id, series] of Object.entries(metric.values)) {
    if (!data.countries.some(c=>c.id===id)) issue(`Unknown country ${id}`);
    if (series.length !== data.years.length) issue(`Wrong series length: ${metric.id}/${id}`);
  }
  if(data.mode!=='mock'){
    if(!data.importManifest)issue('Official data need an import manifest');
    for(const c of data.countries){const mapping=data.importManifest?.countryMapping[c.id];if(!mapping||mapping.iso3!==c.iso3||mapping.iso2!==c.iso2)issue(`Untraceable ISO mapping: ${c.id}`);}
    for(const metric of data.indicators){
      const p=metric.provenance;if(!p){issue(`Missing provenance: ${metric.id}`);continue;}
      if(p.indicatorCode!==metric.source.code)issue(`Mismatched source code: ${metric.id}`);
      for(const country of data.countries){
        const values=metric.values[country.id],raw=metric.originalValues?.[country.id],refs=p.recordRefs[country.id],review=p.seriesReview[country.id];
        if(!values||!raw||!refs||!review){issue(`Missing series provenance: ${metric.id}/${country.id}`);continue;}
        if(raw.length!==data.years.length||refs.length!==data.years.length)issue(`Wrong provenance length: ${metric.id}/${country.id}`);
        if(data.mode==='official'&&review.status!=='approved')issue(`Unapproved series: ${metric.id}/${country.id}`);
        for(let i=0;i<values.length;i++){
          if(values[i]===null&&raw[i]!==null)issue(`Missing observation mismatch: ${metric.id}/${country.id}/${i}`);
          if(values[i]!==null){if(raw[i]==null||Math.abs(values[i]!-raw[i]!/p.divisor)>Math.max(1,Math.abs(values[i]!))*1e-12)issue(`Invalid conversion: ${metric.id}/${country.id}/${i}`);if(!refs[i]||!p.files.some(f=>f.path===refs[i]!.file))issue(`Missing raw reference: ${metric.id}/${country.id}/${i}`);}
        }
      }
    }
  }
});
export const visualCollectionSchema = z.array(z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/), title: z.string().min(1), subtitle: z.string().min(1),
  indicator: z.string(), variant: z.number().int().min(0).max(3)
})).refine(items => new Set(items.map(i=>i.slug)).size === items.length, 'Duplicate visual slug');
export const productCollectionSchema = z.array(z.object({
  id: z.string(), name: z.string(), description: z.string(), type: z.string(),
  art: z.enum(['book','print','globe']), url: z.url().refine(url=>url.startsWith('https://')).nullable()
}));
export type DashboardData = z.infer<typeof dashboardSchema>;
