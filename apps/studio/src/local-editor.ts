import {readFile,writeFile,mkdir,rename,access} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {visualPostSchema,imageStyleSchema,editorialDataLayoutSchema,categorySchema,categories,visualPostReady} from '@atlas/contracts';
import {validateVisualPost} from '@atlas/content-store';
import {externalImagePrompt} from '@atlas/prompts';
import {slugify} from '@atlas/content-engine';
import {contentCatalogRows,writeContentCatalog} from './content-catalog.js';

const id=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const kind=visualPostSchema.shape.visual.unwrap().shape.kind.unwrap();
const fields=z.object({
  title_en:z.string().min(1).max(140).optional(),title_pt_br:z.string().min(1).max(140).optional(),
  style:imageStyleSchema.optional(),category:categorySchema.optional(),kind:kind.optional(),
  layout:editorialDataLayoutSchema.nullable().optional(),
  status:z.enum(['draft','scheduled','published']).optional(),publishAt:z.iso.datetime({offset:true}).nullable().optional(),
}).strict();
const operation=z.discriminatedUnion('action',[
  z.object({action:z.literal('save'),changes:z.array(z.object({id,revision:z.string(),fields})).min(1).max(100)}).strict(),
  z.object({action:z.literal('prompts'),posts:z.array(z.object({id,revision:z.string()})).min(1).max(100)}).strict(),
  z.object({action:z.literal('create'),topics:z.array(z.string().trim().min(1).max(140)).min(1).max(100),style:imageStyleSchema,category:categorySchema,kind,languages:z.array(z.enum(['en','pt-BR'])).min(1).max(2),layout:editorialDataLayoutSchema.nullable().optional()}).strict(),
]);
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
export class StudioError extends Error{constructor(message:string,public status=400){super(message);}}
const folder=(root:string,postId:string)=>join(root,'content/visuals',id.parse(postId));
async function readPost(root:string,postId:string){
  const dir=folder(root,postId),raw=await readFile(join(dir,'post.json'),'utf8');
  const post=visualPostSchema.parse(JSON.parse(raw));
  if(post.id!==postId)throw new StudioError('ID diferente da pasta. Corrija os metadados no arquivo.');
  return {dir,raw,post,revision:hash(raw)};
}
export async function editorData(root:string){
  const rows=await contentCatalogRows(root),headers=rows.shift()!;
  const records=await Promise.all(rows.map(async row=>{
    const summary=Object.fromEntries(headers.map((key,i)=>[String(key),row[i]]));
    if(summary.origem!=='visual')return {summary,editable:false};
    try{const p=await readPost(root,String(summary.id));return {summary,editable:true,revision:p.revision,post:p.post};}
    catch{return {summary,editable:false};}
  }));
  return {records,options:{styles:imageStyleSchema.options,layouts:editorialDataLayoutSchema.options,kinds:kind.options,categories:categories.map(c=>({id:c.id,label:c.pt}))}};
}

/** Serialize editor writes; revisions also protect against edits by Codex or another browser tab. */
let queue:Promise<unknown>=Promise.resolve();
export function editContent(root:string,input:unknown){
  const task=queue.then(()=>performEdit(root,input));queue=task.catch(()=>undefined);return task;
}
async function performEdit(root:string,input:unknown){
  const request=operation.parse(input);
  if(request.action==='create'){
    const posts=request.topics.map(topic=>visualPostSchema.parse({
      id:slugify(topic),style:request.style,category:request.category,languages:request.languages,
      visual:{kind:request.kind,layout:request.layout??undefined,instructions:''},
      translations:Object.fromEntries(request.languages.map(language=>[language,{title:topic}]))
    }));
    if(new Set(posts.map(p=>p.id)).size!==posts.length)throw new StudioError('Pautas com IDs duplicados; use títulos diferentes.');
    for(const p of posts)if(await access(folder(root,p.id)).then(()=>true,()=>false))throw new StudioError(`A pauta ${p.id} já existe. Nenhuma foi criada.`,409);
    // Exclusive files protect existing data even if an external process creates a post concurrently.
    for(const p of posts){const dir=folder(root,p.id);await mkdir(dir,{recursive:true});await writeFile(join(dir,'post.json'),JSON.stringify(p,null,2)+'\n',{flag:'wx'});}
    await writeContentCatalog(root);return {message:`${posts.length} pauta(s) criada(s) como rascunho.`,count:posts.length};
  }
  const selected=request.action==='save'?request.changes:request.posts;
  if(new Set(selected.map(p=>p.id)).size!==selected.length)throw new StudioError('Seleção contém IDs duplicados.');
  const writes:{file:string;before:string|null;after:string}[]=[];
  for(const item of selected){
    const original=await readPost(root,item.id);
    if(original.revision!==item.revision)throw new StudioError(`${item.id} foi alterado fora desta tabela. Recarregue antes de salvar.`,409);
    if(request.action==='prompts'){
      const missing=visualPostReady(original.post);
      if(missing.length)throw new StudioError(`${item.id}: ${missing.join('; ')}`);
      for(const language of original.post.languages){
        const file=join(original.dir,`prompt.${language}.txt`),before=await readFile(file,'utf8').catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return null;throw e;});
        writes.push({file,before,after:externalImagePrompt(original.post,language)});
      }
    }else{
      const edit=request.changes.find(c=>c.id===item.id)!.fields,p=structuredClone(original.post);
      if(edit.style)p.style=edit.style;
      if(edit.category)p.category=edit.category;
      if(edit.kind)p.visual.kind=edit.kind;
      if('layout' in edit)p.visual.layout=edit.layout??undefined;
      else if(p.style!=='editorial-data')delete p.visual.layout;
      if(edit.status)p.status=edit.status;
      if('publishAt' in edit)p.publishAt=edit.publishAt??null;
      for(const [key,language] of [['title_en','en'],['title_pt_br','pt-BR']] as const){
        if(edit[key]!==undefined){if(!p.languages.includes(language))throw new StudioError(`${item.id}: não há tradução ${language}; prepare a tradução antes de editar o título.`);p.translations[language]!.title=edit[key]!;}
      }
      const parsed=visualPostSchema.parse(p);
      if(parsed.status!=='draft'){
        const errors=await validateVisualPost(original.dir,parsed,{requireImage:true});
        if(errors.length)throw new StudioError(`${item.id}: antes de agendar/liberar, complete ou atualize os arquivos: ${errors.join('; ')}`);
      }
      writes.push({file:join(original.dir,'post.json'),before:original.raw,after:JSON.stringify(parsed,null,2)+'\n'});
    }
  }
  // All records are validated first. Backups are private and never enter a build or Git.
  const backup=join(root,'.studio/backups',`${Date.now()}-${randomUUID()}`);await mkdir(backup,{recursive:true});
  await writeFile(join(backup,'changes.json'),JSON.stringify(writes,null,2)+'\n');
  for(const w of writes){const current=await readFile(w.file,'utf8').catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return null;throw e;});if(current!==w.before)throw new StudioError('Um arquivo mudou durante a edição. Recarregue e tente novamente.',409);}
  const applied:typeof writes=[];
  try{
    for(const w of writes){await writeFile(w.file+'.studio-tmp',w.after,{flag:'wx'});await rename(w.file+'.studio-tmp',w.file);applied.push(w);}
  }catch(error){
    // Restore only files still matching this transaction, never overwrite another editor's changes.
    const {unlink}=await import('node:fs/promises');
    for(const w of applied.reverse())if(await readFile(w.file,'utf8')===w.after){if(w.before===null)await unlink(w.file);else await writeFile(w.file,w.before);}
    throw error;
  }
  await writeContentCatalog(root);
  return {message:request.action==='save'?`${selected.length} postagem(ns) salva(s).`:`Prompts preparados para ${selected.length} postagem(ns). Nenhuma imagem foi gerada.`,count:selected.length};
}
