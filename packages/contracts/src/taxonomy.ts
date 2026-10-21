import { z } from 'zod';
import { visualModeSchema } from './visual-style.js';

export const categorySchema = z.enum(['geography','history','economy','geopolitics','culture','environment','society','technology','brazil','regional-intelligence','travel']);
export const contentTypeSchema = z.enum(['map-analysis','statistical-geography','regional-intelligence','comparative-insight']);
export const mapTypeSchema = z.enum(['choropleth','highlight','bubble','flow','historical-timeline','projection-comparison','comparative','regional-heatmap']);
export const commercialPurposeSchema = z.enum(['audience-growth','education','products','affiliates','b2b']);
export const geographicScopeSchema = z.enum(['world','continent','country','multi-country','region','state','municipality','historical-region']);
export const outputSchema = z.enum(['website-visual','website-article','instagram-image','instagram-caption']);

export const categories = [
  {id:'geography',en:'Geography & Demography',pt:'Geografia e Demografia',priority:true,purposes:['audience-growth'],examples:'Population, density, migration, urbanization, true country size'},
  {id:'history',en:'History & Civilizations',pt:'História e Civilizações',priority:true,purposes:['audience-growth','products'],examples:'Empires, wars, historical borders, trade routes'},
  {id:'economy',en:'Economy & Development',pt:'Economia e Desenvolvimento',priority:true,purposes:['audience-growth','b2b'],examples:'GDP, income, poverty, inflation, inequality, purchasing power'},
  {id:'geopolitics',en:'Geopolitics & Politics',pt:'Geopolítica e Política',priority:true,purposes:['audience-growth'],examples:'Alliances, elections, economic blocs, conflicts, political systems'},
  {id:'culture',en:'Religion & Culture',pt:'Religião e Cultura',priority:true,purposes:['audience-growth','education'],examples:'Religions, languages, traditions, expansion of Christianity'},
  {id:'environment',en:'Environment & Natural Resources',pt:'Meio Ambiente e Recursos Naturais',priority:true,purposes:['audience-growth','education'],examples:'Forests, water, oil, climate, energy, deforestation'},
  {id:'society',en:'Society & Quality of Life',pt:'Sociedade e Qualidade de Vida',priority:false,purposes:['audience-growth'],examples:'Education, health, safety, life expectancy, HDI'},
  {id:'technology',en:'Technology & Infrastructure',pt:'Tecnologia e Infraestrutura',priority:false,purposes:['education','b2b'],examples:'Internet, energy, railways, ports, data centers, industry'},
  {id:'brazil',en:'Brazil & Regions',pt:'Brasil e Regiões',priority:false,purposes:['audience-growth'],examples:'Brazilian states, municipalities, population, regional development'},
  {id:'regional-intelligence',en:'Regional Business Intelligence',pt:'Inteligência Comercial Regional',priority:false,purposes:['b2b'],examples:'Competition, demand, searches, businesses, fleets, market opportunities'},
  {id:'travel',en:'Travel & Tourism',pt:'Viagens e Turismo',priority:false,purposes:['products','affiliates'],examples:'Visited countries, national parks, routes, destinations'}
] as const satisfies readonly {id:z.infer<typeof categorySchema>;en:string;pt:string;priority:boolean;purposes:readonly z.infer<typeof commercialPurposeSchema>[];examples:string}[];

export function categoryLabel(id: string, lang: 'en'|'pt-BR' = 'en') {
  const category=categories.find(c=>c.id===id);
  return category ? (lang==='en'?category.en:category.pt) : id;
}

// Planning vocabulary does not imply renderer support. Execution has a separate gate.
export const editorialPlanSchema = z.object({
  visualMode: visualModeSchema.optional(),
  sensitiveContent: z.boolean().default(false),
  topic:z.string().min(1),category:categorySchema,contentType:contentTypeSchema,mapType:mapTypeSchema,
  geographicScope:geographicScopeSchema,
  commercialPurpose:z.array(commercialPurposeSchema).min(1).default(['audience-growth']),
  languages:z.array(z.enum(['en','pt-BR'])).min(1).default(['en','pt-BR']),
  outputs:z.array(outputSchema).min(1).default(['website-visual','instagram-image','instagram-caption'])
}).strict().superRefine((plan,ctx)=>{
  for(const key of ['commercialPurpose','languages','outputs'] as const) {
    if(new Set(plan[key]).size!==plan[key].length)ctx.addIssue({code:'custom',path:[key],message:'Duplicate selection'});
  }
});

export const mapCapabilities = [
  {id:'choropleth',web:'demo',studio:'planned',note:'Local mock data and static SVG; no editorial PNG export.'},
  {id:'highlight',web:'planned',studio:'planned',note:'Selecting one country is not a thematic highlight template.'},
  {id:'bubble',web:'planned',studio:'planned',note:'Needs point coordinates and area-proportional circles.'},
  {id:'flow',web:'planned',studio:'planned',note:'Needs origins, destinations, magnitude and geographic routes.'},
  {id:'historical-timeline',web:'planned',studio:'planned',note:'Indicator animation does not reconstruct historical borders.'},
  {id:'projection-comparison',web:'legacy-schematic',studio:'implemented',note:'Studio: real Natural Earth geometry in Mercator and Gall–Peters; illustrated SVG/PNG/WebP. Published legacy web sample awaits review and replacement.'},
  {id:'comparative',web:'partial',studio:'planned',note:'Country bars and CSV/JSON exist; two synchronized maps do not.'},
  {id:'regional-heatmap',web:'planned',studio:'planned',note:'Needs subnational geometry, density method and coverage rules.'}
] as const satisfies readonly {id:z.infer<typeof mapTypeSchema>;web:string;studio:string;note:string}[];
