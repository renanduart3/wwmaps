import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dashboardSchema } from '@atlas/contracts';
import { comparisonRows, comparisonCsv } from '../apps/web/src/lib/comparison.js';
const data=dashboardSchema.parse(JSON.parse(await readFile(new URL('../datasets/indicators.json',import.meta.url),'utf8')));
test('comparison enforces 1–5 unique known countries and an available year',()=>{
  for(const ids of [[],['076','076'],['999'],data.countries.slice(0,6).map(c=>c.id)]) assert.throws(()=>comparisonRows(data,ids,2024));
  assert.throws(()=>comparisonRows(data,['076'],1999));
  assert.equal(comparisonRows(data,data.countries.slice(0,5).map(c=>c.id),2024).length,30);
});
test('exports preserve exact selected year, nulls, units, sources and mock status',()=>{
  const changed=structuredClone(data);changed.indicators[0].values['076'][0]=null;
  const rows=comparisonRows(changed,['076'],2010);
  assert.equal(rows[0].value,null);assert.equal(rows[0].year,2010);
  assert.equal(rows[0].unit,'US$ trillion');assert.equal(rows[0].mode,'mock');
  const csv=comparisonCsv(rows);
  assert.ok(csv.includes('"2010","","US$ trillion","mock"'));
  assert.ok(csv.includes(data.indicators[0].source.url));
  assert.ok(comparisonCsv([{...rows[0],label:'=SUM(A1)'}]).includes('\"\'=SUM(A1)\"'));
});
