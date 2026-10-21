import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dashboardSchema } from '@atlas/contracts';
import { comparisonDataRows, searchCountries, presetCountries, historySeries, comparisonView } from '../apps/web/src/lib/comparison-model.js';
import { comparisonSvg, historyChart } from '../apps/web/src/lib/comparison-visual.js';
import { comparisonFilename, comparisonJson } from '../apps/web/src/lib/comparison-export.js';
const data=dashboardSchema.parse(JSON.parse(await readFile(new URL('../datasets/indicators.json',import.meta.url),'utf8')));

test('search matches localized accents and ISO; presets are explicit and never substitute missing countries',()=>{
  assert.ok(searchCountries(data,'turkiye','en').includes('792'));
  assert.deepEqual(searchCountries(data,'BRA','pt-BR'),['076']);
  for(const preset of ['brics','g7','southAmerica'])assert.ok(presetCountries(data,preset)!.length<=5);
  const missing=structuredClone(data);missing.countries=missing.countries.filter(c=>c.iso3!=='RUS');
  assert.equal(presetCountries(missing,'brics'),null);
  assert.throws(()=>presetCountries(data,'unknown'));
});
test('history uses one shared scale, splits missing and nonconsecutive years, and retains isolated zeros',()=>{
  const changed=structuredClone(data),metric=changed.indicators[0];
  metric.values['076']=data.years.map(()=>null);metric.values['076'][0]=0;metric.values['076'][2]=4;
  const history=historySeries(changed,['076','840'],'gdp');
  assert.deepEqual(history.series[0].segments,[[{year:2010,value:0}],[{year:2012,value:4}]]);
  assert.ok(history.max>=Math.max(...metric.values['840'].filter((n):n is number=>n!=null)));
  const chart=historyChart(changed,['076'],'gdp','en',2024);
  assert.equal([...chart.matchAll(/<circle /g)].length,2);
  assert.ok(!chart.includes('LNaN'));
  changed.years=[2010,2012,2013];metric.values['076']=[0,3,null];
  assert.equal(historySeries(changed,['076'],'gdp').series[0].segments.length,2);
});
test('all-year exports preserve every selected cell, null and source pointer in either locale',()=>{
  const changed=structuredClone(data);changed.indicators[0].values['076'][0]=null;
  const rows=comparisonDataRows(changed,['076','840'],2024,'pt-BR',true);
  assert.equal(rows.length,15*6*2);assert.equal(rows[0].value,null);assert.equal(rows[0].source_role,'planned-reference');
  const options={data:changed,ids:['076','840'],year:2024,lang:'pt-BR' as const,metric:'income',allYears:true,generatedAt:'2026-10-20T12:00:00Z'};
  const json=JSON.parse(comparisonJson(options));assert.equal(json.rows.length,rows.length);assert.equal(json.historyIndicator,'income');
  assert.match(comparisonFilename(options,'json'),/MOCK-BRA-USA-2024-pt-BR-all-years\.json$/);
  assert.deepEqual(comparisonView('?metric=bad&allYears=1',['gdp','income']),{metric:'gdp',allYears:true});
});
test('visual exports include all indicators, exact selection, units, references and warnings without raw markup injection',()=>{
  const changed=structuredClone(data);changed.indicators[0].source.code='TEST<&"';
  const svg=comparisonSvg(changed,['076','840'],2015,'income','en','2026-10-20T12:00:00Z');
  assert.match(svg,/TEST&lt;&amp;&quot;/);assert.match(svg,/Not official statistics/);assert.match(svg,/2015/);
  for(const m of data.indicators)assert.ok(svg.includes(m.source.url.replaceAll('&','&amp;')));
  assert.ok(svg.includes('US$ trillion'));assert.ok(svg.includes('Brazil'));assert.ok(!svg.includes('NaN'));
  assert.ok(!svg.includes('undefined'));
});
