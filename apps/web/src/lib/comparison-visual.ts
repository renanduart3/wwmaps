import type { DashboardData } from '@atlas/contracts';
import { comparisonRows } from './comparison.js';
import { countryColors, historySeries } from './comparison-model.js';
import { compareText } from './compare-i18n.js';
import { countryName, metricText, tr, type Locale } from './i18n.js';

export const xml=(value:unknown)=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
export const numberLabel=(value:number|null,lang:Locale)=>value==null?tr(lang,'noData'):value.toLocaleString(lang,{maximumFractionDigits:2});
export function wrap(value:string,max:number){
  const lines:string[]=[];
  for(const word of value.split(/\s+/)){
    if(!lines.length || lines.at(-1)!.length+word.length+1>max)lines.push(word);
    else lines[lines.length-1]+=' '+word;
  }
  return lines;
}
export const svgText=(value:string,x:number,y:number,max:number,size=18,color='#281A3B')=>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${wrap(value,max).map((line,i)=>`<tspan x="${x}" dy="${i?size*1.3:0}">${xml(line)}</tspan>`).join('')}</text>`;

export function historyChart(data:DashboardData,ids:string[],metricId:string,lang:Locale,selectedYear:number){
  const t=compareText(lang), {max,series}=historySeries(data,ids,metricId);
  const x=(year:number)=>95+(year-data.years[0])/Math.max(1,data.years.at(-1)!-data.years[0])*990;
  const y=(value:number)=>260-value/max*220;
  const ticks=Array.from({length:5},(_,i)=>max*i/4);
  const yearTicks=[...new Set([data.years[0],data.years[Math.floor((data.years.length-1)/2)],data.years.at(-1)!])];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 330" width="1120" height="330" role="img" aria-label="${xml(`${metricText(metricId,lang).label}: ${data.years[0]}–${data.years.at(-1)}`)}"><title>${xml(t.history)}</title><desc>${xml(t.historyNote+' '+t.noDataNote)}</desc><g aria-hidden="true" font-family="Arial,sans-serif" font-size="16" fill="#51445D">
${ticks.map(v=>`<path d="M95 ${y(v)}H1085" stroke="#D6CBDC" stroke-width="1"/><text x="83" y="${y(v)+5}" text-anchor="end">${xml(numberLabel(v,lang))}</text>`).join('')}
${yearTicks.map(year=>`<text x="${x(year)}" y="290" text-anchor="middle">${year}</text>`).join('')}
<path d="M${x(selectedYear)} 25V260" stroke="#51445D" stroke-dasharray="3 5"/><text x="${Math.min(1020,Math.max(95,x(selectedYear)))}" y="18">${selectedYear}</text>
${series.map(s=>`<g fill="${s.color}" stroke="${s.color}" stroke-width="3">${s.segments.map(segment=>`<path d="${segment.map((point,i)=>`${i?'L':'M'}${x(point.year).toFixed(2)},${y(point.value).toFixed(2)}`).join(' ')}" fill="none" stroke-dasharray="${s.dash}"/>${segment.map(point=>`<circle cx="${x(point.year)}" cy="${y(point.value)}" r="3.5"><title>${xml(`${countryName(data.countries.find(c=>c.id===s.id)!.iso3,lang)} · ${point.year}: ${numberLabel(point.value,lang)} ${metricText(metricId,lang).unit}`)}</title></circle>`).join('')}`).join('')}</g>`).join('')}
</g></svg>`;
}

export function comparisonSvg(data:DashboardData,ids:string[],year:number,metricId:string,lang:Locale,generatedAt:string){
  const rows=comparisonRows(data,ids,year,lang),t=compareText(lang);
  const cardHeight=360, gridBottom=250+Math.ceil(data.indicators.length/2)*cardHeight;
  const sourceLines=data.indicators.flatMap(m=>wrap(`${metricText(m.id,lang).label} [${m.source.code}]: ${m.source.url}`,125));
  const height=gridBottom+650+sourceLines.length*24;
  const cards=data.indicators.map((metric,n)=>{
    const values=rows.filter(row=>row.indicator===metric.id),max=Math.max(1,...values.map(row=>row.value??0));
    return `<g transform="translate(${48+n%2*696} ${250+Math.floor(n/2)*cardHeight})"><rect width="672" height="340" rx="12" fill="#FFFDF8" stroke="#D7C8DB"/>
${svgText(metricText(metric.id,lang).label,22,38,42,24)}${svgText(metricText(metric.id,lang).unit+' · '+year,22,68,58,17)}
${values.map((row,i)=>`<g transform="translate(22 ${106+i*40})">${svgText(countryName(row.country,lang),0,0,23,17)}<rect x="220" y="-15" height="17" width="${row.value==null?0:row.value/max*310}" rx="3" fill="${countryColors[i]}"/><text x="628" y="0" text-anchor="end" font-size="17">${xml(numberLabel(row.value,lang))}</text></g>`).join('')}
<text x="22" y="322" font-size="14" fill="#51445D">${xml(t.sourceCode+': '+metric.source.code)}</text></g>`;
  }).join('');
  const legend=ids.map((id,i)=>{
    const country=data.countries.find(c=>c.id===id)!;
    return `<g transform="translate(${48+i*278} 198)"><rect width="12" height="12" fill="${countryColors[i]}"/>${svgText(countryName(country.iso3,lang),20,12,24,17)}</g>`;
  }).join('');
  const chart=historyChart(data,ids,metricId,lang,year).replace(/<svg[^>]+>/,'<g transform="translate(48 '+(gridBottom+70)+') scale(1.2)">').replace('</svg>','</g>');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="${height}" viewBox="0 0 1440 ${height}" role="img" aria-label="${xml(tr(lang,'compareTitle'))}"><metadata>${xml(JSON.stringify({site:'wwmaps.com',mode:data.mode,generatedAt,year,countries:ids,historyIndicator:metricId,rows}))}</metadata><rect width="1440" height="${height}" fill="#FAF5E9"/><g font-family="Arial,sans-serif" fill="#281A3B">
<text x="48" y="55" fill="#7132DF" font-size="24" font-weight="bold" font-style="italic">WWMAPS.COM</text>
${svgText(tr(lang,'compareTitle').toUpperCase()+' / '+year,48,110,70,38)}
${svgText(data.mode==='mock'?tr(lang,'mockNotice'):t.mode+': '+data.mode,48,151,125,19,'#92213E')}
${legend}${cards}
${svgText(t.history+' / '+metricText(metricId,lang).label+' · '+metricText(metricId,lang).unit,48,gridBottom+40,90,24)}${chart}
${svgText(t.noDataNote,48,gridBottom+480,135,17)}
${svgText(t.scopeNote,48,gridBottom+514,135,17)}
${svgText(t.generated+': '+generatedAt+' / '+t.mode+': '+data.mode,48,gridBottom+548,135,16)}
${svgText(data.mode==='mock'?tr(lang,'demoWarning'):t.source,48,gridBottom+580,135,17,'#92213E')}
${sourceLines.map((line,i)=>svgText(line,48,gridBottom+625+i*24,140,15)).join('')}
</g></svg>`;
}
