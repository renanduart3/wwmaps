import type { Locale } from './i18n.js';
export const routeNames={home:['',''],compare:['compare','comparar'],collection:['collection','produtos'],categories:['categories','categorias'],search:['search','busca'],about:['about','sobre'],methodology:['methodology','metodologia'],visual:['visuals','visuais'],tag:['tags','tags'],indicators:['indicators','indicadores'],dataReview:['data-review','revisao-dados']} as const;
export type PageKey=keyof typeof routeNames;
export function route(page:PageKey,lang:Locale='en',slug?:string){const name=routeNames[page][lang==='en'?0:1];return `${lang==='en'?'/':'/pt-br/'}${name?name+'/':''}${slug?encodeURIComponent(slug)+'/':''}`;}
export function localeFromPath(path:string):Locale{return path.startsWith('/pt-br/')?'pt-BR':'en';}
export function equivalents(path:string):{en:string; 'pt-BR':string}|null{
  for(const key of Object.keys(routeNames) as PageKey[])for(const lang of ['en','pt-BR'] as const){
    const prefix=route(key,lang);
    if(path===prefix)return {en:route(key,'en'),'pt-BR':route(key,'pt-BR')};
    if((key==='visual'||key==='tag')&&path.startsWith(prefix)){
      const slug=decodeURIComponent(path.slice(prefix.length).replace(/\/$/,''));
      if(slug&&!slug.includes('/'))return {en:route(key,'en',slug),'pt-BR':route(key,'pt-BR',slug)};
    }
  }return null;
}
