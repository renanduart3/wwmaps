import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {editContent,editorData} from '../apps/studio/src/local-editor.js';
import {localStudioRequest} from '../apps/studio/local-plugin.mjs';

const create=(topics:string[])=>({action:'create',topics,style:'editorial-data',category:'economy',kind:'map',languages:['en']});
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
