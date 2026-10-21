import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,readdir,rm,cp,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {editContent,editorData,editorDetail,editorTrash,planningCsvTemplate,planningCsvPosts} from '../apps/studio/src/local-editor.js';
import {localStudioRequest} from '../apps/studio/local-plugin.mjs';

const create=(topics:string[])=>({action:'create',topics,style:'editorial-data',category:'economy',kind:'map',languages:['en']});
test('imports stack newest first, preserve old plans and retain editable content briefs',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wwmaps-stack-'));
 try{
  await editContent(root,{action:'import-csv',csv:'topic;style;conteudo\nOlder map;editorial-data;Mapa com legenda e fonte'});
  const old=await editorDetail(root,'visual','older-map');
  const post={...old.post,createdAt:'2020-01-01T00:00:00.000Z'};await writeFile(join(root,'content/visuals/older-map/post.json'),JSON.stringify(post));
  await editContent(root,{action:'import-csv',csv:'topic;style;conteudo\nA recent map;handdraw-simple;Gráfico de barras com unidades\nZ recent map;editorial-data;Mapa roxo'});
  const data=await editorData(root);assert.equal(data.records.length,3);assert.equal(data.records.at(-1)!.summary.id,'older-map');
  assert.equal(data.records[0].summary.conteudo,'Gráfico de barras com unidades');
  const first=data.records[0];await editContent(root,{action:'save',changes:[{id:first.summary.id,revision:first.revision,fields:{instructions:'Nova legenda, cores roxas e valores ausentes em cinza'}}]});
  const edited=(await editorDetail(root,'visual',String(first.summary.id))).post;assert.ok('visual' in edited);assert.equal(edited.visual.instructions,'Nova legenda, cores roxas e valores ausentes em cinza');
  assert.equal((await editorData(root)).records[0].createdAt,first.createdAt);
  const preserved=(await editorDetail(root,'visual','older-map')).post;assert.ok('visual' in preserved);assert.equal(preserved.visual.instructions,'Mapa com legenda e fonte');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('CSV planner validates a whole batch, previews without writing and never overwrites existing content',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wwmaps-csv-'));
 try{
  const csv=planningCsvTemplate(),parsed=planningCsvPosts(csv);assert.equal(parsed.length,1);assert.deepEqual(parsed[0].languages,['en','pt-BR']);
  assert.equal(parsed[0].translations['pt-BR']!.title,'Países por PIB per capita');
  const preview=await editContent(root,{action:'import-csv',csv,preview:true});assert.equal(preview.count,1);assert.equal((await editorData(root)).records.length,0);
  await editContent(root,{action:'import-csv',csv});const detail=await editorDetail(root,'visual',parsed[0].id);assert.equal(detail.post.status,'draft');assert.ok('publishAt' in detail.post);assert.equal(detail.post.publishAt,null);
  await assert.rejects(editContent(root,{action:'import-csv',csv}),/já existe/);
  const invalid='topic;style\nGood;handdraw-simple\nBad;invented\n';await assert.rejects(editContent(root,{action:'import-csv',csv:invalid}),/Linha 3/);assert.equal((await editorData(root)).records.length,1);
  assert.throws(()=>planningCsvPosts('topic;style\nSame;editorial-data\nSame;editorial-data'),/duplicados/);
  assert.throws(()=>planningCsvPosts('topic;style;languages\nTest;editorial-data;en,en'),/Duplicate language/);
  assert.throws(()=>planningCsvPosts('topic;style;status\nTest;editorial-data;published'),/Coluna desconhecida/);
  assert.throws(()=>planningCsvPosts('topic;style\nTest;'),/Linha 2/);
  assert.throws(()=>planningCsvPosts('topic;style\n'),/entre 1 e 100/);
  assert.equal(planningCsvPosts('topic,style\n"A map, with detail",handdraw-simple')[0].translations.en!.title,'A map, with detail');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('local-only guard rejects remote clients, hostile Host and cross-origin requests',()=>{
  const req=(peer:string,host:string,origin?:string)=>({socket:{remoteAddress:peer},headers:{host,origin}}) as Parameters<typeof localStudioRequest>[0];
  assert.equal(localStudioRequest(req('127.0.0.1','127.0.0.1:4321')),true);
  assert.equal(localStudioRequest(req('::1','localhost:4321','http://localhost:4321')),true);
  assert.equal(localStudioRequest(req('192.168.1.12','localhost:4321')),false);
  assert.equal(localStudioRequest(req('127.0.0.1','attacker.example')),false);
  assert.equal(localStudioRequest(req('127.0.0.1','localhost:4321','https://attacker.example')),false);
});
test('local bulk editing preserves posts on invalid batch/stale revision and saves explicit draft changes with backups',async()=>{
  const root=await mkdtemp(join(tmpdir(),'wwmaps-editor-'));
  try{
    await editContent(root,create(['First map','Second map']));
    const data=await editorData(root),a=data.records[0],b=data.records[1];
    const first=join(root,'content/visuals/first-map/post.json'),second=join(root,'content/visuals/second-map/post.json');
    const before=await readFile(first,'utf8');
    await assert.rejects(editContent(root,{action:'save',changes:[{id:a.summary.id,revision:a.revision,fields:{category:'history'}},{id:b.summary.id,revision:b.revision,fields:{status:'scheduled'}}]}),/publishAt/);
    assert.equal(await readFile(first,'utf8'),before);
    await editContent(root,{action:'save',changes:data.records.map(r=>({id:r.summary.id,revision:r.revision,fields:{style:'handdraw-simple',category:'history'}}))});
    assert.equal(JSON.parse(await readFile(first,'utf8')).style,'handdraw-simple');
    assert.equal(JSON.parse(await readFile(second,'utf8')).category,'history');
    assert.ok((await readdir(join(root,'.studio/backups'))).length);
    await assert.rejects(editContent(root,{action:'save',changes:[{id:a.summary.id,revision:a.revision,fields:{category:'travel'}}]}),/alterado fora/);
    await assert.rejects(editContent(root,create(['First map','Third map'])),/já existe/);
    assert.equal((await editorData(root)).records.length,2);
    await assert.rejects(editContent(root,{action:'save',changes:[{id:'../escape',revision:'x',fields:{style:'editorial-data'}}]}));
    await assert.rejects(editContent(root,{action:'save',changes:[{id:'first-map',revision:'x',fields:{path:'anything'}}]}));
  }finally{await rm(root,{recursive:true,force:true});}
});
test('local editor leaves researched prompts to explicit action and refuses to schedule incomplete posts',async()=>{
  const root=await mkdtemp(join(tmpdir(),'wwmaps-prompt-editor-'));
  try{
    await editContent(root,create(['Research pending']));const r=(await editorData(root)).records[0];
    await assert.rejects(editContent(root,{action:'prompts',posts:[{id:r.summary.id,revision:r.revision}]}),/Research needs/);
    await assert.rejects(editContent(root,{action:'save',changes:[{id:r.summary.id,revision:r.revision,fields:{status:'scheduled',publishAt:'2099-01-01T09:00:00-03:00'}}]}),/antes de agendar/);
    assert.equal(JSON.parse(await readFile(join(root,'content/visuals/research-pending/post.json'),'utf8')).status,'draft');
    const invalid=join(root,'content/visuals/bad');await mkdir(invalid);await writeFile(join(invalid,'post.json'),'{bad');
    assert.equal((await editorData(root)).records.find(x=>x.summary.id==='bad')!.editable,false);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('full CRUD edits structured posts, moves assets to recoverable trash and protects restore collisions',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wwmaps-crud-'));
 try{
  await editContent(root,create(['Complete editor']));
  const first=await editorDetail(root,'visual','complete-editor');
  const post=structuredClone(first.post) as any;post.translations.en.body='A revised local draft.';post.visual.instructions='One central map with a clear legend.';
  await editContent(root,{action:'replace',origin:'visual',id:post.id,revision:first.revision,post});
  const current=await editorDetail(root,'visual',post.id);assert.equal((current.post as any).translations.en.body,'A revised local draft.');
  const asset=join(root,'content/visuals',post.id,'image.en.png');await writeFile(asset,'fixture asset bytes');
  await assert.rejects(editContent(root,{action:'delete',posts:[{id:post.id,origin:'visual',revision:first.revision}]}),/alterado/);
  await editContent(root,{action:'delete',posts:[{id:post.id,origin:'visual',revision:current.revision}]});
  assert.equal((await editorData(root)).records.length,0);const [deleted]=await editorTrash(root);assert.equal(deleted.id,post.id);
  await editContent(root,create(['Complete editor']));
  await assert.rejects(editContent(root,{action:'restore',trashId:deleted.trashId}),/Já existe/);
  const duplicate=(await editorData(root)).records[0];await editContent(root,{action:'delete',posts:[{id:post.id,origin:'visual',revision:duplicate.revision}]});
  await editContent(root,{action:'restore',trashId:deleted.trashId});
  assert.equal(await readFile(asset,'utf8'),'fixture asset bytes');assert.equal((await editorDetail(root,'visual',post.id)).post.status,'draft');
  await assert.rejects(editContent(root,{action:'restore',trashId:'../escape'}));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('legacy content can be edited through the local form, deleted and restored without converting its contract',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wwmaps-legacy-crud-'));
 try{
  const dir=join(root,'content/posts/mercator-vs-equal-area');await mkdir(join(root,'content/posts'),{recursive:true});await cp(new URL('./fixtures/mercator-vs-equal-area',import.meta.url),dir,{recursive:true});
  const detail=await editorDetail(root,'legado','mercator-vs-equal-area');
  const post=structuredClone(detail.post) as any;post.tags.push('local-review');
  await editContent(root,{action:'replace',origin:'legado',id:post.id,revision:detail.revision,post,articles:detail.articles,captions:detail.captions});
  const current=await editorDetail(root,'legado',post.id);assert.ok(current.post.tags.includes('local-review'));assert.ok(current.articles['pt-BR'].includes('[mercator-distortion]'));
  const row=(await editorData(root)).records[0];assert.equal(row.manageable,true);assert.equal(row.editable,false);
  await editContent(root,{action:'delete',posts:[{id:post.id,origin:'legado',revision:current.revision}]});
  const [trash]=await editorTrash(root);await editContent(root,{action:'restore',trashId:trash.trashId});await access(join(dir,'assets/instagram-4x5.png'));
 }finally{await rm(root,{recursive:true,force:true});}
});
