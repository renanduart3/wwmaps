import { z } from 'zod';
import { categorySchema } from './taxonomy.js';

export const imageStyleSchema=z.enum(['handdraw-simple','editorial-data','micro-people-data']);
export const editorialDataLayoutSchema=z.enum(['editorial-data-map','editorial-data-ranking','editorial-data-event-map','editorial-data-profile']);
const lang=z.enum(['en','pt-BR']);
const source=z.object({id:z.string().regex(/^[a-z0-9-]+$/),title:z.string().min(1),url:z.url().refine(s=>/^https?:\/\//.test(s)),accessedAt:z.iso.date()});
export const visualPostSchema=z.object({
  id:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status:z.enum(['draft','scheduled','published']).default('draft'),
  publishAt:z.iso.datetime({offset:true}).nullable().default(null),
  style:imageStyleSchema,
  category:categorySchema.default('geography'),
  tags:z.array(z.string().min(1)).default([]),
  languages:z.array(lang).min(1).default(['en']),
  visual:z.object({
    kind:z.enum(['map','bar-chart','line-chart','ranking','comparison','illustration']).default('map'),
    instructions:z.string().default(''),
    layout:editorialDataLayoutSchema.optional(),
  }).default({kind:'map',instructions:''}),
  translations:z.partialRecord(lang,z.object({
    title:z.string().min(1).max(140),subtitle:z.string().max(320).default(''),
    body:z.string().default(''),caption:z.string().default(''),alt:z.string().default(''),sourceCredit:z.string().default(''),
    imageText:z.array(z.string().min(1)).default([]),
  })),
  sources:z.array(source).default([]),
  facts:z.array(z.object({text:z.string().min(1),sourceIds:z.array(z.string()).min(1)})).default([]),
  data:z.array(z.object({label:z.string().min(1),value:z.number().finite().nullable(),unit:z.string().min(1),period:z.string().min(1),sourceIds:z.array(z.string()).min(1)})).default([]),
}).strict().superRefine((p,ctx)=>{
  if(p.visual.layout&&p.style!=='editorial-data')ctx.addIssue({code:'custom',path:['visual','layout'],message:'Editorial data layouts require style editorial-data'});
  if(new Set(p.languages).size!==p.languages.length)ctx.addIssue({code:'custom',message:'Duplicate language'});
  for(const language of p.languages)if(!p.translations[language])ctx.addIssue({code:'custom',message:`Missing translation ${language}`});
  if(p.status!=='draft'&&!p.publishAt)ctx.addIssue({code:'custom',message:'Set publishAt with an explicit timezone before scheduling/publishing'});
  const ids=new Set(p.sources.map(s=>s.id));
  if(ids.size!==p.sources.length)ctx.addIssue({code:'custom',message:'Duplicate source ID'});
  for(const item of [...p.facts,...p.data])for(const id of item.sourceIds)if(!ids.has(id))ctx.addIssue({code:'custom',message:`Missing source ${id}`});
});
export type VisualPost=z.infer<typeof visualPostSchema>;
export type ImageStyle=z.infer<typeof imageStyleSchema>;

/** Infer only layouts supported by the declared format; events/profiles require an explicit choice. */
export function editorialDataLayout(p:VisualPost){
  if(p.style!=='editorial-data')return undefined;
  return p.visual.layout??(p.visual.kind==='map'?'editorial-data-map':p.visual.kind==='ranking'?'editorial-data-ranking':undefined);
}

export function visualPostReady(p:VisualPost){
  const errors:string[]=[];
  if(!p.sources.length||!p.facts.length)errors.push('Research needs sources and source-backed facts before final prompts');
  if(!p.visual.instructions.trim())errors.push('Describe the map/chart composition in visual.instructions');
  if(['bar-chart','line-chart','ranking','comparison'].includes(p.visual.kind)&&!p.data.some(d=>d.value!==null))errors.push('A statistical chart requires exact sourced observations, not an empty/all-missing table');
  for(const language of p.languages){
    const copy=p.translations[language]!;
    if(!copy.subtitle.trim()||!copy.alt.trim()||!copy.sourceCredit.trim())errors.push(`${language}: complete subtitle, image alt text and localized sourceCredit`);
  }
  return errors;
}
