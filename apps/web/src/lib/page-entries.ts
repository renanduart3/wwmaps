import {route,type PageKey} from './routes';
import {visuals} from './atlas';
import {getPublicPosts} from './posts';
import type {Locale} from './i18n';
export async function pageEntries(){
 const entries:{path:string;page:PageKey;lang:Locale;slug?:string;redirect?:string}[]=[];
 const tags=[...new Set((await getPublicPosts()).flatMap(p=>p.tags))];
 for(const lang of ['en','pt-BR'] as const){
  for(const page of ['collection','categories','search','about','methodology','indicators','dataReview'] as const)entries.push({path:route(page,lang),page,lang});
  for(const v of visuals)entries.push({path:route('visual',lang,v.slug),page:'visual',lang,slug:v.slug});
  for(const tag of tags)entries.push({path:route('tag',lang,tag),page:'tag',lang,slug:tag});
 }
 for(const [old,page] of [['produtos','collection'],['categorias','categories'],['busca','search'],['sobre','about'],['metodologia','methodology']] as const)entries.push({path:`/${old}/`,page,lang:'pt-BR',redirect:route(page,'pt-BR')});
 for(const v of visuals)entries.push({path:`/visuais/${v.slug}/`,page:'visual',lang:'pt-BR',redirect:route('visual','pt-BR',v.slug)});
 return entries;
}
