import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {visualPostSchema} from '@atlas/contracts';
import {externalImagePrompt} from '@atlas/prompts';
import {contentCsv,parseContentCsv} from '../apps/studio/src/content-csv.js';
import {contentCatalogRows,writeContentCatalog} from '../apps/studio/src/content-catalog.js';
import {parseTopics,contentCommand,writeVisualPrompts} from '../apps/studio/src/content-commands.js';

test('editorial-data replaces narrative style and chooses data layouts without adding scenes',()=>{
  const base={id:'test-map',style:'editorial-data',translations:{en:{title:'Test',subtitle:'Test period',alt:'Test map',sourceCredit:'Source: test'}},visual:{kind:'map',instructions:'Use the sourced categories only.'},sources:[{id:'test',title:'Test',url:'https://example.org',accessedAt:'2026-10-21'}],facts:[{text:'Test fixture only.',sourceIds:['test']}]};
  const p=visualPostSchema.parse(base),prompt=externalImagePrompt(p,'en');
  assert.match(prompt,/editorial-data-map/);assert.match(prompt,/clear legends/);assert.match(prompt,/Avoid narrative scenes/);
  for(const layout of ['editorial-data-ranking','editorial-data-event-map','editorial-data-profile'] as const){
    assert.match(externalImagePrompt({...p,visual:{...p.visual,layout}},'en'),new RegExp(layout));
  }
  assert.equal(visualPostSchema.safeParse({...base,style:'editorial-detailed'}).success,false);
  assert.equal(visualPostSchema.safeParse({...base,style:'handdraw-simple',visual:{...base.visual,layout:'editorial-data-map'}}).success,false);
  assert.throws(()=>parseTopics('1. Old topic | editorial-detailed'),/replaced/);
});

test('planning CSV preserves commas, separators, escaped quotes and multiline topics; report cells cannot become formulas',()=>{
  const input='\uFEFFtopic;style;layout;kind;category\r\n"GDP; \"\"a comparison\"\"\nby region";editorial-data;editorial-data-ranking;ranking;economy\r\n';
  const topics=parseTopics(input,undefined,'csv');
  assert.equal(topics[0].topic,'GDP; "a comparison"\nby region');assert.equal(topics[0].kind,'ranking');assert.equal(topics[0].layout,'editorial-data-ranking');
  assert.equal(parseTopics('topic,style\n"Cities, compared",handdraw-simple',undefined,'csv')[0].topic,'Cities, compared');
  assert.throws(()=>parseContentCsv('topic;style\n"broken;editorial-data'),/Unclosed/);
  assert.throws(()=>parseContentCsv('topic;topic\nA;B'),/Duplicate/);
  const out=contentCsv([['topic','style'],['=WEBSERVICE("test")','editorial-data'],['@SUM(A1)','handdraw-simple']]);
  const records=parseContentCsv(out);assert.ok(records[0].topic.startsWith("'="));assert.ok(records[1].topic.startsWith("'@"));
});

test('catalog follows planned, prompt/image pending, produced and scheduled states without approving drafts',async()=>{
  const root=await mkdtemp(join(tmpdir(),'wwmaps-catalog-'));
  try{
    const input=join(root,'topics.csv');await writeFile(input,'topic;style;layout;kind;category\nTest ranking;editorial-data;editorial-data-ranking;ranking;economy\n');
    await contentCommand(root,['analyze','--input',input]);
    const dir=join(root,'content/visuals/test-ranking'),file=join(dir,'post.json');
    const row=async()=>{const rows=await contentCatalogRows(root,new Date('2026-10-21T12:00:00Z'));return Object.fromEntries(rows[0].map((h,i)=>[String(h),rows[1][i]]));};
    assert.equal((await row()).etapa_producao,'planejado');assert.ok((await readFile(join(root,'content/catalog.csv'),'utf8')).includes('editorial-data-ranking'));
    const p=visualPostSchema.parse(JSON.parse(await readFile(file,'utf8')));
    p.visual.instructions='Rank the supplied test values. No other numbers.';
    p.translations.en={...p.translations.en!,subtitle:'Test only',alt:'Two test values',sourceCredit:'Source: test fixture'};
    p.sources=[{id:'test',title:'Test fixture',url:'https://example.org',accessedAt:'2026-10-21'}];p.facts=[{text:'Fixture only',sourceIds:['test']}];p.data=[{label:'A',value:1,period:'test',unit:'items',sourceIds:['test']}];
    await writeFile(file,JSON.stringify(p));assert.equal((await row()).etapa_producao,'prompts-pendentes');
    await writeVisualPrompts(dir);assert.equal((await row()).etapa_producao,'aguardando-imagens');
    await cp(new URL('../content/posts/mercator-vs-equal-area/assets/instagram-4x5.png',import.meta.url),join(dir,'image.en.png'));
    assert.equal((await row()).etapa_producao,'aguardando-revisao');assert.equal((await row()).produzido,'sim');assert.equal((await row()).status_configurado,'draft');
    p.status='scheduled';p.publishAt='2099-01-01T00:00:00Z';await writeFile(file,JSON.stringify(p));
    assert.equal((await row()).publicacao_no_build,'agendado');assert.equal((await row()).etapa_producao,'producao-completa');
    await writeFile(join(dir,'prompt.en.txt'),'stale');assert.equal((await row()).produzido,'nao');assert.equal((await row()).publicacao_no_build,'bloqueado');
    await writeContentCatalog(root);assert.equal(JSON.parse(await readFile(file,'utf8')).status,'scheduled');
  }finally{await rm(root,{recursive:true,force:true});}
});

test('catalog exposes invalid metadata instead of omitting content or failing every row',async()=>{
  const root=await mkdtemp(join(tmpdir(),'wwmaps-bad-catalog-'));
  try{const dir=join(root,'content/visuals/broken');await mkdir(dir,{recursive:true});await writeFile(join(dir,'post.json'),'{invalid');const rows=await contentCatalogRows(root);assert.equal(rows.length,2);assert.ok(rows[1].includes('corrigir-metadados'));}
  finally{await rm(root,{recursive:true,force:true});}
});
