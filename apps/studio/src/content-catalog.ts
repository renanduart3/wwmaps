import {readdir,readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {visualPostSchema,visualPostReady,postSchema,editorialDataLayout} from '@atlas/contracts';
import {externalImagePrompt} from '@atlas/prompts';
import {visualImage,validateVisualPost,visualPostVisible} from '@atlas/content-store';
import {contentCsv} from './content-csv.js';

const headers=['id','titulo','titulo_pt_br','origem','categoria','estilo_editorial','layout_visual','tipo_visual','idiomas','etapa_producao','produzido','status_configurado','publicacao_no_build','data_publicacao','prompts','imagens','pendencias','pasta','fontes','conteudo','criado_em'];
const exists=(path:string)=>access(path).then(()=>true,()=>false);
const directories=async(path:string)=>(await readdir(path,{withFileTypes:true}).catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return [];throw e;})).filter(d=>d.isDirectory()&&!d.name.startsWith('.')).sort((a,b)=>a.name.localeCompare(b.name));

/** An operator report; never changes posts, approves images or claims a deployment happened. */
export async function contentCatalogRows(root:string,now=new Date()){
  const rows:unknown[][]=[headers];
  for(const [subdir,legacy] of [['visuals',false],['posts',true]] as const){
    const parent=join(root,'content',subdir);
    for(const entry of await directories(parent)){
      const dir=join(parent,entry.name),folder=relative(root,dir).replaceAll('\\','/');
      try{
        const raw=JSON.parse(await readFile(join(dir,'post.json'),'utf8'));
        if(legacy){
          const p=postSchema.parse(raw);
          if(p.id!==entry.name)throw new Error('Post ID differs from directory');
          const imagePath=p.visualization.primaryAsset;
          const safe=/^(?:\.\/)?assets\/[a-zA-Z0-9._/-]+$/.test(imagePath)&&!imagePath.split('/').includes('..');
          const image=safe&&await exists(join(dir,imagePath));
          rows.push([p.id,p.translations.en?.title??p.translations['pt-BR']?.title,p.translations['pt-BR']?.title,'legado',p.category,p.visualization.mode??'legado-sem-estilo-oficial','',p.visualization.type,p.languages.join(', '),image?'produzido-legado':'imagem-pendente',image?'sim':'nao',p.status,p.status==='published'&&p.publishedAt&&Date.parse(p.publishedAt)<=now.getTime()?'elegivel-para-build':p.status==='draft'?'rascunho':'agendado',p.publishedAt,'legado',image?imagePath:'ausente','Pacote legado: sem classificacao nos tres estilos oficiais; revisar antes de reutilizar.',folder,'Ver arquivos de fontes do pacote legado']);
          continue;
        }
        const p=visualPostSchema.parse(raw);
        if(p.id!==entry.name)throw new Error('Visual ID differs from directory');
        const research=visualPostReady(p),prompts:string[]=[],images:string[]=[],pending=[...research];
        let promptsCurrent=research.length===0,imagesPresent=true;
        for(const language of p.languages){
          const saved=await readFile(join(dir,`prompt.${language}.txt`),'utf8').catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return null;throw e;});
          const current=!research.length&&saved===externalImagePrompt(p,language);
          prompts.push(`${language}: ${current?'atual':saved?'desatualizado':'ausente'}`);
          if(!current){promptsCurrent=false;pending.push(`${language}: preparar/atualizar prompt`);}
          const image=await visualImage(dir,language);
          images.push(`${language}: ${image??'ausente'}`);
          if(!image){imagesPresent=false;pending.push(`${language}: salvar imagem externa`);}
        }
        const errors=await validateVisualPost(dir,p,{requireImage:true});
        const produced=errors.length===0;
        let stage=research.length?(p.sources.length||p.facts.length?'em-pesquisa':'planejado'):!promptsCurrent?'prompts-pendentes':!imagesPresent?'aguardando-imagens':!produced?'corrigir-arquivos':p.status==='draft'?'aguardando-revisao':'producao-completa';
        if(produced&&p.status==='draft')pending.push('Revisar imagem e fontes; definir status e data quando aprovado.');
        pending.push(...errors.filter(e=>!research.includes(e)));
        const publication=!produced&&p.status!=='draft'?'bloqueado':visualPostVisible(p,now)?'elegivel-para-build':p.status==='draft'?'rascunho':'agendado';
        rows.push([p.id,p.translations.en?.title??p.translations['pt-BR']?.title,p.translations['pt-BR']?.title,'visual',p.category,p.style,editorialDataLayout(p)??'',p.visual.kind,p.languages.join(', '),stage,produced?'sim':'nao',p.status,publication,p.publishAt,prompts.join(' | '),images.join(' | '),[...new Set(pending)].join(' | '),folder,p.sources.map(s=>s.url).join(' | ')]);
      }catch(error){
        rows.push([entry.name,'Metadados invalidos','',legacy?'legado':'visual','','','','','','corrigir-metadados','nao','','bloqueado','','','',String(error),folder,'']);
      }
    }
  }
  for(const row of rows.slice(1)){
    if(row[3]!=='visual'){row.push('','');continue;}
    try{const post=visualPostSchema.parse(JSON.parse(await readFile(join(root,String(row[17]),'post.json'),'utf8')));row.push(post.visual.instructions,post.createdAt??'');}catch{row.push('','');}
  }
  return rows;
}

export async function writeContentCatalog(root:string,now=new Date()){
  const rows=await contentCatalogRows(root,now),file=join(root,'content/catalog.csv'),text=contentCsv(rows);
  await mkdir(join(root,'content'),{recursive:true});
  const previous=await readFile(file,'utf8').catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return null;throw e;});
  if(previous!==text)await writeFile(file,text,'utf8');
  return {file,count:rows.length-1};
}
