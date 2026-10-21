import type { DashboardData } from '@atlas/contracts';
import { tr, metricText, countryName } from './i18n.js';
import { compareText } from './compare-i18n.js';
import { comparisonSelection,comparisonQuery } from './comparison-state.js';
import { comparisonRows } from './comparison.js';
import { comparisonDataRows, countryColors, lineDashes, presetCountries, searchCountries, comparisonView } from './comparison-model.js';
import { historyChart, numberLabel } from './comparison-visual.js';

export function initComparison(data:DashboardData){
 const root=document.querySelector<HTMLElement>('[data-comparison]');if(!root)return;
 const lang=root.dataset.language==='pt-BR'?'pt-BR':'en', t=compareText(lang);
 const el=<T extends HTMLElement=HTMLElement>(id:string)=>root.querySelector<T>('#'+id)!;
 const inputs=Array.from(root.querySelectorAll<HTMLInputElement>('[name="compare-country"]'));
 const year=el<HTMLSelectElement>('compare-year'),metric=el<HTMLSelectElement>('history-indicator');
 const search=el<HTMLInputElement>('country-search'),allYears=el<HTMLInputElement>('compare-all-years');
 const initial=comparisonSelection(location.search,data.countries.map(c=>c.id),data.years);
 const view=comparisonView(location.search,data.indicators.map(m=>m.id));
 let selected=initial.countries;year.value=String(initial.year);metric.value=view.metric;allYears.checked=view.allYears;
 const name=(id:string)=>countryName(data.countries.find(c=>c.id===id)!.iso3,lang);
 function filterCountries(){
   const visible=searchCountries(data,search.value,lang);
   inputs.forEach(input=>(input.parentElement!.hidden=!visible.includes(input.value)));
   el('country-search-count').textContent=`${visible.length} / ${inputs.length} ${t.results}`;
   el('country-search-empty').hidden=visible.length>0;
 }
 function syncUrl(){
   const query=new URLSearchParams(comparisonQuery(selected,Number(year.value)));
   query.set('metric',metric.value);if(allYears.checked)query.set('allYears','1');
   history.replaceState(null,'',`${location.pathname}?${query}`);
   document.querySelectorAll<HTMLAnchorElement>('[data-language-switch]').forEach(link=>{const url=new URL(link.href);url.search=query.toString();link.href=url.href;});
 }
 function render(){
   syncUrl();el('selection-count').textContent=`${selected.length} / 5`;
   inputs.forEach(input=>{input.checked=selected.includes(input.value);input.disabled=(!input.checked&&selected.length===5)||(input.checked&&selected.length===1);});
   const chips=el('selected-countries');chips.replaceChildren();
   selected.forEach((id,i)=>{
     const button=document.createElement('button');button.type='button';button.textContent=`${name(id)} ×`;button.style.borderColor=countryColors[i];
     button.setAttribute('aria-label',`${t.remove} ${name(id)}`);button.disabled=selected.length===1;
     button.addEventListener('click',()=>{selected=selected.filter(c=>c!==id);render();el('compare-status').textContent=t.selectionChanged;search.focus();});chips.append(button);
   });
   const rows=comparisonRows(data,selected,Number(year.value),lang),results=el('comparison-results');results.replaceChildren();
   data.indicators.forEach(m=>{
     const section=document.createElement('section');section.className='compare-metric';
     const heading=document.createElement('h2');heading.textContent=metricText(m.id,lang).label;
     const unit=document.createElement('p');unit.className='metric-unit';unit.textContent=`${metricText(m.id,lang).unit} · ${year.value}`;section.append(heading,unit);
     const subset=rows.filter(r=>r.indicator===m.id),max=Math.max(1,...subset.map(r=>r.value??0));
     subset.forEach((row,i)=>{
       const line=document.createElement('div');line.className='compare-row';
       const label=document.createElement('span');label.textContent=name(selected[i]);
       const value=document.createElement('strong');value.textContent=numberLabel(row.value,lang);
       const track=document.createElement('div');track.className='compare-track';track.setAttribute('aria-hidden','true');
       const bar=document.createElement('i');bar.style.width=`${(row.value??0)/max*100}%`;bar.style.background=countryColors[i];track.append(bar);line.append(label,value,track);section.append(line);
     });
     const source=document.createElement('a');source.href=m.source.url;source.textContent=t.source;source.target='_blank';source.rel='noopener';section.append(source);results.append(section);
   });
   el('history-unit').textContent=metricText(metric.value,lang).unit;
   el('comparison-history').innerHTML=historyChart(data,selected,metric.value,lang,Number(year.value));
   const legend=el('history-legend');legend.replaceChildren();
   selected.forEach((id,i)=>{const entry=document.createElement('span');const sample=document.createElementNS('http://www.w3.org/2000/svg','svg');sample.setAttribute('viewBox','0 0 34 10');sample.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M1 5H33');path.setAttribute('stroke',countryColors[i]);path.setAttribute('stroke-width','3');path.setAttribute('stroke-dasharray',lineDashes[i]);sample.append(path);entry.append(sample,document.createTextNode(name(id)));legend.append(entry);});
   const tbody=root!.querySelector('tbody')!,fragment=document.createDocumentFragment();
   comparisonDataRows(data,selected,Number(year.value),lang,allYears.checked).forEach(row=>{
     const line=document.createElement('tr');
     [row.label,countryName(row.country,lang),row.year,numberLabel(row.value,lang),row.unit].forEach((value,i)=>{const cell=document.createElement(i===0?'th':'td');if(i===0)cell.setAttribute('scope','row');cell.textContent=String(value);line.append(cell);});
     const source=document.createElement('td'),link=document.createElement('a');link.href=row.source;link.textContent=row.source_code;link.target='_blank';link.rel='noopener';source.append(link);line.append(source);fragment.append(line);
   });tbody.replaceChildren(fragment);
   el('export-scope').textContent=`${t.scope}: ${allYears.checked?t.full:t.snapshot+' '+year.value}`;
   filterCountries();
 }
 inputs.forEach(input=>input.addEventListener('change',()=>{
   if(input.checked&&!selected.includes(input.value)&&selected.length<5)selected.push(input.value);
   else if(!input.checked&&selected.length>1)selected=selected.filter(id=>id!==input.value);
   render();el('compare-status').textContent=t.selectionChanged;
 }));
 search.addEventListener('input',filterCountries);
 [year,metric,allYears].forEach(input=>input.addEventListener('change',()=>{render();el('compare-status').textContent=t.selectionChanged;}));
 root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
   const ids=presetCountries(data,button.dataset.preset!);if(!ids){el('compare-status').textContent=t.unavailable;return;}
   selected=ids;search.value='';render();el('compare-status').textContent=t.selectionChanged;
 }));
 el('share-comparison').addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(location.href);el('compare-status').textContent=t.copied;}
   catch{const fallback=el('share-fallback');fallback.hidden=false;const input=fallback.querySelector('input')!;input.value=location.href;input.focus();input.select();}
 });
 root.querySelectorAll<HTMLButtonElement>('[data-export]').forEach(button=>button.addEventListener('click',async()=>{
   const buttons=root.querySelectorAll<HTMLButtonElement>('[data-export]');buttons.forEach(b=>b.disabled=true);el('export-status').textContent=t.exporting;
   // Capture one immutable selection before lazy loading; editing controls cannot alter this export mid-flight.
   const options={data,ids:[...selected],year:Number(year.value),metric:metric.value,lang,allYears:allYears.checked,generatedAt:new Date().toISOString()} satisfies import('./comparison-export.js').ComparisonExport;
   try{const {exportComparison}=await import('./comparison-export.js');await exportComparison(button.dataset.export as 'csv'|'json'|'svg'|'png'|'pdf',options);el('export-status').textContent=tr(lang,'exported');}
   catch(error){console.error('Comparison export failed',error);el('export-status').textContent=t.failed;}
   finally{buttons.forEach(b=>b.disabled=false);}
 }));
 el('export-print').addEventListener('click',()=>window.print());
 window.addEventListener('popstate',()=>{
   const state=comparisonSelection(location.search,data.countries.map(c=>c.id),data.years),view=comparisonView(location.search,data.indicators.map(m=>m.id));
   selected=state.countries;year.value=String(state.year);metric.value=view.metric;allYears.checked=view.allYears;render();
 });
 render();
}
