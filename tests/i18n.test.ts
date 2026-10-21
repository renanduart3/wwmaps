import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {route,equivalents} from '../apps/web/src/lib/routes.js';
import {tr,metrics,visualText,productText,countryName} from '../apps/web/src/lib/i18n.js';
import {comparisonSelection,comparisonQuery} from '../apps/web/src/lib/comparison-state.js';
const json=async(name:string)=>JSON.parse(await readFile(new URL(`../datasets/${name}.json`,import.meta.url),'utf8'));
const data=await json('indicators');
const visuals=await json('visuals');const products=await json('products');

test('locale routes have equivalent paths and never put the PT home at root',()=>{
 assert.equal(route('home','en'),'/');assert.equal(route('home','pt-BR'),'/pt-br/');
 for(const page of ['home','compare','collection','categories','search','about','methodology','visual','tag'] as const){const slug=page==='visual'?'visual-1':page==='tag'?'maps':undefined;for(const lang of ['en','pt-BR'] as const){const pair=equivalents(route(page,lang,slug))!;assert.equal(pair.en,route(page,'en',slug));assert.equal(pair['pt-BR'],route(page,'pt-BR',slug));}}
 assert.equal(equivalents('/missing/'),null);
});
test('the entire demonstration catalog has translations and localized countries',()=>{
 for(const i of data.indicators)assert.ok(metrics[i.id]);
 for(const lang of ['en','pt-BR'] as const){for(const v of visuals)assert.ok(visualText(v,lang).title);for(const p of products)assert.ok(productText(p,lang).name);assert.ok(tr(lang,'mockNotice'));}
 assert.equal(countryName('BRA','en'),'Brazil');assert.equal(countryName('BRA','pt-BR'),'Brasil');
 assert.throws(()=>visualText({slug:'new',title:'Novo',subtitle:'Teste'},'en'),/Missing/);
});
test('comparison selection survives language navigation and rejects invalid parameters',()=>{
 const ids=data.countries.map((c:{id:string})=>c.id);const selected=['076','156','840','356','276'];
 const query=comparisonQuery(selected,2015);
 for(const lang of ['en','pt-BR'] as const){const url=new URL(`${route('compare',lang)}?${query}`,'https://wwmaps.com');assert.deepEqual(comparisonSelection(url.search,ids,data.years),{countries:selected,year:2015});}
 const invalid=comparisonSelection('?countries=999,076,076&year=1999',ids,data.years);assert.deepEqual(invalid.countries,['076']);assert.equal(invalid.year,2024);
 assert.equal(comparisonSelection(`?countries=${ids.join(',')}`,ids,data.years).countries.length,5);
});
