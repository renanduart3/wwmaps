import {metrics,metricText,type Locale} from './i18n.js';
import type { DashboardData } from '@atlas/contracts';
export const indicatorNames:Record<string,string>=Object.fromEntries(Object.entries(metrics).map(([id,m])=>[id,m.en]));
export const indicatorUnits:Record<string,string>=Object.fromEntries(Object.entries(metrics).map(([id,m])=>[id,m.enUnit]));
export function comparisonRows(data: DashboardData, ids: string[], year: number, lang:Locale='en') {
  if(ids.length < 1 || ids.length > 5 || new Set(ids).size !== ids.length) throw new Error('Select 1–5 unique countries');
  const index=data.years.indexOf(year);
  if(index<0) throw new Error('Unknown year');
  return data.indicators.flatMap(metric=>ids.map(id=>{
    const country=data.countries.find(c=>c.id===id);
    if(!country) throw new Error('Unknown country');
    const p=metric.provenance,ref=p?.recordRefs[id]?.[index],raw=p?.files.find(f=>f.path===ref?.file);
    return {country:country.iso3,indicator:metric.id,label:metricText(metric.id,lang).label,year,value:metric.values[id]?.[index]??null,unit:metricText(metric.id,lang).unit,mode:data.mode,source:metric.source.url,
      source_role:data.mode==='mock'?'planned-reference':'observation-source',source_code:metric.source.code,original_value:metric.originalValues?.[id]?.[index]??null,original_unit:p?.originalUnit??null,divisor:p?.divisor??null,retrieved_at:raw?.retrievedAt??null,source_last_updated:raw?.lastUpdated??null,raw_file:ref?.file??null,raw_record_index:ref?.index??null,raw_sha256:raw?.sha256??null,license:p?.license.id??null,review_status:p?.seriesReview[id]?.status??'synthetic',attribution:p?.attribution??null,license_url:p?.license.url??null};
  }));
}
export function comparisonCsv(rows: ReturnType<typeof comparisonRows>) {
  const cell=(value:unknown)=>{
    const text=String(value??'');
    return `"${(/^[=+\-@\t\r]/.test(text) ? "'"+text : text).replaceAll('"','""')}"`;
  };
  const columns=['country','indicator','label','year','value','unit','mode','source','source_role','source_code','original_value','original_unit','divisor','retrieved_at','source_last_updated','raw_file','raw_record_index','raw_sha256','license','review_status','attribution','license_url'] as const;
  return '\uFEFF'+[columns.map(cell).join(','),...rows.map(row=>columns.map(key=>cell(row[key])).join(','))].join('\r\n');
}
