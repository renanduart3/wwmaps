import {tr,metricText,countryName} from './i18n';
import type { DashboardData } from '@atlas/contracts';
export function initDashboard(data: Pick<DashboardData, 'years' | 'countries'> & { indicators: Array<Omit<DashboardData['indicators'][number], 'category'>> }) {
  const lang=document.documentElement.lang==='pt-BR'?'pt-BR':'en';
  const t=(key:Parameters<typeof tr>[1])=>tr(lang,key);
  const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  let metric = data.indicators[0], year = data.years.length-1, country = data.countries[0].id;
  let yearTimer: ReturnType<typeof setInterval> | undefined, metricTimer: ReturnType<typeof setInterval> | undefined;
  const number = (v: number) => v.toLocaleString(lang, { maximumFractionDigits: 2 });
  const values = () => metric.values;
  function render() {
    const copy=metricText(metric.id,lang);
    const all = values(), max = Math.max(1, ...Object.values(all).flat().filter(v=>v != null));
    document.querySelector('.map-panel .world-map')!.setAttribute('aria-label', `${t('mapLabel')}: ${copy.label}`);
    el('metric-name').textContent = copy.label; el('metric-unit').textContent = copy.unit;
    for (const id of ['map-year','year-output','ranking-year']) el(id).textContent = String(data.years[year]);
    el<HTMLInputElement>('year-slider').value = String(year);
    el<HTMLAnchorElement>('metric-source').href = metric.source.url;
    const selectedValue = all[country]?.[year];
    el('country-value').textContent = selectedValue == null ? '—' : number(selectedValue);
    el('country-unit').textContent = copy.unit;
    document.querySelectorAll<SVGPathElement>('[data-country]').forEach(path => {
      const id = path.dataset.country!, value = all[id]?.[year], iso3 = data.countries.find(c => c.id === id)?.iso3;
      path.setAttribute('fill', value == null ? '#e6e9e5' : `hsl(270 34% ${88-Math.sqrt(value/max)*57}%)`);
      path.setAttribute('stroke', id === country ? '#BE2349' : '#403048');
      path.setAttribute('stroke-width', id === country ? '2' : '.75');
      path.querySelector('title')!.textContent = `${iso3?countryName(iso3,lang):t('noData')}: ${value == null ? t('noData') : `${number(value)} ${copy.unit}`} (${data.years[year]})`;
    });
    const series = all[country] ?? [];
    const present = series.filter(v=>v!=null);
    const low = Math.min(...present)*.9, high = Math.max(...present)*1.1;
    const points = series.map((v,i) => v == null ? null : [i*250/(data.years.length-1)+5, 90-(v-low)/(high-low||1)*80]);
    const d = points.map((p,i)=>p ? `${i && points[i-1]?'L':'M'}${p[0]},${p[1]}` : '').join(' ');
    document.getElementById('trend-line')!.setAttribute('d',d);
    document.getElementById('trend-area')!.setAttribute('d',present.length===series.length && series.length ? `${d} L255,100 L5,100 Z` : '');
    const dot = document.getElementById('trend-point')!;
    dot.style.display = points[year] ? '' : 'none';
    dot.setAttribute('cx',String(points[year]?.[0]??0)); dot.setAttribute('cy',String(points[year]?.[1]??0));
    document.getElementById('trend')!.setAttribute('aria-label', `${copy.label}, ${el<HTMLSelectElement>('country-select').selectedOptions[0].textContent}, ${t('trendLabel')} ${data.years[0]}–${data.years.at(-1)}`);
    el('ranking').replaceChildren(...data.countries.filter(c=>all[c.id]?.[year] != null).sort((a,b)=>all[b.id][year]!-all[a.id][year]!).slice(0,4).map(c=>{
      const li=document.createElement('li'), label=document.createElement('span'), value=document.createElement('strong');
      label.textContent=countryName(c.iso3,lang); value.textContent=number(all[c.id][year]!); li.append(label,value);
      li.style.setProperty('--bar',`${all[c.id][year]!/max*100}%`); return li;
    }));
    document.querySelectorAll<HTMLButtonElement>('[data-indicator]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.indicator===metric.id)));
  }
  el<HTMLInputElement>('year-slider').max = String(data.years.length-1);
  function stopYears() { clearInterval(yearTimer); yearTimer=undefined; el('play-years').textContent='▶'; el('play-years').setAttribute('aria-pressed','false'); el('play-years').setAttribute('aria-label',t('play')); }
  function stopMetrics() { clearInterval(metricTimer); metricTimer=undefined; el('cycle-metrics').textContent=t('cycle'); el('cycle-metrics').setAttribute('aria-pressed','false'); }
  el('year-slider').addEventListener('input',e=>{stopYears();year=Number((e.target as HTMLInputElement).value);render();});
  el('country-select').addEventListener('change',e=>{country=(e.target as HTMLSelectElement).value;render();});
  document.querySelectorAll<SVGPathElement>('[data-country]').forEach(p=>{
    p.dataset.name=p.querySelector('title')!.textContent!;
    if(!values()[p.dataset.country!]) return;
    p.style.cursor='pointer';
    p.addEventListener('click',()=>{country=p.dataset.country!;el<HTMLSelectElement>('country-select').value=country;render();});
  });
  document.querySelectorAll<HTMLButtonElement>('[data-indicator]').forEach(b=>b.addEventListener('click',()=>{stopMetrics();metric=data.indicators.find(i=>i.id===b.dataset.indicator)!;render();}));
  el('play-years').addEventListener('click',()=>{if(yearTimer){stopYears();return;} el('play-years').textContent='Ⅱ';el('play-years').setAttribute('aria-label',t('pause'));el('play-years').setAttribute('aria-pressed','true');yearTimer=setInterval(()=>{year=(year+1)%data.years.length;render();},1100);});
  el('cycle-metrics').addEventListener('click',()=>{if(metricTimer){stopMetrics();return;}el('cycle-metrics').textContent=t('pauseCycle');el('cycle-metrics').setAttribute('aria-pressed','true');metricTimer=setInterval(()=>{metric=data.indicators[(data.indicators.indexOf(metric)+1)%data.indicators.length];render();},6000);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopYears();stopMetrics();}});
  render();
}
