import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dashboardSchema} from '@atlas/contracts';
import {importSeries} from '../scripts/lib/worldbank.js';
import {comparisonRows,comparisonCsv} from '../apps/web/src/lib/comparison.js';
const row=(value:number|null,date='2024',country='BRA')=>({indicator:{id:'TEST',value:'Test'},country:{id:'BR',value:'Brazil'},countryiso3code:country,date,value,unit:'',obs_status:'',decimal:0});
const countries=[{id:'076',iso3:'BRA',name:'Brazil'}];
test('source import preserves nulls and zeros, removes aggregates and never fills missing years',()=>{
 const result=importSeries([{path:'test.json',rows:[row(null,'2023'),row(0),row(123,'2024','WLD')]}],countries,[2022,2023,2024],'TEST',1000);
 assert.deepEqual(result.values['076'],[null,null,0]);assert.equal(result.refs['076'][0],null);assert.equal(result.refs['076'][1]!.index,0);assert.equal(result.aggregateOrExcluded,1);
 assert.throws(()=>importSeries([{path:'x',rows:[row(1),row(2)]}],countries,[2024],'TEST',1),/Duplicate/);
 assert.throws(()=>importSeries([{path:'x',rows:[row(1)]}],countries,[2024],'WRONG',1),/Unexpected/);
});
const candidate=JSON.parse(await readFile(new URL('../datasets/candidates/worldbank.json',import.meta.url),'utf8'));
test('real candidate cannot bypass provenance, conversions, ISO matching or editorial approval',()=>{
 assert.equal(dashboardSchema.safeParse(candidate).success,true);
 const missing=structuredClone(candidate);delete missing.indicators[0].provenance;assert.equal(dashboardSchema.safeParse(missing).success,false);
 const wrong=structuredClone(candidate);wrong.indicators[0].values['076'][14]+=1;assert.equal(dashboardSchema.safeParse(wrong).success,false);
 const approved=structuredClone(candidate);approved.mode='official';assert.equal(dashboardSchema.safeParse(approved).success,false);
 const iso=structuredClone(candidate);iso.importManifest.countryMapping['076'].iso3='USA';assert.equal(dashboardSchema.safeParse(iso).success,false);
});
test('candidate export carries the exact source pointer, raw value, conversion and pending state',()=>{
 const data=dashboardSchema.parse(candidate),rows=comparisonRows(data,['076'],2024),gdp=rows.find(r=>r.indicator==='gdp')!;
 assert.equal(gdp.mode,'official-candidate');assert.equal(gdp.review_status,'pending');assert.equal(gdp.source_role,'observation-source');assert.ok(gdp.raw_sha256);assert.ok(gdp.raw_file);assert.equal(gdp.divisor,1e12);assert.equal(gdp.value,gdp.original_value!/gdp.divisor!);
 const csv=comparisonCsv(rows);assert.ok(csv.includes('raw_sha256'));assert.ok(csv.includes('official-candidate'));
});
