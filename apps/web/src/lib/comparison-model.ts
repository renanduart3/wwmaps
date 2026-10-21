import type { DashboardData } from '@atlas/contracts';
import { comparisonRows } from './comparison.js';
import { countryName, type Locale } from './i18n.js';

export const countryColors = ['#7132DF','#BE2349','#85652F','#146E66','#333B80'];
export const lineDashes = ['', '9 4', '3 4', '13 4 3 4', '1 5'];
export const comparisonPresets = [
  { id:'brics', iso3:['BRA','RUS','IND','CHN','ZAF'] },
  { id:'g7', iso3:['USA','CAN','DEU','FRA','JPN'] },
  { id:'southAmerica', iso3:['BRA','ARG','CHL'] },
] as const;
export function presetCountries(data:DashboardData, preset:string) {
  const definition=comparisonPresets.find(p=>p.id===preset);
  if(!definition) throw new Error('Unknown preset');
  const ids=definition.iso3.map(iso=>data.countries.find(c=>c.iso3===iso)?.id);
  // Never silently truncate a group or substitute a missing member.
  return ids.every((id):id is string=>!!id) ? ids : null;
}
export function searchCountries(data:DashboardData, query:string, lang:Locale) {
  const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase(lang).trim();
  const q=normalize(query);
  return data.countries.filter(c=>normalize(`${countryName(c.iso3,lang)} ${c.iso3} ${c.id}`).includes(q)).map(c=>c.id);
}
export function comparisonDataRows(data:DashboardData,ids:string[],year:number,lang:Locale,allYears=false){
  return (allYears ? data.years : [year]).flatMap(y=>comparisonRows(data,ids,y,lang));
}
export function historySeries(data:DashboardData,ids:string[],metricId:string){
  comparisonRows(data,ids,data.years[0]); // validate selection, including IDs
  const metric=data.indicators.find(m=>m.id===metricId);
  if(!metric) throw new Error('Unknown indicator');
  const max=Math.max(1,...ids.flatMap(id=>metric.values[id]??[]).filter((v):v is number=>v!=null));
  return { max, series:ids.map((id,index)=>{
    const values=metric.values[id]??data.years.map(()=>null);
    const segments:{year:number;value:number}[][]=[];
    let segment:{year:number;value:number}[]=[];
    data.years.forEach((year,i)=>{
      const value=values[i];
      if(value==null){if(segment.length)segments.push(segment);segment=[];}
      else { if(i>0 && year!==data.years[i-1]+1){if(segment.length)segments.push(segment);segment=[];} segment.push({year,value}); }
    });
    if(segment.length)segments.push(segment);
    return {id,color:countryColors[index],dash:lineDashes[index],segments};
  })};
}
export function comparisonView(query:string,metricIds:readonly string[]){
  const p=new URLSearchParams(query);
  return { metric: metricIds.includes(p.get('metric')??'') ? p.get('metric')! : metricIds[0], allYears:p.get('allYears')==='1' };
}
