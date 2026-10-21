import {readFile,writeFile,mkdir,rename,access,readdir,cp} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {visualPostSchema,postSchema,imageStyleSchema,editorialDataLayoutSchema,categorySchema,categories,visualPostReady} from '@atlas/contracts';
import {validateVisualPost} from '@atlas/content-store';
import {externalImagePrompt} from '@atlas/prompts';
import {slugify} from '@atlas/content-engine';
import {contentCatalogRows,writeContentCatalog} from './content-catalog.js';
import {validatePost} from '@atlas/validator';
import {parseContentCsv,contentCsv} from './content-csv.js';

const id=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const origin=z.enum(['visual','legado']);
const reference=z.object({id,origin:origin.default('visual'),revision:z.string()}).strict();
const kind=visualPostSchema.shape.visual.unwrap().shape.kind.unwrap();
const fields=z.object({
  title_en:z.string().min(1).max(140).optional(),title_pt_br:z.string().min(1).max(140).optional(),
  style:imageStyleSchema.optional(),category:categorySchema.optional(),kind:kind.optional(),
  layout:editorialDataLayoutSchema.nullable().optional(),
  status:z.enum(['draft','scheduled','published']).optional(),publishAt:z.iso.datetime({offset:true}).nullable().optional(),
}).strict();
const operation=z.discriminatedUnion('action',[
  z.object({action:z.literal('import-csv'),csv:z.string().max(500_000),preview:z.boolean().default(false)}).strict(),
  z.object({action:z.literal('replace'),id,origin,revision:z.string(),post:z.unknown(),articles:z.partialRecord(z.enum(['en','pt-BR']),z.string()).optional(),captions:z.partialRecord(z.enum(['en','pt-BR']),z.string()).optional()}).strict(),
  z.object({action:z.literal('delete'),posts:z.array(reference).min(1).max(100)}).strict(),
  z.object({action:z.literal('restore'),trashId:z.uuid()}).strict(),
  z.object({action:z.literal('save'),changes:z.array(z.object({id,revision:z.string(),fields})).min(1).max(100)}).strict(),
  z.object({action:z.literal('prompts'),posts:z.array(z.object({id,revision:z.string()})).min(1).max(100)}).strict(),
  z.object({action:z.literal('create'),topics:z.array(z.string().trim().min(1).max(140)).min(1).max(100),style:imageStyleSchema,category:categorySchema,kind,languages:z.array(z.enum(['en','pt-BR'])).min(1).max(2),layout:editorialDataLayoutSchema.nullable().optional()}).strict(),
]);
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const planningColumns=['topic','style','category','kind','layout','languages','title_en','title_pt_br','instructions'];
export function planningCsvTemplate(){return contentCsv([planningColumns,['Countries by GDP per capita','editorial-data','economy','map','editorial-data-map','en,pt-BR','Countries by GDP per capita','Países por PIB per capita','One world map with a clear legend.']]);}
export function planningCsvPosts(csv:string){
  const rows=parseContentCsv(csv);
  if(!rows.length||rows.length>100)throw new StudioError('Importe entre 1 e 100 pautas por arquivo.');
  const posts=rows.map((row,index)=>{
    try{
      for(const column of Object.keys(row))if(!planningColumns.includes(column))throw new Error(`Coluna desconhecida: ${column}. Use o modelo de importação, não o relatório exportado.`);
      const languages=(row.languages||'en').split(',').map(value=>value.trim());
      return visualPostSchema.parse({id:slugify(z.string().min(1).max(140).parse(row.topic)),style:row.style,category:row.category||'geography',languages,
        visual:{kind:row.kind||'map',layout:row.layout||undefined,instructions:row.instructions||''},
        translations:Object.fromEntries(languages.map(language=>[language,{title:(language==='en'?row.title_en:row.title_pt_br)||row.topic}]))});
    }catch(error){throw new StudioError(`Linha ${index+2}: ${error instanceof Error?error.message:String(error)}`);}
  });
  if(new Set(posts.map(p=>p.id)).size!==posts.length)throw new StudioError('O CSV contém pautas com IDs duplicados. Use assuntos diferentes.');
  return posts;
}
export class StudioError extends Error{constructor(message:string,public status=400){super(message);}}
const folder=(root:string,postId:string)=>join(root,'content/visuals',id.parse(postId));
const contentFolder=(root:string,source:string,postId:string)=>join(root,'content',origin.parse(source)==='visual'?'visuals':'posts',id.parse(postId));
function inside(root:string,path:string){const rel=relative(resolve(root),resolve(path));if(!rel||rel.startsWith('..')||isAbsolute(rel))throw new StudioError('Caminho fora do diretório permitido.');return path;}
async function readManaged(root:string,source:string,postId:string){
  const dir=contentFolder(root,source,postId),raw=await readFile(join(dir,'post.json'),'utf8');
  const post=source==='visual'?visualPostSchema.parse(JSON.parse(raw)):postSchema.parse(JSON.parse(raw));
  if(post.id!==postId)throw new StudioError('ID diferente da pasta.');
  return {dir,raw,post,revision:hash(raw)};
}
export async function editorDetail(root:string,source:string,postId:string){
  const record=await readManaged(root,origin.parse(source),id.parse(postId));
  const read=async(name:string)=>readFile(join(record.dir,name),'utf8').catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return '';throw e;});
  const articles:Record<string,string>={},captions:Record<string,string>={},prompts:Record<string,string>={};
  for(const language of record.post.languages){
    if(source==='legado'){articles[language]=await read(`article.${language}.md`);captions[language]=await read(`instagram.${language}.txt`);}
    else prompts[language]=await read(`prompt.${language}.txt`);
  }
  return {post:record.post,revision:record.revision,origin:source,articles,captions,prompts};
}
const trashManifest=z.object({trashId:z.uuid(),id,origin,deletedAt:z.iso.datetime(),title:z.string()});
export async function editorTrash(root:string){
  const path=join(root,'.studio/trash'),entries=await readdir(path,{withFileTypes:true}).catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return [];throw e;});
  const result=[];
  for(const entry of entries){if(!entry.isDirectory()||!z.uuid().safeParse(entry.name).success)continue;
    const dir=join(path,entry.name);if(!await access(join(dir,'post/post.json')).then(()=>true,()=>false))continue;
    const manifest=trashManifest.parse(JSON.parse(await readFile(join(dir,'manifest.json'),'utf8')));
    if(manifest.trashId!==entry.name)throw new StudioError('Identificação inválida na lixeira.');result.push(manifest);
  }
  return result.sort((a,b)=>b.deletedAt.localeCompare(a.deletedAt));
}
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
    try{const p=await readManaged(root,String(summary.origem),String(summary.id));return {summary,manageable:true,editable:summary.origem==='visual',revision:p.revision,post:p.post};}
    catch{return {summary,manageable:false,editable:false};}
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
  if(request.action==='import-csv'){
    const posts=planningCsvPosts(request.csv);
    for(const p of posts)for(const source of ['visual','legado'])if(await access(contentFolder(root,source,p.id)).then(()=>true,()=>false))throw new StudioError(`A pauta ${p.id} já existe. Nenhuma foi importada.`,409);
    if(request.preview)return {posts:posts.map(p=>({id:p.id,title:p.translations.en?.title??p.translations['pt-BR']!.title,style:p.style,category:p.category,languages:p.languages,kind:p.visual.kind})),count:posts.length};
    const created:string[]=[];
    try{for(const p of posts){const dir=folder(root,p.id);await mkdir(join(dir,'..'),{recursive:true});await mkdir(dir);created.push(dir);await writeFile(join(dir,'post.json'),JSON.stringify(p,null,2)+'\n',{flag:'wx'});}}
    catch(error){const {rm}=await import('node:fs/promises');for(const dir of created.reverse())await rm(dir,{recursive:true,force:true});throw error;}
    await writeContentCatalog(root);return {message:`${posts.length} pauta(s) importada(s) como rascunho.`,count:posts.length};
  }
  if(request.action==='delete'){
    if(new Set(request.posts.map(p=>p.origin+'/'+p.id)).size!==request.posts.length)throw new StudioError('Seleção duplicada.');
    const batch=await Promise.all(request.posts.map(async ref=>{const p=await readManaged(root,ref.origin,ref.id);if(p.revision!==ref.revision)throw new StudioError('Conteúdo alterado. Recarregue antes de excluir.',409);return {...ref,...p};}));
    const moved:{from:string;to:string}[]=[];
    try{for(const p of batch){
      const trashId=randomUUID(),target=inside(root,join(root,'.studio/trash',trashId));await mkdir(target,{recursive:true});
      await writeFile(join(target,'manifest.json'),JSON.stringify({trashId,id:p.id,origin:p.origin,deletedAt:new Date().toISOString(),title:p.post.translations.en?.title??p.post.translations['pt-BR']?.title??p.id},null,2)+'\n');
      const destination=join(target,'post');await rename(inside(root,p.dir),destination);moved.push({from:p.dir,to:destination});
    }}catch(error){for(const p of moved.reverse())await rename(p.to,p.from);throw error;}
    await writeContentCatalog(root);return {message:`${batch.length} conteúdo(s) movido(s) para a lixeira local.`,count:batch.length};
  }
  if(request.action==='restore'){
    const dir=inside(root,join(root,'.studio/trash',request.trashId));
    const manifest=trashManifest.parse(JSON.parse(await readFile(join(dir,'manifest.json'),'utf8')));
    if(manifest.trashId!==request.trashId)throw new StudioError('Identificação inválida na lixeira.');
    const target=contentFolder(root,manifest.origin,manifest.id);
    if(await access(target).then(()=>true,()=>false))throw new StudioError('Já existe conteúdo com este ID. Nada foi sobrescrito.',409);
    await mkdir(join(target,'..'),{recursive:true});await rename(inside(root,join(dir,'post')),inside(root,target));
    await writeContentCatalog(root);return {message:'Conteúdo restaurado com seus arquivos e status anteriores.',count:1};
  }
  if(request.action==='replace'){
    const original=await readManaged(root,request.origin,request.id);
    if(original.revision!==request.revision)throw new StudioError('Conteúdo alterado fora do formulário. Recarregue antes de salvar.',409);
    const post=request.origin==='visual'?visualPostSchema.parse(request.post):postSchema.parse(request.post);
    if(post.id!==request.id)throw new StudioError('O ID não pode ser alterado pelo formulário.');
    const writes:FileWrite[]=[{file:join(original.dir,'post.json'),before:original.raw,after:JSON.stringify(post,null,2)+'\n'}];
    if(request.origin==='visual'){
      const p=visualPostSchema.parse(post);
      if(request.articles||request.captions)throw new StudioError('Textos novos devem estar nas traduções do post.');
      if(p.status!=='draft'){const errors=await validateVisualPost(original.dir,p,{requireImage:true});if(errors.length)throw new StudioError(errors.join('; '));}
    }else{
      if(post.languages.join(',')!==original.post.languages.join(','))throw new StudioError('Prepare novas traduções do pacote legado antes de alterar idiomas.');
      for(const language of post.languages)for(const [texts,name] of [[request.articles,`article.${language}.md`],[request.captions,`instagram.${language}.txt`]] as const){
        const text=texts?.[language];if(text!==undefined)writes.push({file:join(original.dir,name),before:await readFile(join(original.dir,name),'utf8'),after:text});
      }
      // Validate the proposed legacy package privately before touching the source.
      const snapshot=inside(root,join(root,'.studio/validation',randomUUID()));await mkdir(join(snapshot,'..'),{recursive:true});await cp(original.dir,snapshot,{recursive:true});
      for(const w of writes)await writeFile(join(snapshot,relative(original.dir,w.file)),w.after);
      const errors=await validatePost(snapshot);if(errors.length)throw new StudioError(errors.join('; '));
    }
    await commitWrites(root,writes);await writeContentCatalog(root);return {message:'Conteúdo atualizado.',count:1};
  }
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
  await commitWrites(root,writes);
  await writeContentCatalog(root);
  return {message:request.action==='save'?`${selected.length} postagem(ns) salva(s).`:`Prompts preparados para ${selected.length} postagem(ns). Nenhuma imagem foi gerada.`,count:selected.length};
}
type FileWrite={file:string;before:string|null;after:string};
async function commitWrites(root:string,writes:FileWrite[]){
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
}
