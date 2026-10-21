import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { categories, mapCapabilities, editorialPlanSchema, briefSchema } from '@atlas/contracts';
import { createPost } from '@atlas/content-engine';
import { renderSvg } from '@atlas/renderer';
const raw=JSON.parse(await readFile(new URL('../briefs/mercator.json',import.meta.url),'utf8'));
test('editorial axes are independent; all 11 categories and 8 map formats are catalogued',()=>{
  assert.equal(categories.length,11);assert.equal(categories.filter(c=>c.priority).length,6);assert.equal(mapCapabilities.length,8);
  for(const category of categories)for(const format of mapCapabilities){
    const plan=editorialPlanSchema.parse({topic:'Example',category:category.id,contentType:'comparative-insight',mapType:format.id,geographicScope:'world',commercialPurpose:['education']});
    assert.equal(plan.category,category.id);assert.equal(plan.mapType,format.id);
  }
  assert.equal(editorialPlanSchema.safeParse({topic:'Example',category:'unknown',contentType:'map-analysis',mapType:'choropleth',geographicScope:'world'}).success,false);
});
test('a planned format cannot silently render as the Mercator template',()=>{
  assert.equal(briefSchema.safeParse({...raw,mapType:'choropleth'}).success,false);
  const brief=briefSchema.parse(raw);
  assert.throws(()=>renderSvg({...brief,mapType:'choropleth' as typeof brief.mapType}),/Unsupported Studio/);
});
test('functional type and commercial intent survive generation without monetizing or publishing',()=>{
  const brief=briefSchema.parse({...raw,contentType:'comparative-insight',geographicScope:'multi-country',commercialPurpose:['b2b','education']});
  const post=createPost(brief);
  assert.equal(post.contentType,'comparative-insight');assert.equal(post.geographicScope,'multi-country');
  assert.deepEqual(post.commercialPurpose,['b2b','education']);assert.equal(post.monetization.type,'none');assert.equal(post.status,'draft');
});
