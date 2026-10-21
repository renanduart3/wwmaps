import {z} from 'zod';
import type {DashboardData} from '@atlas/contracts';
export const apiPageSchema=z.tuple([z.object({page:z.coerce.number().int().positive(),pages:z.coerce.number().int().positive(),total:z.coerce.number().int().nonnegative(),lastupdated:z.string().optional()}).passthrough(),z.array(z.unknown())]);
export const observationSchema=z.object({indicator:z.object({id:z.string(),value:z.string()}),country:z.object({id:z.string(),value:z.string()}),countryiso3code:z.string(),date:z.string().regex(/^\d{4}$/),value:z.number().nonnegative().nullable(),unit:z.string(),obs_status:z.string(),decimal:z.number()});
export const wbCountrySchema=z.object({id:z.string(),iso2Code:z.string(),name:z.string(),region:z.object({id:z.string(),value:z.string()})});
export function importSeries(pages:{path:string;rows:unknown[]}[],countries:DashboardData['countries'],years:number[],code:string,divisor:number){
 const index=new Map(countries.map(c=>[c.iso3,c]));
 const originals:Record<string,(number|null)[]>={},refs:Record<string,({file:string;index:number}|null)[]>={};
 for(const c of countries){originals[c.id]=years.map(()=>null);refs[c.id]=years.map(()=>null);}
 let aggregateOrExcluded=0;
 for(const page of pages)page.rows.forEach((input,i)=>{
  const row=observationSchema.parse(input);if(row.indicator.id!==code)throw new Error('Unexpected indicator code');
  const country=index.get(row.countryiso3code);if(!country){aggregateOrExcluded++;return;}
  const year=years.indexOf(Number(row.date));if(year<0)throw new Error('Observation outside requested period');
  if(refs[country.id][year])throw new Error(`Duplicate observation ${row.countryiso3code}/${row.date}`);
  originals[country.id][year]=row.value;refs[country.id][year]={file:page.path,index:i};
 });
 const values=Object.fromEntries(Object.entries(originals).map(([id,series])=>[id,series.map(v=>v===null?null:v/divisor)]));
 return {values,originals,refs,aggregateOrExcluded};
}
