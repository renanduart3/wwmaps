import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir,mkdir,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {visualPostSchema,visualPostReady} from '@atlas/contracts';
import {externalImagePrompt} from '@atlas/prompts';
import {readVisualPosts,visualPostVisible,validateVisualPost,visualPublicationFingerprint} from '@atlas/content-store';
import {parseTopics,analyzeTopics,writeVisualPrompts} from '../apps/studio/src/content-commands.js';

const complete=()=>visualPostSchema.parse({id:'external-test',style:'handdraw-simple',languages:['en','pt-BR'],
  visual:{kind:'bar-chart',instructions:'Two bars, zero baseline, one unit and period. No map is needed.'},
  translations:{en:{title:'A source-backed comparison',subtitle:'One unit and period',alt:'Two bars on a common scale',sourceCredit:'Source: Test source',imageText:['Example label']},'pt-BR':{title:'Uma comparação com fonte',subtitle:'Uma unidade e período',alt:'Duas barras na mesma escala',sourceCredit:'Fonte: fonte de teste',imageText:['Rótulo de exemplo']}},
  sources:[{id:'example',title:'Test source',url:'https://example.org/data',accessedAt:'2026-10-20'}],
  facts:[{text:'This is a test fixture, not a real publication.',sourceIds:['example']}],
  data:[{label:'A',value:4,unit:'items',period:'test period',sourceIds:['example']},{label:'B',value:8,unit:'items',period:'test period',sourceIds:['example']}]});
const sample=new URL('../content/posts/mercator-vs-equal-area/assets/instagram-4x5.png',import.meta.url);
async function store(root:string,post=complete()){
  const dir=join(root,post.id);await mkdir(dir,{recursive:true});await writeFile(join(dir,'post.json'),JSON.stringify(post));return dir;
}
test('three explicit styles, clean topic parsing and non-destructive batch scaffolding',async()=>{
  assert.throws(()=>parseTopics('1. One topic'),/Invalid option/);
  assert.equal(parseTopics('1. One topic | editorial-data')[0].style,'editorial-data');
  assert.equal(parseTopics('["One topic"]','micro-people-data')[0].style,'micro-people-data');
  assert.throws(()=>parseTopics('1. Same\n2. Same','handdraw-simple'),/Duplicate/);
  const root=await mkdtemp(join(tmpdir(),'wwmaps-topics-'));
  try{
    const file=join(root,'list.md');await writeFile(file,'1. One topic | handdraw-simple');
    await analyzeTopics(join(root,'visuals'),file);const dir=join(root,'visuals/one-topic');
    assert.deepEqual(await readdir(dir),['post.json']);
    await assert.rejects(writeVisualPrompts(dir),/Research needs/);
    const before=await readFile(join(dir,'post.json'),'utf8');await analyzeTopics(join(root,'visuals'),file);
    assert.equal(await readFile(join(dir,'post.json'),'utf8'),before);
  }finally{await rm(root,{recursive:true,force:true});}
});
test('standalone prompts keep all data and language instructions, honor each explicit style and reject incomplete research',()=>{
  for(const style of ['handdraw-simple','editorial-data','micro-people-data'] as const){
    const post={...complete(),style};
    const prompt=externalImagePrompt(post,'pt-BR');
    assert.ok(prompt.includes(style)&&prompt.includes('Brazilian Portuguese only'));
    assert.ok(prompt.includes('Uma comparação com fonte')&&prompt.includes('https://example.org/data'));
    assert.ok(prompt.includes('"value": 8')&&prompt.includes('"unit": "items"'));
    if(style==='micro-people-data')assert.ok(prompt.includes('Personagens ilustrativos; não representam uma contagem estatística.'));
  }
  assert.ok(visualPostReady({...complete(),sources:[],facts:[]}).length);
  assert.equal(visualPostSchema.safeParse({...complete(),style:'playful-editorial'}).success,false);
  const missing=complete();missing.data[0].value=null;
  assert.ok(externalImagePrompt(missing,'en').includes('"value": null'));
});
test('schedule is timezone explicit and build-time visibility never exposes drafts or future posts',()=>{
  const post=complete();
  assert.equal(visualPostSchema.safeParse({...post,status:'scheduled',publishAt:'2026-10-20T18:00:00'}).success,false);
  const scheduled=visualPostSchema.parse({...post,status:'scheduled',publishAt:'2026-10-20T18:00:00-03:00'});
  assert.equal(visualPostVisible(scheduled,new Date('2026-10-20T20:59:59Z')),false);
  assert.equal(visualPostVisible(scheduled,new Date('2026-10-20T21:00:00Z')),true);
  assert.equal(visualPostVisible({...scheduled,status:'draft'},new Date('2099-01-01')),false);
});
test('external images are supplied by the user; future approved posts require images and current prompts',async()=>{
  const root=await mkdtemp(join(tmpdir(),'wwmaps-external-'));
  try{
    const post=complete(),dir=await store(root,post);await writeVisualPrompts(dir);
    assert.ok((await readdir(dir)).every(name=>/^(post\.json|prompt\.(en|pt-BR)\.txt)$/.test(name)));
    assert.ok((await validateVisualPost(dir,post,{requireImage:true})).some(e=>e.includes('save image')));
    for(const lang of post.languages)await cp(sample,join(dir,`image.${lang}.png`));
    assert.deepEqual(await validateVisualPost(dir,post,{requireImage:true}),[]);
    const scheduled={...post,status:'scheduled' as const,publishAt:'2027-01-01T00:00:00Z'};await store(root,scheduled);
    const now=new Date('2026-10-20');
    assert.equal((await readVisualPosts(root,{validate:true,now})).length,0);
    const before=await visualPublicationFingerprint(root,now),after=await visualPublicationFingerprint(root,new Date('2027-01-01'));
    assert.notEqual(before,after);
    await writeFile(join(dir,'prompt.en.txt'),'outdated');
    await assert.rejects(readVisualPosts(root,{validate:true,now}),/outdated/);
  }finally{await rm(root,{recursive:true,force:true});}
});
