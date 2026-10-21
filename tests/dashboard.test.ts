import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dashboardSchema, visualCollectionSchema, productCollectionSchema } from '@atlas/contracts';
const dataset = JSON.parse(await readFile(new URL('../datasets/indicators.json', import.meta.url), 'utf8'));
test('dashboard rejects mismatched years, countries and duplicate indicators', () => {
  assert.equal(dashboardSchema.safeParse(dataset).success, true);
  const shorter = structuredClone(dataset); shorter.indicators[0].values['076'].pop();
  assert.equal(dashboardSchema.safeParse(shorter).success, false);
  const unknown = structuredClone(dataset); unknown.indicators[0].values['999'] = unknown.indicators[0].values['076'];
  assert.equal(dashboardSchema.safeParse(unknown).success, false);
  const duplicate = structuredClone(dataset); duplicate.indicators.push(duplicate.indicators[0]);
  assert.equal(dashboardSchema.safeParse(duplicate).success, false);
});
test('missing observations remain null, not zero; negative rates rejected', () => {
  const missing = structuredClone(dataset); missing.indicators[0].values['076'][0] = null;
  assert.equal(dashboardSchema.parse(missing).indicators[0].values['076'][0], null);
  missing.indicators[0].values['076'][0] = -1;
  assert.equal(dashboardSchema.safeParse(missing).success, false);
});
test('visual URLs are unique and affiliate URLs require HTTPS', () => {
  const visual = { slug:'test', title:'Test', subtitle:'Demo', indicator:'gdp', variant:0 };
  assert.equal(visualCollectionSchema.safeParse([visual,visual]).success,false);
  const product = {id:'test',name:'Test',description:'Demo',type:'Livro',art:'book',url:'javascript:alert(1)'};
  assert.equal(productCollectionSchema.safeParse([product]).success,false);
  assert.equal(productCollectionSchema.safeParse([{...product,url:null}]).success,true);
});
